"""Load trained artifacts + pre-match intelligence for a hypothetical matchup."""

import json
from pathlib import Path

import joblib
import pandas as pd

from .clean import normalize_team, normalize_venue
from .features import feature_row_for_matchup

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "model"

_toss = None
_toss_cols = None
_current = None
_ratings = None
_venues = None


def _load():
    global _toss, _toss_cols, _current, _ratings, _venues
    if _toss is None:
        _toss = joblib.load(MODEL_DIR / "toss_model.pkl")
        meta = json.loads((MODEL_DIR / "toss_metrics.json").read_text())
        _toss_cols = meta["columns"]
        _current = json.loads((MODEL_DIR / "current_stats.json").read_text())
        _ratings = json.loads((MODEL_DIR / "ratings.json").read_text())
        _venues = json.loads((MODEL_DIR / "venues.json").read_text())
    return _toss, _toss_cols, _current, _ratings, _venues


def toss_advice(venue, month=4, season_year=2024):
    """P(captain chooses bat first) + venue history."""
    model, cols, _, _, venues = _load()
    ven = normalize_venue(venue)
    row = {c: 0.0 for c in cols}
    key = f"venue_group_{ven}"
    row[key if key in row else "venue_group_Other venues"] = 1.0
    mkey = f"month_{month}"
    if mkey in row:
        row[mkey] = 1.0
    row["season_year"] = season_year
    p_bat = float(model.predict_proba(pd.DataFrame([row], columns=cols))[0][1])
    hist = next((v for v in venues if v["venue"] == ven), None)
    call = ("bat first" if p_bat >= 0.5 else "bowl first (chase)")
    return {"venue": ven, "p_bat_first": round(p_bat, 3),
            "p_bowl_first": round(1 - p_bat, 3), "recommendation": call,
            "venue_history": hist}


def _h2h(t1, t2, current):
    a, b = f"{t1}||{t2}", f"{t2}||{t1}"
    if a in current["h2h"]:
        p = current["h2h"][a]
    elif b in current["h2h"]:
        p = 1.0 - current["h2h"][b]
    else:
        return {"team1_wins": 0, "team2_wins": 0, "team1_pct": 0.5}
    # recover counts from pct is impossible; pct is what UI needs
    return {"team1_pct": round(p, 3)}


def match_centre(team1, team2, venue, month=4, season_year=2024):
    """FotMob-style bundle: ratings, h2h, form, venue, toss advice."""
    _, _, current, ratings, _ = _load()
    t1, t2 = normalize_team(team1), normalize_team(team2)
    ven = normalize_venue(venue)
    r = {x["team"]: x for x in ratings}
    edge, _ = feature_row_for_matchup(t1, t2, ven, t1, "field", season_year, current)
    return {
        "team1": {"name": t1, **r.get(t1, {"elo": 1500, "win_pct": 0.5,
                                           "played": 0, "last5": 0.5})},
        "team2": {"name": t2, **r.get(t2, {"elo": 1500, "win_pct": 0.5,
                                           "played": 0, "last5": 0.5})},
        "head_to_head": {"team1_pct": _h2h(t1, t2, current)["team1_pct"]},
        "venue_edge": round(edge["venue_edge"], 3),
        "toss": toss_advice(ven, month=month, season_year=season_year),
    }


def get_ratings():
    _, _, _, ratings, _ = _load()
    return ratings


def get_venues():
    _, _, _, _, venues = _load()
    return venues


def get_current():
    _, _, current, _, _ = _load()
    return current


_live1 = _live2 = _live_aux = _live_met = None


def _load_live():
    global _live1, _live2, _live_aux, _live_met
    if _live1 is None:
        _live1 = joblib.load(MODEL_DIR / "live_inn1.pkl")
        _live2 = joblib.load(MODEL_DIR / "live_inn2.pkl")
        _live_aux = json.loads((MODEL_DIR / "live_aux.json").read_text())
        _live_met = json.loads((MODEL_DIR / "live_metrics.json").read_text())
    return _live1, _live2, _live_aux, _live_met


def live_available():
    return (MODEL_DIR / "live_inn1.pkl").exists()


