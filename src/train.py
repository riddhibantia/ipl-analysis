"""Train toss-decision model + build Elo ratings and SQLite snapshot.

Usage:  python -m src.train [--csv matches.csv] [--cutoff 2021]
Saves:  model/toss_model.pkl, model/toss_metrics.json, model/ratings.json,
        model/current_stats.json, model/feature_list.json, ipl.db
"""

import argparse
import json
import sqlite3
from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import cross_val_score

from .clean import load_matches, normalize_venue
from .features import build_dataset

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "model"
TOP_VENUES = 15


def toss_frame(df):
    d = df[df["decided"]].copy()
    d["month"] = d["date"].dt.month
    d["bat_first"] = (d["toss_decision"].str.lower() == "bat").astype(int)
    top = d["venue"].value_counts().head(TOP_VENUES).index.tolist()
    d["venue_group"] = d["venue"].where(d["venue"].isin(top), "Other venues")
    X = pd.get_dummies(d[["venue_group", "month"]],
                       columns=["venue_group", "month"]).astype(float)
    X["season_year"] = d["season_year"].values
    return d, X, d["bat_first"], top


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(ROOT / "matches.csv"))
    ap.add_argument("--cutoff", type=int, default=2023)
    args = ap.parse_args()

    df = load_matches(args.csv)
    print(f"loaded {len(df)} matches ({int(df['decided'].sum())} decided)")

    # ---- 1. toss decision model ----
    d, X, y, top_venues = toss_frame(df)
    cols = X.columns.tolist()
    tr = (d["season_year"] <= args.cutoff).values
    cands = {
        "logreg": LogisticRegression(max_iter=5000),
        "random_forest": RandomForestClassifier(n_estimators=400, min_samples_leaf=5,
                                                random_state=42, n_jobs=-1),
        "grad_boosting": HistGradientBoostingClassifier(random_state=42),
    }
    cv_scores, fitted = {}, {}
    for name, mdl in cands.items():
        s = cross_val_score(mdl, X, y, cv=5, scoring="roc_auc")
        cv_scores[name] = [round(float(v), 3) for v in s]
        fitted[name] = mdl.fit(X, y)
        print(f"{name}: cv_auc={cv_scores[name]} mean={s.mean():.3f}")
    best = max(cv_scores, key=lambda n: sum(cv_scores[n]) / len(cv_scores[n]))
    base = fitted[best]
    model = CalibratedClassifierCV(base, cv=5)
    model.fit(X[tr], y[tr])
    proba = model.predict_proba(X[~tr])[:, 1]
    test = {"accuracy": round(float(accuracy_score(y[~tr], proba > 0.5)), 3),
            "roc_auc": round(float(roc_auc_score(y[~tr], proba)), 3),
            "n_test": int((~tr).sum())}
    print(f"best: {best}, test(>{args.cutoff}): {test}")

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(model, MODEL_DIR / "toss_model.pkl")
    (MODEL_DIR / "toss_metrics.json").write_text(json.dumps(
        {"best_model": best, "cv_auc": cv_scores, "test": test,
         "columns": cols, "top_venues": top_venues,
         "note": "P(captain bats first | venue, month, season). "
                 "Venues outside top-15 fold into 'Other venues'."}, indent=2))

    # ---- 2. ratings (Elo + form + venue intelligence) ----
    _, _, _, current = build_dataset(df)
    ratings = []
    for team, e in sorted(current["elo"].items(), key=lambda kv: -kv[1]):
        ratings.append({"team": team, "elo": round(e),
                        "win_pct": round(current["win_pct"].get(team, 0.5), 3),
                        "played": current["played"].get(team, 0),
                        "last5": round(current["last5"].get(team, 0.5), 3)})
    (MODEL_DIR / "ratings.json").write_text(json.dumps(ratings, indent=2))
    (MODEL_DIR / "current_stats.json").write_text(json.dumps(current, indent=2))
    (MODEL_DIR / "feature_list.json").write_text(json.dumps(cols, indent=2))

    venue_rows = []
    for venue, g in d.groupby("venue"):
        venue_rows.append({"venue": venue, "matches": len(g),
                           "bat_first_pct": round(float(g["bat_first"].mean()), 3),
                           "toss_win_match_win_pct": round(
                               float((g["toss_winner"] == g["winner"]).mean()), 3)})
    (MODEL_DIR / "venues.json").write_text(json.dumps(
        sorted(venue_rows, key=lambda r: -r["matches"]), indent=2))

    # ---- 3. SQLite snapshot ----
    db_path = ROOT / "ipl.db"
    if db_path.exists():
        db_path.unlink()
    con = sqlite3.connect(db_path)
    df.to_sql("matches", con, index=False)
    con.close()
    info = {"matches": len(df),
            "seasons": sorted(df["season_year"].dropna().unique().astype(int).tolist()),
            "teams": sorted(pd.concat([df["team1"], df["team2"]]).unique().tolist())}
    (MODEL_DIR / "dataset_info.json").write_text(json.dumps(info, indent=2))
    print(f"saved toss model ({best}) + ratings + {db_path.name}")

    # ---- 4. live win probability (needs data/deliveries.csv) ----
    if (ROOT / "data" / "deliveries.csv").exists():
        from .live import main as live_main
        live_main()
        from .analytics import build_all
        from .live import load_deliveries
        profiles, players = build_all(load_deliveries(), df)
        (MODEL_DIR / "team_profiles.json").write_text(json.dumps(profiles, indent=2))
        (MODEL_DIR / "player_stats.json").write_text(json.dumps(players, indent=2))
        print(f"saved {len(profiles)} team profiles + "
              f"{len(players['batting'])} batters + {len(players['bowling'])} bowlers")
    else:
        print("skipping live model: data/deliveries.csv not found "
              "(see data/README.md)")


if __name__ == "__main__":
    main()
