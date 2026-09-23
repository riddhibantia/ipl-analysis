"""Live win-probability tests: sane extremes + API contract."""

import pytest
from fastapi.testclient import TestClient

from api.main import app
from src.predict import live_available, live_proba

client = TestClient(app)
NEED_LIVE = pytest.mark.skipif(not live_available(), reason="live model not trained")


@NEED_LIVE
def test_chase_almost_won():
    d = live_proba(2, "Chennai Super Kings", "Mumbai Indians",
                   "Wankhede Stadium, Mumbai", 18, 170, 1, 180)
    assert d["prob_batting"] > 0.9


@NEED_LIVE
def test_chase_almost_lost():
    d = live_proba(2, "Chennai Super Kings", "Mumbai Indians",
                   "Wankhede Stadium, Mumbai", 19, 120, 5, 180)
    assert d["prob_batting"] < 0.15


@NEED_LIVE
def test_first_innings_ordering():
    good = live_proba(1, "Mumbai Indians", "Chennai Super Kings",
                      "Wankhede Stadium, Mumbai", 10, 120, 1)
    bad = live_proba(1, "Mumbai Indians", "Chennai Super Kings",
                     "Wankhede Stadium, Mumbai", 10, 60, 5)
    assert good["prob_batting"] > bad["prob_batting"] + 0.3


@NEED_LIVE
def test_live_api_contract():
    r = client.post("/api/live", json={
        "innings": 2, "batting_team": "Chennai Super Kings",
        "bowling_team": "Mumbai Indians", "venue": "Wankhede Stadium, Mumbai",
        "over": 15, "runs": 140, "wkts": 3, "target": 180})
    assert r.status_code == 200
    d = r.json()
    assert 0.0 <= d["prob_batting"] <= 1.0
    assert d["batting"]["short"] == "CSK"
    assert d["factors"]


@NEED_LIVE
def test_live_api_rejects_bad_input():
    r = client.post("/api/live", json={
        "innings": 2, "batting_team": "Chennai Super Kings",
        "bowling_team": "Mumbai Indians", "venue": "Wankhede Stadium, Mumbai",
        "over": 15, "runs": 140, "wkts": 3})
    assert r.status_code == 400  # target required for chase


@NEED_LIVE
def test_live_curve_shape():
    c = client.get("/api/live-curve").json()
    assert len(c["curve"]) >= 15
    assert c["summary"]["innings_2"]["test_auc"] > 0.8


@NEED_LIVE
def test_squad_pools_present_and_sane():
    import json
    from pathlib import Path
    aux = json.loads((Path("model") / "live_aux.json").read_text())
    assert len(aux["team_pool"]) >= 10
    mi = aux["team_pool"]["Mumbai Indians"]
    assert 100 < mi["sr"] < 175          # career T20 strike rate range
    assert 6.0 < mi["econ"] < 11.0       # career economy range
    assert aux["global_pool"]["sr"] > 100


@NEED_LIVE
def test_inn1_beats_coin_flip_with_margin():
    import json
    from pathlib import Path
    met = json.loads((Path("model") / "live_metrics.json").read_text())
    assert met["innings_1"]["test_auc"] >= 0.60
    assert "pool_sr" in met["features_1"]  # squad features shipped
