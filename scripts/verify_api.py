import sys
import urllib.request
import json

sys.stdout.reconfigure(encoding='utf-8')
with urllib.request.urlopen('http://localhost:8000/api/current-analysis', timeout=10) as resp:
    d = json.loads(resp.read().decode())
    print('Campaign ID:', d.get('id'))
    ds = d.get('daily_sales')
    print('daily_sales count:', len(ds) if isinstance(ds, list) else None)
    if ds:
        for day in ds:
            print(f"  {day.get('date')}: sale={day.get('daily_sale')}, cum={day.get('cumulative_pct')}%, future={day.get('is_future')}")
    kpi = d.get('analytics', {}).get('kpi_cards', {})
    print('KPI Total Sales:', kpi.get('total_sales'))
    print('KPI Achievement %:', kpi.get('achievement_pct'))
