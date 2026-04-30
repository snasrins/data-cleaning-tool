/**
 * KKM Data Cleaning Tool — Comprehensive Frontend
 * ================================================
 * Supports: KPM 2024/2025, MyVASS, NCDC (TASKA)
 * 
 * Workflow:
 * 1. Upload File → Auto-detect data type
 * 2. Show Raw Data Quality EDA
 * 3. "Ready to Clean?" → Show cleaning rules
 * 4. Run Cleaning with Z-score calculations
 * 5. Show Cleaned EDA with indicators
 * 6. Download cleaned data (.xlsx / .csv)
 */

import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  checkHealth, 
  detectDataType as apiDetectDataType, 
  getQualityCheck, 
  runCleaning as apiRunCleaning,
  downloadCleanedData as apiDownloadCleaned,
  triggerDownload 
} from '../api/client.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION BY DATA TYPE
// ═══════════════════════════════════════════════════════════════════════════════

const DATA_CONFIGS = {
  kpm: {
    name: 'KPM (Berat & Tinggi Murid)',
    description: 'Data berat dan tinggi murid sekolah rendah (Tahun 1-3)',
    ageRange: '6-8 tahun',
    columns: {
      required: ['NEGERI', 'DAERAH', 'NAMA SEKOLAH', 'JANTINA', 'TARIKH LAHIR', 'BERAT (kg)', 'TINGGI (cm)'],
      optional: ['ID_MURID', 'TAHUN PERSEKOLAHAN', 'THN_TING', 'TARIKH PENGUKURAN BERAT/ TINGGI'],
    },
    cleaningRules: [
      { id: 'BR-01', rule: 'Drop JANTINA = "RAGU"', description: 'Remove ambiguous gender records' },
      { id: 'BR-02', rule: 'Drop duplicate ID_MURID', description: 'Keep first occurrence only' },
      { id: 'BR-03', rule: 'Standardize JANTINA', description: 'Map to Male/Female' },
      { id: 'BR-04', rule: 'Validate age 6-8 years', description: 'School age validation' },
      { id: 'BR-05', rule: 'Validate measurement date', description: 'No future/epoch dates' },
      { id: 'BR-06', rule: 'Weight: 12-50 kg', description: 'Biologically plausible range' },
      { id: 'BR-07', rule: 'Height: 100-160 cm', description: 'Biologically plausible range' },
      { id: 'BR-08', rule: 'Calculate BMI', description: 'Weight / (Height/100)²' },
      { id: 'BR-09', rule: 'BMI Categories', description: 'Underweight/Normal/Overweight/Obese' },
    ],
    indicators: [
      { name: 'Underweight', condition: 'BMI < 13.5', color: '#e74c3c' },
      { name: 'Normal', condition: '13.5 ≤ BMI < 16.5', color: '#27ae60' },
      { name: 'Overweight', condition: '16.5 ≤ BMI < 18.5', color: '#f39c12' },
      { name: 'Obese', condition: 'BMI ≥ 18.5', color: '#c0392b' },
    ],
    usesZscore: false, // KPM uses BMI thresholds, not WHO z-scores (7-year-olds)
  },
  
  myvass: {
    name: 'MyVASS (Klinik Kesihatan)',
    description: 'Data antropometri kanak-kanak dari Klinik Kesihatan',
    ageRange: '0-5 tahun (0-59 bulan)',
    columns: {
      required: ['Jantina', 'Tarikh Lahir', 'Berat Lahir (kg)', 'Panjang Lahir (kg)', 'Negeri'],
      optional: ['Daerah', 'Nama Klinik', 'Tarikh Antropometri', 'VACCINE_NAME'],
    },
    cleaningRules: [
      { id: 'Rule 1', rule: 'Drop Jantina = "Others"', description: 'Remove invalid gender' },
      { id: 'Rule 2', rule: 'Weight: 0.5-35 kg | Height: 30-130 cm', description: 'Biologically plausible range' },
      { id: 'Rule 3', rule: 'Age < 60 months', description: 'Under 5 years only' },
      { id: 'Rule 4', rule: 'Assessment ≥ DOB', description: 'No measurement before birth' },
      { id: 'Rule 5', rule: 'BMI ≤ 40', description: 'Implausible BMI check' },
      { id: 'Rule 6', rule: 'Has measurements', description: 'Both weight AND height required' },
      { id: 'Rule 7', rule: 'Valid Z-scores', description: 'No null WAZ/HAZ/BAZ' },
    ],
    indicators: [
      { name: 'Kurang Berat Badan', condition: 'WAZ < -2SD', color: '#e74c3c' },
      { name: 'Bantut (Stunted)', condition: 'HAZ < -2SD', color: '#9b59b6' },
      { name: 'Susut (Wasted)', condition: 'BAZ < -2SD', color: '#e67e22' },
      { name: 'Normal', condition: 'All indicators healthy', color: '#27ae60' },
    ],
    usesZscore: true,
  },
  
  ncdc: {
    name: 'NCDC (TASKA)',
    description: 'Status Kesihatan Kanak-Kanak Kebangsaan dari TASKA',
    ageRange: '0-5 tahun (0-59 bulan)',
    columns: {
      required: ['Negeri', 'Jantina', 'Tarikh Lahir', 'No. Mykid'],
      optional: ['Daerah', 'Nama TASKA', 'Pendapatan Keluarga', 'YYYY Berat (kg)', 'YYYY Tinggi (cm)'],
    },
    cleaningRules: [
      { id: 'Rule 1', rule: 'Valid Gender (M/F)', description: 'Drop invalid Jantina' },
      { id: 'Rule 2', rule: 'Weight: 0.5-35 kg | Height: 30-130 cm', description: 'Biologically plausible range' },
      { id: 'Rule 3', rule: 'Age < 60 months', description: 'Under 5 years only (Q-05)' },
      { id: 'Rule 4', rule: 'Measurement ≥ DOB', description: 'No measurement before birth' },
      { id: 'Rule 5', rule: 'BMI ≤ 40', description: 'Implausible BMI check (Q-06)' },
      { id: 'Rule 6', rule: 'Has measurements', description: 'Both weight AND height required' },
      { id: 'Rule 7', rule: 'Valid Z-scores', description: 'No null WAZ/HAZ/BAZ' },
      { id: 'Rule 8', rule: 'Unique MyKid', description: 'Keep most recent for duplicates (Q-07)' },
      { id: 'Rule 9', rule: 'Pendapatan ≠ "X"', description: 'Exclude missing income (Q-02)' },
    ],
    indicators: [
      { name: 'Kurang Berat Badan', condition: 'WAZ < -2SD', color: '#e74c3c' },
      { name: 'Bantut (Stunted)', condition: 'HAZ < -2SD', color: '#9b59b6' },
      { name: 'Susut (Wasted)', condition: 'BAZ < -2SD', color: '#e67e22' },
      { name: 'Berlebihan BB', condition: 'BAZ > +1SD', color: '#f39c12' },
      { name: 'Obes', condition: 'BAZ > +2SD', color: '#c0392b' },
      { name: 'Normal', condition: 'All indicators healthy', color: '#27ae60' },
    ],
    usesZscore: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// WHO Z-SCORE FORMULA & LMS METHODOLOGY
// ═══════════════════════════════════════════════════════════════════════════════

const ZScoreMethodology = ({ dataType }) => {
  const config = DATA_CONFIGS[dataType];
  if (!config?.usesZscore) return null;
  
  return (
    <div className="zscore-methodology">
      <h3>📊 WHO Z-Score Calculation Methodology</h3>
      
      <div className="formula-box">
        <h4>LMS Formula (Box-Cox Transformation)</h4>
        <div className="formula">
          <div className="formula-main">
            Z = [(X / M)<sup>L</sup> - 1] / (L × S)
          </div>
          <div className="formula-alt">
            When L = 0: Z = ln(X / M) / S
          </div>
        </div>
        
        <div className="formula-legend">
          <div><strong>X</strong> = Measured value (weight in kg, height in cm, or BMI)</div>
          <div><strong>L</strong> = Lambda (Box-Cox power)</div>
          <div><strong>M</strong> = Median reference value for age/sex</div>
          <div><strong>S</strong> = Coefficient of variation</div>
        </div>
      </div>

      <div className="zscore-details">
        <div className="detail-card">
          <h4>WAZ (Weight-for-Age)</h4>
          <p>Compares child's weight to WHO reference for same age & sex</p>
          <div className="thresholds">
            <span className="severe">&lt; -3SD: Severely Underweight</span>
            <span className="moderate">&lt; -2SD: Underweight</span>
            <span className="normal">-2 to +2: Normal</span>
          </div>
        </div>
        
        <div className="detail-card">
          <h4>HAZ (Height/Length-for-Age)</h4>
          <p>Compares child's height to WHO reference for same age & sex</p>
          <div className="thresholds">
            <span className="severe">&lt; -3SD: Severely Stunted</span>
            <span className="moderate">&lt; -2SD: Stunted</span>
            <span className="normal">-2 to +3: Normal</span>
          </div>
        </div>
        
        <div className="detail-card">
          <h4>BAZ (BMI-for-Age)</h4>
          <p>Compares child's BMI to WHO reference for same age & sex</p>
          <div className="thresholds">
            <span className="severe">&lt; -3SD: Severely Wasted</span>
            <span className="moderate">&lt; -2SD: Wasted</span>
            <span className="normal">-2 to +1: Normal</span>
            <span className="overweight">&gt; +1SD: Risk/Overweight</span>
            <span className="obese">&gt; +2SD: Obese</span>
          </div>
        </div>
      </div>

      <div className="data-source">
        <h4>📁 LMS Reference Tables</h4>
        <p>Daily LMS parameters from WHO 2006 Child Growth Standards:</p>
        <ul>
          <li><code>wfa-boys/girls-zscore-expanded-tables.xlsx</code> — Weight-for-Age (Day 0-1856)</li>
          <li><code>lhfa-boys/girls-zscore-expanded-tables.xlsx</code> — Length/Height-for-Age</li>
          <li><code>bfa-boys/girls-zscore-expanded-tables.xlsx</code> — BMI-for-Age</li>
        </ul>
        <p><strong>Age calculated in DAYS</strong> (Tarikh Pengukuran - Tarikh Lahir) for precise LMS lookup.</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA QUALITY REPORT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const DataQualityReport = ({ data, columns, dataType, qualityData }) => {
  // Use backend qualityData if available, otherwise compute from frontend data
  const stats = useMemo(() => {
    // If we have backend quality data, use it
    if (qualityData && qualityData.columns) {
      const colStats = {};
      qualityData.columns.forEach(col => {
        colStats[col.name] = {
          totalRows: qualityData.total_rows,
          nonNullCount: col.non_null,
          nullCount: col.null_count,
          nullPercent: col.null_percent,
          uniqueCount: col.unique_count,
          isNumeric: col.is_numeric,
          min: col.min,
          max: col.max,
          mean: col.mean,
          sampleValues: col.sample_values || [],
        };
      });
      return {
        colStats,
        totalRows: qualityData.total_rows,
        overallCompleteness: qualityData.overall_completeness,
        columnList: qualityData.columns.map(c => c.name),
      };
    }
    
    // Frontend fallback
    if (!data || !data.length) return null;
    
    const totalRows = data.length;
    const colStats = {};
    
    columns.forEach(col => {
      const values = data.map(row => row[col]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const nullCount = totalRows - nonNull.length;
      const uniqueValues = [...new Set(nonNull)];
      
      // Numeric analysis
      const numericValues = nonNull.map(Number).filter(n => !isNaN(n));
      
      colStats[col] = {
        totalRows,
        nonNullCount: nonNull.length,
        nullCount,
        nullPercent: ((nullCount / totalRows) * 100).toFixed(1),
        uniqueCount: uniqueValues.length,
        isNumeric: numericValues.length > nonNull.length * 0.8,
        min: numericValues.length ? Math.min(...numericValues) : null,
        max: numericValues.length ? Math.max(...numericValues) : null,
        mean: numericValues.length ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2) : null,
        sampleValues: uniqueValues.slice(0, 5),
      };
    });
    
    // Overall completeness
    const totalCells = totalRows * columns.length;
    const filledCells = Object.values(colStats).reduce((sum, s) => sum + s.nonNullCount, 0);
    const overallCompleteness = ((filledCells / totalCells) * 100).toFixed(1);
    
    return { colStats, totalRows, overallCompleteness, columnList: columns };
  }, [data, columns, qualityData]);

  if (!stats) return <div className="loading">Loading data quality analysis...</div>;

  const columnList = stats.columnList || columns;

  return (
    <div className="data-quality-report">
      <div className="summary-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.totalRows.toLocaleString()}</div>
          <div className="stat-label">Total Rows</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{columns.length}</div>
          <div className="stat-label">Columns</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.overallCompleteness}%</div>
          <div className="stat-label">Data Completeness</div>
        </div>
      </div>

      <h4>Column Analysis</h4>
      <div className="column-analysis-table">
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Non-Null</th>
              <th>Null %</th>
              <th>Unique</th>
              <th>Type</th>
              <th>Range / Sample</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.colStats).map(([col, s]) => (
              <tr key={col} className={s.nullPercent > 20 ? 'high-null' : ''}>
                <td className="col-name">{col}</td>
                <td>{s.nonNullCount.toLocaleString()}</td>
                <td className={s.nullPercent > 20 ? 'warning' : ''}>{s.nullPercent}%</td>
                <td>{s.uniqueCount.toLocaleString()}</td>
                <td>{s.isNumeric ? '🔢 Numeric' : '📝 Text'}</td>
                <td className="range-cell">
                  {s.isNumeric && s.min !== null 
                    ? `${s.min} — ${s.max} (μ: ${s.mean})`
                    : s.sampleValues.join(', ').substring(0, 50)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANING RULES DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

const CleaningRulesDisplay = ({ dataType }) => {
  const config = DATA_CONFIGS[dataType];
  if (!config) return null;

  return (
    <div className="cleaning-rules-display">
      <h3>🧹 Cleaning Rules — {config.name}</h3>
      <div className="rules-grid">
        {config.cleaningRules.map((rule, idx) => (
          <div key={idx} className="rule-card">
            <div className="rule-id">{rule.id}</div>
            <div className="rule-content">
              <div className="rule-name">{rule.rule}</div>
              <div className="rule-desc">{rule.description}</div>
            </div>
          </div>
        ))}
      </div>

      <h4>📊 Health Indicators</h4>
      <div className="indicators-grid">
        {config.indicators.map((ind, idx) => (
          <div key={idx} className="indicator-badge" style={{ borderLeftColor: ind.color }}>
            <span className="indicator-name">{ind.name}</span>
            <span className="indicator-condition">{ind.condition}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANED DATA RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

const CleanedDataResults = ({ originalCount, cleanedData, stats, dataType }) => {
  const config = DATA_CONFIGS[dataType];
  const droppedCount = originalCount - cleanedData.length;
  const retentionRate = ((cleanedData.length / originalCount) * 100).toFixed(1);

  return (
    <div className="cleaned-data-results">
      <h3>✅ Cleaning Complete</h3>
      
      <div className="cleaning-summary-cards">
        <div className="summary-card original">
          <div className="card-value">{originalCount.toLocaleString()}</div>
          <div className="card-label">Original Records</div>
        </div>
        <div className="summary-card arrow">→</div>
        <div className="summary-card dropped">
          <div className="card-value">-{droppedCount.toLocaleString()}</div>
          <div className="card-label">Dropped ({((droppedCount/originalCount)*100).toFixed(1)}%)</div>
        </div>
        <div className="summary-card arrow">→</div>
        <div className="summary-card cleaned">
          <div className="card-value">{cleanedData.length.toLocaleString()}</div>
          <div className="card-label">Cleaned Records ({retentionRate}%)</div>
        </div>
      </div>

      {stats && (
        <div className="drop-breakdown">
          <h4>📉 Records Dropped by Rule</h4>
          <div className="breakdown-table">
            {Object.entries(stats).filter(([k, v]) => k.startsWith('dropped_') && v > 0).map(([key, value]) => (
              <div key={key} className="breakdown-row">
                <span className="breakdown-rule">{key.replace('dropped_', '').replace(/_/g, ' ')}</span>
                <span className="breakdown-count">{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {config?.usesZscore && stats && (
        <div className="indicator-summary">
          <h4>📊 WHO Indicator Summary</h4>
          <div className="indicator-grid">
            {stats.ind_kurang_berat !== undefined && (
              <div className="indicator-stat" style={{borderColor: '#e74c3c'}}>
                <div className="ind-value">{stats.ind_kurang_berat?.toLocaleString() || 0}</div>
                <div className="ind-label">Kurang Berat Badan (WAZ &lt; -2)</div>
              </div>
            )}
            {stats.ind_bantut !== undefined && (
              <div className="indicator-stat" style={{borderColor: '#9b59b6'}}>
                <div className="ind-value">{stats.ind_bantut?.toLocaleString() || 0}</div>
                <div className="ind-label">Bantut (HAZ &lt; -2)</div>
              </div>
            )}
            {stats.ind_susut !== undefined && (
              <div className="indicator-stat" style={{borderColor: '#e67e22'}}>
                <div className="ind-value">{stats.ind_susut?.toLocaleString() || 0}</div>
                <div className="ind-label">Susut (BAZ &lt; -2)</div>
              </div>
            )}
            {stats.ind_berlebihan_bb !== undefined && (
              <div className="indicator-stat" style={{borderColor: '#f39c12'}}>
                <div className="ind-value">{stats.ind_berlebihan_bb?.toLocaleString() || 0}</div>
                <div className="ind-label">Berlebihan BB (BAZ &gt; +1)</div>
              </div>
            )}
            {stats.ind_normal !== undefined && (
              <div className="indicator-stat" style={{borderColor: '#27ae60'}}>
                <div className="ind-value">{stats.ind_normal?.toLocaleString() || 0}</div>
                <div className="ind-label">Normal (Healthy)</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DATA CLEANING TOOL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DataCleaningTool() {
  // State
  const [step, setStep] = useState(1); // 1: Upload, 2: Quality EDA, 3: Ready?, 4: Cleaning, 5: Results
  const [dataType, setDataType] = useState(null); // 'kpm', 'myvass', 'ncdc'
  const [fileName, setFileName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null); // Store actual file for API calls
  const [rawData, setRawData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [qualityData, setQualityData] = useState(null); // Quality check from backend
  const [cleanedData, setCleanedData] = useState([]);
  const [cleaningStats, setCleaningStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null); // For KPM

  // Check API on mount
  React.useEffect(() => {
    const check = async () => {
      const online = await checkHealth();
      setApiOnline(online);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-detect data type from file/columns (frontend fallback)
  const detectDataTypeLocal = useCallback((cols, filename) => {
    const colSet = new Set(cols.map(c => c.toUpperCase()));
    const fname = filename.toLowerCase();
    
    // Check for NCDC pattern (has year-prefixed columns like "2023 Berat (kg)")
    if (cols.some(c => /^\d{4}\s*(Berat|Tinggi|Tarikh)/i.test(c))) {
      return 'ncdc';
    }
    
    // Check for KPM pattern
    if (colSet.has('ID_MURID') || colSet.has('THN_TING') || colSet.has('NAMA SEKOLAH') || 
        fname.includes('kpm') || fname.includes('berat') && fname.includes('tinggi')) {
      return 'kpm';
    }
    
    // Check for MyVASS pattern
    if (colSet.has('VACCINE_NAME') || colSet.has('NAMA KLINIK') || 
        colSet.has('PANJANG LAHIR (KG)') || fname.includes('myvass') || fname.includes('gis')) {
      return 'myvass';
    }
    
    return null;
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setIsProcessing(true);
    setFileName(file.name);
    setUploadedFile(file); // Store file for API calls
    
    try {
      // Try backend API first if online
      if (apiOnline) {
        try {
          const result = await apiDetectDataType(file);
          setColumns(result.columns);
          setDataType(result.detected_type !== 'unknown' ? result.detected_type : null);
          
          // Get quality check
          const quality = await getQualityCheck(file, result.detected_type || 'myvass');
          setQualityData(quality);
          setRawData([]); // Don't need raw data when using backend
          setStep(2);
          setIsProcessing(false);
          return;
        } catch (apiErr) {
          console.warn('Backend API failed, falling back to frontend parsing:', apiErr);
        }
      }
      
      // Frontend fallback - parse file locally
      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          let workbook;
          
          if (file.name.endsWith('.csv')) {
            workbook = XLSX.read(data, { type: 'string' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }
          
          // For multi-sheet files (like NCDC), combine all sheets
          let allData = [];
          let allCols = [];
          
          workbook.SheetNames.forEach((sheetName, idx) => {
            const ws = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
            
            if (jsonData.length > 0) {
              if (idx === 0) {
                allCols = Object.keys(jsonData[0]);
              }
              allData = allData.concat(jsonData);
            }
          });
          
          if (allData.length === 0) {
            throw new Error('No data found in file');
          }
          
          // Detect data type
          const detected = detectDataTypeLocal(allCols, file.name);
          
          setRawData(allData);
          setColumns(allCols);
          setDataType(detected);
          setStep(2);
          setIsProcessing(false);
          
        } catch (err) {
          setError(`Error parsing file: ${err.message}`);
          setIsProcessing(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file');
        setIsProcessing(false);
      };
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
      
    } catch (err) {
      setError(`Upload error: ${err.message}`);
      setIsProcessing(false);
    }
  }, [detectDataTypeLocal, apiOnline]);

  // Run cleaning using backend API
  const runCleaning = useCallback(async () => {
    if (!dataType) return;
    
    setIsProcessing(true);
    setStep(4);
    setError(null);
    
    try {
      if (apiOnline && uploadedFile) {
        // Use backend API for real cleaning with z-score calculation
        const result = await apiRunCleaning(uploadedFile, dataType);
        
        if (result.success) {
          setCleanedData(result.preview || []);
          setCleaningStats(result.stats);
          setStep(5);
        } else {
          throw new Error('Cleaning failed');
        }
      } else {
        // Frontend fallback - simplified cleaning
        let cleaned = [...rawData];
        const stats = { raw_count: rawData.length };
        
        // Apply basic cleaning rules based on data type
        if (dataType === 'myvass' || dataType === 'ncdc') {
          const genderCol = columns.find(c => /jantina/i.test(c));
          if (genderCol) {
            const before = cleaned.length;
            cleaned = cleaned.filter(row => {
              const g = String(row[genderCol]).toUpperCase();
              return ['M', 'F', 'MALE', 'FEMALE', 'LELAKI', 'PEREMPUAN'].includes(g);
            });
            stats.dropped_invalid_gender = before - cleaned.length;
          }
          stats.dropped_age_invalid = 0;
          stats.dropped_measurement_outlier = 0;
          stats.dropped_null_zscore = 0;
        }
        
        if (dataType === 'kpm') {
          const genderCol = columns.find(c => /jantina/i.test(c));
          if (genderCol) {
            const before = cleaned.length;
            cleaned = cleaned.filter(row => {
              const g = String(row[genderCol]).toUpperCase();
              return g !== 'RAGU' && g !== '';
            });
            stats.dropped_ragu_gender = before - cleaned.length;
          }
        }
        
        stats.final_count = cleaned.length;
        stats.total_dropped = rawData.length - cleaned.length;
        
        setCleanedData(cleaned);
        setCleaningStats(stats);
        setStep(5);
      }
    } catch (err) {
      setError(`Cleaning error: ${err.message}`);
      setStep(3); // Go back to review step
    }
    
    setIsProcessing(false);
  }, [rawData, dataType, columns, apiOnline, uploadedFile]);

  // Download cleaned data
  const downloadCleanedData = useCallback(async (format = 'xlsx') => {
    try {
      if (apiOnline && uploadedFile) {
        // Download from backend
        await triggerDownload(
          apiDownloadCleaned(uploadedFile, dataType, format),
          `${dataType?.toUpperCase() || 'Data'}_Cleaned.${format}`
        );
      } else if (cleanedData.length) {
        // Frontend fallback
        const ws = XLSX.utils.json_to_sheet(cleanedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cleaned Data');
        
        if (cleaningStats) {
          const statsArray = Object.entries(cleaningStats).map(([key, value]) => ({ Metric: key, Value: value }));
          const wsStats = XLSX.utils.json_to_sheet(statsArray);
          XLSX.utils.book_append_sheet(wb, wsStats, 'Cleaning Stats');
        }
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const outputName = `${dataType?.toUpperCase() || 'Data'}_Cleaned_${timestamp}`;
        
        if (format === 'xlsx') {
          XLSX.writeFile(wb, `${outputName}.xlsx`);
        } else {
          XLSX.writeFile(wb, `${outputName}.csv`, { bookType: 'csv' });
        }
      }
    } catch (err) {
      setError(`Download error: ${err.message}`);
    }
  }, [cleanedData, cleaningStats, dataType, apiOnline, uploadedFile]);

  // Reset to start
  const reset = () => {
    setStep(1);
    setDataType(null);
    setFileName('');
    setUploadedFile(null);
    setRawData([]);
    setColumns([]);
    setQualityData(null);
    setCleanedData([]);
    setCleaningStats(null);
    setError(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="data-cleaning-tool">
      {/* Header */}
      <header className="tool-header">
        <h1>🏥 KKM Data Cleaning Tool</h1>
        <p>Comprehensive EDA & WHO Z-Score Calculator</p>
        <div className="supported-types">
          <span className="type-badge kpm">KPM 2024/2025</span>
          <span className="type-badge myvass">MyVASS</span>
          <span className="type-badge ncdc">NCDC (TASKA)</span>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="progress-steps">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Data Quality' },
          { num: 3, label: 'Review Rules' },
          { num: 4, label: 'Cleaning' },
          { num: 5, label: 'Results' },
        ].map(s => (
          <div key={s.num} className={`step ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}`}>
            <div className="step-num">{s.num}</div>
            <div className="step-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Step Content */}
      <main className="tool-content">
        
        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="step-content upload-step">
            <h2>📤 Upload Your Data File</h2>
            <p>Supports: Excel (.xlsx, .xls) and CSV files</p>
            
            <div className="upload-zone">
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                id="file-upload"
              />
              <label htmlFor="file-upload" className="upload-label">
                {isProcessing ? (
                  <span className="loading-spinner">Processing...</span>
                ) : (
                  <>
                    <span className="upload-icon">📁</span>
                    <span>Click to select file or drag & drop</span>
                  </>
                )}
              </label>
            </div>

            <div className="data-type-selector">
              <h4>Or select data type manually:</h4>
              <div className="type-buttons">
                <button 
                  className={`type-btn ${dataType === 'kpm' ? 'selected' : ''}`}
                  onClick={() => setDataType('kpm')}
                >
                  KPM (Sekolah)
                </button>
                <button 
                  className={`type-btn ${dataType === 'myvass' ? 'selected' : ''}`}
                  onClick={() => setDataType('myvass')}
                >
                  MyVASS (Klinik)
                </button>
                <button 
                  className={`type-btn ${dataType === 'ncdc' ? 'selected' : ''}`}
                  onClick={() => setDataType('ncdc')}
                >
                  NCDC (TASKA)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Data Quality EDA */}
        {step === 2 && (
          <div className="step-content quality-step">
            <div className="step-header">
              <h2>📊 Raw Data Quality Analysis</h2>
              <div className="file-info">
                <span className="file-name">📄 {fileName}</span>
                {dataType && (
                  <span className={`detected-type ${dataType}`}>
                    Detected: {DATA_CONFIGS[dataType]?.name}
                  </span>
                )}
                {apiOnline && <span className="api-status online">🟢 API Connected</span>}
                {!apiOnline && <span className="api-status offline">🔴 API Offline (Local Mode)</span>}
              </div>
            </div>

            <DataQualityReport data={rawData} columns={columns} dataType={dataType} qualityData={qualityData} />

            <div className="step-actions">
              <button className="btn-secondary" onClick={reset}>← Start Over</button>
              <button className="btn-primary" onClick={() => setStep(3)}>
                Continue to Review Rules →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review Cleaning Rules */}
        {step === 3 && (
          <div className="step-content rules-step">
            <h2>📋 Review Cleaning Rules</h2>
            
            {dataType && <CleaningRulesDisplay dataType={dataType} />}
            
            {dataType && DATA_CONFIGS[dataType]?.usesZscore && (
              <ZScoreMethodology dataType={dataType} />
            )}

            <div className="ready-to-clean">
              <h3>🚀 Ready to Clean?</h3>
              <p>The cleaning process will apply all rules above and calculate WHO z-scores (where applicable).</p>
              <p><strong>{qualityData?.total_rows?.toLocaleString() || rawData.length.toLocaleString()}</strong> records will be processed.</p>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary run-btn" onClick={runCleaning}>
                🧹 Run Cleaning Process
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Processing */}
        {step === 4 && (
          <div className="step-content processing-step">
            <div className="processing-animation">
              <div className="spinner"></div>
              <h2>Processing Data...</h2>
              <p>Applying cleaning rules and calculating z-scores...</p>
            </div>
          </div>
        )}

        {/* STEP 5: Results */}
        {step === 5 && (
          <div className="step-content results-step">
            <CleanedDataResults 
              originalCount={rawData.length}
              cleanedData={cleanedData}
              stats={cleaningStats}
              dataType={dataType}
            />

            {dataType && DATA_CONFIGS[dataType]?.usesZscore && (
              <ZScoreMethodology dataType={dataType} />
            )}

            {/* Download Section */}
            <div className="download-section">
              <h3>📥 Download Cleaned Data</h3>
              <div className="download-buttons">
                <button className="btn-download xlsx" onClick={() => downloadCleanedData('xlsx')}>
                  📗 Download Excel (.xlsx)
                </button>
                <button className="btn-download csv" onClick={() => downloadCleanedData('csv')}>
                  📄 Download CSV (.csv)
                </button>
              </div>
              <p className="download-note">
                Includes: Cleaned data + Quality report + Z-score columns (WAZ, HAZ, BAZ)
              </p>
            </div>

            {/* Preview of cleaned data */}
            <div className="cleaned-preview">
              <h4>📋 Cleaned Data Preview (First 10 rows)</h4>
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {columns.slice(0, 10).map(col => (
                        <th key={col}>{col}</th>
                      ))}
                      {columns.length > 10 && <th>...</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cleanedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        {columns.slice(0, 10).map(col => (
                          <td key={col}>{String(row[col] ?? '').substring(0, 30)}</td>
                        ))}
                        {columns.length > 10 && <td>...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={reset}>🔄 Clean Another File</button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="tool-footer">
        <p>KKM Data Cleaning Tool v2.0 | WHO 2006 Child Growth Standards | Daily LMS Z-Score Calculation</p>
      </footer>
    </div>
  );
}
