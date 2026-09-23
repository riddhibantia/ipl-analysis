"""Analytics endpoints: overview, team profiles, player leaderboards."""

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_overview():
    o = client.get("/api/overview").json()
    assert o["matches"] >= 1200
    assert o["balls"] > 290000
    assert o["seasons"][-1] >= 2025
    assert len(o["top_teams_recent"]) == 5
    assert o["orange_cap"]["runs"] > 500
    assert o["purple_cap"]["wickets"] > 20


def test_team_profile():
    p = client.get("/api/teams/profile", params={"name": "Chennai Super Kings"}).json()
    prof = p["profile"]
    assert prof["matches"] > 200
    assert "powerplay" in prof["bat"]["phases"]
    assert "death" in prof["bowl"]["phases"]
    assert isinstance(prof["strengths"], list)
    assert p["meta"]["short"] == "CSK"
    assert client.get("/api/teams/profile", params={"name": "Nope"}).status_code == 404


def test_players_batting():
    r = client.get("/api/players",
                   params={"role": "batting", "era": "all", "limit": 5}).json()
    assert r["rows"][0]["runs"] >= r["rows"][-1]["runs"]
    assert r["rows"][0]["sr"] > 100


def test_players_search_and_recent():
    q = client.get("/api/players",
                   params={"role": "batting", "q": "kohli"}).json()
    assert any("Kohli" in r["batter"] for r in q["rows"])
    rec = client.get("/api/players",
                     params={"role": "bowling", "era": "recent", "limit": 5}).json()
    assert rec["rows"][0]["wickets"] >= 20
