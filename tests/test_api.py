"""API contract tests (no server needed)."""

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_meta_teams_have_logos():
    teams = client.get("/api/meta").json()["teams"]
    assert len(teams) >= 10
    mi = next(t for t in teams if t["short"] == "MI")
    assert mi["logo"].startswith("https://www.iplt20.com/")
    assert mi["color"] == "#004BA0"


def test_match_centre():
    r = client.get("/api/match-centre", params={
        "team1": "Mumbai Indians", "team2": "Chennai Super Kings",
        "venue": "Wankhede Stadium, Mumbai"})
    assert r.status_code == 200
    d = r.json()
    assert d["team1"]["short"] == "MI"
    assert d["team2"]["short"] == "CSK"
    assert d["toss"]["recommendation"].startswith("bowl")


def test_toss_endpoint():
    r = client.post("/api/toss", json={"venue": "Eden Gardens", "month": 4})
    assert r.status_code == 200
    assert 0.0 <= r.json()["p_bat_first"] <= 1.0


def test_insights():
    assert len(client.get("/api/insights/teams").json()) >= 10
    assert len(client.get("/api/insights/toss").json()) == 2
    h2h = client.get("/api/insights/h2h",
                     params={"team1": "Mumbai Indians",
                             "team2": "Chennai Super Kings"}).json()
    assert h2h["results"]
    form = client.get("/api/insights/form",
                      params={"team": "Mumbai Indians"}).json()
    assert len(form["recent"]) == 5


def test_frontend_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "IPL Pulse" in r.text
