import sys
import time
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection

with open(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json", 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp.get('analytics', {}).get('product_performances', [])

# Pick a diverse set of 15 items: some Idxal, some Yerli, different families
diverse_codes = []
seen = set()
for p in prods:
    k = (p.get('origin'), p.get('family'))
    if k not in seen:
        seen.add(k)
        diverse_codes.append(p['code'])
    if len(diverse_codes) >= 15:
        break

print(f"Testing 15 diverse codes: {diverse_codes}")

conn = get_db_connection()
cur = conn.cursor()
quoted = [f"'{c}'" for c in diverse_codes]
q = f"""
    SELECT [URUN KODU], [IS YERI TEDARUK TIPI], COUNT(*) 
    FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK) 
    WHERE [URUN KODU] IN ({','.join(quoted)})
    GROUP BY [URUN KODU], [IS YERI TEDARUK TIPI]
"""
t0 = time.time()
cur.execute(q)
rows = cur.fetchall()
print(f"Query executed in {time.time() - t0:.2f}s:")
for r in rows:
    print(f"  Item {r[0]}: Tedaruk {r[1]} ({r[2]} stores)")

conn.close()
