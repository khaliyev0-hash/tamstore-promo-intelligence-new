import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope

try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE 'LG_%' AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = [r[0] for r in cur.fetchall()]
        print(f"Total LG base tables: {len(tables)}")
        for t in tables[:25]:
            print("  ", t)
except Exception as e:
    print("Error:", e)
