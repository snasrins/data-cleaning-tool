/**
 * Centralised API client.
 * All fetch() calls go through here — no scattered API calls in components.
 */
import { API } from '../constants.js';

const _fd = (file, extras = {}) => {
  const fd = new FormData();
  fd.append('file', file);
  Object.entries(extras).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });
  return fd;
};

const _throw = async (res) => {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || JSON.stringify(j); } catch {}
    throw new Error(msg);
  }
  return res;
};

// ── Health check ──────────────────────────────────────────────────────────────
export const checkHealth = async () => {
  try {
    const r = await fetch(`${API}/`);
    return r.ok;
  } catch { return false; }
};

// ── Upload + preview ──────────────────────────────────────────────────────────
export const uploadPreview = async (file, { sheet, page = 1, pageSize = 20 } = {}) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (sheet) params.set('sheet', sheet);
  const r = await fetch(`${API}/upload/preview?${params}`, {
    method: 'POST',
    body: _fd(file),
  });
  await _throw(r);
  return r.json();
};

// ── Validate mapping ──────────────────────────────────────────────────────────
export const validateMapping = async (file, mapping, sheet = null) => {
  const params = sheet ? `?sheet=${encodeURIComponent(sheet)}` : '';
  const r = await fetch(`${API}/mapping/validate${params}`, {
    method: 'POST',
    body: _fd(file, { mapping: JSON.stringify(mapping) }),
  });
  await _throw(r);
  return r.json();
};

// ── Run EDA ───────────────────────────────────────────────────────────────────
export const runEDA = async (file, mapping, sourceType, sheet = null, config = {}) => {
  const params = new URLSearchParams({ 
    source_type: sourceType,
    outlier_action: config.outlier_action || 'flag',
    missing_strategy: config.missing_strategy || 'exclude',
    normalize_spelling: config.normalize_spelling !== false ? 'true' : 'false',
  });
  if (sheet) params.set('sheet', sheet);
  if (config.age_filter) params.set('age_filter', config.age_filter);
  if (config.year_filter) params.set('year_filter', config.year_filter);
  
  const r = await fetch(`${API}/eda/run?${params}`, {
    method: 'POST',
    body: _fd(file, { mapping: JSON.stringify(mapping) }),
  });
  await _throw(r);
  return r.json();
};

// ── Cleaned data preview (paginated) ──────────────────────────────────────────
export const cleanedPreview = async (file, mapping, sourceType, page = 1, pageSize = 50, sheet = null) => {
  const params = new URLSearchParams({
    source_type: sourceType, page: String(page), page_size: String(pageSize),
  });
  if (sheet) params.set('sheet', sheet);
  const r = await fetch(`${API}/cleaned/preview?${params}`, {
    method: 'POST',
    body: _fd(file, { mapping: JSON.stringify(mapping) }),
  });
  await _throw(r);
  return r.json();
};

// ── Download cleaned data ─────────────────────────────────────────────────────
export const downloadCleaned = (file, mapping, sourceType, fmt = 'csv', sheet = null) => {
  const params = new URLSearchParams({ source_type: sourceType, fmt });
  if (sheet) params.set('sheet', sheet);
  const fd = _fd(file, { mapping: JSON.stringify(mapping) });
  return fetch(`${API}/download/cleaned?${params}`, { method: 'POST', body: fd });
};

// ── Export aggregated for Tableau ─────────────────────────────────────────────
export const exportAggregated = (file, mapping, sourceType, fmt = 'xlsx', sheet = null) => {
  const params = new URLSearchParams({ source_type: sourceType, fmt });
  if (sheet) params.set('sheet', sheet);
  const fd = _fd(file, { mapping: JSON.stringify(mapping) });
  return fetch(`${API}/export/aggregated?${params}`, { method: 'POST', body: fd });
};

// ── Trigger browser file download from a fetch response ───────────────────────
export const triggerDownload = async (fetchPromise, fallbackFilename) => {
  const r = await fetchPromise;
  await _throw(r);
  const blob = await r.blob();
  const cd   = r.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="?([^"]+)"?/);
  const name  = match ? match[1] : fallbackFilename;
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

// ── MYVASS wide-to-long preview ───────────────────────────────────────────────
export const transformWideToLong = async (file, sheet = null) => {
  const params = sheet ? `?sheet=${encodeURIComponent(sheet)}` : '';
  const r = await fetch(`${API}/transform/myvass-wide-to-long${params}`, {
    method: 'POST', body: _fd(file),
  });
  await _throw(r);
  return r.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// KKM DATA CLEANING TOOL API
// ═══════════════════════════════════════════════════════════════════════════════

// ── Detect data type from file ────────────────────────────────────────────────
export const detectDataType = async (file, sheet = null) => {
  const params = sheet ? `?sheet=${encodeURIComponent(sheet)}` : '';
  const r = await fetch(`${API}/clean/detect-type${params}`, {
    method: 'POST', body: _fd(file),
  });
  await _throw(r);
  return r.json();
};

// ── Get raw data quality analysis ─────────────────────────────────────────────
export const getQualityCheck = async (file, dataType = 'myvass', sheet = null) => {
  const params = new URLSearchParams({ data_type: dataType });
  if (sheet) params.set('sheet', sheet);
  const r = await fetch(`${API}/clean/quality-check?${params}`, {
    method: 'POST', body: _fd(file),
  });
  await _throw(r);
  return r.json();
};

// ── Run cleaning process ──────────────────────────────────────────────────────
export const runCleaning = async (file, dataType = 'myvass', sheet = null) => {
  const params = new URLSearchParams({ data_type: dataType });
  if (sheet) params.set('sheet', sheet);
  const r = await fetch(`${API}/clean/run?${params}`, {
    method: 'POST', body: _fd(file),
  });
  await _throw(r);
  return r.json();
};

// ── Download cleaned data ─────────────────────────────────────────────────────
export const downloadCleanedData = (file, dataType = 'myvass', fmt = 'xlsx', sheet = null) => {
  const params = new URLSearchParams({ data_type: dataType, fmt });
  if (sheet) params.set('sheet', sheet);
  return fetch(`${API}/clean/download?${params}`, { method: 'POST', body: _fd(file) });
};
