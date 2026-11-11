import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
cursor = conn.cursor()

for db_name in ['POSFAPCENTER', 'DWHDB', 'TAMECOSYS', 'SlimIntegration']:
    try:
        q = f"SELECT COUNT(*) FROM {db_name}.INFORMATION_SCHEMA.TABLES"
        cursor.execute(q)
        cnt = cursor.fetchone()[0]
        print(f"Access to {db_name}: OK ({cnt} tables)")
    except Exception as e:
        print(f"Access to {db_name}: FAILED ({e})")
