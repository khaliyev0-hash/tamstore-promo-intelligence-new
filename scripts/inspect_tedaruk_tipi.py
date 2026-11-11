import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

cur.execute("SELECT TOP 5 * FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)")
cols = [desc[0] for desc in cur.description]
print("Columns in vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING:")
for c in cols:
    print(f"  {c}")

row = cur.fetchone()
print("\nSample row:")
for c, v in zip(cols, row):
    print(f"  {c}: {v}")

conn.close()
