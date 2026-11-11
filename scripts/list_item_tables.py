import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope

try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE '%ITEM%' OR TABLE_NAME LIKE '%TEDARUK%' OR TABLE_NAME LIKE '%PLANNING%'
            ORDER BY TABLE_TYPE, TABLE_NAME
        """)
        for r in cur.fetchall():
            print(f"  {r[0]}.{r[1]} ({r[2]})")
except Exception as e:
    print("Error:", e)
