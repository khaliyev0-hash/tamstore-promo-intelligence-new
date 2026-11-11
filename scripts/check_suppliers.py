import sys
import json
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

campaign_path = r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json"

with open(campaign_path, 'r', encoding='utf-8') as f:
    camp = json.load(f)

facts = camp.get('fact_records', [])
print(f"Total fact records: {len(facts)}")

suppliers = Counter(f.get('SUPPLIER') for f in facts)
print("Top 15 suppliers in campaign:")
for s, count in suppliers.most_common(15):
    print(f"  {s}: {count} records")
