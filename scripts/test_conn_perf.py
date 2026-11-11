import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import get_db_connection

t_conn_start = time.time()
conn = get_db_connection()
t_conn_end = time.time()
print(f"Connection established in {t_conn_end - t_conn_start:.2f}s")

cur = conn.cursor()

# Test 10 queries on the SAME connection
items_to_test = ['100001', '100002', '100003', '100004', '100005', '100010', '100012', '100015', '100020', '100025']
t_q_start = time.time()
for item in items_to_test:
    t0 = time.time()
    cur.execute("SELECT TOP 1 [IS YERI TEDARUK TIPI] FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK) WHERE [URUN KODU] = ?", (item,))
    r = cur.fetchone()
    print(f"Item {item}: {r[0] if r else None} (took {time.time() - t0:.3f}s)")

print(f"10 queries total took: {time.time() - t_q_start:.2f}s")
conn.close()
