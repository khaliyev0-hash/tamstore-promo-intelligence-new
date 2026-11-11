import urllib.request, json
res = urllib.request.urlopen('http://localhost:8000/api/current-analysis')
data = json.loads(res.read().decode('utf-8'))
analytics = data.get('analytics', {})
sp = analytics.get('store_performances', [])
for s in sp[:10]:
    print(f"Store: {s.get('store')!r} | FC: {s.get('total_fc')} | Sale: {s.get('total_sale')} | %: {s.get('achievement_pct')}")

match = [s for s in sp if '206' in str(s.get('store', '')) or 'Bineqedi' in str(s.get('store', '')) or 'Binəqədi' in str(s.get('store', ''))]
print("\nMatching 206:", json.dumps(match, indent=2))
