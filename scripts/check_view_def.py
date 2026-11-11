import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from app.db import db_connection_scope

with db_connection_scope() as conn:
    cur = conn.cursor()
    cur.execute("EXEC sp_helptext 'vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING'")
    lines = [r[0] for r in cur.fetchall()]
    for i, line in enumerate(lines):
        if 'TEDARUK' in line.upper():
            print(f"Line {i}: {line.strip()}")
            # Print context lines around it
            for ctx in range(max(0, i-3), min(len(lines), i+4)):
                print(f"  {ctx}: {lines[ctx].strip()}")
            print("-" * 40)
