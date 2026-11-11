import sys, os, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
import pandas as pd
from app.db import get_db_connection

df_items = pd.read_parquet("backend/data/parquet_cache/items.parquet")
promo_codes = df_items['item_code'].dropna().unique().tolist()
print(f"Total promo items to check: {len(promo_codes)}")

conn = get_db_connection()
cur = conn.cursor()

# Split promo_codes into chunks of 1000 for SQL IN clause
all_rows = []
t0 = time.time()
chunk_size = 1000
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

print(f"Fetched {len(all_rows):,} rows for promo items in {time.time()-t0:.2f}s")

df_promo_tedaruk = pd.DataFrame([list(r) for r in all_rows], columns=['store_code', 'item_code', 'tedaruk_tipi', 'sifarise_aciq'])
print("Tedaruk tipi value distribution across promo items:")
print(df_promo_tedaruk['tedaruk_tipi'].value_counts(dropna=False))

conn.close()
