import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

cur.execute("""
SELECT DISTINCT [IS YERI TEDARUK TIPI], COUNT(*) 
FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
GROUP BY [IS YERI TEDARUK TIPI]
""")
rows = cur.fetchall()
print("Distinct IS YERI TEDARUK TIPI:")
for r in rows:
    print(f"  {r[0]}: {r[1]} rows")

conn.close()
