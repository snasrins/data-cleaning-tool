"""
Test clinic birth data (backward compatibility check)
"""
import sys
sys.path.insert(0, '.')

import pandas as pd
from backend.config import detect_source_type, auto_suggest_mapping
from backend.eda.runner import run_eda

print("="*60)
print("CLINIC BIRTH DATA - COMPATIBILITY TEST")
print("="*60)

# Load clinic data
df = pd.read_csv(
    'data/PenyediaanGISStatusPemakananKanakkanak.csv',
    nrows=500
)

print(f"Loaded {len(df)} rows, {len(df.columns)} columns from clinic CSV")

# Detect source and auto-map
source = detect_source_type(df.columns.tolist())
mapping = auto_suggest_mapping(df.columns.tolist(), source)

print(f"Detected source: {source}")
print(f"Auto-mapped {len([v for v in mapping.values() if v])} fields")
print(f"\nKey mappings:")
for field in ['id', 'jantina', 'tarikh_lahir', 'berat_kg', 'tinggi_cm', 'negeri', 'daerah']:
    if field in mapping:
        print(f"  {field:20} -> {mapping[field]}")

# Run full EDA
print("\n" + "="*60)
print("RUNNING EDA PIPELINE")
print("="*60)

report = run_eda(df, mapping, source)

# Show results
print(f"\nFinal row count: {report['total_rows']}")
print(f"Mapped standard fields: {report['n_mapped_standard']}")
print(f"\nChanges applied:")
for change in report['changes_applied'][:6]:  # First 6 only
    if isinstance(change, str):
        print(f"  • {change}")
    else:
        print(f"  • {change.get('action', 'unknown')}: {change.get('description', '')}")

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

# IC validation
if report.get('ic_validation'):
    ic = report['ic_validation']
    print(f"\nIC Validation: {ic.get('total_valid', 0)} valid, {ic.get('total_issues', 0)} issues")
    if ic.get('issue_breakdown'):
        print(f"  Issue types: {list(ic['issue_breakdown'].keys())}")

# Audit rows
if report.get('ic_audit_rows'):
    print(f"  Audit rows captured: {len(report['ic_audit_rows'])}")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60)
