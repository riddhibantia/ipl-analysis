import { useState } from "react";
import { Card, Field, inputCls } from "../ui";

export default function Players() {
  const [role, setRole] = useState("batting");
  const [era, setEra] = useState("recent");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [ran, setRan] = useState(false);

  async function run() {
    setRan(true);
    const r = await fetch(
      `/api/players?role=${role}&era=${era}&q=${encodeURIComponent(q)}&limit=100`
    ).then((x) => x.json());
    setRows(r.rows);
  }

  return (
    <>
      <Card>
        <h2 className="text-[17px] font-bold">Players</h2>
        <p className="mb-1 text-[13px] text-slate-500">
          Career and 2025–26 leaderboards: strike rates, averages, economies.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Discipline">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="batting">Batting</option>
              <option value="bowling">Bowling</option>
            </select>
          </Field>
          <Field label="Era">
            <select className={inputCls} value={era} onChange={(e) => setEra(e.target.value)}>
              <option value="recent">2025–26 form</option>
              <option value="all">All-time career</option>
            </select>
          </Field>
          <Field label="Search player">
            <input className={inputCls} value={q} placeholder="e.g. Kohli"
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} />
          </Field>
        </div>
        <button onClick={run}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent2)] p-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-blue-600/25 hover:brightness-110">
          Show leaderboard
        </button>
      </Card>
      {ran && rows && (
        <Card className="fade-in">
          <h3 className="mb-3 border-l-4 border-[var(--color-accent)] pl-2.5 text-xs font-extrabold uppercase tracking-[1.1px] text-slate-500">
            {role === "batting" ? "Batting" : "Bowling"} · {era === "recent" ? "2025–26" : "career"} ({rows.length})
          </h3>
          {role === "batting" ? <BatTable rows={rows} era={era} /> : <BowlTable rows={rows} era={era} />}
        </Card>
      )}
    </>
  );
}

function BatTable({ rows, era }) {
  const max = Math.max(1, ...rows.map((r) => r.runs));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11.5px] uppercase tracking-wide text-slate-500">
          <th className="px-2 py-2.5">#</th><th className="px-2 py-2.5">Batter</th>
          <th className="px-2 py-2.5">Runs</th><th className="px-2 py-2.5">SR</th>
          {era === "all" && <th className="px-2 py-2.5">Avg</th>}
          {era === "all" && <th className="px-2 py-2.5">50s/100s</th>}
          {era === "all" && <th className="px-2 py-2.5">6s</th>}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.batter} className="hover:bg-slate-50">
              <td className="border-b border-slate-200 px-2 py-2.5 tnum">{i + 1}</td>
              <td className="border-b border-slate-200 px-2 py-2.5"><b>{r.batter}</b>
                <div className="text-xs text-slate-500">{(r.teams || []).slice(-2).join(" · ")}</div></td>
              <td className="border-b border-slate-200 px-2 py-2.5" style={{ minWidth: 130 }}>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${Math.round((r.runs / max) * 100)}%` }} />
                </div><b className="tnum">{r.runs}</b>
              </td>
              <td className="border-b border-slate-200 px-2 py-2.5"><b className="tnum">{r.sr}</b></td>
              {era === "all" && <td className="border-b border-slate-200 px-2 py-2.5 tnum">{r.avg}</td>}
              {era === "all" && <td className="border-b border-slate-200 px-2 py-2.5 tnum">{r.fifties}/{r.hundreds}</td>}
              {era === "all" && <td className="border-b border-slate-200 px-2 py-2.5 tnum">{r.sixes}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BowlTable({ rows, era }) {
  const max = Math.max(1, ...rows.map((r) => r.wickets));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11.5px] uppercase tracking-wide text-slate-500">
          <th className="px-2 py-2.5">#</th><th className="px-2 py-2.5">Bowler</th>
          <th className="px-2 py-2.5">Wkts</th><th className="px-2 py-2.5">Econ</th>
          {era === "all" && <th className="px-2 py-2.5">Avg</th>}
          {era === "all" && <th className="px-2 py-2.5">Best</th>}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.bowler} className="hover:bg-slate-50">
              <td className="border-b border-slate-200 px-2 py-2.5 tnum">{i + 1}</td>
              <td className="border-b border-slate-200 px-2 py-2.5"><b>{r.bowler}</b>
                <div className="text-xs text-slate-500">{(r.teams || []).slice(-2).join(" · ")}</div></td>
              <td className="border-b border-slate-200 px-2 py-2.5" style={{ minWidth: 130 }}>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-700"
                    style={{ width: `${Math.round((r.wickets / max) * 100)}%` }} />
                </div><b className="tnum">{r.wickets}</b>
              </td>
              <td className="border-b border-slate-200 px-2 py-2.5"><b className="tnum">{r.econ}</b></td>
              {era === "all" && <td className="border-b border-slate-200 px-2 py-2.5 tnum">{r.avg}</td>}
              {era === "all" && <td className="border-b border-slate-200 px-2 py-2.5 tnum">{r.best_wkts}/{r.best_runs}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
