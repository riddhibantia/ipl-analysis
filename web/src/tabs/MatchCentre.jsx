import { useState } from "react";
import { MONTHS, api } from "../api";
import { Card, CodeChip, CompareRow, Field, FormPills, KV, Logo, Meter, PrimaryButton, SectionTitle, inputCls, pct1 } from "../ui";

export default function MatchCentre({ meta }) {
  const teams = meta.teams.map((t) => t.name);
  const [t1, setT1] = useState("Mumbai Indians");
  const [t2, setT2] = useState("Chennai Super Kings");
  const [venue, setVenue] = useState("Wankhede Stadium, Mumbai");
  const [month, setMonth] = useState("4");
  const [data, setData] = useState(null);
  const [forms, setForms] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const d = await api.matchCentre({ team1: t1, team2: t2, venue, month });
      setData(d);
      const [f1, f2] = await Promise.all([api.form(d.team1.name), api.form(d.team2.name)]);
      setForms({ [d.team1.name]: f1.recent, [d.team2.name]: f2.recent });
    } finally {
      setLoading(false);
    }
  }

  const sel = (v, set) => (
    <select className={inputCls} value={v} onChange={(e) => set(e.target.value)}>
      {teams.map((t) => (
        <option key={t}>{t}</option>
      ))}
    </select>
  );

  return (
    <>
      <Card>
        <h2 className="text-[17px] font-bold">Pre-match Centre</h2>
        <p className="mb-1 text-[13px] text-slate-500">
          Ratings, head-to-head, form, venue edge and toss advice.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Field label="Team A">{sel(t1, setT1)}</Field>
            <Field label="Team B">{sel(t2, setT2)}</Field>
          </div>
          <div>
            <Field label="Venue">
              <select className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)}>
                {meta.venues.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Month">
              <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <PrimaryButton onClick={run}>Analyze matchup</PrimaryButton>
      </Card>
      {loading && <Card><p className="text-sm text-slate-500">Loading preview…</p></Card>}
      {data && !loading && <Result d={data} forms={forms} />}
    </>
  );
}

function Result({ d, forms }) {
  const { team1: a, team2: b } = d;
  const h = d.head_to_head.team1_pct;
  const tb = Math.round(d.toss.p_bat_first * 100);
  const batFirst = d.toss.recommendation.startsWith("bat");
  const vh = d.toss.venue_history;
  const pills = (name) =>
    (forms?.[name] || []).map((r) => r.winner === name);

  return (
    <div className="fade-in">
      <Card className="overflow-hidden !p-0">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${a.color}, ${b.color})` }} />
        <div className="p-5 text-center">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <CodeChip team={a} />
            <Logo team={a} />
            <h3 className="mt-2 text-[16px] font-bold">{a.name}</h3>
            <div className="tnum text-[13px] text-slate-500">Elo {a.elo} · {a.played} matches</div>
          </div>
          <div className="mx-auto flex h-[54px] w-[54px] items-center justify-center rounded-full bg-slate-900 text-[20px] font-extrabold text-white shadow">
            VS
          </div>
          <div>
            <CodeChip team={b} />
            <Logo team={b} />
            <h3 className="mt-2 text-[16px] font-bold">{b.name}</h3>
            <div className="tnum text-[13px] text-slate-500">Elo {b.elo} · {b.played} matches</div>
          </div>
          </div>
          <p className="mt-3 text-[13px] text-slate-500">{d.toss.venue}</p>
        </div>
      </Card>

      <Card>
        <SectionTitle>Team comparison</SectionTitle>
        <CompareRow label="Elo rating" v1={a.elo} v2={b.elo} t1={a} t2={b} fmt={(x) => Math.round(x)} />
        <CompareRow label="All-time win %" v1={a.win_pct} v2={b.win_pct} t1={a} t2={b} fmt={pct1} />
        <CompareRow label="Last-5 form" v1={a.last5} v2={b.last5} t1={a} t2={b} fmt={pct1} />
        <CompareRow label="Head-to-head share" v1={h} v2={1 - h} t1={a} t2={b} fmt={pct1} />
        <KV k={`${a.short} recent`} v={<FormPills wins={pills(a.name)} />} />
        <KV k={`${b.short} recent`} v={<FormPills wins={pills(b.name)} />} />
      </Card>

      <Card>
        <SectionTitle>Toss verdict</SectionTitle>
        <div className="flex items-center gap-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-violet-50 p-3.5">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent2)] text-lg font-extrabold text-white">T</div>
          <div className="min-w-0 flex-1 text-[15px]">
            <b>Win the toss and {d.toss.recommendation}</b>
            <Meter pct={batFirst ? tb : 100 - tb} />
            <span className="text-[13px] text-slate-500">Model: bat first {tb}% · bowl first {100 - tb}%</span>
          </div>
        </div>
        {vh && (
          <div className="mt-2">
            <KV k="Matches at venue" v={vh.matches} />
            <KV k="Captains bat first" v={pct1(vh.bat_first_pct)} />
            <KV k="Toss winners take the match" v={pct1(vh.toss_win_match_win_pct)} />
          </div>
        )}
      </Card>
    </div>
  );
}
