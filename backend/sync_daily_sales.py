import os
import sys
import time
import json
from datetime import datetime, date
import pandas as pd

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import app.db as db

sys.stdout.reconfigure(encoding='utf-8')

PARQUET_DIR = db.PARQUET_DIR
SALES_PARQUET = db.SALES_PARQUET
META_JSON = os.path.join(PARQUET_DIR, "cache_metadata.json")

def sync_missing_sales(force: bool = False):
    if not os.path.exists(SALES_PARQUET):
        print("SALES_PARQUET does not exist, full export needed.")
        return

    today_str = datetime.now().strftime("%Y-%m-%d")
    recent_start = (datetime.now() - pd.Timedelta(days=5)).strftime("%Y-%m-%d")

    print(f"Checking sales cache from {recent_start} to {today_str}...", flush=True)

    try:
        existing_df = pd.read_parquet(
            SALES_PARQUET, 
            engine='pyarrow', 
            columns=['sale_date'],
            filters=[('sale_date', '>=', recent_start)]
        )
        date_counts = existing_df['sale_date'].value_counts().to_dict() if not existing_df.empty else {}
    except Exception as e:
        print(f"Error reading existing recent sale_dates: {e}")
        date_counts = {}

    expected_dates = pd.date_range(recent_start, today_str).strftime('%Y-%m-%d').tolist()
    dates_to_sync = []
    for d in expected_dates:
        cnt = date_counts.get(d, 0)
        # Any date with under 5,000 rows (like 2026-11-04 with 184 rows) or missing needs sync
        if cnt < 5000 or (d == today_str and force):
            dates_to_sync.append(d)

    if not dates_to_sync and not force:
        print("Sales cache is fully up to date for all recent dates.")
        return

    sync_start = min(dates_to_sync) if dates_to_sync else today_str
    sync_end = today_str
    print(f"Syncing sales for dates: {dates_to_sync} (Query range: {sync_start} to {sync_end})...", flush=True)

    t0 = time.time()
    new_sales = db.fetch_sales_from_sql(sync_start, sync_end)
    print(f"Fetched {len(new_sales):,} sales rows from SQL in {time.time()-t0:.2f}s", flush=True)

    if new_sales.empty:
        print("No new sales records found in SQL Server.")
        return

    new_sales['export_timestamp'] = datetime.now().isoformat()
    
    t1 = time.time()
    print("Updating parquet cache on disk...", flush=True)
    full_df = pd.read_parquet(SALES_PARQUET, engine='pyarrow')
    overlapping_dates = new_sales['sale_date'].unique()
    full_df = full_df[~full_df['sale_date'].isin(overlapping_dates)]
    
    combined_df = pd.concat([full_df, new_sales], ignore_index=True)
    combined_df.to_parquet(SALES_PARQUET, engine='pyarrow', compression='snappy', index=False)
    print(f"Updated {SALES_PARQUET} with {len(combined_df):,} total rows in {time.time()-t1:.2f}s", flush=True)

    new_max = str(combined_df['sale_date'].max())
    print(f"New max sale_date in cache: {new_max}")

    # Update metadata
    if os.path.exists(META_JSON):
        try:
            with open(META_JSON, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            meta['max_sale_date'] = new_max
            meta['sales_rows'] = len(combined_df)
            meta['last_synced_dates'] = list(overlapping_dates)
            meta['last_incremental_sync'] = datetime.now().isoformat()
            with open(META_JSON, 'w', encoding='utf-8') as f:
                json.dump(meta, f, indent=2)
            print("Updated cache_metadata.json")
        except Exception as e:
            print(f"Warning: could not update metadata: {e}")

if __name__ == "__main__":
    sync_missing_sales(force=True)
