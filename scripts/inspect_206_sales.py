import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd

parquet_path = "backend/data/parquet_cache/sales_snapshot.parquet"
df = pd.read_parquet(parquet_path, engine='pyarrow', filters=[
    ('store_code', '=', '206'),
    ('sale_date', '=', '2026-11-04')
])

print(f"Store 206 on 2026-11-04 rows: {len(df)}")
print(f"Total sales qty: {df['sales_qty'].sum():,.2f}")
print(f"Total sales amount: {df['sales_amount'].sum():,.2f}")

top_items = df.sort_values(by='sales_qty', ascending=False).head(10)
print("\nTop 10 items sold in Store 206 on 2026-11-04:")
for _, r in top_items.iterrows():
    print(f"  {r['item_code']} | {r.get('item_name', '')} | Qty: {r['sales_qty']:,.2f} | AZN: {r['sales_amount']:,.2f}")
