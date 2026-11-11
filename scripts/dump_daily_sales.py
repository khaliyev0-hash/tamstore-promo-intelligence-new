import sys, json, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

with urllib.request.urlopen('http://localhost:8000/api/daily-sales?store=206') as res:
    data = json.loads(res.read().decode('utf-8'))
    print("Store 206:", json.dumps(data[:3], indent=2))

with urllib.request.urlopen('http://localhost:8000/api/daily-sales') as res:
    data = json.loads(res.read().decode('utf-8'))
    print("Overall:", json.dumps(data[:3], indent=2))
