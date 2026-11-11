import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

import time
t0 = time.time()
cur.execute("""
SELECT TOP 100 [IS YERI NO], [URUN KODU], [IS YERI TEDARUK TIPI], [SIFARISE ACIQ]
FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
WHERE [URUN KODU] IN ('100001', '100012', '103525')
""")
rows = cur.fetchall()
print(f"Direct query returned {len(rows)} rows in {time.time()-t0:.2f}s:")
for r in rows[:10]:
    print(r)
conn.close()
