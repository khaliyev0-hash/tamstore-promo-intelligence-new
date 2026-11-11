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
print(f"Loaded {len(promo_codes)} promo codes in {time.time()-t0:.2f}s", flush=True)

conn = get_db_connection()
cur = conn.cursor()

# Create temp table
t1 = time.time()
cur.execute("CREATE TABLE #P_ITEMS (code VARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY)")
# Insert promo_codes using executemany
cur.fast_executemany = True
cur.executemany("INSERT INTO #P_ITEMS VALUES (?)", [(c,) for c in promo_codes])
print(f"Inserted {len(promo_codes)} into #P_ITEMS in {time.time()-t1:.2f}s", flush=True)

# Join with vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING
t2 = time.time()
q = """
SELECT 
    CAST(v.[IS YERI NO] AS VARCHAR(20)) as store_code,
    CAST(v.[URUN KODU] AS VARCHAR(50)) as item_code,
    v.[IS YERI TEDARUK TIPI] as tedaruk_tipi,
    v.[SIFARISE ACIQ] as sifarise_aciq
FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING v WITH (NOLOCK)
INNER JOIN #P_ITEMS p ON v.[URUN KODU] = p.code
"""
cur.execute(q)
rows = cur.fetchall()
print(f"JOIN fetched {len(rows):,} rows in {time.time()-t2:.2f}s", flush=True)

df_res = pd.DataFrame([list(r) for r in rows], columns=['store_code', 'item_code', 'tedaruk_tipi', 'sifarise_aciq'])
print("Tedaruk tipi value distribution across active promo campaign:", flush=True)
print(df_res['tedaruk_tipi'].value_counts(dropna=False), flush=True)

conn.close()
