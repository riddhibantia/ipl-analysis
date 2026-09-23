# Ball-by-ball data

`deliveries.csv` — 295,718 balls across the same 1,243 matches as `matches.csv`
(IDs join 1:1, verified). 2008–2024: Kaggle-schema mirror
(`github.com/Sukrut10k/ipl-match-analysis`, file `data/deliveries.csv`,
original provenance Cricsheet). 2025–2026: appended from Cricsheet
(`https://cricsheet.org/downloads/ipl_json.zip`).

Refresh for a new season (re-runnable, dedupes by match ID):

```powershell
# 1. download + unzip ipl_json.zip from cricsheet.org/downloads
# 2. from the repo root:
python scripts/refresh_cricsheet.py --json-dir <unzipped> --apply
python -m src.train
```

Notes: only innings 1–2 are used (3+ are super overs); team names are
normalised with the same map as `src/clean.py`; matches shorter than the
snapshot over are excluded from training rows at that over.
