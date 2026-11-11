import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

supply_file = r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\item_supply_types.json"
camp_file = r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json"

with open(supply_file, 'r', encoding='utf-8') as f:
    supplies = json.load(f)
    labels = supplies.get('labels', {})
    raws = supplies.get('raw_codes', {})

with open(camp_file, 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp.get('analytics', {}).get('product_performances', [])
print(f"Total products in campaign: {len(prods)}")

updated_count = 0
for p in prods:
    cd = str(p.get('code', '')).strip()
    lbl = labels.get(cd, "Firma")
    raw = raws.get(cd, 41)
    p['supply_type'] = lbl
    p['tedaruk_tipi'] = lbl
    p['tedaruk_tipi_raw'] = raw
    updated_count += 1

with open(camp_file, 'w', encoding='utf-8') as f:
    json.dump(camp, f, ensure_ascii=False)

print(f"Successfully updated {updated_count} products in campaign JSON with supply_type!")
