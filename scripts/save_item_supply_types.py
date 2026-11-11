import sys
import json
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection, get_supply_type_label

with open(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json", 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp.get('analytics', {}).get('product_performances', [])
codes = list(dict.fromkeys(p['code'] for p in prods))
print(f"Total promo items: {len(codes)}")

conn = get_db_connection()
cur = conn.cursor()

supply_map = {}
raw_tip_map = {}

# Query in chunks from store 101
chunk_size = 500
for i in range(0, len(codes), chunk_size):
    chunk = codes[i:i+chunk_size]
    quoted = [f"'{c}'" for c in chunk]
    q = f"""
        SELECT [URUN KODU], [IS YERI TEDARUK TIPI]
        FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
        WHERE [IS YERI NO] = '101' AND [URUN KODU] IN ({','.join(quoted)})
    """
    cur.execute(q)
    rows = cur.fetchall()
    for r in rows:
        cd = str(r[0]).strip()
        tip = r[1]
        raw_tip_map[cd] = tip
        supply_map[cd] = get_supply_type_label(tip)

# Check missing codes
missing = [c for c in codes if c not in supply_map]
print(f"Missing codes from store 101: {len(missing)}: {missing}")

if missing:
    quoted_missing = [f"'{c}'" for c in missing]
    q_missing = f"""
        SELECT [URUN KODU], [IS YERI TEDARUK TIPI]
        FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
        WHERE [URUN KODU] IN ({','.join(quoted_missing)})
    """
    cur.execute(q_missing)
    rows_missing = cur.fetchall()
    for r in rows_missing:
        cd = str(r[0]).strip()
        tip = r[1]
        if cd not in raw_tip_map:
            raw_tip_map[cd] = tip
            supply_map[cd] = get_supply_type_label(tip)

conn.close()

# For any code still missing, fallback to Firma
for c in codes:
    if c not in supply_map:
        raw_tip_map[c] = 41
        supply_map[c] = "Firma"

out_path = r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\item_supply_types.json"
out_data = {
    "labels": supply_map,
    "raw_codes": raw_tip_map
}

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(out_data, f, ensure_ascii=False, indent=2)

print(f"Saved {len(supply_map)} items to {out_path}")
from collections import Counter
print("Final Summary:", Counter(supply_map.values()))
