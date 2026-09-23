"""IPL Pulse API: dashboard backend — match centre, live predictor, analytics, insights."""

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

app = FastAPI(title="IPL Pulse API", version="1.0.0")

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


_profiles = _players = None


def _load_analytics():
    global _profiles, _players
    if _profiles is None:
        _profiles = json.loads((ROOT / "model" / "team_profiles.json").read_text())
        _players = json.loads((ROOT / "model" / "player_stats.json").read_text())
    return _profiles, _players


@app.get("/api/overview")
def overview():
    df = matches()
    profiles, players = _load_analytics()
    info = json.loads((ROOT / "model" / "dataset_info.json").read_text())
    aux = json.loads((ROOT / "model" / "live_aux.json").read_text())
    recent = df[(df["season_year"] >= 2025) & df["decided"]]
    top_teams = recent["winner"].value_counts().head(5).reset_index()
    top_teams.columns = ["team", "wins"]
    top_rows = top_teams.to_dict(orient="records")
    recent_bat = players["recent_batting"]
    recent_bowl = players["recent_bowling"]
    return {
        "seasons": info["seasons"],
        "matches": info["matches"],
        "balls": aux.get("balls", 0),
        "teams": len(profiles),
        "top_teams_recent": [{**r, **{k: v for k, v in team_entry(r["team"]).items()
                                      if k != "name"}} for r in top_rows],
        "orange_cap": recent_bat[0] if recent_bat else None,
        "purple_cap": recent_bowl[0] if recent_bowl else None,
    }


@app.get("/api/teams/profile")
def team_profile(name: str = Query(...)):
    from src.clean import normalize_team
    profiles, _ = _load_analytics()
    key = normalize_team(name)
    if key not in profiles:
        raise HTTPException(404, f"unknown team: {name}")
    return {"profile": profiles[key],
            "meta": team_entry(key)}


@app.get("/api/players")
def players(role: str = Query("batting", pattern="^(batting|bowling)$"),
            era: str = Query("all", pattern="^(all|recent)$"),
            q: str = Query("", min_length=0),
            limit: int = Query(50, le=200)):
    _, pl = _load_analytics()
    key = f"{'recent_' if era == 'recent' else ''}{role}"
    rows = pl.get(key, [])
    if q:
        ql = q.lower()
        col = "batter" if role == "batting" else "bowler"
        rows = [r for r in rows if ql in str(r.get(col, "")).lower()]
    return {"role": role, "era": era, "count": len(rows), "rows": rows[:limit]}


@app.get("/api/matches")
def match_list(season: int | None = None, team: str = Query(""),
               q: str = Query(""), limit: int = Query(30, le=200),
               offset: int = Query(0, ge=0)):
    from src.clean import normalize_team
    df = matches()
    d = df.copy()
    if season:
        d = d[d["season_year"] == season]
    if team:
        t = normalize_team(team)
        d = d[(d["team1"] == t) | (d["team2"] == t)]
    if q:
        ql = q.lower()
        d = d[d.apply(lambda r: ql in str(r["team1"]).lower()
                      or ql in str(r["team2"]).lower()
                      or ql in str(r["venue"]).lower()
                      or ql in str(r["winner"]).lower(), axis=1)]
    d = d.sort_values("date", ascending=False)
    total = len(d)
    rows = []
    for _, r in d.iloc[offset:offset + limit].iterrows():
        rows.append({"id": int(r["id"]), "season": int(r["season_year"]),
                     "date": str(r["date"].date()), "venue": r["venue"],
                     "team1": {**{"name": r["team1"]},
                               **{k: v for k, v in team_entry(r["team1"]).items()
                                   if k != "name"}},
                     "team2": {**{"name": r["team2"]},
                               **{k: v for k, v in team_entry(r["team2"]).items()
                                   if k != "name"}},
                     "toss": f"{r['toss_winner']} · {r['toss_decision']}",
                     "winner": r["winner"] if pd.notna(r["winner"]) else None,
                     "result": (f"{r['winner']} won by {r['result_margin']} {r['result']}"
                                if pd.notna(r["winner"]) else r["result"]),
                     "player_of_match": r["player_of_match"]
                     if pd.notna(r["player_of_match"]) else None})
    return {"total": total, "limit": limit, "offset": offset, "rows": rows}


@app.get("/api/rankings")
def rankings(season: int | None = None):
    from src.clean import normalize_team
    df = matches()
    d = df[df["decided"]]
    if season:
        d = d[d["season_year"] == season]
    rows = []
    for t in sorted(set(d["team1"]) | set(d["team2"])):
        tm = d[(d["team1"] == t) | (d["team2"] == t)]
        w = int((tm["winner"] == t).sum())
        rows.append({"team": t, "played": len(tm), "wins": w,
                     "win_pct": round(w / len(tm), 3) if len(tm) else 0,
                     **{k: v for k, v in team_entry(t).items() if k != "name"}})
    rows.sort(key=lambda r: (-r["wins"], -r["win_pct"]))
    return {"season": season, "rows": rows}


@app.get("/api/analytics/pca")
def analytics_pca():
    try:
        return json.loads((ROOT / "model" / "pca.json").read_text())
    except FileNotFoundError:
        raise HTTPException(503, "PCA bundle not trained (run python -m src.train)")


@app.get("/api/analytics/toss-heatmap")
def toss_heatmap(top: int = Query(8, le=20)):
    df = matches()
    d = df[df["decided"]].copy()
    d["toss_win_match"] = (d["toss_winner"] == d["winner"]).astype(int)
    venues = d["venue"].value_counts().head(top).index.tolist()
    rows = []
    for v in venues:
        g = d[d["venue"] == v]
        cells = {}
        for dec in ("bat", "field"):
            s = g[g["toss_decision"].str.lower() == dec]
            cells[dec] = {"pct": round(float(s["toss_win_match"].mean()), 3)
                          if len(s) else None, "n": len(s)}
        rows.append({"venue": v, "matches": len(g), **cells})
    return {"venues": venues, "rows": rows}


# React build (web/dist) takes precedence; legacy vanilla UI is the fallback.
_STATIC = DIST if (DIST / "index.html").exists() else FRONTEND
if _STATIC.exists():
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="frontend")
