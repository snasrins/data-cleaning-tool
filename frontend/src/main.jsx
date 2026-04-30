import React, { useState, useEffect, useRef, useCallback } from 'react';
import { STEPS, SCHEMA_DESC, LOADING_MSGS, REPORT_TABS, MYVASS_TABS, KKM_TABS } from './constants.js';
import { IconUpload, IconPlay, IconValidate, IconDownload, IconLogo, IconCleanedDownload } from './components/Icons.jsx';
import DataTable from './components/DataTable.jsx';
import Pagination from './components/Pagination.jsx';
import StatCard from './components/StatCard.jsx';
import QualityScore from './components/QualityScore.jsx';
import ReviewPanel from './components/ReviewPanel.jsx';
import FilterControls from './components/FilterControls.jsx';
import SvgIcon from './components/SvgIcon.jsx';
import {
  DashboardTab, TaskaTab, IndicatorsTab, ChartsTab, MissingTab, CompletenessTab,
  NumericalTab, CategoricalTab, BmiTab, ZscoreTab, IcTab,
  SpellingTab, DupTab, AgeTab, ChangesTab, ProfileTab, TableauPrepTab,
  MyvassDashboardTab, MyvassQualityTab, KKMQualityTab, KKMVisualizationTab, KKMDuplicatesTab,
} from './components/tabs/index.js';
import {
  checkHealth, uploadPreview, validateMapping, runEDA,
  downloadCleaned, exportAggregated, triggerDownload,
} from './api/client.js';

