import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath('backend'))
from app.db import db_connection_scope

with db_connection_scope() as conn:
    cur = conn.cursor()
    cur.execute("""
    SELECT 
        o.type_desc,
        s.name AS schema_name,
        o.name AS object_name,
        c.name AS column_name
    FROM sys.columns c
    JOIN sys.objects o ON c.object_id = o.object_id
    JOIN sys.schemas s ON o.schema_id = s.schema_id
    WHERE c.name LIKE '%TEDAR%' OR c.name LIKE '%TEDARIK%'
    ORDER BY o.type_desc, o.name
    """)
    rows = cur.fetchall()
    print(f"Found {len(rows)} matching objects:")
    for r in rows:
        print(f"  [{r[0]}] {r[1]}.{r[2]} -> {r[3]}")
