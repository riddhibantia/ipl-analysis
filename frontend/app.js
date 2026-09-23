/* IPL Intelligence frontend. No build step, no external JS deps. */
const $ = (id) => document.getElementById(id);
const state = { meta: null, ratings: [], venues: [] };

function logoHTML(team, size) {
  // team: {short, color, logo, name}
  const fb = `this.style.display='none';this.nextElementSibling.style.display='flex';`;
  return `<img class="logo" src="${team.logo || ""}" alt="${team.short}" ` +
    `onerror="${fb}" ${team.logo ? "" : "style='display:none'"}>` +
    `<div class="badge" style="display:${team.logo ? "none" : "flex"};background:${team.color}">${team.short}</div>`;
}

function codeChip(t) {
  return `<span class="code" style="background:${t.color}">${t.short}</span>`;
}

/* Dual-sided compare row: left value | label | right value + team-color bar */
function cmpRow(label, v1, v2, t1, t2, fmt) {
  fmt = fmt || ((x) => x);
  const a = Math.max(v1, 0.001), b = Math.max(v2, 0.001);
  const p = a / (a + b);
  return `<div class="cmp"><div class="cmp-head"><b>${fmt(v1)}</b><span>${label}</span><b class="r">${fmt(v2)}</b></div>` +
    pctBar(p, t1.color, t2.color) + `</div>`;
}

const pct1 = (x) => Math.round(x * 100) + "%";

function pctBar(p, c1, c2) {
  const a = Math.round(p * 100);
  return `<div class="bar split" style="--c1:${c1};--c2:${c2}">` +
    `<div style="width:${a}%"></div><div style="width:${100 - a}%"></div></div>`;
}

async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function initTabs() {
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".tabpage").forEach((x) =>
      x.classList.toggle("active", x.id === "tab-" + b.dataset.tab));
  });
}

function fillSelect(el, items, selected) {
  el.innerHTML = items.map((t) => `<option ${t === selected ? "selected" : ""}>${t}</option>`).join("");
}

async function init() {
  initTabs();
  state.meta = await getJSON("/api/meta");
  const teams = state.meta.teams.map((t) => t.name);
  fillSelect($("mc-t1"), teams, "Mumbai Indians");
  fillSelect($("mc-t2"), teams, "Chennai Super Kings");
  fillSelect($("mc-venue"), state.meta.venues, "Wankhede Stadium, Mumbai");
  fillSelect($("toss-venue"), state.meta.venues, "M Chinnaswamy Stadium, Bengaluru");
  state.ratings = await getJSON("/api/ratings");
  state.venues = await getJSON("/api/venues");
  renderTeams(); renderVenues(); renderRatings();
  initLive();
  const m = await getJSON("/api/metrics");
  const cvs = Object.values(m.cv_auc).flat();
  $("m-cv").textContent = (cvs.reduce((a, b) => a + b, 0) / cvs.length).toFixed(2);
  $("m-acc").textContent = Math.round(m.test.accuracy * 100) + "%";
  try {
    const lm = await getJSON("/api/live-curve");
    $("m-live2").textContent = lm.summary.innings_2.test_auc.toFixed(2);
    $("m-live1").textContent = lm.summary.innings_1.test_auc.toFixed(2);
  } catch (e) { /* live model optional */ }
  $("mc-go").onclick = runCentre;
  $("toss-go").onclick = runToss;
  runCentre();
}

