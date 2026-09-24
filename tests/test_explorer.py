"""Explorer + analytics endpoints: matches, rankings, PCA, toss heatmap."""

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_matches_explorer():
    r = client.get("/api/matches", params={"season": 2026, "limit": 5}).json()
    assert r["total"] >= 70
    row = r["rows"][0]
    assert row["team1"]["short"] and row["team2"]["short"]
    assert "won by" in row["result"] or row["winner"] is None
    # search narrows
    q = client.get("/api/matches", params={"q": "Wankhede", "limit": 50}).json()
    assert q["total"] > 0 and q["total"] < r["total"] + 1200
    # team filter
    t = client.get("/api/matches", params={"team": "Mumbai Indians", "limit": 3}).json()
    assert all("Mumbai Indians" in (x["team1"]["name"], x["team2"]["name"])
               for x in t["rows"])


def test_rankings():
    r = client.get("/api/rankings").json()
    assert len(r["rows"]) >= 10
    assert r["rows"][0]["wins"] >= r["rows"][-1]["wins"]
    s = client.get("/api/rankings", params={"season": 2025}).json()
    assert s["season"] == 2025
    assert sum(x["wins"] for x in s["rows"]) > 60


def test_pca_bundle():
    p = client.get("/api/analytics/pca").json()
    assert p["n"] > 1000
    assert len(p["explained_variance"]) == 2
    assert len(p["points"]) > 500
    pt = p["points"][0]
    assert {"x", "y", "team1_win", "season"} <= set(pt)
    assert len(p["corr_before"]) == len(p["features"])


def test_toss_heatmap():
    h = client.get("/api/analytics/toss-heatmap").json()
    assert len(h["rows"]) == 8
    row = h["rows"][0]
    assert row["bat"]["n"] + row["field"]["n"] == row["matches"]
    assert 0 <= (row["bat"]["pct"] or 0.5) <= 1


def test_season_counts():
    rows = client.get("/api/seasons/counts").json()
    assert rows[0]["season"] == 2007
    assert rows[-1]["season"] >= 2025
    assert sum(r["matches"] for r in rows) >= 1200


def test_history_this_week():
    h = client.get("/api/history/this-week").json()
    assert 1 <= h["week"] <= 53
    assert "won by" in h["featured"]["result"]
    assert len(h["rows"]) >= 1
