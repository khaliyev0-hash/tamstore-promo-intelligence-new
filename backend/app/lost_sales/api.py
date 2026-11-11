import os
import json
import threading
import time
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from app.analytics.lost_sales import (
    compute_campaign_lost_sales_payload,
    compute_lost_sales_pair,
    METHODOLOGY_INFO
)

router = APIRouter(prefix="/api/lost-sales", tags=["Lost Sales"])

# In-memory caches
_lost_sales_cache: Dict[str, Dict[str, Any]] = {}
_computing_campaigns: Dict[str, float] = {}  # campaign_id -> start_time
_lock = threading.Lock()

def get_campaigns_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_dir, "data", "campaigns")

def get_lost_sales_cache_path(campaign_id: str) -> str:
    return os.path.join(get_campaigns_dir(), f"{campaign_id}_lost_sales.json")

def get_current_active_campaign_id() -> Optional[str]:
    from app.main import get_active_campaign_id, list_campaign_metadata
    cid = get_active_campaign_id()
    if not cid:
        metas = list_campaign_metadata()
        if metas:
            cid = metas[0].get("id")
    return cid

def get_campaign_archive_data(campaign_id: str) -> Optional[Dict[str, Any]]:
    from app.main import load_campaign_archive
    return load_campaign_archive(campaign_id)

def load_or_get_lost_sales(campaign_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        if campaign_id in _lost_sales_cache:
            return _lost_sales_cache[campaign_id]

    cache_path = get_lost_sales_cache_path(campaign_id)
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            with _lock:
                _lost_sales_cache[campaign_id] = data
            return data
        except Exception as e:
            print(f"Error loading lost sales cache file {cache_path}: {e}")
            return None
    return None

def run_lost_sales_computation(campaign_id: str):
    try:
        t_start = time.time()
        arc = get_campaign_archive_data(campaign_id)
        if not arc:
            with _lock:
                _computing_campaigns.pop(campaign_id, None)
            return

        payload = compute_campaign_lost_sales_payload(arc)
        duration = round(time.time() - t_start, 2)
        payload["compute_seconds"] = duration

        cache_path = get_lost_sales_cache_path(campaign_id)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)

        with _lock:
            _lost_sales_cache[campaign_id] = payload
            _computing_campaigns.pop(campaign_id, None)
        print(f"[LOST SALES] Computation finished for {campaign_id} in {duration}s")
    except Exception as e:
        import traceback
        print(f"[LOST SALES] Computation failed for {campaign_id}: {e}\n{traceback.format_exc()}")
        with _lock:
            _computing_campaigns.pop(campaign_id, None)

def trigger_background_computation(campaign_id: str) -> bool:
    with _lock:
        if campaign_id in _computing_campaigns:
            return False
        _computing_campaigns[campaign_id] = time.time()

    thread = threading.Thread(target=run_lost_sales_computation, args=(campaign_id,), daemon=True)
    thread.start()
    return True


@router.get("/status")
def get_lost_sales_status(campaign_id: Optional[str] = None):
    cid = campaign_id or get_current_active_campaign_id()
    if not cid:
        return {
            "state": "unavailable",
            "campaign_id": None,
            "message": "Aktiv kampaniya tapılmadı."
        }

    with _lock:
        if cid in _computing_campaigns:
            elapsed = round(time.time() - _computing_campaigns[cid], 1)
            return {
                "state": "computing",
                "campaign_id": cid,
                "seconds": elapsed
            }

    data = load_or_get_lost_sales(cid)
    if data:
        return {
            "state": "ready",
            "campaign_id": cid,
            "computed_at": data.get("computed_at"),
            "seconds": data.get("compute_seconds", 0.0),
            "active_pairs": data.get("active_pairs", 0),
            "not_ranged_pairs": data.get("not_ranged_pairs", 0),
            "methodology": METHODOLOGY_INFO
        }

    return {
        "state": "unavailable",
        "campaign_id": cid,
        "message": "Hesablanmayıb"
    }


