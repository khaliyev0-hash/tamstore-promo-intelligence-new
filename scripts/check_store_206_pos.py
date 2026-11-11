import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.db import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

# 1. Print columns of VW_KASSA_SATISLAR
cursor.execute("SELECT TOP 1 * FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR")
cols = [desc[0] for desc in cursor.description]
print("Columns of VW_KASSA_SATISLAR:", cols)

# 2. Check Logo ERP fnc_TS_SALES_REPORT_FOR_PLANNING for store 206 on 2026-11-04
erp_sql = """
SELECT COUNT(*), SUM(MIQDARI), SUM(SATIS_EDV)
FROM dbo.fnc_TS_SALES_REPORT_FOR_PLANNING('2026-11-04', '2026-11-04')
WHERE LTRIM(RTRIM(CAST(MAGAZA AS VARCHAR(20)))) = '206'
"""
cursor.execute(erp_sql)
erp_res = cursor.fetchone()
print(f"Logo ERP (fnc_TS_SALES_REPORT_FOR_PLANNING) for Store 206 on 2026-11-04: Rows={erp_res[0]}, Sale={erp_res[1]}, AZN={erp_res[2]}")

# 3. Check Logo ERP STLINE for TRCODE 7 vs 8 on 2026-11-04
stline_sql = """
SELECT 
    TRCODE,
    COUNT(*) as line_count,
    SUM(AMOUNT) as total_amount
FROM LTAMSTORE.dbo.LG_001_01_STLINE WITH (NOLOCK)
WHERE DATE_ = '2026-11-04'
  AND CANCELLED = 0
GROUP BY TRCODE
"""
cursor.execute(stline_sql)
stline_rows = cursor.fetchall()
print("Logo ERP (LG_001_01_STLINE) all stores on 2026-11-04 by TRCODE:")
for r in stline_rows:
    trcode_desc = "Pərakəndə Satış (Retail POS)" if r[0] == 7 else ("Topdan Satış (Wholesale)" if r[0] == 8 else f"TRCODE {r[0]}")
    print(f"  {trcode_desc} (TRCODE {r[0]}): Lines={r[1]:,}, Amount={r[2]:,.2f}")

conn.close()
