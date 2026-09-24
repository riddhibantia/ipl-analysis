import { Suspense, lazy, useEffect, useState } from "react";
import { api } from "./api";
import { ChartErrorBoundary } from "./ui";
import { Logomark } from "./ui";
import Insights from "./tabs/Insights";
import Matches from "./tabs/Matches";
import Overview from "./tabs/Overview";
import Players from "./tabs/Players";
import Rankings from "./tabs/Rankings";
import Tables, { Ratings } from "./tabs/Tables";
import Teams from "./tabs/Teams";

const Analytics = lazy(() => import("./tabs/Analytics"));

const NAV = [
  ["overview", "Overview", "◈"],
  ["matches", "Matches", "▤"],
  ["teams", "Teams", "⬢"],
  ["players", "Players", "●"],
  ["venues", "Venues", "▦"],
  ["analytics", "Analytics", "✛"],
  ["rankings", "Rankings", "▲"],
  ["insights", "Insights", "✦"],
];

const MOBILE_TABS = ["overview", "matches", "teams", "players", "analytics", "insights"];

const NAV_IDS = ["overview", "matches", "teams", "players", "venues", "analytics", "rankings", "insights"];

function readHash() {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const tab = h.get("tab");
  return {
    tab: NAV_IDS.includes(tab) ? tab : "overview",
    season: h.get("season") || "",
    q: h.get("q") || "",
  };
}

export default function App() {
  const initial = readHash();
  const [tab, setTab] = useState(initial.tab);
  const [meta, setMeta] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [season, setSeason] = useState(initial.season);
  const [query, setQuery] = useState(initial.q);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([api.meta(), api.ratings(), api.venues()])
      .then(([m, r, v]) => {
        setMeta(m);
        setRatings(r);
        setVenues(v);
        if (!readHash().season) setSeason(String(m.seasons[m.seasons.length - 1]));
      })
      .catch((e) => setErr(e.message));
  }, []);

  // shareable URL state: #tab=&season=&q=
  useEffect(() => {
    const h = new URLSearchParams();
    h.set("tab", tab);
    if (season) h.set("season", season);
    if (query) h.set("q", query);
    window.history.replaceState(null, "", `#${h.toString()}`);
  }, [tab, season, query]);

  function go(id) {
    setTab(id);
    window.scrollTo({ top: 0 });
  }

  function searchNow(e) {
    e?.preventDefault();
    setTab("matches");
  }

  const title = (NAV.find(([id]) => id === tab) || [])[1] || "";

  return (
    <div className="min-h-screen text-white">
      <div className="mesh-bg" aria-hidden="true" />
      {/* ------- desktop sidebar: exactly 8 flat items, no scroll ------- */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-col px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <Logomark size={36} />
          <div>
            <div className="font-semibold tracking-tight">IPL Pulse</div>
            <div className="micro-label !text-[10px]">analytics</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(([id, label, icon]) => (
            <button key={id} onClick={() => go(id)}
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                tab === id ? "bg-[#D8FF02] text-black" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
              <span className="w-5 text-center">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4">
          <div className="relative">
            <button aria-label="Notifications, 3 unread" className="text-lg">🔔</button>
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D8FF02] text-[9px] font-semibold text-black">3</span>
          </div>
          <button aria-label="Settings" className="text-white/60">⚙</button>
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#88A1FF] text-xs font-semibold text-black">RB</div>
        </div>
      </aside>

      {/* ------- main column ------- */}
      <div className="md:pl-[220px]">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-4 py-4 md:px-8">
            <div className="mr-auto">
              <h1 className="page-title">{title}</h1>
              <p className="micro-label mt-1">
                {tab === "overview" && "Monitor season trends and match analytics."}
                {tab === "matches" && "Every verified result, searchable."}
                {tab === "analytics" && "Dimensionality reduction on match state."}
                {!["overview", "matches", "analytics"].includes(tab) && "IPL intelligence, live from the data."}
              </p>
            </div>
            {meta && (
              <select value={season} onChange={(e) => setSeason(e.target.value)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium [&>option]:bg-[#0B1830]">
                {[...meta.seasons].reverse().map((s) => (
                  <option key={s} value={s}>Season {s}</option>
                ))}
              </select>
            )}
            <form onSubmit={searchNow} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-4 pr-1.5">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search matches…"
                className="w-32 bg-transparent text-sm outline-none placeholder:text-white/40 sm:w-44" />
              <button aria-label="Search matches" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D8FF02] text-sm font-semibold text-black">⌕</button>
            </form>
          </div>
          <nav className="tabs-scroll flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden">
            {NAV.filter(([id]) => MOBILE_TABS.includes(id)).map(([id, label]) => (
              <button key={id} onClick={() => go(id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                  tab === id ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/70"}`}>
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-5 md:px-8">
          {err && <div className="glass p-5"><h2 className="font-semibold">Backend not ready</h2><p className="micro-label mt-1">{err}</p></div>}
          {!err && !meta && <p className="micro-label">Loading…</p>}
          {meta && (
            <div key={tab} className="fade-in">
              {tab === "overview" && <Overview go={go} meta={meta} season={season} />}
              {tab === "matches" && <Matches meta={meta} season={season} query={query} />}
              {tab === "teams" && <Teams meta={meta} ratings={ratings} />}
              {tab === "players" && <Players />}
              {tab === "venues" && <Tables venues={venues} />}
              {tab === "analytics" && (
                <Suspense fallback={<p className="micro-label">Loading charts…</p>}>
                  <ChartErrorBoundary>
                    <Analytics meta={meta} />
                  </ChartErrorBoundary>
                </Suspense>
              )}
              {tab === "rankings" && <Rankings meta={meta} season={season} />}
              {tab === "insights" && <Insights />}
            </div>
          )}
        </main>
      </div>

      {/* ------- mobile bottom bar ------- */}
      <nav className="fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-full border border-white/15 bg-black/90 px-2 py-2 backdrop-blur-xl md:hidden">
        {NAV.filter(([id]) => MOBILE_TABS.includes(id)).map(([id, label, icon]) => (
          <button key={id} onClick={() => go(id)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-base ${
              tab === id ? "bg-[#D8FF02] text-black" : "text-white/60"}`} title={label}>
            {icon}
          </button>
        ))}
      </nav>
    </div>
  );
}
