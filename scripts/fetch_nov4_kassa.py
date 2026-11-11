import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    CONVERT(VARCHAR(10), TARIX, 120) AS sale_date,
    LTRIM(RTRIM(MAGAZA_KODU)) AS store_code,
    LTRIM(RTRIM(MEHSUL_KODU)) AS item_code,
    SUM(ISNULL(MIQDAR, 0)) AS sales_qty,
    SUM(ISNULL([CEM MEBLEG], 0)) AS sales_amount
FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR WITH (NOLOCK)
WHERE TARIX >= '2026-11-04' AND TARIX < '2026-11-05'
GROUP BY CONVERT(VARCHAR(10), TARIX, 120), LTRIM(RTRIM(MAGAZA_KODU)), LTRIM(RTRIM(MEHSUL_KODU))
"""
df_nov4 = pd.read_sql_query(q, conn)
print("Nov 4 rows:", len(df_nov4), "Total sales_qty:", df_nov4['sales_qty'].sum(), "Total sales_amount:", df_nov4['sales_amount'].sum())
print(df_nov4.head(3))
