import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

campaign_path = r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json"

with open(campaign_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

prods = data.get('analytics', {}).get('product_performances', [])
print(f"Total products in analytics: {len(prods)}")
if prods:
    p0 = prods[0]
    print("Keys in product_performance[0]:", list(p0.keys()))
    print("p0 sample:", {k: p0[k] for k in list(p0.keys())[:10]})

fact_records = data.get('fact_records', [])
print(f"Total fact_records: {len(fact_records)}")
if fact_records:
    f0 = fact_records[0]
    print("Keys in fact_records[0]:", list(f0.keys()))
    print("f0 sample:", f0)
