"""
Full end-to-end EDA test with NCDC data
"""
import sys
sys.path.insert(0, '.')

import pandas as pd
from backend.config import detect_source_type, auto_suggest_mapping
from backend.eda.runner import run_eda

print("="*60)
print("NCDC TASKA - FULL EDA PIPELINE TEST")
print("="*60)

# Load NCDC data
df = pd.read_excel(
    'data/Status Kesihatan Kanak-Kanak Kebangsaan (NCDC) .xlsx',
    sheet_name='Sheet1Johor',
    nrows=200
)

print(f"Loaded {len(df)} rows, {len(df.columns)} columns from NCDC Johor")

# Detect source and auto-map
source = detect_source_type(df.columns.tolist())
mapping = auto_suggest_mapping(df.columns.tolist(), source)

print(f"Detected source: {source}")
print(f"Auto-mapped {len([v for v in mapping.values() if v])} fields")

# Run full EDA
print("\n" + "="*60)
print("RUNNING EDA PIPELINE")
print("="*60)

report = run_eda(df, mapping, source)

# Show results
print(f"\nFinal row count: {report['total_rows']} (after pivot + processing)")
print(f"Mapped standard fields: {report['n_mapped_standard']}")
print(f"\nChanges applied:")
for change in report['changes_applied']:
    print(f"  • {change}")

# WHO z-scores
if 'zscore_summary' in report:
    print(f"\nWHO z-scores computed:")
    for k, v in report['zscore_summary'].items():
        print(f"  {k}: {v}")

# Indicators
if report.get('indicators'):
    print(f"\nKKM Indicators Summary:")
    for age_group, indicators in report['indicators'].items():
        if age_group in ['bawah_2_tahun', 'bawah_5_tahun']:
            print(f"\n  {age_group.replace('_', ' ').title()}:")
            for ind_name, ind_data in indicators.items():
                if isinstance(ind_data, dict) and 'overall' in ind_data:
                    overall = ind_data['overall']
                    print(f"    {ind_name}: {overall['n_affected']}/{overall['n_total']} = {overall['pct']:.1f}%")

# Quality score
if report.get('data_quality_score'):
    score = report['data_quality_score']
    print(f"\nData Quality: {score.get('total_score', 0):.1f}/100 (Grade: {score.get('grade', 'N/A')})")

# IC validation
if report.get('ic_validation'):
    ic = report['ic_validation']
    print(f"\nIC Validation: {ic.get('total_valid', 0)} valid, {ic.get('total_issues', 0)} issues")

# Tableau aggregated rows
if 'aggregated_preview' in report:
    print(f"\nTableau aggregated table: {len(report.get('_aggregated_full', []))} rows")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60)
