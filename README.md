# IPL 2025 Player Stats Analysis and Prediction

Analysis of IPL (Indian Premier League) match data using **PCA (Principal Component Analysis)** and **SQL queries** for data exploration, pattern recognition, and insight extraction.

## Problem Statement

To predict IPL match outcomes by analyzing the underlying factors within the high-dimensional match dataset. After preprocessing the raw data, we apply PCA to reduce the numerous features into a concise set of latent components. Then we visualize these components to identify and understand hidden patterns and team behaviors. Finally, we use SQL queries to extract deeper insights about team performance, toss impact, venue statistics, and player achievements.

## Notebooks

### 1. `ipl_analysis.ipynb` - PCA Analysis
- Data Cleaning & Preprocessing
- Feature Engineering & Transformation
- StandardScaler & LabelEncoder
- PCA (Principal Component Analysis)
- Correlation Analysis (Before & After PCA)

### 2. `ipl_sql_analysis.ipynb` - SQL Analysis
- SQLite database setup and data loading
- 10 analytical SQL queries:
  1. Matches per season
  2. Top winning teams
  3. Toss decision impact
  4. Match results distribution
  5. Top venues
  6. Player of the match leaders
  7. Head-to-head matchups
  8. Season-wise top teams
  9. City-wise statistics
  10. Toss + match win patterns
- Data visualizations for each query

## Project Structure

```
ipl-analysis/
├── ipl_analysis.ipynb       # PCA analysis notebook
├── ipl_sql_analysis.ipynb   # SQL analysis notebook
├── ipl_data.db              # SQLite database (auto-generated)
├── matches.csv              # IPL match dataset
├── README.md
└── requirements.txt
```

## Requirements

```bash
pip install -r requirements.txt
```

## Usage

### PCA Analysis:
```bash
jupyter notebook ipl_analysis.ipynb
```

### SQL Analysis:
```bash
jupyter notebook ipl_sql_analysis.ipynb
```

## Dataset

The project uses `matches.csv` containing IPL match data with **1095 rows** and **20 columns** including:
- Match ID, Season, City, Date
- Teams (team1, team2)
- Toss details
- Match results and margins
- Venue and umpire information

## Tools Used

- **Python** - Programming language
- **Pandas** - Data manipulation
- **SQLite3** - SQL database
- **SQLAlchemy** - Database connectivity
- **Scikit-learn** - PCA and preprocessing
- **Matplotlib & Seaborn** - Visualization

## License

This project is for educational purposes.
