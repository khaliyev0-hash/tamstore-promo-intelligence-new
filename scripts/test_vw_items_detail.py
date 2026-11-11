import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope

try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        cur.execute("SELECT TOP 1 * FROM VW_TS_ITEMS_DETAIL")
        cols = [c[0] for c in cur.description]
        row = cur.fetchone()
        print("VW_TS_ITEMS_DETAIL columns:", cols)
        for c, v in zip(cols, row):
            print(f"  {c}: {v}")
except Exception as e:
    print("Error:", e)
