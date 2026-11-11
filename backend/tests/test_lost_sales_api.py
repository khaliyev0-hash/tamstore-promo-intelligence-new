import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_lost_sales_status():
    response = client.get("/api/lost-sales/status")
    assert response.status_code == 200
    data = response.json()
    assert "state" in data
    if data["state"] == "ready":
        assert "computed_at" in data
        assert "active_pairs" in data
        assert "not_ranged_pairs" in data
        assert "methodology" in data

def test_lost_sales_summary():
    response = client.get("/api/lost-sales/summary?campaign_id=Test1_2026-10-15_2026-10-28")
    assert response.status_code == 200
    data = response.json()
    assert "state" in data
    if data["state"] == "ready":
        assert "summary" in data
        assert "dates" in data
        assert "methodology" in data
        sm = data["summary"]
        assert "lost_units" in sm
        assert "lost_revenue" in sm
        assert "lost_pct" in sm
        assert "stockout_pairs" in sm

def test_lost_sales_groups_store():
    response = client.get("/api/lost-sales/groups?dimension=store&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "dimension" in data
    if data["state"] == "ready":
        assert data["dimension"] == "store"
        assert "items" in data
        assert "total" in data
        assert "methodology" in data
        assert len(data["items"]) <= 10
        if len(data["items"]) > 0:
            first = data["items"][0]
            assert "store" in first
            assert "lost_units" in first
            assert "lost_pct" in first

def test_lost_sales_groups_product():
    response = client.get("/api/lost-sales/groups?dimension=product&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "dimension" in data
    if data["state"] == "ready":
        assert data["dimension"] == "product"
        assert "items" in data
        assert "total" in data
        assert "methodology" in data
        if len(data["items"]) > 0:
            first = data["items"][0]
            assert "code" in first
            assert "lost_units" in first

def test_lost_sales_groups_category():
    response = client.get("/api/lost-sales/groups?dimension=category")
    assert response.status_code == 200
    data = response.json()
    if data["state"] == "ready":
        assert data["dimension"] == "category"
        assert "tree" in data
        assert "methodology" in data
        if len(data["tree"]) > 0:
            cat = data["tree"][0]
            assert "level" in cat
            assert cat["level"] == "category"
            assert "lost_units" in cat
            assert "children" in cat

def test_lost_sales_groups_area():
    response = client.get("/api/lost-sales/groups?dimension=area")
    assert response.status_code == 200
    data = response.json()
    if data["state"] == "ready":
        assert data["dimension"] == "area"
        assert "tree" in data
        assert "methodology" in data

def test_lost_sales_pair():
    # Pick a sample store and item from active campaign
    response = client.get("/api/lost-sales/summary")
    data = response.json()
    if data.get("state") == "ready" and data.get("top_worst_pairs"):
        sample = data["top_worst_pairs"][0]
        st = sample["store"]
        cd = sample["code"]
        pair_res = client.get(f"/api/lost-sales/pair?store={st}&code={cd}")
        assert pair_res.status_code == 200
        pdata = pair_res.json()
        assert pdata["state"] == "ready"
        assert "pair" in pdata
        p = pdata["pair"]
        assert p["store"] == st
        assert p["code"] == cd
        assert "rate" in p
        assert "stocks" in p
        assert "sales" in p
        assert "daily_lost" in p
        assert "methodology" in pdata

def test_lost_sales_pairs_by_store_and_code():
    cid = "Test1_2026-10-15_2026-10-28"
    # Test filtering pairs by store
    response = client.get(f"/api/lost-sales/pairs?store=101&limit=5&campaign_id={cid}")
    assert response.status_code == 200
    data = response.json()
    assert "state" in data
    if data["state"] == "ready":
        assert "pairs" in data
        assert "total" in data
        for p in data["pairs"]:
            assert p["store"] == "101"

    # Test filtering pairs by code
    response_prod = client.get(f"/api/lost-sales/pairs?code=102521&limit=5&campaign_id={cid}")
    assert response_prod.status_code == 200
    data_prod = response_prod.json()
    assert "state" in data_prod
    if data_prod["state"] == "ready":
        assert "pairs" in data_prod
        assert "total" in data_prod
        for p in data_prod["pairs"]:
            assert p["code"] == "102521"
