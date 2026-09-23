"""Leakage-free match features, always from team1's perspective.

Symmetric DIFF features (team1 minus team2) halve the parameter space and
stop the model overfitting to team1/team2 column assignment. Plus Elo
ratings — the standard team-strength signal in sports modelling.
Every stat for a match uses strictly earlier matches only.
"""

from collections import defaultdict, deque

import pandas as pd

from .clean import is_home

FEATURES = [
    "season_year",
    "win_pct_diff",
    "last5_diff",
    "elo_diff",
    "h2h_edge",
    "venue_edge",
    "home_edge",
    "toss_team1",
    "toss_decision_bat",
]

HUMAN_LABELS = {
    "win_pct_diff": "overall win %",
    "last5_diff": "last-5 form",
    "elo_diff": "Elo rating",
    "h2h_edge": "head-to-head",
    "venue_edge": "record at this venue",
    "home_edge": "home advantage",
    "toss_team1": "toss",
    "toss_decision_bat": "toss decision",
    "season_year": "season",
}

ELO_INIT = 1500.0
ELO_K = 24.0
ELO_HOME = 30.0


def _pct(wins, played):
    return wins / played if played else 0.5


def _elo_expected(elo1, elo2, home_edge):
    return 1.0 / (1.0 + 10.0 ** (-(elo1 - elo2 + home_edge * ELO_HOME) / 400.0))


def build_dataset(df):
    """Returns (X, y, meta, current) where current holds final strength tables."""
    matches = df[df["decided"]].copy()
    wins = defaultdict(int)
    played = defaultdict(int)
    form = defaultdict(lambda: deque(maxlen=5))
    elo = defaultdict(lambda: ELO_INIT)
    h2h_wins = defaultdict(int)
    h2h_played = defaultdict(int)
    venue_wins = defaultdict(int)
    venue_played = defaultdict(int)

    rows, labels, meta = [], [], []
    for _, m in matches.iterrows():
        t1, t2 = m["team1"], m["team2"]
        venue = m["venue"]
        toss_w = m["toss_winner"]
        pair = tuple(sorted([t1, t2]))
        h1 = 1 if is_home(t1, venue) else 0
        h2 = 1 if is_home(t2, venue) else 0

        f1 = list(form[t1]).count(t1) / len(form[t1]) if form[t1] else 0.5
        f2 = list(form[t2]).count(t2) / len(form[t2]) if form[t2] else 0.5
        row = {
            "season_year": m["season_year"],
            "win_pct_diff": _pct(wins[t1], played[t1]) - _pct(wins[t2], played[t2]),
            "last5_diff": f1 - f2,
            "elo_diff": (elo[t1] - elo[t2]) / 400.0,
            "h2h_edge": _pct(h2h_wins[(t1, t2)], h2h_played[pair]) - 0.5,
            "venue_edge": (_pct(venue_wins[(t1, venue)], venue_played[(t1, venue)])
                           - _pct(venue_wins[(t2, venue)], venue_played[(t2, venue)])),
            "home_edge": h1 - h2,
            "toss_team1": 1 if toss_w == t1 else -1,
            "toss_decision_bat": 1 if str(m["toss_decision"]).lower() == "bat" else 0,
        }
        rows.append(row)
        labels.append(1 if m["winner"] == t1 else 0)
        meta.append({"team1": t1, "team2": t2, "venue": venue,
                     "season_year": m["season_year"], "date": str(m["date"].date())})

        # update history AFTER recording features (no leakage)
        w = m["winner"]
        exp = _elo_expected(elo[t1], elo[t2], h1 - h2)
        s1 = 1.0 if w == t1 else 0.0
        elo[t1] += ELO_K * (s1 - exp)
        elo[t2] += ELO_K * ((1.0 - s1) - (1.0 - exp))
        played[t1] += 1
        played[t2] += 1
        wins[w] += 1
        form[t1].append(w)
        form[t2].append(w)
        h2h_played[pair] += 1
        h2h_wins[(w, t2 if w == t1 else t1)] += 1
        venue_played[(t1, venue)] += 1
        venue_played[(t2, venue)] += 1
        venue_wins[(w, venue)] += 1

    X = pd.DataFrame(rows, columns=FEATURES)
    y = pd.Series(labels, name="team1_win")

    current = {
        "win_pct": {t: (wins[t] / played[t] if played[t] else 0.5) for t in played},
        "played": dict(played),
        "last5": {t: (list(form[t]).count(t) / len(form[t]) if form[t] else 0.5)
                  for t in form},
        "elo": {t: float(e) for t, e in elo.items()},
        "h2h": {f"{a}||{b}": (h2h_wins[(a, b)] / h2h_played[tuple(sorted([a, b]))])
                for (a, b) in h2h_wins},
        "venue": {f"{t}||{v}": (venue_wins[(t, v)] / venue_played[(t, v)])
                  for (t, v) in venue_wins},
        "feature_means": {c: float(X[c].mean()) for c in FEATURES},
    }
    return X, y, meta, current


def feature_row_for_matchup(team1, team2, venue, toss_winner, toss_decision,
                            season_year, current):
    """Build one feature row for a hypothetical match from current tables."""
    from .clean import normalize_team, normalize_venue
    t1, t2 = normalize_team(team1), normalize_team(team2)
    ven = normalize_venue(venue)
    pair = "||".join(sorted([t1, t2]))

    def h2h(a, b):
        key, rev = f"{a}||{b}", f"{b}||{a}"
        if key in current["h2h"]:
            return current["h2h"][key] - 0.5
        if rev in current["h2h"]:
            return 0.5 - current["h2h"][rev]
        return 0.0

    h1 = 1 if is_home(t1, ven) else 0
    h2 = 1 if is_home(t2, ven) else 0
    row = {
        "season_year": season_year,
        "win_pct_diff": current["win_pct"].get(t1, 0.5) - current["win_pct"].get(t2, 0.5),
        "last5_diff": current["last5"].get(t1, 0.5) - current["last5"].get(t2, 0.5),
        "elo_diff": (current["elo"].get(t1, ELO_INIT)
                     - current["elo"].get(t2, ELO_INIT)) / 400.0,
        "h2h_edge": h2h(t1, t2),
        "venue_edge": (current["venue"].get(f"{t1}||{ven}", 0.5)
                       - current["venue"].get(f"{t2}||{ven}", 0.5)),
        "home_edge": h1 - h2,
        "toss_team1": 1 if normalize_team(toss_winner) == t1 else -1,
        "toss_decision_bat": 1 if str(toss_decision).lower() == "bat" else 0,
    }
    return row, (t1, t2, ven, pair)
