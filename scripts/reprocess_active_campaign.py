import sys
sys.path.insert(0, 'backend')
import os
import json
from app.services.source_service import process_excel_file

excel_path = 'TEST1.xlsx'
print(f"Reprocessing {excel_path} with updated sales data...")
res = process_excel_file(excel_path, trigger='manual', original_filename='TEST1.xlsx')
print("Status:", res.get("status"))
print("Campaign ID:", res.get("campaign_id"))

# Check daily sales in the newly generated archive
cid = res.get("campaign_id")
target_file = f'backend/data/campaigns/{cid}.json'
if os.path.exists(target_file):
    with open(target_file, 'r', encoding='utf-8') as f:
        camp = json.load(f)
    ds = camp.get('daily_sales') or camp.get('analytics', {}).get('daily_sales')
    print("Daily sales length:", len(ds) if ds else None)
    if ds:
        for d in ds[:8]:
            print(f"Day {d['day']} ({d['date']}): sale={d['daily_sale']}, cum_pct={d['cumulative_pct']}%, ideal_pct={d['ideal_pct']}%, is_future={d['is_future']}")
    kpi = camp.get('analytics', {}).get('kpi_cards', {})
    print("KPI total_sales:", kpi.get('total_sales'), "achievement_pct:", kpi.get('achievement_pct'))
