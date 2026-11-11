import sys, os, time, json
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
import pandas as pd
from app.db import get_db_connection

t0 = time.time()
with open('backend/data/campaigns/2910_-_1111_Promo_2026-10-29_2026-11-11.json', 'r', encoding='utf-8') as f:
    d = json.load(f)
fact_records = d.get('fact_records', [])
promo_codes = list(set(r['CODE'] for r in fact_records if r.get('CODE')))
print(f"Loaded {len(promo_codes)} promo codes in {time.time()-t0:.2f}s")

conn = get_db_connection()
cur = conn.cursor()

# Query in chunks of 500
all_rows = []
t1 = time.time()
chunk_size = 500
for i in range(0, len(promo_codes), chunk_size):
    chunk = promo_codes[i:i+chunk_size]
    ph = ",".join([f"'{c}'" for c in chunk])
    q = f"""
    SELECT 
        CAST([IS YERI NO] AS VARCHAR(20)) as store_code,
        CAST([URUN KODU] AS VARCHAR(50)) as item_code,
        [IS YERI TEDARUK TIPI] as tedaruk_tipi,
        [SIFARISE ACIQ] as sifarise_aciq
    FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
    WHERE [URUN KODU] IN ({ph})
    """
    cur.execute(q)
    rows = cur.fetchall()
    all_rows.extend(rows)

print(f"Fetched {len(all_rows):,} rows for {len(promo_codes)} promo items in {time.time()-t1:.2f}s")
df_res = pd.DataFrame([list(r) for r in all_rows], columns=['store_code', 'item_code', 'tedaruk_tipi', 'sifarise_aciq'])
print("Tedaruk tipi value distribution across active promo campaign:")
print(df_res['tedaruk_tipi'].value_counts(dropna=False))

conn.close()
