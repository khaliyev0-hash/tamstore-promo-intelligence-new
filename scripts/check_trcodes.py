import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    CONVERT(VARCHAR(10), DATE_, 120) AS tx_date,
    TRCODE,
    COUNT(*) AS row_cnt,
    SUM(AMOUNT) AS total_qty
FROM LG_001_01_STLINE WITH (NOLOCK)
WHERE DATE_ >= '2026-11-03'
GROUP BY CONVERT(VARCHAR(10), DATE_, 120), TRCODE
ORDER BY tx_date, TRCODE
"""
df = pd.read_sql_query(q, conn)
print(df.to_string())
