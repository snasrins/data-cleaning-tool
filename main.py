from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import pandas as pd
import numpy as np
import io
import json
import re
from typing import Optional
import math
import sys
from pathlib import Path

# Add backend directory to path for imports
backend_dir = Path(__file__).parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import WHO z-score calculation
try:
    from eda.who_zscore import add_who_zscores, zscore_mismatch_report
    WHO_ZSCORE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: WHO z-score module not available: {e}")
    WHO_ZSCORE_AVAILABLE = False

app = FastAPI(title="EDA Pipeline — Pemakanan Kanak-kanak")


# ─── JSON SAFE HELPER ──────────────────────────────────────────────────────────
# Convert numpy / pandas types to JSON-safe Python natives (prevents serialization crash)

def json_safe(obj):
    """Recursively convert numpy/pandas types to JSON-serialisable Python types."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [json_safe(v) for v in obj]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if math.isnan(v) or math.isinf(v) else v
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (np.ndarray,)):
        return json_safe(obj.tolist())
    # pandas NA / NaT
    try:
        if pd.isna(obj):
            return None
    except (ValueError, TypeError):
        pass
    # Timestamp
    if isinstance(obj, (pd.Timestamp,)):
        return obj.isoformat() if pd.notna(obj) else None
    return obj


# ─── BIRTH WEIGHT CLASSIFICATION (WHO standards) ──────────────────────────────

def classify_birth_weight(weight_kg):
    """Classify birth weight according to WHO categories."""
    if weight_kg is None or pd.isna(weight_kg):
        return None
    try:
        w = float(weight_kg)
        if w <= 0 or w > 7:
            return None
        if w < 1.0:
            return "Extremely Low (<1.0 kg)"
        elif w < 1.5:
            return "Very Low (1.0-1.5 kg)"
        elif w < 2.5:
            return "Low (1.5-2.5 kg)"  # LBW
        elif w < 4.0:
            return "Normal (2.5-4.0 kg)"
        else:
            return "Macrosomia (≥4.0 kg)"
    except (ValueError, TypeError):
        return None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SCHEMA ────────────────────────────────────────────────────────────────────

STANDARD_SCHEMA = {
    "id":               {"type": "identifier", "description": "Unique child ID / MyKid / IC"},
    "nama":             {"type": "text",        "description": "Child name"},
    "jantina":          {"type": "categorical", "description": "Gender (M/F)"},
    "tarikh_lahir":     {"type": "date",        "description": "Date of birth"},
    "negeri":           {"type": "categorical", "description": "State"},
    "daerah":           {"type": "categorical", "description": "District"},
    "taska":            {"type": "text",        "description": "TASKA / Clinic name"},
    "pendapatan":       {"type": "categorical", "description": "Income group (B40/M40/T20)"},
    "kumpulan_umur":    {"type": "categorical", "description": "Age group"},
    "tarikh_ukur":      {"type": "date",        "description": "Measurement date"},
    "berat_kg":         {"type": "numerical",   "description": "Weight (kg)"},
    "tinggi_cm":        {"type": "numerical",   "description": "Height/Length (cm)"},
    "bmi":              {"type": "numerical",   "description": "BMI value"},
    "status_berat":     {"type": "categorical", "description": "Weight-for-age status"},
    "status_tinggi":    {"type": "categorical", "description": "Height-for-age status"},
    "status_bmi":       {"type": "categorical", "description": "BMI-for-age status"},
    "tahun_ukur":       {"type": "categorical", "description": "Measurement year"},
    "sumber":           {"type": "categorical", "description": "Data source"},
}

# ─── GEO HIERARCHY: SABAH & SARAWAK ───────────────────────────────────────────

SABAH_KAWASAN_MAP = {
    "kota kinabalu": "Pantai Barat", "penampang": "Pantai Barat",
    "papar": "Pantai Barat", "tuaran": "Pantai Barat",
    "menggatal": "Pantai Barat", "putatan": "Pantai Barat",
    "lok kawi": "Pantai Barat",
    "keningau": "Pedalaman", "tambunan": "Pedalaman",
    "nabawan": "Pedalaman", "tenom": "Pedalaman", "pensiangan": "Pedalaman",
    "kudat": "Kudat", "kota marudu": "Kudat", "pitas": "Kudat", "banggi": "Kudat",
    "sandakan": "Sandakan", "beluran": "Sandakan",
    "kinabatangan": "Sandakan", "tongod": "Sandakan",
    "lahad datu": "Lahad Datu", "semporna": "Lahad Datu",
    "kunak": "Lahad Datu", "silam": "Lahad Datu",
    "tawau": "Tawau", "kalabakan": "Tawau", "cowie": "Tawau",
    "beaufort": "Pedalaman Selatan", "sipitang": "Pedalaman Selatan",
}

SARAWAK_BAHAGIAN_MAP = {
    "kuching": "Bahagian Kuching", "bau": "Bahagian Kuching", "lundu": "Bahagian Kuching",
    "samarahan": "Bahagian Samarahan", "kota samarahan": "Bahagian Samarahan",
    "asajaya": "Bahagian Samarahan", "simunjan": "Bahagian Samarahan",
    "serian": "Bahagian Serian", "tebedu": "Bahagian Serian",
    "sri aman": "Bahagian Sri Aman", "lubok antu": "Bahagian Sri Aman",
    "betong": "Bahagian Betong", "spaoh": "Bahagian Betong",
    "sarikei": "Bahagian Sarikei", "meradong": "Bahagian Sarikei", "julau": "Bahagian Sarikei",
    "sibu": "Bahagian Sibu", "dalat": "Bahagian Sibu",
    "mukah": "Bahagian Mukah", "selangau": "Bahagian Mukah",
    "kapit": "Bahagian Kapit", "song": "Bahagian Kapit", "belaga": "Bahagian Kapit",
    "bintulu": "Bahagian Bintulu", "tatau": "Bahagian Bintulu",
    "miri": "Bahagian Miri", "marudi": "Bahagian Miri",
    "niah": "Bahagian Miri", "subis": "Bahagian Miri",
    "limbang": "Bahagian Limbang", "lawas": "Bahagian Limbang",
}

def get_kawasan_bahagian(negeri_val, daerah_val):
    if pd.isna(negeri_val) or pd.isna(daerah_val):
        return None
    n = str(negeri_val).strip().lower()
    d = str(daerah_val).strip().lower()
    if n == "sabah":
        return SABAH_KAWASAN_MAP.get(d)
    elif n == "sarawak":
        return SARAWAK_BAHAGIAN_MAP.get(d)
    return None

# ─── IC VALIDATION ─────────────────────────────────────────────────────────────
# Rules:
#   • Valid Malaysian IC (NRIC/MyKid): exactly 12 digits (YYMMDDPBXXXX)
#   • Suffix like _1, _2 → strip suffix, validate base
#   • Scientific notation (2.00E+11) → convert first
#   • Starts with letter (DEPOTSDK0021) → classify as system_id, do NOT fix
#   • < 12 digits (381211, 2595) → mark as short_id / invalid
#   • > 12 digits → truncate to 12 for cleaned, mark invalid_ic

def validate_ic(ic_val) -> dict:
    if pd.isna(ic_val) or str(ic_val).strip() in ["", "<NA>", "nan", "NaN", "None"]:
        return {"valid": False, "issue": "missing", "cleaned": None, "type": "missing"}

    raw = str(ic_val).strip()

    # Handle scientific notation (e.g. 2.00E+11)
    if re.match(r"^\d+\.?\d*[Ee][+\-]?\d+$", raw):
        try:
            raw = str(int(float(raw)))
        except Exception:
            return {"valid": False, "issue": "scientific_notation_unconvertible", "cleaned": None, "type": "invalid"}

    # Starts with a letter → system_id (DEPOTSDK0021, etc.) — do NOT try to fix
    if re.match(r"[A-Za-z]", raw):
        return {"valid": False, "issue": "system_id", "cleaned": None, "type": "system_id"}

    # Strip suffix (_1, _2, -1, -2, etc.) from base
    base = re.split(r"[_\-]", raw)[0]
    digits_only = re.sub(r"\D", "", base)

    if len(digits_only) == 12:
        # Validate embedded date (YYMMDD)
        try:
            mm = int(digits_only[2:4])
            dd = int(digits_only[4:6])
            if not (1 <= mm <= 12):
                return {"valid": False, "issue": "invalid_month_in_ic", "cleaned": digits_only, "type": "invalid_ic"}
            if not (1 <= dd <= 31):
                return {"valid": False, "issue": "invalid_day_in_ic", "cleaned": digits_only, "type": "invalid_ic"}
        except Exception:
            return {"valid": False, "issue": "date_parse_error", "cleaned": digits_only, "type": "invalid_ic"}
        return {"valid": True, "issue": None, "cleaned": digits_only, "type": "valid_ic"}

    elif len(digits_only) < 12:
        return {
            "valid": False,
            "issue": f"too_short_{len(digits_only)}_digits",
            "cleaned": digits_only if digits_only else None,
            "type": "short_id",
        }
    else:
        # > 12 digits: keep first 12 as cleaned but flag
        return {
            "valid": False,
            "issue": f"too_long_{len(digits_only)}_digits",
            "cleaned": digits_only[:12],
            "type": "invalid_ic",
        }


# ─── ID ANALYSIS + DEDUP ──────────────────────────────────────────────────────
# FIX D: always return (df, dedup_df) regardless of path

def analyze_and_deduplicate_ids(df: pd.DataFrame, report: dict):
    if "id" not in df.columns:
        return df, df.copy()   # ← FIX D: always 2-tuple

    results = df["id"].apply(validate_ic)

    df["id_cleaned"] = [r["cleaned"] for r in results]  # single assignment
    df["id_type"]    = [r["type"]    for r in results]
    df["is_valid_ic"] = df["id_type"] == "valid_ic"

    # ID type breakdown
    type_counts    = df["id_type"].value_counts().to_dict()
    unique_children = df[df["is_valid_ic"]]["id_cleaned"].nunique()

    child_counts = (
        df[df["is_valid_ic"]]
        .groupby("id_cleaned")
        .size()
        .reset_index(name="n_records")
    )
    multi_records = int((child_counts["n_records"] > 1).sum())

    # Dedup — keep latest measurement per cleaned IC
    dedup_df = df.copy()
    if "tarikh_ukur" in df.columns:
        dedup_df["_tarikh_ukur_dt"] = pd.to_datetime(df["tarikh_ukur"], errors="coerce")
        dedup_df = (
            dedup_df.sort_values("_tarikh_ukur_dt")
            .drop_duplicates(subset=["id_cleaned"], keep="last")
            .drop(columns=["_tarikh_ukur_dt"])
        )

    report["id_analysis"] = {
        "total_records": len(df),
        "valid_ic_records": int(df["is_valid_ic"].sum()),
        "unique_children": int(unique_children),
        "children_with_multiple_records": multi_records,
        "id_type_distribution": type_counts,
        "note": "Dedup berdasarkan id_cleaned (IC 12 digit). Rekod tarikh_ukur terbaru disimpan.",
    }

    # Single change log entry (FIX B: no duplicates)
    report["changes_applied"].append({
        "action": "id_classification_and_dedup_ready",
        "description": f"{unique_children} kanak-kanak unik dikenalpasti daripada {len(df)} rekod",
        "column": "id_cleaned",
        "before": {"total_records": len(df)},
        "after":  {"unique_children": int(unique_children)},
        "impact_pct": round((1 - int(unique_children) / len(df)) * 100, 1) if len(df) else 0,
        "rows_affected": len(df),
    })

    return df, dedup_df


# ─── NORMALISATION ──────────────────────────────────────────────────────────────

GENDER_MAP = {
    "male": "M", "lelaki": "M", "l": "M", "m": "M",
    "female": "F", "perempuan": "F", "wanita": "F", "p": "F", "f": "F",
}
STATUS_BERAT_VALID = {
    "normal", "kurang berat badan", "lebihan berat badan",
    "pemantauan lanjut", "obes", "risiko berlebihan berat badan", "berlebihan berat badan"
}
STATUS_TINGGI_VALID = {"tinggi normal", "bantut", "bantut teruk", "tinggi"}
STATUS_BMI_VALID = {
    "berat badan normal", "susut", "obes", "berlebihan berat badan",
    "risiko berlebihan berat badan", "kurang berat badan"
}
INCOME_MAP = {"b40": "B40", "m40": "M40", "t20": "T20"}

BMI_GROUPED_MAP = {
    "susut": "susut",
    "berat badan normal": "normal",
    "kurang berat badan": "kurang",
    "risiko berlebihan berat badan": "obes_berlebihan",
    "berlebihan berat badan": "obes_berlebihan",
    "obes": "obes_berlebihan",
}

# Severity score helper (FIX: consistent 1-5 scoring)
def severity_score(pct_missing: float) -> int:
    if pct_missing >= 50: return 5
    if pct_missing >= 30: return 4
    if pct_missing >= 15: return 3
    if pct_missing >= 5:  return 2
    return 1

def normalise_gender(val):
    if pd.isna(val): return None
    return GENDER_MAP.get(str(val).strip().lower(), str(val).strip())

def normalise_income(val):
    if pd.isna(val): return None
    return INCOME_MAP.get(str(val).strip().lower(), str(val).strip())

def check_spelling(val, valid_set, field_name):
    if pd.isna(val) or str(val).strip() == "":
        return {"original": val, "issue": "missing", "suggestion": None, "severity": "medium", "severity_score": 2}
    clean = str(val).strip().lower()
    if clean in valid_set:
        return {"original": val, "issue": None, "suggestion": None}
    from difflib import get_close_matches
    matches = get_close_matches(clean, valid_set, n=1, cutoff=0.6)
    return {
        "original": val,
        "issue": f"unrecognised_{field_name}",
        "suggestion": matches[0] if matches else None,
        "severity": "high" if not matches else "medium",
        "severity_score": 4 if not matches else 2,
    }

# ─── AGE ───────────────────────────────────────────────────────────────────────

def calc_age_months(dob, ref_date):
    try:
        if pd.isna(dob) or pd.isna(ref_date): return None
        dob, ref = pd.to_datetime(dob), pd.to_datetime(ref_date)
        return (ref.year - dob.year) * 12 + (ref.month - dob.month)
    except Exception:
        return None

def age_group_label(months):
    if months is None: return None
    if months < 12:  return "Bawah 1 Tahun (0-11 bulan)"
    if months < 24:  return "1 Tahun (12-23 bulan)"
    if months < 36:  return "2 Tahun (24-35 bulan)"
    if months < 48:  return "3 Tahun (36-47 bulan)"
    if months < 60:  return "4 Tahun (48-59 bulan)"
    return "5 Tahun ke atas (≥60 bulan)"

# ─── NUMERICAL SUMMARY ─────────────────────────────────────────────────────────

def compute_numerical_summary(df: pd.DataFrame) -> dict:
    BIO_RANGES = {
        "berat_kg": (0.5, 80), "tinggi_cm": (30, 200),
        "bmi": (5, 60), "age_months_computed": (0, 120),
    }
    summary = {}
    for col in ["berat_kg", "tinggi_cm", "bmi", "age_months_computed"]:
        if col not in df.columns: continue
        s = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(s) == 0: continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        lo3, hi3 = q1 - 3.0 * iqr, q3 + 3.0 * iqr
        outlier_mask = (s < lo) | (s > hi)
        extreme_mask = (s < lo3) | (s > hi3)
        # biological plausibility
        bio_lo, bio_hi = BIO_RANGES.get(col, (None, None))
        bio_outliers = 0
        if bio_lo is not None:
            bio_outliers = int(((s < bio_lo) | (s > bio_hi)).sum())
        # z-score > 3
        z_mean, z_std = float(s.mean()), float(s.std())
        z_outliers = int(((s - z_mean).abs() / z_std > 3).sum()) if z_std > 0 else 0

        mode_vals = s.mode()
        mode_val = round(float(mode_vals.iloc[0]), 2) if len(mode_vals) > 0 else None

        summary[col] = {
            "n": int(len(s)),
            "min": round(float(s.min()), 2), "max": round(float(s.max()), 2),
            "range": round(float(s.max() - s.min()), 2),
            "mean": round(float(s.mean()), 2), "median": round(float(s.median()), 2),
            "mode": mode_val,
            "std": round(float(s.std()), 2),
            "skewness": round(float(s.skew()), 3),
            "kurtosis": round(float(s.kurtosis()), 3),
            "p5": round(float(s.quantile(0.05)), 2), "p25": round(float(q1), 2),
            "p75": round(float(q3), 2), "p95": round(float(s.quantile(0.95)), 2),
            "outliers_iqr": int(outlier_mask.sum()),
            "extreme_outliers_iqr": int(extreme_mask.sum()),
            "outliers_zscore": z_outliers,
            "outliers_bio": bio_outliers,
            "bio_range": [bio_lo, bio_hi] if bio_lo is not None else None,
            "iqr_bounds": [round(float(lo), 2), round(float(hi), 2)],
            "boxplot": {
                "q1": round(float(q1), 2), "median": round(float(s.median()), 2),
                "q3": round(float(q3), 2),
                "whisker_lo": round(float(s[s >= lo].min()), 2) if (s >= lo).any() else round(float(s.min()), 2),
                "whisker_hi": round(float(s[s <= hi].max()), 2) if (s <= hi).any() else round(float(s.max()), 2),
                "outlier_points": sorted(s[outlier_mask].round(2).tolist())[:50],
            },
        }
    return summary

# ─── CATEGORICAL SUMMARY ───────────────────────────────────────────────────────

def compute_categorical_summary(df: pd.DataFrame) -> dict:
    summary = {}
    for col in ["negeri", "daerah", "jantina", "pendapatan", "status_berat", "status_tinggi", "status_bmi"]:
        if col not in df.columns: continue
        filled = df[col].fillna("TIADA DATA")
        counts = filled.value_counts(dropna=False)
        pcts   = (filled.value_counts(normalize=True, dropna=False) * 100).round(2)
        summary[col] = {
            "counts": counts.to_dict(),
            "pct": pcts.to_dict(),
            "unique": int(df[col].nunique(dropna=True)),
        }
    return summary

# ─── BMI CONSISTENCY ───────────────────────────────────────────────────────────
# FIX F: bmi_threshold exposed as parameter (defaults to 1.0)

def check_bmi_consistency(df: pd.DataFrame, threshold: float = 1.0) -> dict:
    result = {"checked": False, "n_checked": 0, "n_mismatch": 0, "pct_mismatch": 0.0}
    if not all(c in df.columns for c in ["berat_kg", "tinggi_cm", "bmi"]):
        return result
    w = pd.to_numeric(df["berat_kg"], errors="coerce")
    h = pd.to_numeric(df["tinggi_cm"], errors="coerce")
    b = pd.to_numeric(df["bmi"], errors="coerce")
    mask = w.notna() & h.notna() & b.notna() & (h > 0)
    n_checked = int(mask.sum())
    if n_checked == 0: return result
    bmi_calc  = w[mask] / ((h[mask] / 100) ** 2)
    diff      = (bmi_calc - b[mask]).abs()
    n_mismatch = int((diff > threshold).sum())
    df["bmi_calc"] = np.nan
    df.loc[mask, "bmi_calc"] = bmi_calc.values
    df["flag_bmi_mismatch"] = False
    df.loc[mask & (diff > threshold), "flag_bmi_mismatch"] = True
    return {
        "checked": True, "n_checked": n_checked,
        "n_mismatch": n_mismatch,
        "pct_mismatch": round(n_mismatch / n_checked * 100, 2),
        "threshold_used": threshold,
        "severity": "high" if n_mismatch / n_checked > 0.2 else "medium" if n_mismatch / n_checked > 0.05 else "low",
        "severity_score": 4 if n_mismatch / n_checked > 0.2 else 2 if n_mismatch / n_checked > 0.05 else 1,
        "note": f"BMI dikira semula. {n_mismatch} rekod berbeza > {threshold} unit daripada nilai asal.",
    }

# ─── DATA QUALITY SCORE ────────────────────────────────────────────────────────

def compute_quality_score(report: dict, df: pd.DataFrame) -> dict:
    """
    6-dimension quality score (total = 100):
      field_coverage   20 pts  – how many core schema fields are mapped
      ic_validity      15 pts  – IC/MyKid validity rate
      missing_critical 25 pts  – missing rate in anthropometric/status fields
      duplicates       20 pts  – duplicate rows
      bmi_consistency  10 pts  – BMI recalculation vs stored value
      spelling         10 pts  – unrecognised values in status/categorical cols
    """
    score = 100
    breakdown = {}

    # ── FIELD MAPPING COVERAGE (20 pts) ──────────────────────────────────────
    CORE_FIELDS = [
        "id", "berat_kg", "tinggi_cm", "bmi", "negeri", "jantina",
        "status_berat", "status_tinggi", "status_bmi", "tarikh_lahir", "tarikh_ukur",
    ]
    mapped_core   = [f for f in CORE_FIELDS if f in df.columns]
    n_mapped      = len(mapped_core)
    n_total       = len(CORE_FIELDS)
    cov_score     = round(n_mapped / n_total * 20, 1)
    score        -= (20 - cov_score)
    breakdown["field_coverage"] = {
        "score": cov_score, "max": 20,
        "n_mapped": n_mapped, "n_total": n_total,
        "unmapped": [f for f in CORE_FIELDS if f not in df.columns],
    }

    # ── IC VALIDITY (15 pts) ──────────────────────────────────────────────────
    ic = report.get("ic_validation", {})
    if ic.get("total", 0) > 0:
        pct_valid = ic.get("pct_valid", 100)
        ic_score  = round(pct_valid * 0.15, 1)
        score    -= (15 - ic_score)
        breakdown["ic_validity"] = {"score": ic_score, "max": 15, "pct_valid": pct_valid}
    elif "id" not in df.columns:
        score -= 15
        breakdown["ic_validity"] = {"score": 0, "max": 15, "note": "Kolum ID tidak dipetakan"}
    else:
        breakdown["ic_validity"] = {"score": 15, "max": 15, "note": "IC tidak dipetakan"}

    # ── MISSING CRITICAL (25 pts) ─────────────────────────────────────────────
    critical_cols = ["berat_kg", "tinggi_cm", "bmi", "status_berat", "status_tinggi", "status_bmi"]
    mv            = report.get("missing_values", {})
    crit_present  = [c for c in critical_cols if c in df.columns]
    if not crit_present:
        score -= 25
        breakdown["missing_critical"] = {
            "score": 0, "max": 25,
            "note": "Tiada medan antropometrik/status dipetakan",
        }
    else:
        crit_pcts  = [mv[c]["pct_missing"] for c in crit_present if c in mv]
        avg_miss   = round(sum(crit_pcts) / len(crit_pcts), 1) if crit_pcts else 0
        miss_score = round(max(0, 25 - avg_miss * 0.5), 1)
        score     -= (25 - miss_score)
        breakdown["missing_critical"] = {"score": miss_score, "max": 25, "avg_pct_missing": avg_miss}

    # ── DUPLICATES (20 pts) ───────────────────────────────────────────────────
    dups      = report.get("duplicates", {})
    pct_dup   = dups.get("pct_duplicate", 0)
    dup_score = round(max(0, 20 - pct_dup * 2), 1)
    score    -= (20 - dup_score)
    breakdown["duplicates"] = {"score": dup_score, "max": 20, "pct_duplicate": pct_dup}

    # ── BMI CONSISTENCY (10 pts) ──────────────────────────────────────────────
    bmi_c = report.get("bmi_consistency", {})
    if bmi_c.get("checked"):
        pct_mis   = bmi_c.get("pct_mismatch", 0)
        bmi_score = round(max(0, 10 - pct_mis * 0.3), 1)
        score    -= (10 - bmi_score)
        breakdown["bmi_consistency"] = {"score": bmi_score, "max": 10, "pct_mismatch": pct_mis}
    else:
        breakdown["bmi_consistency"] = {"score": 10, "max": 10, "note": "Tidak dapat disemak"}

    # ── SPELLING (10 pts) ─────────────────────────────────────────────────────
    sp       = report.get("spelling_issues", {})
    n_spell  = sum(len(v) if isinstance(v, list) else 1 for v in sp.values())
    sp_score = round(max(0, 10 - n_spell), 1)
    score   -= (10 - sp_score)
    breakdown["spelling"] = {"score": sp_score, "max": 10, "n_issues": n_spell}

    final = max(0, min(100, round(score, 1)))
    grade = "A" if final >= 85 else "B" if final >= 70 else "C" if final >= 55 else "D"
    return {
        "score": final,
        "grade": grade,
        "label": {"A": "Sangat Baik", "B": "Baik", "C": "Sederhana", "D": "Lemah"}[grade],
        "breakdown": breakdown,
    }

# ─── DATA COMPLETENESS ─────────────────────────────────────────────────────────

def compute_data_completeness(df: pd.DataFrame) -> dict:
    critical  = [c for c in ["berat_kg", "tinggi_cm", "bmi"] if c in df.columns]
    important = [c for c in ["negeri", "daerah", "jantina", "pendapatan"] if c in df.columns]
    n = len(df)

    n_missing_anthro = int(df[critical].isnull().any(axis=1).sum()) if critical else 0
    complete_cases   = int(df[critical + important].dropna().shape[0]) if (critical + important) else n

    coverage_by_negeri = []
    if "negeri" in df.columns and critical and "is_missing_critical" in df.columns:
        grp = df.groupby("negeri")["is_missing_critical"].agg(["sum", "count"]).reset_index()
        grp.columns = ["negeri", "n_missing", "n_total"]
        grp["pct_complete"] = ((1 - grp["n_missing"] / grp["n_total"]) * 100).round(1)
        coverage_by_negeri = grp.to_dict(orient="records")

    return {
        "total_rows": n,
        "complete_cases": complete_cases,
        "pct_complete": round(complete_cases / n * 100, 1) if n > 0 else 0,
        "missing_critical_rows": n_missing_anthro,
        "pct_missing_critical": round(n_missing_anthro / n * 100, 1) if n > 0 else 0,
        "critical_fields_checked": critical,
        "coverage_by_negeri": coverage_by_negeri,
        "note": "Rekod dengan berat/tinggi/BMI hilang dikecualikan dari pengiraan indikator.",
    }

# ─── NULL STRATEGY ─────────────────────────────────────────────────────────────
# FIX E: preserve null semantics — add _was_null flags instead of overwriting,
#         for categorical columns that matter analytically. Keep fillna for
#         display-only columns so downstream code doesn't break.

def apply_null_strategy(df: pd.DataFrame, changes: list) -> pd.DataFrame:
    # Categorical display columns: flag first, then fill placeholder
    for col in ["negeri", "daerah", "jantina", "pendapatan"]:
        if col in df.columns:
            n_null = int(df[col].isna().sum())
            if n_null > 0:
                df[f"{col}_was_null"] = df[col].isna()   # preserve distinction
                df[col] = df[col].fillna("UNKNOWN")
                changes.append({
                    "action": "null_flagged_and_filled",
                    "description": f"{n_null} nilai null dalam '{col}' → 'UNKNOWN' (flag '{col}_was_null' ditambah)",
                    "column": col,
                    "before": {col: {"n_null": n_null}},
                    "after":  {col: {"filled_with": "UNKNOWN"}, f"{col}_was_null": "boolean flag added"},
                    "impact_pct": round(n_null / len(df) * 100, 1) if len(df) else 0,
                    "rows_affected": n_null,
                })

    for col in ["status_berat", "status_tinggi", "status_bmi"]:
        if col in df.columns:
            n_null = int(df[col].isna().sum())
            if n_null > 0:
                df[f"{col}_was_null"] = df[col].isna()
                df[col] = df[col].fillna("tiada data")
                changes.append({
                    "action": "null_flagged_and_filled",
                    "description": f"{n_null} status null dalam '{col}' → 'tiada data'",
                    "column": col,
                    "before": {col: {"n_null": n_null}},
                    "after":  {col: {"filled_with": "tiada data"}, f"{col}_was_null": "boolean flag added"},
                    "impact_pct": round(n_null / len(df) * 100, 1) if len(df) else 0,
                    "rows_affected": n_null,
                })

    anthro = [c for c in ["berat_kg", "tinggi_cm", "bmi"] if c in df.columns]
    if anthro:
        df["is_missing_critical"] = df[anthro].isnull().any(axis=1)
        n_crit = int(df["is_missing_critical"].sum())
        changes.append({
            "action": "flag_missing_critical",
            "description": f"Flag 'is_missing_critical': {n_crit} rekod dengan berat/tinggi/BMI kosong",
            "column": "is_missing_critical",
            "before": {},
            "after": {"is_missing_critical": {"n_flagged": n_crit}},
            "impact_pct": round(n_crit / len(df) * 100, 1) if len(df) else 0,
            "rows_affected": n_crit,
        })

    return df

# ─── INDICATORS ────────────────────────────────────────────────────────────────

def compute_indicators(df: pd.DataFrame) -> dict:
    results = {}
    for col in ["status_berat", "status_tinggi", "status_bmi"]:
        if col in df.columns:
            df[f"{col}_norm"] = df[col].astype(str).str.strip().str.lower()

    ind_flags = {
        "ind_kurang_berat": (df["status_berat_norm"].isin(["kurang berat badan"]) if "status_berat_norm" in df.columns else pd.Series(False, index=df.index)),
        "ind_bantut":       (df["status_tinggi_norm"].isin(["bantut", "bantut teruk"]) if "status_tinggi_norm" in df.columns else pd.Series(False, index=df.index)),
        "ind_susut":        (df["status_bmi_norm"].isin(["susut"]) if "status_bmi_norm" in df.columns else pd.Series(False, index=df.index)),
        "ind_obes":         (df["status_bmi_norm"].isin(["berlebihan berat badan", "obes", "risiko berlebihan berat badan"]) if "status_bmi_norm" in df.columns else pd.Series(False, index=df.index)),
    }
    for col, series in ind_flags.items():
        df[col] = series

    INDICATORS = {
        "kurang_berat_badan": ("ind_kurang_berat", "Kurang Berat Badan (Weight for Age)"),
        "bantut":             ("ind_bantut",        "Bantut (Height for Age)"),
        "susut":              ("ind_susut",          "Susut (BMI for Age)"),
        "obes_berlebihan":    ("ind_obes",           "Berlebihan Berat Badan & Obes (BMI for Age)"),
    }
    AGE_GROUPS = {
        "bawah_2_tahun": lambda d: d[d["age_months_computed"] < 24] if "age_months_computed" in d.columns else d,
        "bawah_5_tahun": lambda d: d[d["age_months_computed"] < 60] if "age_months_computed" in d.columns else d,
    }

    def geo_agg(df_sub, geo_col, ind_col):
        if geo_col not in df_sub.columns or ind_col not in df_sub.columns: return []
        grp = df_sub.groupby(geo_col)[ind_col].agg(["sum", "count"]).reset_index()
        grp.columns = [geo_col, "n_affected", "n_total"]
        grp["pct"] = (grp["n_affected"] / grp["n_total"] * 100).round(2)
        return grp.to_dict(orient="records")

    def cross_agg(df_sub, col1, col2, ind_col):
        if not all(c in df_sub.columns for c in [col1, col2, ind_col]): return []
        grp = df_sub.groupby([col1, col2])[ind_col].agg(["sum", "count"]).reset_index()
        grp.columns = [col1, col2, "n_affected", "n_total"]
        grp["pct"] = (grp["n_affected"] / grp["n_total"] * 100).round(2)
        return grp.to_dict(orient="records")

    for age_key, age_filter in AGE_GROUPS.items():
        results[age_key] = {}
        df_age = age_filter(df)
        n_age  = len(df_age)
        for ind_key, (ind_col, ind_label) in INDICATORS.items():
            n_aff = int(df_age[ind_col].sum()) if ind_col in df_age.columns else 0
            pct   = round(n_aff / n_age * 100, 2) if n_age > 0 else 0

            by_tahun = []
            if "tahun_ukur" in df_age.columns and ind_col in df_age.columns:
                grp = df_age.groupby("tahun_ukur")[ind_col].agg(["sum", "count"]).reset_index()
                grp.columns = ["tahun_ukur", "n_affected", "n_total"]
                grp["pct"] = (grp["n_affected"] / grp["n_total"] * 100).round(2)
                by_tahun = grp.sort_values("tahun_ukur").to_dict(orient="records")

            results[age_key][ind_key] = {
                "label": ind_label,
                "overall": {"n_total": int(n_age), "n_affected": n_aff, "pct": pct},
                "by_negeri":            geo_agg(df_age, "negeri", ind_col),
                "by_kawasan_bahagian":  geo_agg(df_age, "kawasan_bahagian", ind_col),
                "by_daerah":            geo_agg(df_age, "daerah", ind_col),
                "by_taska":             geo_agg(df_age, "taska", ind_col),  # NEW: TASKA aggregation
                "by_negeri_jantina":    cross_agg(df_age, "negeri", "jantina", ind_col),
                "by_negeri_pendapatan": cross_agg(df_age, "negeri", "pendapatan", ind_col),
                "by_birth_weight":      geo_agg(df_age, "birth_weight_category", ind_col),  # NEW: Birth weight cross-tab
                "by_tahun":             by_tahun,
            }
    return results


# ─── TASKA PERFORMANCE DASHBOARD ──────────────────────────────────────────────

def compute_taska_performance(df: pd.DataFrame) -> dict:
    """Aggregate nutrition indicators by TASKA with performance metrics."""
    if "taska" not in df.columns:
        return {"enabled": False, "reason": "No TASKA column mapped"}
    
    # Filter to only rows with valid TASKA names
    df_taska = df[df["taska"].notna() & (df["taska"].astype(str).str.strip() != "")]
    if len(df_taska) == 0:
        return {"enabled": False, "reason": "No TASKA data available"}
    
    # Compute prevalence for each TASKA
    taska_stats = []
    for taska_name, group in df_taska.groupby("taska"):
        n_total = len(group)
        if n_total < 5:  # Skip TASKA with <5 children (too small sample)
            continue
        
        # Get geographic context
        negeri = group["negeri"].mode()[0] if "negeri" in group.columns and len(group["negeri"].mode()) > 0 else None
        daerah = group["daerah"].mode()[0] if "daerah" in group.columns and len(group["daerah"].mode()) > 0 else None
        agensi = group["sumber"].mode()[0] if "sumber" in group.columns and len(group["sumber"].mode()) > 0 else None
        
        # Count malnutrition cases (any indicator)
        n_kurang_berat = int(group["ind_kurang_berat"].sum()) if "ind_kurang_berat" in group.columns else 0
        n_bantut = int(group["ind_bantut"].sum()) if "ind_bantut" in group.columns else 0
        n_susut = int(group["ind_susut"].sum()) if "ind_susut" in group.columns else 0
        n_obes = int(group["ind_obes"].sum()) if "ind_obes" in group.columns else 0
        
        # Calculate any malnutrition (handle case when no indicator columns exist)
        has_any_indicator = any(c in group.columns for c in ["ind_kurang_berat", "ind_bantut", "ind_susut", "ind_obes"])
        if has_any_indicator:
            mask = pd.Series([False] * len(group), index=group.index)
            if "ind_kurang_berat" in group.columns:
                mask = mask | group["ind_kurang_berat"].fillna(False)
            if "ind_bantut" in group.columns:
                mask = mask | group["ind_bantut"].fillna(False)
            if "ind_susut" in group.columns:
                mask = mask | group["ind_susut"].fillna(False)
            if "ind_obes" in group.columns:
                mask = mask | group["ind_obes"].fillna(False)
            n_any_malnutrition = int(mask.sum())
        else:
            n_any_malnutrition = 0
        
        # Data quality metrics
        n_missing_weight = int(group["berat_kg"].isna().sum()) if "berat_kg" in group.columns else 0
        n_missing_height = int(group["tinggi_cm"].isna().sum()) if "tinggi_cm" in group.columns else 0
        ic_valid_pct = 0
        if "id" in group.columns:
            from backend.utils.ic_validator import validate_ic
            ic_results = group["id"].apply(validate_ic)
            ic_valid_pct = round(sum(1 for r in ic_results if r["valid"]) / len(ic_results) * 100, 1)
        
        # Quality score (0-100)
        completeness = 100 - ((n_missing_weight + n_missing_height) / (n_total * 2) * 100)
        quality_score = round((completeness * 0.7) + (ic_valid_pct * 0.3), 1)
        
        # Prevalence %
        pct_kurang_berat = round(n_kurang_berat / n_total * 100, 2)
        pct_bantut = round(n_bantut / n_total * 100, 2)
        pct_susut = round(n_susut / n_total * 100, 2)
        pct_obes = round(n_obes / n_total * 100, 2)
        pct_any = round(n_any_malnutrition / n_total * 100, 2)
        
        # Risk flag
        risk_level = "High" if pct_any > 30 else "Medium" if pct_any > 15 else "Low"
        
        taska_stats.append({
            "taska": str(taska_name),
            "negeri": negeri,
            "daerah": daerah,
            "agensi": agensi,
            "n_children": n_total,
            "prevalence": {
                "kurang_berat_badan": {"n": n_kurang_berat, "pct": pct_kurang_berat},
                "bantut": {"n": n_bantut, "pct": pct_bantut},
                "susut": {"n": n_susut, "pct": pct_susut},
                "obes_berlebihan": {"n": n_obes, "pct": pct_obes},
                "any_malnutrition": {"n": n_any_malnutrition, "pct": pct_any},
            },
            "quality_score": quality_score,
            "data_completeness": round(completeness, 1),
            "ic_validity_pct": ic_valid_pct,
            "risk_level": risk_level,
        })
    
    # Sort by any_malnutrition prevalence (descending) for ranking
    taska_stats_sorted = sorted(taska_stats, key=lambda x: x["prevalence"]["any_malnutrition"]["pct"], reverse=True)
    
    # Add rankings
    for i, taska in enumerate(taska_stats_sorted, 1):
        taska["rank_overall"] = i
    
    # District rankings
    for negeri_daerah in set((t["negeri"], t["daerah"]) for t in taska_stats if t["negeri"] and t["daerah"]):
        negeri, daerah = negeri_daerah
        district_taskas = [t for t in taska_stats_sorted if t["negeri"] == negeri and t["daerah"] == daerah]
        for i, taska in enumerate(district_taskas, 1):
            taska["rank_in_district"] = i
    
    # Summary statistics
    summary = {
        "total_taska": len(taska_stats),
        "total_children": sum(t["n_children"] for t in taska_stats),
        "high_risk_taska": len([t for t in taska_stats if t["risk_level"] == "High"]),
        "avg_quality_score": round(sum(t["quality_score"] for t in taska_stats) / len(taska_stats), 1) if taska_stats else 0,
        "avg_prevalence": round(sum(t["prevalence"]["any_malnutrition"]["pct"] for t in taska_stats) / len(taska_stats), 2) if taska_stats else 0,
    }
    
    return {
        "enabled": True,
        "summary": summary,
        "taska_list": taska_stats_sorted,
        "top_10_worst": taska_stats_sorted[:10],
        "top_10_best": sorted(taska_stats, key=lambda x: x["prevalence"]["any_malnutrition"]["pct"])[:10],
    }


# ─── CHART-READY BLOCKS ────────────────────────────────────────────────────────
# FIX C: produce flat, chart-friendly structures the frontend can use directly

def build_chart_blocks(df: pd.DataFrame, report: dict) -> dict:
    charts = {}

    # Histogram buckets for all numerical columns
    for col, label in [("bmi", "BMI"), ("berat_kg", "Berat (kg)"), ("tinggi_cm", "Tinggi (cm)"), ("age_months_computed", "Umur (bulan)")]:
        if col not in df.columns:
            continue
        s = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(s) == 0:
            continue
        counts, edges = np.histogram(s, bins=20)
        charts[f"{col}_distribution"] = [
            {"range": f"{round(edges[i],1)}–{round(edges[i+1],1)}", "count": int(counts[i])}
            for i in range(len(counts))
        ]

    # Keep bmi_distribution alias for backward compat
    if "bmi_distribution" not in charts and "bmi" in df.columns:
        charts["bmi_distribution"] = charts.get("bmi_distribution", [])

    # Scatter plot data (sampled if > 5000 rows)
    scatter_pairs = [
        ("berat_kg", "tinggi_cm", "Berat vs Tinggi"),
        ("bmi", "age_months_computed", "BMI vs Umur"),
    ]
    for xc, yc, title in scatter_pairs:
        if xc in df.columns and yc in df.columns:
            sub = df[[xc, yc]].dropna()
            if len(sub) == 0:
                continue
            if len(sub) > 5000:
                sub = sub.sample(5000, random_state=42)
            charts[f"scatter_{xc}_vs_{yc}"] = {
                "title": title,
                "x_label": xc, "y_label": yc,
                "points": [
                    {"x": round(float(row[xc]), 2), "y": round(float(row[yc]), 2)}
                    for _, row in sub.iterrows()
                ],
            }

    # Status BMI pie
    if "status_bmi_grouped" in df.columns:
        vc = df["status_bmi_grouped"].value_counts()
        charts["status_bmi_pie"] = [{"label": k, "count": int(v)} for k, v in vc.items()]

    # Trend by year
    if "tahun_ukur" in df.columns and "ind_bantut" in df.columns:
        agg_dict = {"n_total": ("ind_bantut", "count"), "bantut": ("ind_bantut", "sum")}
        if "ind_obes" in df.columns:
            agg_dict["obes"] = ("ind_obes", "sum")
        if "ind_kurang_berat" in df.columns:
            agg_dict["kurang_berat"] = ("ind_kurang_berat", "sum")
        grp = df.groupby("tahun_ukur").agg(**agg_dict).reset_index()
        charts["trend_by_year"] = grp.replace({np.nan: None}).to_dict(orient="records")

    # Gender split
    if "jantina" in df.columns:
        vc = df["jantina"].value_counts()
        charts["gender_split"] = [{"label": k, "count": int(v)} for k, v in vc.items()]

    # Negeri summary (top 15)
    if "negeri" in df.columns:
        vc = df["negeri"].value_counts().head(15)
        charts["records_by_negeri"] = [{"negeri": k, "count": int(v)} for k, v in vc.items()]

    return charts


# ─── TABLEAU READINESS ANALYSIS ───────────────────────────────────────────────

def analyze_tableau_readiness(df: pd.DataFrame, report: dict) -> dict:
    """Analyze if data is ready for Tableau with specific transform requirements."""
    
    transforms = []
    
    # Data grain
    n_ids = df["id"].nunique() if "id" in df.columns else 0
    data_grain = "One row per child per measurement" if n_ids > 0 and len(df) > n_ids else "Unknown"
    
    # 1. IC/MyKid validation
    ic_validation = report.get("ic_validation", {})
    pct_valid = ic_validation.get("pct_valid", 0)
    transforms.append({
        "name": "IC / MyKid Validation",
        "status": "done" if pct_valid >= 95 else "needed",
        "priority": "critical" if pct_valid < 50 else "required",
        "note": f"{pct_valid}% valid ICs. EDA flagged {ic_validation.get('invalid', 0)} issues.",
        "action": "Review IC validation tab" if pct_valid < 95 else "No action needed",
    })
    
    # 2. Date parsing
    has_dates = all(c in df.columns for c in ["tarikh_lahir_dt", "tarikh_ukur_dt"])
    transforms.append({
        "name": "Date Parsing (tarikh_lahir, tarikh_ukur)",
        "status": "done" if has_dates else "needed",
        "priority": "critical",
        "note": "Converted to datetime for age calculation" if has_dates else "Dates not parsed",
        "action": "Already handled by EDA" if has_dates else "Check date format in source",
    })
    
    # 3. Age computation
    has_age = "age_months_computed" in df.columns
    transforms.append({
        "name": "Age Calculation (months)",
        "status": "done" if has_age else "needed",
        "priority": "critical",
        "note": f"Computed for {int(df['age_months_computed'].notna().sum())} rows" if has_age else "Age not computed",
        "action": "Already handled by EDA" if has_age else "Ensure dates are valid",
    })
    
    # 4. WHO z-scores
    has_waz = "waz" in df.columns and df["waz"].notna().sum() > 0
    has_haz = "haz" in df.columns and df["haz"].notna().sum() > 0
    has_baz = "baz" in df.columns and df["baz"].notna().sum() > 0
    zscore_pct = report.get("zscore_capability", {}).get("pct_waz", 0)
    transforms.append({
        "name": "WHO 2006 Z-Scores (WAZ, HAZ, BAZ)",
        "status": "done" if (has_waz and has_haz and has_baz) else "needed",
        "priority": "critical",
        "note": f"Computed for {zscore_pct}% of rows using WHO 2006 LMS tables",
        "action": "Already handled by EDA" if (has_waz and has_haz and has_baz) else "Check weight/height/age/gender fields",
    })
    
    # 5. Indicator flags
    has_indicators = all(c in df.columns for c in ["ind_kurang_berat_zscore", "ind_bantut_zscore", "ind_susut_zscore", "ind_obes_zscore"])
    transforms.append({
        "name": "KKM Indicator Flags (4 indicators)",
        "status": "done" if has_indicators else "needed",
        "priority": "critical",
        "note": "Boolean flags for each indicator based on z-scores" if has_indicators else "Indicators not computed",
        "action": "Already handled by EDA" if has_indicators else "Compute z-scores first",
    })
    
    # 6. Gender normalization
    gender_normalized = "jantina" in df.columns and df["jantina"].isin(["M", "F"]).sum() > 0
    transforms.append({
        "name": "Gender Normalization (M/F)",
        "status": "done" if gender_normalized else "needed",
        "priority": "required",
        "note": "Normalized to M/F format" if gender_normalized else "Gender not normalized",
        "action": "Already handled by EDA",
    })
    
    # 7. Income normalization
    income_normalized = "pendapatan" in df.columns and df["pendapatan"].isin(["B40", "M40", "T20"]).sum() > 0
    transforms.append({
        "name": "Income Group Normalization (B40/M40/T20)",
        "status": "done" if income_normalized else "not_required",
        "priority": "recommended",
        "note": "Normalized to standard format" if income_normalized else "Not applicable",
        "action": "Already handled by EDA" if income_normalized else "Not needed if income column absent",
    })
    
    # 8. Geographic hierarchy
    has_geo = "kawasan_bahagian" in df.columns
    transforms.append({
        "name": "Geographic Hierarchy (Sabah/Sarawak)",
        "status": "done" if has_geo else "not_required",
        "priority": "recommended",
        "note": "Kawasan/Bahagian mapped for Sabah & Sarawak" if has_geo else "Not applicable",
        "action": "Already handled by EDA",
    })
    
    # 9. Missing values
    missing_pct = sum(1 for mv in report.get("missing_values", {}).values() if mv.get("pct_missing", 0) > 10) / max(len(report.get("missing_values", {})), 1) * 100
    transforms.append({
        "name": "Missing Value Handling",
        "status": "needed" if missing_pct > 20 else "done",
        "priority": "required" if missing_pct > 30 else "recommended",
        "note": f"{missing_pct:.1f}% of columns have >10% missing values",
        "action": "Review Missing Values tab and decide on imputation strategy",
    })
    
    # 10. Duplicates
    dup_pct = report.get("duplicates", {}).get("pct_duplicates", 0)
    transforms.append({
        "name": "Duplicate Removal",
        "status": "done" if dup_pct == 0 else "needed",
        "priority": "required" if dup_pct > 5 else "recommended",
        "note": f"{dup_pct}% duplicates detected and flagged",
        "action": "Review Duplicates tab" if dup_pct > 0 else "No duplicates found",
    })
    
    # 11. Outliers
    outliers = len([1 for change in report.get("changes_applied", []) if change.get("action") == "outliers_removed"])
    has_outliers = outliers > 0
    transforms.append({
        "name": "Biological Outlier Removal",
        "status": "done" if has_outliers else "optional",
        "priority": "recommended",
        "note": f"Outliers flagged (weight <0.5 or >80kg, height <30 or >200cm, BMI <5 or >60)",
        "action": "Review configuration - outliers can be removed/flagged/kept",
    })
    
    # 12. Age groups
    has_age_groups = "flag_bawah_2" in df.columns and "flag_bawah_5" in df.columns
    transforms.append({
        "name": "Age Group Flags (Bawah 2 Tahun, Bawah 5 Tahun)",
        "status": "done" if has_age_groups else "needed",
        "priority": "critical",
        "note": "Boolean flags for KKM age stratification" if has_age_groups else "Age groups not computed",
        "action": "Already handled by EDA",
    })
    
    return {
        "data_grain": data_grain,
        "grain_note": f"{len(df)} rows, {n_ids} unique children" if n_ids > 0 else f"{len(df)} rows",
        "row_count": len(df),
        "unique_id_count": int(n_ids) if n_ids > 0 else None,
        "transforms": transforms,
        "calculated_fields": [
            {"name": "age_months_computed", "formula": "DATEDIFF('month', [tarikh_lahir], [tarikh_ukur])", "note": "Already computed by EDA"},
            {"name": "age_group", "formula": "IF [age_months_computed] < 24 THEN 'Bawah 2 Tahun' ELSEIF [age_months_computed] < 60 THEN 'Bawah 5 Tahun' ELSE 'Atas 5 Tahun' END", "note": "Already computed by EDA"},
            {"name": "waz/haz/baz", "formula": "WHO 2006 LMS interpolation - complex calculation", "note": "Already computed by EDA using Python"},
            {"name": "indicator_kurang_berat", "formula": "[waz] < -2", "note": "Already computed as ind_kurang_berat_zscore"},
            {"name": "indicator_bantut", "formula": "[haz] < -2", "note": "Already computed as ind_bantut_zscore"},
            {"name": "indicator_susut", "formula": "[baz] < -2", "note": "Already computed as ind_susut_zscore"},
            {"name": "indicator_obes", "formula": "[baz] > +2", "note": "Already computed as ind_obes_zscore"},
        ],
        "recommended_joins": [
            {"name": "State Geographic Reference", "key": "negeri", "note": "If you need additional state metadata"},
            {"name": "TASKA Reference", "key": "taska", "note": "If you need TASKA performance metrics"},
        ],
    }


# ─── DATASET TYPE DETECTION ───────────────────────────────────────────────────

def detect_dataset_type(df: pd.DataFrame) -> dict:
    """
    Auto-detect dataset type based on column signatures.
    Returns: {
        'type': 'ncdc' | 'myvass' | 'kkm_school' | 'unknown',
        'confidence': float (0-1),
        'signature_columns': list of detected key columns,
        'suggested_name': str
    }
    """
    cols = [c.lower().strip() for c in df.columns]
    col_set = set(cols)
    
    # KKM School Health (Berat & Tinggi) signature columns
    kkm_signatures = ['id_murid', 'berat', 'tinggi', 'thn_ting', 'tarikh pengukuran']
    kkm_matches = sum(1 for sig in kkm_signatures if any(sig in c for c in cols))
    
    # NCDC signature columns
    ncdc_signatures = ['nama taska', 'kumpulan umur', 'pendapatan keluarga', '2023 berat', '2024 berat']
    ncdc_matches = sum(1 for sig in ncdc_signatures if any(sig in c for c in cols))
    
    # MyVass signature columns
    myvass_signatures = ['vaccine_name', 'birth_ic', 'assessment_status', 'nama klinik', 'tarikh antropometri']
    myvass_matches = sum(1 for sig in myvass_signatures if any(sig in c for c in cols))
    
    # Determine type (check KKM first as it's most specific)
    if kkm_matches >= 3:
        return {
            'type': 'kkm_school',
            'confidence': min(kkm_matches / len(kkm_signatures), 1.0),
            'signature_columns': [c for sig in kkm_signatures for c in df.columns if sig in c.lower()],
            'suggested_name': 'KKM School Health Dataset',
            'description': 'KKM Berat & Tinggi (Weight & Height) - School health measurement data with business rule validation'
        }
    elif ncdc_matches >= 2:
        return {
            'type': 'ncdc',
            'confidence': min(ncdc_matches / len(ncdc_signatures), 1.0),
            'signature_columns': [c for sig in ncdc_signatures for c in df.columns if sig in c.lower()],
            'suggested_name': 'NCDC TASKA Dataset',
            'description': 'Status Kesihatan Kanak-Kanak Kebangsaan (NCDC) - TASKA surveillance data'
        }
    elif myvass_matches >= 2:
        return {
            'type': 'myvass',
            'confidence': min(myvass_matches / len(myvass_signatures), 1.0),
            'signature_columns': [c for sig in myvass_signatures for c in df.columns if sig in c.lower()],
            'suggested_name': 'MyVass Clinic Dataset',
            'description': 'Child nutrition & immunisation surveillance system (PenyediaanGISStatusPemakananKanakkanak)'
        }
    else:
        return {
            'type': 'unknown',
            'confidence': 0.0,
            'signature_columns': [],
            'suggested_name': 'Unknown Dataset',
            'description': 'Dataset type could not be determined automatically'
        }


# ─── EDA MAIN ──────────────────────────────────────────────────────────────────

def run_eda(df: pd.DataFrame, mapping: dict, source_type: str, 
            config: dict = None, bmi_threshold: float = 1.0, sheet_name: str = None) -> dict:
    # Extract config parameters
    if config is None:
        config = {}
    outlier_action = config.get('outlier_action', 'flag')
    missing_strategy = config.get('missing_strategy', 'exclude')
    
    # ── PERFORMANCE OPTIMIZATION: Sample large datasets ──────────────────────
    original_row_count = len(df)
    is_sampled = False
    sample_size = 100000  # Process max 100k rows for analysis
    
    if original_row_count > sample_size:
        print(f"\n{'='*60}")
        print(f"⚡ PERFORMANCE OPTIMIZATION")
        print(f"{'='*60}")
        print(f"Dataset has {original_row_count:,} rows - too large for real-time analysis")
        print(f"Sampling {sample_size:,} random rows for EDA...")
        
        # Stratified sampling if possible (by state/region to maintain distribution)
        if 'negeri' in df.columns and df['negeri'].notna().sum() > 0:
            df_sample = df.groupby('negeri', group_keys=False).apply(
                lambda x: x.sample(n=min(len(x), sample_size // df['negeri'].nunique()), random_state=42)
            ).reset_index(drop=True)
            print(f"✓ Stratified sampling by Negeri: {len(df_sample):,} rows")
        else:
            df_sample = df.sample(n=sample_size, random_state=42).reset_index(drop=True)
            print(f"✓ Random sampling: {len(df_sample):,} rows")
        
        df = df_sample
        is_sampled = True
        print(f"{'='*60}\n")
    
    report = {
        "source_type": source_type,
        "total_rows": original_row_count,
        "analyzed_rows": len(df),
        "is_sampled": is_sampled,
        "sample_info": {
            "original_rows": original_row_count,
            "sampled_rows": len(df),
            "sampling_method": "stratified by negeri" if is_sampled and 'negeri' in df.columns else "random",
            "sample_ratio": round(len(df) / original_row_count * 100, 2) if original_row_count > 0 else 100
        } if is_sampled else None,
        "total_columns": len(df.columns),
        "missing_values": {},
        "missing_value_rows": [],  # NEW: detailed list of all missing value rows
        "ic_validation": {},
        "ic_audit_rows": [],  # NEW: all invalid IC rows with details
        "id_analysis": {},
        "column_types": {},
        "spelling_issues": {},
        "duplicates": {},
        "age_distribution": {},
        "numerical_summary": {},
        "categorical_summary": {},
        "bmi_consistency": {},
        "data_completeness": {},
        "data_quality_score": {},
        "indicators": {},
        "charts": {},
        "zscore_errors": [],  # NEW: track z-score calculation failures
        "changes_applied": [],
        "cleaned_preview": [],
    }
    normalize_spelling = config.get('normalize_spelling', True)
    
    # Add sheet_name column if provided
    if sheet_name and '_sheet_name' not in df.columns:
        df['_sheet_name'] = sheet_name

    # ── WIDE-TO-LONG PIVOT (NCDC MyVASS format) ──────────────────────────────
    # Must happen BEFORE mapping to convert year-prefixed columns to long format
    if source_type == "myvass":
        year_cols = [c for c in df.columns if re.match(r"^(2023|2024|2025|2026)", c)]
        if year_cols:  # Wide format detected
            id_cols = [c for c in df.columns if c not in year_cols]
            rows = []
            for _, row in df.iterrows():
                for year in ["2023", "2024", "2025", "2026"]:
                    yr_cols = {c: row[c] for c in year_cols if c.startswith(year)}
                    # Skip if all year-specific columns are null/empty
                    if all(pd.isna(v) or str(v).strip() == "" for v in yr_cols.values()):
                        continue
                    new_row = {c: row[c] for c in id_cols}
                    new_row["tahun_ukur"] = year
                    for c, v in yr_cols.items():
                        new_key = (
                            c.replace(f"{year} ", "").strip().lower()
                            .replace(" ", "_").replace("(", "").replace(")", "")
                        )
                        new_row[new_key] = v
                    rows.append(new_row)
            
            if rows:
                original_len = len(df)
                df = pd.DataFrame(rows)
                report["changes_applied"].append({
                    "action": "wide_to_long_pivot",
                    "description": f"NCDC wide format pivoted: {original_len} rows → {len(df)} long-format rows",
                    "column": "year-prefixed columns",
                    "before": {"rows": original_len, "format": "wide"},
                    "after": {"rows": len(df), "format": "long"},
                    "impact_pct": None,
                    "rows_affected": len(df),
                })

    # DEBUG: Log mapping and column renaming
    print(f"\n{'='*60}")
    print(f"RUN_EDA MAPPING DEBUG")
    print(f"{'='*60}")
    print(f"Mapping received: {mapping}")
    inv_map = {v: k for k, v in mapping.items() if v}
    print(f"Inverse map (rename): {inv_map}")
    print(f"Columns before rename: {df.columns.tolist()}")
    df = df.rename(columns=inv_map)
    print(f"Columns after rename: {df.columns.tolist()}")
    print(f"'id' in columns: {'id' in df.columns}")
    print(f"{'='*60}\n")

    # ── MAPPING COVERAGE TRACKING ─────────────────────────────────────────────
    _CORE_FIELDS = [
        "id", "berat_kg", "tinggi_cm", "bmi", "negeri", "jantina",
        "status_berat", "status_tinggi", "status_bmi", "tarikh_lahir", "tarikh_ukur",
    ]
    report["mapped_fields"]           = [f for f in STANDARD_SCHEMA.keys() if f in df.columns]
    report["n_mapped_standard"]       = len(report["mapped_fields"])
    report["unmapped_critical_fields"] = [f for f in _CORE_FIELDS if f not in df.columns]

    # Column type profiling
    for col in df.columns:
        report["column_types"][col] = {
            "original_dtype": str(df[col].dtype),
            "inferred": "categorical" if df[col].dtype == object else "numerical",
            "unique_values": int(df[col].nunique()),
            "sample_values": df[col].dropna().astype(str).unique()[:5].tolist(),
        }

    # Normalise sentinel strings → NaN (incl. whitespace-only cells)
    df = df.replace(r'^\s*$', np.nan, regex=True)
    for marker in ["<NA>", "nan", "NaN", "None", "NA", "N/A", "n/a", "#N/A"]:
        df = df.replace(marker, np.nan)

    # ── COMPUTE BMI IF MISSING ─────────────────────────────────────────────
    if "berat_kg" in df.columns and "tinggi_cm" in df.columns and "bmi" not in df.columns:
        w = pd.to_numeric(df["berat_kg"], errors="coerce")
        h = pd.to_numeric(df["tinggi_cm"], errors="coerce")
        mask = w.notna() & h.notna() & (h > 0)
        df["bmi"] = np.nan
        df.loc[mask, "bmi"] = (w[mask] / ((h[mask] / 100) ** 2)).round(2)
        n_computed = int(mask.sum())
        report["changes_applied"].append({
            "action": "bmi_computed",
            "description": f"BMI dikira daripada berat/tinggi untuk {n_computed} rekod",
            "column": "bmi",
            "before": {"bmi_column": "tidak wujud"},
            "after": {"n_computed": n_computed},
            "impact_pct": round(n_computed / len(df) * 100, 1) if len(df) else 0,
            "rows_affected": n_computed,
        })

    # ── BIRTH WEIGHT CLASSIFICATION ────────────────────────────────────────────
    # Clinic data has "berat_lahir_kg" and "panjang_lahir_cm" (birth measurements)
    if "berat_lahir_kg" in df.columns:
        df["birth_weight_category"] = df["berat_lahir_kg"].apply(classify_birth_weight)
        n_classified = int(df["birth_weight_category"].notna().sum())
        report["changes_applied"].append({
            "action": "birth_weight_classified",
            "description": f"Birth weight classified for {n_classified} records (WHO categories)",
            "column": "birth_weight_category",
            "before": {},
            "after": {
                "n_classified": n_classified,
                "categories": df["birth_weight_category"].value_counts().to_dict() if n_classified > 0 else {},
            },
            "impact_pct": round(n_classified / len(df) * 100, 1) if len(df) else 0,
            "rows_affected": n_classified,
        })

    # ── MISSING VALUES (single loop, no nested IC inside) ─────────────────────
    for col in df.columns:
        if col.startswith('_'):  # Skip internal columns like _sheet_name
            continue
        n_missing = int(df[col].isna().sum())
        pct = round(n_missing / len(df) * 100, 2) if len(df) > 0 else 0
        sev = "high" if pct > 30 else "medium" if pct > 10 else "low"
        report["missing_values"][col] = {
            "n_missing": n_missing,
            "pct_missing": pct,
            "severity": sev,
            "severity_score": severity_score(pct),
            # FIX: show line numbers where null appears (up to 20 for readability)
            "null_row_indices": (
                df.index[df[col].isna()].tolist()[:20]
                if n_missing > 0 else []
            ),
        }
        
        # NEW: Collect detailed missing value rows (limit to 1000 for performance)
        if n_missing > 0:
            null_indices = df.index[df[col].isna()].tolist()[:1000]
            for idx in null_indices:
                row_data = {
                    "row_index": int(idx),
                    "column": col,
                    "sheet_name": df.loc[idx, '_sheet_name'] if '_sheet_name' in df.columns else None,
                }
                # Add some context columns if they exist
                for ctx_col in ['id', 'nama', 'negeri', 'daerah', 'taska', 'tarikh_ukur']:
                    if ctx_col in df.columns:
                        val = df.loc[idx, ctx_col]
                        row_data[ctx_col] = None if pd.isna(val) else str(val)
                report["missing_value_rows"].append(row_data)

    # ── IC VALIDATION (FIX A: outside the column loop, once) ─────────────────
    if "id" in df.columns:
        ic_results = df["id"].apply(validate_ic)
        valid_count = sum(1 for r in ic_results if r["valid"])

        issues = {}
        for r in ic_results:
            if not r["valid"]:
                issues[r["issue"]] = issues.get(r["issue"], 0) + 1

        report["ic_validation"] = {
            "total": len(df),
            "valid": valid_count,
            "invalid": len(df) - valid_count,
            "pct_valid": round(valid_count / len(df) * 100, 2) if len(df) > 0 else 0,
            "issue_breakdown": issues,
            "severity": "high" if valid_count / len(df) < 0.5 else "medium" if valid_count / len(df) < 0.8 else "low",
            "severity_score": severity_score(100 - round(valid_count / len(df) * 100, 2)),
        }
        
        # NEW: Collect all invalid IC rows for audit (limit to 500)
        invalid_indices = [i for i, r in enumerate(ic_results) if not r["valid"]][:500]
        for i in invalid_indices:
            row_data = {
                "row_index": int(i),
                "original_value": str(df.iloc[i]["id"]) if not pd.isna(df.iloc[i]["id"]) else None,
                "issue": ic_results[i]["issue"],
                "id_type": ic_results[i]["type"],
                "cleaned_value": ic_results[i]["cleaned"],
                "sheet_name": df.iloc[i]['_sheet_name'] if '_sheet_name' in df.columns else None,
            }
            # Add context columns
            for ctx_col in ['nama', 'jantina', 'negeri', 'daerah', 'taska', 'tarikh_lahir']:
                if ctx_col in df.columns:
                    val = df.iloc[i][ctx_col]
                    row_data[ctx_col] = None if pd.isna(val) else str(val)
            report["ic_audit_rows"].append(row_data)

        # FIX B+C: single assignment, guarded
        df["id_cleaned"] = [r["cleaned"] for r in ic_results]

        # FIX D: always 2-tuple
        df, dedup_df = analyze_and_deduplicate_ids(df, report)

        report["deduplicated_preview"] = (
            dedup_df.head(50).replace({np.nan: None}).to_dict(orient="records")
        )

        # Single change log entry for IC cleaning
        report["changes_applied"].append({
            "action": "ic_cleaned",
            "description": f"Dibersih {len(df) - valid_count} nombor IC tidak piawai",
            "column": "id",
            "before": {"invalid_count": len(df) - valid_count},
            "after": {"id_cleaned": "12-digit IC extracted"},
            "impact_pct": round((len(df) - valid_count) / len(df) * 100, 1) if len(df) else 0,
            "rows_affected": len(df) - valid_count,
        })
    # If no 'id' column — id_analysis and ic_validation stay as empty dicts

    # ── GENDER NORMALISATION ──────────────────────────────────────────────────
    if "jantina" in df.columns:
        original_vals = df["jantina"].value_counts().to_dict()
        df["jantina"] = df["jantina"].apply(normalise_gender)
        after_vals = df["jantina"].value_counts().to_dict()
        non_standard = {k: v for k, v in original_vals.items()
                        if str(k).strip() not in ["M", "F", "Male", "Female", "Lelaki", "Perempuan"]}
        if non_standard:
            report["spelling_issues"]["jantina"] = {
                "non_standard_values": non_standard,
                "after_normalisation": after_vals,
            }
            report["changes_applied"].append({
                "action": "gender_normalised",
                "description": f"Jantina dinormalisasi ke M/F — {sum(non_standard.values())} nilai ditukar",
                "column": "jantina",
                "before": original_vals,
                "after": after_vals,
                "impact_pct": round(sum(non_standard.values()) / len(df) * 100, 1) if len(df) else 0,
                "rows_affected": sum(non_standard.values()),
            })

    # ── INCOME NORMALISATION ──────────────────────────────────────────────────
    if "pendapatan" in df.columns:
        before_vals = df["pendapatan"].value_counts().to_dict()
        df["pendapatan"] = df["pendapatan"].apply(normalise_income)
        report["changes_applied"].append({
            "action": "income_normalised",
            "description": "Pendapatan dinormalisasi ke B40/M40/T20",
            "column": "pendapatan",
            "before": before_vals,
            "after": df["pendapatan"].value_counts().to_dict(),
            "impact_pct": None,
            "rows_affected": int(df["pendapatan"].notna().sum()),
        })

    # ── SPELLING CHECKS ───────────────────────────────────────────────────────
    for col, valid_set in {
        "status_berat": STATUS_BERAT_VALID,
        "status_tinggi": STATUS_TINGGI_VALID,
        "status_bmi": STATUS_BMI_VALID,
    }.items():
        if col in df.columns:
            issues_list = [
                check_spelling(val, valid_set, col)
                for val in df[col].dropna().unique()
                if check_spelling(val, valid_set, col)["issue"]
            ]
            if issues_list:
                report["spelling_issues"][col] = issues_list

    # ── GROUPED STATUS ────────────────────────────────────────────────────────
    if "status_bmi" in df.columns:
        df["status_bmi_grouped"] = (
            df["status_bmi"].astype(str).str.strip().str.lower()
            .map(BMI_GROUPED_MAP).fillna("lain-lain")
        )
        report["changes_applied"].append({
            "action": "status_bmi_grouped",
            "description": "Kolum 'status_bmi_grouped' ditambah (susut/normal/kurang/obes_berlebihan)",
            "column": "status_bmi_grouped",
            "before": {},
            "after": df["status_bmi_grouped"].value_counts().to_dict(),
            "impact_pct": None,
            "rows_affected": int(df["status_bmi_grouped"].notna().sum()),
        })

    # ── DUPLICATES ────────────────────────────────────────────────────────────
    dup_cols = [c for c in ["id", "tarikh_ukur", "tahun_ukur"] if c in df.columns]
    if dup_cols:
        n_dups = int(df.duplicated(subset=dup_cols).sum())
        report["duplicates"] = {
            "duplicate_rows": n_dups,
            "duplicate_check_columns": dup_cols,
            "pct_duplicate": round(n_dups / len(df) * 100, 2) if len(df) > 0 else 0,
            "before_count": len(df),
            "after_dedup_count": len(df) - n_dups,
        }
        if n_dups > 0:
            report["changes_applied"].append({
                "action": "duplicates_flagged",
                "description": f"{n_dups} baris duplikat dikesan",
                "column": ", ".join(dup_cols),
                "before": {"n_rows": len(df)},
                "after":  {"n_rows": len(df) - n_dups},
                "impact_pct": round(n_dups / len(df) * 100, 1) if len(df) else 0,
                "rows_affected": n_dups,
            })

    # ── AGE COMPUTATION ───────────────────────────────────────────────────────
    if "tarikh_lahir" in df.columns and "tarikh_ukur" in df.columns:
        df["tarikh_lahir_dt"] = pd.to_datetime(df["tarikh_lahir"], errors="coerce", dayfirst=True, format="mixed")
        df["tarikh_ukur_dt"]  = pd.to_datetime(df["tarikh_ukur"],  errors="coerce", dayfirst=True, format="mixed")
        df["age_months_computed"] = df.apply(
            lambda r: calc_age_months(r["tarikh_lahir_dt"], r["tarikh_ukur_dt"]), axis=1
        )
        df["age_group_computed"] = df["age_months_computed"].apply(age_group_label)
        df["bulan_ukur"]         = df["tarikh_ukur_dt"].dt.month
        df["suku_tahun"]         = df["tarikh_ukur_dt"].dt.quarter.apply(
            lambda q: f"S{q}" if pd.notna(q) else None
        )
        df["flag_bawah_2"]  = (df["age_months_computed"] < 24).fillna(False)
        df["flag_bawah_5"]  = (df["age_months_computed"] < 60).fillna(False)
        df["is_missing_age"] = df["age_months_computed"].isna()

        valid_ages = df["age_months_computed"].dropna()
        report["age_distribution"] = {
            "min_months":       float(valid_ages.min()) if len(valid_ages) else None,
            "max_months":       float(valid_ages.max()) if len(valid_ages) else None,
            "mean_months":      round(float(valid_ages.mean()), 1) if len(valid_ages) else None,
            "median_months":    round(float(valid_ages.median()), 1) if len(valid_ages) else None,
            "age_group_counts": df["age_group_computed"].value_counts().to_dict(),
            "under_2_years":    int((df["age_months_computed"] < 24).sum()),
            "under_5_years":    int((df["age_months_computed"] < 60).sum()),
            "over_5_years":     int((df["age_months_computed"] >= 60).sum()),
            "missing_age":      int(df["is_missing_age"].sum()),
        }
        report["changes_applied"].append({
            "action": "age_and_date_parts_computed",
            "description": "Umur, bulan_ukur, suku_tahun, flag_bawah_2/5 dikira",
            "column": "age_months_computed",
            "before": {},
            "after": {"n_valid_ages": int(len(valid_ages))},
            "impact_pct": None,
            "rows_affected": int(len(valid_ages)),
        })

    # ── EXTRACT TAHUN_UKUR FROM DATE IF NOT MAPPED ────────────────────────────
    if "tahun_ukur" not in df.columns and "tarikh_ukur_dt" in df.columns:
        df["tahun_ukur"] = df["tarikh_ukur_dt"].dt.year
        n_valid = int(df["tahun_ukur"].notna().sum())
        report["changes_applied"].append({
            "action": "tahun_ukur_extracted",
            "description": f"Tahun pengukuran diekstrak daripada tarikh_ukur ({n_valid} rekod)",
            "column": "tahun_ukur",
            "before": {},
            "after": {"n_valid": n_valid},
            "impact_pct": None,
            "rows_affected": n_valid,
        })

    # ── Z-SCORE ERROR TRACKING ────────────────────────────────────────────────
    # Track which rows cannot have z-scores calculated and why
    required_for_zscore = {
        "WAZ (Weight-for-Age)": ["berat_kg", "age_months_computed", "jantina"],
        "HAZ (Height-for-Age)": ["tinggi_cm", "age_months_computed", "jantina"],
        "BAZ (BMI-for-Age)": ["bmi", "age_months_computed", "jantina"],
    }
    
    for indicator_name, required_cols in required_for_zscore.items():
        # Check each row to see if it's missing required fields (limit to 500 for performance)
        for idx in range(min(500, len(df))):
            missing_fields = []
            for col in required_cols:
                if col not in df.columns or pd.isna(df.iloc[idx][col]):
                    missing_fields.append(col)
            
            if missing_fields:  # Row cannot have z-score calculated
                error_record = {
                    "row_index": int(idx),
                    "indicator": indicator_name,
                    "reason": f"Missing: {', '.join(missing_fields)}",
                    "missing_fields": missing_fields,
                    "sheet_name": df.iloc[idx]['_sheet_name'] if '_sheet_name' in df.columns else None,
                }
                # Add available context
                for ctx_col in ['id', 'nama', 'negeri', 'daerah', 'taska']:
                    if ctx_col in df.columns:
                        val = df.iloc[idx][ctx_col]
                        error_record[ctx_col] = None if pd.isna(val) else str(val)
                # Add actual values for the required fields
                for col in required_cols:
                    if col in df.columns:
                        val = df.iloc[idx][col]
                        error_record[f"{col}_value"] = None if pd.isna(val) else str(val)
                
                report["zscore_errors"].append(error_record)
    
    # Add summary of z-score calculation capability
    n_can_calc_waz = df[["berat_kg", "age_months_computed", "jantina"]].notna().all(axis=1).sum() if all(c in df.columns for c in ["berat_kg", "age_months_computed", "jantina"]) else 0
    n_can_calc_haz = df[["tinggi_cm", "age_months_computed", "jantina"]].notna().all(axis=1).sum() if all(c in df.columns for c in ["tinggi_cm", "age_months_computed", "jantina"]) else 0
    n_can_calc_baz = df[["bmi", "age_months_computed", "jantina"]].notna().all(axis=1).sum() if all(c in df.columns for c in ["bmi", "age_months_computed", "jantina"]) else 0
    
    report["zscore_capability"] = {
        "can_compute_waz": int(n_can_calc_waz),
        "can_compute_haz": int(n_can_calc_haz),
        "can_compute_baz": int(n_can_calc_baz),
        "total_rows": len(df),
        "pct_waz": round(n_can_calc_waz / len(df) * 100, 1) if len(df) > 0 else 0,
        "pct_haz": round(n_can_calc_haz / len(df) * 100, 1) if len(df) > 0 else 0,
        "pct_baz": round(n_can_calc_baz / len(df) * 100, 1) if len(df) > 0 else 0,
    }

    # ── COMPUTE WHO 2006 Z-SCORES ─────────────────────────────────────────────
    if WHO_ZSCORE_AVAILABLE and n_can_calc_waz > 0:
        print(f"\n{'='*60}")
        print(f"COMPUTING WHO 2006 Z-SCORES")
        print(f"{'='*60}")
        print(f"Rows eligible for WAZ: {n_can_calc_waz}")
        print(f"Rows eligible for HAZ: {n_can_calc_haz}")
        print(f"Rows eligible for BAZ: {n_can_calc_baz}")
        
        try:
            df = add_who_zscores(df)
            
            # Calculate how many z-scores were actually computed
            n_waz_computed = df["waz"].notna().sum() if "waz" in df.columns else 0
            n_haz_computed = df["haz"].notna().sum() if "haz" in df.columns else 0
            n_baz_computed = df["baz"].notna().sum() if "baz" in df.columns else 0
            
            print(f"✓ WAZ computed: {n_waz_computed}")
            print(f"✓ HAZ computed: {n_haz_computed}")
            print(f"✓ BAZ computed: {n_baz_computed}")
            
            # Get mismatch report (comparing source labels vs WHO z-score classifications)
            mismatch_report = zscore_mismatch_report(df)
            report["zscore_mismatch"] = mismatch_report
            
            print(f"✓ Label mismatch analysis complete")
            print(f"{'='*60}\n")
            
            report["changes_applied"].append({
                "action": "who_zscores_computed",
                "description": f"WHO 2006 z-scores dikira: WAZ={n_waz_computed}, HAZ={n_haz_computed}, BAZ={n_baz_computed}",
                "column": "waz, haz, baz",
                "before": {},
                "after": {
                    "waz_computed": int(n_waz_computed),
                    "haz_computed": int(n_haz_computed),
                    "baz_computed": int(n_baz_computed),
                },
                "impact_pct": round(n_waz_computed / len(df) * 100, 1) if len(df) > 0 else 0,
                "rows_affected": int(n_waz_computed),
            })
            
        except Exception as e:
            print(f"✗ Error computing z-scores: {e}")
            import traceback
            traceback.print_exc()
            report["zscore_error"] = str(e)
    else:
        print(f"\n⚠ WHO z-scores cannot be computed: ", end="")
        if not WHO_ZSCORE_AVAILABLE:
            print("Module not available")
        elif n_can_calc_waz == 0:
            print("No rows have required fields (berat_kg, tinggi_cm, age_months_computed, jantina)")
        print()

    # ── GEO HIERARCHY ─────────────────────────────────────────────────────────
    if "negeri" in df.columns and "daerah" in df.columns:
        df["kawasan_bahagian"] = df.apply(
            lambda r: get_kawasan_bahagian(r.get("negeri"), r.get("daerah")), axis=1
        )
        n_geo = int(df["kawasan_bahagian"].notna().sum())
        report["changes_applied"].append({
            "action": "kawasan_bahagian_mapped",
            "description": f"Kawasan/Bahagian Sabah & Sarawak dipetakan — {n_geo} rekod",
            "column": "kawasan_bahagian",
            "before": {},
            "after": {"n_mapped": n_geo},
            "impact_pct": round(n_geo / len(df) * 100, 1) if len(df) else 0,
            "rows_affected": n_geo,
        })

    # ── OUTLIER DETECTION & HANDLING (based on config) ───────────────────────
    BIOLOGICAL_RANGES = {
        "berat_kg":  (0.5, 80),
        "tinggi_cm": (30, 200),
        "bmi":       (5, 60),
        "age_months_computed": (0, 120),
    }
    outliers_detected = {}
    total_outliers = 0
    for col, (min_val, max_val) in BIOLOGICAL_RANGES.items():
        if col in df.columns:
            vals = pd.to_numeric(df[col], errors='coerce')
            outlier_mask = (vals < min_val) | (vals > max_val)
            n_outliers = int(outlier_mask.sum())
            if n_outliers > 0:
                outliers_detected[col] = {
                    "n_outliers": n_outliers,
                    "pct": round(n_outliers / len(df) * 100, 2),
                    "min_allowed": min_val,
                    "max_allowed": max_val,
                }
                total_outliers += n_outliers
                
                if outlier_action == 'remove':
                    df = df[~outlier_mask]
                elif outlier_action == 'flag':
                    df[f"{col}_outlier"] = outlier_mask
    
    if total_outliers > 0:
        report["outliers"] = {
            "total_outliers": total_outliers,
            "action_taken": outlier_action,
            "details": outliers_detected,
        }
        report["changes_applied"].append({
            "action": f"outliers_{outlier_action}",
            "description": f"{total_outliers} outliers {'removed' if outlier_action == 'remove' else 'flagged'}",
            "column": ", ".join(outliers_detected.keys()),
            "before": {"n_rows": len(df) if outlier_action == 'flag' else len(df) + total_outliers},
            "after": {"n_rows": len(df)},
            "impact_pct": round(total_outliers / (len(df) + total_outliers if outlier_action == 'remove' else len(df)) * 100, 1),
            "rows_affected": total_outliers,
        })

    # ── NULL STRATEGY (FIX E) ─────────────────────────────────────────────────
    df = apply_null_strategy(df, report["changes_applied"])

    # ── BMI CONSISTENCY (FIX F: threshold param) ──────────────────────────────
    report["bmi_consistency"] = check_bmi_consistency(df, threshold=bmi_threshold)

    # ── ANALYTICAL SUMMARIES ──────────────────────────────────────────────────
    report["numerical_summary"]   = compute_numerical_summary(df)
    report["categorical_summary"] = compute_categorical_summary(df)
    report["data_completeness"]   = compute_data_completeness(df)

    # ── INDICATORS ────────────────────────────────────────────────────────────
    if any(c in df.columns for c in ["status_berat", "status_tinggi", "status_bmi"]):
        report["indicators"] = compute_indicators(df)

    # ── TASKA PERFORMANCE DASHBOARD ───────────────────────────────────────────
    # Only compute for NCDC/TASKA datasets (not MyVass clinic data)
    if source_type in ["myvass", "ncdc"] and any(c in df.columns for c in ["ind_kurang_berat", "ind_bantut", "ind_susut", "ind_obes"]):
        report["taska_performance"] = compute_taska_performance(df)
    else:
        report["taska_performance"] = {"enabled": False, "reason": f"Not applicable for {source_type} dataset"}

    # ── CHART BLOCKS (FIX 🧩C: wired) ────────────────────────────────────────
    report["charts"] = build_chart_blocks(df, report)

    # ── AGGREGATED PREVIEW (FIX 🧩B: wired into /eda/run response) ───────────
    indicators = report.get("indicators", {})
    agg_rows = []
    AGE_LABELS = {"bawah_2_tahun": "Bawah 2 Tahun", "bawah_5_tahun": "Bawah 5 Tahun"}
    GEO_LEVELS = [
        ("negeri",           "Negeri"),
        ("kawasan_bahagian", "Kawasan/Bahagian"),
        ("daerah",           "Daerah"),
    ]
    for age_key, age_data in indicators.items():
        age_label = AGE_LABELS.get(age_key, age_key)
        for ind_key, ind_data in age_data.items():
            o = ind_data["overall"]
            agg_rows.append({
                "kumpulan_umur": age_label, "indikator": ind_key,
                "indikator_label": ind_data["label"], "peringkat_geo": "Kebangsaan",
                "lokasi": "Malaysia",
                "n_total": o["n_total"], "n_affected": o["n_affected"], "pct": o["pct"],
            })
            for geo_key, geo_label in GEO_LEVELS:
                for rec in ind_data.get(f"by_{geo_key}", []):
                    agg_rows.append({
                        "kumpulan_umur": age_label, "indikator": ind_key,
                        "indikator_label": ind_data["label"], "peringkat_geo": geo_label,
                        "lokasi": rec.get(geo_key, ""),
                        "n_total": rec.get("n_total", 0),
                        "n_affected": rec.get("n_affected", 0),
                        "pct": rec.get("pct", 0),
                    })
    report["aggregated_preview"] = agg_rows[:100]   # 🧩B: wired

    # ── QUALITY SCORE ─────────────────────────────────────────────────────────
    report["data_quality_score"] = compute_quality_score(report, df)

    # ── TABLEAU PREP ANALYSIS ─────────────────────────────────────────────────
    report["tableau_prep"] = analyze_tableau_readiness(df, report)

    # ── KKM BUSINESS RULES VALIDATION ─────────────────────────────────────────
    # Only run for KKM School Health datasets (Berat & Tinggi)
    if source_type in ["kkm_school", "kkm"] or any('id_murid' in c.lower() for c in df.columns):
        try:
            from backend.eda.kkm_quality_rules import analyze_kkm_quality
            kkm_quality = analyze_kkm_quality(df)
            report["kkm_quality_issues"] = kkm_quality.get("issues", [])
            report["kkm_affected_rows"] = kkm_quality.get("affected_rows", {})
            report["kkm_total_issues"] = kkm_quality.get("total_issues", 0)
        except Exception as e:
            print(f"Warning: KKM quality check failed: {e}")
            report["kkm_quality_issues"] = []
            report["kkm_affected_rows"] = {}
            report["kkm_total_issues"] = 0
    else:
        report["kkm_quality_issues"] = []
        report["kkm_affected_rows"] = {}
        report["kkm_total_issues"] = 0

    # ── PREVIEW / CLEANED DATA ────────────────────────────────────────────────
    preview_cols = [
        c for c in df.columns
        if not c.endswith("_norm") and not c.endswith("_dt")
    ]
    # Use where(df.notna(), other=None) to catch both np.nan and pd.NA
    clean_df = df[preview_cols].where(df[preview_cols].notna(), other=None)
    report["cleaned_preview"] = clean_df.head(50).to_dict(orient="records")
    # Internal full dataset (not sent in /eda/run response — used by download endpoints)
    report["_cleaned_data"]    = clean_df.to_dict(orient="records")
    report["_cleaned_columns"] = preview_cols
    return report


# ─── FILE READER ───────────────────────────────────────────────────────────────

def read_file(content: bytes, filename: str, sheet: str = None, nrows: int = None):
    """
    Read file with optional row limit for performance.
    
    Args:
        content: File bytes
        filename: File name to determine type
        sheet: Sheet name for Excel files
        nrows: Maximum number of rows to read (None = all rows). For preview only.
    
    Returns:
        Tuple of (DataFrame, sheet_names list or None)
    """
    if filename.endswith(".csv"):
        # For CSV, use nrows to limit memory usage during preview
        if nrows:
            df = pd.read_csv(io.BytesIO(content), dtype=str, nrows=nrows)
        else:
            df = pd.read_csv(io.BytesIO(content), dtype=str)
        return df, None
    elif filename.endswith((".xlsx", ".xls")):
        xl = pd.ExcelFile(io.BytesIO(content))
        sheets = xl.sheet_names
        target = sheet if sheet and sheet in sheets else sheets[0]
        if nrows:
            df = pd.read_excel(io.BytesIO(content), sheet_name=target, dtype=str, nrows=nrows)
        else:
            df = pd.read_excel(io.BytesIO(content), sheet_name=target, dtype=str)
        return df, sheets
    else:
        raise ValueError("Only CSV, XLSX, XLS supported.")

def auto_suggest_mapping(columns: list, source_type: str) -> dict:
    """Auto-suggest column mappings with flexible fuzzy matching."""
    # Normalize column names: lowercase, strip spaces, remove punctuation
    def normalize(s):
        return re.sub(r'[^a-z0-9]', '', s.lower().strip())
    
    cols_normalized = {normalize(c): c for c in columns}
    cols_lower = {c.lower().strip(): c for c in columns}
    
    mapping = {k: None for k in STANDARD_SCHEMA.keys()}
    
    myvass_hints = {
        "id": [
            # Common IC/MyKid variations
            "no. mykid", "no mykid", "nomykid", "no.mykid", 
            "mykid", "ic", "ic/mykid", "mykid/ic",
            "no ic", "noic", "no. ic",
            # Normalized versions (no punctuation/spaces)
            "nomykid", "noic", "icmykid", "mykidic",
        ],
        "nama":          ["nama anak", "nama"],
        "jantina":       ["jantina"],
        "tarikh_lahir":  ["tarikh lahir"],
        "negeri":        ["negeri"],
        "daerah":        ["daerah"],
        "taska":         ["nama taska"],
        "pendapatan":    ["pendapatan keluarga", "pendapatan"],
        "kumpulan_umur": ["kumpulan umur"],
        # Post-pivot column names (after wide-to-long transformation)
        "berat_kg":      ["berat_kg", "berat", "2025 berat (kg)", "2024 berat (kg)", "2023 berat (kg)", "berat (kg)"],
        "tinggi_cm":     ["tinggi_cm", "tinggi", "2025 tinggi (cm)", "2024 tinggi (cm)", "2023 tinggi (cm)", "tinggi (cm)"],
        "bmi":           ["bmi", "2025 bmi", "2024 bmi", "2023 bmi"],
        "status_berat":  ["status_berat", "2025 status berat", "2024 status berat", "2023 status berat"],
        "status_tinggi": ["status_tinggi", "2025 status tinggi", "2024 status tinggi", "2023 status tinggi"],
        "status_bmi":    ["status_bmi", "2025 status bmi", "2024 status bmi", "2023 status bmi"],
        "tarikh_ukur":   ["tarikh_pengukuran", "2025 tarikh pengukuran", "2024 tarikh pengukuran", "2023 tarikh pengukuran"],
        "tahun_ukur":    ["tahun_ukur"],  # Created by pivot
    }
    klinik_hints = {
        "id":           ["birth_ic", "id", "no_ic", "ic"],
        "jantina":      ["jantina", "gender", "sex"],
        "tarikh_lahir": ["tarikh lahir", "date of birth", "dob"],
        "negeri":       ["negeri", "state"],
        "daerah":       ["daerah", "district"],
        "taska":        ["nama klinik", "klinik", "clinic"],
        "berat_kg":     ["berat lahir (kg)", "berat lahir", "berat (kg)", "weight", "berat"],
        "tinggi_cm":    ["panjang lahir (cm)", "panjang lahir", "panjang lahir (kg)", "tinggi (cm)", "tinggi", "panjang", "height", "length"],
        "tarikh_ukur":  ["tarikh antropometri", "assessment date", "tarikh assessment"],
    }
    hints = myvass_hints if source_type == "myvass" else klinik_hints
    
    # Try exact lowercase match first
    for field, possible in hints.items():
        for p in possible:
            if p.lower() in cols_lower:
                mapping[field] = cols_lower[p.lower()]
                break
    
    # Try normalized match (no spaces/punctuation) for fields still unmapped
    for field, possible in hints.items():
        if mapping[field] is None:  # Only if not yet mapped
            for p in possible:
                p_norm = normalize(p)
                if p_norm in cols_normalized:
                    mapping[field] = cols_normalized[p_norm]
                    break
    
    return mapping

# ─── ENDPOINTS ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "EDA Pipeline API — Pemakanan Kanak-kanak", "version": "3.1"}

@app.get("/schema")
def get_schema():
    return {"schema": STANDARD_SCHEMA}

@app.get("/data-dictionary")
def data_dictionary():
    derived = {
        "id_cleaned":          {"type": "identifier", "derived": True, "description": "IC/MyKid selepas dibersih (12 digit)"},
        "id_type":             {"type": "categorical", "derived": True, "description": "Jenis ID: valid_ic / short_id / system_id / missing / invalid_ic"},
        "is_valid_ic":         {"type": "boolean",    "derived": True, "description": "True = IC 12 digit sah"},
        "age_months_computed": {"type": "numerical",  "derived": True, "description": "Umur dalam bulan"},
        "age_group_computed":  {"type": "categorical","derived": True, "description": "Kumpulan umur standard"},
        "bulan_ukur":          {"type": "categorical","derived": True, "description": "Bulan pengukuran (1–12)"},
        "suku_tahun":          {"type": "categorical","derived": True, "description": "Suku tahun (S1–S4)"},
        "kawasan_bahagian":    {"type": "categorical","derived": True, "description": "Kawasan (Sabah) / Bahagian (Sarawak)"},
        "flag_bawah_2":        {"type": "boolean",   "derived": True, "description": "True = bawah 2 tahun"},
        "flag_bawah_5":        {"type": "boolean",   "derived": True, "description": "True = bawah 5 tahun"},
        "is_missing_critical": {"type": "boolean",   "derived": True, "description": "True = berat/tinggi/BMI hilang"},
        "is_missing_age":      {"type": "boolean",   "derived": True, "description": "True = umur tidak dapat dikira"},
        "flag_bmi_mismatch":   {"type": "boolean",   "derived": True, "description": "True = BMI tidak konsisten dengan berat/tinggi"},
        "status_bmi_grouped":  {"type": "categorical","derived": True, "description": "BMI grouped: susut/normal/kurang/obes_berlebihan"},
        "ind_kurang_berat":    {"type": "boolean",   "derived": True, "description": "Indikator kurang berat badan"},
        "ind_bantut":          {"type": "boolean",   "derived": True, "description": "Indikator bantut"},
        "ind_susut":           {"type": "boolean",   "derived": True, "description": "Indikator susut"},
        "ind_obes":            {"type": "boolean",   "derived": True, "description": "Indikator obes/berlebihan berat badan"},
        # null flag columns
        "negeri_was_null":     {"type": "boolean",   "derived": True, "description": "True = negeri asal adalah null"},
        "daerah_was_null":     {"type": "boolean",   "derived": True, "description": "True = daerah asal adalah null"},
        "jantina_was_null":    {"type": "boolean",   "derived": True, "description": "True = jantina asal adalah null"},
        "pendapatan_was_null": {"type": "boolean",   "derived": True, "description": "True = pendapatan asal adalah null"},
    }
    return {"source_fields": STANDARD_SCHEMA, "derived_fields": derived}


# FIX 🧩F: new mapping validation endpoint
@app.post("/mapping/validate")
async def validate_mapping(
    file: UploadFile = File(...),
    mapping: str = Form(""),
    sheet: Optional[str] = None,
):
    """Validate that a proposed column mapping is structurally correct before running EDA."""
    content = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        mapping_dict = json.loads(mapping) if mapping else {}
    except Exception:
        raise HTTPException(400, "Mapping JSON tidak sah")

    available_cols = set(df.columns.tolist())
    errors, warnings, ok = [], [], []

    for std_field, raw_col in mapping_dict.items():
        if raw_col is None:
            continue
        if raw_col not in available_cols:
            errors.append({
                "field": std_field,
                "mapped_to": raw_col,
                "issue": f"Kolum '{raw_col}' tidak wujud dalam fail",
            })
        else:
            schema_type = STANDARD_SCHEMA.get(std_field, {}).get("type", "unknown")
            col_dtype   = str(df[raw_col].dtype)
            ok.append({"field": std_field, "mapped_to": raw_col, "dtype": col_dtype})
            # Warn if numerical schema field is mapped to a string-heavy column
            if schema_type == "numerical" and col_dtype == "object":
                sample_numeric = pd.to_numeric(df[raw_col], errors="coerce").notna().mean()
                if sample_numeric < 0.5:
                    warnings.append({
                        "field": std_field,
                        "mapped_to": raw_col,
                        "issue": f"Kolum kelihatan bukan numerik ({round(sample_numeric*100)}% boleh ditukar)",
                    })

    critical_unmapped = [
        f for f in ["berat_kg", "tinggi_cm", "bmi", "status_berat", "status_tinggi", "status_bmi"]
        if f not in mapping_dict or mapping_dict.get(f) is None
    ]
    if critical_unmapped:
        warnings.append({
            "field": "critical_fields",
            "mapped_to": None,
            "issue": f"Medan kritikal tidak dipetakan: {critical_unmapped}",
        })

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "ok": ok,
        "total_mapped": len([v for v in mapping_dict.values() if v]),
        "available_columns": df.columns.tolist(),
    }


@app.post("/upload/preview")
async def upload_preview(
    file: UploadFile = File(...),
    sheet: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
):
    content  = await file.read()
    filename = file.filename or ""
    
    # For large files, only read first 10k rows for preview (performance optimization)
    # This speeds up upload significantly for datasets > 100k rows
    preview_limit = 10000
    
    try:
        df, sheets = read_file(content, filename, sheet, nrows=preview_limit)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(400, f"Fail tidak dapat dibaca: {str(e)}")
    
    # Check if we hit the preview limit
    is_truncated = len(df) == preview_limit
    if is_truncated:
        print(f"\n⚡ Preview truncated: showing first {preview_limit:,} rows for performance")

    # Auto-detect dataset type using signature columns
    dataset_info = detect_dataset_type(df)
    source_type = dataset_info['type']
    
    # Map to old source_type names for backward compatibility
    if source_type == 'ncdc':
        source_type_compat = 'myvass'  # Old name for NCDC
    elif source_type == 'myvass':
        source_type_compat = 'klinik'  # Old name for MyVass clinic data
    else:
        source_type_compat = 'unknown'

    # ── WIDE-TO-LONG PIVOT FOR PREVIEW (same as run_eda) ─────────────────────
    original_rows = len(df)
    if source_type == "ncdc":  # NCDC has wide-format year columns
        year_cols = [c for c in df.columns if re.match(r"^(2023|2024|2025|2026)", c)]
        if year_cols:  # Wide format detected
            id_cols = [c for c in df.columns if c not in year_cols]
            rows = []
            for _, row in df.iterrows():
                for year in ["2023", "2024", "2025", "2026"]:
                    yr_cols = {c: row[c] for c in year_cols if c.startswith(year)}
                    if all(pd.isna(v) or str(v).strip() == "" for v in yr_cols.values()):
                        continue
                    new_row = {c: row[c] for c in id_cols}
                    new_row["tahun_ukur"] = year
                    for c, v in yr_cols.items():
                        new_key = (
                            c.replace(f"{year} ", "").strip().lower()
                            .replace(" ", "_").replace("(", "").replace(")", "")
                        )
                        new_row[new_key] = v
                    rows.append(new_row)
            
            if rows:
                df = pd.DataFrame(rows)

    auto_map   = auto_suggest_mapping(df.columns.tolist(), source_type_compat)
    
    # DEBUG: Log column detection for IC/MyKid troubleshooting
    print(f"\n{'='*60}")
    print(f"COLUMN DETECTION DEBUG - {filename}")
    print(f"{'='*60}")
    print(f"Source Type: {source_type}")
    print(f"Total Columns: {len(df.columns)}")
    print(f"\nAll Columns:")
    for i, col in enumerate(df.columns, 1):
        print(f"  {i:2d}. '{col}'")
    print(f"\nAuto-Mapping Results:")
    for field, mapped_col in auto_map.items():
        if mapped_col:
            print(f"  ✓ {field:20s} → {mapped_col}")
    unmapped = [f for f, v in auto_map.items() if v is None]
    if unmapped:
        print(f"\n✗ Unmapped fields: {', '.join(unmapped)}")
    print(f"{'='*60}\n")
    
    total_rows = len(df)
    start      = (page - 1) * page_size
    page_data  = df.iloc[start:start+page_size].copy()
    page_data  = page_data.replace(r'^\s*$', np.nan, regex=True)
    for marker in ["<NA>", "nan", "NaN", "None", "NA"]:
        page_data = page_data.replace(marker, np.nan)
    page_data = page_data.where(page_data.notna(), None)

    return JSONResponse(content=json_safe({
        "filename": filename,
        "source_type": source_type_compat,  # Backward compatible name
        "dataset_info": dataset_info,  # NEW: Full dataset detection info
        "total_rows": total_rows, 
        "total_columns": len(df.columns),
        "original_rows": original_rows,  # Show original count before pivot
        "is_preview_truncated": is_truncated,  # NEW: Indicates preview was limited for performance
        "preview_limit": preview_limit if is_truncated else None,
        "columns": df.columns.tolist(), 
        "sheets": sheets or [],
        "active_sheet": sheet or (sheets[0] if sheets else None),
        "preview": page_data.to_dict(orient="records"),
        "page": page, "page_size": page_size,
        "total_pages": max(1, (total_rows + page_size - 1) // page_size),
        "auto_mapping": auto_map,
    }))


@app.post("/eda/run")
async def run_eda_endpoint(
    file: UploadFile = File(...),
    mapping: str = Form(""),
    source_type: str = "myvass",
    sheet: Optional[str] = None,
    outlier_action: str = Query("flag", regex="^(remove|flag|keep)$"),
    missing_strategy: str = Query("exclude", regex="^(exclude|fallback)$"),
    normalize_spelling: str = Query("true", regex="^(true|false)$"),
    age_filter: Optional[str] = Query(None),  # NEW: "0-24" or "24-60" etc.
    year_filter: Optional[str] = Query(None),  # NEW: "2023", "2024", "2025", etc.
):
    content  = await file.read()
    filename = file.filename or ""
    
    # DEBUG: Log what mapping was received
    print(f"\n{'='*60}")
    print(f"/eda/run ENDPOINT DEBUG")
    print(f"{'='*60}")
    print(f"Filename: {filename}")
    print(f"Sheet: {sheet}")
    print(f"Source type: {source_type}")
    print(f"Mapping string received: {mapping[:200] if mapping else '(empty)'}")
    print(f"{'='*60}\n")
    
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))
    try:
        mapping_dict = json.loads(mapping) if mapping else {}
    except Exception:
        mapping_dict = {}
    
    print(f"Mapping dict parsed: {mapping_dict}")  # DEBUG: show parsed mapping

    # Build processing config
    config = {
        'outlier_action': outlier_action,
        'missing_strategy': missing_strategy,
        'normalize_spelling': normalize_spelling == 'true',
    }

    # Run full EDA first (to compute age_months_computed)
    report = run_eda(df, mapping_dict, source_type, config=config, sheet_name=sheet)
    
    # APPLY FILTERS (post-processing on cleaned data for display)
    # Get cleaned DataFrame from report
    if "_cleaned_data" in report and "_cleaned_columns" in report:
        df_filtered = pd.DataFrame(report["_cleaned_data"], columns=report["_cleaned_columns"])
        
        # Age filtering
        if age_filter and "age_months_computed" in df_filtered.columns:
            try:
                if "-" in age_filter:
                    min_age, max_age = map(int, age_filter.split("-"))
                    df_filtered = df_filtered[
                        (df_filtered["age_months_computed"] >= min_age) &
                        (df_filtered["age_months_computed"] < max_age)
                    ]
                else:
                    exact_age = int(age_filter)
                    df_filtered = df_filtered[df_filtered["age_months_computed"] == exact_age]
                report["filters_applied"] = report.get("filters_applied", {})
                report["filters_applied"]["age"] = age_filter
                report["rows_after_age_filter"] = len(df_filtered)
            except ValueError:
                pass  # Invalid age filter format, ignore
        
        # Year filtering
        if year_filter and "tahun_ukur" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["tahun_ukur"].astype(str) == str(year_filter)]
            report["filters_applied"] = report.get("filters_applied", {})
            report["filters_applied"]["year"] = year_filter
            report["rows_after_year_filter"] = len(df_filtered)
        
        # Update previews with filtered data
        if age_filter or year_filter:
            preview_cols = [c for c in df_filtered.columns if not c.endswith("_norm") and not c.endswith("_dt")]
            clean_df = df_filtered[preview_cols].where(df_filtered[preview_cols].notna(), other=None)
            report["cleaned_preview"] = clean_df.head(50).to_dict(orient="records")
            # Note: Indicators are still from full dataset - filtering is for display only
            report["note"] = "Filters applied to preview only. Indicators computed from full dataset."

    # Strip internal data from public response
    report.pop("_cleaned_data", None)
    report.pop("_cleaned_columns", None)
    return JSONResponse(content=json_safe(report))


# FIX 🧩A: paginated cleaned data endpoint
@app.post("/cleaned/preview")
async def cleaned_preview(
    file: UploadFile = File(...),
    mapping: str = Form(""),
    source_type: str = "myvass",
    sheet: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=5, le=200),
):
    """Paginated access to the full cleaned dataset (FIX 🧩A)."""
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))
    try:
        mapping_dict = json.loads(mapping) if mapping else {}
    except Exception:
        mapping_dict = {}

    report       = run_eda(df, mapping_dict, source_type)
    all_records  = report.get("_cleaned_data", [])
    cols         = report.get("_cleaned_columns", [])
    total_rows   = len(all_records)
    start        = (page - 1) * page_size
    page_records = all_records[start:start + page_size]

    return JSONResponse(content=json_safe({
        "total_rows": total_rows,
        "total_pages": max(1, (total_rows + page_size - 1) // page_size),
        "page": page,
        "page_size": page_size,
        "columns": cols,
        "records": page_records,
    }))


@app.post("/download/cleaned")
async def download_cleaned(
    file: UploadFile = File(...),
    mapping: str = Form(""),
    source_type: str = "myvass",
    sheet: Optional[str] = None,
    fmt: str = Query("csv", pattern="^(csv|xlsx)$"),
):
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))
    try:
        mapping_dict = json.loads(mapping) if mapping else {}
    except Exception:
        mapping_dict = {}

    report          = run_eda(df, mapping_dict, source_type)
    cleaned_records = report.get("_cleaned_data", [])
    cleaned_cols    = report.get("_cleaned_columns", [])
    if not cleaned_records:
        raise HTTPException(500, "Tiada data dibersih.")

    out_df = pd.DataFrame(cleaned_records, columns=cleaned_cols or None)
    base   = filename.rsplit(".", 1)[0]

    if fmt == "csv":
        buf = io.StringIO()
        out_df.to_csv(buf, index=False, encoding="utf-8-sig")
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue().encode("utf-8-sig")]), media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="cleaned_{base}.csv"'},
        )
    else:
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as w:
            out_df.to_excel(w, index=False, sheet_name="Cleaned Data")
        buf.seek(0)
        return StreamingResponse(
            iter([buf.read()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="cleaned_{base}.xlsx"'},
        )


@app.post("/export/aggregated")
async def export_aggregated(
    file: UploadFile = File(...),
    mapping: str = Form(""),
    source_type: str = "myvass",
    sheet: Optional[str] = None,
    fmt: str = Query("csv", pattern="^(csv|xlsx)$"),
):
    """Tableau-ready flat aggregated table: one row per geo × age_group × indicator."""
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))
    try:
        mapping_dict = json.loads(mapping) if mapping else {}
    except Exception:
        mapping_dict = {}

    report     = run_eda(df, mapping_dict, source_type)
    agg_rows   = report.get("aggregated_preview", [])  # reuse pre-built list
    if not agg_rows:
        raise HTTPException(422, "Tiada data indikator — pastikan status dipetakan.")

    agg_df = pd.DataFrame(agg_rows)
    base   = filename.rsplit(".", 1)[0]

    if fmt == "xlsx":
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as w:
            agg_df.to_excel(w, index=False, sheet_name="Aggregated")
        buf.seek(0)
        return StreamingResponse(
            iter([buf.read()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="aggregated_{base}.xlsx"'},
        )
    else:
        buf = io.StringIO()
        agg_df.to_csv(buf, index=False, encoding="utf-8-sig")
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue().encode("utf-8-sig")]), media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="aggregated_{base}.csv"'},
        )


@app.post("/transform/myvass-wide-to-long")
async def myvass_wide_to_long(file: UploadFile = File(...), sheet: Optional[str] = None):
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    id_cols   = [c for c in df.columns if not re.match(r"^(2023|2024|2025)", c)]
    year_cols = [c for c in df.columns if re.match(r"^(2023|2024|2025)", c)]
    rows = []
    for _, row in df.iterrows():
        for year in ["2023", "2024", "2025"]:
            yr_cols = {c: row[c] for c in year_cols if c.startswith(year)}
            if all(pd.isna(v) or str(v).strip() == "" for v in yr_cols.values()): continue
            new_row = {c: row[c] for c in id_cols}
            new_row["tahun_ukur"] = year
            for c, v in yr_cols.items():
                new_key = (
                    c.replace(f"{year} ", "").strip().lower()
                    .replace(" ", "_").replace("(", "").replace(")", "")
                )
                new_row[new_key] = v
            rows.append(new_row)

    long_df = pd.DataFrame(rows)
    return {
        "original_rows": len(df), "long_rows": len(long_df),
        "columns": long_df.columns.tolist(),
        "preview": long_df.head(10).replace({np.nan: None}).to_dict(orient="records"),
    }