import os
import math
import json
import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd

logger = logging.getLogger(__name__)

# Configurable thresholds
MIN_INSTOCK_DAYS_FOR_HIGH_CONFIDENCE = 3

METHODOLOGY_INFO = {
    "title": "İtirilmiş Satışların Hesablama Metodologiyası",
    "definition": "Kampaniya dövründə mağaza rəfində məhsul qalığının bitməsi (stok = 0) səbəbindən qaçırılan ehtimal olunan satış həcmi (ədəd və AZN ilə).",
    "thresholds": {
        "min_instock_days_high_confidence": MIN_INSTOCK_DAYS_FOR_HIGH_CONFIDENCE,
        "stockout_definition": "closing_stock == 0",
        "null_stock": "Naməlum (nəzərə alınmır)",
        "partial_day": "Cari yarımçıq gün (bugün) hesablamadan kənarlaşdırılır"
    },
    "formula_rate": "Gözlənilən günlük satış tempi = Stokda olduğu günlərin cəmi satışı / Stokda olduğu günlərin sayı (≥3 gün: Yüksək etibarlılıq; 1-2 gün: Aşağı etibarlılıq; 0 gün: FC / N gün)",
    "formula_lost": "İtirilmiş say (gün üzrə) = max(0, rate - həmin_günün_faktiki_satışı)",
    "formula_revenue": "İtirilmiş gəlir (AZN) = İtirilmiş say * Orta vahid satış qiyməti (qiymət olmadıqda '–')",
    "difference_from_stockout": "Stokout Analizi yalnız rəf əlçatanlığını (OSA %) və stoku bitmiş mağaza sayını göstərir. İtirilmiş Satışlar isə hər bir stokout günündə faktiki qaçırılan ədəd və gəlir həcmini dəqiq monetizasiya edir."
}


def is_invalid_val(val: Any) -> bool:
    if val is None or pd.isna(val):
        return True
    try:
        f = float(val)
        return math.isnan(f) or math.isinf(f)
    except (ValueError, TypeError):
        return True


