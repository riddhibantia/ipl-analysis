import { useEffect, useState } from "react";
import { api } from "../api";
import { StaggerItem, TeamBadge, brandOf } from "../ui";
import Live from "./Live";
import MatchCentre from "./MatchCentre";

const SUBS = [["results", "Results"], ["centre", "Match Centre"], ["live", "Live Predictor"]];

export default function Matches({ meta, season, query, sub, setSub }) {
  const [team, setTeam] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;
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
        {SUBS.map(([id, label]) => (
          <button key={id} onClick={() => switchSub(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              cur === id ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>
            {label}
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
