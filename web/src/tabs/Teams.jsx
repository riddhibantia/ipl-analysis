import { useState } from "react";
import { api } from "../api";
import { Card, FormPills, Logo, pct1 } from "../ui";

export default function Teams({ meta, ratings }) {
  const [sel, setSel] = useState(null);
  const [recent, setRecent] = useState(null);
  const max = Math.max(...ratings.map((r) => r.elo));
  const min = Math.min(...ratings.map((r) => r.elo));

  async function show(name) {
    setSel(name);
    const f = await api.form(name);
    setRecent({ name, rows: f.recent });
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
      {recent && (
        <Card key={recent.name} className="fade-in">
          <h3 className="mb-3 border-l-4 border-[var(--color-accent)] pl-2.5 text-xs font-extrabold uppercase tracking-[1.1px] text-slate-500">
            {recent.name} — form guide
          </h3>
          <p className="mb-2">
            <FormPills wins={recent.rows.map((r) => r.winner === recent.name)} />
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 px-2 py-2.5">Date</th>
                  <th className="border-b border-slate-200 px-2 py-2.5">Fixture</th>
                  <th className="border-b border-slate-200 px-2 py-2.5">Venue</th>
                  <th className="border-b border-slate-200 px-2 py-2.5">Winner</th>
                </tr>
              </thead>
              <tbody>
                {recent.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-2 py-2.5">{r.date.slice(0, 10)}</td>
                    <td className="border-b border-slate-200 px-2 py-2.5">{r.team1} vs {r.team2}</td>
                    <td className="border-b border-slate-200 px-2 py-2.5">{r.venue}</td>
                    <td className="border-b border-slate-200 px-2 py-2.5"><b>{r.winner}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
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
