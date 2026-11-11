import sys
import time
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection

with open(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json", 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp.get('analytics', {}).get('product_performances', [])
codes = list(dict.fromkeys(p['code'] for p in prods))
print(f"Total unique promo items: {len(codes)}")

conn = get_db_connection()
cur = conn.cursor()

supply_map = {}
t0 = time.time()

# Split into chunks of 500
chunk_size = 500
for i in range(0, len(codes), chunk_size):
    chunk = codes[i:i+chunk_size]
    quoted = [f"'{c}'" for c in chunk]
    q = f"""
        SELECT [URUN KODU], [IS YERI TEDARUK TIPI]
        FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
        WHERE [IS YERI NO] = '101' AND [URUN KODU] IN ({','.join(quoted)})
    """
    t_chunk = time.time()
    cur.execute(q)
    rows = cur.fetchall()
    print(f"Chunk {i//chunk_size + 1} ({len(chunk)} items) returned {len(rows)} rows in {time.time() - t_chunk:.2f}s")
    for r in rows:
        cd = str(r[0]).strip()
        tip = r[1]
        supply_map[cd] = tip

conn.close()

print(f"Total promo items mapped from store 101: {len(supply_map)} / {len(codes)} in {time.time() - t0:.2f}s")
from collections import Counter
print("Distribution:", Counter(supply_map.values()))
