import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT sm.definition
FROM sys.sql_modules sm
JOIN sys.objects o ON sm.object_id = o.object_id
WHERE o.name = 'fnc_TS_SALES_REPORT_FOR_PLANNING'
"""
df = pd.read_sql_query(q, conn)
if not df.empty and df.iloc[0,0]:
    print(df.iloc[0,0])
else:
    print('Definition is NULL (encrypted or no permissions)')