/* ════════════════════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  // ── State ──
  const [step, setStep] = useState(1);
  const [apiOnline, setApiOnline] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sourceType, setSourceType] = useState('myvass');
  const [datasetInfo, setDatasetInfo] = useState(null);  // NEW: Dataset detection info
  const [mapping, setMapping] = useState({});
  const [validateResult, setValidateResult] = useState(null);
  const [validateErrors, setValidateErrors] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [edaReport, setEdaReport] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cleanedPage, setCleanedPage] = useState(1);
  const [cleanedTotal, setCleanedTotal] = useState(1);
  const [cleanedRows, setCleanedRows] = useState([]);
  const [cleanedTotalRows, setCleanedTotalRows] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [showMappingEdit, setShowMappingEdit] = useState(false);
  const [processingConfig, setProcessingConfig] = useState({
    outlier_action: 'flag',
    missing_strategy: 'exclude',
    normalize_spelling: true,
  });
  const [dataFilters, setDataFilters] = useState({
    age: '',
    year: '',
  });

  const fileInputRef = useRef(null);

  // DEBUG: Monitor mapping changes
  useEffect(() => {
    console.log('Mapping state changed:', mapping);
    console.log('Number of mapped fields:', Object.values(mapping).filter(v => v).length);
  }, [mapping]);

  // ── API check ──
  useEffect(() => {
    const check = async () => { setApiOnline(await checkHealth()); };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, []);

  // ── Auto-fetch cleaned page when EDA report arrives ──
  useEffect(() => {
    if (edaReport && step === 5) {
      if (edaReport.cleaned_preview?.length) {
        setCleanedRows(edaReport.cleaned_preview);
        const totalRows = edaReport.total_rows || edaReport.cleaned_preview.length;
        setCleanedTotalRows(totalRows);
        setCleanedTotal(Math.max(1, Math.ceil(totalRows / 50)));
        setCleanedPage(1);
      }
    }
  }, [edaReport, step]);

  // ── Navigate ──
  const goTo = useCallback((n) => setStep(n), []);

  // ── Upload + Preview ──
  const loadPreview = useCallback(async (file, sheet = null, page = 1, isPageChange = false) => {
    if (isPageChange) setPageLoading(true);
    try {
      const data = await uploadPreview(file, { sheet, page, pageSize: 20 });
      setPreviewData(data);
      setActiveSheet(data.active_sheet);
      setCurrentPage(Number(data.page) || 1);
      setTotalPages(Number(data.total_pages) || 1);
      setSourceType(data.source_type);
      setDatasetInfo(data.dataset_info || null);  // NEW: Store dataset detection info
      if (!isPageChange) {
        const autoMap = {};
        Object.keys(SCHEMA_DESC).forEach((field) => {
          autoMap[field] = data.auto_mapping?.[field] || '';
        });
        console.log('Setting initial mapping from preview:', autoMap);
        setMapping(autoMap);
        goTo(2);
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      if (isPageChange) setPageLoading(false);
    }
  }, [goTo]);

  const handleFile = useCallback((file) => {
    setUploadedFile(file);
    setActiveSheet(null);
    setCurrentPage(1);
    loadPreview(file);
  }, [loadPreview]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handlePageChange = useCallback((p) => {
    if (!uploadedFile || pageLoading) return;
    loadPreview(uploadedFile, activeSheet, p, true);
  }, [uploadedFile, activeSheet, loadPreview, pageLoading]);

  const switchSheet = useCallback((sheet) => {
    setActiveSheet(sheet);
    if (uploadedFile) loadPreview(uploadedFile, sheet, 1);
  }, [uploadedFile, loadPreview]);

  // ── Mapping ──
  const updateMapping = useCallback((field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value === '\u2014 langkau \u2014' ? '' : value }));
    setValidateResult(null);
    setValidateErrors([]);
  }, []);

  const getActiveMapping = useCallback(() => {
    const m = {};
    Object.entries(mapping).forEach(([k, v]) => { if (v) m[k] = v; });
    console.log('getActiveMapping called:', { mapping, filtered: m });
    return m;
  }, [mapping]);

  // ── Validate mapping ──
  const handleValidateMapping = useCallback(async () => {
    if (!uploadedFile) return;
    try {
      const data = await validateMapping(uploadedFile, getActiveMapping(), activeSheet);
      setValidateResult(data);
      setValidateErrors(data.errors?.map((e) => e.field) || []);
    } catch (err) { alert('Ralat pengesahan: ' + err.message); }
  }, [uploadedFile, activeSheet, getActiveMapping]);

  // ── Run EDA ──
  const handleRunEDA = useCallback(async () => {
    if (!uploadedFile) return;
    console.log('handleRunEDA called');
    console.log('Current mapping state:', mapping);
    console.log('getActiveMapping() returns:', getActiveMapping());
    goTo(4);
    let msgIdx = 0;
    const iv = setInterval(() => {
      setLoadingMsg(LOADING_MSGS[msgIdx++ % LOADING_MSGS.length]);
    }, 900);
    setLoadingMsg(LOADING_MSGS[0]);
    try {
      const config = {
        ...processingConfig,
        age_filter: dataFilters.age,
        year_filter: dataFilters.year,
      };
      const report = await runEDA(
        uploadedFile, 
        getActiveMapping(), 
        sourceType, 
        activeSheet,
        config  // Pass combined configuration including filters
      );
      clearInterval(iv);
      setEdaReport(report);
      setActiveTab('dashboard');
      goTo(5);
    } catch (err) {
      clearInterval(iv);
      alert('EDA Error: ' + err.message);
      goTo(2);
    }
  }, [uploadedFile, activeSheet, sourceType, goTo, getActiveMapping, processingConfig, dataFilters]);

  // ── Cleaned data pagination ──
  const fetchCleanedPage = useCallback(async (page) => {
    if (!uploadedFile) return;
    const { cleanedPreview: cp } = await import('./api/client.js');
    try {
      const data = await cp(uploadedFile, getActiveMapping(), sourceType, page, 50, activeSheet);
      setCleanedPage(data.page);
      setCleanedTotal(data.total_pages);
      setCleanedRows(data.records);
      setCleanedTotalRows(data.total_rows);
    } catch {
      if (edaReport?.cleaned_preview) setCleanedRows(edaReport.cleaned_preview);
    }
  }, [uploadedFile, activeSheet, sourceType, getActiveMapping, edaReport]);

  // ── Downloads ──
  const handleDownloadCleaned = useCallback(async (fmt = 'csv') => {
    if (!uploadedFile) return;
    try {
      await triggerDownload(
        downloadCleaned(uploadedFile, getActiveMapping(), sourceType, fmt, activeSheet),
        `cleaned.${fmt}`);
    } catch (err) { alert('Ralat muat turun: ' + err.message); }
  }, [uploadedFile, activeSheet, sourceType, getActiveMapping]);

  const handleExportTableau = useCallback(async (fmt = 'xlsx') => {
    if (!uploadedFile) return;
    try {
      await triggerDownload(
        exportAggregated(uploadedFile, getActiveMapping(), sourceType, fmt, activeSheet),
        `tableau.${fmt}`);
    } catch (err) { alert('Ralat eksport Tableau: ' + err.message); }
  }, [uploadedFile, activeSheet, sourceType, getActiveMapping]);

  const downloadReport = () => {
    if (!edaReport) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(edaReport, null, 2)], { type: 'application/json' }));
    a.download = `laporan_eda_${Date.now()}.json`;
    a.click();
  };

  /* ═══════════════════════════════════════ RENDER ═════════════════════════════ */
  const r = edaReport;

  return (
    <>
      {/* ── HEADER ── */}
      <header>
        <div className="logo-wrap">
          <IconLogo />
          <div className="logo-text">KKM Nutrition EDA <span>&middot;</span> Data Quality & Tableau Prep</div>
        </div>
        <div className="badge">Aras Integrasi &middot; v4.0</div>
        <div style={{ flex: 1 }} />
        <div className="badge api-status">
          <span className={`status-dot ${apiOnline ? 'online' : 'offline'}`} />
          <span>{apiOnline ? 'API Online' : 'API Offline'}</span>
        </div>
      </header>

      {/* ── STEPPER ── */}
      <div className="stepper">
        {STEPS.map((s, i) => {
          const cls = step === s.num ? 'active' : step > s.num ? 'done' : '';
          return (
            <React.Fragment key={s.num}>
              {i > 0 && <div className="step-arrow">&rarr;</div>}
              <div className={`step ${cls}`}>
                <div className="step-num">{cls === 'done' ? '\u2713' : s.num}</div>
                {s.label}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <main>
        {/* ══ SEC 1: UPLOAD ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="section">
            <div className="card">
              <div className="card-title">Upload Data File</div>
              <div
                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <IconUpload />
                {uploadedFile ? (
                  <>
                    <div className="drop-title">{uploadedFile.name}</div>
                    <div className="drop-sub">{(uploadedFile.size / 1024).toFixed(1)} KB</div>
                  </>
                ) : (
                  <>
                    <div className="drop-title">Drop file here or click to browse</div>
                    <div className="drop-sub">Supports .xlsx, .xls, .csv &middot; Auto-detects NCDC or MyVass format</div>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            </div>

            {/* Dataset Detection Info */}
            {datasetInfo && (
              <div className="card" style={{ 
                borderColor: datasetInfo.type === 'unknown' ? 'rgba(240,92,107,0.3)' : 'rgba(56,217,192,0.3)', 
                background: datasetInfo.type === 'unknown' ? 'rgba(240,92,107,0.05)' : 'rgba(56,217,192,0.05)' 
              }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SvgIcon name={datasetInfo.type === 'unknown' ? 'warning' : 'checkCircle'} 
                    color={datasetInfo.type === 'unknown' ? 'var(--danger)' : 'var(--success)'} 
                    size={20} />
                  Dataset Detected: {datasetInfo.suggested_name}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  {datasetInfo.description}
                </p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  <div>
                    <strong style={{ color: 'var(--accent)' }}>Type:</strong>{' '}
                    <span className={`source-pill ${datasetInfo.type === 'ncdc' ? 'myvass' : 'klinik'}`}>
                      {datasetInfo.type.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--accent)' }}>Confidence:</strong>{' '}
                    {(datasetInfo.confidence * 100).toFixed(0)}%
                  </div>
                  <div>
                    <strong style={{ color: 'var(--accent)' }}>Signature Columns:</strong>{' '}
                    {datasetInfo.signature_columns.slice(0, 3).join(', ')}
                    {datasetInfo.signature_columns.length > 3 && ` + ${datasetInfo.signature_columns.length - 3} more`}
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ borderColor: 'rgba(56,217,192,0.15)', background: 'rgba(56,217,192,0.02)' }}>
              <div className="card-title">Supported Data Formats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.82rem' }}>
                <div>
                  <div className="source-pill myvass" style={{ marginBottom: 8 }}>NCDC TASKA</div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.77rem', lineHeight: 1.6 }}>
                    Status Kesihatan Kanak-Kanak Kebangsaan TASKA data. Wide format with year-prefixed columns (2023-2026). 
                    Includes TASKA performance metrics and age group classifications.
                  </p>
                </div>
                <div>
                  <div className="source-pill klinik" style={{ marginBottom: 8 }}>MyVass Clinic</div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.77rem', lineHeight: 1.6 }}>
                    Child nutrition & immunisation surveillance system. Raw anthropometric measurements with vaccine registry. 
                    Includes birth IC, assessment status, and clinic location data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ SEC 2: PREVIEW & CONFIGURE ══════════════════════════════════ */}
        {step === 2 && previewData && (
          <div className="section">
            <div className="card">
              <div className="row-flex" style={{ marginBottom: 16 }}>
                <div className="card-title" style={{ margin: 0 }}>File Preview</div>
                <span className={`source-pill ${previewData.source_type}`}>Detected: {previewData.source_type.toUpperCase()}</span>
                <div style={{ flex: 1 }} />
                <button className="btn btn-secondary" onClick={() => goTo(1)}>&larr; Back</button>
                <button className="btn btn-primary" onClick={() => goTo(3)}>Configure Rules &rarr;</button>
              </div>
              <div className="stats-grid">
                <StatCard val={previewData.total_rows.toLocaleString()} label="Total Rows" />
                <StatCard val={previewData.total_columns} label="Columns" />
                <StatCard val={previewData.source_type.toUpperCase()} label="Source Type" />
                <StatCard val={previewData.filename.split('.').pop().toUpperCase()} label="Format" />
                {previewData.sheets?.length > 1 && <StatCard val={previewData.sheets.length} label="Helaian" />}
              </div>
              
              {/* Preview Truncation Notice */}
              {previewData.is_preview_truncated && (
                <div style={{
                  background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.3)',
                  borderRadius: 6, padding: '10px 14px', marginTop: 12, marginBottom: 12,
                  fontSize: '0.75rem', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <SvgIcon name="warning" size={14} color="var(--accent)" />
                  <span style={{ color: 'var(--muted)' }}>
                    <strong style={{ color: 'var(--accent)' }}>Large File Detected:</strong>{' '}
                    Preview limited to first {previewData.preview_limit.toLocaleString()} rows for performance.
                    Full dataset will be processed during EDA analysis.
                  </span>
                </div>
              )}
              
              {previewData.sheets?.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="card-title" style={{ marginBottom: 8 }}>Pilih Helaian</div>
                  <div className="sheet-tabs">
                    {previewData.sheets.map((s) => (
                      <div key={s} className={`sheet-tab ${s === activeSheet ? 'active' : ''}`} onClick={() => switchSheet(s)}>{s}</div>
                    ))}
                  </div>
                </div>
              )}
              <DataTable rows={previewData.preview} />
              <Pagination current={currentPage} total={totalPages} onPage={handlePageChange} disabled={pageLoading} />
            </div>

            {/* Auto-mapping summary card */}
            {(() => {
              const mapped = Object.entries(mapping).filter(([, v]) => v);
              const unmapped = Object.entries(mapping).filter(([, v]) => !v);
              const critical = ['id','jantina','tarikh_lahir','negeri','daerah','berat_kg','tinggi_cm','tarikh_ukur'];
              const missingCritical = critical.filter((f) => !mapping[f]);
              return (
                <div className="card" style={{ borderColor: 'rgba(56,217,192,0.2)' }}>
                  <div className="row-flex" style={{ marginBottom: 10 }}>
                    <div className="card-title" style={{ margin: 0 }}>Auto-Detected Field Mapping</div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--muted)', marginLeft: 8 }}>
                      {mapped.length} of {Object.keys(SCHEMA_DESC).length} standard fields matched automatically
                    </span>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                      onClick={() => setShowMappingEdit((x) => !x)}>
                      {showMappingEdit ? 'Hide Editor' : 'Edit Mapping'}
                    </button>
                  </div>
                  {missingCritical.length > 0 && (
                    <div style={{ background: 'rgba(250,173,20,0.08)', border: '1px solid rgba(250,173,20,0.25)',
                      borderRadius: 6, padding: '7px 12px', marginBottom: 10, fontSize: '0.74rem' }}>
                      <strong style={{ color: 'var(--warn)' }}>
                        <SvgIcon name="warning" size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {missingCritical.length} critical fields not found:
                      </strong>
                      <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.7rem', marginLeft: 8 }}>
                        {missingCritical.join(' · ')}
                      </span>
                      <span style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                        Z-scores and KKM indicators require these fields. Use "Edit Mapping" to fix.
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: showMappingEdit ? 16 : 0 }}>
                    {mapped.map(([field, col]) => (
                      <div key={field} style={{
                        background: 'rgba(56,217,192,0.08)', border: '1px solid rgba(56,217,192,0.25)',
                        borderRadius: 5, padding: '3px 9px', fontSize: '0.7rem', fontFamily: 'var(--mono)',
                      }}>
                        <span style={{ color: 'var(--accent)' }}>{field}</span>
                        <span style={{ color: 'var(--muted)', margin: '0 4px' }}>→</span>
                        <span style={{ color: 'var(--text)' }}>{col}</span>
                      </div>
                    ))}
                    {unmapped.map(([field]) => (
                      <div key={field} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                        borderRadius: 5, padding: '3px 9px', fontSize: '0.7rem', fontFamily: 'var(--mono)',
                        opacity: 0.45,
                      }}>
                        <span style={{ color: 'var(--muted)' }}>{field}</span>
                        <span style={{ color: 'var(--muted)', margin: '0 4px' }}>→</span>
                        <span style={{ color: 'var(--muted)' }}>skipped</span>
                      </div>
                    ))}
                  </div>
                  {showMappingEdit && (
                    <div className="mapping-grid" style={{ marginTop: 8 }}>
                      {Object.entries(SCHEMA_DESC).map(([field, desc]) => {
                        const val = mapping[field] || '';
                        return (
                          <React.Fragment key={field}>
                            <div className="map-std-label">{field}<div className="map-std-desc">{desc}</div></div>
                            <div className="map-arrow">→</div>
                            <select className={`map-select ${val ? 'mapped' : ''}`}
                              value={val || '— skip —'} onChange={(e) => updateMapping(field, e.target.value)}>
                              <option value="— skip —">— skip —</option>
                              {(previewData.columns || []).map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ SEC 3: CONFIGURE PROCESSING RULES ═══════════════════════════ */}
        {step === 3 && previewData && (
          <ReviewPanel 
            previewData={previewData}
            mapping={mapping}
            sourceType={sourceType}
            onConfigUpdate={(config) => setProcessingConfig(config)}
            onProceed={handleRunEDA}
          />
        )}

        {/* ══ SEC 4: ANALYSING ══════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="section">
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="loader">
                <div className="spinner-ring" />
                <div className="loading-title">{loadingMsg || 'Running EDA analysis...'}</div>
                <div className="loading-sub">Validating IC · Missing values · Spelling · Age · WHO 2006 z-scores · Quality score</div>
              </div>
            </div>
          </div>
        )}

        {/* ══ SEC 5: REPORT ═════════════════════════════════════════════════ */}
        {step === 5 && r && (
          <div className="section">
            <div className="row-flex" style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>EDA Report</h2>
              <span className={`source-pill ${r.source_type}`}>{r.source_type.toUpperCase()}</span>
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={() => goTo(2)}>&larr; Back</button>
              <button className="btn btn-secondary" onClick={downloadReport}><IconDownload /> Export JSON</button>
            </div>

            <QualityScore qs={r.data_quality_score} />

            {/* Sampling Notice */}
            {r.is_sampled && r.sample_info && (
              <div style={{
                background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.3)',
                borderRadius: 8, padding: '12px 16px', marginBottom: 14,
                fontSize: '0.78rem', lineHeight: 1.7,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <SvgIcon name="warning" size={16} color="var(--accent)" />
                  <strong style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
                    Performance Optimization: Dataset Sampled for Analysis
                  </strong>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                  Your dataset has <strong style={{ color: 'var(--text)' }}>{r.sample_info.original_rows.toLocaleString()}</strong> rows, 
                  which is too large for real-time analysis. 
                  We analyzed a representative sample of{' '}
                  <strong style={{ color: 'var(--accent)' }}>{r.sample_info.sampled_rows.toLocaleString()} rows ({r.sample_info.sample_ratio}%)</strong>
                  {' '}using <strong>{r.sample_info.sampling_method}</strong> sampling to maintain data distribution.
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 8, fontStyle: 'italic' }}>
                  💡 The full dataset will be used when you download the cleaned data. This sampling only affects the analysis statistics shown here.
                </div>
              </div>
            )}

            {/* Unmapped critical fields warning */}
            {r.unmapped_critical_fields?.length > 0 && (
              <div style={{
                background: 'rgba(250,173,20,0.08)', border: '1px solid rgba(250,173,20,0.3)',
                borderRadius: 8, padding: '10px 16px', marginBottom: 14,
                fontSize: '0.78rem', lineHeight: 1.7, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <strong style={{ color: 'var(--warn)' }}>&#9888; {r.unmapped_critical_fields.length} medan kritikal tidak dipetakan</strong>
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.72rem' }}>
                  {r.unmapped_critical_fields.join(' \u00b7 ')}
                </span>
                <button className="btn btn-warn" style={{ padding: '2px 10px', fontSize: '0.72rem', marginLeft: 'auto' }} onClick={() => goTo(2)}>
                  Fix Mapping
                </button>
              </div>
            )}

            <div className="stats-grid">
              <StatCard val={r.total_rows?.toLocaleString()} label="Total Rows" />
              <StatCard val={r.total_columns} label="Original Columns" />
              {(() => {
                const nm = r.n_mapped_standard ?? 0;
                const tot = Object.keys(SCHEMA_DESC).length;
                return <StatCard val={`${nm}/${tot}`} label="Fields Mapped" color={nm >= 6 ? 'var(--success)' : nm >= 3 ? 'var(--warn)' : 'var(--danger)'} />;
              })()}
              {(() => {
                const ic = r.ic_validation;
                if (ic?.total > 0) {
                  const col = ic.pct_valid >= 80 ? 'var(--success)' : ic.pct_valid >= 50 ? 'var(--warn)' : 'var(--danger)';
                  return <StatCard val={`${ic.valid}/${ic.total}`} label="Valid IC" color={col} />;
                }
                return <StatCard val="N/A" label="Valid IC" color="var(--muted)" />;
              })()}
              {(() => {
                const n = Object.values(r.missing_values || {}).filter((m) => m.pct_missing > 0).length;
                return <StatCard val={n} label="Cols with Nulls" color={n > 0 ? 'var(--warn)' : 'var(--success)'} />;
              })()}
              {(() => {
                const n = r.duplicates?.duplicate_rows ?? 0;
                return <StatCard val={n.toLocaleString()} label="Duplicates" color={n > 0 ? 'var(--warn)' : 'var(--success)'} />;
              })()}
              <StatCard val={r.changes_applied?.length || 0} label="Changes Applied" />
              {(() => {
                const qs = r.data_quality_score?.score ?? '--';
                const col = qs === '--' ? undefined : qs >= 85 ? 'var(--success)' : qs >= 70 ? 'var(--warn)' : 'var(--danger)';
                return <StatCard val={`${qs}/100`} label="Quality Score" color={col} />;
              })()}
            </div>

            {/* ID Handling Summary */}
            {r.ic_validation?.total > 0 && (
              <div className="card" style={{ borderColor: 'rgba(79,142,247,0.2)' }}>
                <div className="card-title">IC / MyKid Validation Summary</div>
                <div className="stats-grid" style={{ marginBottom: 12 }}>
                  <StatCard val={r.ic_validation.valid} label="Valid IC (12-digit)" color="var(--success)" />
                  <StatCard val={r.ic_validation.invalid} label="Invalid / Issues" color="var(--danger)" />
                  <StatCard val={`${r.ic_validation.pct_valid}%`} label="Valid Rate" color={r.ic_validation.pct_valid >= 80 ? 'var(--success)' : 'var(--warn)'} />
                  {r.id_analysis?.unique_children > 0 && <StatCard val={r.id_analysis.unique_children} label="Unique Children" color="var(--accent)" />}
                </div>
                {Object.keys(r.ic_validation.issue_breakdown || {}).length > 0 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    {Object.entries(r.ic_validation.issue_breakdown).map(([issue, cnt]) => (
                      <div key={issue} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>
                        <span style={{ color: 'var(--warn)' }}>{issue}</span>: <span style={{ color: 'var(--text)' }}>{cnt}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  See the <strong style={{ color: 'var(--accent2)', cursor: 'pointer' }} onClick={() => setActiveTab('ic')}>IC / MyKid Audit</strong> tab for full validation rules and ID type breakdown.
                </div>
              </div>
            )}

            {/* Null Value Summary */}
            {(() => {
              const nullCols = Object.entries(r.missing_values || {}).filter(([, m]) => m.n_missing > 0);
              const totalNulls = nullCols.reduce((s, [, m]) => s + m.n_missing, 0);
              if (totalNulls === 0) return null;
              return (
                <div className="card" style={{ borderColor: 'rgba(240,92,107,0.2)' }}>
                  <div className="card-title">Missing Values Summary</div>
                  <div className="stats-grid" style={{ marginBottom: 10 }}>
                    <StatCard val={nullCols.length} label="Columns with Nulls" color="var(--warn)" />
                    <StatCard val={totalNulls.toLocaleString()} label="Total Null Cells" color="var(--danger)" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {nullCols.slice(0, 10).map(([col, m]) => (
                      <div key={col} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>
                        <span style={{ color: 'var(--accent2)' }}>{col}</span>: <span style={{ color: 'var(--danger)' }}>{m.n_missing}</span> <span style={{ color: 'var(--muted)' }}>({m.pct_missing}%)</span>
                      </div>
                    ))}
                    {nullCols.length > 10 && <span style={{ color: 'var(--muted)', fontSize: '0.7rem', alignSelf: 'center' }}>+{nullCols.length - 10} more</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 8 }}>
                  See the <strong style={{ color: 'var(--accent2)', cursor: 'pointer' }} onClick={() => setActiveTab('missing')}>Missing Values</strong> tab for full details.
                  </div>
                </div>
              );
            })()}

            {/* Download row */}
            <div className="dl-row">
              <IconCleanedDownload />
              <div className="dl-label">Download cleaned data:</div>
              <button className="btn btn-success" onClick={() => handleDownloadCleaned('csv')}>CSV</button>
              <button className="btn btn-success" onClick={() => handleDownloadCleaned('xlsx')}>XLSX</button>
              <div className="dl-label" style={{ marginLeft: 12 }}>Export to Tableau:</div>
              <button className="btn btn-purple" onClick={() => handleExportTableau('csv')}>Aggregated CSV</button>
              <button className="btn btn-purple" onClick={() => handleExportTableau('xlsx')}>Aggregated XLSX</button>
            </div>

            {/* Filter Controls (Age & Year) */}
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--s1) 0%, var(--s2) 100%)', marginBottom: 20 }}>
              <div className="card-title">
                <SvgIcon name="filter" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Filter Data by Age & Year
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12 }}>
                Select age range and/or year to view specific subsets. Click "Apply Filters" to re-run analysis.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <FilterControls 
                  onFilterChange={setDataFilters} 
                  currentFilters={dataFilters} 
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleRunEDA}
                  disabled={!dataFilters.age && !dataFilters.year}
                  style={{ marginLeft: 'auto' }}
                >
                  <IconPlay /> Apply Filters & Re-analyze
                </button>
              </div>
              {(dataFilters.age || dataFilters.year) && r.filters_applied && (
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--success)', 
                  marginTop: 12, 
                  padding: '8px 12px', 
                  background: 'rgba(52, 210, 107, 0.1)',
                  border: '1px solid rgba(52, 210, 107, 0.3)',
                  borderRadius: 6
                }}>
                  <SvgIcon name="check" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Active filters: {dataFilters.age && `Age: ${dataFilters.age} months`}
                  {dataFilters.age && dataFilters.year && ' | '}
                  {dataFilters.year && `Year: ${dataFilters.year}`}
                  {' — '}Showing {r.rows_after_age_filter || r.rows_after_year_filter || r.total_rows} rows
                </div>
              )}
            </div>

            {/* TABS */}
            <div className="tabs" style={{ marginTop: 18 }}>
              {(() => {
                const tabSet = datasetInfo?.type === 'myvass' ? MYVASS_TABS 
                             : datasetInfo?.type === 'kkm_school' ? KKM_TABS 
                             : REPORT_TABS;
                return tabSet.map((t) => (
                  <div key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                    <SvgIcon name={t.icon} size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    {t.label}
                  </div>
                ));
              })()}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'dashboard' && (
              datasetInfo?.type === 'myvass' 
                ? <MyvassDashboardTab report={r} previewData={previewData} cleanedData={cleanedRows} />
                : <DashboardTab indicators={r.indicators} report={r} />
            )}
            {activeTab === 'quality' && <MyvassQualityTab report={r} cleanedData={cleanedRows} />}
            {activeTab === 'kkm_quality' && (
              <KKMQualityTab 
                issues={r.kkm_quality_issues || []} 
                affectedRows={r.kkm_affected_rows || {}} 
                totalRows={r.total_rows} 
              />
            )}
            {activeTab === 'visualizations' && <KKMVisualizationTab cleanedData={cleanedRows} />}
            {activeTab === 'duplicates_kkm' && (
              <KKMDuplicatesTab 
                cleanedData={cleanedRows} 
                duplicateGroups={r.kkm_affected_rows?.['BR-04_groups'] || []} 
              />
            )}
            {activeTab === 'taska' && <TaskaTab taskaData={r.taska_performance} />}
            {activeTab === 'tableau_prep' && <TableauPrepTab tp={r.tableau_prep} />}
            {activeTab === 'indicators' && <IndicatorsTab ind={r.indicators} />}
            {activeTab === 'charts' && <ChartsTab charts={r.charts} />}
            {activeTab === 'missing' && <MissingTab mv={r.missing_values} missingRows={r.missing_value_rows} />}
            {activeTab === 'completeness' && <CompletenessTab dc={r.data_completeness} />}
            {activeTab === 'numerical' && <NumericalTab ns={r.numerical_summary} />}
            {activeTab === 'categorical' && <CategoricalTab cs={r.categorical_summary} />}
            {activeTab === 'bmi' && <BmiTab bmi={r.bmi_consistency} />}
            {activeTab === 'zscore' && <ZscoreTab ns={r.numerical_summary} mismatch={r.zscore_mismatch} zscoreErrors={r.zscore_errors} zscoreCapability={r.zscore_capability} cleanedData={cleanedRows} />}
            {activeTab === 'ic' && <IcTab ic={r.ic_validation} idAnalysis={r.id_analysis} auditRows={r.ic_audit_rows} />}
            {activeTab === 'spelling' && <SpellingTab sp={r.spelling_issues} />}
            {activeTab === 'duplicates' && <DupTab dup={r.duplicates} />}
            {activeTab === 'age' && <AgeTab age={r.age_distribution} />}
            {activeTab === 'changes' && <ChangesTab changes={r.changes_applied} />}
            {activeTab === 'profile' && <ProfileTab colTypes={r.column_types} mv={r.missing_values} totalRows={r.total_rows} />}
            {activeTab === 'preview' && (
              <div className="card">
                <div className="row-flex" style={{ marginBottom: 14 }}>
                  <div className="card-title" style={{ margin: 0 }}>Cleaned Data Preview (full dataset available via download)</div>
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-secondary" disabled={cleanedPage <= 1} onClick={() => fetchCleanedPage(cleanedPage - 1)}>&lsaquo;</button>
                  <span className="page-info">{cleanedPage} / {cleanedTotal} ({cleanedTotalRows} rows)</span>
                  <button className="btn btn-secondary" disabled={cleanedPage >= cleanedTotal} onClick={() => fetchCleanedPage(cleanedPage + 1)}>&rsaquo;</button>
                </div>
                <DataTable rows={cleanedRows} />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
