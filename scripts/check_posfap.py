import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = "SELECT TABLE_NAME FROM POSFAPCENTER.INFORMATION_SCHEMA.TABLES"
df = pd.read_sql_query(q, conn)
print(df)
