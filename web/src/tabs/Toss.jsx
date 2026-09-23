import { useState } from "react";
import { MONTHS, api } from "../api";
import { Field, KV, PrimaryButton, pct1 } from "../ui";

const darkInput = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-[#D8FF02] focus:outline-none [&>option]:bg-[#0B1830]";

export default function Toss({ meta }) {
  const [venue, setVenue] = useState("M Chinnaswamy Stadium, Bengaluru");
  const [month, setMonth] = useState("4");
  const [data, setData] = useState(null);

  async function run() {
    setData(await api.toss({ venue, month: +month, season_year: 2026 }));
  }

  return (
    <>
      <div className="glass p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Toss Lab</h2>
        <p className="micro-label mb-1 normal-case">What does the captain do after winning the toss here? Model: venue + month + season.</p>
        <Field label="Venue">
          <select className={darkInput} value={venue} onChange={(e) => setVenue(e.target.value)}>
            {meta.venues.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Month">
          <select className={darkInput} value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <PrimaryButton onClick={run}>Get toss advice</PrimaryButton>
      </div>
      {data && (
        <div key={data.venue} className="glass mt-4 p-5 sm:p-6 fade-in">
          <h3 className="micro-label mb-3">{data.venue}</h3>
          <div className="flex items-center gap-3.5 rounded-2xl border border-[#D8FF02]/30 bg-[#D8FF02]/5 p-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#D8FF02] text-lg font-semibold text-black">T</div>
            <div className="min-w-0 flex-1 text-[15px]">
              <b>{data.recommendation}</b>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="fill-in h-full rounded-full bg-[#D8FF02]"
                  style={{ width: `${data.recommendation.startsWith("bat") ? data.p_bat_first * 100 : data.p_bowl_first * 100}%` }} />
              </div>
              <span className="micro-label">
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
        </div>
      )}
    </>
  );
}
