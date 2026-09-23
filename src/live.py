"""Live win probability from innings state (ball-by-ball data).

Two models: first-innings (defence) and second-innings (chase).
Features are team-agnostic match state + Elo + venue par, so unlike the
pre-toss model this has real signal: 60%+ early, 85%+ at the death.

Usage:  python -m src.live   (also called from src.train when data exists)
Saves:  model/live_inn1.pkl, model/live_inn2.pkl, model/live_metrics.json,
        model/live_aux.json
"""

import json
from collections import defaultdict
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import cross_val_score

from .clean import TEAM_SHORT, load_matches, normalize_team, normalize_venue
from .features import ELO_HOME, ELO_INIT, ELO_K, _elo_expected

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "model"
CUTOFF = 2024  # train on season_year <= CUTOFF, test after

VALID_EXTRAS_LEGAL = {"wides", "noballs"}

# Dismissals credited to the bowler (run outs / retirements excluded).
BOWL_KINDS = {"caught", "bowled", "lbw", "caught and bowled", "stumped",
              "hit wicket"}
MIN_BAT_BALLS = 30
MIN_BOWL_BALLS = 24


def load_deliveries(path=None):
    d = pd.read_csv(path or ROOT / "data" / "deliveries.csv")
    d = d[d["inning"].isin([1, 2])].copy()
    d["batting_team"] = d["batting_team"].apply(normalize_team)
    d["bowling_team"] = d["bowling_team"].apply(normalize_team)
    valid = set(TEAM_SHORT) - {"?'" }
    d = d[d["batting_team"].isin(valid) & d["bowling_team"].isin(valid)]
    return d.sort_values(["match_id", "inning", "over"]).reset_index(drop=True)


def elo_at_match(matches):
    """Chronological Elo; returns {match_id: {team: elo before match}}."""
    elo = defaultdict(lambda: ELO_INIT)
    out = {}
    for _, m in matches.sort_values("date").iterrows():
        t1, t2 = m["team1"], m["team2"]
        out[m["id"]] = {t1: elo[t1], t2: elo[t2]}
        if m["decided"]:
            from .clean import is_home
            h = (1 if is_home(t1, m["venue"]) else 0) - (1 if is_home(t2, m["venue"]) else 0)
            exp = _elo_expected(elo[t1], elo[t2], h)
            s1 = 1.0 if m["winner"] == t1 else 0.0
            elo[t1] += ELO_K * (s1 - exp)
            elo[t2] += ELO_K * ((1 - s1) - (1 - exp))
    return out


