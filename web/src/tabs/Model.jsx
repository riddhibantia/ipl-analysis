import { useEffect, useState } from "react";
import { api } from "../api";

export default function Model() {
  const [m, setM] = useState(null);
  const [lm, setLm] = useState(null);
  useEffect(() => {
    api.metrics().then(setM).catch(() => {});
    api.liveCurve().then(setLm).catch(() => {});
  }, []);
  const cv = m ? Object.values(m.cv_auc).flat() : [];
  return (
    <div className="glass p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Methodology</h2>
      <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-white/70">
        <li><b className="text-white">Toss advisor (shipped):</b> calibrated logistic regression on venue + month + season.
          5-fold CV AUC <b className="text-white">{m ? (cv.reduce((a, b) => a + b, 0) / cv.length).toFixed(2) : "…"}</b>;
          post-2023 holdout accuracy <b className="text-white">{m ? `${Math.round(m.test.accuracy * 100)}%` : "…"}</b>.</li>
        <li><b className="text-white">Live win probability (shipped):</b> two logistic models on 47k innings-states from 295k balls,
          with chronological squad pools. Chase test AUC <b className="text-white">{lm ? lm.summary.innings_2.test_auc.toFixed(2) : "…"}</b>;
          1st-innings <b className="text-white">{lm ? lm.summary.innings_1.test_auc.toFixed(2) : "…"}</b>.</li>
        <li><b className="text-white">Ratings:</b> Elo (K=24, home +30) updated chronologically, plus all-time win %, last-5 form,
          head-to-head and venue records — all leakage-free.</li>
        <li><b className="text-white">Win predictor (deliberately not shipped):</b> 3 models on 872 pre-2022 matches held out
          against 2022–24 at 45–50% — the 2022 mega-auction broke every historical feature. Analytics instead of a fake predictor.</li>
        <li><b className="text-white">Data:</b> 1,243 IPL matches (2008–2026), 295k balls.</li>
      </ul>
      <p className="mt-3 text-xs text-white/40">
        API: <ApiCode p="/api/match-centre" /> · <ApiCode p="/api/live" /> · <ApiCode p="/api/live-curve" /> ·{" "}
        <ApiCode p="/api/toss" /> · <ApiCode p="/api/ratings" /> · <ApiCode p="/api/venues" /> ·{" "}
        <ApiCode p="/api/overview" /> · <ApiCode p="/api/players" /> · <ApiCode p="/api/matches" /> ·{" "}
        <ApiCode p="/api/analytics/pca" /> · <ApiCode p="/api/insights/*" /> · <ApiCode p="/api/metrics" />
      </p>
    </div>
  );
}

function ApiCode({ p }) {
  return <code className="rounded bg-white/10 px-1.5 py-0.5">{p}</code>;
}
