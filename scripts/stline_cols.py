import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = "SELECT TOP 1 * FROM LG_001_01_STLINE WITH (NOLOCK)"
df = pd.read_sql_query(q, conn)
print([c for c in df.columns if 'DATE' in c or 'TIME' in c or 'CAPI' in c])
