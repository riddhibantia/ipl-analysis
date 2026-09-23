import { useState } from "react";
import { api } from "../api";
import { FormPills, KV, Logo, pct1 } from "../ui";

export default function Teams({ meta, ratings }) {
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const max = Math.max(...ratings.map((r) => r.elo));
  const min = Math.min(...ratings.map((r) => r.elo));

  async function show(name) {
    setSel(name);
    const [f, p] = await Promise.all([
      api.form(name),
      fetch(`/api/teams/profile?name=${encodeURIComponent(name)}`).then((r) => r.json()),
    ]);
    setDetail({ name, recent: f.recent, profile: p.profile });
  }

  return (
    <>
      <div className="glass p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Teams</h2>
        <p className="micro-label mb-3 normal-case">Tap a team for strengths, weaknesses and phase splits.</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {meta.teams.map((t) => {
            const r = ratings.find((x) => x.name === t.name) || {};
            const w = r.elo ? Math.round(((r.elo - min) / (max - min)) * 100) : 0;
            return (
              <button key={t.name} onClick={() => show(t.name)}
                className={`rounded-2xl border bg-white/5 p-4 text-center transition hover:-translate-y-0.5 hover:border-white/25 ${sel === t.name ? "border-[#D8FF02]" : "border-white/10"}`}>
                <Logo team={t} size={60} />
                <h4 className="mt-2 text-[13px] font-semibold">{t.short}</h4>
                <div className="tnum text-xs text-white/50">Elo {r.elo || "–"}</div>
                <div className="my-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#D8FF02]" style={{ width: `${w}%` }} />
                </div>
                <div className="tnum text-xs text-white/50">{r.win_pct ? `${Math.round(r.win_pct * 100)}% wins` : ""}</div>
              </button>
            );
          })}
        </div>
      </div>
      {detail && <TeamDetail key={detail.name} detail={detail} />}
    </>
  );
}

const PHASE_LABEL = { powerplay: "Powerplay (0–5)", middle: "Middle (6–15)", death: "Death (16–19)" };

function TeamDetail({ detail }) {
  const { name, recent, profile: p } = detail;
  const pills = recent.map((r) => r.winner === name);
  const splits = [["Chase", p.chase_win_pct], ["Defence", p.defend_win_pct], ["Home", p.home_win_pct], ["Away", p.away_win_pct]];
  return (
    <div className="fade-in">
      <div className="glass mt-4 p-5 sm:p-6">
        <h3 className="micro-label mb-3">{name} — strengths & weaknesses</h3>
        {(p.strengths.length > 0 || p.weaknesses.length > 0) ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#D8FF02]/25 bg-[#D8FF02]/5 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D8FF02]">Strengths</div>
              {p.strengths.length ? p.strengths.map((s) => (
                <div key={s} className="mb-1.5 flex gap-2 text-sm"><span className="text-[#D8FF02]">▲</span><span>{s}</span></div>
              )) : <div className="text-sm text-white/50">No outlier traits.</div>}
            </div>
            <div className="rounded-2xl border border-[#88A1FF]/25 bg-[#88A1FF]/5 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#88A1FF]">Weaknesses</div>
              {p.weaknesses.length ? p.weaknesses.map((s) => (
                <div key={s} className="mb-1.5 flex gap-2 text-sm"><span className="text-[#88A1FF]">▼</span><span>{s}</span></div>
              )) : <div className="text-sm text-white/50">No outlier traits — balanced side.</div>}
            </div>
          </div>
        ) : <p className="text-sm text-white/50">Balanced side — no outlier traits vs league average.</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {splits.map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/5 p-3 text-center">
              <div className="micro-label">{l}</div>
              <div className="tnum text-lg font-semibold">{v == null ? "–" : pct1(v)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass mt-4 p-5 sm:p-6">
        <h3 className="micro-label mb-3">Phase splits · {p.matches} matches</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="micro-label mb-1">Batting run rate (SR {p.bat.sr})</div>
            {Object.entries(PHASE_LABEL).map(([k, l]) => (
              <PhaseBar key={k} label={l} value={p.bat.phases[k].rr} max={12} suffix=" rpo" bar="bg-[#D8FF02]" />
            ))}
          </div>
          <div>
            <div className="micro-label mb-1">Bowling economy (econ {p.bowl.econ})</div>
            {Object.entries(PHASE_LABEL).map(([k, l]) => (
              <PhaseBar key={k} label={l} value={p.bowl.phases[k].econ} max={13} suffix="" bar="bg-[#88A1FF]" />
            ))}
          </div>
        </div>
      </div>

      <div className="glass mt-4 p-5 sm:p-6">
        <h3 className="micro-label mb-3">{name} — form guide</h3>
        <p className="mb-2"><FormPills wins={pills} /></p>
        <KV k="2025–26 batting" v={`SR ${p.recent.bat.sr} · avg ${p.recent.bat.avg}`} />
        <KV k="2025–26 bowling" v={`econ ${p.recent.bowl.econ}`} />
      </div>
    </div>
  );
}

function PhaseBar({ label, value, max, suffix, bar }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[13px]"><span className="text-white/60">{label}</span><b className="tnum">{value}{suffix}</b></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`fill-in h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function rankCls(i) {
  return `tnum inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg text-xs font-semibold ${
    i < 3 ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/60"}`;
}

export function ShortPill({ r }) {
  return (
    <span className="mr-1 inline-block min-w-7 rounded-lg px-1.5 py-0.5 text-center text-xs font-semibold text-black"
      style={{ background: r.color === "#F9CD05" ? "#D8FF02" : r.color }}>
      {r.short}
    </span>
  );
}

export { pct1 };
