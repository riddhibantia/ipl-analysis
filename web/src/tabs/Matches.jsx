import { useEffect, useState } from "react";
import { TeamBadge, brandOf } from "../ui";
import Live from "./Live";
import MatchCentre from "./MatchCentre";

const SUBS = [["results", "Results"], ["centre", "Match Centre"], ["live", "Live Predictor"]];

export default function Matches({ meta, season, query }) {
  const [sub, setSub] = useState("results");
  const [team, setTeam] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;

  useEffect(() => { setOffset(0); }, [season, team, query]);

  useEffect(() => {
    if (sub !== "results") return;
    const p = new URLSearchParams({ limit: LIMIT, offset });
    if (season) p.set("season", season);
    if (team) p.set("team", team);
    if (query) p.set("q", query);
    fetch(`/api/matches?${p}`).then((r) => r.json()).then((m) => {
      setRows(offset === 0 ? m.rows : (prev) => [...prev, ...m.rows]);
      setTotal(m.total);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, season, team, query, offset]);

  const teams = meta.teams.map((t) => t.name);
  return (
    <>
      <div className="mb-4 flex gap-1.5">
        {SUBS.map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              sub === id ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === "centre" && <MatchCentre meta={meta} />}
      {sub === "live" && <Live meta={meta} />}
      {sub === "results" && (
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
            {rows.map((m) => {
              const w = [m.team1, m.team2].find((t) => t.name === m.winner);
              const wcolor = w ? brandOf(w) : "transparent";
              return (
                <div key={m.id}
                  className="glass glass-hover flex items-center gap-3 p-3.5 pl-4"
                  style={{ borderLeft: `3px solid ${wcolor}` }}>
                  <TeamBadge team={m.team1} size={38} />
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
                  <TeamBadge team={m.team2} size={38} />
                </div>
              );
            })}
          </div>
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
