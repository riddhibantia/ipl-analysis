import { useEffect, useState } from "react";
import { Card, Logo, SectionTitle } from "../ui";

const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `${n}`);

export default function Overview({ go }) {
  const [o, setO] = useState(null);
  useEffect(() => {
    fetch("/api/overview").then((r) => r.json()).then(setO).catch(() => {});
  }, []);
  if (!o) return <p className="text-sm text-slate-500">Loading overview…</p>;
  const [first, last] = [o.seasons[0], o.seasons[o.seasons.length - 1]];
  const stats = [
    [`${first}–${last}`, "seasons covered"],
    [`${o.matches.toLocaleString()}`, "matches"],
    [fmtK(o.balls), "balls analysed"],
    [`${o.teams}`, "teams"],
  ];
  const cards = [
    ["live", "Live Predictor", "Win probability from any match state.", "from-blue-600 to-violet-600"],
    ["centre", "Match Centre", "Ratings, head-to-head, form, toss call.", "from-sky-600 to-blue-700"],
    ["players", "Players", "Orange & Purple caps, strike rates, economies.", "from-amber-500 to-orange-600"],
    ["teams", "Teams", "Strengths, weaknesses, phase splits.", "from-emerald-600 to-teal-600"],
    ["toss", "Toss Lab", "Bat-first vs chase advisor per venue.", "from-indigo-600 to-purple-700"],
    ["ratings", "Ratings", "Elo table, venues, methodology.", "from-slate-700 to-slate-900"],
  ];
  return (
    <div className="fade-in">
      <div className="hero-pattern rounded-3xl p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[2px] text-white/70">
          IPL {first}–{last} · every ball counted
        </p>
        <h2 className="mt-1 max-w-xl text-2xl font-extrabold leading-tight sm:text-[32px]">
          Know every team, every player, every situation.
        </h2>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          Pre-match intelligence, live win probability and 18 seasons of ratings —
          built from {o.matches.toLocaleString()} matches and {fmtK(o.balls)} deliveries.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
              <div className="tnum text-xl font-extrabold">{v}</div>
              <div className="text-xs text-white/75">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([id, title, sub, grad]) => (
          <button key={id} onClick={() => go(id)}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${grad}`} />
            <div className="font-bold">{title}</div>
            <div className="text-[13px] text-slate-500">{sub}</div>
            <div className="mt-2 text-[13px] font-bold text-[var(--color-accent)] group-hover:underline">Open →</div>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>2025–26 form team</SectionTitle>
          <div className="space-y-2.5">
            {o.top_teams_recent.map((t) => (
              <div key={t.team} className="flex items-center gap-3">
                <Logo team={t} size={40} />
                <span className="text-sm font-bold">{t.short}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((t.wins / o.top_teams_recent[0].wins) * 100)}%`, background: t.color }} />
                </div>
                <b className="tnum text-sm">{t.wins} wins</b>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Current holders</SectionTitle>
          <div className="space-y-3">
            <Cap label="Orange Cap · most runs 2025–26" p={o.orange_cap} name={o.orange_cap?.batter}
              stat={`${o.orange_cap?.runs} runs · SR ${o.orange_cap?.sr}`} color="bg-gradient-to-br from-amber-400 to-orange-500" />
            <Cap label="Purple Cap · most wickets 2025–26" p={o.purple_cap} name={o.purple_cap?.bowler}
              stat={`${o.purple_cap?.wickets} wkts · econ ${o.purple_cap?.econ}`} color="bg-gradient-to-br from-violet-500 to-purple-700" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Cap({ label, name, stat, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-lg font-extrabold text-white ${color}`}>
        {name ? name.split(" ").map((w) => w[0]).slice(-2).join("") : "–"}
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="font-bold">{name}</div>
        <div className="tnum text-[13px] text-slate-500">{stat}</div>
      </div>
    </div>
  );
}