def build_pool_table(deliveries, matches):
    """Chronological (player, team) career sums.

    Returns (pools, current, global_means) where pools[match_id][team] =
    {"sr","avg","econ","srate"} computed from strictly earlier matches, so
    auction team-switches are handled: only balls played FOR that team count.
    """
    by_match = dict(tuple(deliveries.groupby("match_id")))
    bat_runs = defaultdict(int)   # (player, team) -> runs as batter
    bat_balls = defaultdict(int)  # legal-ish balls faced (excl wides)
    bat_outs = defaultdict(int)
    bowl_runs = defaultdict(int)  # runs conceded (excl byes/legbyes)
    bowl_balls = defaultdict(int)  # legal balls bowled
    bowl_wkts = defaultdict(int)

    def means(team, final=False):
        sr_l, avg_l, econ_l, srate_l = [], [], [], []
        for (p, t) in list(bat_balls):
            if t != team or bat_balls[(p, t)] < MIN_BAT_BALLS:
                continue
            sr_l.append(100.0 * bat_runs[(p, t)] / bat_balls[(p, t)])
            avg_l.append(bat_runs[(p, t)] / max(bat_outs[(p, t)], 1))
        for (p, t) in list(bowl_balls):
            if t != team or bowl_balls[(p, t)] < MIN_BOWL_BALLS:
                continue
            overs = bowl_balls[(p, t)] / 6.0
            econ_l.append(bowl_runs[(p, t)] / overs if overs else 9.0)
            srate_l.append(bowl_balls[(p, t)] / bowl_wkts[(p, t)]
                           if bowl_wkts[(p, t)] else 36.0)
        return {"sr_l": sr_l, "avg_l": avg_l, "econ_l": econ_l,
                "srate_l": srate_l}

    def summarize(team, g):
        m = means(team)
        return {
            "sr": sum(m["sr_l"]) / len(m["sr_l"]) if m["sr_l"] else g["sr"],
            "avg": sum(m["avg_l"]) / len(m["avg_l"]) if m["avg_l"] else g["avg"],
            "econ": sum(m["econ_l"]) / len(m["econ_l"]) if m["econ_l"] else g["econ"],
            "srate": sum(m["srate_l"]) / len(m["srate_l"]) if m["srate_l"] else g["srate"],
        }

    def global_means():
        all_sr, all_avg, all_econ, all_srate = [], [], [], []
        for (p, t) in bat_balls:
            if bat_balls[(p, t)] >= MIN_BAT_BALLS:
                all_sr.append(100.0 * bat_runs[(p, t)] / bat_balls[(p, t)])
                all_avg.append(bat_runs[(p, t)] / max(bat_outs[(p, t)], 1))
        for (p, t) in bowl_balls:
            if bowl_balls[(p, t)] >= MIN_BOWL_BALLS:
                overs = bowl_balls[(p, t)] / 6.0
                all_econ.append(bowl_runs[(p, t)] / overs if overs else 9.0)
                all_srate.append(bowl_balls[(p, t)] / bowl_wkts[(p, t)]
                                 if bowl_wkts[(p, t)] else 36.0)
        return {"sr": sum(all_sr) / len(all_sr) if all_sr else 130.0,
                "avg": sum(all_avg) / len(all_avg) if all_avg else 25.0,
                "econ": sum(all_econ) / len(all_econ) if all_econ else 8.5,
                "srate": sum(all_srate) / len(all_srate) if all_srate else 20.0}

    pools = {}
    for _, m in matches.sort_values("date").iterrows():
        g = global_means()
        pools[m["id"]] = {t: summarize(t, g)
                          for t in {m["team1"], m["team2"]}}
        grp = by_match.get(m["id"])
        if grp is None:
            continue
        for _, b in grp.iterrows():
            bt, bo = b["batting_team"], b["bowling_team"]
            et = b["extras_type"] if pd.notna(b["extras_type"]) else None
            if et != "wides":
                bat_balls[(b["batter"], bt)] += 1
                bat_runs[(b["batter"], bt)] += b["batsman_runs"]
            if pd.notna(b["player_dismissed"]) and b["player_dismissed"] == b["batter"]:
                bat_outs[(b["batter"], bt)] += 1
            if et not in ("wides", "noballs"):
                bowl_balls[(b["bowler"], bo)] += 1
                conceded = b["batsman_runs"] + (b["extra_runs"] if et in (None,) else 0)
                # wides/noballs excluded above; byes+legbyes not vs bowler
                if et in ("byes", "legbyes"):
                    conceded = 0
                bowl_runs[(b["bowler"], bo)] += conceded
            if (b["is_wicket"] and pd.notna(b["dismissal_kind"])
                    and b["dismissal_kind"] in BOWL_KINDS):
                bowl_wkts[(b["bowler"], bo)] += 1

    g = global_means()
    teams = set(matches["team1"]) | set(matches["team2"])
    current = {t: summarize(t, g) for t in teams}
    return pools, current, g

def build_states(deliveries, matches, pools=None):
    """One row per (match, innings, overs_completed=1..20)."""
    info = {r["id"]: r for _, r in matches.iterrows()}
    elos = elo_at_match(matches)
    pools = pools or {}
    g_fallback = {"sr": 130.0, "avg": 25.0, "econ": 8.5, "srate": 20.0}
    g = deliveries.groupby(["match_id", "inning", "over"]).agg(
        runs=("total_runs", "sum"), wkts=("is_wicket", "sum")).reset_index()
    rows = []
    for (mid, inn), grp in g.groupby(["match_id", "inning"]):
        m = info.get(mid)
        if m is None or not m["decided"]:
            continue
        grp = grp.sort_values("over")
        cum_runs, cum_wkts = grp["runs"].cumsum(), grp["wkts"].cumsum()
        first_bat = deliveries[(deliveries["match_id"] == mid)
                               & (deliveries["inning"] == inn)].iloc[0]
        bat_team, bowl_team = first_bat["batting_team"], first_bat["bowling_team"]
        snap = pools.get(mid, {})
        pb = snap.get(bat_team, g_fallback)
        pw = snap.get(bowl_team, g_fallback)
        n_overs = len(grp)
        for i in range(n_overs):
            o = i + 1  # overs completed
            rows.append({
                "match_id": mid, "inning": inn, "over": o,
                "runs": int(cum_runs.iloc[i]), "wkts": int(cum_wkts.iloc[i]),
                "bat": bat_team, "bowl": bowl_team,
                "venue": m["venue"], "season_year": m["season_year"],
                "target": m["target_runs"] if pd.notna(m["target_runs"]) else None,
                "bat_won": 1 if m["winner"] == bat_team else 0,
                "elo_bat": elos[mid][bat_team], "elo_bowl": elos[mid][bowl_team],
                "pool_sr": pb["sr"], "pool_avg": pb["avg"],
                "pool_econ": pw["econ"], "pool_srate": pw["srate"],
            })
    return pd.DataFrame(rows)


