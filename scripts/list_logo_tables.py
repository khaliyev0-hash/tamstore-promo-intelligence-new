import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE 'LG_001_%'
ORDER BY TABLE_NAME
"""
df = pd.read_sql_query(q, conn)
print(df.to_string())
