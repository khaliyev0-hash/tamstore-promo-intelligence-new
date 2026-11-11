import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = "SELECT COLUMN_NAME, DATA_TYPE FROM POSFAPCENTER.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'VW_KASSA_SATISLAR'"
df = pd.read_sql_query(q, conn)
print(df)
