"""Team strength/weakness profiles + player leaderboards from ball-by-ball data.

Built once at train time (src.analytics.build_all) into
model/team_profiles.json + model/player_stats.json; served by the API.
"""

import pandas as pd

from .clean import is_home
from .live import BOWL_KINDS

PHASES = {"powerplay": (0, 5), "middle": (6, 15), "death": (16, 19)}
RECENT_FROM = 2025


def _phase(over):
    for name, (a, b) in PHASES.items():
        if a <= over <= b:
            return name
    return "other"


def _legal(df):
    return ~df["extras_type"].isin(["wides", "noballs"])


def _conceded(df):
    ex = df["extra_runs"].where(df["extras_type"].isin(["byes", "legbyes"]), 0)
    return df["total_runs"] - ex


def build_team_profiles(deliveries, matches):
    d = deliveries.copy()
    d["phase"] = d["over"].apply(_phase)
    d["legal"] = _legal(d)
    d["faced"] = d["extras_type"] != "wides"
    d["conceded"] = _conceded(d)
    season = matches.set_index("id")["season_year"].to_dict()
    d["season_year"] = d["match_id"].map(season)
    first = d[d["inning"] == 1].groupby("match_id")["batting_team"].first().to_dict()
    second = d[d["inning"] == 2].groupby("match_id")["batting_team"].first().to_dict()

    profiles = {}
    teams = sorted(set(matches["team1"]) | set(matches["team2"]))
    for t in teams:
        bat = d[d["batting_team"] == t]
        bowl = d[d["bowling_team"] == t]
        p = {"team": t}
        p["bat"] = _bat_block(bat)
        p["bowl"] = _bowl_block(bowl)
        p["recent"] = {"bat": _bat_block(bat[bat["season_year"] >= RECENT_FROM]),
                       "bowl": _bowl_block(bowl[bowl["season_year"] >= RECENT_FROM])}
        m = matches[(matches["team1"] == t) | (matches["team2"] == t)]
        m = m[m["decided"]]
        p["matches"] = len(m)
        chases = m[m["id"].map(second) == t]
        defends = m[m["id"].map(first) == t]
        p["chase_win_pct"] = _ratio(chases, t)
        p["defend_win_pct"] = _ratio(defends, t)
        p["home_win_pct"] = _ratio(m[m["venue"].apply(lambda v: is_home(t, v))], t)
        p["away_win_pct"] = _ratio(m[~m["venue"].apply(lambda v: is_home(t, v))], t)
        profiles[t] = p

    # league averages for tags
    lg_bat = _bat_block(d)
    lg_bowl = _bowl_block(d)
    for t, p in profiles.items():
        p["strengths"], p["weaknesses"] = _tags(p, lg_bat, lg_bowl)
    return profiles


def _bat_block(bat):
    out = {"balls": int(bat["faced"].sum()), "runs": int(bat["batsman_runs"].sum()),
           "outs": int(((bat["player_dismissed"] == bat["batter"]) & bat["player_dismissed"].notna()).sum())}
    out["sr"] = round(100 * out["runs"] / out["balls"], 1) if out["balls"] else 0.0
    out["avg"] = round(out["runs"] / max(out["outs"], 1), 1)
    out["phases"] = {}
    for ph in PHASES:
        g = bat[bat["phase"] == ph]
        balls, runs = int(g["faced"].sum()), int(g["batsman_runs"].sum())
        out["phases"][ph] = {"rr": round(runs / (balls / 6) if balls else 0, 2),
                             "sr": round(100 * runs / balls, 1) if balls else 0.0}
    return out


def _bowl_block(bowl):
    legal = bowl[bowl["legal"]]
    balls, runs = len(legal), float(bowl["conceded"].sum())
    wkts = int(bowl[bowl["dismissal_kind"].isin(BOWL_KINDS)]["is_wicket"].sum())
    out = {"balls": balls, "runs": round(runs, 0), "wickets": wkts}
    out["econ"] = round(runs / (balls / 6) if balls else 0, 2)
    out["srate"] = round(balls / wkts, 1) if wkts else None
    out["phases"] = {}
    for ph in PHASES:
        g = bowl[bowl["phase"] == ph]
        lg, rg = g[g["legal"]], float(g["conceded"].sum())
        nb = len(lg)
        out["phases"][ph] = {"econ": round(rg / (nb / 6) if nb else 0, 2)}
    return out


def _ratio(m, t):
    if not len(m):
        return None
    return round(float((m["winner"] == t).mean()), 3)


