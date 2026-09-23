import { useState } from "react";
import { api } from "../api";
import { Card, FormPills, KV, Logo, pct1 } from "../ui";

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
    setDetail({ name, recent: f.recent, profile: p.profile, meta: p.meta });
  }

  return (
    <>
      <Card>
        <h2 className="text-[17px] font-bold">Teams</h2>
        <p className="mb-1 text-[13px] text-slate-500">Tap a team for recent form.</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {meta.teams.map((t) => {
            const r = ratings.find((x) => x.name === t.name) || {};
            const w = r.elo ? Math.round(((r.elo - min) / (max - min)) * 100) : 0;
            return (
              <button key={t.name} onClick={() => show(t.name)}
                className={`rounded-2xl border bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-accent)] ${sel === t.name ? "border-2 border-[var(--color-accent)]" : "border-slate-200"}`}>
                <Logo team={t} size={66} />
                <h4 className="mt-2 text-[13px] font-bold">{t.short}</h4>
                <div className="tnum text-xs text-slate-500">Elo {r.elo || "–"}</div>
                <div className="my-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent2)]" style={{ width: `${w}%` }} />
                </div>
                <div className="tnum text-xs text-slate-500">{r.win_pct ? `${Math.round(r.win_pct * 100)}% all-time wins` : ""}</div>
              </button>
            );
          })}
        </div>
      </Card>
      {detail && <TeamDetail key={detail.name} detail={detail} />}
    </>
  );
}

const PHASE_LABEL = { powerplay: "Powerplay (0–5)", middle: "Middle (6–15)", death: "Death (16–19)" };

function TeamDetail({ detail }) {
  const { name, recent, profile: p } = detail;
  const pills = recent.map((r) => r.winner === name);
  const splits = [
    ["Chase", p.chase_win_pct], ["Defence", p.defend_win_pct],
    ["Home", p.home_win_pct], ["Away", p.away_win_pct],
  ];
  return (
    <div className="fade-in">
      <Card>
        <h3 className="mb-3 border-l-4 border-[var(--color-accent)] pl-2.5 text-xs font-extrabold uppercase tracking-[1.1px] text-slate-500">
          {name} — strengths & weaknesses
        </h3>
        {(p.strengths.length > 0 || p.weaknesses.length > 0) ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-3.5">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-emerald-700">Strengths</div>
              {p.strengths.length ? p.strengths.map((s) => (
                <div key={s} className="mb-1.5 flex gap-2 text-sm"><span className="text-emerald-600">▲</span><span>{s}</span></div>
              )) : <div className="text-sm text-slate-500">No outlier traits.</div>}
            </div>
            <div className="rounded-xl bg-red-50 p-3.5">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-red-700">Weaknesses</div>
              {p.weaknesses.length ? p.weaknesses.map((s) => (
                <div key={s} className="mb-1.5 flex gap-2 text-sm"><span className="text-red-500">▼</span><span>{s}</span></div>
              )) : <div className="text-sm text-slate-500">No outlier traits — balanced side.</div>}
            </div>
          </div>
        ) : <p className="text-sm text-slate-500">Balanced side — no outlier traits vs league average.</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {splits.map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{l}</div>
              <div className="tnum text-lg font-extrabold">{v == null ? "–" : pct1(v)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 border-l-4 border-[var(--color-accent)] pl-2.5 text-xs font-extrabold uppercase tracking-[1.1px] text-slate-500">
          Phase splits · {p.matches} matches
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Batting run rate (SR {p.bat.sr})</div>
            {Object.entries(PHASE_LABEL).map(([k, l]) => (
              <PhaseBar key={k} label={l} value={p.bat.phases[k].rr} max={12} suffix=" rpo" />
            ))}
          </div>
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Bowling economy (econ {p.bowl.econ})</div>
            {Object.entries(PHASE_LABEL).map(([k, l]) => (
              <PhaseBar key={k} label={l} value={p.bowl.phases[k].econ} max={13} suffix="" inv />
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 border-l-4 border-[var(--color-accent)] pl-2.5 text-xs font-extrabold uppercase tracking-[1.1px] text-slate-500">
          {name} — form guide
        </h3>
        <p className="mb-2"><FormPills wins={pills} /></p>
        <KV k="2025–26 batting" v={`SR ${p.recent.bat.sr} · avg ${p.recent.bat.avg}`} />
        <KV k="2025–26 bowling" v={`econ ${p.recent.bowl.econ}`} />
      </Card>
    </div>
  );
}

function PhaseBar({ label, value, max, suffix, inv }) {  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[13px]"><span className="text-slate-600">{label}</span><b className="tnum">{value}{suffix}</b></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${inv ? "bg-gradient-to-r from-violet-500 to-purple-700" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function rankCls(i) {
  return `inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg text-xs font-extrabold ${
    i < 3 ? "bg-slate-900 text-[var(--color-gold)]" : "bg-slate-100"
  }`;
}

export function ShortPill({ r }) {
  return (
    <span className="mr-1 inline-block min-w-7 rounded-lg px-1.5 py-0.5 text-center text-xs font-extrabold text-white" style={{ background: r.color }}>
      {r.short}
    </span>
  );
}

export { pct1 };
