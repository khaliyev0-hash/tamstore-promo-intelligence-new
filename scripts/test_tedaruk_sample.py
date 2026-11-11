import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# Check sample promo items from active campaign
import pandas as pd
df_camp = pd.read_parquet("backend/data/parquet_cache/items.parquet")
sample_codes = df_camp['item_code'].dropna().unique()[:20].tolist()
print("Sample codes:", sample_codes[:5])

placeholders = ",".join([f"'{c}'" for c in sample_codes])
q = f"""
SELECT 
    CAST([IS YERI NO] AS VARCHAR(20)) as store_code,
    LTRIM(RTRIM(CAST([URUN KODU] AS VARCHAR(50)))) as item_code,
    CAST([IS YERI TEDARUK TIPI] AS INT) as tedaruk_tipi,
    LTRIM(RTRIM(CAST([SIFARISE ACIQ] AS VARCHAR(20)))) as sifarise_aciq
FROM vw_TS_ITEMS_DETAIL_MAGAZA_FOR_PLANNING WITH (NOLOCK)
WHERE LTRIM(RTRIM(CAST([URUN KODU] AS VARCHAR(50)))) IN ({placeholders})
"""
cur.execute(q)
rows = cur.fetchall()
print(f"Total rows fetched for {len(sample_codes)} sample items: {len(rows)}")

df_res = pd.DataFrame([list(r) for r in rows], columns=['store_code', 'item_code', 'tedaruk_tipi', 'sifarise_aciq'])
print("\nTedaruk tipi value counts in sample:")
print(df_res['tedaruk_tipi'].value_counts(dropna=False))

print("\nSample item distinct tedaruk_tipi per item:")
for ic, g in df_res.groupby('item_code'):
    distinct_types = g['tedaruk_tipi'].unique().tolist()
    print(f"  Item {ic}: stores={len(g)}, types={distinct_types}")

conn.close()
