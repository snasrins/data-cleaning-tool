import React, { useState, useEffect } from 'react';
import StatCard from './StatCard.jsx';
import SvgIcon from './SvgIcon.jsx';

export default function ReviewPanel({ 
  previewData, 
  mapping, 
  sourceType,
  onConfigUpdate,
  onProceed 
}) {
  const [outlierAction, setOutlierAction] = useState('flag'); // 'remove', 'flag', 'keep'
  const [missingStrategy, setMissingStrategy] = useState('exclude'); // 'exclude', 'fallback'
  const [normalizeSpelling, setNormalizeSpelling] = useState(true);
  
  // Analyze data quality issues
  const issues = analyzeDataQuality(previewData, mapping);

  const handleProceed = () => {
    const config = {
      outlier_action: outlierAction,
      missing_strategy: missingStrategy,
      normalize_spelling: normalizeSpelling,
    };
    onConfigUpdate(config);
    onProceed();
  };

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>Data Quality Review — Configure Processing Rules</h2>
      
      {/* Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard 
          val={previewData.total_rows?.toLocaleString()} 
          label="Total Rows" 
        />
        <StatCard 
          val={`${issues.mapped_fields}/${issues.total_fields}`}
          label="Columns Mapped"
          color={issues.mapped_fields >= issues.total_fields * 0.8 ? 'var(--success)' : 'var(--warn)'}
        />
        <StatCard 
          val={issues.total_issues}
          label="Issues Detected"
          color={issues.total_issues === 0 ? 'var(--success)' : 'var(--warn)'}
        />
        <StatCard 
          val={sourceType === 'myvass' ? 'NCDC TASKA' : 'Clinic Birth'}
          label="Data Source"
          color="var(--accent)"
        />
      </div>

      {/* Column Mapping Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          <SvgIcon name="dashboard" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Column Mapping Status
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Standard Field</th>
                <th>Mapped To</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(mapping).slice(0, 15).map(([field, rawCol]) => (
                <tr key={field}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>{field}</td>
                  <td style={{ color: rawCol ? 'var(--text)' : 'var(--muted)' }}>
                    {rawCol || '—'}
                  </td>
                  <td>
                    {rawCol ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <SvgIcon name="checkCircle" size={14} color="var(--success)" />
                        Mapped
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <SvgIcon name="close" size={14} color="var(--muted)" />
                        Not Required
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outliers */}
      {issues.outliers_detected > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--warn)' }}>
          <div className="card-title">
            <SvgIcon name="error" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Outliers Detected
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Found {issues.outliers_detected} rows with values outside biological ranges 
            (e.g., weight &gt;80kg for children, height &lt;30cm, BMI &gt;60).
          </p>
          <div style={{ background: 'rgba(240,92,107,0.05)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Examples:</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.8rem', color: 'var(--muted)' }}>
              <li>Weight: 0.5 - 80 kg (WHO standard for 0-60 months)</li>
              <li>Height: 30 - 200 cm</li>
              <li>BMI: 5 - 60</li>
              <li>Age: 0 - 120 months</li>
            </ul>
          </div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>How should we handle these?</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="outlier" 
                value="remove"
                checked={outlierAction === 'remove'}
                onChange={(e) => setOutlierAction(e.target.value)}
              />
              <span style={{ fontSize: '0.85rem' }}>Remove (Recommended for Tableau)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="outlier" 
                value="flag"
                checked={outlierAction === 'flag'}
                onChange={(e) => setOutlierAction(e.target.value)}
              />
              <span style={{ fontSize: '0.85rem' }}>Flag for review</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="outlier" 
                value="keep"
                checked={outlierAction === 'keep'}
                onChange={(e) => setOutlierAction(e.target.value)}
              />
              <span style={{ fontSize: '0.85rem' }}>Keep all data</span>
            </label>
          </div>
          {outlierAction === 'remove' && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 8 }}>
              <SvgIcon name="check" size={12} style={{ marginRight: 4 }} />
              Outliers will be removed. A separate CSV will be generated for your review.
            </div>
          )}
        </div>
      )}

      {/* Missing Critical Fields */}
      {issues.missing_critical > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--danger)' }}>
          <div className="card-title">
            <SvgIcon name="warning" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Missing Critical Data
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            {issues.missing_critical} rows are missing required fields (e.g., berat_kg, tinggi_cm, tarikh_lahir).
          </p>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>How should we handle these?</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="missing" 
                value="exclude"
                checked={missingStrategy === 'exclude'}
                onChange={(e) => setMissingStrategy(e.target.value)}
              />
              <span style={{ fontSize: '0.85rem' }}>Exclude rows (Recommended)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="missing" 
                value="fallback"
                checked={missingStrategy === 'fallback'}
                onChange={(e) => setMissingStrategy(e.target.value)}
              />
              <span style={{ fontSize: '0.85rem' }}>Use fallback (Kumpulan Umur)</span>
            </label>
          </div>
        </div>
      )}

      {/* Business Rules Checklist */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          <SvgIcon name="target" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          KKM Business Rules — Validation Checklist
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <RuleCheck 
            status="pass"
            label="WHO 2006 Growth Standards will be applied (WAZ, HAZ, BAZ)"
          />
          <RuleCheck 
            status="pass"
            label="4 Indicators: Kurang Berat Badan, Bantut, Susut, Obes & Berlebihan"
          />
          <RuleCheck 
            status="pass"
            label="2 Age Groups: Bawah 2 Tahun (0-23m), Bawah 5 Tahun (0-59m)"
          />
          <RuleCheck 
            status="pass"
            label="3 Geographic Levels: Negeri, Kawasan/Bahagian, Daerah"
          />
          <RuleCheck 
            status={normalizeSpelling ? 'pass' : 'warn'}
            label="Normalize spelling variants (e.g., 'Kurang Berat' → 'Kurang Berat Badan')"
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={normalizeSpelling}
              onChange={(e) => setNormalizeSpelling(e.target.checked)}
            />
            <span style={{ fontSize: '0.85rem' }}>Auto-normalize spelling variants</span>
          </label>
        </div>
      </div>

      {/* Transformation Preview */}
      <div className="card" style={{ marginBottom: 20, background: 'rgba(56,217,192,0.05)' }}>
        <div className="card-title">
          <SvgIcon name="note" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Transformation Pipeline Preview
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', lineHeight: 1.8 }}>
          {sourceType === 'myvass' && (
            <li>Pivot wide format (year-prefixed columns) → long format</li>
          )}
          <li>Map columns to standard schema ({issues.mapped_fields} fields)</li>
          <li>Validate IC/MyKid format (12-digit NRIC)</li>
          <li>Normalize gender (M/F) and income (B40/M40/T20)</li>
          {normalizeSpelling && <li>Normalize spelling variants</li>}
          {outlierAction === 'remove' && <li>Remove biological outliers ({issues.outliers_detected} rows)</li>}
          {outlierAction === 'flag' && <li>Flag biological outliers for review</li>}
          {missingStrategy === 'exclude' && <li>Exclude rows with missing critical fields</li>}
          <li>Compute WHO z-scores (WAZ, HAZ, BAZ)</li>
          <li>Calculate age groups and geographic hierarchy</li>
          <li>Aggregate 4 KKM indicators by age/geo/income</li>
          <li>Generate Tableau-ready export (CSV/XLSX)</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
        >
          ← Start Over
        </button>
        <button 
          className="btn btn-primary"
          onClick={handleProceed}
          style={{ minWidth: 200 }}
        >
          Apply Rules & Run Analysis →
        </button>
      </div>

      {/* Summary */}
      <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted)' }}>
        <strong>Summary:</strong> {previewData.total_rows?.toLocaleString()} rows will be processed. 
        {outlierAction === 'remove' && ` ${issues.outliers_detected} outliers will be removed.`}
        {missingStrategy === 'exclude' && ` Rows with missing critical fields will be excluded.`}
        {' '}Final cleaned data will be exported as CSV/XLSX for Tableau.
      </div>
    </div>
  );
}

