import { useEffect, useMemo, useRef, useState } from "react";
import { TeamBadge } from "./ui";

const QUICK = [
  ["matches", "live", "🔮", "Predict a Match"],
  ["matches", "centre", "⚔️", "Compare Teams"],
  ["venues", "", "🗺️", "Explore Venues"],
  ["analytics", "", "🧠", "Analytics Lab"],
  ["rankings", "", "🏆", "Rankings"],
  ["insights", "", "🎯", "Toss Insights"],
];

function fuzzy(hay, needle) {
  hay = hay.toLowerCase();
  needle = needle.toLowerCase().trim();
  if (!needle) return true;
  let j = 0;
  for (const ch of hay) {
    if (ch === needle[j]) j++;
    if (j === needle.length) return true;
  }
  return false;
}

export default function Palette({ meta, onNav, onClose }) {
  const [q, setQ] = useState("");
  const [names, setNames] = useState({ batters: [], bowlers: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    Promise.all([
      fetch("/api/players?role=batting&era=all&limit=100").then((r) => r.json()).catch(() => ({ rows: [] })),
      fetch("/api/players?role=bowling&era=all&limit=100").then((r) => r.json()).catch(() => ({ rows: [] })),
    ]).then(([b, w]) => setNames({
      batters: (b.rows || []).map((r) => r.batter),
      bowlers: (w.rows || []).map((r) => r.bowler),
    }));
  }, []);

  const results = useMemo(() => {
    const out = [];
    if (!q.trim()) {
      QUICK.forEach(([tab, sub, icon, label]) =>
        out.push({ kind: "action", label, icon, run: () => onNav(tab, sub) }));
      return out;
    }
    meta.teams.filter((t) => fuzzy(t.name, q) || fuzzy(t.short, q)).slice(0, 4)
      .forEach((t) => out.push({ kind: "team", label: t.name, team: t, run: () => onNav("teams", "", { team: t.name }) }));
    [...new Set([...names.batters, ...names.bowlers])].filter((n) => fuzzy(n, q)).slice(0, 5)
      .forEach((n) => out.push({ kind: "player", label: n, run: () => onNav("players", "", { player: n }) }));
    meta.venues.filter((v) => fuzzy(v, q)).slice(0, 3)
      .forEach((v) => out.push({ kind: "venue", label: v, run: () => onNav("venues") }));
    out.push({ kind: "search", label: `Search matches for “${q.trim()}”`, run: () => onNav("matches", "", { q: q.trim() }) });
    return out;
  }, [q, meta, names, onNav]);

  useEffect(() => setActive(0), [q]);

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) { results[active].run(); }
  }

  const groups = ["action", "team", "player", "venue", "search"];
  const titles = { action: "Jump to", team: "Teams", player: "Players", venue: "Venues", search: "Matches" };
  let idx = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh]"
      onClick={onClose} role="dialog" aria-label="Command palette">
      <div className="glass w-full max-w-xl !rounded-2xl p-2 fade-in" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Search teams, players, venues, matches…"
          aria-label="Search everything"
          className="w-full rounded-xl bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-white/40" />
        <div className="max-h-[50vh] overflow-y-auto p-1">
          {results.length === 0 && <p className="micro-label p-3">No data yet — try another search.</p>}
          {groups.map((g) => {
            const items = results.filter((r) => r.kind === g);
            if (!items.length) return null;
            return (
              <div key={g}>
                <p className="micro-label px-3 pb-1 pt-2">{titles[g]}</p>
                {items.map((r) => {
                  idx++;
                  const i = idx;
                  return (
                    <button key={`${g}-${r.label}`} onClick={r.run}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                        active === i ? "bg-[#D8FF02] text-black" : "hover:bg-white/10"}`}>
                      {r.team ? <TeamBadge team={r.team} size={28} />
                        : <span className="w-7 text-center">{r.kind === "player" ? "●" : r.kind === "venue" ? "▦" : r.icon || "⌕"}</span>}
                      <span className="truncate font-medium">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="micro-label px-3 py-2">↑↓ navigate · Enter to go · Esc to close</p>
      </div>
    </div>
  );
}
