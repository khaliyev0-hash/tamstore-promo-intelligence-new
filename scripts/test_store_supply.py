import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope

t0 = time.time()
try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        print("Connected to DB, querying distinct URUN KODU and IS YERI TEDARUK TIPI...")
        # Let's see how fast querying VW_TS_ITEMS_DETAIL for supply type is
        cur.execute("""
            SELECT [URUN KODU], [IS YERI TEDARUK TIPI]
            FROM VW_TS_ITEMS_DETAIL
            WHERE [IS YERI NO] = '111'
        """)
        rows = cur.fetchall()
        print(f"Fetched {len(rows)} items for store 111 in {time.time() - t0:.2f}s")
        if rows:
            print("Sample rows:", rows[:5])
except Exception as e:
    print("Error:", e)