def compute_lost_sales_pair(
    stocks: List[Optional[float]],
    sales: List[Optional[float]],
    fc: Optional[float] = 0.0,
    distribution_qty: Optional[float] = 0.0,
    n_days: int = 14,
    is_partial_latest: bool = False,
    sales_amount: Optional[float] = None,
    network_avg_price: Optional[float] = None,
    has_pre_promo_stock: bool = False
) -> Dict[str, Any]:
    """
    Pure computation function for a single (store, product) pair over the promo window.
    
    DEFINITIONS:
    - closing stock per day: closing stock = 0 -> stockout day. Null stock = unknown (never counted).
    - latest day excluded if is_partial_latest is True.
    - rate: average daily sales over in-stock days (closing stock > 0).
      >= 3 in-stock days -> confidence 'high', method 'instock'
      1-2 in-stock days  -> confidence 'low',  method 'instock'
      0 in-stock days    -> rate = FC / N days, method 'fc', confidence 'low'
    - lost_units(d) = max(0, rate - sales_d) for every stockout day d.
    - active pair: stock > 0 on any day (or has_pre_promo_stock), or sales > 0, or distribution_qty > 0.
    - price: sales_amount / sales_qty; fallback: network_avg_price; else None.
    - lost_revenue: lost_units * price (None if no price).
    """
    effective_stocks = list(stocks)
    effective_sales = list(sales)

    # Exclude partial latest day (today)
    if is_partial_latest and len(effective_stocks) > 0 and len(effective_sales) > 0:
        effective_stocks = effective_stocks[:-1]
        effective_sales = effective_sales[:-1]

    num_eval_days = max(len(effective_stocks), 1)

    # Active pair test
    has_stock = any(not is_invalid_val(s) and float(s) > 0 for s in effective_stocks) or has_pre_promo_stock
    has_sales = any(not is_invalid_val(sl) and float(sl) > 0 for sl in effective_sales)
    has_dist = not is_invalid_val(distribution_qty) and float(distribution_qty) > 0

    is_active = bool(has_stock or has_sales or has_dist)

    if not is_active:
        return {
            "active": False,
            "rate": 0.0,
            "method": "none",
            "confidence": "low",
            "stockout_days": 0,
            "lost_units": 0.0,
            "daily_lost": [0.0] * len(effective_stocks),
            "price": None,
            "lost_revenue": None
        }

    # In-stock days and stockout days
    instock_sales: List[float] = []
    stockout_indices: List[int] = []

    for idx, stk in enumerate(effective_stocks):
        if is_invalid_val(stk):
            # Null/None stock = unknown (never counted as stockout or instock)
            continue
        stk_flt = float(stk)
        if stk_flt > 0:
            sl = effective_sales[idx] if idx < len(effective_sales) else 0.0
            instock_sales.append(float(sl) if not is_invalid_val(sl) else 0.0)
        elif stk_flt == 0:
            stockout_indices.append(idx)

    num_instock = len(instock_sales)
    stockout_days = len(stockout_indices)

    # Rate and confidence determination
    if num_instock >= MIN_INSTOCK_DAYS_FOR_HIGH_CONFIDENCE:
        rate = sum(instock_sales) / num_instock
        method = "instock"
        confidence = "high"
    elif num_instock in (1, 2):
        rate = sum(instock_sales) / num_instock
        method = "instock"
        confidence = "low"
    else:
        # 0 in-stock days, but active -> rate = FC / N days
        fc_val = float(fc) if not is_invalid_val(fc) else 0.0
        rate = (fc_val / num_eval_days) if num_eval_days > 0 else 0.0
        method = "fc"
        confidence = "low"

    # Lost units calculation per stockout day
    daily_lost = [0.0] * len(effective_stocks)
    total_lost = 0.0

    for idx in stockout_indices:
        sl = effective_sales[idx] if (idx < len(effective_sales) and not is_invalid_val(effective_sales[idx])) else 0.0
        lost_d = max(0.0, rate - float(sl))
        daily_lost[idx] = round(lost_d, 3)
        total_lost += lost_d

    lost_units = round(total_lost, 2)

    # Price and lost revenue determination
    total_sales_qty = sum(float(s) for s in effective_sales if not is_invalid_val(s))
    price: Optional[float] = None

    if total_sales_qty > 0 and not is_invalid_val(sales_amount) and float(sales_amount) > 0:
        price = round(float(sales_amount) / total_sales_qty, 4)
    elif not is_invalid_val(network_avg_price) and float(network_avg_price) > 0:
        price = round(float(network_avg_price), 4)

    lost_revenue: Optional[float] = None
    if price is not None:
        lost_revenue = round(lost_units * price, 2)

    return {
        "active": True,
        "rate": round(rate, 4),
        "method": method,
        "confidence": confidence,
        "stockout_days": stockout_days,
        "lost_units": lost_units,
        "daily_lost": daily_lost,
        "price": price,
        "lost_revenue": lost_revenue
    }


