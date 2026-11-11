import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')

with open('backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

prods = d.get('analytics', {}).get('product_performances', [])
fact_recs = d.get('fact_records', [])

print(f"Total products: {len(prods)}")
print(f"Total fact records: {len(fact_recs)}")

# Check suppliers
suppliers = set(r.get('SUPPLIER') for r in fact_recs if r.get('SUPPLIER'))
print(f"Distinct suppliers: {len(suppliers)}")
for s in sorted(list(suppliers))[:10]:
    print("  Supplier:", s)
