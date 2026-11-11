import sys
import json
import os
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.main import process_analytics, DEFAULT_SETTINGS

target_file = 'backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json'
with open(target_file, 'r', encoding='utf-8') as f:
    camp = json.load(f)

fact_df = pd.DataFrame(camp['fact_records'])
timeline_df = pd.DataFrame(camp.get('timeline_records', []))
beg_date = camp.get('beg_date')
end_date = camp.get('end_date')

print('Re-processing analytics for archive...')
analytics = process_analytics(fact_df, timeline_df, DEFAULT_SETTINGS, beg_date=beg_date, end_date=end_date)
camp['analytics'] = analytics
camp['daily_sales'] = analytics.get('daily_sales')

with open(target_file, 'w', encoding='utf-8') as f:
    json.dump(camp, f, ensure_ascii=False, default=str)

print('Successfully re-saved campaign archive!')
p106879 = [p for p in analytics['product_performances'] if str(p.get('code')) == '106879'][0]
print(f"Product 106879 in saved file:")
print(f"Status: {p106879.get('status')}")
print(f"Active stores: {p106879.get('active_store_count')}")
print(f"Passive stores: {p106879.get('passive_store_count')}")
