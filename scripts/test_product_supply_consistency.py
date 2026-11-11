import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

cur.execute("""
SELECT TOP 1000 [URUN KODU], [IS YERI TEDARUK TIPI]
FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
""")
rows = cur.fetchall()
import collections
item_types = collections.defaultdict(set)
for r in rows:
    item_types[r[0]].add(r[1])

mixed = 0
pure = 0
for ic, types in item_types.items():
    if len(types) > 1:
        mixed += 1
    else:
        pure += 1
print(f"Items with single supply type: {pure}, mixed across stores: {mixed}")
sample = list(item_types.items())[:10]
for ic, types in sample:
    print(f"  {ic}: {types}")

conn.close()
