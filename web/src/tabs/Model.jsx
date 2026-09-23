import { useEffect, useState } from "react";
import { api } from "../api";
import { Card } from "../ui";

export default function Model() {
  const [m, setM] = useState(null);
  const [lm, setLm] = useState(null);
  useEffect(() => {
    api.metrics().then(setM).catch(() => {});
    api.liveCurve().then(setLm).catch(() => {});
  }, []);
  const cv = m ? Object.values(m.cv_auc).flat() : [];
  return (
    <Card>
      <h2 className="text-[17px] font-bold">Methodology</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
        <li>
          <b>Toss advisor (shipped):</b> calibrated logistic regression on venue + month + season.
          5-fold CV AUC <b>{m ? (cv.reduce((a, b) => a + b, 0) / cv.length).toFixed(2) : "…"}</b>;
          post-2021 holdout accuracy <b>{m ? `${Math.round(m.test.accuracy * 100)}%` : "…"}</b>.
        </li>
        <li>
          <b>Live win probability (shipped):</b> two logistic models on 47k innings-states from 295k balls,
          with chronological squad pools (career SR/avg/econ per player-team).
          Chase model test AUC <b>{lm ? lm.summary.innings_2.test_auc.toFixed(2) : "…"}</b>;
          1st-innings <b>{lm ? lm.summary.innings_1.test_auc.toFixed(2) : "…"}</b>.
          See Live Predictor tab for the accuracy-by-over curve.
        </li>
        <li>
          <b>Ratings:</b> Elo (K=24, home +30) updated chronologically, plus all-time win %, last-5 form,
          head-to-head and venue records — all leakage-free.
        </li>
        <li>
          <b>Win predictor (deliberately not shipped):</b> tested 3 models on 872 pre-2022 matches and held out
          2022–24. Accuracy stayed at 45–50% — the 2022 mega-auction reset squads and broke every historical
          feature (Elo alone: 39% in 2022). Pre-toss match-level prediction is a coin flip on this data.
        </li>
        <li>
          <b>Data:</b> 1,243 IPL matches (2008–2026), 295k balls. Squad pools use chronological career stats per (player, team).
        </li>
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        API: <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/match-centre</code> ·{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/live</code> ·{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/live-curve</code> ·{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/toss</code> ·{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/ratings</code> ·{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/venues</code> ·{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/insights/*</code> ·{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/metrics</code>
      </p>
    </Card>
  );
}
