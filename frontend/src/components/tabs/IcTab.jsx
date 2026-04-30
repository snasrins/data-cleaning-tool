import React, { useState } from 'react';
import StatCard from '../StatCard.jsx';

const IC_RULES = [
  { pattern: '12-digit YYMMDDPBXXXX', action: 'Valid (valid_ic)', color: 'var(--success)', example: '890524125012' },
  { pattern: 'Scientific notation (2.21E+11)', action: 'Convert to integer → validate', color: 'var(--accent)', example: '2.21E+11 → 221012045678' },
  { pattern: 'Leading letter (DEPOTSDK...)', action: 'Classified as system_id', color: 'var(--warn)', example: 'DEPOTSDK0021' },
  { pattern: 'Digits + embedded text', action: 'Flagged as corrupted_ic (extract leading digits)', color: 'var(--danger)', example: '8905241251RAFIZAH BINTI...' },
  { pattern: '< 12 digits', action: 'Flagged as short_id / invalid', color: 'var(--danger)', example: '900811065' },
  { pattern: '> 12 digits', action: 'Trim to 12, flagged invalid_ic', color: 'var(--danger)', example: '8905241250123 → 890524125012' },
  { pattern: 'Suffix _1, _2, -1', action: 'Strip suffix, validate base IC', color: 'var(--accent)', example: '890524125012_2 → 890524125012' },
  { pattern: 'Empty / <NA> / null', action: 'Flagged as missing', color: 'var(--muted)', example: '<NA>, "", null' },
  { pattern: 'Invalid month/day in IC', action: 'Flagged invalid_ic (illogical date)', color: 'var(--danger)', example: 'YY1500PBXXXX (month 15)' },
];

