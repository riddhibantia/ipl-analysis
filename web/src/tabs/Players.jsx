import { useState } from "react";
import { Field } from "../ui";

const darkInput = "field-dark";

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
      <div className="glass p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Players</h2>
        <p className="micro-label mb-1 normal-case">Career and 2025–26 leaderboards: strike rates, averages, economies.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Discipline">
            <select className={darkInput} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="batting">Batting</option>
              <option value="bowling">Bowling</option>
            </select>
          </Field>
          <Field label="Era">
            <select className={darkInput} value={era} onChange={(e) => setEra(e.target.value)}>
              <option value="recent">2025–26 form</option>
              <option value="all">All-time career</option>
            </select>
          </Field>
          <Field label="Search player">
            <input className={darkInput} value={q} placeholder="e.g. Kohli"
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} />
          </Field>
        </div>
        <button onClick={run}
          className="mt-4 w-full rounded-full bg-[#D8FF02] p-3.5 text-[15px] font-semibold text-black hover:brightness-110">
          Show leaderboard
        </button>
      </div>
      {ran && rows && (
        <div className="glass mt-4 p-5 sm:p-6 fade-in">
          <h3 className="micro-label mb-3">
            {role === "batting" ? "Batting" : "Bowling"} · {era === "recent" ? "2025–26" : "career"} ({rows.length})
          </h3>
          {rows.length === 0
            ? <p className="micro-label">No data yet — try a different search.</p>
            : (role === "batting" ? <BatTable rows={rows} era={era} /> : <BowlTable rows={rows} era={era} />)}
        </div>
      )}
    </>
  );
}

function BatTable({ rows, era }) {
  const max = Math.max(1, ...rows.map((r) => r.runs));
  return (
    <div className="overflow-x-auto">
      <table className="dark-table">
        <thead><tr><th>#</th><th>Batter</th><th>Runs</th><th>SR</th>
          {era === "all" && <th>Avg</th>}{era === "all" && <th>50s/100s</th>}{era === "all" && <th>6s</th>}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.batter}>
              <td className="tnum">{i + 1}</td>
              <td><b>{r.batter}</b><div className="text-xs text-white/50">{(r.teams || []).slice(-2).join(" · ")}</div></td>
              <td style={{ minWidth: 130 }}>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#D8FF02]" style={{ width: `${Math.round((r.runs / max) * 100)}%` }} />
                </div><b className="tnum">{r.runs}</b>
              </td>
              <td><b className="tnum">{r.sr}</b></td>
              {era === "all" && <td className="tnum">{r.avg}</td>}
              {era === "all" && <td className="tnum">{r.fifties}/{r.hundreds}</td>}
              {era === "all" && <td className="tnum">{r.sixes}</td>}
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
      <table className="dark-table">
        <thead><tr><th>#</th><th>Bowler</th><th>Wkts</th><th>Econ</th>
          {era === "all" && <th>Avg</th>}{era === "all" && <th>Best</th>}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.bowler}>
              <td className="tnum">{i + 1}</td>
              <td><b>{r.bowler}</b><div className="text-xs text-white/50">{(r.teams || []).slice(-2).join(" · ")}</div></td>
              <td style={{ minWidth: 130 }}>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#88A1FF]" style={{ width: `${Math.round((r.wickets / max) * 100)}%` }} />
                </div><b className="tnum">{r.wickets}</b>
              </td>
              <td><b className="tnum">{r.econ}</b></td>
              {era === "all" && <td className="tnum">{r.avg}</td>}
              {era === "all" && <td className="tnum">{r.best_wkts}/{r.best_runs}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
