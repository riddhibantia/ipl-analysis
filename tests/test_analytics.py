"""Analytics endpoints: overview, team profiles, player leaderboards.

Skip when train artifacts are absent (e.g. no deliveries.csv).
Thresholds accept either the 2024-only or the full 2008–2026 dataset.
"""

from pathlib import Path

import pytest

from fastapi.testclient import TestClient

from api.main import app

ROOT = Path(__file__).resolve().parent.parent
NEED_ANALYTICS = pytest.mark.skipif(
    not (ROOT / "model" / "team_profiles.json").exists(),
    reason="analytics artifacts not trained")

client = TestClient(app)


@NEED_ANALYTICS
def test_overview():
    o = client.get("/api/overview").json()
    assert o["matches"] >= 1000
    assert o["balls"] > 200000
    assert o["seasons"][-1] >= 2024
    assert len(o["top_teams_recent"]) <= 5
    if o["orange_cap"]:
        assert o["orange_cap"]["runs"] > 500
    if o["purple_cap"]:
        assert o["purple_cap"]["wickets"] > 20


@NEED_ANALYTICS
def test_team_profile():
    p = client.get("/api/teams/profile", params={"name": "Chennai Super Kings"}).json()
    prof = p["profile"]
    assert prof["matches"] > 200
    assert "powerplay" in prof["bat"]["phases"]
    assert "death" in prof["bowl"]["phases"]
    assert isinstance(prof["strengths"], list)
    assert p["meta"]["short"] == "CSK"
    assert client.get("/api/teams/profile", params={"name": "Nope"}).status_code == 404


@NEED_ANALYTICS
def test_players_batting():
    r = client.get("/api/players",
                   params={"role": "batting", "era": "all", "limit": 5}).json()
    assert r["rows"][0]["runs"] >= r["rows"][-1]["runs"]
    assert r["rows"][0]["sr"] > 100


@NEED_ANALYTICS
def test_players_search_and_recent():
    q = client.get("/api/players",
                   params={"role": "batting", "q": "kohli"}).json()
    assert any("Kohli" in r["batter"] for r in q["rows"])
    rec = client.get("/api/players",
                     params={"role": "bowling", "era": "recent", "limit": 5}).json()
    if rec["rows"]:
        assert rec["rows"][0]["wickets"] >= 15
