import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    name, type_desc, create_date, modify_date
FROM sys.objects 
WHERE (name LIKE '%SALES%' OR name LIKE '%SATIS%' OR name LIKE '%PLANNING%')
ORDER BY modify_date DESC
"""
df = pd.read_sql_query(q, conn)
print(df.to_string())
