import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie
} from 'recharts';

const ZSCORE_INFO = {
  waz: {
    label: 'WAZ — Weight-for-Age Z-score',
    desc: 'Mengukur berat badan berbanding berat piawai WHO 2006 mengikut umur dan jantina.',
    cutoffs: [
      { range: 'Z < −3',      class: 'sangat_kurang_berat_badan', color: 'var(--danger)',  label: 'Sangat Kurang Berat Badan' },
      { range: '−3 ≤ Z < −2', class: 'kurang_berat_badan',        color: 'var(--accent)',  label: 'Kurang Berat Badan (Indikator KKM)' },
      { range: '−2 ≤ Z ≤ +2', class: 'berat_normal',             color: 'var(--success)', label: 'Berat Normal' },
      { range: 'Z > +2',      class: 'berlebihan_berat_badan',    color: 'var(--warn)',    label: 'Berlebihan Berat Badan' },
    ],
  },
  haz: {
    label: 'HAZ — Height/Length-for-Age Z-score',
    desc: 'Mengukur tinggi/panjang berbanding piawai WHO 2006. Mengesan stunting (bantut) — petanda kekurangan zat kronik.',
    cutoffs: [
      { range: 'Z < −3',      class: 'bantut_teruk',   color: 'var(--danger)',  label: 'Bantut Teruk' },
      { range: '−3 ≤ Z < −2', class: 'bantut',         color: 'var(--accent)',  label: 'Bantut (Indikator KKM)' },
      { range: '−2 ≤ Z ≤ +3', class: 'tinggi_normal',  color: 'var(--success)', label: 'Tinggi Normal' },
      { range: 'Z > +3',      class: 'tinggi',          color: 'var(--accent2)', label: 'Tinggi' },
    ],
  },
  baz: {
    label: 'BAZ — BMI-for-Age Z-score',
    desc: 'Mengukur BMI berbanding piawai WHO 2006. Mengesan susut (wasted) dan obesiti pada kanak-kanak.',
    cutoffs: [
      { range: 'Z < −3',       class: 'susut_teruk',                  color: 'var(--danger)',  label: 'Susut Teruk' },
      { range: '−3 ≤ Z < −2',  class: 'susut',                        color: 'var(--accent)',  label: 'Susut (Indikator KKM)' },
      { range: '−2 ≤ Z ≤ +1',  class: 'normal',                       color: 'var(--success)', label: 'Normal' },
      { range: '+1 < Z ≤ +2',  class: 'risiko_berlebihan_berat_badan', color: 'var(--warn)',    label: 'Risiko Berlebihan Berat Badan' },
      { range: '+2 < Z ≤ +3',  class: 'berlebihan_berat_badan',        color: 'var(--warn)',    label: 'Berlebihan Berat Badan (Indikator KKM)' },
      { range: 'Z > +3',       class: 'obes',                          color: 'var(--danger)',  label: 'Obes (Indikator KKM)' },
    ],
  },
};

function MismatchCard({ field, info }) {
  if (!info) return null;
  const color = info.severity === 'high' ? 'var(--danger)' : 'var(--success)';
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 16px', marginBottom: 10 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--accent2)', marginBottom: 4 }}>{field}</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '1rem', color }}>
          {info.n_mismatch.toLocaleString()} / {info.n_total.toLocaleString()} tidak sepadan
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>
          ({info.pct_mismatch}%)
        </span>
        <span className={`sev sev-${info.severity}`}>{info.severity?.toUpperCase()}</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{info.note}</div>
    </div>
  );
}

