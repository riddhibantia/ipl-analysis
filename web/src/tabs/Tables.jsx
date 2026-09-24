import { TeamBadge, pct1 } from "../ui";

export function rankCls(i) {
  return `tnum inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg text-xs font-semibold ${
    i < 3 ? "bg-[#D8FF02] text-black" : "bg-white/10 text-white/60"}`;
}

export function ShortPill({ r }) {
  return (
    <span className="mr-1 inline-block min-w-7 rounded-lg bg-white/10 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
      {r.short}
    </span>
  );
}

export default function Venues({ venues }) {
  return (
    <div className="glass p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Venues</h2>
      <p className="micro-label mb-3 normal-case">Bat-first tendency and toss-to-win conversion per ground.</p>
      <div className="overflow-x-auto">
        <table className="dark-table min-w-[560px]">
          <thead><tr><th>#</th><th>Venue</th><th>Mat</th><th>Bat-first tendency</th><th>Toss→win</th></tr></thead>
          <tbody>
            {venues.slice(0, 20).map((v, i) => (
              <tr key={v.venue}>
                <td><span className={rankCls(i)}>{i + 1}</span></td>
                <td>{v.venue}</td>
                <td className="tnum">{v.matches}</td>
                <td style={{ minWidth: 150 }}>
                  <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#D8FF02]" style={{ width: `${Math.round(v.bat_first_pct * 100)}%` }} />
                  </div>{pct1(v.bat_first_pct)}
                </td>
                <td><b className="tnum">{pct1(v.toss_win_match_win_pct)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Ratings({ ratings }) {
  const max = Math.max(...ratings.map((r) => r.elo));
  const min = Math.min(...ratings.map((r) => r.elo));
  return (
    <div className="glass p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Elo Ratings</h2>
      <p className="micro-label mb-3 normal-case">Team strength from full match history (2008–2026). Higher is stronger.</p>
      <div className="overflow-x-auto">
        <table className="dark-table min-w-[560px]">
          <thead><tr><th>#</th><th>Team</th><th>Elo</th><th>W%</th><th>Last-5</th></tr></thead>
          <tbody>
            {ratings.map((r, i) => (
              <tr key={r.name}>
                <td><span className={rankCls(i)}>{i + 1}</span></td>
                <td><TeamBadge team={r} size={28} /> <ShortPill r={r} /> {r.name}</td>
                <td style={{ minWidth: 150 }}>
                  <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#D8FF02] to-[#88A1FF]"
                      style={{ width: `${Math.round(((r.elo - min) / Math.max(max - min, 1)) * 100)}%` }} />
                  </div><b className="tnum">{r.elo}</b>
                </td>
                <td className="tnum">{pct1(r.win_pct)}</td>
                <td className="tnum">{pct1(r.last5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
