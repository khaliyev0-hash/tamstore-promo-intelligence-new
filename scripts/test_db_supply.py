import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import db_connection_scope, get_supply_type_label

t0 = time.time()
try:
    with db_connection_scope() as conn:
        cur = conn.cursor()
        print("Connected to DB successfully!")
        
        # Check VW_TS_ITEMS_DETAIL columns
        cur.execute("SELECT TOP 5 * FROM VW_TS_ITEMS_DETAIL")
        cols = [column[0] for column in cur.description]
        print("VW_TS_ITEMS_DETAIL columns:", cols)
        
        # Check if IS YERI TEDARUK TIPI or similar exists in VW_TS_ITEMS_DETAIL
        tedaruk_cols = [c for c in cols if 'TEDARUK' in c.upper() or 'TIPI' in c.upper()]
        print("Matching columns in VW_TS_ITEMS_DETAIL:", tedaruk_cols)
        
        # Check distinct values of [IS YERI TEDARUK TIPI] in vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING
        cur.execute("SELECT DISTINCT [IS YERI TEDARUK TIPI] FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)")
        vals = cur.fetchall()
        print("Distinct supply types in vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING:", vals)

except Exception as e:
    print("DB error:", e)

print(f"Elapsed: {time.time() - t0:.2f}s")
