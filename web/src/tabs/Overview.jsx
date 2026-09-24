import { useEffect, useState } from "react";
import heroImg from "../assets/hero.jpg";
import { CountUp, DualBar, FormPills, Gauge, Skeleton, Sparkline, TeamBadge } from "../ui";

const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `${n}`);

export default function Overview({ go, meta, season }) {
  const [o, setO] = useState(null);
  const [h2h, setH2h] = useState({ t1: "Mumbai Indians", t2: "Chennai Super Kings", d: null });
  const [recent, setRecent] = useState([]);
  const [heat, setHeat] = useState(null);
  const [rank, setRank] = useState([]);
  const [counts, setCounts] = useState([]);
  const [toss, setToss] = useState(null);
  const [history, setHistory] = useState(null);
  const [pcaMini, setPcaMini] = useState(null);
  const [formRows, setFormRows] = useState([]);
  const [glow, setGlow] = useState({ x: 50, y: 30 });

  useEffect(() => {
    fetch("/api/overview").then((r) => r.json()).then(setO).catch(() => {});
    fetch("/api/matches?limit=10").then((r) => r.json()).then((m) => setRecent(m.rows)).catch(() => {});
    fetch("/api/analytics/toss-heatmap?top=6").then((r) => r.json()).then(setHeat).catch(() => {});
    fetch("/api/insights/toss").then((r) => r.json()).then(setToss).catch(() => {});
    fetch("/api/history/this-week").then((r) => r.json()).then(setHistory).catch(() => {});
    fetch("/api/analytics/pca").then((r) => r.json())
      .then((p) => setPcaMini(Array.isArray(p.points) ? p.points.filter((_, i) => i % 6 === 0) : [])).catch(() => {});
    fetch("/api/seasons/counts").then((r) => r.json())
      .then((c) => setCounts(Array.isArray(c) ? c : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const s = season || String(meta.seasons[meta.seasons.length - 1]);
    fetch(`/api/rankings?season=${s}`).then((r) => r.json()).then(async (r) => {
      const top = r.rows.slice(0, 4);
      setRank(r.rows.slice(0, 5));
      const forms = await Promise.all(top.map((t) =>
        fetch(`/api/insights/form?team=${encodeURIComponent(t.team)}&n=5`).then((x) => x.json())
          .then((f) => ({ team: t.team, short: t.short, wins: f.recent.map((x) => x.winner === t.team) }))
          .catch(() => null)));
      setFormRows(forms.filter(Boolean));
    }).catch(() => {});
    loadH2h(h2h.t1, h2h.t2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  async function safeFetch(url, fallback) {
    try {
      const r = await fetch(url);
      if (!r.ok) return fallback;
      return await r.json();
    } catch {
      return fallback;
    }
  }

  async function loadH2h(t1, t2) {
    const v = encodeURIComponent(meta.venues[0]);
    const [d, hh, f1, f2] = await Promise.all([
      safeFetch(`/api/match-centre?team1=${encodeURIComponent(t1)}&team2=${encodeURIComponent(t2)}&venue=${v}`, null),
      safeFetch(`/api/insights/h2h?team1=${encodeURIComponent(t1)}&team2=${encodeURIComponent(t2)}`, { results: [] }),
      safeFetch(`/api/insights/form?team=${encodeURIComponent(t1)}&n=5`, { recent: [] }),
      safeFetch(`/api/insights/form?team=${encodeURIComponent(t2)}&n=5`, { recent: [] }),
    ]);
    if (!d) return;
    const wins = {};
    (hh.results || []).forEach((r) => { wins[r.winner] = r.n; });
    setH2h({ t1, t2, d, wins,
      form1: (f1.recent || []).map((r) => r.winner === t1),
      form2: (f2.recent || []).map((r) => r.winner === t2) });
  }

  if (!o) return (
    <div>
      <div className="glass overflow-hidden">
        <div className="p-6 sm:p-10">
          <div className="skeleton mb-2" style={{ width: 200, height: 14 }} />
          <div className="skeleton mb-2" style={{ width: "60%", height: 56 }} />
          <div className="skeleton" style={{ width: "40%", height: 18 }} />
        </div>
        <div className="flex gap-3 px-6 pb-6 sm:px-10">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ width: 130, height: 66 }} />)}
        </div>
      </div>
      <div className="glass mt-4 p-5"><div className="skeleton" style={{ width: "100%", height: 120 }} /></div>
    </div>
  );
  const teams = meta.teams.map((t) => t.name);

  return (
    <div>
      {/* ---------- live ticker ---------- */}
      <div className="ticker-wrap glass mb-4 overflow-hidden !rounded-full px-1 py-2" aria-label="Recent results ticker">
        <div className="ticker">
          {[...recent, ...recent].map((m, i) => (
            <span key={`${m.id}-${i}`} className="flex-none rounded-full bg-white/5 px-3 py-1 text-xs font-medium">
              {m.team1.short} vs {m.team2.short} · <b className="text-[#D8FF02]">{m.winner ? shortCode(m.winner, meta) : "NR"}</b>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- hero ---------- */}
      <div className="glass relative overflow-hidden"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setGlow({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}>
        <img src={heroImg} alt="Night match at Eden Gardens"
          className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.32 }} />
        <div className="hero-scrim absolute inset-0" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle 220px at ${glow.x}% ${glow.y}%, rgba(216,255,2,0.09), transparent 70%)` }} />
        <div className="relative p-6 pb-10 sm:p-10 sm:pb-12">
          <p className="micro-label !text-white/70">Season pulse · {o.seasons[0]}–{o.seasons[o.seasons.length - 1]}</p>
          <h2 className="page-title mt-2">Season Pulse</h2>
          <p className="mt-2 max-w-lg text-[16px] text-white/60">Monitor season trends and match analytics across every ball.</p>
          <p className="micro-label mt-4 !text-[10px] !normal-case !text-white/40">
            Photo: B0415nil, CC BY-SA 4.0, via Wikimedia Commons
          </p>
        </div>
        <div className="relative -mt-7 flex flex-wrap gap-3 px-6 sm:px-10">
          <HeroChip big={<CountUp value={o.matches} />} unit="matches"
            spark={counts.map((c) => c.matches)} />
          <HeroChip big={<CountUp value={o.balls} format={(x) => fmtK(x)} />} unit="balls"
            spark={counts.map((c) => c.balls)} />
          <HeroChip big={<CountUp value={o.orange_cap?.runs || 0} />} unit={`runs · ${shortName(o.orange_cap?.batter)}`} />
          <HeroChip big={<CountUp value={o.purple_cap?.wickets || 0} />} unit={`wkts · ${shortName(o.purple_cap?.bowler)}`} />
        </div>
        <div className="h-6" />
      </div>

      {/* ---------- bento row 1: 7 / 5 ---------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="glass p-5 sm:p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Head-to-Head</h3>
            <div className="flex gap-2">
              {[["t1", h2h.t1], ["t2", h2h.t2]].map(([k, v]) => (
                <select key={k} value={v} aria-label={k === "t1" ? "First team" : "Second team"}
                  onChange={(e) => loadH2h(k === "t1" ? e.target.value : h2h.t1, k === "t2" ? e.target.value : h2h.t2)}
                  className="field-dark max-w-[130px] !rounded-full !py-1.5 !text-xs">
                  {teams.map((t) => <option key={t}>{t}</option>)}
                </select>
              ))}
            </div>
          </div>
          {h2h.d && h2h.d.team1 ? <H2H d={h2h.d} wins={h2h.wins || {}} form1={h2h.form1 || []} form2={h2h.form2 || []} /> : <p className="micro-label">Loading…</p>}

          <h3 className="mb-2 mt-6 text-lg font-semibold">Recent Matches</h3>
          <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {recent.slice(0, 6).map((m) => (
              <button key={m.id} onClick={() => go("matches")}
                className="glass glass-hover flex w-full items-center gap-3 !rounded-2xl p-3 text-left">
                <TeamBadge team={m.team1} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.team1.short} vs {m.team2.short}</div>
                  <div className="truncate text-xs text-white/50">{m.venue} · {m.date}</div>
                </div>
                <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                  m.winner ? "bg-[#D8FF02] text-black" : "bg-white/15 text-white/70"}`}>
                  {m.winner ? shortCode(m.winner, meta) + " WIN" : "NR"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="glass p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Season Record</h3>
              <button onClick={() => go("rankings")} aria-label="Expand full rankings" className="text-white/40 hover:text-white" title="Expand">↗</button>
            </div>
            <p className="micro-label mb-3">Last result: {recent[0] ? `${recent[0].team1.short} vs ${recent[0].team2.short}` : "–"}</p>
            {rank.slice(0, 2).map((r, i) => (
              <div key={r.team} className="mb-2 flex items-center gap-2">
                <TeamBadge team={r} size={30} />
                <span className="w-10 text-xs font-semibold">{r.short}</span>
                <div className="flex h-9 flex-1 items-end gap-[3px]">
                  {Array.from({ length: Math.min(r.wins, 14) }).map((_, j) => (
                    <div key={j} className="w-full rounded-sm" style={{
                      height: `${30 + (j / Math.max(r.wins - 1, 1)) * 70}%`,
                      background: i === 0 ? "#D8FF02" : "#88A1FF", opacity: 0.35 + (j / Math.max(r.wins, 1)) * 0.65,
                    }} />
                  ))}
                </div>
                <b className="tnum w-8 text-right text-[32px] font-semibold">{String(r.wins).padStart(2, "0")}</b>
              </div>
            ))}
            <p className="micro-label mt-1 text-center">Victories · {season} season</p>
          </div>
        </div>
      </div>

      {/* ---------- bento row 2: 4 / 4 / 4 ---------- */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="glass p-5">
          <h3 className="text-lg font-semibold">Toss Impact</h3>
          {toss ? <TossMini toss={toss} go={go} /> : <p className="micro-label">Loading…</p>}
        </div>
        <div className="glass p-5">
          <h3 className="text-lg font-semibold">Form Ticker</h3>
          <p className="micro-label mb-2 normal-case">Last-5 dots, top {season} sides</p>
          {formRows.length ? formRows.map((f) => (
            <div key={f.team} className="flex items-center justify-between py-1.5">
              <span className="text-[13px] font-semibold">{f.short}</span>
              <FormPills wins={f.wins} />
            </div>
          )) : <p className="micro-label">Loading…</p>}
        </div>
        <div className="glass p-5">
          <h3 className="text-lg font-semibold">This Week in History</h3>
          {history?.featured ? (
            <>
              <p className="micro-label normal-case">Biggest margin · week {history.week}</p>
              <p className="mt-2 text-[15px] font-semibold leading-snug">{history.featured.result}</p>
              <p className="micro-label mt-1 normal-case">
                {history.featured.team1} vs {history.featured.team2} · {history.featured.season} · {history.featured.venue?.split(",")[0]}
              </p>
            </>
          ) : <p className="micro-label">Loading…</p>}
        </div>
      </div>

      {/* ---------- bento row 3: PCA teaser, full width ---------- */}
      <button onClick={() => go("analytics")}
        className="glass glass-hover mt-4 flex w-full items-center gap-4 p-4 text-left">
        {pcaMini ? (
          <svg viewBox="0 0 200 64" className="h-16 w-44 flex-none" role="img" aria-label="PCA preview">
            {pcaMini.slice(0, 220).map((p, i) => (
              <circle key={i} cx={100 + p.x * 22} cy={32 - p.y * 22} r="1.6"
                fill={p.team1_win ? "#D8FF02" : "#88A1FF"} opacity="0.7" />
            ))}
          </svg>
        ) : <div className="skeleton h-16 w-44 flex-none" />}
        <span>
          <span className="block font-semibold">Analytics Lab — match-state PCA</span>
          <span className="micro-label normal-case">1,232 states · lime won, periwinkle lost · Explore →</span>
        </span>
      </button>
    </div>
  );
}

function shortName(n) {
  if (!n) return "";
  const p = n.split(" ");
  return p.length > 1 ? `${p[0][0]} ${p[p.length - 1]}` : n;
}

function shortCode(winner, meta) {
  const t = meta.teams.find((x) => x.name === winner);
  return t ? t.short : winner;
}

function HeroChip({ big, unit, spark }) {
  return (
    <div className="glass !rounded-2xl px-5 py-3">
      <span className="relative text-[32px] font-semibold leading-none">
        <span className="absolute -inset-3 rounded-full" style={{ background: "radial-gradient(circle, rgba(216,255,2,0.15), transparent 70%)", filter: "blur(40px)" }} />
        <span className="relative">{big}</span>
      </span>
      <span className="micro-label ml-2 !normal-case">{unit}</span>
      {spark && spark.some((v) => v > 0) && (
        <span className="mt-1 block w-28"><Sparkline values={spark} width={112} height={22} /></span>
      )}
    </div>
  );
}

function TossMini({ toss, go }) {
  const bat = toss.find((t) => t.toss_decision === "bat");
  const field = toss.find((t) => t.toss_decision === "field");
  const conv = field && bat
    ? (field.toss_winner_won_match * field.n + bat.toss_winner_won_match * bat.n) / (field.n + bat.n)
    : null;
  return (
    <div className="flex items-center gap-4">
      <Gauge limePct={conv == null ? null : conv * 100} size={110} label="toss→win" />
      <div>
        <p className="text-sm font-semibold">Field first converts better</p>
        <p className="micro-label normal-case">Chase wins {Math.round((field?.toss_winner_won_match || 0) * 100)}% of tosses</p>
        <button onClick={() => go("insights")} className="mt-2 text-[13px] font-semibold text-[#D8FF02] hover:underline">
          Full findings →
        </button>
      </div>
    </div>
  );
}

function H2H({ d, wins, form1, form2 }) {
  const { team1: a, team2: b } = d;
  const h = d.head_to_head.team1_pct;
  return (
    <>
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <div><TeamBadge team={a} size={64} /><div className="mt-1 text-sm font-semibold">{a.short}</div>
          <div className="tnum text-4xl font-semibold text-[#D8FF02]" style={{ textShadow: "0 0 30px rgba(216,255,2,.35)" }}>{wins[a.name] ?? "–"}</div></div>
        <div className="micro-label">VS</div>
        <div><TeamBadge team={b} size={64} /><div className="mt-1 text-sm font-semibold">{b.short}</div>
          <div className="tnum text-4xl font-semibold text-[#88A1FF]" style={{ textShadow: "0 0 30px rgba(136,161,255,.35)" }}>{wins[b.name] ?? "–"}</div></div>
      </div>
      <DualBar label="Win rate" left={h} right={1 - h} format={(x) => `${Math.round(x * 100)}%`} delay={0} />
      <DualBar label="Elo rating" left={a.elo} right={b.elo} format={(x) => Math.round(x)} delay={0.08} />
      <DualBar label="All-time win %" left={a.win_pct} right={b.win_pct} format={(x) => `${Math.round(x * 100)}%`} delay={0.16} />
      <DualBar label="Toss: bat-first %" left={d.toss.p_bat_first} right={d.toss.p_bowl_first} format={(x) => `${Math.round(x * 100)}%`} delay={0.24} />
      <div className="mt-3">
        <div className="micro-label mb-1">Recent form · {a.short}</div>
        <div className="mb-2"><FormPills wins={form1} /></div>
        <div className="micro-label mb-1">Recent form · {b.short}</div>
        <FormPills wins={form2} />
      </div>
    </>
  );
}
