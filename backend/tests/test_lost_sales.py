import pytest
from app.analytics.lost_sales import (
    compute_lost_sales_pair,
    build_category_tree,
    build_area_tree,
    compute_campaign_lost_sales_payload,
    MIN_INSTOCK_DAYS_FOR_HIGH_CONFIDENCE
)

def test_worked_example():
    """
    Worked example from user specification:
    closing stock [8,5,0,0,6,0], sales [2,3,1,0,2,0]
    -> in-stock days D1,D2,D5
    -> rate = (2+3+2)/3 = 2.3333...
    -> lost = max(0, 2.333 - 1) + max(0, 2.333 - 0) + max(0, 2.333 - 0) = 1.333 + 2.333 + 2.333 = 6.0 units.
    """
    stocks = [8, 5, 0, 0, 6, 0]
    sales = [2, 3, 1, 0, 2, 0]
    res = compute_lost_sales_pair(
        stocks=stocks,
        sales=sales,
        fc=10.0,
        distribution_qty=20.0,
        n_days=6
    )

    assert res["active"] is True
    assert res["method"] == "instock"
    assert res["confidence"] == "high"
    assert res["stockout_days"] == 3
    assert res["lost_units"] == 6.0
    assert abs(res["rate"] - 2.3333) < 0.001


def test_all_null_stock_excluded_as_unknown():
    """
    Null stock = unknown (never counted as stockout or in-stock).
    All-null stock -> 0 in-stock days, 0 stockout days, lost_units = 0.
    """
    stocks = [None, None, None, None]
    sales = [1, 2, 0, 3]
    res = compute_lost_sales_pair(
        stocks=stocks,
        sales=sales,
        fc=10.0,
        distribution_qty=20.0,
        n_days=4
    )
    assert res["active"] is True
    assert res["stockout_days"] == 0
    assert res["lost_units"] == 0.0


def test_never_in_stock_and_no_distribution_not_ranged():
    """
    Never in stock (all 0 or None), sales = 0, dist = 0 -> not ranged (active = False).
    """
    stocks = [0, 0, 0, 0]
    sales = [0, 0, 0, 0]
    res = compute_lost_sales_pair(
        stocks=stocks,
        sales=sales,
        fc=10.0,
        distribution_qty=0.0,
        n_days=4
    )
    assert res["active"] is False
    assert res["method"] == "none"
    assert res["lost_units"] == 0.0


def test_never_in_stock_with_distribution_fc_fallback_and_low_confidence():
    """
    Never in stock (all 0), but distribution_qty > 0 -> active pair with FC fallback and low confidence.
    rate = FC / N days = 28 / 7 = 4.0.
    stockout days = 7. lost = 7 * 4.0 = 28.0 units.
    """
    stocks = [0, 0, 0, 0, 0, 0, 0]
    sales = [0, 0, 0, 0, 0, 0, 0]
    res = compute_lost_sales_pair(
        stocks=stocks,
        sales=sales,
        fc=28.0,
        distribution_qty=30.0,
        n_days=7
    )
    assert res["active"] is True
    assert res["method"] == "fc"
    assert res["confidence"] == "low"
    assert res["rate"] == 4.0
    assert res["stockout_days"] == 7
    assert res["lost_units"] == 28.0


def test_partial_last_day_ignored():
    """
    If is_partial_latest is True, the latest day must be completely ignored from calculation.
    """
    # 5 full days + 1 partial day
    stocks = [8, 5, 0, 0, 6, 0] # last day is stockout 0
    sales = [2, 3, 1, 0, 2, 0]
    
    # Without partial flag: 6 days, stockout days = 3, lost = 6.0
    res_full = compute_lost_sales_pair(stocks, sales, fc=10, distribution_qty=20, n_days=6, is_partial_latest=False)
    assert res_full["stockout_days"] == 3
    assert res_full["lost_units"] == 6.0

    # With partial flag: only first 5 days evaluated, stockout days = 2 (D3, D4), D6 ignored!
    res_partial = compute_lost_sales_pair(stocks, sales, fc=10, distribution_qty=20, n_days=6, is_partial_latest=True)
    assert res_partial["stockout_days"] == 2
    assert len(res_partial["daily_lost"]) == 5
    # rate = (2+3+2)/3 = 2.333; lost D3 = 1.333, D4 = 2.333 -> sum = 3.67
    assert abs(res_partial["lost_units"] - 3.67) < 0.05


def test_partial_day_sales_subtracted_on_stockout_day():
    """
    On a stockout day (stock == 0), if sales_d > 0, lost_units(d) = max(0, rate - sales_d).
    """
    stocks = [10, 10, 10, 0]
    sales = [5, 5, 5, 2] # in-stock rate = 5.0, on stockout day sales = 2
    res = compute_lost_sales_pair(stocks, sales, fc=20, distribution_qty=50, n_days=4)
    assert res["rate"] == 5.0
    # Day 4 lost = 5.0 - 2.0 = 3.0
    assert res["lost_units"] == 3.0
    assert res["daily_lost"][3] == 3.0


