import React, { useState } from 'react';
import SvgIcon from '../SvgIcon.jsx';
import DataTable from '../DataTable.jsx';

export default function KKMQualityTab({ issues, affectedRows, totalRows }) {
  const [expandedRules, setExpandedRules] = useState({});
  const [showingData, setShowingData] = useState({});

  if (!issues || issues.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--success)' }}>
          <SvgIcon name="checkCircle" size={48} color="var(--success)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No Quality Issues Detected</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
            All KKM business rule validations passed successfully.
          </div>
        </div>
      </div>
    );
  }

  const severityColors = {
    CRITICAL: '#f05c6b',
    ERROR: '#ff7c3f',
    WARNING: '#f6b53d',
    INFO: '#4f8ef7',
  };

  const severityOrder = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
  const sortedIssues = [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const toggleRule = (ruleId) => {
    setExpandedRules(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  const toggleShowData = (ruleId) => {
    setShowingData(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  // Group issues by severity
  const issuesBySeverity = {
    CRITICAL: sortedIssues.filter(i => i.severity === 'CRITICAL'),
    ERROR: sortedIssues.filter(i => i.severity === 'ERROR'),
    WARNING: sortedIssues.filter(i => i.severity === 'WARNING'),
    INFO: sortedIssues.filter(i => i.severity === 'INFO'),
  };

  const totalIssueCount = issues.length;
  const totalAffectedRows = issues.reduce((sum, i) => sum + (i.row_count || 0), 0);

  return (
    <div>
      {/* Summary Card */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(240,92,107,0.1) 0%, rgba(246,181,61,0.1) 100%)',
        borderColor: 'rgba(240,92,107,0.3)' 
      }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SvgIcon name="warning" size={22} color="var(--danger)" />
          DATA QUALITY ISSUES | KKM Berat & Tinggi 2024-2025
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
          Actual violations found in the dataset. Each issue references the Business Rule it breaks.
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="stat-val">{totalIssueCount}</div>
            <div className="stat-label">Total Issues</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--warn)' }}>
            <div className="stat-val">{totalAffectedRows.toLocaleString()}</div>
            <div className="stat-label">Affected Rows</div>
          </div>
          {Object.entries(issuesBySeverity).map(([severity, issueList]) => (
            issueList.length > 0 && (
              <div key={severity} className="stat-card" style={{ 
                borderLeft: `4px solid ${severityColors[severity]}` 
              }}>
                <div className="stat-val">{issueList.length}</div>
                <div className="stat-label">{severity}</div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Issues Table */}
      <div className="card">
        <div className="card-title">Business Rule Violations</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
          Click on any issue to expand details and view affected rows. Issues are sorted by severity.
        </p>

        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              borderBottom: '2px solid var(--border)', 
              background: 'rgba(255,255,255,0.02)' 
            }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600, width: '80px' }}>
                Issue ID
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                Column(s)
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                Issue Type
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                Description
              </th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600, width: '100px' }}>
                Row Count
              </th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600, width: '80px' }}>
                % of Total
              </th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600, width: '100px' }}>
                Severity
              </th>
              <th style={{ textAlign: 'center', padding: '10px 12px', width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedIssues.map((issue, idx) => {
              const ruleKey = `${issue.rule_id}_${idx}`;
              const isExpanded = expandedRules[ruleKey];
              const hasAffectedRows = affectedRows && affectedRows[issue.rule_id];
              const isShowingData = showingData[ruleKey];

              return (
                <React.Fragment key={ruleKey}>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleRule(ruleKey)}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                      {issue.rule_id}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>
                      {issue.column}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.75rem' }}>
                      {issue.issue_type}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.72rem', lineHeight: 1.5, color: 'var(--muted)' }}>
                      {issue.description.length > 150 && !isExpanded 
                        ? issue.description.substring(0, 150) + '...' 
                        : issue.description}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                      {issue.row_count !== undefined ? issue.row_count.toLocaleString() : 'Pending'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                      {issue.pct_total !== undefined ? `${issue.pct_total.toFixed(2)}%` : 'TBC'}
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
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <SvgIcon 
                        name={isExpanded ? 'close' : 'eye'} 
                        size={14} 
                        color="var(--accent)" 
                      />
                    </td>
                  </tr>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <tr style={{ background: 'rgba(79,142,247,0.05)' }}>
                      <td colSpan={8} style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '0.75rem', lineHeight: 1.7 }}>
                          <div style={{ marginBottom: 12 }}>
                            <strong style={{ color: 'var(--accent)' }}>Recommended Fix:</strong>{' '}
                            <span style={{ color: 'var(--muted)' }}>{issue.recommended_fix}</span>
                          </div>
                          
                          {hasAffectedRows && (
                            <div>
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '0.72rem', padding: '4px 12px', marginTop: 8 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleShowData(ruleKey);
                                }}
                              >
                                <SvgIcon name="eye" size={12} style={{ marginRight: 4 }} />
                                {isShowingData ? 'Hide' : 'Show'} Affected Rows
                              </button>
                              
                              {isShowingData && (
                                <div style={{ marginTop: 12, maxHeight: 400, overflow: 'auto' }}>
                                  <div style={{ 
                                    fontSize: '0.7rem', 
                                    color: 'var(--muted)', 
                                    marginBottom: 8,
                                    fontStyle: 'italic' 
                                  }}>
                                    Showing first 100 affected rows:
                                  </div>
                                  <DataTable 
                                    rows={affectedRows[issue.rule_id].slice(0, 100)} 
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div className="card" style={{ borderColor: 'rgba(56,217,192,0.3)', background: 'rgba(56,217,192,0.05)' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SvgIcon name="note" size={18} color="var(--success)" />
          Recommendations
        </div>
        <ul style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Prioritize fixing <strong style={{ color: 'var(--danger)' }}>CRITICAL</strong> and <strong style={{ color: '#ff7c3f' }}>ERROR</strong> severity issues first</li>
          <li>Review data entry processes to prevent outlier values for BERAT and TINGGI</li>
          <li>Implement ID_MURID format validation at data collection stage</li>
          <li>For duplicate IDs, investigate if same student measured twice or data entry error</li>
          <li>Cross-validate measurement dates against school calendar to identify suspicious dates</li>
          <li>Keep measurement pairs NULL records for demographic counts - filter during anthropometric analysis</li>
        </ul>
      </div>
    </div>
  );
}
