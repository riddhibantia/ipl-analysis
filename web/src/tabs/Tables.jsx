import { Card, pct1 } from "../ui";
import { ShortPill, rankCls } from "./Teams";

export default function Venues({ venues }) {
  return (
    <Card>
      <h2 className="text-[17px] font-bold">Venues</h2>
      <p className="mb-1 text-[13px] text-slate-500">
        Where does batting first still win tosses? Toss-bat rate and toss-to-win conversion.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2.5">#</th><th className="px-2 py-2.5">Venue</th>
              <th className="px-2 py-2.5">Mat</th><th className="px-2 py-2.5">Bat-first tendency</th>
              <th className="px-2 py-2.5">Toss→win</th>
            </tr>
          </thead>
          <tbody>
            {venues.slice(0, 20).map((v, i) => (
              <tr key={v.venue} className="hover:bg-slate-50">
                <td className="border-b border-slate-200 px-2 py-2.5"><span className={rankCls(i)}>{i + 1}</span></td>
                <td className="border-b border-slate-200 px-2 py-2.5">{v.venue}</td>
                <td className="tnum border-b border-slate-200 px-2 py-2.5">{v.matches}</td>
                <td className="border-b border-slate-200 px-2 py-2.5" style={{ minWidth: 150 }}>
                  <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent2)]"
                      style={{ width: `${Math.round(v.bat_first_pct * 100)}%` }} />
                  </div>
                  <span className="tnum">{pct1(v.bat_first_pct)}</span>
                </td>
                <td className="border-b border-slate-200 px-2 py-2.5"><b className="tnum">{pct1(v.toss_win_match_win_pct)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Ratings({ ratings }) {
  const max = Math.max(...ratings.map((r) => r.elo));
  const min = Math.min(...ratings.map((r) => r.elo));
  return (
    <Card>
      <h2 className="text-[17px] font-bold">Elo Ratings</h2>
      <p className="mb-1 text-[13px] text-slate-500">Team strength from full match history (2008–2024). Higher is stronger.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2.5">#</th><th className="px-2 py-2.5">Team</th>
              <th className="px-2 py-2.5">Elo</th><th className="px-2 py-2.5">W%</th><th className="px-2 py-2.5">Last-5</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((r, i) => (
              <tr key={r.name} className="hover:bg-slate-50">
                <td className="border-b border-slate-200 px-2 py-2.5"><span className={rankCls(i)}>{i + 1}</span></td>
                <td className="border-b border-slate-200 px-2 py-2.5"><ShortPill r={r} /> {r.name}</td>
                <td className="border-b border-slate-200 px-2 py-2.5" style={{ minWidth: 150 }}>
                  <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent2)]"
                      style={{ width: `${Math.round(((r.elo - min) / (max - min)) * 100)}%` }} />
                  </div>
                  <b className="tnum">{r.elo}</b>
                </td>
                <td className="tnum border-b border-slate-200 px-2 py-2.5">{pct1(r.win_pct)}</td>
                <td className="tnum border-b border-slate-200 px-2 py-2.5">{pct1(r.last5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
