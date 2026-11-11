import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

q = """
SELECT 
    t.name AS table_name,
    c.name AS column_name,
    ty.name AS type_name
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE c.name LIKE '%TEDAR%' OR c.name LIKE '%TEDARIK%' OR c.name LIKE '%TIPI%'
ORDER BY t.name, c.name
"""
cur.execute(q)
rows = cur.fetchall()
print(f"Found {len(rows)} matching columns in base tables:")
for r in rows:
    print(f"  {r[0]}.{r[1]} ({r[2]})")

conn.close()
