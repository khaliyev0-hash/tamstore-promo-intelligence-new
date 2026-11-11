import sys
import app.db as db
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
conn = db.get_db_connection()
df = pd.read_sql_query("SELECT [MAGAZA KODU], [MAGAZA], [MAGAZA STATUSU], [TIP] FROM vw_TS_MARKET_DETAILS", conn)
print("Total rows in vw_TS_MARKET_DETAILS:", len(df))
print("\n[MAGAZA STATUSU] value counts:")
print(df['MAGAZA STATUSU'].value_counts(dropna=False))
print("\n[TIP] value counts for all stores:")
print(df['TIP'].value_counts(dropna=False))
print("\n[TIP] value counts where [MAGAZA STATUSU] == 'AKTIV':")
print(df[df['MAGAZA STATUSU'] == 'AKTIV']['TIP'].value_counts(dropna=False))
print("\nDistinct [MAGAZA KODU] where STATUS == 'AKTIV':", df[df['MAGAZA STATUSU'] == 'AKTIV']['MAGAZA KODU'].nunique())