def live_proba(innings, batting_team, bowling_team, venue, over, runs, wkts,
               target=None):
    """Win probability for the CURRENT batting team from live state."""
    from .live import INN1, INN2, featurize
    m1, m2, aux, _ = _load_live()
    _, _, current, _, _ = _load()
    bat, bowl = normalize_team(batting_team), normalize_team(bowling_team)
    ven = normalize_venue(venue)
    over, runs, wkts = int(over), int(runs), int(wkts)
    if innings not in (1, 2):
        raise ValueError("innings must be 1 or 2")
    if not 1 <= over <= (20 if innings == 1 else 19):
        raise ValueError("over out of range for this innings")
    if not 0 <= wkts <= 10 or runs < 0:
        raise ValueError("invalid runs/wickets")
    if innings == 2:
        if target is None:
            raise ValueError("target required for 2nd innings")
        target = int(target)
        if runs >= target:
            return _live_result(bat, bowl, ven, 1.0, "target already reached", {})
    if wkts >= 10:
        raise ValueError("innings over: 10 wickets lost")
    par = aux["venue_avg"].get(ven, aux["global_par"])
    pool_b = aux.get("team_pool", {}).get(bat, aux.get("global_pool", {}))
    pool_w = aux.get("team_pool", {}).get(bowl, aux.get("global_pool", {}))
    state = {"inning": innings, "over": over, "runs": runs, "wkts": wkts,
             "elo_bat": current["elo"].get(bat, 1500.0),
             "elo_bowl": current["elo"].get(bowl, 1500.0),
             "last5_runs": runs / over * min(over, 5),  # even-pacing approx
             "target": target, "venue_par": par,
             "pool_sr": pool_b.get("sr", 130.0),
             "pool_avg": pool_b.get("avg", 25.0),
             "pool_econ": pool_w.get("econ", 8.5),
             "pool_srate": pool_w.get("srate", 20.0)}
    cols, model = (INN1, m1) if innings == 1 else (INN2, m2)
    X = pd.DataFrame([featurize(state, par)], columns=cols)
    p = float(model.predict_proba(X)[0][1])
    factors, extra = _live_factors(innings, state, par)
    note = ("recent form assumed even-paced" if innings == 1 else
            f"need {target - runs} off {(20 - over) * 6} balls")
    return _live_result(bat, bowl, ven, p, note,
                        {"over": over, "runs": runs, "wkts": wkts,
                         "target": target, "venue_par": par,
                         "projected": extra["projected"],
                         "req_rr": extra["req_rr"]},
                        factors)


def _live_result(bat, bowl, ven, p, note, state, factors=None):
    return {"batting_team": bat, "bowling_team": bowl, "venue": ven,
            "prob_batting": round(p, 3), "prob_bowling": round(1 - p, 3),
            "favorite": bat if p >= 0.5 else bowl,
            "note": note, "state": state, "factors": factors or []}


def _live_factors(innings, s, par):
    o = s["over"]
    squad = (f"squad: bat SR {s.get('pool_sr', 0):.0f}, "
             f"bowl econ {s.get('pool_econ', 0):.1f}")
    squad_edge = (s.get("pool_sr", 130) - 130) / 40.0 - (s.get("pool_econ", 8.5) - 8.5) / 4.0
    f = [{"label": squad, "edge": round(squad_edge, 2),
          "favours": "batting" if squad_edge >= 0 else "bowling"}]
    if innings == 1:
        proj = s["runs"] + (20 - o) * (s["runs"] / o)
        f.append({"label": f"projected {int(round(proj))} vs venue par {par:.0f}",
                  "edge": round((proj - par) / 40.0, 2),
                  "favours": "batting" if proj >= par else "bowling",
                  "_projected": int(round(proj))})
        f.append({"label": f"run rate {s['runs'] / o:.1f}, {s['wkts']} wkts lost",
                  "edge": round((s["runs"] / o - par / 20) / 2.0, 2),
                  "favours": "batting" if s["runs"] / o >= par / 20 else "bowling"})
        out = [{"label": x["label"], "edge": x["edge"], "favours": x["favours"]}
               for x in f]
        return out, {"projected": f[1]["_projected"], "req_rr": None}
    need, balls = s["target"] - s["runs"], (20 - o) * 6
    req = need / (20 - o)
    out = [
        {"label": f"need {need} off {balls} (req {req:.1f}/over)",
         "edge": round((s["runs"] / o - req) / 3.0, 2),
         "favours": "batting" if s["runs"] / o >= req else "bowling"},
        {"label": f"{10 - s['wkts']} wickets in hand",
         "edge": round((10 - s["wkts"] - 5) / 5.0, 2),
         "favours": "batting" if s["wkts"] <= 5 else "bowling"},
    ]
    return out, {"projected": None, "req_rr": round(req, 2)}


def get_live_metrics():
    _, _, _, met = _load_live()
    return met