async function runCentre() {
  $("mc-out").innerHTML = `<div class="card"><p class="sub">Loading preview…</p></div>`;
  const p = new URLSearchParams({
    team1: $("mc-t1").value, team2: $("mc-t2").value, venue: $("mc-venue").value,
    month: $("mc-month").value,
  });
  const d = await getJSON("/api/match-centre?" + p.toString());
  const t1 = d.team1, t2 = d.team2;
  const h = d.head_to_head.team1_pct;
  const form = async (name) => {
    const f = await getJSON("/api/insights/form?team=" + encodeURIComponent(name) + "&n=5");
    return f.recent.map((r) => `<span class="pill ${r.winner === name ? "w" : "l"}">${r.winner === name ? "W" : "L"}</span>`).join("");
  };
  const [f1, f2] = await Promise.all([form(t1.name), form(t2.name)]);
  const tb = Math.round(d.toss.p_bat_first * 100);
  const vh = d.toss.venue_history;
  $("mc-out").innerHTML = `
    <div class="card duel" style="--t1:${t1.color};--t2:${t2.color}">
      <div class="vs">
        <div class="team">${codeChip(t1)}${logoHTML(t1)}<h3>${t1.name}</h3>
          <div class="elo">Elo ${t1.elo} · ${t1.played} matches</div></div>
        <div class="vsmark">VS</div>
        <div class="team">${codeChip(t2)}${logoHTML(t2)}<h3>${t2.name}</h3>
          <div class="elo">Elo ${t2.elo} · ${t2.played} matches</div></div>
      </div>
      <p class="muted" style="margin-bottom:0">${d.toss.venue}</p>
    </div>
    <div class="card"><div class="sect">Team comparison</div>
      ${cmpRow("Elo rating", t1.elo, t2.elo, t1, t2, (x) => Math.round(x))}
      ${cmpRow("All-time win %", t1.win_pct, t2.win_pct, t1, t2, pct1)}
      ${cmpRow("Last-5 form", t1.last5, t2.last5, t1, t2, pct1)}
      ${cmpRow("Head-to-head share", h, 1 - h, t1, t2, pct1)}
      <div class="kv"><span>${t1.short} recent</span><span>${f1}</span></div>
      <div class="kv"><span>${t2.short} recent</span><span>${f2}</span></div>
    </div>
    <div class="card"><div class="sect">Toss verdict</div>
      <div class="verdict"><div class="tic">T</div>
        <div><b>Win the toss and ${d.toss.recommendation}</b>
          <div class="meter"><div style="width:${d.toss.recommendation.startsWith("bat") ? tb : 100 - tb}%"></div></div>
          <span class="muted">Model: bat first ${tb}% · bowl first ${100 - tb}%</span>
        </div>
      </div>
      ${vh ? `<div class="kv"><span>Matches at venue</span><b>${vh.matches}</b></div>
        <div class="kv"><span>Captains bat first</span><b>${pct1(vh.bat_first_pct)}</b></div>
        <div class="kv"><span>Toss winners take the match</span><b>${pct1(vh.toss_win_match_win_pct)}</b></div>` : ""}
    </div>`;
}

async function runToss() {
  const d = await getJSON("/api/toss", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venue: $("toss-venue").value, month: +$("toss-month").value }),
  });
  const bat = Math.round(d.p_bat_first * 100);
  const vh = d.venue_history;
  $("toss-out").innerHTML = `<div class="card"><div class="sect">${d.venue}</div>
    <div class="verdict"><div class="tic">T</div>
      <div style="flex:1"><b>${d.recommendation}</b>
        <div class="meter"><div style="width:${d.recommendation.startsWith("bat") ? bat : 100 - bat}%"></div></div>
        <span class="muted">Bat first ${bat}% · Bowl first ${100 - bat}%</span>
      </div>
    </div>
    ${vh ? `<div class="kv"><span>Matches analysed</span><b>${vh.matches}</b></div>
      <div class="kv"><span>Captains batting first</span><b>${pct1(vh.bat_first_pct)}</b></div>
      <div class="kv"><span>Toss winners winning match</span><b>${pct1(vh.toss_win_match_win_pct)}</b></div>` : ""}
    </div>`;
}

function renderTeams() {
  const max = Math.max(...state.ratings.map((r) => r.elo));
  const min = Math.min(...state.ratings.map((r) => r.elo));
  $("team-grid").innerHTML = state.meta.teams.map((t) => {
    const r = state.ratings.find((x) => x.name === t.name) || {};
    const w = r.elo ? Math.round(((r.elo - min) / (max - min)) * 100) : 0;
    return `<div class="tcard" data-team="${t.name}">${logoHTML(t)}<h4>${t.short}</h4>
      <div class="meta">Elo ${r.elo || "–"}</div>
      <div class="bar"><div style="width:${w}%"></div></div>
      <div class="meta">${r.win_pct ? Math.round(r.win_pct * 100) + "% all-time wins" : ""}</div></div>`;
  }).join("");
  document.querySelectorAll(".tcard").forEach((c) => (c.onclick = () => showTeam(c.dataset.team)));
}

