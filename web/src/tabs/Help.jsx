export default function Help() {
  const blocks = [
    ["Overview", "Start here: season pulse, head-to-head explorer, toss heatmap and season record."],
    ["Matches", "Searchable results explorer — filter by season, team or text, newest first."],
    ["Match Centre", "Pick two teams + venue: Elo, head-to-head, form, venue edge and toss call."],
    ["Live", "Set overs/runs/wickets (+ target in a chase) for win probability from the ball-by-ball model. Try a preset."],
    ["Teams", "Tap a team: strengths/weaknesses vs league average, phase splits, chase/defence/home/away, form."],
    ["Players", "Batting and bowling leaderboards, career or 2025–26, with search."],
    ["Venues", "Bat-first tendency and toss-to-win conversion per ground."],
    ["Analytics", "PCA scatter of match states + feature correlations — why pre-toss prediction is hard."],
    ["Rankings", "Victory tally, all-time or per season."],
    ["Insights", "Toss-impact findings and the venue × decision heatmap."],
    ["Toss Lab", "Bat-first vs chase advisor for any venue and month."],
    ["Model", "Methodology, honest metrics, and API reference."],
  ];
  return (
    <div className="glass p-5 sm:p-6">
      <h3 className="text-lg font-semibold">What lives where</h3>
      <p className="micro-label mb-4 normal-case">Every tab, one line. Data: 1,243 IPL matches (2008–2026) + 295k balls.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map(([t, s]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <b className="text-sm">{t}</b>
            <p className="mt-1 text-[13px] text-white/60">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
