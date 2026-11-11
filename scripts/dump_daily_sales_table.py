import sys, json, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

for label, url in [
    ("Store 206 (Bineqedi 5-City)", 'http://localhost:8000/api/daily-sales?store=206'),
    ("Overall (All Stores)", 'http://localhost:8000/api/daily-sales')
]:
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode('utf-8'))
        print(f"\n=================== {label} ===================")
        print(f"{'Date':<12} | {'Daily Sale':<12} | {'Daily AZN':<12} | {'Daily %':<10} | {'Cum %':<10} | {'Future?':<8}")
        print("-" * 75)
        for row in data:
            d = row.get('date')
            s_val = row.get('daily_sale')
            a_val = row.get('daily_amount')
            dp_val = row.get('daily_pct')
            cp_val = row.get('cumulative_pct')
            
            s = f"{s_val:,.2f}" if s_val is not None else "None"
            a = f"{a_val:,.2f}" if a_val is not None else "None"
            dp = f"{dp_val:.2f}%" if dp_val is not None else "None"
            cp = f"{cp_val:.2f}%" if cp_val is not None else "None"
            f = str(row.get('is_future'))
            print(f"{d:<12} | {s:<12} | {a:<12} | {dp:<10} | {cp:<10} | {f:<8}")
