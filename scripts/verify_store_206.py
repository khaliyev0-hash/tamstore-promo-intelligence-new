import sys, json, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

try:
    with urllib.request.urlopen('http://localhost:8000/api/daily-sales?store=206') as res:
        data = json.loads(res.read().decode('utf-8'))
        print("--- Daily Sales for Store 206 (Type: %s, Len: %d) ---" % (type(data), len(data)))
        for row in data:
            print(f"Date: {row.get('date')} | Sale: {row.get('sale')} | Forecast: {row.get('forecast')} | Cum %: {row.get('cum_pct')}%")
except Exception as e:
    print("Error calling daily-sales for 206:", e)

try:
    with urllib.request.urlopen('http://localhost:8000/api/daily-sales') as res:
        data = json.loads(res.read().decode('utf-8'))
        print("\n--- Daily Sales Overall (Type: %s, Len: %d) ---" % (type(data), len(data)))
        for row in data:
            print(f"Date: {row.get('date')} | Sale: {row.get('sale')} | Forecast: {row.get('forecast')} | Cum %: {row.get('cum_pct')}%")
except Exception as e:
    print("Error calling daily-sales overall:", e)
