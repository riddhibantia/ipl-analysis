import { useEffect, useState } from "react";
import { Logo, pct1 } from "../ui";

export default function Rankings({ meta, season }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    fetch(`/api/rankings${season ? `?season=${season}` : ""}`)
      .then((r) => r.json()).then((d) => setRows(d.rows)).catch(() => {});
  }, [season]);
  const max = Math.max(1, ...rows.map((r) => r.wins));
  return (
    <div className="glass p-5 sm:p-6">
      <h3 className="text-lg font-semibold">Top winning teams{season ? ` · ${season}` : " · all time"}</h3>
      <p className="micro-label mb-4 normal-case">Victory tally — lime leads, periwinkle chases.</p>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.team} className="flex items-center gap-3">
            <span className={`tnum w-7 text-lg font-semibold ${i === 0 ? "text-[#D8FF02]" : "text-white/50"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <Logo team={r} size={38} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-sm">
                <b className="truncate">{r.team}</b>
                <span className="tnum text-white/60">{r.wins}W · {r.played}M · {pct1(r.win_pct)}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="fill-in h-full rounded-full"
                  style={{ width: `${Math.round((r.wins / max) * 100)}%`,
                    background: i === 0 ? "#D8FF02" : "#88A1FF" }} />
              </div>
            </div>
            <b className="tnum w-10 text-right text-2xl font-semibold">{String(r.wins).padStart(2, "0")}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
