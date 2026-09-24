"""AI match preview: free no-key endpoint with honest template fallback."""

import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "model"

POLLINATIONS_URL = "https://text.pollinations.ai/{prompt}"


def template_preview(team1, team2, venue):
    """Deterministic preview composed purely from our own stats."""
    current = json.loads((MODEL_DIR / "current_stats.json").read_text())
    ratings = {r["team"]: r for r in
               json.loads((MODEL_DIR / "ratings.json").read_text())}
    venues = {v["venue"]: v for v in
              json.loads((MODEL_DIR / "venues.json").read_text())}
    r1 = ratings.get(team1, {})
    r2 = ratings.get(team2, {})
    v = venues.get(venue, {})
    h2h = current.get("h2h", {})
    edge = h2h.get(f"{team1}||{team2}")
    if edge is None and f"{team2}||{team1}" in h2h:
        edge = 1.0 - h2h[f"{team2}||{team1}"]
    lines = [
        f"{team1} meet {team2} at {venue}.",
        (f"Elo says {team1} ({r1.get('elo', '?')}) vs {team2} "
         f"({r2.get('elo', '?')}); recent form "
         f"{round(r1.get('last5', 0.5) * 100)}% vs {round(r2.get('last5', 0.5) * 100)}%."),
    ]
    if edge is not None:
        lines.append(f"Head-to-head leans {team1 if edge >= 0.5 else team2} "
                     f"({round(max(edge, 1 - edge) * 100)}% share).")
    if v:
        lines.append(f"At this ground captains bat first "
                     f"{round(v.get('bat_first_pct', 0) * 100)}% of the time.")
    return " ".join(lines)


def ai_preview(team1, team2, venue, timeout=12):
    """Try the free Pollinations endpoint; fall back to the template."""
    prompt = (
        f"In 3 sentences, preview a T20 cricket match: {team1} vs {team2} "
        f"at {venue}. {template_preview(team1, team2, venue)} "
        f"Add one tactical point about toss and chase."
    )
    url = POLLINATIONS_URL.format(prompt=urllib.parse.quote(prompt))
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ipl-pulse/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode("utf-8", errors="ignore").strip()
        if len(text) > 40:
            return {"text": text, "source": "ai"}
    except Exception:
        pass
    return {"text": template_preview(team1, team2, venue), "source": "template"}