export default function ZscoreTab({ ns, mismatch, zscoreErrors, zscoreCapability, cleanedData }) {
  const [active, setActive] = useState('waz');
  const [showErrors, setShowErrors] = useState(false);
  const [showData, setShowData] = useState(false);
  const [dataPage, setDataPage] = useState(1);
  const dataPageSize = 50;

  // Helper function to safely format numeric values
  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return '--';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return '--';
    return num.toFixed(decimals);
  };

  const zscoreStats = {
    waz: ns?.waz,
    haz: ns?.haz,
    baz: ns?.baz,
  };

  const hasMismatch = mismatch && Object.keys(mismatch).length > 0;
  const hasErrors = zscoreErrors && Array.isArray(zscoreErrors) && zscoreErrors.length > 0;

  return (
    <>
      {/* Reference table */}
      <div className="card">
        <div className="card-title">Piawai Pertumbuhan WHO 2006 — Ambang Klasifikasi</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.7 }}>
          Z-skor dikira secara bebas menggunakan jadual LMS WHO 2006 (bawah 5 tahun). Ini adalah sumber
          kebenaran utama untuk pengkelasan indikator pemakanan KKM — bukan label dari data sumber.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {Object.keys(ZSCORE_INFO).map((k) => (
            <button key={k} className={`btn btn-secondary${active === k ? ' active' : ''}`}
              style={active === k ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' } : {}}
              onClick={() => setActive(k)}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>
        {Object.entries(ZSCORE_INFO).map(([k, info]) => {
          if (k !== active) return null;
          const stats = zscoreStats[k];
          return (
            <div key={k}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{info.label}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12 }}>{info.desc}</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Julat Z-skor</th><th>Kelas</th><th>Peranan dalam KKM</th></tr>
                  </thead>
                  <tbody>
                    {info.cutoffs.map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--mono)', color: c.color }}>{c.range}</td>
                        <td><span style={{ fontSize: '0.72rem', background: c.color + '22', color: c.color, borderRadius: 4, padding: '2px 6px' }}>{c.class}</span></td>
                        <td style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>{c.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Z-score distribution stats */}
              {stats && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
                    Statistik z-skor data semasa ({stats.n?.toLocaleString()} rekod dikira):
                  </div>
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                    {[['Min', stats.min], ['Max', stats.max], ['Mean', stats.mean],
                      ['Median', stats.median], ['StdDev', stats.std],
                      ['P5', stats.p5], ['P95', stats.p95]].map(([lbl, val]) => (
                      <div key={lbl} className="stat-card" style={{ padding: '8px 12px' }}>
                        <div className="stat-val" style={{ fontSize: '1rem' }}>{val ?? '--'}</div>
                        <div className="stat-label">{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Z-Score Distribution Visualizations */}
      {cleanedData && cleanedData.length > 0 && (() => {
        // Process data for visualizations
        const validData = cleanedData.filter(row => 
          row.waz !== null && row.waz !== undefined || 
          row.haz !== null && row.haz !== undefined || 
          row.baz !== null && row.baz !== undefined
        );

        if (validData.length === 0) return null;

        // Helper to convert to number
        const toNum = (val) => {
          if (val === null || val === undefined) return null;
          const num = typeof val === 'number' ? val : parseFloat(val);
          return isNaN(num) ? null : num;
        };

        // Distribution histogram data (binning z-scores)
        const createHistogramData = (zscoreType) => {
          const values = validData.map(row => toNum(row[zscoreType])).filter(v => v !== null);
          if (values.length === 0) return [];
          
          const bins = [];
          const binSize = 0.5;
          const min = Math.floor(Math.min(...values) / binSize) * binSize;
          const max = Math.ceil(Math.max(...values) / binSize) * binSize;
          
          for (let i = min; i <= max; i += binSize) {
            const count = values.filter(v => v >= i && v < i + binSize).length;
            bins.push({
              bin: `${i.toFixed(1)} to ${(i + binSize).toFixed(1)}`,
              binCenter: i + binSize / 2,
              count: count,
              binLabel: i.toFixed(1),
            });
          }
          return bins;
        };

        // Classification breakdown
        const getClassificationData = (classField) => {
          const counts = {};
          validData.forEach(row => {
            const cls = row[classField];
            if (cls) counts[cls] = (counts[cls] || 0) + 1;
          });
          return Object.entries(counts).map(([name, value]) => ({ name, value }));
        };

        // Scatter plot data (age vs z-score)
        const createScatterData = (zscoreType) => {
          return validData
            .filter(row => toNum(row.age_months_computed) !== null && toNum(row[zscoreType]) !== null)
            .map(row => ({
              age: toNum(row.age_months_computed),
              zscore: toNum(row[zscoreType]),
              gender: row.jantina,
            }))
            .slice(0, 500); // Limit for performance
        };

        const histWaz = createHistogramData('waz');
        const histHaz = createHistogramData('haz');
        const histBaz = createHistogramData('baz');
        
        const pieWaz = getClassificationData('waz_class');
        const pieHaz = getClassificationData('haz_class');
        const pieBaz = getClassificationData('baz_class');

        const scatterWaz = createScatterData('waz');
        const scatterHaz = createScatterData('haz');
        const scatterBaz = createScatterData('baz');

        // Colors for pie charts
        const COLORS = ['#f05c6b', '#f6b53d', '#38d9c0', '#4f8ef7', '#8b5cf6', '#ec4899'];

        return (
          <div className="card">
            <div className="card-title">Z-Score Distribution Visualizations</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
              Visual analysis of WHO 2006 z-score distributions across the dataset. Use these charts to identify
              patterns, outliers, and population health trends.
            </p>

            {/* Tab selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {Object.keys(ZSCORE_INFO).map((k) => (
                <button key={k} className={`btn btn-secondary${active === k ? ' active' : ''}`}
                  style={active === k ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' } : {}}
                  onClick={() => setActive(k)}>
                  {k.toUpperCase()}
                </button>
              ))}
            </div>

            {/* WAZ Visualizations */}
            {active === 'waz' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                    Distribution Histogram — WAZ
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={histWaz}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="binLabel" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                      <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}
                        labelStyle={{ color: 'var(--text)' }}
                      />
                      <ReferenceLine x="0" stroke="var(--accent)" strokeWidth={2} label={{ value: 'Normal', fill: 'var(--accent)', fontSize: 10 }} />
                      <ReferenceLine x="-2" stroke="var(--warn)" strokeDasharray="3 3" label={{ value: '-2 SD', fill: 'var(--warn)', fontSize: 10 }} />
                      <ReferenceLine x="2" stroke="var(--warn)" strokeDasharray="3 3" label={{ value: '+2 SD', fill: 'var(--warn)', fontSize: 10 }} />
                      <Bar dataKey="count" fill="#4f8ef7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                      Classification Breakdown
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieWaz}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieWaz.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                      Age vs WAZ Scatter
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="age" name="Age (months)" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                        <YAxis dataKey="zscore" name="WAZ" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                        />
                        <ReferenceLine y={0} stroke="var(--accent)" strokeWidth={1} />
                        <ReferenceLine y={-2} stroke="var(--danger)" strokeDasharray="3 3" />
                        <ReferenceLine y={2} stroke="var(--warn)" strokeDasharray="3 3" />
                        <Scatter data={scatterWaz} fill="#4f8ef7" fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* HAZ Visualizations */}
            {active === 'haz' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                    Distribution Histogram — HAZ
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={histHaz}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="binLabel" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                      <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}
                      />
                      <ReferenceLine x="0" stroke="var(--accent)" strokeWidth={2} label={{ value: 'Normal', fill: 'var(--accent)', fontSize: 10 }} />
                      <ReferenceLine x="-2" stroke="var(--danger)" strokeDasharray="3 3" label={{ value: 'Stunting', fill: 'var(--danger)', fontSize: 10 }} />
                      <Bar dataKey="count" fill="#38d9c0" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                      Classification Breakdown
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieHaz}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {pieHaz.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                      Age vs HAZ Scatter
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="age" name="Age (months)" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                        <YAxis dataKey="zscore" name="HAZ" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                        />
                        <ReferenceLine y={0} stroke="var(--accent)" strokeWidth={1} />
                        <ReferenceLine y={-2} stroke="var(--danger)" strokeDasharray="3 3" />
                        <Scatter data={scatterHaz} fill="#38d9c0" fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* BAZ Visualizations */}
            {active === 'baz' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                    Distribution Histogram — BAZ
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={histBaz}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="binLabel" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                      <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}
                      />
                      <ReferenceLine x="0" stroke="var(--accent)" strokeWidth={2} label={{ value: 'Normal', fill: 'var(--accent)', fontSize: 10 }} />
                      <ReferenceLine x="-2" stroke="var(--danger)" strokeDasharray="3 3" label={{ value: 'Wasted', fill: 'var(--danger)', fontSize: 10 }} />
                      <ReferenceLine x="2" stroke="var(--warn)" strokeDasharray="3 3" label={{ value: 'Overweight', fill: 'var(--warn)', fontSize: 10 }} />
                      <Bar dataKey="count" fill="#f6b53d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                      Classification Breakdown
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieBaz}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {pieBaz.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                      Age vs BAZ Scatter
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="age" name="Age (months)" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                        <YAxis dataKey="zscore" name="BAZ" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                        />
                        <ReferenceLine y={0} stroke="var(--accent)" strokeWidth={1} />
                        <ReferenceLine y={-2} stroke="var(--danger)" strokeDasharray="3 3" />
                        <ReferenceLine y={2} stroke="var(--warn)" strokeDasharray="3 3" />
                        <Scatter data={scatterBaz} fill="#f6b53d" fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Source label vs z-score mismatch */}
      <div className="card">
        <div className="card-title">Perbandingan: Label Sumber vs Z-Skor WHO 2006</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.7 }}>
          Setiap rekod dengan label status dari sumber data dibandingkan dengan klasifikasi z-skor WHO 2006
          yang dikira secara bebas. Ketidakpadanan menunjukkan potensi ralat dalam data sumber.
        </p>
        {!hasMismatch ? (
          <p style={{ color: 'var(--success)' }}>
            {Object.keys(zscoreStats).some(k => zscoreStats[k])
              ? 'Tiada ketidakpadanan signifikan dikesan.'
              : 'Z-skor tidak dapat dikira — pastikan berat, tinggi, tarikh_lahir, tarikh_ukur dan jantina dipetakan.'}
          </p>
        ) : (
          Object.entries(mismatch).map(([field, info]) => (
            <MismatchCard key={field} field={field} info={info} />
          ))
        )}
      </div>

      {/* Z-Score Calculation Capability & Errors */}
      {zscoreCapability && (
        <div className="card" style={{ borderColor: 'rgba(79,142,247,0.2)' }}>
          <div className="card-title">Z-Score Calculation Capability</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.7 }}>
            Summary of how many rows have complete data required for WHO 2006 z-score calculation.
          </p>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-val" style={{ color: zscoreCapability.pct_waz >= 80 ? 'var(--success)' : 'var(--warn)' }}>
                {zscoreCapability.can_compute_waz.toLocaleString()}
              </div>
              <div className="stat-label">Can Compute WAZ ({zscoreCapability.pct_waz}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" style={{ color: zscoreCapability.pct_haz >= 80 ? 'var(--success)' : 'var(--warn)' }}>
                {zscoreCapability.can_compute_haz.toLocaleString()}
              </div>
              <div className="stat-label">Can Compute HAZ ({zscoreCapability.pct_haz}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" style={{ color: zscoreCapability.pct_baz >= 80 ? 'var(--success)' : 'var(--warn)' }}>
                {zscoreCapability.can_compute_baz.toLocaleString()}
              </div>
              <div className="stat-label">Can Compute BAZ ({zscoreCapability.pct_baz}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{zscoreCapability.total_rows.toLocaleString()}</div>
              <div className="stat-label">Total Rows</div>
            </div>
          </div>
        </div>
      )}

      {/* Z-Score Calculation Errors */}
      {hasErrors && (
        <div className="card" style={{ borderColor: 'rgba(240,92,107,0.2)' }}>
          <div className="row-flex" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Rows Cannot Calculate Z-Scores — Missing Required Fields
              <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>
                ({zscoreErrors.length} rows shown, up to 500 per indicator)
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}
              onClick={() => setShowErrors(!showErrors)}>
              {showErrors ? 'Hide' : 'Show Rows'}
            </button>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: showErrors ? 12 : 0, lineHeight: 1.6 }}>
            These rows are missing required fields (berat_kg, tinggi_cm, age_months_computed, jantina) needed to 
            calculate WHO 2006 z-scores. Fix data entry at source or fill missing measurements.
          </p>
          {showErrors && (
            <div className="table-wrap" style={{ maxHeight: 500, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Sheet</th>
                    <th>Indicator</th>
                    <th>Missing Fields</th>
                    <th>ID</th>
                    <th>Negeri</th>
                    <th>Daerah</th>
                  </tr>
                </thead>
                <tbody>
                  {zscoreErrors.map((err, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--mono)' }}>{err.row_index}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{err.sheet_name || '--'}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>{err.indicator}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>
                        {err.missing_fields?.join(', ') || err.reason}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{err.id || '--'}</td>
                      <td style={{ fontSize: '0.72rem' }}>{err.negeri || '--'}</td>
                      <td style={{ fontSize: '0.72rem' }}>{err.daerah || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actual Z-Score Data Table */}
      {cleanedData && cleanedData.length > 0 && (
        <div className="card">
          <div className="row-flex" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>
              WHO 2006 Z-Scores — Actual Data
              <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>
                ({cleanedData.length.toLocaleString()} rows total)
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}
              onClick={() => setShowData(!showData)}>
              {showData ? 'Hide Data' : 'Show Data'}
            </button>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: showData ? 12 : 0, lineHeight: 1.6 }}>
            View actual computed z-scores for each child. Use this to verify calculations and identify specific cases.
          </p>
          {showData && (() => {
            // Filter rows that have at least one z-score computed
            const rowsWithZscores = cleanedData.filter(row => 
              row.waz !== null && row.waz !== undefined || 
              row.haz !== null && row.haz !== undefined || 
              row.baz !== null && row.baz !== undefined
            );
            
            const totalDataPages = Math.ceil(rowsWithZscores.length / dataPageSize);
            const startIdx = (dataPage - 1) * dataPageSize;
            const endIdx = startIdx + dataPageSize;
            const pageData = rowsWithZscores.slice(startIdx, endIdx);
            
            return (
              <>
                <div style={{ marginBottom: 12, fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Showing rows {startIdx + 1}-{Math.min(endIdx, rowsWithZscores.length)} of {rowsWithZscores.length.toLocaleString()} with computed z-scores
                </div>
                <div className="table-wrap" style={{ maxHeight: 600, overflow: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nama</th>
                        <th>Umur (bln)</th>
                        <th>Jantina</th>
                        <th>Berat (kg)</th>
                        <th>Tinggi (cm)</th>
                        <th>BMI</th>
                        <th style={{ background: 'rgba(79,142,247,0.1)' }}>WAZ</th>
                        <th style={{ background: 'rgba(79,142,247,0.1)' }}>Kelas WAZ</th>
                        <th style={{ background: 'rgba(56,217,192,0.1)' }}>HAZ</th>
                        <th style={{ background: 'rgba(56,217,192,0.1)' }}>Kelas HAZ</th>
                        <th style={{ background: 'rgba(246,181,61,0.1)' }}>BAZ</th>
                        <th style={{ background: 'rgba(246,181,61,0.1)' }}>Kelas BAZ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>
                            {row.id?.substring(0, 8) || '--'}...
                          </td>
                          <td style={{ fontSize: '0.72rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.nama || '--'}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>
                            {formatNumber(row.age_months_computed, 1)}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>{row.jantina || '--'}</td>
                          <td style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>
                            {formatNumber(row.berat_kg, 2)}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>
                            {formatNumber(row.tinggi_cm, 1)}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>
                            {formatNumber(row.bmi, 1)}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: 'var(--accent2)' }}>
                            {formatNumber(row.waz, 2)}
                          </td>
                          <td style={{ fontSize: '0.7rem' }}>
                            {row.waz_class ? (
                              <span style={{ 
                                background: row.waz_class?.includes('kurang') ? 'rgba(240,92,107,0.2)' : 
                                           row.waz_class?.includes('normal') ? 'rgba(56,217,192,0.2)' : 
                                           'rgba(246,181,61,0.2)',
                                color: row.waz_class?.includes('kurang') ? 'var(--danger)' : 
                                       row.waz_class?.includes('normal') ? 'var(--success)' : 
                                       'var(--warn)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                whiteSpace: 'nowrap'
                              }}>
                                {row.waz_class}
                              </span>
                            ) : '--'}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: 'var(--accent2)' }}>
                            {formatNumber(row.haz, 2)}
                          </td>
                          <td style={{ fontSize: '0.7rem' }}>
                            {row.haz_class ? (
                              <span style={{ 
                                background: row.haz_class?.includes('bantut') ? 'rgba(240,92,107,0.2)' : 
                                           row.haz_class?.includes('normal') ? 'rgba(56,217,192,0.2)' : 
                                           'rgba(246,181,61,0.2)',
                                color: row.haz_class?.includes('bantut') ? 'var(--danger)' : 
                                       row.haz_class?.includes('normal') ? 'var(--success)' : 
                                       'var(--warn)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                whiteSpace: 'nowrap'
                              }}>
                                {row.haz_class}
                              </span>
                            ) : '--'}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: 'var(--accent2)' }}>
                            {formatNumber(row.baz, 2)}
                          </td>
                          <td style={{ fontSize: '0.7rem' }}>
                            {row.baz_class ? (
                              <span style={{ 
                                background: row.baz_class?.includes('susut') || row.baz_class?.includes('obes') ? 'rgba(240,92,107,0.2)' : 
                                           row.baz_class?.includes('normal') ? 'rgba(56,217,192,0.2)' : 
                                           'rgba(246,181,61,0.2)',
                                color: row.baz_class?.includes('susut') || row.baz_class?.includes('obes') ? 'var(--danger)' : 
                                       row.baz_class?.includes('normal') ? 'var(--success)' : 
                                       'var(--warn)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                whiteSpace: 'nowrap'
                              }}>
                                {row.baz_class}
                              </span>
                            ) : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalDataPages > 1 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.7rem', padding: '4px 12px' }}
                      disabled={dataPage === 1}
                      onClick={() => setDataPage(p => Math.max(1, p - 1))}>
                      ← Prev
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Page {dataPage} of {totalDataPages}
                    </span>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.7rem', padding: '4px 12px' }}
                      disabled={dataPage === totalDataPages}
                      onClick={() => setDataPage(p => Math.min(totalDataPages, p + 1))}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
