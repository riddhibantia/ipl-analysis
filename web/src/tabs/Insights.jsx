import { useEffect, useState } from "react";
import { DualBar, pct1 } from "../ui";

export default function Insights() {
  const [toss, setToss] = useState(null);
  const [heat, setHeat] = useState(null);
  useEffect(() => {
    fetch("/api/insights/toss").then((r) => r.json()).then(setToss).catch(() => {});
    fetch("/api/analytics/toss-heatmap?top=8").then((r) => r.json()).then(setHeat).catch(() => {});
  }, []);
  if (!toss || !heat) return <p className="micro-label">Loading insights…</p>;
  const bat = toss.find((t) => t.toss_decision === "bat");
  const field = toss.find((t) => t.toss_decision === "field");
  const findings = [
    ["Chasing wins tosses' value", `Captains who field first take the match ${pct1(field?.toss_winner_won_match)} of the time vs ${pct1(bat?.toss_winner_won_match)} batting first.`],
    ["Chepauk still bats", "Chennai is the outlier ground where captains bat first over 60% of the time — spin, slowness, scoreboard pressure."],
    ["Wankhede chases", "At Mumbai only ~25% of toss-winners bat first — dew plus short boundaries make chasing dominant."],
    ["The toss is worth ~5 points", "Overall toss-winners win ~52–53% — real, but dwarfed by in-match state (chase model AUC 0.92)."],
  ];
  return (
    <div>
      <div className="glass p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Toss decision impact</h3>
        <p className="micro-label mb-3 normal-case">Does winning the toss convert to winning the match?</p>
        <DualBar label="Toss→win conversion" left={field?.toss_winner_won_match} right={bat?.toss_winner_won_match} format={pct1} />
        <div className="micro-label mt-1 flex justify-between"><span>Field first ({field?.n} matches)</span><span>Bat first ({bat?.n} matches)</span></div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {findings.map(([t, s]) => (
          <div key={t} className="glass glass-hover p-5">
            <div className="mb-2 h-1 w-10 rounded-full bg-[#D8FF02]" />
            <h4 className="font-semibold">{t}</h4>
            <p className="mt-1 text-sm text-white/60">{s}</p>
          </div>
        ))}
      </div>
      <div className="glass mt-4 p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Venue × decision heatmap</h3>
        <p className="micro-label mb-3 normal-case">Toss-winner match conversion. Lime ≥55%, periwinkle 45–55%.</p>
        <div className="overflow-x-auto">
          <table className="dark-table min-w-[520px]">
            <thead><tr><th>Venue</th><th>Bat first</th><th>Field first</th><th>Matches</th></tr></thead>
            <tbody>
              {heat.rows.map((r) => (
                <tr key={r.venue}>
                  <td className="max-w-[260px] truncate">{r.venue}</td>
                  <HeatCell c={r.bat} />
                  <HeatCell c={r.field} />
                  <td className="tnum">{r.matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HeatCell({ c }) {
  const bg = c.pct == null ? "rgba(255,255,255,0.06)"
    : c.pct >= 0.55 ? "rgba(216,255,2,0.22)"
    : c.pct >= 0.45 ? "rgba(136,161,255,0.2)" : "rgba(224,36,36,0.2)";
  const fg = c.pct == null ? "rgba(255,255,255,0.35)"
    : c.pct >= 0.55 ? "#D8FF02" : c.pct >= 0.45 ? "#88A1FF" : "#f87171";
  return (
    <td title={`n=${c.n}`}>
      <span className="tnum inline-block min-w-[86px] rounded-lg px-2 py-1 text-center text-[13px] font-semibold"
        style={{ background: bg, color: fg }}>
        {c.pct == null ? "No data yet" : `${Math.round(c.pct * 100)}% · ${c.n}`}
      </span>
    </td>
  );
}
