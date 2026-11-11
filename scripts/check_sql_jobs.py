import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd

conn = db.get_db_connection()
try:
    q = """
    SELECT TOP 20
        j.name, h.run_date, h.run_time, h.run_status, h.message
    FROM msdb.dbo.sysjobs j
    JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
    WHERE h.step_id = 0
    ORDER BY h.run_date DESC, h.run_time DESC
    """
    df = pd.read_sql_query(q, conn)
    print(df.to_string())
except Exception as e:
    print('Error:', e)
