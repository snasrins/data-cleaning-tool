"""
Test NCDC TASKA data loading and processing
"""
import sys
sys.path.insert(0, '.')

import pandas as pd
from backend.config import detect_source_type, auto_suggest_mapping
from backend.eda.runner import myvass_wide_to_long

# Load NCDC data (Johor sheet)
print("="*60)
print("LOADING NCDC TASKA DATA (Johor)")
print("="*60)

df = pd.read_excel(
    'data/Status Kesihatan Kanak-Kanak Kebangsaan (NCDC) .xlsx',
    sheet_name='Sheet1Johor',
    nrows=100
)

print(f"\nLoaded {len(df)} rows, {len(df.columns)} columns")
print(f"\nColumns: {list(df.columns)[:10]} ...")

# Test source detection
print("\n" + "="*60)
print("SOURCE DETECTION")
print("="*60)
source = detect_source_type(df.columns.tolist())
print(f"Detected source type: {source}")

# Test wide-to-long pivot BEFORE auto-mapping
print("\n" + "="*60)
print("WIDE-TO-LONG PIVOT TEST (BEFORE MAPPING)")
print("="*60)
print(f"Before pivot: {len(df)} rows, {len(df.columns)} columns")

df_long = myvass_wide_to_long(df)
print(f"After pivot: {len(df_long)} rows, {len(df_long.columns)} columns")

if 'tahun_ukur' in df_long.columns:
    print(f"\nYear distribution after pivot:")
    print(df_long['tahun_ukur'].value_counts().sort_index())

# Show new columns after pivot
print(f"\nColumns after pivot (first 20):")
print(list(df_long.columns)[:20])

# Test auto-mapping on pivoted data
print("\n" + "="*60)
print("AUTO-MAPPING (after pivot)")
print("="*60)
mapping = auto_suggest_mapping(df_long.columns.tolist(), source)
mapped = {k: v for k, v in mapping.items() if v}
print(f"Mapped {len(mapped)} fields:")
for k, v in mapped.items():
    print(f"  {k:20} -> {v}")

# Apply mapping
inv_map = {v: k for k, v in mapping.items() if v}
df_mapped = df_long.rename(columns=inv_map)

# Show sample
print("\n" + "="*60)
print("SAMPLE DATA (after pivot + mapping)")
print("="*60)
sample_cols = [c for c in ['id', 'nama', 'negeri', 'daerah', 'taska', 'tahun_ukur', 
                            'berat_kg', 'tinggi_cm', 'bmi', 'status_berat', 
                            'status_tinggi', 'status_bmi',
                            'tarikh_lahir', 'jantina', 'tarikh_ukur'] if c in df_mapped.columns]
print(df_mapped[sample_cols].head(10).to_string())

# Check nulls
print("\n" + "="*60)
print("NULL CHECK (critical fields)")
print("="*60)
critical = ['berat_kg', 'tinggi_cm', 'status_berat', 'status_tinggi', 'status_bmi', 'tahun_ukur']
for col in critical:
    if col in df_mapped.columns:
        null_pct = df_mapped[col].isna().sum() / len(df_mapped) * 100
        print(f"  {col:20} {null_pct:5.1f}% null")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60)
