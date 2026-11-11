import sys
import urllib.request
import json

sys.stdout.reconfigure(encoding='utf-8')
url = 'http://localhost:8000/api/store-daily-stock?store=206'
try:
    with urllib.request.urlopen(url, timeout=10) as resp:
        d = json.loads(resp.read().decode())
        print("store-daily-stock 206 keys:", list(d.keys()))
        print("dates:", d.get('dates'))
        prods = d.get('products', [])
        print(f"products count: {len(prods)}")
        if prods:
            p0 = prods[0]
            print("sample product:", p0.get('code'), p0.get('name'), "sale:", p0.get('sale'), "fc:", p0.get('fc'))
            total_sales = sum(p.get('sale', 0) for p in prods)
            print(f"Total sales across all products for store 206: {total_sales}")
except Exception as e:
    print("Error:", e)