@router.post("/recompute")
def recompute_lost_sales(campaign_id: Optional[str] = None):
    cid = campaign_id or get_current_active_campaign_id()
    if not cid:
        raise HTTPException(status_code=400, detail="Aktiv kampaniya tapılmadı.")

    arc = get_campaign_archive_data(cid)
    if not arc:
        raise HTTPException(status_code=404, detail="Kampaniya arxivi tapılmadı.")

    triggered = trigger_background_computation(cid)
    return {
        "state": "computing",
        "campaign_id": cid,
        "triggered": triggered,
        "message": "Hesablama arxa planda başladıldı."
    }


@router.get("/summary")
def get_lost_sales_summary(campaign_id: Optional[str] = None):
    cid = campaign_id or get_current_active_campaign_id()
    if not cid:
        return {"state": "unavailable", "message": "Aktiv kampaniya tapılmadı."}

    data = load_or_get_lost_sales(cid)
    if not data or not data.get("summary"):
        with _lock:
            if cid in _computing_campaigns:
                return {"state": "computing", "campaign_id": cid}
        return {"state": "unavailable", "campaign_id": cid, "message": "Hesablanmayıb"}

    return {
        "state": "ready",
        "campaign_id": cid,
        "beg_date": data.get("beg_date"),
        "end_date": data.get("end_date"),
        "dates": data.get("dates", []),
        "active_pairs": data.get("active_pairs", 0),
        "not_ranged_pairs": data.get("not_ranged_pairs", 0),
        "summary": data.get("summary", {}),
        "top_worst_pairs": data.get("top_worst_pairs", [])[:20],
        "methodology": data.get("methodology", METHODOLOGY_INFO)
    }


@router.get("/groups")
def get_lost_sales_groups(
    dimension: str = Query("store", pattern="^(store|product|category|area)$"),
    campaign_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    sort_by: str = Query("lost_revenue"),
    sort_desc: bool = Query(True)
):
    cid = campaign_id or get_current_active_campaign_id()
    if not cid:
        return {"state": "unavailable", "dimension": dimension, "message": "Aktiv kampaniya tapılmadı."}

    data = load_or_get_lost_sales(cid)
    if not data:
        with _lock:
            if cid in _computing_campaigns:
                return {"state": "computing", "campaign_id": cid, "dimension": dimension}
        return {"state": "unavailable", "campaign_id": cid, "dimension": dimension, "message": "Hesablanmayıb"}

    search_term = (search or "").strip().lower()

    if dimension == "category":
        tree = data.get("categories", [])
        if search_term:
            filtered_tree = []
            for cat in tree:
                if search_term in cat["name"].lower():
                    filtered_tree.append(cat)
                else:
                    matching_subs = [
                        s for s in cat.get("children", [])
                        if search_term in s["name"].lower() or any(search_term in f["name"].lower() for f in s.get("children", []))
                    ]
                    if matching_subs:
                        cat_copy = dict(cat)
                        cat_copy["children"] = matching_subs
                        filtered_tree.append(cat_copy)
            tree = filtered_tree
        return {
            "state": "ready",
            "dimension": "category",
            "tree": tree,
            "methodology": data.get("methodology", METHODOLOGY_INFO)
        }

    if dimension == "area":
        tree = data.get("areas", [])
        if search_term:
            filtered_tree = []
            for ar in tree:
                if search_term in ar["name"].lower():
                    filtered_tree.append(ar)
                else:
                    matching_subs = [
                        s for s in ar.get("children", [])
                        if search_term in s["name"].lower() or any(search_term in str(st.get("name", "")).lower() for st in s.get("children", []))
                    ]
                    if matching_subs:
                        ar_copy = dict(ar)
                        ar_copy["children"] = matching_subs
                        filtered_tree.append(ar_copy)
            tree = filtered_tree
        return {
            "state": "ready",
            "dimension": "area",
            "tree": tree,
            "methodology": data.get("methodology", METHODOLOGY_INFO)
        }

    # Store or Product table
    raw_list: List[Dict[str, Any]] = data.get("stores" if dimension == "store" else "products", [])

    if search_term:
        if dimension == "store":
            filtered = [
                r for r in raw_list
                if search_term in str(r.get("store", "")).lower()
                or search_term in str(r.get("area", "")).lower()
                or search_term in str(r.get("sub_area", "")).lower()
            ]
        else:
            filtered = [
                r for r in raw_list
                if search_term in str(r.get("code", "")).lower()
                or search_term in str(r.get("name", "")).lower()
                or search_term in str(r.get("category", "")).lower()
                or search_term in str(r.get("sub_category", "")).lower()
                or search_term in str(r.get("family", "")).lower()
            ]
    else:
        filtered = list(raw_list)

    # Sorting
    def sort_key(row):
        val = row.get(sort_by)
        if val is None:
            return -999999999.0 if sort_desc else 999999999.0
        try:
            return float(val)
        except (ValueError, TypeError):
            return str(val).lower()

    try:
        filtered.sort(key=sort_key, reverse=sort_desc)
    except Exception:
        pass

    total_count = len(filtered)
    start_idx = (page - 1) * limit
    paginated = filtered[start_idx : start_idx + limit]

    return {
        "state": "ready",
        "dimension": dimension,
        "items": paginated,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1,
        "methodology": data.get("methodology", METHODOLOGY_INFO)
    }


