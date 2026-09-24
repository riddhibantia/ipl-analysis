import { Suspense, lazy, useEffect, useState } from "react";
import { MONTHS, api } from "../api";
import { Field, KV, PrimaryButton, pct1 } from "../ui";

const PCAView = lazy(() => import("./PCAView"));

const SUBS = [["pca", "PCA"], ["toss", "Toss Impact"], ["model", "Win Model"]];
const darkInput = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-[#D8FF02] focus:outline-none [&>option]:bg-[#0B1830]";

export default function Analytics({ meta, sub, setSub }) {
  const cur = ["pca", "toss", "model"].includes(sub) ? sub : "pca";
  const switchSub = (id) => setSub(id === "pca" ? "" : id);
  return (
    <>
      <div className="mb-4 flex gap-1.5">
        {SUBS.map(([id, label]) => (
          <button key={id} onClick={() => switchSub(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              cur === id ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>
            {label}
          </button>
        ))}
      </div>
      {cur === "pca" && (
        <Suspense fallback={<p className="micro-label">Loading charts…</p>}>
          <PCAView />
        </Suspense>
      )}
      {cur === "toss" && <TossImpact meta={meta} />}
      {cur === "model" && <WinModel />}
    </>
  );
}

function TossImpact({ meta }) {
  const [venue, setVenue] = useState("M Chinnaswamy Stadium, Bengaluru");
  const [month, setMonth] = useState("4");
  const [data, setData] = useState(null);
  const [heat, setHeat] = useState(null);
  useEffect(() => {
    api.get("/api/analytics/toss-heatmap?top=8").then(setHeat).catch(() => {});
  }, []);

  async function run() {
    setData(await api.toss({ venue, month: +month, season_year: 2026 }));
  }

  return (
    <>
      <div className="glass p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Toss Lab</h2>
        <p className="micro-label mb-1 normal-case">What does the captain do after winning the toss here? Model: venue + month + season.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Venue">
            <select className={darkInput} value={venue} onChange={(e) => setVenue(e.target.value)}>
              {meta.venues.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Month">
            <select className={darkInput} value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
        <PrimaryButton onClick={run}>Get toss advice</PrimaryButton>
      </div>
      {data && (
        <div key={data.venue} className="glass mt-4 p-5 sm:p-6 fade-in">
          <h3 className="micro-label mb-3">{data.venue}</h3>
          <div className="flex items-center gap-3.5 rounded-[20px] border border-[#D8FF02]/30 bg-[#D8FF02]/5 p-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#D8FF02] text-lg font-semibold text-black">T</div>
            <div className="min-w-0 flex-1 text-[15px]">
              <b>{data.recommendation}</b>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#D8FF02]"
                  style={{ width: `${data.recommendation.startsWith("bat") ? data.p_bat_first * 100 : data.p_bowl_first * 100}%` }} />
              </div>
              <span className="micro-label">
                Bat first {Math.round(data.p_bat_first * 100)}% · Bowl first {Math.round(data.p_bowl_first * 100)}%
              </span>
            </div>
          </div>
          {data.venue_history && (
            <div className="mt-2">
              <KV k="Matches analysed" v={data.venue_history.matches} />
              <KV k="Captains batting first" v={pct1(data.venue_history.bat_first_pct)} />
              <KV k="Toss winners winning match" v={pct1(data.venue_history.toss_win_match_win_pct)} />
            </div>
          )}
        </div>
      )}
      <div className="glass mt-4 p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Venue × decision heatmap</h3>
        <p className="micro-label mb-3 normal-case">Toss-winner match conversion. Lime ≥55%, periwinkle 45–55%.</p>
        {heat ? (
          <div className="overflow-x-auto">
            <table className="dark-table min-w-[520px]">
              <thead><tr><th>Venue</th><th>Bat first</th><th>Field first</th><th>Matches</th></tr></thead>
              <tbody>
                {heat.rows.map((r) => (
                  <tr key={r.venue}>
                    <td className="max-w-[260px] truncate">{r.venue}</td>
                    <HeatCell c={r.bat} />
                    <HeatCell c={r.field} />
                    <td className="tnum">{r.matches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="micro-label">Loading…</p>}
      </div>
    </>
  );
}

function HeatCell({ c }) {
  const bg = c.pct == null ? "rgba(255,255,255,0.06)"
    : c.pct >= 0.55 ? "rgba(216,255,2,0.22)"
    : c.pct >= 0.45 ? "rgba(136,161,255,0.2)" : "rgba(224,36,36,0.2)";
  const fg = c.pct == null ? "rgba(255,255,255,0.35)"
    : c.pct >= 0.55 ? "#D8FF02" : c.pct >= 0.45 ? "#88A1FF" : "#f87171";
  return (
    <td title={`n=${c.n}`}>
      <span className="tnum inline-block min-w-[86px] rounded-lg px-2 py-1 text-center text-[13px] font-semibold"
        style={{ background: bg, color: fg }}>
        {c.pct == null ? "No data yet" : `${Math.round(c.pct * 100)}% · ${c.n}`}
      </span>
    </td>
  );
}

function WinModel() {
  const [m, setM] = useState(null);
  const [lm, setLm] = useState(null);
  useEffect(() => {
    api.metrics().then(setM).catch(() => {});
    api.liveCurve().then(setLm).catch(() => {});
  }, []);
  const cv = m ? Object.values(m.cv_auc).flat() : [];
  const guide = [
    ["Overview", "Season pulse, head-to-head, toss heatmap, season record."],
    ["Matches", "Results explorer, plus Match Centre and Live Predictor tabs."],
    ["Teams", "Strengths, weaknesses, phase splits, chase/defence records."],
    ["Players", "Batting and bowling leaderboards, career or 2025–26, search."],
    ["Venues", "Bat-first tendency and toss-to-win conversion per ground."],
    ["Analytics", "PCA scatter, toss lab, and this methodology."],
    ["Rankings", "Victory tally, all-time or per season."],
    ["Insights", "Toss-impact findings and venue heatmap."],
  ];
  return (
    <>
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
            against 2022–24 at 45–50% — the 2022 mega-auction broke every historical feature.</li>
          <li><b className="text-white">Data:</b> 1,243 IPL matches (2008–2026), 295k balls.</li>
        </ul>
        <p className="mt-3 text-xs text-white/40">
          API: <code className="rounded bg-white/10 px-1.5 py-0.5">/api/match-centre</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/live</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/live-curve</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/toss</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/ratings</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/venues</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/overview</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/players</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/matches</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/analytics/pca</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/insights/*</code> ·{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/api/metrics</code>
        </p>
      </div>
      <div className="glass mt-4 p-5 sm:p-6">
        <h3 className="text-lg font-semibold">What lives where</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {guide.map(([t, s]) => (
            <div key={t} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <b className="text-sm">{t}</b>
              <p className="mt-1 text-[13px] text-white/60">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
