import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const META = {
  teams: [
    { name: "Mumbai Indians", short: "MI", color: "#004BA0", logo: null },
    { name: "Chennai Super Kings", short: "CSK", color: "#FFCB05", logo: null },
  ],
  venues: ["Wankhede Stadium, Mumbai"],
  seasons: [2024, 2025, 2026],
};

const OVERVIEW = {
  seasons: [2024, 2025, 2026], matches: 1243, balls: 295556, teams: 10,
  top_teams_recent: [], orange_cap: null, purple_cap: null,
};

const BASE_ROUTES = [
  ["/api/meta", META],
  ["/api/ratings", []],
  ["/api/venues", []],
  ["/api/overview", OVERVIEW],
  ["/api/matches", { total: 0, rows: [] }],
  ["/api/rankings", { rows: [] }],
  ["/api/analytics/toss-heatmap", { rows: [] }],
  ["/api/matchups/top", { rows: [] }],
];

function mockFetch(routes) {
  global.fetch = vi.fn((url) => {
    for (const [match, body] of routes) {
      if (url.includes(match)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      }
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function sidebarNav(container) {
  return within(container.querySelector("aside nav"));
}

function sidebarFooter(container) {
  return within(container.querySelector("aside").querySelector("div.relative"));
}

beforeEach(() => {
  window.location.hash = "";
  mockFetch(BASE_ROUTES);
});

describe("IPL Pulse shell", () => {
  it("renders exactly 8 sidebar nav items", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    expect(sidebarNav(container).getAllByRole("button")).toHaveLength(8);
  });

  it("shows search, season picker and notifications bell", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByPlaceholderText("Search matches…")).toBeInTheDocument());
    expect(screen.getByLabelText(/Notifications/)).toBeInTheDocument();
    expect(screen.getByLabelText("Search matches")).toBeInTheDocument();
  });

  it("restores tab from URL hash", async () => {
    window.location.hash = "#tab=players";
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Show leaderboard")).toBeInTheDocument());
    expect(sidebarNav(container).getByText("Players")).toHaveClass("bg-[#D8FF02]");
  });
});

describe("Sidebar footer", () => {
  it("opens notifications with live data", async () => {
    mockFetch([
      ["/api/overview", { ...OVERVIEW,
        orange_cap: { batter: "V Kohli", runs: 675, sr: 157.0 },
        purple_cap: { bowler: "J Bumrah", wickets: 30, econ: 7.1 } }],
      ["/api/metrics", { test: { accuracy: 0.8, roc_auc: 0.67 } }],
      ...BASE_ROUTES,
    ]);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    fireEvent.click(sidebarFooter(container).getByLabelText(/Notifications/));
    await waitFor(() => expect(screen.getByText(/Orange Cap: V Kohli/)).toBeInTheDocument());
    expect(screen.getByText(/Toss model holdout/)).toBeInTheDocument();
  });

  it("opens settings, toggles motion and persists", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    fireEvent.click(sidebarFooter(container).getByLabelText("Settings"));
    const toggle = screen.getByText("Reduce motion");
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(true);
    expect(localStorage.getItem("ipl-reduced-motion")).toBe("1");
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(false);
  });

  it("opens the profile card with repo link", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    fireEvent.click(sidebarFooter(container).getByLabelText("Profile"));
    expect(screen.getByText("Riddhi Bantia")).toBeInTheDocument();
    const link = screen.getByText("Open GitHub repo");
    expect(link.getAttribute("href")).toContain("github.com/riddhibantia/ipl-analysis");
  });

  it("toggles light theme and persists", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    fireEvent.click(sidebarFooter(container).getByLabelText("Settings"));
    fireEvent.click(screen.getByText("Light theme"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("ipl-theme")).toBe("light");
  });

  it("opens a deep-linked live predictor via hash sub", async () => {
    window.location.hash = "#tab=matches&sub=live";
    render(<App />);
    await waitFor(() => expect(screen.getByText("Live Win Predictor")).toBeInTheDocument());
    expect(screen.getByText("Tense finish")).toBeInTheDocument();
  });
});

describe("Matches explorer", () => {
  it("shows the no-matches empty state", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    fireEvent.click(sidebarNav(container).getByText("Matches"));
    await waitFor(() => expect(screen.getByText("No matches found")).toBeInTheDocument());
  });

  it("lists matches with winner pills", async () => {
    mockFetch([
      ["/api/matches", {
        total: 1,
        rows: [{ id: 1, season: 2026, date: "2026-05-31", venue: "Ahmedabad",
          team1: { name: "Gujarat Titans", short: "GT", color: "#1B2133", logo: null },
          team2: { name: "Royal Challengers Bengaluru", short: "RCB", color: "#EC1C24", logo: null },
          winner: "Royal Challengers Bengaluru",
          result: "Royal Challengers Bengaluru won by 5 wickets",
          player_of_match: null }],
      }],
      ...BASE_ROUTES,
    ]);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    fireEvent.click(sidebarNav(container).getByText("Matches"));
    await waitFor(() => expect(screen.getByText(/won by 5 wickets/)).toBeInTheDocument());
  });
});

describe("Players", () => {
  it("searches and renders the leaderboard", async () => {
    mockFetch([
      ["/api/players", {
        role: "batting", era: "recent", count: 1,
        rows: [{ batter: "V Kohli", runs: 675, balls: 430, sr: 157.0, teams: ["Royal Challengers Bengaluru"] }],
      }],
      ...BASE_ROUTES,
    ]);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Season Pulse")).toBeInTheDocument());
    fireEvent.click(sidebarNav(container).getByText("Players"));
    fireEvent.click(screen.getByText("Show leaderboard"));
    await waitFor(() => expect(screen.getByText("V Kohli")).toBeInTheDocument());
  });
});
