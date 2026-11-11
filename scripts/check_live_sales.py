import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    CAST([TARIX] AS VARCHAR(10)) AS sale_date,
    COUNT(*) AS row_cnt,
    SUM(ISNULL([MIQDARI], 0)) AS total_qty,
    SUM(ISNULL([SATIS_EDV], 0)) AS total_amount
FROM fnc_TS_SALES_REPORT_FOR_PLANNING('2026-11-04', '2026-11-05')
GROUP BY [TARIX]
ORDER BY [TARIX]
"""
df = pd.read_sql_query(q, conn)
print(df)
