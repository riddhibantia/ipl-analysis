# IPL Match Data Analysis

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)
![Jupyter](https://img.shields.io/badge/Jupyter-Notebook-orange?logo=jupyter&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

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
- Visualizations: Heatmap, Histograms, Pair Plot, Bar Chart, Violin Plot

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
IPL-Analysis/
├── ipl_analysis.ipynb        # PCA analysis notebook
├── ipl_sql_analysis.ipynb    # SQL analysis notebook
├── matches.csv               # IPL match dataset
├── requirements.txt          # Python dependencies
├── .gitignore                # Git ignore rules
└── README.md                 # Project documentation
```

## Requirements

```bash
pip install -r requirements.txt
```

## How to Run

1. Clone the repository:
   ```bash
   git clone https://github.com/siddhibantia/IPL-Analysis.git
   cd IPL-Analysis
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch Jupyter Notebook:
   ```bash
   jupyter notebook
   ```

4. Open and run either notebook:
   - `ipl_analysis.ipynb` for PCA analysis
   - `ipl_sql_analysis.ipynb` for SQL analysis

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
- **NumPy** - Numerical operations
- **SQLite3** - SQL database
- **Scikit-learn** - PCA and preprocessing
- **Matplotlib & Seaborn** - Visualization
- **SciPy** - Statistical analysis

## License

This project is for educational purposes.
