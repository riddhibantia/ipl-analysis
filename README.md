# IPL 2025 Player Stats Analysis and Prediction

Analysis of IPL (Indian Premier League) match data using Principal Component Analysis (PCA) for dimensionality reduction and pattern recognition.

## Problem Statement

To predict IPL match outcomes by analyzing the underlying factors within the high-dimensional match dataset. After preprocessing the raw data, we apply PCA to reduce the numerous features into a concise set of latent components. Then we visualize these components to identify and understand hidden patterns and team behaviors. Finally, we use this reduced feature space to build an efficient and accurate classification model.

## Steps Covered

1. **Data Cleaning** - Handle missing values, duplicates, and invalid entries
2. **Data Processing** - Convert types (e.g., date), normalize text
3. **Data Transformation** - Encode categorical variables
4. **Feature Engineering** - Create new useful features
5. **Feature Selection** - Drop irrelevant or redundant features
6. **Handling & Balancing Data** - Address class imbalance
7. **Splitting Data** - Train/Test split
8. **PCA** - Principal Component Analysis for dimensionality reduction
9. **Correlation Analysis** - Before and after PCA

## Requirements

```bash
pip install -r requirements.txt
```

## Usage

Open `ipl_analysis.ipynb` in Jupyter Notebook or Google Colab:

```bash
jupyter notebook ipl_analysis.ipynb
```

## Dataset

The project uses `matches.csv` containing IPL match data with 1095 rows and 20 columns including match details, teams, venues, and results.

## License

This project is for educational purposes.
