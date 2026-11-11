import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
q = """
SELECT 
    SOURCEINDEX,
    COUNT(*) as cnt,
    MIN(FTIME) as min_time,
    MAX(FTIME) as max_time
FROM LG_001_01_STLINE WITH (NOLOCK)
WHERE DATE_ >= '2026-11-04' AND TRCODE IN (7, 8)
GROUP BY SOURCEINDEX
"""
df = pd.read_sql_query(q, conn)
print(df)
