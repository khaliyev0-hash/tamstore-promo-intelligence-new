import sys, os, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

for code in ['103525', '100001', '100012', '106879']:
    t0 = time.time()
    cur.execute("""
    SELECT 
        CAST([IS YERI NO] AS VARCHAR(20)) as store_code,
        CAST([URUN KODU] AS VARCHAR(50)) as item_code,
        [IS YERI TEDARUK TIPI] as tedaruk_tipi,
        [SIFARISE ACIQ] as sifarise_aciq
    FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
    WHERE [URUN KODU] = ?
    """, (code,))
    rows = cur.fetchall()
    print(f"Code {code}: {len(rows)} stores in {time.time()-t0:.2f}s")
    if rows:
        print("  Sample store row:", rows[0])

conn.close()
