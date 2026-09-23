import { useEffect, useState } from "react";
import { api } from "../api";
import { Card, CodeChip, Field, KV, Logo, PrimaryButton, SectionTitle, inputCls } from "../ui";

const PRESETS = [
  { name: "Powerplay surge", inn: 1, over: 6, runs: 65, wkts: 1, target: null },
  { name: "Mid-innings rebuild", inn: 1, over: 12, runs: 110, wkts: 4, target: null },
  { name: "Death overs", inn: 1, over: 18, runs: 175, wkts: 5, target: null },
  { name: "Comfortable chase", inn: 2, over: 12, runs: 120, wkts: 2, target: 180 },
  { name: "Tense finish", inn: 2, over: 18, runs: 160, wkts: 5, target: 180 },
  { name: "Miracle needed", inn: 2, over: 19, runs: 150, wkts: 7, target: 185 },
];

export default function Live({ meta }) {
  const teams = meta.teams.map((t) => t.name);
  const [inn, setInn] = useState("2");
  const [bat, setBat] = useState("Chennai Super Kings");
  const [bowl, setBowl] = useState("Mumbai Indians");
  const [venue, setVenue] = useState("Wankhede Stadium, Mumbai");
  const [over, setOver] = useState(15);
  const [runs, setRuns] = useState(140);
  const [wkts, setWkts] = useState(3);
  const [target, setTarget] = useState(180);
  const [data, setData] = useState(null);
  const [curve, setCurve] = useState(null);
  const [err, setErr] = useState(null);
  const chase = inn === "2";

  useEffect(() => {
    api.liveCurve().then(setCurve).catch(() => {});
  }, []);

  function applyPreset(s) {
    setInn(String(s.inn));
    setOver(s.over);
    setRuns(s.runs);
    setWkts(s.wkts);
    if (s.target) setTarget(s.target);
    setTimeout(runWith, 0, { ...s, inn: s.inn });
  }

  function body(ov = { inn: +inn, over, runs, wkts, target }) {
    return {
      innings: +ov.inn,
      batting_team: bat,
      bowling_team: bowl,
      venue,
      over: +ov.over,
      runs: +ov.runs,
      wkts: +ov.wkts,
      target: +ov.inn === 2 ? +ov.target : null,
    };
  }

  async function runWith(ov) {
    setErr(null);
    try {
      setData(await api.live(body(ov)));
    } catch (e) {
      setErr(e.message);
      setData(null);
    }
  }

  const run = () => runWith({ inn: +inn, over, runs, wkts, target });

  return (
    <>
      <Card>
        <h2 className="text-[17px] font-bold">Live Win Predictor</h2>
        <p className="mb-1 text-[13px] text-slate-500">
          Ball-by-ball model (260k deliveries): set the match state, get win probability.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Field label="Innings">
              <select className={inputCls} value={inn} onChange={(e) => setInn(e.target.value)}>
                <option value="1">1st — setting a target</option>
                <option value="2">2nd — chase</option>
              </select>
            </Field>
            <Field label="Batting team">
              <select className={inputCls} value={bat} onChange={(e) => setBat(e.target.value)}>
                {teams.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Bowling team">
              <select className={inputCls} value={bowl} onChange={(e) => setBowl(e.target.value)}>
                {teams.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Venue">
              <select className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)}>
                {meta.venues.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div>
            <Field label={`Overs completed: ${over}`}>
              <input type="range" min={1} max={chase ? 19 : 20} value={over}
                onChange={(e) => setOver(+e.target.value)} className="w-full" />
            </Field>
            <Field label="Runs scored">
              <input type="number" className={inputCls} value={runs} min={0} max={300}
                onChange={(e) => setRuns(+e.target.value)} />
            </Field>
            <Field label="Wickets lost">
              <input type="number" className={inputCls} value={wkts} min={0} max={9}
                onChange={(e) => setWkts(+e.target.value)} />
            </Field>
            {chase && (
              <Field label="Target (chase)">
                <input type="number" className={inputCls} value={target} min={1} max={300}
                  onChange={(e) => setTarget(+e.target.value)} />
              </Field>
            )}
          </div>
        </div>
        <PrimaryButton onClick={run}>Predict</PrimaryButton>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((s) => (
            <button key={s.name} onClick={() => applyPreset(s)}
              className="rounded-full border-[1.5px] border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              {s.name}
            </button>
          ))}
        </div>
      </Card>

      {err && <Card><p className="text-sm text-slate-500">{err}</p></Card>}
      {data && <LiveResult d={data} />}

      <Card>
        <h2 className="text-[17px] font-bold">How accuracy grows during a match</h2>
        <p className="mb-1 text-[13px] text-slate-500">Holdout accuracy by overs completed (2023–24).</p>
        {curve ? <Curve c={curve} /> : <p className="text-sm text-slate-500">Loading…</p>}
      </Card>
    </>
  );
}

