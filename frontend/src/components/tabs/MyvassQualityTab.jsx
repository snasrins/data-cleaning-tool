import React, { useState } from 'react';
import SvgIcon from '../SvgIcon.jsx';
import DataTable from '../DataTable.jsx';

export default function MyvassQualityTab({ report, cleanedData }) {
  const [showBirthICDetails, setShowBirthICDetails] = useState(false);
  const [showAssessmentDetails, setShowAssessmentDetails] = useState(false);

  if (!report) return <div>Loading...</div>;

  // Calculate total rows from cleanedData
  const totalRows = cleanedData?.length || 0;

  // Data quality issues
  const qualityIssues = [
    {
      issue: 'BIRTH_IC - NULL',
      count: report.missing_values?.birth_ic || 0,
      severity: 'WARNING',
      description: 'Birth certificate IC is missing. This affects parent identification.',
      key: 'birth_ic_null'
    },
    {
      issue: 'Berat lahir - NULL',
      count: report.missing_values?.berat_kg || 0,
      severity: 'INFO',
      description: 'Birth weight is missing. Affects birth weight analysis.',
      key: 'berat_null'
    },
    {
      issue: 'Panjang lahir - NULL',
      count: report.missing_values?.tinggi_cm || 0,
      severity: 'INFO',
      description: 'Birth length is missing. Affects growth monitoring.',
      key: 'panjang_null'
    },
    {
      issue: 'Birth weight outliers (> 6 kg)',
      count: cleanedData?.filter(r => parseFloat(r.berat_kg || r['Berat lahir (kg)']) > 6).length || 0,
      severity: 'ERROR',
      description: 'Birth weight exceeds biologically plausible range.',
      key: 'berat_outlier'
    },
    {
      issue: 'Birth length outliers (> 80 cm)',
      count: cleanedData?.filter(r => parseFloat(r.tinggi_cm || r['Panjang lahir (kg)']) > 80).length || 0,
      severity: 'ERROR',
      description: 'Birth length exceeds biologically plausible range.',
      key: 'panjang_outlier'
    },
    {
      issue: 'Assessment before DOB',
      count: report.age_issues?.negative || 0,
      severity: 'CRITICAL',
      description: 'Assessment date is before birth date. Data integrity issue.',
      key: 'assessment_before_dob'
    },
    {
      issue: 'Assessment > 10 years after DOB',
      count: report.age_issues?.too_old || 0,
      severity: 'WARNING',
      description: 'Assessment date is more than 10 years after birth. May be incorrect.',
      key: 'assessment_too_late'
    },
    {
      issue: 'ID corrupted - name appended',
      count: report.id_analysis?.corrupted?.name_appended || 0,
      severity: 'ERROR',
      description: 'ID contains appended text (e.g., names). Format violation.',
      key: 'id_name_appended'
    },
    {
      issue: 'BIRTH_IC corrupted - name appended',
      count: report.ic_validation?.invalid_rows || 0,
      severity: 'ERROR',
      description: 'Birth IC contains appended text. Format violation.',
      key: 'birth_ic_name_appended'
    },
    {
      issue: 'BIRTH_IC suffix meaning unknown',
      count: cleanedData?.filter(r => {
        const birthIC = r.birth_ic || r.BIRTH_IC || '';
        return birthIC.length > 12 && !/\d{12}/.test(birthIC.substring(0, 12));
      }).length || 0,
      severity: 'CRITICAL',
      description: 'Birth IC has unknown suffix format.',
      key: 'birth_ic_suffix'
    },
    {
      issue: "Jantina = 'Others'",
      count: report.categorical_summary?.jantina?.Others || report.categorical_summary?.jantina?.others || 0,
      severity: 'WARNING',
      description: 'Gender marked as "Others". May need data validation.',
      key: 'jantina_others'
    },
    {
      issue: 'ID - NULL',
      count: report.missing_values?.id || 0,
      severity: 'ERROR',
      description: 'Child ID is missing. Critical for record identification.',
      key: 'id_null'
    },
  ].filter(issue => issue.count > 0).sort((a, b) => b.count - a.count);

  const severityColors = {
    CRITICAL: '#f05c6b',
    ERROR: '#ff7c3f',
    WARNING: '#f6b53d',
    INFO: '#4f8ef7',
  };

  const severityOrder = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
  const sortedBySeverity = [...qualityIssues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div>
      {/* Quality Issues Overview */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SvgIcon name="warning" size={20} color="var(--warn)" />
          Data Quality Issues — Detailed Breakdown
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
          Comprehensive list of all data quality issues detected in the MyVass dataset. Issues are sorted by severity.
          Click on any issue to see affected rows.
        </p>

        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>Issue</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>Row Count</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>% of Total</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {sortedBySeverity.map((issue, idx) => (
              <tr key={idx} style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
              }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{issue.issue}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                    {issue.description}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                  {issue.count.toLocaleString()}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                  {totalRows > 0 ? ((issue.count / totalRows) * 100).toFixed(2) : '0.00'}%
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{
                    background: severityColors[issue.severity] + '33',
                    color: severityColors[issue.severity],
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}>
                    {issue.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {qualityIssues.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--success)' }}>
            <SvgIcon name="checkCircle" size={48} color="var(--success)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No Quality Issues Detected</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
              All validation checks passed successfully.
            </div>
          </div>
        )}
      </div>

      {/* Severity Summary */}
      <div className="card">
        <div className="card-title">Issue Severity Distribution</div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {['CRITICAL', 'ERROR', 'WARNING', 'INFO'].map(severity => {
            const count = qualityIssues.filter(i => i.severity === severity).length;
            const totalAffected = qualityIssues.filter(i => i.severity === severity).reduce((sum, i) => sum + i.count, 0);
            
            return (
              <div key={severity} className="stat-card" style={{ 
                borderColor: severityColors[severity] + '66',
                background: severityColors[severity] + '11'
              }}>
                <div className="stat-label" style={{ color: severityColors[severity], fontWeight: 600 }}>
                  {severity}
                </div>
                <div className="stat-val" style={{ fontSize: '1.4rem' }}>{count}</div>
                <div className="stat-sublabel">
                  {totalAffected.toLocaleString()} rows affected
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card" style={{ borderColor: 'rgba(56,217,192,0.3)', background: 'rgba(56,217,192,0.05)' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SvgIcon name="note" size={18} color="var(--success)" />
          Recommendations
        </div>
        <ul style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Prioritize fixing <strong style={{ color: 'var(--danger)' }}>CRITICAL</strong> and <strong style={{ color: '#ff7c3f' }}>ERROR</strong> severity issues first</li>
          <li>Review BIRTH_IC format violations - may need data cleansing at source</li>
          <li>Validate assessment dates against birth dates to prevent temporal inconsistencies</li>
          <li>Implement input validation rules for birth weight and length measurements</li>
          <li>Consider creating a data dictionary for BIRTH_IC suffix meanings</li>
        </ul>
      </div>
    </div>
  );
}
