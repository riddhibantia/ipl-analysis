import { Fragment, useEffect, useState } from "react";
import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

export default function Analytics() {
  const [pca, setPca] = useState(null);
  useEffect(() => {
    fetch("/api/analytics/pca").then((r) => r.json()).then(setPca).catch(() => {});
  }, []);
  if (!pca) return <p className="micro-label">Loading PCA…</p>;
  const won = pca.points.filter((p) => p.team1_win === 1);
  const lost = pca.points.filter((p) => p.team1_win === 0);
  const feats = pca.features;
  const cellColor = (v) => {
    const a = Math.min(1, Math.abs(v));
    if (v > 0.05) return `rgba(216,255,2,${0.08 + a * 0.75})`;
    if (v < -0.05) return `rgba(136,161,255,${0.08 + a * 0.75})`;
    return "rgba(255,255,255,0.07)";
  };
  return (
    <div>
      <div className="glass p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Match-state PCA</h3>
        <p className="micro-label mb-1 normal-case">
          {pca.n} matches · PC1 {Math.round(pca.explained_variance[0] * 100)}% + PC2 {Math.round(pca.explained_variance[1] * 100)}% variance ·
          lime = team 1 won. Overlap is the story: pre-toss states barely separate.
        </p>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="x" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.15)" }} />
              <YAxis dataKey="y" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.15)" }} />
              <Tooltip cursor={{ stroke: "rgba(255,255,255,0.2)" }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded-xl border border-white/15 bg-black/90 px-3 py-2 text-xs">
                    <b>{payload[0].payload.team1} vs {payload[0].payload.team2}</b>
                    <div className="text-white/60">Season {payload[0].payload.season} · team 1 {payload[0].payload.team1_win ? "won" : "lost"}</div>
                  </div>
                ) : null} />
              <Scatter name="team 1 won" data={won} fill="#D8FF02" opacity={0.55}>
                {won.map((_, i) => <Cell key={i} />)}
              </Scatter>
              <Scatter name="team 1 lost" data={lost} fill="#88A1FF" opacity={0.55}>
                {lost.map((_, i) => <Cell key={i} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="mb-1 text-lg font-semibold">Before PCA — feature correlation</h3>
          <p className="micro-label mb-3 normal-case">Why the win model stays linear: diffs, not raw columns.</p>
          <HeatGrid feats={feats} get={(a, b) => pca.corr_before[a][b]} cellColor={cellColor} />
        </div>
        <div className="glass p-5">
          <h3 className="mb-1 text-lg font-semibold">PCA loadings</h3>
          <p className="micro-label mb-3 normal-case">Which features drive each component.</p>
          <div className="space-y-2">
            {feats.map((f) => (
              <div key={f} className="grid grid-cols-[150px_1fr_52px] items-center gap-2 text-xs">
                <span className="truncate text-white/60">{f}</span>
                <div className="flex h-2 gap-1 overflow-hidden">
                  <div className="flex flex-1 justify-end rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#D8FF02]" style={{ width: `${Math.min(100, Math.abs(pca.loadings[f][0]) * 150)}%` }} />
                  </div>
                  <div className="flex flex-1 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#88A1FF]" style={{ width: `${Math.min(100, Math.abs(pca.loadings[f][1]) * 150)}%` }} />
                  </div>
                </div>
                <span className="tnum text-right text-white/60">PC1 {pca.loadings[f][0]} · PC2 {pca.loadings[f][1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeatGrid({ feats, get, cellColor }) {
  const short = (f) => f.replace("_diff", "Δ").replace("_edge", "◊").replace("toss_team1", "toss").replace("toss_decision_bat", "decide").replace("season_year", "season");
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[420px]" style={{ gridTemplateColumns: `90px repeat(${feats.length}, 1fr)` }}>
        <div />
        {feats.map((f) => <div key={f} className="micro-label !text-[9px] truncate px-1 text-center">{short(f)}</div>)}
        {feats.map((a) => (
          <Fragment key={a}>
            <div key={a + "-l"} className="micro-label !text-[9px] truncate py-1 pr-1 text-right">{short(a)}</div>
            {feats.map((b) => (
              <div key={a + b} title={`${a} × ${b} = ${get(a, b)}`}
                className="m-[1.5px] rounded-md px-1 py-1.5 text-center text-[10px] font-semibold tnum"
                style={{ background: cellColor(get(a, b)) }}>
                {get(a, b).toFixed(2).replace("0.", ".")}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