INN1 = ["over", "runs", "wkts", "elo_diff",
        "pool_sr", "pool_avg", "pool_econ", "pool_srate"]
INN2 = ["over", "runs", "wkts", "runs_needed", "req_rr", "curr_rr",
        "wkts_in_hand", "elo_diff", "venue_par"]


def featurize(s, venue_avg):
    """Shared train/predict feature builder. s has over/runs/wkts(+target)."""
    o = s["over"]
    base = {"over": o, "runs": s["runs"], "wkts": s["wkts"],
            "elo_diff": (s["elo_bat"] - s["elo_bowl"]) / 400.0,
            "venue_par": venue_avg,
            "pool_sr": s.get("pool_sr", 130.0), "pool_avg": s.get("pool_avg", 25.0),
            "pool_econ": s.get("pool_econ", 8.5), "pool_srate": s.get("pool_srate", 20.0)}
    if s["inning"] == 1:
        last5 = s.get("last5_runs", s["runs"] / o * min(o, 5))
        base.update({"run_rate": s["runs"] / o,
                     "recent_rr": last5 / min(o, 5)})
        return {k: base[k] for k in INN1}
    need = s["target"] - s["runs"]
    base.update({"runs_needed": need,
                 "req_rr": need / (20 - o) if o < 20 else need,
                 "curr_rr": s["runs"] / o,
                 "wkts_in_hand": 10 - s["wkts"]})
    return {k: base[k] for k in INN2}


def with_recent_rr(states):
    """Add last-5-over runs within each innings."""
    states = states.copy()
    states["last5_runs"] = states.groupby(["match_id", "inning"])["runs"].transform(
        lambda s: s - s.shift(5).fillna(0))
    return states


def train_one(df, cols):
    cands = {"logreg": LogisticRegression(max_iter=5000),
             "grad_boosting": HistGradientBoostingClassifier(random_state=42)}
    tr = df["season_year"] <= CUTOFF
    Xtr, ytr = df[tr][cols], df[tr]["bat_won"]
    Xte, yte = df[~tr][cols], df[~tr]["bat_won"]
    best, best_auc, fitted = None, -1, {}
    for name, mdl in cands.items():
        auc = cross_val_score(mdl, Xtr, ytr, cv=4, scoring="roc_auc").mean()
        mdl.fit(Xtr, ytr)
        fitted[name] = (mdl, float(auc))
        if auc > best_auc:
            best, best_auc = name, auc
    model = fitted[best][0]
    p = model.predict(Xte)
    proba = model.predict_proba(Xte)[:, 1]
    by_over = {}
    te = df[~tr].copy()
    te["pred"] = p
    for o, grp in te.groupby("over"):
        by_over[int(o)] = {"n": len(grp),
                           "accuracy": round(float(accuracy_score(grp["bat_won"], grp["pred"])), 3)}
    return model, {"best_model": best,
                   "cv_auc": {n: round(a, 3) for n, (_, a) in fitted.items()},
                   "test_accuracy": round(float(accuracy_score(yte, p)), 3),
                   "test_auc": round(float(roc_auc_score(yte, proba)), 3),
                   "n_test": len(yte), "by_over": by_over}


