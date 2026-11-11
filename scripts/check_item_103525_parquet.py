import pandas as pd
df = pd.read_parquet("backend/data/parquet_cache/stock_snapshot.parquet", filters=[('item_code', '=', '103525')])
print("Rows for 103525 in stock_snapshot:", len(df))
if not df.empty:
    r = df.iloc[0]
    print("Item Code:", r['item_code'])
    print("Item Name:", r.get('item_name'))
    print("Category:", r.get('category_name'))
    print("Family:", r.get('family_name'))
    print("Sales Price:", r.get('sales_price'))
