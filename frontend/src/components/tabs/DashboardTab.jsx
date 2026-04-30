import React from 'react';
import StatCard from '../StatCard.jsx';

export default function DashboardTab({ indicators, report }) {
  if (!indicators?.bawah_5_tahun) {
    return (
      <div className="card">
        <div className="card-title">ARAS INTEGRASI — Prevalence Dashboard</div>
        <p style={{ color: 'var(--muted)' }}>No indicator data available. Ensure anthropometric measurements are mapped.</p>
      </div>
    );
  }

  // Extract data for both age groups
  const below2 = indicators.bawah_2_tahun || {};
  const below5 = indicators.bawah_5_tahun || {};

  // Build summary cards
  const ind5 = below5;
  const kurangBerat = ind5.kurang_berat_badan?.overall || {};
  const bantut = ind5.bantut?.overall || {};
  const susut = ind5.susut?.overall || {};
  const obes = ind5.obes_berlebihan?.overall || {};

  return (
    <>
      {/* Overview Cards */}
      <div className="card">
        <div className="card-title">KKM Nutrition Indicators — Bawah 5 Tahun (0-59 months)</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 16 }}>
          WHO 2006 Growth Standards | {report.source_type === 'myvass' ? 'NCDC TASKA Data' : 'Clinic Birth Data'}
        </p>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <StatCard 
            val={`${kurangBerat.pct || 0}%`}
            label="Kurang Berat Badan"
            subtext={`${kurangBerat.n_affected || 0} / ${kurangBerat.n_total || 0}`}
            color={getColor(kurangBerat.pct)}
          />
          <StatCard 
            val={`${bantut.pct || 0}%`}
            label="Bantut (Stunting)"
            subtext={`${bantut.n_affected || 0} / ${bantut.n_total || 0}`}
            color={getColor(bantut.pct)}
          />
          <StatCard 
            val={`${susut.pct || 0}%`}
            label="Susut (Wasting)"
            subtext={`${susut.n_affected || 0} / ${susut.n_total || 0}`}
            color={getColor(susut.pct)}
          />
          <StatCard 
            val={`${obes.pct || 0}%`}
            label="Berlebihan Berat & Obes"
            subtext={`${obes.n_affected || 0} / ${obes.n_total || 0}`}
            color={getColor(obes.pct)}
          />
        </div>
      </div>

      {/* Birth Weight Analysis (if available) */}
      {report.changes_applied?.some(c => c.action === 'birth_weight_classified') && (
        <div className="card birth-weight-section">
          <div className="card-title">
            <SvgIcon name="bottle" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Birth Weight Classification (WHO Standards)
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 16 }}>
            Distribution of birth weights from clinic data. Low birth weight (&lt;2.5kg) is a key risk factor for malnutrition.
          </p>
          {renderBirthWeightAnalysis(indicators, report)}
        </div>
      )}

      {/* ARAS INTEGRASI Table — MyVASS Style */}
      <div className="card">
        <div className="card-title">
          ARAS INTEGRASI — Prevalence Summary (Bawah 5 Tahun)
          <span style={{ marginLeft: 12, fontSize: '0.7rem', fontWeight: 400, color: 'var(--muted)' }}>
            Outliers removed by biological range
          </span>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                <th colSpan="3" style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  Kurang Berat Badan
                </th>
                <th colSpan="3" style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  Bantut
                </th>
                <th colSpan="3" style={{ padding: '12px', textAlign: 'center' }}>
                  Susut
                </th>
              </tr>
              <tr style={{ background: 'rgba(240,92,107,0.05)' }}>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Num</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Denom</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600, borderRight: '1px solid var(--border)' }}>%</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Num</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Denom</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600, borderRight: '1px solid var(--border)' }}>%</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Num</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Denom</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 600 }}>%</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
                  {kurangBerat.n_affected || 0}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
                  {kurangBerat.n_total || 0}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 600, color: getColor(kurangBerat.pct), borderRight: '1px solid var(--border)' }}>
                  {(kurangBerat.pct || 0).toFixed(1)}%
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
                  {bantut.n_affected || 0}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
                  {bantut.n_total || 0}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 600, color: getColor(bantut.pct), borderRight: '1px solid var(--border)' }}>
                  {(bantut.pct || 0).toFixed(1)}%
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
                  {susut.n_affected || 0}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
                  {susut.n_total || 0}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 600, color: getColor(susut.pct) }}>
                  {(susut.pct || 0).toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Geographic Breakdown */}
      {below5.kurang_berat_badan?.by_negeri && (
        <div className="card">
          <div className="card-title">Breakdown by State (Negeri) — Top 10</div>
          <GeographicTable data={below5.kurang_berat_badan.by_negeri} title="Kurang Berat Badan" />
          <div style={{ marginTop: 20 }} />
          <GeographicTable data={below5.bantut.by_negeri} title="Bantut" />
        </div>
      )}

      {/* Age Group Comparison */}
      <div className="card">
        <div className="card-title">Age Group Comparison</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Bawah 2 Tahun (0-23m)</th>
                <th>Bawah 5 Tahun (0-59m)</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {['kurang_berat_badan', 'bantut', 'susut', 'obes_berlebihan'].map(ind => {
                const ind2 = below2[ind]?.overall || {};
                const ind5 = below5[ind]?.overall || {};
                const diff = (ind5.pct || 0) - (ind2.pct || 0);
                return (
                  <tr key={ind}>
                    <td style={{ fontWeight: 500 }}>{formatIndicatorName(ind)}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>
                      {(ind2.pct || 0).toFixed(1)}% ({ind2.n_affected || 0}/{ind2.n_total || 0})
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}>
                      {(ind5.pct || 0).toFixed(1)}% ({ind5.n_affected || 0}/{ind5.n_total || 0})
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Quality Summary */}
      <div className="card">
        <div className="card-title">Data Quality & Coverage</div>
        <div className="stats-grid">
          <StatCard val={report.total_rows?.toLocaleString()} label="Total Records" />
          <StatCard val={report.n_mapped_standard || 0} label="Standard Fields Mapped" color="var(--success)" />
          <StatCard 
            val={`${((report.data_completeness?.overall_completeness || 0) * 100).toFixed(1)}%`}
            label="Data Completeness"
            color="var(--accent)"
          />
          <StatCard 
            val={report.data_quality_score?.grade || 'N/A'}
            label="Quality Grade"
            subtext={`${report.data_quality_score?.total_score || 0}/100`}
            color="var(--success)"
          />
        </div>
      </div>
    </>
  );
}

