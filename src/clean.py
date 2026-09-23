"""Cleaning + normalization for IPL match data.

All name fixes live here so notebooks, training and the API share one source of truth.
"""

import pandas as pd

# Canonical modern team names. Defunct teams keep their historic name.
TEAM_CANON = {
    "Delhi Daredevils": "Delhi Capitals",
    "Rising Pune Supergiant": "Rising Pune Supergiants",
    "Rising Pune Supergiants": "Rising Pune Supergiants",
    "Kings XI Punjab": "Punjab Kings",
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
    "Royal Challengers Bengaluru": "Royal Challengers Bengaluru",
}

# Short codes used across UI + API. Defunct teams keep a code for history pages.
TEAM_SHORT = {
    "Mumbai Indians": "MI",
    "Chennai Super Kings": "CSK",
    "Kolkata Knight Riders": "KKR",
    "Royal Challengers Bengaluru": "RCB",
    "Rajasthan Royals": "RR",
    "Sunrisers Hyderabad": "SRH",
    "Delhi Capitals": "DC",
    "Punjab Kings": "PBKS",
    "Gujarat Titans": "GT",
    "Lucknow Super Giants": "LSG",
    "Deccan Chargers": "DEC",
    "Kochi Tuskers Kerala": "KTK",
    "Pune Warriors": "PWI",
    "Rising Pune Supergiants": "RPS",
    "Gujarat Lions": "GL",
}

# Official IPL site asset ids (iplt20.com) -> dark icon for light backgrounds.
TEAM_LOGO_ID = {
    "MI": "1854", "CSK": "1622", "KKR": "1873", "RCB": "2138", "RR": "1558",
    "SRH": "1153", "DC": "1396", "PBKS": "2040", "GT": "2879", "LSG": "2880",
}

# Brand colors (badge fallback + UI accents).
TEAM_COLORS = {
    "MI": "#004BA0", "CSK": "#F9CD05", "KKR": "#3A225D", "RCB": "#EC1C24",
    "RR": "#EA1A85", "SRH": "#F7A721", "DC": "#2561AE", "PBKS": "#ED1B24",
    "GT": "#1B1C1F", "LSG": "#A72056", "DEC": "#888888", "KTK": "#888888",
    "PWI": "#888888", "RPS": "#888888", "GL": "#888888",
}

# Substrings matching a team's home ground city.
HOME_CITIES = {
    "Mumbai Indians": ["mumbai", "wankhede", "dy patil", "bharabati"],
    "Chennai Super Kings": ["chennai", "chepauk"],
    "Kolkata Knight Riders": ["kolkata", "eden"],
    "Royal Challengers Bengaluru": ["bengaluru", "bangalore", "chinnaswamy"],
    "Rajasthan Royals": ["jaipur", "sawai mansingh", "guwahati"],
    "Sunrisers Hyderabad": ["hyderabad", "uppal"],
    "Delhi Capitals": ["delhi", "kotla", "arun jaitley", "raipur"],
    "Punjab Kings": ["mohali", "chandigarh", "dharamsala", "indore", "mullanpur"],
    "Gujarat Titans": ["ahmedabad", "narendra modi"],
    "Lucknow Super Giants": ["lucknow", "ekana"],
    "Deccan Chargers": ["hyderabad", "cuttack", "nagpur"],
    "Kochi Tuskers Kerala": ["kochi"],
    "Pune Warriors": ["pune"],
    "Rising Pune Supergiants": ["pune"],
    "Gujarat Lions": ["rajkot"],
}


def logo_url(short_code):
    """Official IPL CDN logo, or None for defunct teams (UI falls back to badge)."""
    tid = TEAM_LOGO_ID.get(short_code)
    if not tid:
        return None
    return (
        "https://www.iplt20.com/api/team-assets"
        f"?pathname=static%2Fteams%2F{tid}%2Ficon-dark.svg"
    )


def season_to_year(season):
    """'2007/08' -> 2007, '2020/21' -> 2020, '2022' -> 2022."""
    s = str(season).strip()
    first = s.split("/")[0]
    try:
        return int(first)
    except ValueError:
        return None


def normalize_team(name):
    if pd.isna(name):
        return name
    name = str(name).strip()
    return TEAM_CANON.get(name, name)


def short_code(team_name):
    return TEAM_SHORT.get(team_name, "?'")


def normalize_venue(venue):
    """Collapse 'Wankhede Stadium' vs 'Wankhede Stadium, Mumbai' style duplicates."""
    if pd.isna(venue):
        return "Unknown"
    v = str(venue).strip()
    low = v.lower()
    aliases = {
        "wankhede": "Wankhede Stadium, Mumbai",
        "eden gardens": "Eden Gardens, Kolkata",
        "chinnaswamy": "M Chinnaswamy Stadium, Bengaluru",
        "chepauk": "MA Chidambaram Stadium, Chepauk, Chennai",
        "kotla": "Arun Jaitley Stadium, Delhi",
        "feroz shah kotla": "Arun Jaitley Stadium, Delhi",
        "arun jaitley": "Arun Jaitley Stadium, Delhi",
        "uppal": "Rajiv Gandhi International Stadium, Uppal, Hyderabad",
        "sawai mansingh": "Sawai Mansingh Stadium, Jaipur",
        "dy patil": "Dr DY Patil Sports Academy, Mumbai",
        "dubai": "Dubai International Cricket Stadium",
        "sharjah": "Sharjah Cricket Stadium",
        "abu dhabi": "Sheikh Zayed Stadium, Abu Dhabi",
    }
    for key, canon in aliases.items():
        if key in low:
            return canon
    return v


def is_home(team, venue):
    if pd.isna(team) or pd.isna(venue):
        return False
    v = str(venue).lower()
    return any(c in v for c in HOME_CITIES.get(team, []))


def load_matches(path="matches.csv"):
    """Load + clean raw matches.csv. Returns dataframe sorted by date."""
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce", dayfirst=True)
    df = df.dropna(subset=["date"]).drop_duplicates()
    df["team1"] = df["team1"].apply(normalize_team)
    df["team2"] = df["team2"].apply(normalize_team)
    df["toss_winner"] = df["toss_winner"].apply(normalize_team)
    df["winner"] = df["winner"].apply(
        lambda w: normalize_team(w) if pd.notna(w) and str(w).strip().lower() != "no result" else pd.NA
    )
    df["venue"] = df["venue"].apply(normalize_venue)
    df["season_year"] = df["season"].apply(season_to_year)
    df = df.sort_values("date").reset_index(drop=True)
    # Decided matches only for modelling; keep raw count for UI honesty.
    df["decided"] = df["winner"].notna() & df["winner"].isin(
        pd.concat([df["team1"], df["team2"]]).unique()
    )
    return df
