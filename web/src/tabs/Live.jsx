import { useEffect, useState } from "react";
import { api } from "../api";
import { CodeChip, Field, KV, Logo, PrimaryButton } from "../ui";

const darkInput = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-[#D8FF02] focus:outline-none [&>option]:bg-[#0B1830]";

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
    setTimeout(() => runWith({ inn: s.inn, over: s.over, runs: s.runs, wkts: s.wkts, target: s.target }), 0);
  }

  function body(ov) {
    return {
      innings: +ov.inn, batting_team: bat, bowling_team: bowl, venue,
      over: +ov.over, runs: +ov.runs, wkts: +ov.wkts,
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
      <div className="glass p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Live Win Predictor</h2>
        <p className="micro-label mb-1 normal-case">Ball-by-ball model (295k deliveries): set the match state, get win probability.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Field label="Innings">
              <select className={darkInput} value={inn} onChange={(e) => setInn(e.target.value)}>
                <option value="1">1st — setting a target</option>
                <option value="2">2nd — chase</option>
              </select>
            </Field>
            <Field label="Batting team">
              <select className={darkInput} value={bat} onChange={(e) => setBat(e.target.value)}>
                {teams.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Bowling team">
              <select className={darkInput} value={bowl} onChange={(e) => setBowl(e.target.value)}>
                {teams.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Venue">
              <select className={darkInput} value={venue} onChange={(e) => setVenue(e.target.value)}>
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
              <input type="number" className={darkInput} value={runs} min={0} max={300}
                onChange={(e) => setRuns(+e.target.value)} />
            </Field>
            <Field label="Wickets lost">
              <input type="number" className={darkInput} value={wkts} min={0} max={9}
                onChange={(e) => setWkts(+e.target.value)} />
            </Field>
            {chase && (
              <Field label="Target (chase)">
                <input type="number" className={darkInput} value={target} min={1} max={300}
                  onChange={(e) => setTarget(+e.target.value)} />
              </Field>
            )}
          </div>
        </div>
        <PrimaryButton onClick={run}>Predict</PrimaryButton>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((s) => (
            <button key={s.name} onClick={() => applyPreset(s)}
              className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium hover:border-[#D8FF02] hover:text-[#D8FF02]">
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="glass mt-4 p-5"><p className="micro-label">{err}</p></div>}
      {data && <LiveResult d={data} />}

      <div className="glass mt-4 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">How accuracy grows during a match</h2>
        <p className="micro-label mb-1 normal-case">Holdout accuracy by overs completed ({meta.seasons.slice(-2).join("–")}).</p>
        {curve ? <Curve c={curve} /> : <p className="micro-label">Loading…</p>}
      </div>
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
      <div className="glass mt-4 overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${d.batting.color}, ${d.bowling.color})` }} />
        <div className="p-5 text-center sm:p-6">
          <p className="micro-label mb-3">{chase ? "2nd innings · chase" : "1st innings"} · {d.venue}</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div><CodeChip team={d.batting} /><Logo team={d.batting} size={72} />
              <h3 className="mt-2 text-[15px] font-semibold">{d.batting_team}</h3>
              <div className="text-[13px] text-white/50">batting</div></div>
            <div className="mx-auto flex h-[158px] w-[158px] items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${fav.color} ${p}%, rgba(255,255,255,0.1) ${p}% 100%)` }}>
              <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-black">
                <b className="tnum text-[32px]">{p}%</b>
                <span className="micro-label">win</span>
              </div>
            </div>
            <div><CodeChip team={d.bowling} /><Logo team={d.bowling} size={72} />
              <h3 className="mt-2 text-[15px] font-semibold">{d.bowling_team}</h3>
              <div className="text-[13px] text-white/50">bowling</div></div>
          </div>
          <div className="mt-3 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#D8FF02] text-lg font-semibold text-black">◷</div>
            <div className="text-[15px]"><b>{score}</b><br />
              <span className="text-[13px] text-white/50">{d.note} · {fav.short} favourites</span>
            </div>
          </div>
        </div>
      </div>
      <div className="glass mt-4 p-5 sm:p-6">
        <h3 className="micro-label mb-2">Why this number</h3>
        {d.factors.map((f, i) => <KV key={i} k={f.label} v={f.favours} />)}
      </div>
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
              <div title={`1st inn ${Math.round((r.inn1 || 0) * 100)}%`} className="w-2 rounded-t bg-[#D8FF02]" style={{ height: `${Math.round((r.inn1 || 0) * 100)}px` }} />
              <div title={`chase ${Math.round((r.inn2 || 0) * 100)}%`} className="w-2 rounded-t bg-[#88A1FF]" style={{ height: `${Math.round((r.inn2 || 0) * 100)}px` }} />
            </div>
            <small className="text-[9px] text-white/40">{r.over}</small>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/50">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-[#D8FF02]" />1st innings (test acc {Math.round(c.summary.innings_1.test_accuracy * 100)}%)</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-[#88A1FF]" />chase (test acc {Math.round(c.summary.innings_2.test_accuracy * 100)}%)</span>
      </div>
    </>
  );
}
