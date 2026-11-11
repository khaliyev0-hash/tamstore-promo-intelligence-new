import sys, os, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
import pandas as pd
from app.db import get_db_connection

df_promo = pd.read_excel("TEST1.xlsx")
# find code column
code_col = [c for c in df_promo.columns if 'KOD' in c.upper() or 'CODE' in c.upper()][0]
promo_codes = df_promo[code_col].dropna().astype(str).str.strip().unique().tolist()
print(f"TEST1.xlsx promo items count: {len(promo_codes)}")

conn = get_db_connection()
cur = conn.cursor()

# Query in chunks of 500
all_rows = []
t0 = time.time()
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

print(f"Fetched {len(all_rows):,} rows for {len(promo_codes)} promo items in {time.time()-t0:.2f}s")
df_res = pd.DataFrame([list(r) for r in all_rows], columns=['store_code', 'item_code', 'tedaruk_tipi', 'sifarise_aciq'])
print("Tedaruk tipi value distribution:")
print(df_res['tedaruk_tipi'].value_counts(dropna=False))

conn.close()