def test_price_fallbacks():
    """
    Test price fallback order:
    1. Own sales price (sales_amount / sales_qty)
    2. Network average price
    3. None (lost_revenue is None)
    """
    stocks = [5, 5, 0]
    sales = [2, 2, 0] # in-stock rate = 2.0, day 3 lost = 2.0
    
    # 1. Own price
    res1 = compute_lost_sales_pair(stocks, sales, fc=10, distribution_qty=20, n_days=3, sales_amount=16.0, network_avg_price=5.0)
    assert res1["price"] == 4.0 # 16 / 4 = 4.0
    assert res1["lost_revenue"] == 8.0 # 2.0 * 4.0 = 8.0

    # 2. Fallback to network average price when sales_amount is None
    res2 = compute_lost_sales_pair(stocks, sales, fc=10, distribution_qty=20, n_days=3, sales_amount=None, network_avg_price=5.5)
    assert res2["price"] == 5.5
    assert res2["lost_revenue"] == 11.0 # 2.0 * 5.5 = 11.0

    # 3. None when both are missing
    res3 = compute_lost_sales_pair(stocks, sales, fc=10, distribution_qty=20, n_days=3, sales_amount=None, network_avg_price=None)
    assert res3["price"] is None
    assert res3["lost_revenue"] is None


def test_aggregation_hierarchy_and_totals_integrity():
    """
    Verify:
    1. Parent == sum of children for additive metrics in category & area trees.
    2. Parent percentage = parent.lost / (parent.sale + parent.lost), NOT average of child percentages!
    3. Sum of stores == sum of products == summary totals.
    """
    sample_records = [
        {
            "store": "MAG_01",
            "code": "ITEM_A",
            "name": "Item A",
            "category": "Cat 1",
            "sub_category": "Sub 1",
            "family": "Fam 1",
            "area": "Area 1",
            "sub_area": "SubArea 1",
            "active": True,
            "confidence": "high",
            "stockout_days": 2,
            "sale": 100.0,
            "lost_units": 20.0,
            "lost_revenue": 60.0
        },
        {
            "store": "MAG_01",
            "code": "ITEM_B",
            "name": "Item B",
            "category": "Cat 1",
            "sub_category": "Sub 1",
            "family": "Fam 1",
            "area": "Area 1",
            "sub_area": "SubArea 1",
            "active": True,
            "confidence": "low",
            "stockout_days": 1,
            "sale": 50.0,
            "lost_units": 10.0,
            "lost_revenue": 20.0
        },
        {
            "store": "MAG_02",
            "code": "ITEM_A",
            "name": "Item A",
            "category": "Cat 2",
            "sub_category": "Sub 2",
            "family": "Fam 2",
            "area": "Area 2",
            "sub_area": "SubArea 2",
            "active": True,
            "confidence": "high",
            "stockout_days": 3,
            "sale": 200.0,
            "lost_units": 30.0,
            "lost_revenue": 90.0
        }
    ]

    cat_tree = build_category_tree(sample_records)
    area_tree = build_area_tree(sample_records)

    # Total expected additive values:
    exp_sale = 350.0
    exp_lost_units = 60.0
    exp_lost_revenue = 170.0
    exp_stockout_days = 6

    # Verify category tree sum
    cat_tree_lost = sum(c["lost_units"] for c in cat_tree)
    cat_tree_sale = sum(c["sale"] for c in cat_tree)
    cat_tree_rev = sum(c["lost_revenue"] for c in cat_tree)
    assert cat_tree_lost == exp_lost_units
    assert cat_tree_sale == exp_sale
    assert cat_tree_rev == exp_lost_revenue

    # Check child sum equals parent in Cat 1:
    cat1 = next(c for c in cat_tree if c["name"] == "Cat 1")
    assert cat1["lost_units"] == 30.0 # 20 + 10
    assert cat1["sale"] == 150.0 # 100 + 50
    assert cat1["lost_revenue"] == 80.0 # 60 + 20
    # Parent percentage derived from row totals: 30 / (150 + 30) = 30 / 180 = 16.67%
    assert cat1["lost_pct"] == round(30.0 / 180.0 * 100, 2)

    # Sub-category sum:
    sub1 = cat1["children"][0]
    assert sub1["lost_units"] == 30.0
    fam1 = sub1["children"][0]
    assert fam1["lost_units"] == 30.0

    # Area tree sum
    area_tree_lost = sum(a["lost_units"] for a in area_tree)
    assert area_tree_lost == exp_lost_units


def test_old_archive_without_computation_state():
    """
    Campaign payload without data returns 'unavailable'.
    """
    res = compute_campaign_lost_sales_payload({}, sales_parquet_path="non_existent.parquet")
    assert res["state"] == "unavailable"
    assert "methodology" in res
