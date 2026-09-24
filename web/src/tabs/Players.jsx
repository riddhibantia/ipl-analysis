import { useEffect, useState } from "react";
import { api } from "../api";
import { Field, FormPills, Sparkline } from "../ui";

const darkInput = "field-dark";

export default function Players({ focusQ }) {
  const [role, setRole] = useState("batting");
  const [era, setEra] = useState("recent");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [ran, setRan] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (focusQ) {
      setQ(focusQ);
      runWith(focusQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusQ]);

  async function runWith(query) {
    setRan(true);
    setDetail(null);
    const r = await api.get(
      `/api/players?role=${role}&era=${era}&q=${encodeURIComponent(query)}&limit=100`
    );
    setRows(r.rows);
  }

  async function run() {
    runWith(q);
  }

  async function openDetail(name) {
    const d = await api.get(`/api/players/detail?name=${encodeURIComponent(name)}`);
    setDetail(d);
    window.scrollTo({ top: document.body.scrollHeight });
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
            : (role === "batting" ? <BatTable rows={rows} era={era} open={openDetail} /> : <BowlTable rows={rows} era={era} open={openDetail} />)}
        </div>
      )}
      {detail && <PlayerDetail key={detail.player} d={detail} close={() => setDetail(null)} />}
      <MatchupLab />
    </>
  );
}

function MatchupLab() {
  const [top, setTop] = useState([]);
  const [batter, setBatter] = useState("V Kohli");
  const [bowler, setBowler] = useState("JJ Bumrah");
  const [duel, setDuel] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api.get("/api/matchups/top?min_balls=100&limit=8").then((d) => setTop(d.rows || [])).catch(() => {});
  }, []);

  async function run() {
    setErr(null);
    try {
      setDuel(await api.get(`/api/matchups/duel?batter=${encodeURIComponent(batter)}&bowler=${encodeURIComponent(bowler)}`));
    } catch (e) {
      setErr("No balls found for this duel — check the spelling.");
      setDuel(null);
    }
  }

  return (
    <div className="glass mt-4 p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Matchup Lab</h2>
      <p className="micro-label mb-1 normal-case">Batter vs bowler, ball by ball. Biggest rivalries first.</p>
      {top.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {top.map((r) => (
            <button key={`${r.batter}${r.bowler}`} onClick={() => { setBatter(r.batter); setBowler(r.bowler); }}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:border-[#D8FF02]">
              {shortNm(r.batter)} vs {shortNm(r.bowler)} <span className="tnum text-white/50">· {r.balls} balls</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Batter">
          <input className="field-dark" value={batter} onChange={(e) => setBatter(e.target.value)} />
        </Field>
        <Field label="Bowler">
          <input className="field-dark" value={bowler} onChange={(e) => setBowler(e.target.value)} />
        </Field>
        <button onClick={run} className="rounded-full bg-[#D8FF02] px-6 py-2.5 text-sm font-semibold text-black">
          Face off
        </button>
      </div>
      {err && <p className="micro-label mt-2">{err}</p>}
      {duel && (
        <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 p-4 fade-in">
          <div className="grid grid-cols-4 gap-2 text-center">
            <MiniStat label="Balls" value={duel.balls} />
            <MiniStat label="Runs" value={duel.runs} />
            <MiniStat label="Dismissals" value={duel.outs} />
            <MiniStat label="SR" value={duel.balls ? (100 * duel.runs / duel.balls).toFixed(1) : "–"} />
          </div>
          <div className="mt-3">
            <p className="micro-label mb-1">Runs by season</p>
            <Sparkline values={duel.by_season.map((s) => s.runs)}
              labels={duel.by_season.map((s) => s.season)} color="#D8FF02" />
          </div>
          <div className="mt-2 space-y-1">
            {duel.meetings.slice(0, 4).map((m) => (
              <div key={m.match_id} className="flex justify-between text-[13px]">
                <span className="text-white/50">{m.date} · {m.venue?.split(",")[0]}</span>
                <b className="tnum">{m.runs} off {m.balls}{m.out ? " · out" : ""}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-black/30 p-2.5">
      <div className="tnum text-lg font-semibold">{value}</div>
      <div className="micro-label">{label}</div>
    </div>
  );
}

function shortNm(n) {
  const p = (n || "").split(" ");
  return p.length > 1 ? `${p[0][0]} ${p[p.length - 1]}` : n;
}

function PlayerDetail({ d, close }) {
  const isBat = d.career_runs > 0;
  const series = d.series.map((s) => (isBat ? s.runs : s.wickets));
  const labels = d.series.map((s) => s.season);
  return (
    <div className="glass mt-4 p-5 sm:p-6 fade-in">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="micro-label">{d.player}</h3>
        <button onClick={close} aria-label="Close player profile" className="text-white/40 hover:text-white">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox label="Matches" value={d.matches_batted + d.matches_bowled} />
        <StatBox label="POTM awards" value={d.potm} />
        <StatBox label={isBat ? "Career runs" : "Career wkts"} value={isBat ? d.career_runs : d.career_wickets} />
      </div>
      <h4 className="micro-label mb-1 mt-4">{isBat ? "Runs by season" : "Wickets by season"}</h4>
      <Sparkline values={series} labels={labels} color={isBat ? "#D8FF02" : "#88A1FF"} height={72} />
      <p className="micro-label mt-2 normal-case">Teams: {d.teams.join(" · ")}</p>
      {d.last5_scores.length > 0 && (
        <p className="mt-2"><span className="micro-label mr-2">Last 5 innings</span>
          <FormPills wins={d.last5_scores.map((s) => s >= 30)} /></p>
      )}
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <div className="tnum text-xl font-semibold">{value}</div>
      <div className="micro-label mt-0.5">{label}</div>
    </div>
  );
}

function BatTable({ rows, era, open }) {
  const max = Math.max(1, ...rows.map((r) => r.runs));
  return (
    <div className="overflow-x-auto">
      <table className="dark-table">
        <thead><tr><th>#</th><th>Batter</th><th>Runs</th><th>SR</th>
          {era === "all" && <th>Avg</th>}{era === "all" && <th>50s/100s</th>}{era === "all" && <th>6s</th>}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.batter} onClick={() => open(r.batter)} className="cursor-pointer">
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

function BowlTable({ rows, era, open }) {
  const max = Math.max(1, ...rows.map((r) => r.wickets));
  return (
    <div className="overflow-x-auto">
      <table className="dark-table">
        <thead><tr><th>#</th><th>Bowler</th><th>Wkts</th><th>Econ</th>
          {era === "all" && <th>Avg</th>}{era === "all" && <th>Best</th>}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.bowler} onClick={() => open(r.bowler)} className="cursor-pointer">
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
