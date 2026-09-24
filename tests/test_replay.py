"""Timeline replay, matchup lab, AI preview endpoints."""

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_timeline_shape():
    t = client.get("/api/matches/1426312/timeline").json()
    assert t["team1"] and t["team2"]
    assert "1" in t["innings"] and "2" in t["innings"]
    inn1 = t["innings"]["1"]
    assert inn1["total"] > 50
    o10 = inn1["overs"][9]
    assert o10["over"] == 10 and o10["runs"] > 0
    assert 0 <= (o10["prob_bat"] or 0.5) <= 1
    assert client.get("/api/matches/1/timeline").status_code == 404


def test_matchups_top_and_duel():
    top = client.get("/api/matchups/top", params={"limit": 5}).json()
    assert len(top["rows"]) == 5
    assert top["rows"][0]["balls"] >= 60
    assert top["rows"][0]["sr"] > 50
    d = client.get("/api/matchups/duel",
                   params={"batter": "V Kohli", "bowler": "JJ Bumrah"}).json()
    assert d["balls"] > 50 and d["runs"] > 50
    assert len(d["by_season"]) >= 3
    assert client.get("/api/matchups/duel",
                      params={"batter": "Nobody", "bowler": "JJ Bumrah"}).status_code == 404


def test_preview_template_path():
    p = client.get("/api/preview", params={
        "team1": "Mumbai Indians", "team2": "Chennai Super Kings",
        "venue": "Wankhede Stadium, Mumbai"}).json()
    assert p["team1"] == "Mumbai Indians"
    assert p["source"] in ("ai", "template")
    assert "Wankhede" in p["text"] and len(p["text"]) > 60
    bad = client.get("/api/preview", params={
        "team1": "Nope", "team2": "Chennai Super Kings",
        "venue": "Wankhede Stadium, Mumbai"})
    assert bad.status_code == 400
