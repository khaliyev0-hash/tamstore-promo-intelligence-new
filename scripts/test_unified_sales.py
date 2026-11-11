import sys
sys.path.insert(0, 'backend')
import app.db as db
import pandas as pd
import time

def fetch_sales_unified(start_date: str, end_date: str, conn=None) -> pd.DataFrame:
    """
    Unified High-Reliability Sales Fetcher:
    - Fetches sales from fnc_TS_SALES_REPORT_FOR_PLANNING (Logo ERP).
    - Checks daily row counts; for any date with < 5,000 rows (meaning Logo ERP retail
      cash register import hasn't run or is pending), automatically queries
      POSFAPCENTER.dbo.VW_KASSA_SATISLAR for live retail cash register sales.
    - Merges wholesale + retail so zero sales are ever lost.
    """
    close_conn = False
    if conn is None:
        conn = db.get_db_connection()
        close_conn = True

    try:
        t0 = time.time()
        q_erp = f"""
        SELECT 
            CAST([TARIX] AS VARCHAR(10)) AS sale_date,
            CAST([MAGAZA] AS VARCHAR(20)) AS store_code,
            LTRIM(RTRIM(CAST([MEHSUL_KODU] AS VARCHAR(50)))) AS item_code,
            SUM(ISNULL([MIQDARI], 0)) AS sales_qty,
            SUM(ISNULL([SATIS_EDV], 0)) AS sales_amount
        FROM fnc_TS_SALES_REPORT_FOR_PLANNING('{start_date}', '{end_date}')
        GROUP BY [TARIX], CAST([MAGAZA] AS VARCHAR(20)), LTRIM(RTRIM(CAST([MEHSUL_KODU] AS VARCHAR(50))))
        """
        df_erp = pd.read_sql_query(q_erp, conn)
        print(f"[UNIFIED] Logo ERP returned {len(df_erp):,} rows in {time.time()-t0:.2f}s")

        # Check date-by-date row counts
        expected_dates = pd.date_range(start_date, end_date).strftime('%Y-%m-%d').tolist()
        missing_or_incomplete_dates = []

        erp_date_counts = df_erp['sale_date'].value_counts().to_dict() if not df_erp.empty else {}
        for d in expected_dates:
            cnt = erp_date_counts.get(d, 0)
            if cnt < 5000:
                missing_or_incomplete_dates.append(d)

        if missing_or_incomplete_dates:
            print(f"[UNIFIED] Dates needing POS cash register data from POSFAPCENTER: {missing_or_incomplete_dates}")
            min_kassa_d = min(missing_or_incomplete_dates)
            # max date + 1 day for strict < comparison
            max_kassa_d = (pd.to_datetime(max(missing_or_incomplete_dates)) + pd.Timedelta(days=1)).strftime('%Y-%m-%d')

            t1 = time.time()
            q_kassa = f"""
            SELECT 
                CONVERT(VARCHAR(10), TARIX, 120) AS sale_date,
                LTRIM(RTRIM(MAGAZA_KODU)) AS store_code,
                LTRIM(RTRIM(MEHSUL_KODU)) AS item_code,
                SUM(ISNULL(MIQDAR, 0)) AS sales_qty,
                SUM(ISNULL([CEM MEBLEG], 0)) AS sales_amount
            FROM POSFAPCENTER.dbo.VW_KASSA_SATISLAR WITH (NOLOCK)
            WHERE TARIX >= '{min_kassa_d}' AND TARIX < '{max_kassa_d}'
            GROUP BY CONVERT(VARCHAR(10), TARIX, 120), LTRIM(RTRIM(MAGAZA_KODU)), LTRIM(RTRIM(MEHSUL_KODU))
            """
            df_kassa = pd.read_sql_query(q_kassa, conn)
            print(f"[UNIFIED] POSFAPCENTER returned {len(df_kassa):,} rows in {time.time()-t1:.2f}s")

            # Filter to only the needed dates
            df_kassa = df_kassa[df_kassa['sale_date'].isin(missing_or_incomplete_dates)]

            # For the incomplete dates, combine ERP wholesale + POS retail
            df_erp_clean = df_erp[~df_erp['sale_date'].isin(missing_or_incomplete_dates)]
            df_erp_incomplete = df_erp[df_erp['sale_date'].isin(missing_or_incomplete_dates)]

            combined_incomplete = pd.concat([df_erp_incomplete, df_kassa], ignore_index=True)
            combined_incomplete = combined_incomplete.groupby(['sale_date', 'store_code', 'item_code'], as_index=False).agg({
                'sales_qty': 'sum',
                'sales_amount': 'sum'
            })

            final_df = pd.concat([df_erp_clean, combined_incomplete], ignore_index=True)
        else:
            final_df = df_erp

        print(f"[UNIFIED] Final combined sales rows: {len(final_df):,}")
        return final_df
    finally:
        if close_conn and conn:
            conn.close()

if __name__ == "__main__":
    res = fetch_sales_unified("2026-11-03", "2026-11-05")
    print(res.groupby('sale_date').agg({'sales_qty': 'sum', 'sales_amount': 'sum', 'store_code': 'count'}))