export default function IcTab({ ic, idAnalysis, auditRows }) {
  const [showAudit, setShowAudit] = useState(false);
  const [showRules, setShowRules] = useState(true);

  if (!ic?.total) return (
    <div className="card">
      <div className="card-title">IC / MyKid Audit</div>
      <div style={{ padding: '12px 16px', background: 'rgba(250,173,20,0.08)', border: '1px solid rgba(250,173,20,0.3)', borderRadius: 8, marginBottom: 16 }}>
        <strong style={{ color: 'var(--warn)' }}>⚠ No ID column detected</strong>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4, marginBottom: 0 }}>
          Looking for columns like: "No. Mykid", "IC", "MyKid/IC". Please check your column mapping in the Preview step.
        </p>
      </div>
      <RulesSection />
    </div>
  );
  const pct = ic.pct_valid;
  const barColor = pct > 80 ? 'var(--success)' : pct > 50 ? 'var(--warn)' : 'var(--danger)';
  const shortICs = ic.issue_breakdown?.too_short || 0;
  return (
    <>
      {/* Always show IC validation rules first */}
      <div className="card">
        <div className="row-flex" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>IC Validation Rules</div>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.72rem', padding: '3px 10px' }}
            onClick={() => setShowRules(!showRules)}
          >
            {showRules ? 'Hide Rules' : 'Show Rules'}
          </button>
        </div>
        {showRules && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 12, lineHeight: 1.7 }}>
              Each ID value is validated against these rules for Malaysian IC/MyKid format (12-digit NRIC):
            </p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Input Pattern</th><th>Action</th><th>Example</th></tr></thead>
                <tbody>
                  {IC_RULES.map((rule, i) => (
                    <tr key={i} style={rule.pattern === '< 12 digits' && shortICs > 0 ? { background: 'rgba(250,173,20,0.05)' } : {}}>
                      <td style={{ fontSize: '0.73rem', fontWeight: rule.pattern === '< 12 digits' && shortICs > 0 ? 600 : 400 }}>
                        {rule.pattern}
                        {rule.pattern === '< 12 digits' && shortICs > 0 && (
                          <span style={{ marginLeft: 8, color: 'var(--warn)', fontSize: '0.7rem' }}>({shortICs} found)</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: rule.color }}>{rule.action}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>{rule.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">IC / MyKid Validation Summary</div>
        <div className="stats-grid">
          <StatCard val={ic.total?.toLocaleString()} label="Total Records" />
          <StatCard val={ic.valid?.toLocaleString()} label="Valid IC" color="var(--success)" />
          <StatCard val={ic.invalid?.toLocaleString()} label="Invalid / Issues" color="var(--danger)" />
          <StatCard val={`${pct}%`} label="Valid Rate" color={barColor} />
        </div>
        <div className="pct-bar-wrap" style={{ height: 7, margin: '12px 0' }}>
          <div className="pct-bar" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        {Object.keys(ic.issue_breakdown || {}).length > 0 && (
          <>
            <div className="card-title" style={{ marginTop: 16 }}>Issue Breakdown</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Issue Type</th><th>Count</th><th>%</th><th>Description</th></tr></thead>
                <tbody>
                  {Object.entries(ic.issue_breakdown).map(([issue, cnt]) => (
                    <tr key={issue}>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--warn)' }}>{issue}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{cnt.toLocaleString()}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{(cnt / ic.total * 100).toFixed(1)}%</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        {IC_ISSUE_DESC[issue] || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Audit rows — actual bad ICs */}
      {auditRows?.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(240,92,107,0.2)' }}>
          <div className="row-flex" style={{ marginBottom: 10 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Invalid IC Rows — Detailed Audit
              <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>
                ({auditRows.length} rows shown, up to 500)
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}
              onClick={() => setShowAudit((x) => !x)}>
              {showAudit ? 'Hide' : 'Show All Rows'}
            </button>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: showAudit ? 12 : 0, lineHeight: 1.6 }}>
            These are the actual rows where the ID field failed validation. Includes 6-digit ICs, corrupted values, and other issues.
            <strong> Use this to identify data entry problems at source.</strong>
          </p>
          {showAudit && (
            <div className="table-wrap" style={{ maxHeight: 500, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Row #</th>
                    <th>Original Value</th>
                    <th>Issue</th>
                    <th>ID Type</th>
                    <th>Cleaned Value</th>
                    {auditRows[0]?.sheet_name !== undefined && <th>Sheet</th>}
                    {auditRows[0]?.nama !== undefined && <th>Name</th>}
                    {auditRows[0]?.jantina !== undefined && <th>Gender</th>}
                    {auditRows[0]?.negeri  !== undefined && <th>State</th>}
                    {auditRows[0]?.daerah  !== undefined && <th>District</th>}
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row, i) => {
                    const isShortIC = row.issue && row.issue.startsWith('too_short');
                    return (
                      <tr key={i} style={isShortIC ? { background: 'rgba(250,173,20,0.05)' } : {}}>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>
                          {row.row_index}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: isShortIC ? 'var(--warn)' : 'var(--danger)', fontWeight: isShortIC ? 600 : 400 }}>
                          {row.original_value}
                          {isShortIC && <span style={{ marginLeft: 4, fontSize: '0.65rem', color: 'var(--warn)' }}>← SHORT IC</span>}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--danger)' }}>
                          {row.issue}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>
                          {row.id_type}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem' }}>
                          {row.cleaned_value || <span style={{ color: 'var(--muted)' }}>—</span>}
                        </td>
                        {auditRows[0]?.sheet_name !== undefined && <td style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{row.sheet_name || '—'}</td>}
                        {auditRows[0]?.nama !== undefined && <td style={{ fontSize: '0.68rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.nama || '—'}</td>}
                        {auditRows[0]?.jantina !== undefined && <td style={{ fontSize: '0.68rem' }}>{row.jantina || '—'}</td>}
                        {auditRows[0]?.negeri  !== undefined && <td style={{ fontSize: '0.68rem' }}>{row.negeri || '—'}</td>}
                        {auditRows[0]?.daerah  !== undefined && <td style={{ fontSize: '0.68rem' }}>{row.daerah || '—'}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {idAnalysis?.total_records > 0 && (
        <div className="card">
          <div className="card-title">ID Analysis & Deduplication</div>
          <div className="stats-grid">
            <StatCard val={idAnalysis.total_records?.toLocaleString()} label="Total Records" />
            <StatCard val={idAnalysis.unique_children?.toLocaleString()} label="Unique Children" color="var(--success)" />
            <StatCard val={idAnalysis.children_with_multiple_records?.toLocaleString()} label="Multi-Record Children" color="var(--warn)" />
            <StatCard val={idAnalysis.valid_ic_records?.toLocaleString()} label="Valid IC Records" />
          </div>
          <div className="card-title" style={{ marginTop: 14 }}>ID Type Distribution</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Count</th><th>%</th></tr></thead>
              <tbody>
                {Object.entries(idAnalysis.id_type_distribution || {}).map(([t, c]) => (
                  <tr key={t}>
                    <td style={{ fontFamily: 'var(--mono)' }}>{t}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{c?.toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{(c / idAnalysis.total_records * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {idAnalysis.note && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(56,217,192,0.06)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--accent)' }}>
              {idAnalysis.note}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const IC_ISSUE_DESC = {
  missing:                   'Null / empty / <NA> value',
  system_id:                 'Starts with a letter — not an IC (depot or system ID)',
  embedded_text_after_digits:'Digits followed by text — likely IC merged with a name at source',
  scientific_notation_unconvertible: 'Could not parse scientific notation',
  too_short:                 'Fewer than 12 digits',
  too_long:                  'More than 12 digits',
  invalid_month_in_ic:       'Month embedded in IC is not 01-12',
  invalid_day_in_ic:         'Day embedded in IC is not 01-31',
};

function RulesSection() {
  return (
    <>
      <div className="card-title">IC Validation Rules</div>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 12, lineHeight: 1.7 }}>
        Each ID value is validated against these rules for Malaysian IC/MyKid format (12-digit NRIC):
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Input Pattern</th><th>Action</th><th>Example</th></tr></thead>
          <tbody>
            {IC_RULES.map((rule, i) => (
              <tr key={i}>
                <td style={{ fontSize: '0.73rem' }}>{rule.pattern}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: rule.color }}>{rule.action}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>{rule.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
