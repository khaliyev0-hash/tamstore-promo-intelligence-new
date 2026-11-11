import sys
import urllib.request
import json

sys.stdout.reconfigure(encoding='utf-8')
url = 'http://localhost:8000/api/daily-sales?store=206'
try:
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print(f"Daily sales for store 206 ({len(data)} records):")
        for d in data:
            print(f"  {d['date']}: sale={d['daily_sale']}, cum_pct={d['cumulative_pct']}%, future={d['is_future']}")
except Exception as e:
    print("Error:", e)