@router.get("/pairs")
def get_lost_sales_pairs(
    store: Optional[str] = Query(None, description="Store code to filter by"),
    code: Optional[str] = Query(None, description="Item code to filter by"),
    campaign_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    cid = campaign_id or get_current_active_campaign_id()
    if not cid:
        return {"state": "unavailable", "pairs": [], "total": 0, "message": "Aktiv kampaniya tapılmadı."}

    data = load_or_get_lost_sales(cid)
    if not data:
        return {"state": "unavailable", "pairs": [], "total": 0}

    pair_details = data.get("pair_details", {})
    st_norm = str(store).strip() if store else None
    cd_norm = str(code).strip() if code else None

    matched: List[Dict[str, Any]] = []

    if st_norm and cd_norm:
        key = f"{st_norm}||{cd_norm}"
        if key in pair_details:
            matched.append(pair_details[key])
    elif st_norm:
        prefix = f"{st_norm}||"
        matched = [v for k, v in pair_details.items() if k.startswith(prefix)]
    elif cd_norm:
        suffix = f"||{cd_norm}"
        matched = [v for k, v in pair_details.items() if k.endswith(suffix)]

    matched.sort(
        key=lambda x: (
            x.get("lost_revenue") if x.get("lost_revenue") is not None else -1,
            x.get("lost_units", 0.0)
        ),
        reverse=True
    )

    return {
        "state": "ready",
        "total": len(matched),
        "pairs": matched[:limit],
        "methodology": data.get("methodology", METHODOLOGY_INFO)
    }


@router.get("/pair")
def get_lost_sales_pair(
    store: str = Query(..., description="Store code"),
    code: str = Query(..., description="Item code"),
    campaign_id: Optional[str] = None
):
    cid = campaign_id or get_current_active_campaign_id()
    if not cid:
        raise HTTPException(status_code=400, detail="Aktiv kampaniya tapılmadı.")

    st_norm = str(store).strip()
    cd_norm = str(code).strip()

    data = load_or_get_lost_sales(cid)
    pair_details = data.get("pair_details", {}) if data else {}
    pair_key = f"{st_norm}||{cd_norm}"

    if pair_key in pair_details:
        return {
            "state": "ready",
            "pair": pair_details[pair_key],
            "methodology": data.get("methodology", METHODOLOGY_INFO)
        }

    # If not in cached pair_details (e.g. 0 lost units), reconstruct on-the-fly from archive
    arc = get_campaign_archive_data(cid)
    if not arc:
        raise HTTPException(status_code=404, detail="Kampaniya məlumatı tapılmadı.")

    fact_records = arc.get("fact_records") or []
    target_row = next(
        (r for r in fact_records if str(r.get("STORE", "")).strip() == st_norm and str(r.get("CODE", "")).strip() == cd_norm),
        None
    )
    if not target_row:
        raise HTTPException(status_code=404, detail=f"Cütlük tapılmadı: Mağaza {store}, Kod {code}")

    # Read daily sales for this pair from sales_snapshot.parquet
    from app.db import SALES_PARQUET
    beg_date = str(arc.get("beg_date"))[:10]
    end_date = str(arc.get("end_date"))[:10]
    today_str = time.strftime("%Y-%m-%d")
    is_partial_latest = bool(today_str <= end_date and today_str >= beg_date)

    import pandas as pd
    from datetime import datetime
    b_dt = datetime.strptime(beg_date, "%Y-%m-%d")
    e_dt = datetime.strptime(end_date, "%Y-%m-%d")
    promo_dates = [(b_dt + pd.Timedelta(days=i)).strftime("%Y-%m-%d") for i in range((e_dt - b_dt).days + 1)]
    latest_data_date = min(today_str, end_date)
    latest_idx = promo_dates.index(latest_data_date) if latest_data_date in promo_dates else (len(promo_dates) - 1)

    daily_sales: Dict[str, float] = {}
    pair_qty = 0.0
    pair_amt = 0.0

    if os.path.exists(SALES_PARQUET):
        try:
            filters = [
                ('sale_date', '>=', beg_date),
                ('sale_date', '<=', end_date),
                ('store_code', '==', st_norm),
                ('item_code', '==', cd_norm)
            ]
            pdf = pd.read_parquet(SALES_PARQUET, engine='pyarrow', filters=filters)
            if not pdf.empty:
                for row in pdf.itertuples(index=False):
                    d_str = str(row.sale_date)[:10]
                    q = float(row.sales_qty) if pd.notnull(row.sales_qty) else 0.0
                    a = float(row.sales_amount) if pd.notnull(row.sales_amount) else 0.0
                    daily_sales[d_str] = daily_sales.get(d_str, 0.0) + q
                    pair_qty += q
                    pair_amt += a
        except Exception as e:
            print(f"Error fetching pair sales: {e}")

    pair_sales_series = [daily_sales.get(d, 0.0) for d in promo_dates]
    final_stock = float(target_row.get("FINAL_STOCK", 0.0)) if target_row.get("FINAL_STOCK") is not None else 0.0
    fc = float(target_row.get("FC", 0.0)) if target_row.get("FC") is not None else 0.0
    sale = float(target_row.get("SALE", 0.0)) if target_row.get("SALE") is not None else 0.0
    dist_qty = float(target_row.get("DISTRIBUTION_QTY", 0.0)) if target_row.get("DISTRIBUTION_QTY") is not None else (sale + final_stock)

    suffix_sales = [0.0] * len(promo_dates)
    curr_sum = 0.0
    for i in range(latest_idx - 1, -1, -1):
        curr_sum += pair_sales_series[i + 1]
        suffix_sales[i] = curr_sum

    pair_stocks_series: List[Optional[float]] = []
    for d_idx, d in enumerate(promo_dates):
        if d > latest_data_date:
            pair_stocks_series.append(None)
        else:
            pair_stocks_series.append(max(0.0, round(final_stock + suffix_sales[d_idx], 2)))

    res = compute_lost_sales_pair(
        stocks=pair_stocks_series,
        sales=pair_sales_series,
        fc=fc,
        distribution_qty=dist_qty,
        n_days=len(promo_dates),
        is_partial_latest=is_partial_latest,
        sales_amount=pair_amt if pair_amt > 0 else None
    )

    eval_dates = promo_dates[:-1] if is_partial_latest else promo_dates
    eval_stocks = pair_stocks_series[:-1] if is_partial_latest else pair_stocks_series
    eval_sales = pair_sales_series[:-1] if is_partial_latest else pair_sales_series

    return {
        "state": "ready",
        "pair": {
            "store": st_norm,
            "code": cd_norm,
            "name": str(target_row.get("NAME", "")).strip(),
            "category": target_row.get("CATEGORY"),
            "area": target_row.get("AREA"),
            "rate": res["rate"],
            "method": res["method"],
            "confidence": res["confidence"],
            "stockout_days": res["stockout_days"],
            "lost_units": res["lost_units"],
            "price": res["price"],
            "lost_revenue": res["lost_revenue"],
            "daily_lost": res["daily_lost"],
            "stocks": eval_stocks,
            "sales": eval_sales,
            "dates": eval_dates
        },
        "methodology": METHODOLOGY_INFO
    }
