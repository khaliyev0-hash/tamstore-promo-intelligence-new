import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope

try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'vw_TS_ITEMS_DETAIL_FOR_PLANNING'
        """)
        for r in cur.fetchall():
            print(f"  {r[0]}: {r[1]}")
except Exception as e:
    print("Error:", e)