def _aggregate_node(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    active_pairs = 0
    stockout_pairs = 0
    stockout_days = 0
    sale = 0.0
    lost_units = 0.0
    high_conf_lost = 0.0
    lost_revenue_sum = 0.0
    has_rev = False

    for r in items:
        if r.get("active", True):
            active_pairs += 1
            sd = r.get("stockout_days", 0)
            if sd > 0:
                stockout_pairs += 1
                stockout_days += sd
        sale += r.get("sale", 0.0)
        lu = r.get("lost_units", 0.0)
        lost_units += lu
        if r.get("confidence") == "high":
            high_conf_lost += lu
        rev = r.get("lost_revenue")
        if rev is not None:
            has_rev = True
            lost_revenue_sum += rev

    total_volume = sale + lost_units
    lost_pct = round((lost_units / total_volume * 100), 2) if total_volume > 0 else 0.0

    return {
        "active_pairs": active_pairs,
        "stockout_pairs": stockout_pairs,
        "stockout_days": stockout_days,
        "sale": round(sale, 2),
        "lost_units": round(lost_units, 2),
        "lost_revenue": round(lost_revenue_sum, 2) if has_rev else None,
        "high_confidence_lost_units": round(high_conf_lost, 2),
        "lost_pct": lost_pct
    }


def build_category_tree(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Builds Category > Sub-Category > Family hierarchical tree.
    Parents are computed strictly from all underlying rows, never by averaging child percentages.
    """
    by_cat: Dict[str, List[Dict[str, Any]]] = {}
    for r in records:
        cat = r.get("category") or "Təyin edilməyib"
        by_cat.setdefault(cat, []).append(r)

    tree: List[Dict[str, Any]] = []

    for cat_name, cat_records in sorted(by_cat.items()):
        cat_metrics = _aggregate_node(cat_records)

        # Group by sub-category
        by_sub: Dict[str, List[Dict[str, Any]]] = {}
        for r in cat_records:
            sub = r.get("sub_category") or "Ümumi"
            by_sub.setdefault(sub, []).append(r)

        sub_nodes: List[Dict[str, Any]] = []
        for sub_name, sub_records in sorted(by_sub.items()):
            sub_metrics = _aggregate_node(sub_records)

            # Group by family
            by_fam: Dict[str, List[Dict[str, Any]]] = {}
            for r in sub_records:
                fam = r.get("family") or "Digər"
                by_fam.setdefault(fam, []).append(r)

            fam_nodes: List[Dict[str, Any]] = []
            for fam_name, fam_records in sorted(by_fam.items()):
                fam_metrics = _aggregate_node(fam_records)
                fam_nodes.append({
                    "key": f"{cat_name} > {sub_name} > {fam_name}",
                    "name": fam_name,
                    "level": "family",
                    "product_count": len(set(r["code"] for r in fam_records)),
                    **fam_metrics,
                    "children": []
                })

            sub_nodes.append({
                "key": f"{cat_name} > {sub_name}",
                "name": sub_name,
                "level": "sub_category",
                "product_count": len(set(r["code"] for r in sub_records)),
                **sub_metrics,
                "children": sorted(fam_nodes, key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)
            })

        tree.append({
            "key": cat_name,
            "name": cat_name,
            "level": "category",
            "product_count": len(set(r["code"] for r in cat_records)),
            **cat_metrics,
            "children": sorted(sub_nodes, key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)
        })

    return sorted(tree, key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)


def build_area_tree(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Builds Area > Sub-Area > Store hierarchical tree.
    Parents are computed strictly from all underlying rows, never by averaging child percentages.
    """
    by_area: Dict[str, List[Dict[str, Any]]] = {}
    for r in records:
        area = r.get("area") or "Təyin edilməyib"
        by_area.setdefault(area, []).append(r)

    tree: List[Dict[str, Any]] = []

    for area_name, area_records in sorted(by_area.items()):
        area_metrics = _aggregate_node(area_records)

        by_sub: Dict[str, List[Dict[str, Any]]] = {}
        for r in area_records:
            sub = r.get("sub_area") or "Mərkəz"
            by_sub.setdefault(sub, []).append(r)

        sub_nodes: List[Dict[str, Any]] = []
        for sub_name, sub_records in sorted(by_sub.items()):
            sub_metrics = _aggregate_node(sub_records)

            by_store: Dict[str, List[Dict[str, Any]]] = {}
            for r in sub_records:
                st = r.get("store") or "Naməlum"
                by_store.setdefault(st, []).append(r)

            store_nodes: List[Dict[str, Any]] = []
            for st_name, st_records in sorted(by_store.items()):
                st_metrics = _aggregate_node(st_records)
                store_nodes.append({
                    "key": f"{area_name} > {sub_name} > {st_name}",
                    "name": st_name,
                    "level": "store",
                    "store_code": st_name,
                    "product_count": len(st_records),
                    **st_metrics,
                    "children": []
                })

            sub_nodes.append({
                "key": f"{area_name} > {sub_name}",
                "name": sub_name,
                "level": "sub_area",
                "store_count": len(by_store),
                **sub_metrics,
                "children": sorted(store_nodes, key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)
            })

        tree.append({
            "key": area_name,
            "name": area_name,
            "level": "area",
            "store_count": len(set(r["store"] for r in area_records)),
            **area_metrics,
            "children": sorted(sub_nodes, key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)
        })

    return sorted(tree, key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)


def compute_campaign_lost_sales_payload(
    archive_data: Dict[str, Any],
    sales_parquet_path: Optional[str] = None,
    store_stock_cache: Optional[Dict[Any, Any]] = None
) -> Dict[str, Any]:
    """
    Computes Lost Sales for an entire campaign payload.
    """
    if sales_parquet_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        sales_parquet_path = os.path.join(base_dir, "data", "parquet_cache", "sales_snapshot.parquet")

    beg_date = str(archive_data.get("beg_date"))[:10]
    end_date = str(archive_data.get("end_date"))[:10]
    fact_records = archive_data.get("fact_records") or []

    if not beg_date or not end_date or not fact_records:
        return {
            "state": "unavailable",
            "error": "Kampaniya məlumatları tam deyil.",
            "methodology": METHODOLOGY_INFO
        }

    # Generate promo window dates
    b_dt = datetime.strptime(beg_date, "%Y-%m-%d")
    e_dt = datetime.strptime(end_date, "%Y-%m-%d")
    promo_dates = [(b_dt + pd.Timedelta(days=i)).strftime("%Y-%m-%d") for i in range((e_dt - b_dt).days + 1)]
    n_days = len(promo_dates)

    today_str = datetime.now().strftime("%Y-%m-%d")
    # Exclude partial latest day if it is today
    is_partial_latest = bool(today_str in promo_dates and today_str == promo_dates[-1])
    eval_dates = promo_dates[:-1] if is_partial_latest else promo_dates

    # 1. Read daily sales and item network average prices from SALES_PARQUET
    daily_sales_map: Dict[Tuple[str, str, str], float] = {}
    pair_sales_totals: Dict[Tuple[str, str], Tuple[float, float]] = {}
    item_network_sales: Dict[str, Tuple[float, float]] = {}

    if os.path.exists(sales_parquet_path):
        try:
            filters = [
                ('sale_date', '>=', beg_date),
                ('sale_date', '<=', end_date)
            ]
            sales_df = pd.read_parquet(sales_parquet_path, engine='pyarrow', filters=filters)
            if not sales_df.empty:
                target_codes = set(str(r.get("CODE", "")).strip() for r in fact_records)
                target_stores = set(str(r.get("STORE", "")).strip() for r in fact_records)
                sales_df['st_norm'] = sales_df['store_code'].astype(str).str.strip()
                sales_df['cd_norm'] = sales_df['item_code'].astype(str).str.strip()
                sales_df = sales_df[sales_df['cd_norm'].isin(target_codes) & sales_df['st_norm'].isin(target_stores)]
                sales_df['dt_str'] = sales_df['sale_date'].astype(str).str[:10]
                
                # Group by store, item, date
                daily_agg = sales_df.groupby(['st_norm', 'cd_norm', 'dt_str'], as_index=False)['sales_qty'].sum()
                for st, cd, dt, sqty in zip(daily_agg['st_norm'], daily_agg['cd_norm'], daily_agg['dt_str'], daily_agg['sales_qty']):
                    daily_sales_map[(st, cd, dt)] = float(sqty)

                # Group by store, item totals
                pair_agg = sales_df.groupby(['st_norm', 'cd_norm'], as_index=False).agg({'sales_qty': 'sum', 'sales_amount': 'sum'})
                for st, cd, sqty, samt in zip(pair_agg['st_norm'], pair_agg['cd_norm'], pair_agg['sales_qty'], pair_agg['sales_amount']):
                    pair_sales_totals[(st, cd)] = (float(sqty), float(samt))

                # Network-wide item prices
                item_agg = sales_df.groupby('cd_norm', as_index=False).agg({'sales_qty': 'sum', 'sales_amount': 'sum'})
                for cd, sqty, samt in zip(item_agg['cd_norm'], item_agg['sales_qty'], item_agg['sales_amount']):
                    item_network_sales[cd] = (float(sqty), float(samt))
        except Exception as e:
            logger.warning(f"Error reading sales parquet for lost sales: {e}")

    # Helper for network average price
    def get_network_avg_price(code_str: str) -> Optional[float]:
        if code_str in item_network_sales:
            qty, amt = item_network_sales[code_str]
            if qty > 0 and amt > 0:
                return amt / qty
        return None

    # 2. Build closing stocks and run compute_lost_sales_pair for all pairs
    computed_rows: List[Dict[str, Any]] = []
    top_worst_pairs: List[Dict[str, Any]] = []

    # Map timeline_records if available
    timeline_stock_map: Dict[Tuple[str, str, str], float] = {}
    raw_timeline = archive_data.get("timeline_records") or []
    for tr in raw_timeline:
        st = str(tr.get("STORE") or tr.get("store_code") or "").strip()
        cd = str(tr.get("CODE") or tr.get("item_code") or "").strip()
        dt = str(tr.get("STOCK_DATE") or tr.get("stock_date") or "")[:10]
        stk = tr.get("STOCK_QTY") if "STOCK_QTY" in tr else tr.get("stock_qty")
        if stk is not None and not is_invalid_val(stk):
            timeline_stock_map[(st, cd, dt)] = float(stk)

    latest_data_date = min(today_str, end_date)
    n_promo_dates = len(promo_dates)
    latest_idx = promo_dates.index(latest_data_date) if latest_data_date in promo_dates else (n_promo_dates - 1)

    daily_totals_lost = [0.0] * len(eval_dates)
    daily_totals_sale = [0.0] * len(eval_dates)

    not_ranged_count = 0
    active_pairs_count = 0

    for r in fact_records:
        st_raw = str(r.get("STORE", "")).strip()
        cd_raw = str(r.get("CODE", "")).strip()
        name = str(r.get("NAME", "")).strip()
        category = r.get("CATEGORY")
        sub_category = r.get("SUB_CATEGORY")
        family = r.get("FAMILY")
        area = r.get("AREA")
        sub_area = r.get("SUB_AREA")

        fc = float(r.get("FC", 0.0)) if not is_invalid_val(r.get("FC")) else 0.0
        sale = float(r.get("SALE", 0.0)) if not is_invalid_val(r.get("SALE")) else 0.0
        final_stock = float(r.get("FINAL_STOCK", 0.0)) if not is_invalid_val(r.get("FINAL_STOCK")) else 0.0
        dist_qty = float(r.get("DISTRIBUTION_QTY", 0.0)) if not is_invalid_val(r.get("DISTRIBUTION_QTY")) else (sale + final_stock)

        # Build daily sales series for this pair
        pair_sales_series: List[float] = [
            daily_sales_map.get((st_raw, cd_raw, d), 0.0) for d in promo_dates
        ]

        # Precompute suffix sales up to latest_idx for fast O(1) backward stock reconstruction
        suffix_sales = [0.0] * n_promo_dates
        curr_sum = 0.0
        for i in range(latest_idx - 1, -1, -1):
            curr_sum += pair_sales_series[i + 1]
            suffix_sales[i] = curr_sum

        # Build closing stocks series for this pair
        pair_stocks_series: List[Optional[float]] = []
        for d_idx, d in enumerate(promo_dates):
            if d > latest_data_date:
                pair_stocks_series.append(None)
            else:
                snap = timeline_stock_map.get((st_raw, cd_raw, d))
                if snap is not None:
                    pair_stocks_series.append(snap)
                else:
                    # Backward reconstruction from final_stock as of latest_data_date
                    pair_stocks_series.append(max(0.0, round(final_stock + suffix_sales[d_idx], 2)))

        # Pair sales amount
        tot_qty, tot_amt = pair_sales_totals.get((st_raw, cd_raw), (sale, 0.0))
        net_price = get_network_avg_price(cd_raw)

        # Pre-promo stock test: dist_qty > (sale + final_stock) implies pre-promo stock existed
        has_pre_stock = (dist_qty > (sale + final_stock) + 0.001)

        res = compute_lost_sales_pair(
            stocks=pair_stocks_series,
            sales=pair_sales_series,
            fc=fc,
            distribution_qty=dist_qty,
            n_days=n_days,
            is_partial_latest=is_partial_latest,
            sales_amount=tot_amt if tot_amt > 0 else None,
            network_avg_price=net_price,
            has_pre_promo_stock=has_pre_stock
        )

        if not res["active"]:
            not_ranged_count += 1
            continue

        active_pairs_count += 1

        eval_stocks = pair_stocks_series[:-1] if is_partial_latest else pair_stocks_series
        eval_sales = pair_sales_series[:-1] if is_partial_latest else pair_sales_series

        for i, (l_u, s_u) in enumerate(zip(res["daily_lost"], eval_sales)):
            daily_totals_lost[i] += l_u
            daily_totals_sale[i] += (s_u or 0.0)

        row_item = {
            "store": st_raw,
            "code": cd_raw,
            "name": name,
            "category": category,
            "sub_category": sub_category,
            "family": family,
            "area": area,
            "sub_area": sub_area,
            "fc": fc,
            "sale": sale,
            "final_stock": final_stock,
            "distribution_qty": dist_qty,
            "active": True,
            "rate": res["rate"],
            "method": res["method"],
            "confidence": res["confidence"],
            "stockout_days": res["stockout_days"],
            "lost_units": res["lost_units"],
            "daily_lost": res["daily_lost"],
            "price": res["price"],
            "lost_revenue": res["lost_revenue"],
            "stocks": eval_stocks,
            "sales": eval_sales
        }
        computed_rows.append(row_item)

        if res["lost_units"] > 0:
            top_worst_pairs.append({
                "store": st_raw,
                "code": cd_raw,
                "name": name,
                "category": category,
                "area": area,
                "rate": res["rate"],
                "stockout_days": res["stockout_days"],
                "lost_units": res["lost_units"],
                "price": res["price"],
                "lost_revenue": res["lost_revenue"],
                "confidence": res["confidence"],
                "method": res["method"]
            })

    # Sort worst pairs
    top_worst_pairs.sort(key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)

    # 3. Aggregations
    category_tree = build_category_tree(computed_rows)
    area_tree = build_area_tree(computed_rows)

    # Store table aggregation
    by_store_map: Dict[str, List[Dict[str, Any]]] = {}
    for r in computed_rows:
        by_store_map.setdefault(r["store"], []).append(r)

    store_table: List[Dict[str, Any]] = []
    for st_code, st_rows in by_store_map.items():
        st_met = _aggregate_node(st_rows)
        store_table.append({
            "store": st_code,
            "area": st_rows[0].get("area"),
            "sub_area": st_rows[0].get("sub_area"),
            "product_count": len(st_rows),
            **st_met
        })
    store_table.sort(key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)

    # Product table aggregation
    by_prod_map: Dict[str, List[Dict[str, Any]]] = {}
    for r in computed_rows:
        by_prod_map.setdefault(r["code"], []).append(r)

    product_table: List[Dict[str, Any]] = []
    for p_code, p_rows in by_prod_map.items():
        p_met = _aggregate_node(p_rows)
        # Average or first price for this product
        p_prices = [r["price"] for r in p_rows if r["price"] is not None]
        avg_p_price = round(sum(p_prices) / len(p_prices), 2) if p_prices else None
        product_table.append({
            "code": p_code,
            "name": p_rows[0].get("name"),
            "category": p_rows[0].get("category"),
            "sub_category": p_rows[0].get("sub_category"),
            "family": p_rows[0].get("family"),
            "store_count": len(p_rows),
            "price": avg_p_price,
            **p_met
        })
    product_table.sort(key=lambda x: (x["lost_revenue"] if x["lost_revenue"] is not None else -1, x["lost_units"]), reverse=True)

    # Summary totals
    summary_met = _aggregate_node(computed_rows)
    total_sale = summary_met["sale"]
    total_lost_units = summary_met["lost_units"]
    total_lost_revenue = summary_met["lost_revenue"]
    high_conf_units = summary_met["high_confidence_lost_units"]
    low_conf_units = round(total_lost_units - high_conf_units, 2)
    high_conf_pct = round((high_conf_units / total_lost_units * 100), 1) if total_lost_units > 0 else 100.0

    avg_stockout_days = round(summary_met["stockout_days"] / summary_met["stockout_pairs"], 1) if summary_met["stockout_pairs"] > 0 else 0.0

    # Daily trend series
    daily_trend: List[Dict[str, Any]] = []
    for idx, d_str in enumerate(eval_dates):
        daily_trend.append({
            "date": d_str,
            "day": idx + 1,
            "lost_units": round(daily_totals_lost[idx], 1),
            "sale_units": round(daily_totals_sale[idx], 1)
        })

    # Compact lookup map for pair drill-down: store||code -> pair detail
    pair_details_map: Dict[str, Any] = {}
    for r in computed_rows:
        if r["lost_units"] > 0 or r["stockout_days"] > 0:
            pair_details_map[f"{r['store']}||{r['code']}"] = {
                "store": r["store"],
                "code": r["code"],
                "name": r["name"],
                "category": r["category"],
                "area": r["area"],
                "rate": r["rate"],
                "method": r["method"],
                "confidence": r["confidence"],
                "stockout_days": r["stockout_days"],
                "lost_units": r["lost_units"],
                "price": r["price"],
                "lost_revenue": r["lost_revenue"],
                "daily_lost": r["daily_lost"],
                "stocks": r["stocks"],
                "sales": r["sales"],
                "dates": eval_dates
            }

    return {
        "state": "ready",
        "computed_at": datetime.now().isoformat(),
        "campaign_id": archive_data.get("id"),
        "beg_date": beg_date,
        "end_date": end_date,
        "dates": eval_dates,
        "active_pairs": active_pairs_count,
        "not_ranged_pairs": not_ranged_count,
        "summary": {
            **summary_met,
            "not_ranged_pairs": not_ranged_count,
            "low_confidence_lost_units": low_conf_units,
            "high_confidence_pct": high_conf_pct,
            "avg_stockout_days": avg_stockout_days,
            "daily_trend": daily_trend
        },
        "stores": store_table,
        "products": product_table,
        "categories": category_tree,
        "areas": area_tree,
        "top_worst_pairs": top_worst_pairs[:100],
        "pair_details": pair_details_map,
        "methodology": METHODOLOGY_INFO
    }