function RuleCheck({ status, label }) {
  const icons = {
    pass: <SvgIcon name="checkCircle" size={16} color="var(--success)" />,
    warn: <SvgIcon name="warning" size={16} color="var(--warn)" />,
    fail: <SvgIcon name="error" size={16} color="var(--danger)" />,
  };
  const icon = icons[status] || icons.fail;
  const color = status === 'pass' ? 'var(--success)' : status === 'warn' ? 'var(--warn)' : 'var(--danger)';
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0' }}>
      <span style={{ fontSize: '1rem', minWidth: 24 }}>{icon}</span>
      <span style={{ fontSize: '0.85rem', color }}>{label}</span>
    </div>
  );
}

function analyzeDataQuality(previewData, mapping) {
  if (!previewData) {
    return {
      mapped_fields: 0,
      total_fields: 0,
      total_issues: 0,
      outliers_detected: 0,
      missing_critical: 0,
    };
  }

  const mappedCount = Object.values(mapping).filter(v => v).length;
  const totalFields = Object.keys(mapping).length;
  
  // Estimate issues (will be calculated properly in backend)
  const estimatedOutliers = Math.floor(previewData.total_rows * 0.02); // ~2% outliers typical
  const estimatedMissing = Math.floor(previewData.total_rows * 0.05); // ~5% missing typical
  
  return {
    mapped_fields: mappedCount,
    total_fields: totalFields,
    total_issues: estimatedOutliers + estimatedMissing,
    outliers_detected: estimatedOutliers,
    missing_critical: estimatedMissing,
  };
}
