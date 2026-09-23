async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export const api = {
  meta: () => getJSON("/api/meta"),
  ratings: () => getJSON("/api/ratings"),
  venues: () => getJSON("/api/venues"),
  metrics: () => getJSON("/api/metrics"),
  liveCurve: () => getJSON("/api/live-curve"),
  matchCentre: (p) =>
    getJSON("/api/match-centre?" + new URLSearchParams(p).toString()),
  toss: (body) =>
    getJSON("/api/toss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  live: (body) =>
    getJSON("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  form: (team, n = 5) =>
    getJSON(`/api/insights/form?team=${encodeURIComponent(team)}&n=${n}`),
};

export const MONTHS = [
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
];