async function showTeam(name) {
  document.querySelectorAll(".tcard").forEach((c) => c.classList.toggle("sel", c.dataset.team === name));
  const f = await getJSON("/api/insights/form?team=" + encodeURIComponent(name) + "&n=5");
  const pills = f.recent.map((r) => `<span class="pill ${r.winner === name ? "w" : "l"}">${r.winner === name ? "W" : "L"}</span>`).join("");
  $("team-out").innerHTML = `<div class="card"><div class="sect">${name} — form guide</div>
    <p>${pills}</p>
    <table><tr><th>Date</th><th>Fixture</th><th>Venue</th><th>Winner</th></tr>
    ${f.recent.map((r) => `<tr><td>${r.date.slice(0, 10)}</td><td>${r.team1} vs ${r.team2}</td><td>${r.venue}</td><td><b>${r.winner}</b></td></tr>`).join("")}
    </table></div>`;
}

function renderVenues() {
  $("venue-table").innerHTML = `<table><tr><th>#</th><th>Venue</th><th>Mat</th><th>Bat-first tendency</th><th>Toss→win</th></tr>
    ${state.venues.slice(0, 20).map((v, i) => `<tr><td><span class="rank${i < 3 ? " top" : ""}">${i + 1}</span></td>
      <td>${v.venue}</td><td>${v.matches}</td>
      <td style="min-width:140px"><div class="bar"><div style="width:${Math.round(v.bat_first_pct * 100)}%"></div></div>${pct1(v.bat_first_pct)}</td>
      <td><b>${pct1(v.toss_win_match_win_pct)}</b></td></tr>`).join("")}</table>`;
}

function renderRatings() {
  const max = Math.max(...state.ratings.map((r) => r.elo));
  const min = Math.min(...state.ratings.map((r) => r.elo));
  $("ratings-table").innerHTML = `<table><tr><th>#</th><th>Team</th><th>Elo</th><th>W%</th><th>Last-5</th></tr>
    ${state.ratings.map((r, i) => `<tr><td><span class="rank${i < 3 ? " top" : ""}">${i + 1}</span></td>
      <td><span class="pill" style="background:${r.color}">${r.short}</span> ${r.name}</td>
      <td style="min-width:140px"><div class="bar"><div style="width:${Math.round(((r.elo - min) / (max - min)) * 100)}%"></div></div><b>${r.elo}</b></td>
      <td>${pct1(r.win_pct)}</td><td>${pct1(r.last5)}</td></tr>`).join("")}</table>`;
}

function initLive() {
  const teams = state.meta.teams.map((t) => t.name);
  fillSelect($("live-bat"), teams, "Chennai Super Kings");
  fillSelect($("live-bowl"), teams, "Mumbai Indians");
  fillSelect($("live-venue"), state.meta.venues, "Wankhede Stadium, Mumbai");
  $("live-over").oninput = () => {
    $("live-over-v").textContent = $("live-over").value;
    if (+$("live-inn").value === 2) autoTarget();
  };
  $("live-inn").onchange = () => {
    const chase = $("live-inn").value === "2";
    $("live-target-wrap").style.display = chase ? "block" : "none";
    $("live-over").max = chase ? 19 : 20;
    if (chase) autoTarget();
  };
  $("live-go").onclick = runLive;
  renderPresets();
  renderCurve();
}

const PRESETS = [
  { name: "Powerplay surge", inn: 1, over: 6, runs: 65, wkts: 1, target: null },
  { name: "Mid-innings rebuild", inn: 1, over: 12, runs: 110, wkts: 4, target: null },
  { name: "Death overs", inn: 1, over: 18, runs: 175, wkts: 5, target: null },
  { name: "Comfortable chase", inn: 2, over: 12, runs: 120, wkts: 2, target: 180 },
  { name: "Tense finish", inn: 2, over: 18, runs: 160, wkts: 5, target: 180 },
  { name: "Miracle needed", inn: 2, over: 19, runs: 150, wkts: 7, target: 185 },
];

