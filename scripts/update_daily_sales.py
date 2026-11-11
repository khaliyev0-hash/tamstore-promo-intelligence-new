import sys
import json
import os
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.db import fetch_promo_sales_and_stock
from app.analytics.time_series import calculate_daily_sales_series

target_file = 'backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json'
with open(target_file, 'r', encoding='utf-8') as f:
    camp = json.load(f)

fact_df = pd.DataFrame(camp['fact_records'])
beg_date = camp.get('beg_date')
end_date = camp.get('end_date')

item_codes = list(fact_df['CODE'].astype(str).unique())
store_codes = list(fact_df['STORE'].astype(str).unique())

print(f'Fetching db_df for {beg_date} to {end_date} across {len(item_codes)} items and {len(store_codes)} stores...')
db_df = fetch_promo_sales_and_stock(beg_date, end_date, item_codes, store_codes)
print(f'db_df rows: {len(db_df)}')

total_fc = camp.get('analytics', {}).get('kpi_cards', {}).get('total_forecast', 1150097.0)
total_fc_azn = camp.get('analytics', {}).get('kpi_cards', {}).get('total_forecast_azn', 0.0)

ds = calculate_daily_sales_series(
    db_df=db_df,
    fact_df=fact_df,
    beg_date=beg_date,
    end_date=end_date,
    total_fc=total_fc,
    total_fc_azn=total_fc_azn
)

print(f'Calculated daily sales series length: {len(ds) if ds else None}')
if ds:
    camp['daily_sales'] = ds
    if 'analytics' in camp and isinstance(camp['analytics'], dict):
        camp['analytics']['daily_sales'] = ds

    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(camp, f, ensure_ascii=False, default=str)
    print('Successfully updated daily_sales in campaign archive!')
else:
    print('Warning: ds calculation returned None!')