def _tags(p, lg_bat, lg_bowl):
    s, w = [], []
    b, bw = p["bat"], p["bowl"]
    # batting strike rate vs league
    if b["balls"] > 500:
        if b["sr"] >= lg_bat["sr"] + 5:
            s.append(f"Elite batting strike rate ({b['sr']} vs league {lg_bat['sr']})")
        elif b["sr"] <= lg_bat["sr"] - 5:
            w.append(f"Slow scoring (SR {b['sr']} vs league {lg_bat['sr']})")
    for ph in PHASES:
        v, lv = b["phases"][ph]["rr"], lg_bat["phases"][ph]["rr"]
        if b["balls"] > 500:
            if v >= lv + 0.8:
                s.append(f"Strong {ph} batting ({v} rpo vs {lv})")
            elif v <= lv - 0.8:
                w.append(f"Weak {ph} batting ({v} rpo vs {lv})")
        e, le = bw["phases"][ph]["econ"], lg_bowl["phases"][ph]["econ"]
        if bw["balls"] > 500:
            if e <= le - 0.7:
                s.append(f"Elite {ph} bowling (econ {e} vs {le})")
            elif e >= le + 0.7:
                w.append(f"Leaky {ph} bowling (econ {e} vs {le})")
    for label, val in (("chase", p.get("chase_win_pct")),
                       ("defence", p.get("defend_win_pct")),
                       ("home", p.get("home_win_pct")),
                       ("away", p.get("away_win_pct"))):
        if val is not None:
            if val >= 0.6:
                s.append(f"Strong {label} record ({int(val * 100)}% wins)")
            elif val <= 0.4:
                w.append(f"Poor {label} record ({int(val * 100)}% wins)")
    return s[:6], w[:6]


def build_player_stats(deliveries, matches):
    d = deliveries.copy()
    season = matches.set_index("id")["season_year"].to_dict()
    d["season_year"] = d["match_id"].map(season)
    d["faced"] = d["extras_type"] != "wides"
    d["legal_bowl"] = _legal(d)
    d["conceded"] = _conceded(d)
    d["bowl_wkt"] = d["dismissal_kind"].isin(BOWL_KINDS)

    bat = d.groupby("batter").agg(
        runs=("batsman_runs", "sum"), balls=("faced", "sum"),
        fours=("batsman_runs", lambda s: int((s == 4).sum())),
        sixes=("batsman_runs", lambda s: int((s == 6).sum())),
        teams=("batting_team", lambda s: sorted(set(s))),
        matches=("match_id", "nunique")).reset_index()
    outs = d[d["player_dismissed"] == d["batter"]].groupby("batter").size()
    bat = bat.merge(outs.rename("outs"), left_on="batter", right_index=True, how="left")
    bat["outs"] = bat["outs"].fillna(0).astype(int)
    bat["sr"] = (100 * bat["runs"] / bat["balls"]).round(1)
    bat["avg"] = (bat["runs"] / bat["outs"].clip(lower=1)).round(1)

    mi = d.groupby(["match_id", "inning", "batter"]).agg(
        runs=("batsman_runs", "sum")).reset_index()
    miles = mi.groupby("batter").agg(fifties=("runs", lambda s: int(((s >= 50) & (s < 100)).sum())),
                                     hundreds=("runs", lambda s: int((s >= 100).sum())),
                                     best=("runs", "max")).reset_index()
    bat = bat.merge(miles, on="batter", how="left")

    bowl = d.groupby("bowler").agg(
        balls=("legal_bowl", "sum"), conceded=("conceded", "sum"),
        wickets=("bowl_wkt", "sum"),
        teams=("bowling_team", lambda s: sorted(set(s))),
        matches=("match_id", "nunique")).reset_index()
    bowl["econ"] = (bowl["conceded"] / (bowl["balls"] / 6)).round(2)
    bowl["srate"] = (bowl["balls"] / bowl["wickets"].clip(lower=1)).round(1)
    bowl["avg"] = (bowl["conceded"] / bowl["wickets"].clip(lower=1)).round(1)
    mw = d[d["bowl_wkt"]].groupby(["match_id", "bowler"]).agg(
        wkts=("bowl_wkt", "sum"), runs=("conceded", "sum")).reset_index()
    mw = mw.sort_values(["wkts", "runs"], ascending=[False, True]).drop_duplicates("bowler")
    bowl = bowl.merge(mw[["bowler", "wkts", "runs"]].rename(
        columns={"wkts": "best_wkts", "runs": "best_runs"}), on="bowler", how="left")

    # recent form (2025-26): runs + wickets
    rec = d[d["season_year"] >= RECENT_FROM]
    rec_bat = rec.groupby("batter").agg(runs=("batsman_runs", "sum"),
                                        balls=("faced", "sum")).reset_index()
    rec_bat["sr"] = (100 * rec_bat["runs"] / rec_bat["balls"]).round(1)
    rec_bowl = rec.groupby("bowler").agg(wickets=("bowl_wkt", "sum"),
                                         balls=("legal_bowl", "sum"),
                                         conceded=("conceded", "sum")).reset_index()
    rec_bowl["econ"] = (rec_bowl["conceded"] / (rec_bowl["balls"] / 6)).round(2)

    return {"batting": bat.sort_values("runs", ascending=False).to_dict(orient="records"),
            "bowling": bowl.sort_values("wickets", ascending=False).to_dict(orient="records"),
            "recent_batting": rec_bat.sort_values("runs", ascending=False).head(60).to_dict(orient="records"),
            "recent_bowling": rec_bowl.sort_values("wickets", ascending=False).head(60).to_dict(orient="records")}


def build_all(deliveries, matches):
    return build_team_profiles(deliveries, matches), build_player_stats(deliveries, matches)