function renderPresets() {
  $("live-presets").innerHTML = PRESETS.map((s, i) =>
    `<button class="chip" data-preset="${i}">${s.name}</button>`).join("");
  document.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => {
    const s = PRESETS[+b.dataset.preset];
    $("live-inn").value = String(s.inn);
    $("live-inn").onchange();
    $("live-over").value = s.over; $("live-over-v").textContent = s.over;
    $("live-runs").value = s.runs; $("live-wkts").value = s.wkts;
    if (s.target) $("live-target").value = s.target;
    runLive();
  }));
}

function autoTarget() {
  // sensible default: venue par + 1
  const v = state.venues.find((x) => x.venue === $("live-venue").value);
  if (v) $("live-target").value = 165;
}

async function runLive() {
  const body = {
    innings: +$("live-inn").value,
    batting_team: $("live-bat").value, bowling_team: $("live-bowl").value,
    venue: $("live-venue").value, over: +$("live-over").value,
    runs: +$("live-runs").value, wkts: +$("live-wkts").value,
    target: $("live-inn").value === "2" ? +$("live-target").value : null,
  };
  let d;
  try {
    d = await getJSON("/api/live", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch (e) { $("live-out").innerHTML = `<div class="card"><p class="sub">${e.message}</p></div>`; return; }
  const p = Math.round(d.prob_batting * 100);
  const fav = d.favorite === d.batting_team ? d.batting : d.bowling;
  const chase = d.state.target != null;
  const score = chase
    ? `${d.batting.short} ${d.state.runs}/${d.state.wkts} (${d.state.over}) · need ${d.state.target - d.state.runs} off ${(20 - d.state.over) * 6} balls`
    : `${d.batting.short} ${d.state.runs}/${d.state.wkts} (${d.state.over}) · projected ${d.state.projected} vs par ${Math.round(d.state.venue_par)}`;
  $("live-out").innerHTML = `
    <div class="card duel" style="--t1:${d.batting.color};--t2:${d.bowling.color}">
      <div class="sect" style="text-align:left">${chase ? "2nd innings · chase" : "1st innings"} · ${d.venue}</div>
      <div class="vs">
        <div class="team">${codeChip(d.batting)}${logoHTML(d.batting)}<h3>${d.batting_team}</h3><div class="elo">batting</div></div>
        <div><div class="ring" style="background:conic-gradient(${fav.color} ${p}%, #e8edf4 ${p}% 100%)">
          <div><b>${p}%</b><span>win</span></div></div></div>
        <div class="team">${codeChip(d.bowling)}${logoHTML(d.bowling)}<h3>${d.bowling_team}</h3><div class="elo">bowling</div></div>
      </div>
      <div class="verdict" style="margin-top:12px;text-align:left"><div class="tic">◷</div>
        <div><b>${score}</b><br><span class="muted">${d.note} · ${fav.short} favourites</span></div>
      </div>
    </div>
    <div class="card"><div class="sect">Why this number</div>
    ${d.factors.map((f) => `<div class="kv"><span>${f.label}</span><b>${f.favours}</b></div>`).join("")}
    </div>`;
}

async function renderCurve() {
  let c;
  try { c = await getJSON("/api/live-curve"); }
  catch (e) { $("live-curve").innerHTML = `<p class="muted">Train the live model first (<code>python -m src.train</code>).</p>`; return; }
  const rows = c.curve.filter((r) => r.over % 1 === 0 && (r.over <= 20));
  const step = rows.filter((_, i) => i % 2 === 0);
  $("live-curve").innerHTML = `<div class="curve">` + step.map((r) => `
    <div class="col"><div class="bars">
      <div class="b1" title="1st inn ${(r.inn1 * 100) | 0}%" style="height:${Math.round((r.inn1 || 0) * 100)}px"></div>
      <div class="b2" title="chase ${(r.inn2 * 100) | 0}%" style="height:${Math.round((r.inn2 || 0) * 100)}px"></div>
    </div><small>${r.over}</small></div>`).join("") + `</div>
    <div class="legend"><span><span class="dot" style="background:var(--accent)"></span>1st innings (test acc ${Math.round(c.summary.innings_1.test_accuracy * 100)}%)</span>
    <span><span class="dot" style="background:#f79009"></span>chase (test acc ${Math.round(c.summary.innings_2.test_accuracy * 100)}%)</span></div>`;
}

init().catch((e) => { document.querySelector("main").innerHTML = `<div class="card"><h2>Backend not ready</h2><p class="sub">${e.message}</p></div>`; });
