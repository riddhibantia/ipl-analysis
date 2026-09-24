import { useEffect, useState } from "react";
import { api } from "../api";
import { PopoverBadge, PulseDot, StaggerItem, brandOf } from "../ui";import Live from "./Live";
import MatchCentre from "./MatchCentre";

const SUBS = [["results", "Results", false], ["centre", "Match Centre", false], ["live", "Live Predictor", true]];

export default function Matches({ meta, season, query, sub, setSub }) {
  const [team, setTeam] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;
  const [expanded, setExpanded] = useState(null);
  const [timelines, setTimelines] = useState({});

  async function toggleTimeline(id) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!timelines[id]) {
      try {
        const t = await api.get(`/api/matches/${id}/timeline`);
        setTimelines((prev) => ({ ...prev, [id]: t }));
      } catch {
        /* offline-safe: row stays collapsed content-free */
      }
    }
  }
  const cur = ["results", "centre", "live"].includes(sub) ? sub : "results";
  const switchSub = (id) => { setSub(id === "results" ? "" : id); };

  useEffect(() => { setOffset(0); }, [season, team, query]);

  useEffect(() => {
    if (cur !== "results") return;
    const p = new URLSearchParams({ limit: LIMIT, offset });
    if (season) p.set("season", season);
    if (team) p.set("team", team);
    if (query) p.set("q", query);
    api.get(`/api/matches?${p}`).then((m) => {
      setRows(offset === 0 ? m.rows : (prev) => [...prev, ...m.rows]);
      setTotal(m.total);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, season, team, query, offset]);

  const teams = meta.teams.map((t) => t.name);
  return (
    <>
      <div className="mb-4 flex gap-1.5">
        {SUBS.map(([id, label, live]) => (
          <button key={id} onClick={() => switchSub(id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition ${
              cur === id ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>
            {live && <PulseDot />}{label}
          </button>
        ))}
      </div>
      {cur === "centre" && <MatchCentre meta={meta} />}
      {cur === "live" && <Live meta={meta} />}
      {cur === "results" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={team} onChange={(e) => setTeam(e.target.value)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium [&>option]:bg-[#0B1830]">
              <option value="">All teams</option>
              {teams.map((t) => <option key={t}>{t}</option>)}
            </select>
            <span className="micro-label">{total} matches{query ? ` · “${query}”` : ""}</span>
          </div>
          <div className="space-y-2">
            {rows.map((m, i) => {
              const w = [m.team1, m.team2].find((t) => t.name === m.winner);
              const wcolor = w ? brandOf(w) : "transparent";
              return (
                <StaggerItem key={m.id} index={i}>
                <div
                  className="glass glass-hover p-3.5 pl-4"
                  style={{ borderLeft: `3px solid ${wcolor}` }}>
                  <button onClick={() => toggleTimeline(m.id)} aria-expanded={expanded === m.id}
                    aria-label={`Replay ${m.team1.short} vs ${m.team2.short}`}
                    className="flex w-full items-center gap-3 text-left">
                    <PopoverBadge team={m.team1} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {m.team1.short} <span className="text-white/40">vs</span> {m.team2.short}
                        <span className="micro-label ml-2">S{m.season} · {m.date}</span>
                      </div>
                      <div className="truncate text-xs text-white/50">{m.venue}{m.player_of_match ? ` · ★ ${m.player_of_match}` : ""}</div>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      m.winner ? "bg-[#D8FF02] text-black" : "bg-white/15 text-white/70"}`}>
                      {m.winner ? m.result.replace(m.winner, shortOf(m.winner, m)) : m.result}
                    </span>
                    <PopoverBadge team={m.team2} size={38} />
                    <span className="text-white/40">{expanded === m.id ? "▾" : "▸"}</span>
                  </button>
                  {expanded === m.id && (
                    timelines[m.id]
                      ? <Replay data={timelines[m.id]} />
                      : <p className="micro-label mt-2">Loading replay…</p>
                  )}
                </div>
                </StaggerItem>
              );
            })}
          </div>
          {rows.length === 0 && (
            <div className="glass mt-2 p-8 text-center">
              <p className="font-semibold">No matches found</p>
              <p className="micro-label mt-1 normal-case">Try a different season, team or search.</p>
            </div>
          )}
          {rows.length < total && (
            <button onClick={() => setOffset(offset + LIMIT)}
              className="mt-4 w-full rounded-full border border-white/15 bg-white/5 p-3 text-sm font-medium hover:border-white/30">
              Load more ({rows.length}/{total})
            </button>
          )}
        </>
      )}
    </>
  );
}

function shortOf(winner, m) {
  for (const t of [m.team1, m.team2]) if (t.name === winner) return t.short;
  return winner;
}

function Replay({ data }) {
  const [inn, setInn] = useState("1");
  const innings = data.innings || {};
  const cur = innings[inn] || innings["1"];
  if (!cur) return <p className="micro-label mt-2">No ball data for this match.</p>;
  const W = 560, H = 120, PAD = 8;
  const maxRuns = Math.max(6, ...cur.overs.map((o) => o.runs));
  const maxCum = Math.max(10, ...cur.overs.map((o) => acc(o, cur.overs)));
  function acc(o, overs) {
    let s = 0;
    for (const x of overs) {
      s += x.runs;
      if (x === o) break;
    }
    return s;
  }
  const bw = (W - PAD * 2) / Math.max(cur.overs.length, 1);
  const probs = cur.overs.map((o) => o.prob_bat).filter((p) => p != null);
  return (
    <div className="mt-3 border-t border-white/10 pt-3 fade-in">
      <div className="mb-2 flex gap-1.5">
        {Object.keys(innings).map((k) => (
          <button key={k} onClick={() => setInn(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              inn === k ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/70"}`}>
            {k === "1" ? "1st innings" : "Chase"} · {innings[k].team.split(" ").map((w) => w[0]).join("")} {innings[k].total}/{innings[k].wickets}
          </button>
        ))}
      </div>
      {/* Manhattan: runs per over, dots = wickets */}
      <p className="micro-label mb-1">Manhattan — runs per over (● wicket)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Runs per over chart">
        {cur.overs.map((o, i) => {
          const h = Math.max(3, (o.runs / maxRuns) * (H - 30));
          return (
            <g key={o.over}>
              <rect x={PAD + i * bw + 1} y={H - 14 - h} width={Math.max(2, bw - 3)} height={h}
                rx="2" fill={o.wkts > 0 ? "#88A1FF" : "#D8FF02"} opacity={o.wkts > 0 ? 0.85 : 0.9}>
                <title>Over {o.over}: {o.runs} runs{o.wkts ? `, ${o.wkts} wkt` : ""}</title>
              </rect>
              {o.wkts > 0 && (
                <circle cx={PAD + i * bw + bw / 2} cy={H - 18 - h} r="3.5" fill="#fff">
                  <title>{o.wkts} wicket(s)</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      {/* Worm: cumulative */}
      <p className="micro-label mb-1 mt-2">Worm — cumulative score</p>
      <svg viewBox={`0 0 ${W} 90`} className="w-full" role="img" aria-label="Cumulative score chart">
        <polyline
          points={cur.overs.map((o, i) => `${PAD + (i / Math.max(cur.overs.length - 1, 1)) * (W - PAD * 2)},${84 - (acc(o, cur.overs) / maxCum) * 72}`).join(" ")}
          fill="none" stroke="#D8FF02" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {/* Win probability */}
      {probs.length > 1 && (
        <>
          <p className="micro-label mb-1 mt-2">Win probability — batting side</p>
          <svg viewBox={`0 0 ${W} 90`} className="w-full" role="img" aria-label="Win probability chart">
            <line x1={PAD} x2={W - PAD} y1={44} y2={44} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <polyline
              points={cur.overs.filter((o) => o.prob_bat != null).map((o, i, arr) => `${PAD + (o.over / 20) * (W - PAD * 2)},${80 - o.prob_bat * 68}`).join(" ")}
              fill="none" stroke="#88A1FF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </>
      )}
    </div>
  );
}
