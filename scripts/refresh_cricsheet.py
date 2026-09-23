"""Refresh IPL data from Cricsheet JSON (e.g. https://cricsheet.org/downloads/ipl_json.zip).

Keeps only matches whose IDs are missing locally, converts them to this
repo's matches.csv / data/deliveries.csv schemas, and appends.

Usage:
    python scripts/refresh_cricsheet.py --json-dir <unzipped ipl_json> [--apply]
    (default is --dry-run: prints what would be added)
"""

import argparse
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

EXTRA_ORDER = ("wides", "noballs", "byes", "legbyes", "penalty")


def parse_match(mid, doc):
    info = doc.get("info", {})
    teams = info.get("teams", [])
    dates = info.get("dates", [])
    toss = info.get("toss", {}) or {}
    outcome = info.get("outcome", {}) or {}
    officials = info.get("officials", {}) or {}
    innings = doc.get("innings", []) or []

    def unbox(v):
        return v[0] if isinstance(v, list) else v

    winner = outcome.get("winner")
    by = outcome.get("by", {}) or {}
    if winner:
        if "runs" in by:
            result, margin = "runs", unbox(by["runs"])
        elif "wickets" in by:
            result, margin = "wickets", unbox(by["wickets"])
        else:
            result, margin = "tie", None
    else:
        result, margin = outcome.get("result", "no result"), None

    def inn_total(idx):
        tot = 0
        if idx < len(innings):
            for ov in innings[idx].get("overs", []):
                for b in ov.get("deliveries", []):
                    tot += b.get("runs", {}).get("total", 0)
        return tot

    target_runs, target_overs = None, info.get("overs", 20)
    if len(innings) > 1:
        target_runs = inn_total(0) + 1
        t = innings[1].get("target")
        if isinstance(t, dict):  # DLS revised target
            target_runs = t.get("runs", target_runs)
            target_overs = t.get("overs", target_overs)

    return {
        "id": int(mid),
        "season": str(info.get("season", "")),
        "city": info.get("city"),
        "date": dates[0] if dates else None,
        "match_type": "League",
        "player_of_match": (info.get("player_of_match") or [None])[0],
        "venue": info.get("venue"),
        "team1": teams[0] if len(teams) > 0 else None,
        "team2": teams[1] if len(teams) > 1 else None,
        "toss_winner": toss.get("winner"),
        "toss_decision": toss.get("decision"),
        "winner": winner,
        "result": result,
        "result_margin": margin,
        "target_runs": target_runs,
        "target_overs": target_overs,
        "super_over": "Y" if len(innings) > 2 else "N",
        "method": "NA",
        "umpire1": (officials.get("umpires") or [None])[0],
        "umpire2": (officials.get("umpires") or [None, None])[1],
    }


def parse_deliveries(mid, doc):
    info = doc.get("info", {})
    teams = info.get("teams", [])
    rows = []
    for idx, inn in enumerate(doc.get("innings", [])[:2]):  # 1st + 2nd only
        bat = inn.get("team")
        bowl = next((t for t in teams if t != bat), None)
        for ov in inn.get("overs", []):
            for bi, b in enumerate(ov.get("deliveries", [])):
                runs = b.get("runs", {})
                ex = b.get("extras", {}) or {}
                et = next((k for k in EXTRA_ORDER if ex.get(k)), None)
                wk = b.get("wickets") or []
                rows.append({
                    "match_id": int(mid),
                    "inning": idx + 1,
                    "batting_team": bat,
                    "bowling_team": bowl,
                    "over": ov.get("over", 0),
                    "ball": bi + 1,
                    "batter": b.get("batter"),
                    "bowler": b.get("bowler"),
                    "non_striker": b.get("non_striker"),
                    "batsman_runs": runs.get("batter", 0),
                    "extra_runs": runs.get("extras", 0),
                    "total_runs": runs.get("total", 0),
                    "extras_type": et,
                    "is_wicket": 1 if wk else 0,
                    "player_dismissed": wk[0].get("player_out") if wk else None,
                    "dismissal_kind": wk[0].get("kind") if wk else None,
                    "fielder": ((wk[0].get("fielders") or [{}])[0].get("name")
                                if wk else None),
                })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-dir", required=True)
    ap.add_argument("--apply", action="store_true",
                    help="append to matches.csv + data/deliveries.csv")
    args = ap.parse_args()

    have = set(pd.read_csv(ROOT / "matches.csv")["id"].astype(int))
    new_matches, new_deliveries = [], []
    files = sorted(Path(args.json_dir).glob("*.json"))
    for f in files:
        if int(f.stem) in have:
            continue
        try:
            doc = json.loads(f.read_text())
        except Exception as e:
            print(f"skip {f.name}: {e}")
            continue
        new_matches.append(parse_match(f.stem, doc))
        new_deliveries.extend(parse_deliveries(f.stem, doc))

    m = pd.DataFrame(new_matches)
    d = pd.DataFrame(new_deliveries)
    print(f"files: {len(files)}, new matches: {len(m)}, new balls: {len(d)}")
    if len(m):
        print("seasons:", sorted(m["season"].astype(str).unique()))
        print("teams:", sorted(set(m["team1"]) | set(m["team2"])))
        print("venues:", len(m["venue"].unique()))
        print("decided:", int(m["winner"].notna().sum()), "/", len(m))
        print(m[["id", "season", "date", "team1", "team2", "winner",
                 "venue"]].to_string())
    if args.apply and len(m):
        mcols = pd.read_csv(ROOT / "matches.csv", nrows=0).columns.tolist()
        m = m[mcols]
        m.to_csv(ROOT / "matches.csv", mode="a", header=False, index=False)
        dcols = pd.read_csv(ROOT / "data" / "deliveries.csv", nrows=0).columns.tolist()
        d = d[dcols]
        d.to_csv(ROOT / "data" / "deliveries.csv", mode="a", header=False, index=False)
        print("appended.")
    elif not args.apply:
        print("(dry run — pass --apply to append)")


if __name__ == "__main__":
    main()