def main():
    matches = load_matches()
    print("loading deliveries...")
    d = load_deliveries()
    print(f"deliveries: {len(d)} balls, {d['match_id'].nunique()} matches")
    print("building chronological player pools...")
    pools, current_pools, global_pool = build_pool_table(d, matches)
    states = with_recent_rr(build_states(d, matches, pools=pools))
    train_m = matches[matches["season_year"] <= CUTOFF]["id"].unique()
    venue_avg_all = (states[(states["inning"] == 1) & (states["over"] == 20)]
                     .groupby("venue")["runs"].mean().to_dict())
    venue_avg_tr = (states[(states["inning"] == 1) & (states["over"] == 20)
                           & (states["match_id"].isin(train_m))]
                    .groupby("venue")["runs"].mean().to_dict())
    global_mean = float(states[(states["inning"] == 1)
                               & (states["match_id"].isin(train_m))].groupby(
        "match_id")["runs"].max().mean())
    states["venue_par_all"] = states["venue"].map(venue_avg_all).fillna(global_mean)
    states["venue_par_tr"] = states["venue"].map(venue_avg_tr).fillna(global_mean)

    inn1 = states[states["inning"] == 1].copy()
    r1 = [{"inning": 1, "over": r["over"], "runs": r["runs"], "wkts": r["wkts"],
           "elo_bat": r["elo_bat"], "elo_bowl": r["elo_bowl"],
           "last5_runs": r["last5_runs"], "venue_par": r["venue_par_all"],
           "pool_sr": r["pool_sr"], "pool_avg": r["pool_avg"],
           "pool_econ": r["pool_econ"], "pool_srate": r["pool_srate"]}
          for _, r in inn1.iterrows()]
    X1 = pd.DataFrame([featurize(s, s["venue_par"]) for s in r1])
    X1["bat_won"] = inn1["bat_won"].values
    X1["season_year"] = inn1["season_year"].values
    X1["over"] = inn1["over"].values if "over" in inn1 else X1["over"]

    inn2 = states[states["inning"] == 2].copy()
    inn2 = inn2[inn2["over"] < 20]
    inn2 = inn2.dropna(subset=["target"])
    r2 = [{"inning": 2, "over": r["over"], "runs": r["runs"], "wkts": r["wkts"],
           "elo_bat": r["elo_bat"], "elo_bowl": r["elo_bowl"],
           "target": r["target"], "venue_par": r["venue_par_all"],
           "pool_sr": r["pool_sr"], "pool_avg": r["pool_avg"],
           "pool_econ": r["pool_econ"], "pool_srate": r["pool_srate"]}
          for _, r in inn2.iterrows()]
    X2 = pd.DataFrame([featurize(s, s["venue_par"]) for s in r2])
    X2["bat_won"] = inn2["bat_won"].values
    X2["season_year"] = inn2["season_year"].values
    X2["over"] = inn2["over"].values if "over" in inn2 else X2["over"]

    print(f"inn1 rows: {len(X1)}, inn2 rows: {len(X2)}")
    m1, met1 = train_one(X1, INN1)
    print(f"inn1: {met1['best_model']} cv={met1['cv_auc']} "
          f"test_acc={met1['test_accuracy']} auc={met1['test_auc']}")
    m2, met2 = train_one(X2, INN2)
    print(f"inn2: {met2['best_model']} cv={met2['cv_auc']} "
          f"test_acc={met2['test_accuracy']} auc={met2['test_auc']}")

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(m1, MODEL_DIR / "live_inn1.pkl")
    joblib.dump(m2, MODEL_DIR / "live_inn2.pkl")
    (MODEL_DIR / "live_metrics.json").write_text(json.dumps(
        {"cutoff": CUTOFF, "innings_1": met1, "innings_2": met2,
         "features_1": INN1, "features_2": INN2}, indent=2))
    aux = {"venue_avg": {v: round(float(a), 1) for v, a in venue_avg_all.items()},
           "global_par": round(global_mean, 1),
           "balls": int(len(d)),
           "team_pool": {t: {k: round(float(v), 2) for k, v in p.items()}
                         for t, p in current_pools.items()},
           "global_pool": {k: round(float(v), 2) for k, v in global_pool.items()}}
    (MODEL_DIR / "live_aux.json").write_text(json.dumps(aux, indent=2))
    print("saved live models + metrics")


if __name__ == "__main__":
    main()
