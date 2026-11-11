import sys
import json
import os
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
import app.db as db

conn = db.get_db_connection()

print("--- 1. Checking VW_KASSA_SATISLAR for 206 ---")
q_kassa = """
SELECT 
    CONVERT(VARCHAR(10), TARIX, 120) as sale_date,
    MAGAZA_KODU,
    MAGAZA_ADI,
    COUNT(*) as row_cnt,
    SUM(MIQDAR) as total_qty,
    SUM([CEM MEBLEG]) as total_amount
FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR WITH (NOLOCK)
WHERE (MAGAZA_KODU LIKE '%206%' OR MAGAZA_ADI LIKE '%206%')
  AND TARIX >= '2026-11-03' AND TARIX < '2026-11-05'
GROUP BY CONVERT(VARCHAR(10), TARIX, 120), MAGAZA_KODU, MAGAZA_ADI
ORDER BY sale_date, MAGAZA_KODU
"""
try:
    df_k = pd.read_sql_query(q_kassa, conn)
    print(df_k.to_string())
except Exception as e:
    print('Error kassa:', e)

print("\n--- 2. Checking fnc_TS_SALES_REPORT_FOR_PLANNING for 206 ---")
q_erp = """
SELECT 
    CAST([TARIX] AS VARCHAR(10)) as sale_date,
    CAST([MAGAZA] AS VARCHAR(20)) as store_code,
    COUNT(*) as row_cnt,
    SUM(ISNULL([MIQDARI], 0)) as total_qty
FROM fnc_TS_SALES_REPORT_FOR_PLANNING('2026-11-03', '2026-11-04')
WHERE CAST([MAGAZA] AS VARCHAR(20)) LIKE '%206%'
GROUP BY [TARIX], CAST([MAGAZA] AS VARCHAR(20))
ORDER BY [TARIX]
"""
try:
    df_e = pd.read_sql_query(q_erp, conn)
    print(df_e.to_string())
except Exception as e:
    print('Error erp:', e)

print("\n--- 3. Checking sales_snapshot.parquet for 206 ---")
if os.path.exists(db.SALES_PARQUET):
    try:
        df_p = pd.read_parquet(
            db.SALES_PARQUET,
            engine='pyarrow',
            columns=['sale_date', 'store_code', 'item_code', 'sales_qty', 'sales_amount'],
            filters=[('store_code', 'in', ['206', '0206', '00206', 'M206'])]
        )
        print("Parquet total rows for 206:", len(df_p))
        df_p_recent = df_p[df_p['sale_date'] >= '2026-11-01']
        print(df_p_recent.groupby('sale_date').agg({'sales_qty': 'sum', 'item_code': 'count'}))
    except Exception as e:
        print('Error parquet:', e)

print("\n--- 4. Checking Campaign JSON for Store 206 ---")
camp_file = 'backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json'
if os.path.exists(camp_file):
    with open(camp_file, 'r', encoding='utf-8') as f:
        camp = json.load(f)
    sp = camp.get('analytics', {}).get('store_performances', [])
    sp_206 = [s for s in sp if '206' in str(s.get('store'))]
    print("Store performance for 206 in active campaign:")
    print(json.dumps(sp_206, indent=2, ensure_ascii=False))

    facts_206 = [r for r in camp.get('fact_records', []) if str(r.get('STORE')) in ('206', '0206')]
    print(f"Fact records for 206: count={len(facts_206)}")
    if facts_206:
        total_fc_206 = sum(float(r.get('FC', 0) or 0) for r in facts_206)
        total_sale_206 = sum(float(r.get('SALE', 0) or 0) for r in facts_206)
        print(f"Store 206 sum FC: {total_fc_206}, sum SALE: {total_sale_206}")
        # check how many have SALE > 0
        with_sales = [r for r in facts_206 if float(r.get('SALE', 0) or 0) > 0]
        print(f"Items with SALE > 0: {len(with_sales)}")
