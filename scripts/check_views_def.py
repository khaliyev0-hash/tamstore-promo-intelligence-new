import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT sm.definition
FROM sys.sql_modules sm
JOIN sys.objects o ON sm.object_id = o.object_id
WHERE o.name = 'vw_TS_SALES_REPORT'
"""
df = pd.read_sql_query(q, conn)
if not df.empty and df.iloc[0,0]:
    print('vw_TS_SALES_REPORT definition:')
    print(df.iloc[0,0][:1000])

q2 = """
SELECT sm.definition
FROM sys.sql_modules sm
JOIN sys.objects o ON sm.object_id = o.object_id
WHERE o.name = 'VW_TS_TOTAL_MAGAZASATISLAR'
"""
df2 = pd.read_sql_query(q2, conn)
if not df2.empty and df2.iloc[0,0]:
    print('VW_TS_TOTAL_MAGAZASATISLAR definition:')
    print(df2.iloc[0,0][:1000])
