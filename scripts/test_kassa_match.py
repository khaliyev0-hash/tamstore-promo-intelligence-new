import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd
import json

with open('backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json', 'r', encoding='utf-8') as f:
    camp = json.load(f)

fact_records = camp['fact_records']
item_codes = list(set(str(r['CODE']).strip() for r in fact_records))
store_codes = list(set(str(r['STORE']).strip() for r in fact_records))

print(f"Total campaign items: {len(item_codes)}, stores: {len(store_codes)}")

conn = db.get_db_connection()

# Test query for 2026-11-04
q = """
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
import time
t0 = time.time()
df = pd.read_sql_query(q, conn)
print(f"Fetched {len(df):,} rows from VW_KASSA_SATISLAR for 2026-11-04 in {time.time()-t0:.2f}s")
print(df.head())
print("Total sales qty on 2026-11-04 across all items:", df['sales_qty'].sum())

# Match with promo items
df['norm_code'] = df['item_code'].astype(str).str.strip()
promo_set = set(item_codes)
promo_sales = df[df['norm_code'].isin(promo_set)]
print(f"Promo items matched on 2026-11-04: {len(promo_sales):,} rows")
print(f"Promo sales qty on 2026-11-04: {promo_sales['sales_qty'].sum():,.1f} units")
print(f"Promo sales amount on 2026-11-04: {promo_sales['sales_amount'].sum():,.2f} AZN")
