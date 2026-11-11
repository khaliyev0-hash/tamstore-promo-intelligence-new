import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

t0 = time.time()
cur.execute("""
    SELECT [URUN KODU], [IS YERI TEDARUK TIPI]
    FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
    WHERE [IS YERI NO] = '101' AND [URUN KODU] IN ('100001', '100002', '100003', '100012', '105136', '106128')
""")
rows = cur.fetchall()
print(f"Queried 6 items for store 101 in {time.time() - t0:.2f}s:")
for r in rows:
    print(f"  {r[0]}: {r[1]}")

conn.close()
