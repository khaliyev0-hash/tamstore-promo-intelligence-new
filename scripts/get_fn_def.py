import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
cursor = conn.cursor()
cursor.execute("EXEC sp_helptext 'fnc_TS_SALES_REPORT_FOR_PLANNING'")
lines = cursor.fetchall()
print(''.join([l[0] for l in lines]))
