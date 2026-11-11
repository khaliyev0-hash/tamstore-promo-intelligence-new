import sys
import time
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope

with open(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json", 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp.get('analytics', {}).get('product_performances', [])
codes = [p['code'] for p in prods[:50]]
print(f"Testing batch of 50 item codes: {codes[:5]}...")

t0 = time.time()
try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        placeholders = ','.join(['?'] * len(codes))
        q = f"""
        SELECT 
            LTRIM(RTRIM(CAST([URUN KODU] AS VARCHAR(50)))) as item_code,
            [IS YERI TEDARUK TIPI] as tedaruk_tipi,
            COUNT(*) as cnt
        FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
        WHERE [URUN KODU] IN ({placeholders})
        GROUP BY [URUN KODU], [IS YERI TEDARUK TIPI]
        """
        cur.execute(q, codes)
        rows = cur.fetchall()
        print(f"Query returned {len(rows)} grouped rows in {time.time() - t0:.2f}s")
        for r in rows[:10]:
            print(f"  Item: {r[0]}, Supply Type: {r[1]}, Stores Count: {r[2]}")
except Exception as e:
    print("Error:", e)
