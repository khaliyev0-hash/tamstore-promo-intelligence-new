import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

campaign_path = r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend\data\campaigns\2910_-_1111_Promo_2026-10-29_2026-11-11.json"

with open(campaign_path, 'r', encoding='utf-8') as f:
    camp = json.load(f)

facts = camp.get('fact_records', [])
suppliers = sorted(list(set(str(f.get('SUPPLIER', '')).strip() for f in facts if f.get('SUPPLIER'))))
print(f"Total distinct suppliers: {len(suppliers)}")
depo_sups = [s for s in suppliers if 'DEPO' in s.upper() or 'ANBAR' in s.upper() or 'MERKEZ' in s.upper() or 'LOGIST' in s.upper()]
print("Suppliers with DEPO/ANBAR/MERKEZ/LOGIST:", depo_sups)
