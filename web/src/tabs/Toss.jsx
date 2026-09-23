import { useState } from "react";
import { MONTHS, api } from "../api";
import { Card, Field, KV, Meter, PrimaryButton, inputCls, pct1 } from "../ui";

export default function Toss({ meta }) {
  const [venue, setVenue] = useState("M Chinnaswamy Stadium, Bengaluru");
  const [month, setMonth] = useState("4");
  const [data, setData] = useState(null);

  async function run() {
    setData(await api.toss({ venue, month: +month, season_year: 2024 }));
  }

  return (
    <>
      <Card>
        <h2 className="text-[17px] font-bold">Toss Lab</h2>
        <p className="mb-1 text-[13px] text-slate-500">
          What does the captain do after winning the toss here? Model: venue + month + season.
        </p>
        <Field label="Venue">
          <select className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)}>
            {meta.venues.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Month">
          <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <PrimaryButton onClick={run}>Get toss advice</PrimaryButton>
      </Card>
      {data && (
        <Card key={data.venue} className="fade-in">
          <h3 className="mb-3 border-l-4 border-[var(--color-accent)] pl-2.5 text-xs font-extrabold uppercase tracking-[1.1px] text-slate-500">
            {data.venue}
          </h3>
          <div className="flex items-center gap-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-violet-50 p-3.5">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent2)] text-lg font-extrabold text-white">T</div>
            <div className="min-w-0 flex-1 text-[15px]">
              <b>{data.recommendation}</b>
              <Meter pct={data.recommendation.startsWith("bat") ? data.p_bat_first * 100 : data.p_bowl_first * 100} />
              <span className="text-[13px] text-slate-500">
                Bat first {Math.round(data.p_bat_first * 100)}% · Bowl first {Math.round(data.p_bowl_first * 100)}%
              </span>
            </div>
          </div>
          {data.venue_history && (
            <div className="mt-2">
              <KV k="Matches analysed" v={data.venue_history.matches} />
              <KV k="Captains batting first" v={pct1(data.venue_history.bat_first_pct)} />
              <KV k="Toss winners winning match" v={pct1(data.venue_history.toss_win_match_win_pct)} />
            </div>
          )}
        </Card>
      )}
    </>
  );
}
