# TAMSTORE Promo Intelligence

TamStore Promosiya, Stok və Proqnoz Təhlili Platforması (FastAPI + React Vite).

## Platformanı İşə Salmaq (Quick Start)

Windows mühitində tətbiqi işə salmaq üçün hazır skriptlərdən istifadə edə bilərsiniz:

- **`START.bat`** (və ya `run.bat`): Həm FastAPI Backend (port 8000), həm də React Frontend (port 5173) serverlərini avtomatik işə salır və brauzerdə açır.
- **`STOP.bat`**: Bütün aktiv və ya fonda ilişib qalmış serverləri təhlükəsiz dayandırır və 8000/5173 portlarını azad edir.
- **`RESTART.bat`**: Serverləri təmizləyib dərhal yenidən başladır.
- **`start.ps1`**: PowerShell istifadəçiləri üçün alternativ başlatma skripti.

Terminaldan əl ilə işə salmaq üçün:
```bash
py -3 run_app.py
```

---

## Parquet Sales History & Extraction Commands

### 1. Extract Last 3 Months (Default)
Extracts daily sales history for the last 3 months up to yesterday:
```bash
py backend/scripts/export_sales_to_parquet.py --months 3
```

### 2. Extract Specific Date Range
Extracts daily sales history for an explicit date range:
```bash
py backend/scripts/export_sales_to_parquet.py --from 2026-07-01 --to 2026-09-30
```

### 3. Incremental Update
Reloads recent days (from last loaded day - 3 days to yesterday) to catch late corrections/returns and appends new days:
```bash
py backend/scripts/export_sales_to_parquet.py --update
```

### Additional Options
- `--chunk-days N`: Specify chunk size in days (default: `1`).
- `--sleep SECONDS`: Sleep duration between chunk requests in seconds (default: `0.5`).
- `--overwrite`: Force re-extraction of all specified days.

## Rebuilding from Scratch
To completely rebuild the local Parquet cache from scratch:
```bash
# Delete existing cache directory (Windows PowerShell)
Remove-Item -Recurse -Force backend/data/parquet_cache

# Run full 3-month extraction with overwrite flag
py backend/scripts/export_sales_to_parquet.py --months 3 --overwrite
```

## Directory Structure & Storage
```text
backend/data/parquet_cache/
├── items.parquet
└── sales/
    ├── _manifest.json
    ├── sale_date=2026-07-10/
    │   └── part-0.parquet
    ├── sale_date=2026-07-11/
    │   └── part-0.parquet
    └── ...
```
