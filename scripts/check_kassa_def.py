import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT sm.definition
FROM POSFAPCENTER.sys.sql_modules sm
JOIN POSFAPCENTER.sys.objects o ON sm.object_id = o.object_id
WHERE o.name = 'VW_KASSA_SATISLAR'
"""
try:
    df = pd.read_sql_query(q, conn)
    if not df.empty and df.iloc[0,0]:
        print('VW_KASSA_SATISLAR definition:')
        print(df.iloc[0,0])
    else:
        print('Empty or encrypted')
except Exception as e:
    print('Error:', e)
