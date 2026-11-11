import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
df = pd.read_sql_query("SELECT GETDATE() AS server_now, SYSDATETIME() AS sys_now", conn)
print(df)
