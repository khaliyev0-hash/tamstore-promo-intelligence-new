import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = "SELECT TOP 5 * FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR"
df = pd.read_sql_query(q, conn)
print('Columns:', df.columns.tolist())
print(df.head())
