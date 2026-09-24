import { Suspense, lazy, useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { api } from "./api";
import { ChartErrorBoundary } from "./ui";
import { DiscoveryStrip } from "./ui";
import { Logomark } from "./ui";
import Palette from "./Palette";
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
// pre-redesign deep links keep working by mapping to their new homes
const LEGACY_TABS = { live: "matches", centre: "matches", toss: "analytics", model: "analytics" };

function readHash() {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  let tab = h.get("tab");
  if (LEGACY_TABS[tab]) tab = LEGACY_TABS[tab];
  return {
    tab: NAV_IDS.includes(tab) ? tab : "overview",
    sub: h.get("sub") || "",
    season: h.get("season") || "",
    q: h.get("q") || "",
  };
}

export default function App() {
  const initial = readHash();
  const [tab, setTab] = useState(initial.tab);
  const [sub, setSub] = useState(initial.sub);
  const [meta, setMeta] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [season, setSeason] = useState(initial.season);
  const [query, setQuery] = useState(initial.q);
  const [err, setErr] = useState(null);
  const [panel, setPanel] = useState(null); // null | "bell" | "settings" | "profile"
  const [palette, setPalette] = useState(false);
  const [teamFocus, setTeamFocus] = useState("");
  const [playerFocus, setPlayerFocus] = useState("");
  const [feed, setFeed] = useState(null);
  const [motionOff, setMotionOff] = useState(
    () => localStorage.getItem("ipl-reduced-motion") === "1");
  const [light, setLight] = useState(
    () => localStorage.getItem("ipl-theme") === "light");

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

  // shareable URL state: #tab=&sub=&season=&q=
  useEffect(() => {
    const h = new URLSearchParams();
    h.set("tab", tab);
    if (sub) h.set("sub", sub);
    if (season) h.set("season", season);
    if (query) h.set("q", query);
    window.history.replaceState(null, "", `#${h.toString()}`);
  }, [tab, sub, season, query]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", motionOff);
    localStorage.setItem("ipl-reduced-motion", motionOff ? "1" : "0");
  }, [motionOff]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
    localStorage.setItem("ipl-theme", light ? "light" : "dark");
  }, [light]);

  function togglePanel(p) {
    if (p === "bell" && !feed) {
      Promise.all([
        api.get("/api/overview").catch(() => null),
        api.metrics().catch(() => null),
      ]).then(([o, m]) => {
        const items = [];
        if (o) {
          const last = o.seasons[o.seasons.length - 1];
          items.push([`${last} season in the data`, `${o.matches.toLocaleString()} matches · ${o.seasons[0]}–${last}`]);
          if (o.orange_cap) items.push([`Orange Cap: ${o.orange_cap.batter}`, `${o.orange_cap.runs} runs · SR ${o.orange_cap.sr}`]);
          if (o.purple_cap) items.push([`Purple Cap: ${o.purple_cap.bowler}`, `${o.purple_cap.wickets} wickets · econ ${o.purple_cap.econ}`]);
        }
        if (m) items.push(["Toss model holdout", `${Math.round(m.test.accuracy * 100)}% accuracy · AUC ${m.test.roc_auc}`]);
        setFeed(items);
      });
    }
    setPanel((cur) => (cur === p ? null : p));
  }

  // global command palette: Ctrl/⌘+K toggle, Esc close
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setPanel(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function paletteNav(tab, sub = "", focus = {}) {
    if (focus.team) setTeamFocus(focus.team);
    if (focus.player) setPlayerFocus(focus.player);
    if (focus.q) setQuery(focus.q);
    setPalette(false);
    go(tab, sub);
  }

  function go(id, sub = "") {
    setTab(id);
    setSub(sub);
    window.scrollTo({ top: 0 });
  }

  function searchNow(e) {
    e?.preventDefault();
    setTab("matches");
  }

  const title = (NAV.find(([id]) => id === tab) || [])[1] || "";

  return (
    <MotionConfig reducedMotion={motionOff ? "always" : "never"}>
    <div className="min-h-screen text-white">
      <div className="mesh-bg" aria-hidden="true" />
      {/* ------- desktop sidebar: exactly 8 flat items, no scroll ------- */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-col px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <button onClick={() => { setQuery(""); go("overview"); }} aria-label="IPL Pulse home"
            className="flex items-center gap-2.5 rounded-xl" title="Home">
            <Logomark size={36} />
            <span className="text-left">
              <span className="block font-semibold tracking-tight">IPL Pulse</span>
              <span className="micro-label block !text-[10px]">analytics</span>
            </span>
          </button>
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
        <div className="relative mt-4 border-t border-white/10 px-2 pt-4">
          {panel && (
            <div className="glass absolute bottom-full left-0 right-0 mb-2 !rounded-2xl p-4 fade-in">
              {panel === "bell" && <FeedPanel feed={feed} />}
              {panel === "settings" && (
                <SettingsPanel motionOff={motionOff} setMotionOff={setMotionOff}
                  light={light} setLight={setLight}
                  meta={meta} clearFilters={() => { setQuery(""); setPanel(null); }} />
              )}
              {panel === "profile" && <ProfilePanel meta={meta} />}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button aria-label={`Notifications${feed ? `, ${feed.length} items` : ""}`}
                onClick={() => togglePanel("bell")} className="text-lg">🔔</button>
              {feed && feed.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D8FF02] text-[9px] font-semibold text-black">
                  {feed.length}
                </span>
              )}
            </div>
            <button aria-label="Settings" onClick={() => togglePanel("settings")} className="text-white/60 hover:text-white">⚙</button>
            <button aria-label="Profile" onClick={() => togglePanel("profile")}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#88A1FF] text-xs font-semibold text-black">RB</button>
          </div>
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
              <button type="button" onClick={() => setPalette(true)} aria-label="Open command palette"
                className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-white/60 hover:text-white">⌘K</button>
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
              <DiscoveryStrip go={go} />
              {tab === "overview" && <Overview go={go} meta={meta} season={season} />}
              {tab === "matches" && <Matches meta={meta} season={season} query={query} sub={sub} setSub={setSub} />}
              {tab === "teams" && <Teams meta={meta} ratings={ratings} focus={teamFocus} />}
              {tab === "players" && <Players focusQ={playerFocus} />}
              {tab === "venues" && <Tables venues={venues} />}
              {tab === "analytics" && (
                <Suspense fallback={<p className="micro-label">Loading charts…</p>}>
                  <ChartErrorBoundary>
                    <Analytics meta={meta} sub={sub} setSub={setSub} />
                  </ChartErrorBoundary>
                </Suspense>
              )}
              {tab === "rankings" && <Rankings meta={meta} season={season} />}
              {tab === "insights" && <Insights />}
            </div>
          )}
        </main>
      </div>

      {palette && meta && (
        <Palette meta={meta} onNav={paletteNav} onClose={() => setPalette(false)} />
      )}

      {/* ------- mobile bottom bar ------- */}      <nav className="fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-full border border-white/15 bg-black/90 px-2 py-2 backdrop-blur-xl md:hidden" aria-label="Primary">
        {NAV.filter(([id]) => MOBILE_TABS.includes(id)).map(([id, label, icon]) => (
          <button key={id} onClick={() => go(id)} aria-label={label}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-base ${
              tab === id ? "bg-[#D8FF02] text-black" : "text-white/60"}`} title={label}>
            {icon}
          </button>
        ))}
      </nav>
    </div>
    </MotionConfig>
  );
}

function FeedPanel({ feed }) {
  if (!feed) return <p className="micro-label">Loading updates…</p>;
  if (!feed.length) return <p className="micro-label">No data yet.</p>;
  return (
    <div>
      <p className="micro-label mb-2">Updates · live from the data</p>
      {feed.map(([t, s]) => (
        <div key={t} className="border-b border-white/10 py-2 last:border-0">
          <div className="text-[13px] font-semibold">{t}</div>
          <div className="tnum text-xs text-white/50">{s}</div>
        </div>
      ))}
    </div>
  );
}

function SettingsPanel({ motionOff, setMotionOff, light, setLight, meta, clearFilters }) {
  const switchCls = (on) => `relative h-5 w-9 rounded-full transition ${on ? "bg-[#D8FF02]" : "bg-white/15"}`;
  const knobCls = (on) => `absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`;
  return (
    <div>
      <p className="micro-label mb-2">Settings</p>
      <button onClick={() => setLight(!light)} aria-pressed={light}
        className="flex w-full items-center justify-between py-2 text-left text-[13px] font-medium">
        Light theme
        <span className={switchCls(light)}><span className={knobCls(light)} /></span>
      </button>
      <button onClick={() => setMotionOff(!motionOff)} aria-pressed={motionOff}
        className="flex w-full items-center justify-between py-2 text-left text-[13px] font-medium">
        Reduce motion
        <span className={switchCls(motionOff)}><span className={knobCls(motionOff)} /></span>
      </button>
      <button onClick={clearFilters} className="w-full py-2 text-left text-[13px] font-medium text-white/70 hover:text-white">
        Reset search filters
      </button>
      <p className="micro-label mt-2 !normal-case">
        {meta ? `${meta.seasons[0]}–${meta.seasons[meta.seasons.length - 1]} · ${meta.teams.length} teams` : "IPL Pulse"}
      </p>
    </div>
  );
}

function ProfilePanel({ meta }) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <Logomark size={34} />
        <div>
          <div className="text-[13px] font-semibold">Riddhi Bantia</div>
          <div className="micro-label !text-[10px]">maintainer · @riddhibantia</div>
        </div>
      </div>
      <a href="https://github.com/riddhibantia/ipl-analysis" target="_blank" rel="noreferrer"
        className="mt-3 block rounded-full bg-[#D8FF02] py-2 text-center text-[13px] font-semibold text-black">
        Open GitHub repo
      </a>
      <p className="micro-label mt-2 !normal-case">
        {meta ? `Serving ${meta.seasons[0]}–${meta.seasons[meta.seasons.length - 1]} data` : "IPL Pulse"}
      </p>
    </div>
  );
}
