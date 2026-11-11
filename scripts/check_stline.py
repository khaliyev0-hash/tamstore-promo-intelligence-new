import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    CAST(DATE_ AS VARCHAR(10)) AS sale_date,
    COUNT(*) AS row_cnt,
    SUM(AMOUNT) AS total_amount
FROM LG_001_01_STLINE WITH (NOLOCK)
WHERE DATE_ >= '2026-11-01' AND TRCODE IN (7, 8)
GROUP BY CAST(DATE_ AS VARCHAR(10))
ORDER BY sale_date
"""
try:
    df = pd.read_sql_query(q, conn)
    print(df)
except Exception as e:
    print('Error:', e)
    # let's find columns in LG_001_01_STLINE
    q_col = "SELECT TOP 1 * FROM LG_001_01_STLINE"
    df_col = pd.read_sql_query(q_col, conn)
    print('Columns:', df_col.columns.tolist()[:20])
