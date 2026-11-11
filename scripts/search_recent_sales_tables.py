import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
cursor = conn.cursor()

# Find all tables in LTAMSTORE that might hold retail or pos sales
q = """
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' 
  AND (TABLE_NAME LIKE '%POS%' 
    OR TABLE_NAME LIKE '%KASSA%' 
    OR TABLE_NAME LIKE '%STLINE%' 
    OR TABLE_NAME LIKE '%SATIS%'
    OR TABLE_NAME LIKE '%ENT%'
    OR TABLE_NAME LIKE '%TRANSFER%'
    OR TABLE_NAME LIKE '%RETAIL%')
"""
cursor.execute(q)
tables = [r[0] for r in cursor.fetchall()]
print('Candidate tables:', tables)

for t in tables:
    try:
        # Check if table has date column
        q_cols = f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{t}' AND (COLUMN_NAME LIKE '%DATE%' OR COLUMN_NAME LIKE '%TARIX%')"
        cursor.execute(q_cols)
        cols = [r[0] for r in cursor.fetchall()]
        if cols:
            date_col = cols[0]
            q_cnt = f"SELECT COUNT(*) FROM {t} WITH (NOLOCK) WHERE {date_col} >= '2026-11-04'"
            cursor.execute(q_cnt)
            cnt = cursor.fetchone()[0]
            if cnt > 0:
                print(f"Table {t} ({date_col} >= 2026-11-04): {cnt:,} rows")
    except Exception as e:
        pass
