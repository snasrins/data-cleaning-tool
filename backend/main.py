"""
KKM EDA Pipeline — FastAPI application
All endpoints. Business logic lives in backend/eda/ and backend/export/.
"""

import io
import json
import re

import pandas as pd
import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional

from .config import STANDARD_SCHEMA, auto_suggest_mapping, detect_source_type
from .eda.runner import run_eda, json_safe
from .export.tableau import build_aggregated_table, to_excel as tbl_excel, to_csv as tbl_csv
from .export.cleaned import to_excel as cln_excel, to_csv as cln_csv

app = FastAPI(title="KKM EDA Pipeline — Pemakanan Kanak-kanak", version="4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── FILE READER ──────────────────────────────────────────────────────────────

def read_file(content: bytes, filename: str, sheet: str | None = None):
    fn = (filename or "").lower()
    if fn.endswith(".csv"):
        return pd.read_csv(io.BytesIO(content), dtype=str), None
    elif fn.endswith((".xlsx", ".xls")):
        xl     = pd.ExcelFile(io.BytesIO(content))
        sheets = xl.sheet_names
        target = sheet if sheet and sheet in sheets else sheets[0]
        return pd.read_excel(io.BytesIO(content), sheet_name=target, dtype=str), sheets
    raise ValueError("Hanya CSV, XLSX, XLS disokong.")


# ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "KKM EDA Pipeline API", "version": "4.0", "status": "ok"}


@app.get("/schema")
def get_schema():
    return {"schema": STANDARD_SCHEMA}


@app.get("/data-dictionary")
def data_dictionary():
    derived = {
        "id_cleaned":            {"type": "identifier",  "derived": True, "description": "IC/MyKid selepas dibersih (12 digit)"},
        "id_type":               {"type": "categorical", "derived": True, "description": "Jenis ID: valid_ic / short_id / system_id / missing / invalid_ic"},
        "is_valid_ic":           {"type": "boolean",     "derived": True, "description": "True = IC 12 digit sah"},
        "age_months_computed":   {"type": "numerical",   "derived": True, "description": "Umur dalam bulan (dikira dari tarikh_lahir dan tarikh_ukur)"},
        "age_group_computed":    {"type": "categorical", "derived": True, "description": "Kumpulan umur standard WHO"},
        "bulan_ukur":            {"type": "categorical", "derived": True, "description": "Bulan pengukuran (1–12)"},
        "suku_tahun":            {"type": "categorical", "derived": True, "description": "Suku tahun pengukuran (S1–S4)"},
        "kawasan_bahagian":      {"type": "categorical", "derived": True, "description": "Kawasan (Sabah) / Bahagian (Sarawak)"},
        "flag_bawah_2":          {"type": "boolean",     "derived": True, "description": "True = bawah 2 tahun (< 24 bulan)"},
        "flag_bawah_5":          {"type": "boolean",     "derived": True, "description": "True = bawah 5 tahun (< 60 bulan)"},
        "is_missing_critical":   {"type": "boolean",     "derived": True, "description": "True = berat/tinggi/BMI hilang"},
        "is_missing_age":        {"type": "boolean",     "derived": True, "description": "True = umur tidak dapat dikira"},
        "flag_bmi_mismatch":     {"type": "boolean",     "derived": True, "description": "True = BMI tidak konsisten dengan berat/tinggi (threshold ±1.0)"},
        "flag_date_invalid":     {"type": "boolean",     "derived": True, "description": "True = tarikh_ukur < tarikh_lahir (tidak logik)"},
        "flag_date_future":      {"type": "boolean",     "derived": True, "description": "True = tarikh_ukur dalam masa hadapan"},
        "status_bmi_grouped":    {"type": "categorical", "derived": True, "description": "BMI grouped: susut/normal/kurang/obes_berlebihan"},
        # WHO z-scores
        "waz":                   {"type": "numerical",   "derived": True, "description": "WHO 2006 Weight-for-Age Z-score"},
        "haz":                   {"type": "numerical",   "derived": True, "description": "WHO 2006 Height-for-Age Z-score"},
        "baz":                   {"type": "numerical",   "derived": True, "description": "WHO 2006 BMI-for-Age Z-score"},
        "waz_class":             {"type": "categorical", "derived": True, "description": "Klasifikasi WAZ (WHO 2006)"},
        "haz_class":             {"type": "categorical", "derived": True, "description": "Klasifikasi HAZ (WHO 2006)"},
        "baz_class":             {"type": "categorical", "derived": True, "description": "Klasifikasi BAZ (WHO 2006)"},
        # Indicator flags (z-score based)
        "ind_kurang_berat_zscore":{"type": "boolean",   "derived": True, "description": "Kurang berat badan (WAZ < -2, WHO 2006)"},
        "ind_bantut_zscore":     {"type": "boolean",    "derived": True, "description": "Bantut (HAZ < -2, WHO 2006)"},
        "ind_susut_zscore":      {"type": "boolean",    "derived": True, "description": "Susut (BAZ < -2, WHO 2006)"},
        "ind_obes_zscore":       {"type": "boolean",    "derived": True, "description": "Berlebihan berat badan / obes (BAZ > +2, WHO 2006)"},
        # Mismatch flags
        "flag_status_berat_vs_zscore": {"type": "boolean", "derived": True, "description": "Label sumber status_berat tidak sepadan dengan WAZ z-skor"},
        "flag_status_tinggi_vs_zscore":{"type": "boolean", "derived": True, "description": "Label sumber status_tinggi tidak sepadan dengan HAZ z-skor"},
        "flag_status_bmi_vs_zscore":   {"type": "boolean", "derived": True, "description": "Label sumber status_bmi tidak sepadan dengan BAZ z-skor"},
    }
    return {"source_fields": STANDARD_SCHEMA, "derived_fields": derived}


# ─── UPLOAD / PREVIEW ─────────────────────────────────────────────────────────

@app.post("/upload/preview")
async def upload_preview(
    file: UploadFile = File(...),
    sheet: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
):
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, sheets = read_file(content, filename, sheet)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(400, f"Fail tidak dapat dibaca: {e}")

    source_type = detect_source_type(df.columns.tolist())
    auto_map    = auto_suggest_mapping(df.columns.tolist(), source_type)

    total_rows = len(df)
    start      = (page - 1) * page_size
    page_data  = df.iloc[start:start + page_size].copy()
    page_data  = page_data.replace(r'^\s*$', np.nan, regex=True)
    page_data  = page_data.where(page_data.notna(), None)

    return JSONResponse(content=json_safe({
        "filename":     filename,
        "source_type":  source_type,
        "total_rows":   total_rows,
        "total_columns":len(df.columns),
        "columns":      df.columns.tolist(),
        "sheets":       sheets or [],
        "active_sheet": sheet or (sheets[0] if sheets else None),
        "preview":      page_data.to_dict(orient="records"),
        "page":         page,
        "page_size":    page_size,
        "total_pages":  max(1, (total_rows + page_size - 1) // page_size),
        "auto_mapping": auto_map,
    }))


# ─── MAPPING VALIDATION ───────────────────────────────────────────────────────

@app.post("/mapping/validate")
async def validate_mapping(
    file: UploadFile = File(...),
    mapping: str = "",
    sheet: Optional[str] = None,
):
    content  = await file.read()
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
        if not raw_col:
            continue
        if raw_col not in available_cols:
            errors.append({"field": std_field, "mapped_to": raw_col,
                           "issue": f"Kolum '{raw_col}' tidak wujud dalam fail"})
        else:
            schema_type = STANDARD_SCHEMA.get(std_field, {}).get("type", "unknown")
            col_dtype   = str(df[raw_col].dtype)
            ok.append({"field": std_field, "mapped_to": raw_col, "dtype": col_dtype})
            if schema_type == "numerical" and col_dtype == "object":
                pct_numeric = pd.to_numeric(df[raw_col], errors="coerce").notna().mean()
                if pct_numeric < 0.5:
                    warnings.append({
                        "field": std_field, "mapped_to": raw_col,
                        "issue": f"Kolum kelihatan bukan numerik ({round(pct_numeric*100)}% boleh ditukar)",
                    })

    from .config import CORE_FIELDS
    critical_unmapped = [
        f for f in CORE_FIELDS
        if f not in mapping_dict or not mapping_dict.get(f)
    ]
    if critical_unmapped:
        warnings.append({"field": "critical_fields", "mapped_to": None,
                         "issue": f"Medan kritikal tidak dipetakan: {critical_unmapped}"})

    return {
        "valid":           len(errors) == 0,
        "errors":          errors,
        "warnings":        warnings,
        "ok":              ok,
        "total_mapped":    len([v for v in mapping_dict.values() if v]),
        "available_columns": df.columns.tolist(),
    }


# ─── RUN EDA ──────────────────────────────────────────────────────────────────

@app.post("/eda/run")
async def run_eda_endpoint(
    file: UploadFile = File(...),
    mapping: str = "",
    source_type: str = "myvass",
    sheet: Optional[str] = None,
    bmi_threshold: float = Query(1.0, ge=0.1, le=10.0),
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

    report = run_eda(df, mapping_dict, source_type, bmi_threshold=bmi_threshold)

    # Strip private / large keys from public response
    for key in ["_cleaned_data", "_cleaned_columns", "_aggregated_full"]:
        report.pop(key, None)

    return JSONResponse(content=json_safe(report))


# ─── CLEANED DATA PREVIEW (paginated) ────────────────────────────────────────

@app.post("/cleaned/preview")
async def cleaned_preview(
    file: UploadFile = File(...),
    mapping: str = "",
    source_type: str = "myvass",
    sheet: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=5, le=200),
):
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    mapping_dict = json.loads(mapping) if mapping else {}
    report       = run_eda(df, mapping_dict, source_type)
    all_records  = report.get("_cleaned_data", [])
    cols         = report.get("_cleaned_columns", [])
    total_rows   = len(all_records)
    start        = (page - 1) * page_size

    return JSONResponse(content=json_safe({
        "total_rows":  total_rows,
        "total_pages": max(1, (total_rows + page_size - 1) // page_size),
        "page":        page,
        "page_size":   page_size,
        "columns":     cols,
        "records":     all_records[start:start + page_size],
    }))


# ─── DOWNLOAD CLEANED DATA ────────────────────────────────────────────────────

@app.post("/download/cleaned")
async def download_cleaned(
    file: UploadFile = File(...),
    mapping: str = "",
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

    mapping_dict    = json.loads(mapping) if mapping else {}
    report          = run_eda(df, mapping_dict, source_type)
    cleaned_records = report.get("_cleaned_data", [])
    cleaned_cols    = report.get("_cleaned_columns", [])
    if not cleaned_records:
        raise HTTPException(500, "Tiada data dibersih.")

    base = filename.rsplit(".", 1)[0]
    if fmt == "csv":
        data = cln_csv(cleaned_records, cleaned_cols)
        return StreamingResponse(iter([data]), media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="cleaned_{base}.csv"'})
    else:
        data = cln_excel(cleaned_records, cleaned_cols, base)
        return StreamingResponse(iter([data]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="cleaned_{base}.xlsx"'})


# ─── EXPORT AGGREGATED (TABLEAU) — NO ROW CAP ────────────────────────────────

@app.post("/export/aggregated")
async def export_aggregated(
    file: UploadFile = File(...),
    mapping: str = "",
    source_type: str = "myvass",
    sheet: Optional[str] = None,
    fmt: str = Query("csv", pattern="^(csv|xlsx)$"),
):
    """
    Tableau-ready flat aggregated table — every geo × age_group × indicator row.
    NO row cap. Includes sumber_indikator column (zscore | source_label).
    """
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    mapping_dict = json.loads(mapping) if mapping else {}
    report       = run_eda(df, mapping_dict, source_type)

    # Use the full (uncapped) aggregated table from the private key
    agg_rows = report.get("_aggregated_full", build_aggregated_table(report))
    if not agg_rows:
        raise HTTPException(422, "Tiada data indikator — pastikan status / berat / tinggi dipetakan.")

    base = filename.rsplit(".", 1)[0]
    if fmt == "xlsx":
        data = tbl_excel(agg_rows, base)
        return StreamingResponse(iter([data]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="tableau_{base}.xlsx"'})
    else:
        data = tbl_csv(agg_rows)
        return StreamingResponse(iter([data]), media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="tableau_{base}.csv"'})


# ─── MYVASS WIDE-TO-LONG PREVIEW ─────────────────────────────────────────────

@app.post("/transform/myvass-wide-to-long")
async def myvass_wide_to_long_endpoint(
    file: UploadFile = File(...),
    sheet: Optional[str] = None,
):
    content  = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    from .eda.runner import myvass_wide_to_long
    long_df = myvass_wide_to_long(df)
    return JSONResponse(content=json_safe({
        "original_rows": len(df),
        "long_rows":     len(long_df),
        "columns":       long_df.columns.tolist(),
        "preview":       long_df.head(10).replace({np.nan: None}).to_dict(orient="records"),
    }))


# ═══════════════════════════════════════════════════════════════════════════════
# KKM DATA CLEANING TOOL ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

from .eda.cleaning import clean_data, detect_data_type


@app.post("/clean/detect-type")
async def detect_type_endpoint(
    file: UploadFile = File(...),
    sheet: Optional[str] = None,
):
    """Detect data type from file columns."""
    content = await file.read()
    filename = file.filename or ""
    try:
        df, sheets = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    data_type = detect_data_type(df.columns.tolist(), filename)
    
    return JSONResponse(content=json_safe({
        "filename": filename,
        "detected_type": data_type,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": df.columns.tolist(),
        "sheets": sheets or [],
    }))


@app.post("/clean/quality-check")
async def quality_check_endpoint(
    file: UploadFile = File(...),
    data_type: str = "myvass",
    sheet: Optional[str] = None,
):
    """Get raw data quality analysis before cleaning."""
    content = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    # Basic quality stats
    quality = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": [],
    }
    
    for col in df.columns:
        col_data = df[col]
        non_null = col_data.notna().sum()
        null_count = len(df) - non_null
        unique_count = col_data.nunique()
        
        # Check if numeric
        numeric_vals = pd.to_numeric(col_data, errors="coerce")
        is_numeric = numeric_vals.notna().sum() > non_null * 0.8
        
        col_info = {
            "name": col,
            "non_null": int(non_null),
            "null_count": int(null_count),
            "null_percent": round((null_count / len(df)) * 100, 1) if len(df) > 0 else 0,
            "unique_count": int(unique_count),
            "is_numeric": is_numeric,
        }
        
        if is_numeric and non_null > 0:
            col_info["min"] = float(numeric_vals.min()) if numeric_vals.notna().any() else None
            col_info["max"] = float(numeric_vals.max()) if numeric_vals.notna().any() else None
            col_info["mean"] = round(float(numeric_vals.mean()), 2) if numeric_vals.notna().any() else None
        else:
            sample = col_data.dropna().head(5).tolist()
            col_info["sample_values"] = [str(v)[:50] for v in sample]
        
        quality["columns"].append(col_info)
    
    # Overall completeness
    total_cells = len(df) * len(df.columns)
    filled_cells = sum(c["non_null"] for c in quality["columns"])
    quality["overall_completeness"] = round((filled_cells / total_cells) * 100, 1) if total_cells > 0 else 0
    
    return JSONResponse(content=json_safe(quality))


@app.post("/clean/run")
async def clean_run_endpoint(
    file: UploadFile = File(...),
    data_type: str = "myvass",
    sheet: Optional[str] = None,
):
    """Run the cleaning process and return cleaned data with statistics."""
    content = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    try:
        cleaned_df, stats = clean_data(df, data_type)
    except Exception as e:
        raise HTTPException(500, f"Cleaning error: {str(e)}")
    
    # Convert cleaned data to records
    cleaned_records = cleaned_df.replace({np.nan: None}).to_dict(orient="records")
    
    return JSONResponse(content=json_safe({
        "success": True,
        "data_type": data_type,
        "stats": stats,
        "cleaned_columns": cleaned_df.columns.tolist(),
        "cleaned_count": len(cleaned_df),
        "preview": cleaned_records[:100],  # First 100 rows for preview
    }))


@app.post("/clean/download")
async def clean_download_endpoint(
    file: UploadFile = File(...),
    data_type: str = "myvass",
    sheet: Optional[str] = None,
    fmt: str = Query("xlsx", pattern="^(csv|xlsx)$"),
):
    """Download cleaned data as CSV or Excel."""
    content = await file.read()
    filename = file.filename or ""
    try:
        df, _ = read_file(content, filename, sheet)
    except Exception as e:
        raise HTTPException(400, str(e))

    try:
        cleaned_df, stats = clean_data(df, data_type)
    except Exception as e:
        raise HTTPException(500, f"Cleaning error: {str(e)}")

    if len(cleaned_df) == 0:
        raise HTTPException(422, "No data after cleaning")

    base = filename.rsplit(".", 1)[0]
    timestamp = pd.Timestamp.now().strftime("%Y%m%d")
    
    if fmt == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            # Cleaned data sheet
            cleaned_df.to_excel(writer, sheet_name="Cleaned Data", index=False)
            
            # Stats sheet
            stats_df = pd.DataFrame([
                {"Metric": k, "Value": v} 
                for k, v in stats.items() 
                if not isinstance(v, dict)
            ])
            stats_df.to_excel(writer, sheet_name="Cleaning Stats", index=False)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.read()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{data_type.upper()}_Cleaned_{timestamp}.xlsx"'}
        )
    else:
        output = io.StringIO()
        cleaned_df.to_csv(output, index=False)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{data_type.upper()}_Cleaned_{timestamp}.csv"'}
        )