function GeographicTable({ data, title }) {
  if (!data) return null;
  
  // Sort by prevalence descending
  const sorted = Object.entries(data)
    .map(([negeri, stats]) => ({ negeri, ...stats }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0))
    .slice(0, 10);

  return (
    <>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--muted)' }}>
        {title}
      </h4>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Negeri</th>
              <th>Affected</th>
              <th>Total</th>
              <th>Prevalence</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                <td>{row.negeri}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{row.n_affected?.toLocaleString()}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{row.n_total?.toLocaleString()}</td>
                <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: getColor(row.pct) }}>
                  {(row.pct || 0).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function getColor(pct) {
  if (!pct) return 'var(--muted)';
  if (pct < 10) return 'var(--success)';
  if (pct < 20) return 'var(--accent)';
  if (pct < 30) return 'var(--warn)';
  return 'var(--danger)';
}

function renderBirthWeightAnalysis(indicators, report) {
  // Extract birth weight categories from changes_applied
  const bwChange = report.changes_applied?.find(c => c.action === 'birth_weight_classified');
  if (!bwChange || !bwChange.after?.categories) {
    return <p style={{ color: 'var(--muted)' }}>No birth weight data available.</p>;
  }

  const categories = bwChange.after.categories;
  const total = Object.values(categories).reduce((sum, n) => sum + n, 0);

  // Define WHO category metadata
  const categoryInfo = {
    'Extremely Low (<1.0 kg)': { color: 'var(--danger)', risk: 'Critical' },
    'Very Low (1.0-1.5 kg)': { color: 'var(--danger)', risk: 'Very High' },
    'Low (1.5-2.5 kg)': { color: 'var(--warn)', risk: 'High' },
    'Normal (2.5-4.0 kg)': { color: 'var(--success)', risk: 'Normal' },
    'Macrosomia (≥4.0 kg)': { color: 'var(--accent)', risk: 'Elevated' },
  };

  // Calculate cross-tab with current nutrition status if available
  const bawah5 = indicators?.bawah_5_tahun;
  const crossTab = {};
  
  if (bawah5) {
    ['kurang_berat_badan', 'bantut', 'susut', 'obes_berlebihan'].forEach(ind => {
      const byBW = bawah5[ind]?.by_birth_weight || [];
      if (byBW.length > 0) {
        crossTab[ind] = byBW;
      }
    });
  }

  return (
    <>
      <div className="birth-weight-grid">
        {Object.entries(categories).map(([category, count]) => {
          const pct = ((count / total) * 100).toFixed(1);
          const info = categoryInfo[category] || { color: 'var(--muted)', risk: 'Unknown' };
          
          return (
            <div key={category} className="bw-category-card">
              <div className="bw-category-label">{category}</div>
              <div className="bw-category-value" style={{ color: info.color }}>
                {count.toLocaleString()}
              </div>
              <div className="bw-category-pct">{pct}%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>
                Risk: {info.risk}
              </div>
            </div>
          );
        })}
      </div>

      {/* Birth Weight × Current Status Cross-Tab */}
      {Object.keys(crossTab).length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
            Birth Weight Impact on Current Nutrition Status
          </h4>
          {Object.entries(crossTab).map(([indicator, data]) => {
            if (!data || data.length === 0) return null;
            
            return (
              <div key={indicator} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, textTransform: 'capitalize' }}>
                  {formatIndicatorName(indicator)}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Birth Weight Category</th>
                        <th>Affected</th>
                        <th>Total</th>
                        <th>Prevalence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i}>
                          <td>{row.birth_weight_category}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{row.n_affected}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{row.n_total}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: getColor(row.pct) }}>
                            {(row.pct || 0).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function formatIndicatorName(key) {
  const names = {
    kurang_berat_badan: 'Kurang Berat Badan',
    bantut: 'Bantut',
    susut: 'Susut',
    obes_berlebihan: 'Berlebihan Berat & Obes',
  };
  return names[key] || key;
}
