import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# Test with literal varchar
t0 = time.time()
cur.execute("SELECT TOP 1 [IS YERI TEDARUK TIPI] FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK) WHERE [URUN KODU] = '100012'")
r = cur.fetchone()
print(f"Literal varchar query result: {r[0]} in {time.time() - t0:.3f}s")

# Test batch of 20 with literal varchar IN (...)
t1 = time.time()
cur.execute("""
    SELECT [URUN KODU], [IS YERI TEDARUK TIPI], COUNT(*) 
    FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK) 
    WHERE [URUN KODU] IN ('100001', '100002', '100003', '100004', '100005', '100010', '100012')
    GROUP BY [URUN KODU], [IS YERI TEDARUK TIPI]
""")
rows = cur.fetchall()
print(f"Batch literal query returned {len(rows)} rows in {time.time() - t1:.3f}s")
for row in rows:
    print(f"  {row[0]}: {row[1]} ({row[2]} stores)")

conn.close()
