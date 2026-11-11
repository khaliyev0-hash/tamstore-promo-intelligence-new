import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from app.db import db_connection_scope

with db_connection_scope() as conn:
    cur = conn.cursor()
    cur.execute("""
    SELECT TABLE_SCHEMA, TABLE_NAME, VIEW_DEFINITION 
    FROM INFORMATION_SCHEMA.VIEWS 
    WHERE TABLE_NAME = 'vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING'
    """)
    r = cur.fetchone()
    if r:
        print('Schema:', r[0], 'Name:', r[1])
        print('Def length:', len(r[2]) if r[2] else 'None')
        if r[2]:
            print(r[2][:1000])
    else:
        print('Not found in INFORMATION_SCHEMA.VIEWS')
