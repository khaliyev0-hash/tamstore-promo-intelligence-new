import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd
import json
import time
from app.analytics.time_series import calculate_daily_sales_series

with open('backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json', 'r', encoding='utf-8') as f:
    camp = json.load(f)

fact_df = pd.DataFrame(camp['fact_records'])
beg_date = camp.get('beg_date')
end_date = camp.get('end_date')

t0 = time.time()
sales_parquet = db.SALES_PARQUET
df_parquet = pd.read_parquet(
    sales_parquet, 
    engine='pyarrow',
    columns=['sale_date', 'store_code', 'item_code', 'sales_qty', 'sales_amount'],
    filters=[('sale_date', '>=', beg_date), ('sale_date', '<=', '2026-11-03')]
)
print(f"Read filtered parquet in {time.time()-t0:.2f}s: {len(df_parquet):,} rows")

t0 = time.time()
conn = db.get_db_connection()
q_nov4 = """
SELECT 
    CONVERT(VARCHAR(10), TARIX, 120) AS sale_date,
    LTRIM(RTRIM(MAGAZA_KODU)) AS store_code,
    LTRIM(RTRIM(MEHSUL_KODU)) AS item_code,
    SUM(ISNULL(MIQDAR, 0)) AS sales_qty,
    SUM(ISNULL([CEM MEBLEG], 0)) AS sales_amount
FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR WITH (NOLOCK)
WHERE TARIX >= '2026-11-04' AND TARIX < '2026-11-05'
GROUP BY CONVERT(VARCHAR(10), TARIX, 120), LTRIM(RTRIM(MAGAZA_KODU)), LTRIM(RTRIM(MEHSUL_KODU))
"""
df_nov4 = pd.read_sql_query(q_nov4, conn)
print(f"Read VW_KASSA_SATISLAR in {time.time()-t0:.2f}s: {len(df_nov4):,} rows")

q_ws = """
SELECT 
    CAST([TARIX] AS VARCHAR(10)) AS sale_date,
    CAST([MAGAZA] AS VARCHAR(20)) AS store_code,
    LTRIM(RTRIM(CAST([MEHSUL_KODU] AS VARCHAR(50)))) AS item_code,
    SUM(ISNULL([MIQDARI], 0)) AS sales_qty,
    SUM(ISNULL([SATIS_EDV], 0)) AS sales_amount
FROM fnc_TS_SALES_REPORT_FOR_PLANNING('2026-11-04', '2026-11-04')
GROUP BY [TARIX], CAST([MAGAZA] AS VARCHAR(20)), LTRIM(RTRIM(CAST([MEHSUL_KODU] AS VARCHAR(50))))
"""
df_ws = pd.read_sql_query(q_ws, conn)

combined_nov4 = pd.concat([df_nov4, df_ws], ignore_index=True)
combined_nov4 = combined_nov4.groupby(['sale_date', 'store_code', 'item_code'], as_index=False).agg({
    'sales_qty': 'sum',
    'sales_amount': 'sum'
})

combined_all = pd.concat([df_parquet, combined_nov4], ignore_index=True)

total_fc = camp['analytics']['kpi_cards']['total_forecast']
total_fc_azn = camp['analytics']['kpi_cards'].get('total_forecast_azn', 0.0)

ds = calculate_daily_sales_series(
    db_df=combined_all,
    fact_df=fact_df,
    beg_date=beg_date,
    end_date=end_date,
    total_fc=total_fc,
    total_fc_azn=total_fc_azn,
    as_of_date='2026-11-04'
)

print("\nCalculated daily sales series:")
for d in ds:
    print(f"Day {d['day']} ({d['date']}): sale={d['daily_sale']}, cum_pct={d['cumulative_pct']}%, ideal_pct={d['ideal_pct']}%, is_future={d['is_future']}")
