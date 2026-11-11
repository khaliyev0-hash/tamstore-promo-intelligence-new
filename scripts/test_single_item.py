import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\backend")
from app.db import fetch_single_item_store_details

t0 = time.time()
res = fetch_single_item_store_details('100012')
print(f"fetch_single_item_store_details('100012') took {time.time() - t0:.2f}s")
print(f"Total stores: {len(res)}")
if res:
    sample_key = list(res.keys())[0]
    print(f"Sample store {sample_key}:", res[sample_key])
