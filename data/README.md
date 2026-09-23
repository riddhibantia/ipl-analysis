# Ball-by-ball data

`deliveries.csv` — 260,920 balls across the same 1,095 matches as `matches.csv`
(IDs join 1:1, verified).

Source: Kaggle-schema mirror of the IPL ball-by-ball dataset
(`github.com/Sukrut10k/ipl-match-analysis`, file `data/deliveries.csv`).
Original provenance: Cricsheet.

Refresh:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Sukrut10k/ipl-match-analysis/main/data/deliveries.csv" -OutFile "data/deliveries.csv"
```

Notes: only innings 1–2 are used (3+ are super overs); team names are
normalised with the same map as `src/clean.py`; matches shorter than the
snapshot over are excluded from training rows at that over.
