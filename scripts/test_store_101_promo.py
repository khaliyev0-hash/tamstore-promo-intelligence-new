import sys
import time
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection

with open(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json", 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp.get('analytics', {}).get('product_performances', [])
codes = [p['code'] for p in prods]
print(f"Total promo items: {len(codes)}")

conn = get_db_connection()
cur = conn.cursor()

# Test querying store 101 for all items in store 101
t0 = time.time()
cur.execute("""
    SELECT [URUN KODU], [IS YERI TEDARUK TIPI]
    FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
    WHERE [IS YERI NO] = '101'
""")
rows = cur.fetchall()
print(f"Fetched all {len(rows)} items for store 101 in {time.time() - t0:.2f}s!")

store_101_map = {str(r[0]).strip(): r[1] for r in rows}
matches = {c: store_101_map[c] for c in codes if c in store_101_map}
print(f"Promo items found in store 101: {len(matches)} / {len(codes)}")

from collections import Counter
print("Supply types in store 101 for promo items:", Counter(matches.values()))
conn.close()
