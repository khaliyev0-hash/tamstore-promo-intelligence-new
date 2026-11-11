import json

with open('backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json', 'r', encoding='utf-8') as f:
    camp = json.load(f)

prods = camp['analytics']['product_performances']
firma = [p for p in prods if p.get('supply_type') == 'Firma' or p.get('tedaruk_tipi_raw') == 41]
firma.sort(key=lambda x: x.get('total_sale', 0), reverse=True)

print(f"Total Firma products: {len(firma)}")
for p in firma[:6]:
    s = int(round(p.get('total_sale', 0)))
    fc = int(round(p.get('total_fc', 0)))
    name = p['name'].encode('ascii', 'replace').decode('ascii')
    print(f"  [{p['code']}] {name[:35]:35} | Satis: {s:>7,d} u | FC: {fc:>7,d} u | Tedaruk: {p.get('tedaruk_tipi_raw')}")