function LiveResult({ d }) {
  const p = Math.round(d.prob_batting * 100);
  const fav = d.favorite === d.batting_team ? d.batting : d.bowling;
  const chase = d.state.target != null;
  const score = chase
    ? `${d.batting.short} ${d.state.runs}/${d.state.wkts} (${d.state.over}) · need ${d.state.target - d.state.runs} off ${(20 - d.state.over) * 6} balls`
    : `${d.batting.short} ${d.state.runs}/${d.state.wkts} (${d.state.over}) · projected ${d.state.projected} vs par ${Math.round(d.state.venue_par)}`;
  return (
    <div className="fade-in">
      <Card className="text-center">
        <div className="mb-3 h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${d.batting.color}, ${d.bowling.color})` }} />
        <SectionTitle>
          <span className="text-left">{chase ? "2nd innings · chase" : "1st innings"} · {d.venue}</span>
        </SectionTitle>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <CodeChip team={d.batting} />
            <Logo team={d.batting} />
            <h3 className="mt-2 text-[15px] font-bold">{d.batting_team}</h3>
            <div className="text-[13px] text-slate-500">batting</div>
          </div>
          <div className="mx-auto flex h-[158px] w-[158px] items-center justify-center rounded-full shadow"
            style={{ background: `conic-gradient(${fav.color} ${p}%, #e8edf4 ${p}% 100%)` }}>
            <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-white">
              <b className="tnum text-[32px]">{p}%</b>
              <span className="text-xs text-slate-500">win</span>
            </div>
          </div>
          <div>
            <CodeChip team={d.bowling} />
            <Logo team={d.bowling} />
            <h3 className="mt-2 text-[15px] font-bold">{d.bowling_team}</h3>
            <div className="text-[13px] text-slate-500">bowling</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-violet-50 p-3.5 text-left">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent2)] text-lg font-extrabold text-white">◷</div>
          <div className="text-[15px]"><b>{score}</b><br />
            <span className="text-[13px] text-slate-500">{d.note} · {fav.short} favourites</span>
          </div>
        </div>
      </Card>
      <Card>
        <SectionTitle>Why this number</SectionTitle>
        {d.factors.map((f, i) => <KV key={i} k={f.label} v={f.favours} />)}
      </Card>
    </div>
  );
}

function Curve({ c }) {
  const step = c.curve.filter((_, i) => i % 2 === 0);
  return (
    <>
      <div className="mt-2 flex items-end gap-[3px]">
        {step.map((r) => (
          <div key={r.over} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-[110px] items-end gap-[3px]">
              <div title={`1st inn ${Math.round((r.inn1 || 0) * 100)}%`}
                className="w-2 rounded-t bg-[var(--color-accent)]"
                style={{ height: `${Math.round((r.inn1 || 0) * 100)}px` }} />
              <div title={`chase ${Math.round((r.inn2 || 0) * 100)}%`}
                className="w-2 rounded-t bg-[var(--color-chase)]"
                style={{ height: `${Math.round((r.inn2 || 0) * 100)}px` }} />
            </div>
            <small className="text-[9px] text-slate-500">{r.over}</small>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-[var(--color-accent)]" />1st innings (test acc {Math.round(c.summary.innings_1.test_accuracy * 100)}%)</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-[var(--color-chase)]" />chase (test acc {Math.round(c.summary.innings_2.test_accuracy * 100)}%)</span>
      </div>
    </>
  );
}
