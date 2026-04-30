"""Quick check of data structure"""
import pandas as pd

file = "pemakanan_anthropometry_jan_apr_2026.xlsx"
print(f"Reading {file}...")

df = pd.read_excel(file, nrows=5)
print(f"\nRows (sample): 5")
print(f"Columns: {len(df.columns)}")
print(f"\nColumn names:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. {col}")

print(f"\nFirst 2 rows:")
print(df.head(2).to_string())
