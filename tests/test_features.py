"""Model-level tests: leakage-free features, sane ratings, working toss model."""

from src.clean import load_matches
from src.features import build_dataset
from src.predict import match_centre, toss_advice


def test_dataset_shape():
    df = load_matches()
    X, y, meta, current = build_dataset(df)
    assert len(X) == len(y) == len(meta) == int(df["decided"].sum()) > 1000
    assert 2007 in set(X["season_year"].unique())
    assert y.isin([0, 1]).all()
    # diff features are bounded and centered-ish
    assert X["win_pct_diff"].abs().max() <= 1.0
    assert X["h2h_edge"].abs().max() <= 0.5


def test_no_leakage_first_season_defaults():
    df = load_matches()
    X, _, meta, _ = build_dataset(df)
    first = [i for i, m in enumerate(meta) if m["season_year"] == 2007]
    assert first, "expected 2007 matches"
    row = X.iloc[first[0]]
    assert row["win_pct_diff"] == 0.0
    assert row["elo_diff"] == 0.0


def test_toss_advice_chinnaswamy_chases():
    t = toss_advice("M Chinnaswamy Stadium", month=4)
    assert t["venue"] == "M Chinnaswamy Stadium, Bengaluru"
    assert t["p_bowl_first"] > 0.7  # historically ~90% chase
    assert "chase" in t["recommendation"]


def test_match_centre_bundle():
    mc = match_centre("Mumbai Indians", "Chennai Super Kings",
                      "Wankhede Stadium, Mumbai")
    assert mc["team1"]["name"] == "Mumbai Indians"
    assert mc["team2"]["elo"] > 1400
    assert 0.0 <= mc["head_to_head"]["team1_pct"] <= 1.0
    assert "recommendation" in mc["toss"]
