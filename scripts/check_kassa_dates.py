import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    CONVERT(VARCHAR(10), TARIX, 120) AS sale_date,
    COUNT(*) AS row_cnt,
    SUM(MIQDAR) AS total_qty,
    SUM([CEM MEBLEG]) AS total_amount
FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR
WHERE TARIX >= '2026-11-03'
GROUP BY CONVERT(VARCHAR(10), TARIX, 120)
ORDER BY sale_date
"""
try:
    df = pd.read_sql_query(q, conn)
    print(df)
except Exception as e:
    print('Error:', e)
