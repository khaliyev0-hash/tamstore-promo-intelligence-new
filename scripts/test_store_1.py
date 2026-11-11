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
            SELECT TOP 5 [IS YERI NO], [URUN KODU], [IS YERI TEDARUK TIPI]
            FROM vw_TS_ITEMS_DETAIL_FOR_PLANNING WITH (NOLOCK)
            WHERE [IS YERI NO] = '1'
        """)
        rows = cur.fetchall()
        print(f"Rows for IS YERI NO = '1' in {time.time() - t0:.2f}s:")
        for r in rows:
            print(f"  {r[0]}: {r[1]} -> {r[2]}")
except Exception as e:
    print("Error:", e)
