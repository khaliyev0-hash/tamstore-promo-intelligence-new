import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

cur.execute("""
SELECT TOP 1 *
FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR WITH (NOLOCK)
WHERE LTRIM(RTRIM(MEHSUL_KODU)) = '103525'
  AND LTRIM(RTRIM(MAGAZA_KODU)) = '206'
  AND TARIX >= '2026-11-04' AND TARIX < '2026-11-05'
""")
row = cur.fetchone()
cols = [c[0] for c in cur.description]
print(dict(zip(cols, row)))

cur.execute("""
SELECT CODE, NAME
FROM LTAMSTORE.dbo.LG_001_ITEMS
WHERE CODE = '103525'
""")
item_r = cur.fetchone()
if item_r:
    print("Item Master:", item_r[0], item_r[1])
