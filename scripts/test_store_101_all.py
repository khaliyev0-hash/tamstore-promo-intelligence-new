import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope

t0 = time.time()
try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT [URUN KODU], [IS YERI TEDARUK TIPI]
            FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
            WHERE [IS YERI NO] = '101'
        """)
        rows = cur.fetchall()
        print(f"Total rows for store 101: {len(rows)} in {time.time() - t0:.2f}s")
        # Check distribution of supply types for store 101
        from collections import Counter
        c = Counter(r[1] for r in rows)
        print("Distribution in store 101:", c)
except Exception as e:
    print("Error:", e)
