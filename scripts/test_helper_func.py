import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.db import get_db_connection, normalize_store_code, normalize_item_code, db_connection_scope

def get_supply_type_label(raw_val):
    if raw_val is None:
        return "Digər"
    try:
        val_int = int(raw_val)
        if val_int == 40:
            return "Depo"
        elif val_int == 41:
            return "Firma"
        elif val_int == 42:
            return "Sifarişsiz"
    except (ValueError, TypeError):
        pass
    val_str = str(raw_val).strip()
    if val_str == "40":
        return "Depo"
    elif val_str == "41":
        return "Firma"
    elif val_str == "42":
        return "Sifarişsiz"
    return "Digər"

def fetch_single_item_store_details(item_code: str):
    norm_cd = normalize_item_code(item_code) or item_code
    store_details = {}
    with db_connection_scope() as conn:
        cur = conn.cursor()
        q = """
        SELECT 
            CAST([IS YERI NO] AS VARCHAR(20)) as store_code,
            [IS YERI TEDARUK TIPI] as tedaruk_tipi,
            LTRIM(RTRIM(CAST([SIFARISE ACIQ] AS VARCHAR(20)))) as sifarise_aciq
        FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
        WHERE [URUN KODU] = ?
        """
        cur.execute(q, (item_code,))
        rows = cur.fetchall()
        for r in rows:
            raw_st, raw_tip, raw_aciq = r
            st_norm = normalize_store_code(raw_st) or str(raw_st).strip()
            if not st_norm:
                continue
            tip_label = get_supply_type_label(raw_tip)
            tip_raw = int(raw_tip) if raw_tip is not None and str(raw_tip).isdigit() else raw_tip
            v_str = str(raw_aciq or "").strip().upper()
            ord_status = "Aktiv" if v_str.startswith("BELI") else ("Passiv" if v_str.startswith("XEYR") else v_str)
            store_details[st_norm] = {
                "supply_type": tip_label,
                "tedaruk_tipi_raw": tip_raw,
                "order_status": ord_status
            }
    return store_details

res = fetch_single_item_store_details("103525")
print(f"Item 103525 stores fetched: {len(res)}")
sample_stores = list(res.items())[:5]
for s, d in sample_stores:
    print(f"  Store {s}: {d}")

res206 = res.get("206")
print("Store 206 for 103525:", res206)
