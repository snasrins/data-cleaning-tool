import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import SvgIcon from '../SvgIcon.jsx';

export default function MyvassDashboardTab({ report, previewData, cleanedData }) {
  if (!report || !previewData) return <div>Loading...</div>;

  // Extract statistics
  const totalRows = previewData.total_rows || 0;
  const totalColumns = previewData.total_columns || 0;
  const originalRows = previewData.original_rows || totalRows;
  
  // Gender breakdown from categorical summary
  const genderData = report.categorical_summary?.jantina || {};
  const genderStats = Object.entries(genderData).map(([key, value]) => ({
    name: key,
    value: value,
    percentage: totalRows > 0 ? ((value / totalRows) * 100).toFixed(1) : '0'
  }));

  // Colors for charts
  const COLORS = ['#4f8ef7', '#f05c6b', '#f6b53d', '#38d9c0'];

  // Calculate unique children estimate (distinct IDs)
  const uniqueIds = cleanedData ? new Set(cleanedData.map(r => r.id || r.ID)).size : 'Unknown';

  // Data quality summary - aggregate all issues
  const qualityIssues = [
    { name: 'BIRTH_IC - NULL', count: report.missing_values?.birth_ic || 0, severity: 'WARNING' },
    { name: 'Berat lahir - NULL', count: report.missing_values?.berat_kg || 0, severity: 'INFO' },
    { name: 'Panjang lahir - NULL', count: report.missing_values?.tinggi_cm || 0, severity: 'INFO' },
    { name: 'IC corrupted', count: report.ic_validation?.invalid_rows || 0, severity: 'ERROR' },
    { name: 'ID - NULL', count: report.missing_values?.id || 0, severity: 'ERROR' },
  ].filter(issue => issue.count > 0);

  const severityColors = {
    CRITICAL: '#f05c6b',
    ERROR: '#ff7c3f',
    WARNING: '#f6b53d',
    INFO: '#4f8ef7',
  };

  return (
    <div>
      {/* Dataset Overview */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1) 0%, rgba(56,217,192,0.1) 100%)', borderColor: 'rgba(79,142,247,0.3)' }}>
        <div className="card-title" style={{ fontSize: '1.1rem', marginBottom: 16 }}>
          DATASET SUMMARY STATISTICS
        </div>
        
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 8, fontWeight: 600 }}>
            Dataset: PenyediaanGISStatusPemakananKanakkanak
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            <strong>Data Source:</strong> Child nutrition & immunisation surveillance system (MyVass Clinic)<br />
            <strong>Last Known Refresh:</strong> {new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long' })}<br />
            <strong>Vaccine Types:</strong> {report.categorical_summary?.vaccine_name ? Object.keys(report.categorical_summary.vaccine_name).length : 'N/A'} Distinct VACCINE_NAME values<br />
            <strong>States (Negeri):</strong> {report.categorical_summary?.negeri ? Object.keys(report.categorical_summary.negeri).length : 'N/A'} states
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <StatBox label="Total Rows" value={totalRows.toLocaleString()} sublabel="all records" icon="document" />
          <StatBox label="Total Columns" value={totalColumns} sublabel="All fields including ID and measurement columns" icon="tag" />
          <StatBox label="Unique Children (est.)" value={uniqueIds.toLocaleString()} sublabel="DISTINCT ID count" icon="baby" />
        </div>
      </div>

      {/* Gender Breakdown */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SvgIcon name="chartDown" size={18} color="var(--accent)" />
          GENDER BREAKDOWN (Jantina)
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
              {genderStats.map((stat, idx) => (
                <div key={idx} className="stat-card">
                  <div className="stat-label">{stat.name}</div>
                  <div className="stat-val">{stat.value.toLocaleString()}</div>
                  <div className="stat-sublabel">{stat.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={genderStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Quality Summary */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SvgIcon name="warning" size={18} color="var(--warn)" />
          DATA QUALITY SUMMARY
        </div>

        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)' }}>Issue</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)' }}>Row Count</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)' }}>% of Total</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--muted)' }}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {qualityIssues.map((issue, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '8px 12px' }}>{issue.name}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                  {issue.count.toLocaleString()}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                  {((issue.count / totalRows) * 100).toFixed(2)}%
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <span style={{
                    background: severityColors[issue.severity] + '33',
                    color: severityColors[issue.severity],
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    {issue.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatBox({ label, value, sublabel, icon }) {
  return (
    <div className="stat-card" style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <SvgIcon name={icon} size={16} color="var(--accent)" />
        <div className="stat-label" style={{ margin: 0 }}>{label}</div>
      </div>
      <div className="stat-val" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value}</div>
      {sublabel && <div className="stat-sublabel">{sublabel}</div>}
    </div>
  );
}
