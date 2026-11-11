import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    CONVERT(VARCHAR(10), DATE_, 120) AS inv_date,
    COUNT(*) AS cnt,
    SUM(NETTOTAL) AS total
FROM LG_001_01_INVOICE WITH (NOLOCK)
WHERE DATE_ >= '2026-11-01' AND TRCODE IN (7, 8)
GROUP BY CONVERT(VARCHAR(10), DATE_, 120)
ORDER BY inv_date
"""
try:
    df = pd.read_sql_query(q, conn)
    print("INVOICE counts:")
    print(df)
except Exception as e:
    print('Error INVOICE:', e)

q2 = """
SELECT 
    CONVERT(VARCHAR(10), DATE_, 120) AS fiche_date,
    COUNT(*) AS cnt,
    SUM(NETTOTAL) AS total
FROM LG_001_01_STFICHE WITH (NOLOCK)
WHERE DATE_ >= '2026-11-01' AND TRCODE IN (7, 8)
GROUP BY CONVERT(VARCHAR(10), DATE_, 120)
ORDER BY fiche_date
"""
try:
    df2 = pd.read_sql_query(q2, conn)
    print("STFICHE counts:")
    print(df2)
except Exception as e:
    print('Error STFICHE:', e)
