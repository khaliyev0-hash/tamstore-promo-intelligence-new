import sys
import time
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection, get_supply_type_label

with open(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json", 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp.get('analytics', {}).get('product_performances', [])
codes = [p['code'] for p in prods[:100]]

conn = get_db_connection()
cur = conn.cursor()

t0 = time.time()
quoted = [f"'{c}'" for c in codes]
q = f"""
    SELECT [URUN KODU], [IS YERI TEDARUK TIPI], COUNT(*) 
    FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK) 
    WHERE [URUN KODU] IN ({','.join(quoted)})
    GROUP BY [URUN KODU], [IS YERI TEDARUK TIPI]
"""
cur.execute(q)
rows = cur.fetchall()
print(f"100 items query finished in {time.time() - t0:.2f}s, returned {len(rows)} rows")

from collections import defaultdict
item_types = defaultdict(lambda: defaultdict(int))
for r in rows:
    item_code, tip, cnt = str(r[0]).strip(), r[1], r[2]
    item_types[item_code][tip] += cnt

supply_types = {}
for code, tips in item_types.items():
    depo_cnt = tips.get(40, 0)
    firma_cnt = tips.get(41, 0)
    sif_cnt = tips.get(42, 0)
    if depo_cnt >= firma_cnt and depo_cnt >= sif_cnt and depo_cnt > 0:
        st = "Depo"
    elif firma_cnt >= depo_cnt and firma_cnt >= sif_cnt and firma_cnt > 0:
        st = "Firma"
    elif sif_cnt > 0:
        st = "Sifarişsiz"
    else:
        st = "Digər"
    supply_types[code] = st

from collections import Counter
print("Supply type distribution for first 100 items:", Counter(supply_types.values()))
conn.close()
