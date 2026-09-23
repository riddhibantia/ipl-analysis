"""IPL Intelligence API: match centre, toss lab, ratings, SQL-backed insights."""

import json
import sqlite3
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.clean import TEAM_COLORS, TEAM_SHORT, load_matches, logo_url, short_code
from src.predict import (get_current, get_live_metrics, get_ratings, get_venues,
                         live_available, live_proba, match_centre, toss_advice)

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
DIST = ROOT / "web" / "dist"

app = FastAPI(title="IPL Intelligence API", version="1.0.0")

_matches = None


def matches():
    global _matches
    if _matches is None:
        _matches = load_matches()
    return _matches


class TossRequest(BaseModel):
    venue: str
    month: int = 4
    season_year: int = 2024


class LiveRequest(BaseModel):
    innings: int = 2
    batting_team: str
    bowling_team: str
    venue: str
    over: int
    runs: int
    wkts: int = 0
    target: int | None = None


def team_entry(name):
    sc = short_code(name)
    return {"name": name, "short": sc,
            "color": TEAM_COLORS.get(sc, "#666666"), "logo": logo_url(sc)}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def meta():
    df = matches()
    teams = sorted(pd.concat([df["team1"], df["team2"]]).unique().tolist())
    return {"teams": [team_entry(t) for t in teams],
            "venues": sorted(df["venue"].unique().tolist()),
            "seasons": sorted(df["season_year"].dropna().unique().astype(int).tolist()),
            "short_codes": TEAM_SHORT}


@app.get("/api/ratings")
def ratings():
    out = []
    for r in get_ratings():
        out.append({**r, **{k: v for k, v in team_entry(r["team"]).items()
                            if k != "name"}})
    return out


@app.get("/api/venues")
def venues():
    return get_venues()


@app.get("/api/match-centre")
def match_centre_api(team1: str, team2: str, venue: str,
                     month: int = 4, season_year: int = 2024):
    try:
        mc = match_centre(team1, team2, venue, month=month, season_year=season_year)
    except Exception as e:
        raise HTTPException(400, str(e))
    for side in ("team1", "team2"):
        mc[side].update({k: v for k, v in team_entry(mc[side]["name"]).items()
                         if k != "name"})
    return mc


@app.post("/api/toss")
def toss_api(req: TossRequest):
    try:
        return toss_advice(req.venue, month=req.month, season_year=req.season_year)
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/api/live")
def live_api(req: LiveRequest):
    if not live_available():
        raise HTTPException(503, "live model not trained (missing data/deliveries.csv)")
    try:
        d = live_proba(req.innings, req.batting_team, req.bowling_team,
                       req.venue, req.over, req.runs, req.wkts, req.target)
    except ValueError as e:
        raise HTTPException(400, str(e))
    d["batting"] = {k: v for k, v in team_entry(d["batting_team"]).items() if k != "name"}
    d["bowling"] = {k: v for k, v in team_entry(d["bowling_team"]).items() if k != "name"}
    return d


@app.get("/api/live-curve")
def live_curve():
    if not live_available():
        raise HTTPException(503, "live model not trained (missing data/deliveries.csv)")
    m = get_live_metrics()
    overs = sorted(set(m["innings_1"]["by_over"]) | set(m["innings_2"]["by_over"]),
                   key=int)
    return {"curve": [{"over": int(o),
                        "inn1": m["innings_1"]["by_over"].get(str(o), {}).get("accuracy"),
                        "inn2": m["innings_2"]["by_over"].get(str(o), {}).get("accuracy")}
                       for o in overs],
            "summary": {"innings_1": {k: m["innings_1"][k] for k in
                                      ("best_model", "test_accuracy", "test_auc")},
                        "innings_2": {k: m["innings_2"][k] for k in
                                      ("best_model", "test_accuracy", "test_auc")}}}


def _query(sql, params=()):
    con = sqlite3.connect(ROOT / "ipl.db")
    try:
        return pd.read_sql_query(sql, con, params=params).to_dict(orient="records")
    finally:
        con.close()


@app.get("/api/insights/teams")
def insights_teams():
    return _query("""SELECT winner AS team, COUNT(*) AS wins FROM matches
                     WHERE winner IS NOT NULL GROUP BY winner ORDER BY wins DESC""")


@app.get("/api/insights/toss")
def insights_toss():
    return _query("""SELECT toss_decision, COUNT(*) AS n,
                     ROUND(AVG(CASE WHEN toss_winner = winner THEN 1.0 ELSE 0.0 END), 3)
                     AS toss_winner_won_match FROM matches
                     WHERE winner IS NOT NULL GROUP BY toss_decision""")


@app.get("/api/insights/h2h")
def insights_h2h(team1: str = Query(...), team2: str = Query(...)):
    rows = _query("""SELECT winner, COUNT(*) AS n FROM matches WHERE winner IS NOT NULL
                     AND ((team1 = ? AND team2 = ?) OR (team1 = ? AND team2 = ?))
                     GROUP BY winner""", (team1, team2, team2, team1))
    return {"team1": team1, "team2": team2, "results": rows}


@app.get("/api/insights/form")
def insights_form(team: str = Query(...), n: int = 5):
    rows = _query("""SELECT date, team1, team2, winner, venue FROM matches
                     WHERE winner IS NOT NULL AND (team1 = ? OR team2 = ?)
                     ORDER BY date DESC LIMIT ?""", (team, team, n))
    return {"team": team, "recent": rows}


@app.get("/api/metrics")
def metrics():
    return json.loads((ROOT / "model" / "toss_metrics.json").read_text())


# React build (web/dist) takes precedence; legacy vanilla UI is the fallback.
_STATIC = DIST if (DIST / "index.html").exists() else FRONTEND
if _STATIC.exists():
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="frontend")
