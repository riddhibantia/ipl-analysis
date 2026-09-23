# IPL Intelligence — Match Centre, Live Predictor, Toss Lab & Ratings

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikit-learn&logoColor=white)
![pytest](https://img.shields.io/badge/pytest-18_passed-green?logo=pytest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Pre-match + in-match intelligence for the IPL (2008–2024): a **Match Centre** (ratings, head-to-head, form, venue edge),
a **Live Win Predictor** trained on 260k balls, a **Toss Lab** (bat-first vs chase advisor), **Elo ratings**, and **venue analytics** —
served by a FastAPI backend with a light, mobile-friendly UI in the style of FotMob / SofaScore, using official IPL team logos.

## Architecture

```
React + Vite + Tailwind (web/src, 6 tabs)
  │  REST (/api/*)
  ▼
FastAPI (api/main.py) → scikit-learn models + SQLite (ipl.db, built by src/train.py)
  ├── match-centre bundles (Elo K=24 + venue + form + h2h)
  ├── live win proba (19.8k chase states / 21.6k 1st-inns states)
  ├── toss advice (calibrated logreg, venue + month + season)
  └── SQL insights (teams, toss, h2h, form)
```

`web/dist/` is built (`npm run build`, served by FastAPI); `frontend/` is the legacy vanilla fallback if `dist/` is missing.

## Screenshots

> Add 2–3 captures here (`screenshots/`):

```
screenshots/match-centre.png  # ratings + h2h + venue edge
screenshots/live.png          # Live Predictor: e.g. 140/3 after 15, target 180
screenshots/toss.png          # Toss Lab bat-first vs chase advice
```

## Demo

```bash
pip install -r requirements.txt
python -m src.train        # builds model/ + ipl.db from matches.csv (+ data/deliveries.csv if present)
python -m uvicorn api.main:app --port 8000
# open http://127.0.0.1:8000 → try the Live Predictor tab: 2nd innings, 140/3 after 15, target 180
```

Or with Docker:

```bash
docker build -t ipl-intelligence .
docker run -p 8000:8000 ipl-intelligence
```

Note: `data/deliveries.csv` (26.7MB, 260,920 balls) is gitignored — refresh via `data/README.md`. Without it, `src/train.py` skips the live model and `/api/live` returns 503 with a clear message; toss + ratings + insights still work.

## What the models actually do (honest numbers)

| Task | Model | Evaluation |
|---|---|---|
| **Live win proba, chase** (runs/wkts/req-rate + Elo + venue par) | Logistic regression on 19.8k innings-states | 4-fold CV AUC **0.88**, 2023–24 holdout acc **78%**, AUC **0.87** |
| **Live win proba, 1st inns** (runs/wkts + Elo + squad pools*) | Logistic regression on 21.6k innings-states | CV AUC **0.66**, holdout acc **63%**, AUC **0.69** |
| Toss decision: P(captain bats first \| venue, month, season) | Calibrated logistic regression | 5-fold CV AUC **0.65**, post-2021 holdout accuracy **75%** |
| Team strength | Elo (K=24, home +30), chronological, leakage-free | Descriptive ratings + form tables |
| Match-winner prediction | **Deliberately not shipped** | 3 models trained on 872 pre-2022 matches scored 45–50% on 2022–24 holdout (AUC < 0.5). The 2022 mega-auction reset squads and broke every historical feature — so the app shows analytics instead of a fake predictor. |

Example intelligence: captains winning the toss at M Chinnaswamy Stadium chase ~90% of the time; at Chepauk they bat first ~61%.

\* Squad pools: chronological career strike-rate / average / economy per (player, team) — only balls played *for that team* before the match count, so auction team-switches are handled. They lift the 1st-innings model (test AUC 0.67 → 0.69); the chase is dominated by match state, so it stays state-only.

## API

| Endpoint | Description |
|---|---|
| `GET /api/match-centre?team1=&team2=&venue=&month=` | FotMob-style bundle: ratings, h2h, venue edge, toss advice |
| `POST /api/live` `{innings, batting_team, bowling_team, venue, over, runs, wkts, target}` | Live win probability + factors |
| `GET /api/live-curve` | Holdout accuracy by over (powers the UI chart) |
| `POST /api/toss` `{venue, month, season_year}` | Bat-first probability + recommendation + venue history |
| `GET /api/ratings`, `GET /api/venues` | Elo table, venue toss/win stats |
| `GET /api/insights/teams|toss` | SQL-backed aggregates (ex-SQL notebook, now live) |
| `GET /api/insights/h2h?team1=&team2=`, `GET /api/insights/form?team=` | Head-to-head, last-5 results |
| `GET /api/metrics` | Model metrics JSON |

## Project structure

```
├── web/src/               # React + Vite + Tailwind UI (MatchCentre, Live, Toss, Teams, Venues+Rankings, Model)
├── web/dist/              # production build (generated via npm run build, gitignored, served by FastAPI)
├── api/main.py            # FastAPI app (API + serves web/dist, fallback: frontend/)
├── src/                   # clean.py, features.py, live.py, train.py, predict.py (ML pipeline)
├── data/README.md         # ball-by-ball source + refresh (deliveries.csv gitignored)
├── frontend/              # legacy vanilla UI (fallback if web/dist missing)
├── notebooks/             # original exploratory analysis (archived)
├── tests/                 # 18 pytest tests (features + API + live model)
├── model/                 # generated artifacts (gitignored, via python -m src.train)
├── matches.csv            # 1,095 IPL matches, 2008–2024 (tracked)
├── screenshots/           # add demo captures here
└── Dockerfile             # multi-stage: node build + python serve
```

## Frontend development

```bash
cd web
npm install
npm run dev     # http://localhost:5173, /api proxied to FastAPI :8000
npm run build   # rebuild dist/ after UI changes
```

## Tests

```bash
python -m pytest tests/ -q   # 18 passed
```

## Future work

- Batter/bowler matchup features (e.g. current striker vs bowler history) for a stronger 1st-innings model.
- Over-by-over win-probability replay of classic matches.
- Serve logos locally in `frontend/logos/` if offline demo is required.

## Data & credits

Match data (`matches.csv`, 1,095 matches) + ball-by-ball data (`data/deliveries.csv`, 260,920 balls, same IDs — see `data/README.md` for source/refresh); team logos via the official IPL site CDN (`iplt20.com`, `icon-dark` set for the light theme) with offline badge fallback. Built for educational purposes.
