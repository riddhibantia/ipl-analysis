import { useEffect, useState } from "react";
import { api } from "./api";
import Live from "./tabs/Live";
import MatchCentre from "./tabs/MatchCentre";
import Model from "./tabs/Model";
import Overview from "./tabs/Overview";
import Players from "./tabs/Players";
import Tables, { Ratings } from "./tabs/Tables";
import Teams from "./tabs/Teams";
import Toss from "./tabs/Toss";

const TABS = [
  ["overview", "Overview"],
  ["centre", "Match Centre"],
  ["live", "Live Predictor"],
  ["players", "Players"],
  ["teams", "Teams"],
  ["toss", "Toss Lab"],
  ["venues", "Venues"],
  ["ratings", "Ratings"],
  ["model", "Model"],
];

export default function App() {
  const [tab, setTab] = useState("overview");
  const [meta, setMeta] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([api.meta(), api.ratings(), api.venues()])
      .then(([m, r, v]) => {
        setMeta(m);
        setRatings(r);
        setVenues(v);
      })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <>
      <header className="hero-pattern px-6 pb-7 pt-6 text-white">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-white/80 text-sm font-extrabold text-red-900 shadow-lg"
            style={{ background: "radial-gradient(circle at 35% 32%, #ffffff, #ffd9d9 42%, #e02424 78%)" }}>
            IPL
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">IPL Intelligence</h1>
            <p className="text-xs opacity-90">
              {meta ? `Match centre · live predictor · players · ${meta.seasons[0]}–${meta.seasons[meta.seasons.length - 1]}` : "Loading…"}
            </p>
          </div>
          <div className="ml-auto whitespace-nowrap rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-bold">
            TATA IPL DATA
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <nav className="tabs-scroll mx-auto flex max-w-[1120px] gap-1.5 overflow-x-auto px-4 py-2">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold ${
                tab === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-5">
        {err && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Backend not ready</h2>
            <p className="text-sm text-slate-500">{err}</p>
          </div>
        )}
        {!err && !meta && <p className="text-sm text-slate-500">Loading…</p>}
        {meta && (
          <div key={tab} className="fade-in">
            {tab === "overview" && <Overview go={setTab} />}
            {tab === "centre" && <MatchCentre meta={meta} />}
            {tab === "live" && <Live meta={meta} />}
            {tab === "players" && <Players />}
            {tab === "teams" && <Teams meta={meta} ratings={ratings} />}
            {tab === "toss" && <Toss meta={meta} />}
            {tab === "venues" && <Tables venues={venues} />}
            {tab === "ratings" && <Ratings ratings={ratings} />}
            {tab === "model" && <Model />}
          </div>
        )}
      </main>

      <div className="mt-6 text-center text-xs text-slate-500">
        IPL Intelligence · data 2008–2024 · React + Vite + Tailwind · FastAPI + scikit-learn · logos via iplt20.com
      </div>
    </>
  );
}
