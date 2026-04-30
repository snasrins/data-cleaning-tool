import React from 'react';

const LABELS = { berat_kg: 'Berat (kg)', tinggi_cm: 'Tinggi (cm)', bmi: 'BMI', age_months_computed: 'Umur (bulan)' };
const STAT_KEYS = [
  ['N', 'n'], ['Min', 'min'], ['Max', 'max'], ['Julat', 'range'],
  ['Mean', 'mean'], ['Median', 'median'], ['Mod', 'mode'],
  ['StdDev', 'std'], ['Kepencongan', 'skewness'], ['Kurtosis', 'kurtosis'],
  ['P5', 'p5'], ['P25', 'p25'], ['P75', 'p75'], ['P95', 'p95'],
  ['Outlier IQR', 'outliers_iqr'], ['Outlier Ekstrem', 'extreme_outliers_iqr'],
  ['Outlier Z>3', 'outliers_zscore'], ['Luar Julat Bio', 'outliers_bio'],
];

function MiniBoxPlot({ bp, bio }) {
  if (!bp) return null;
  const all = [bp.whisker_lo, bp.q1, bp.median, bp.q3, bp.whisker_hi, ...(bp.outlier_points || [])];
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  const pct = (v) => ((v - lo) / span * 100);
  return (
    <div style={{ position: 'relative', height: 40, margin: '8px 0 4px', background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
      {/* whisker line */}
      <div style={{ position: 'absolute', top: 18, left: `${pct(bp.whisker_lo)}%`, width: `${pct(bp.whisker_hi) - pct(bp.whisker_lo)}%`, height: 2, background: 'var(--muted)' }} />
      {/* box */}
      <div style={{ position: 'absolute', top: 8, left: `${pct(bp.q1)}%`, width: `${pct(bp.q3) - pct(bp.q1)}%`, height: 22, background: 'rgba(56,217,192,0.2)', border: '1px solid rgba(56,217,192,0.5)', borderRadius: 3 }} />
      {/* median */}
      <div style={{ position: 'absolute', top: 6, left: `${pct(bp.median)}%`, width: 2, height: 26, background: 'var(--accent)' }} />
      {/* bio range markers */}
      {bio && <>
        <div style={{ position: 'absolute', top: 0, left: `${pct(bio[0])}%`, width: 1, height: 40, background: 'rgba(239,68,68,0.4)', borderLeft: '1px dashed rgba(239,68,68,0.6)' }} title={`Bio min: ${bio[0]}`} />
        <div style={{ position: 'absolute', top: 0, left: `${pct(bio[1])}%`, width: 1, height: 40, background: 'rgba(239,68,68,0.4)', borderLeft: '1px dashed rgba(239,68,68,0.6)' }} title={`Bio max: ${bio[1]}`} />
      </>}
      {/* outlier dots */}
      {(bp.outlier_points || []).slice(0, 30).map((v, i) => (
        <div key={i} style={{ position: 'absolute', top: 16, left: `${pct(v)}%`, width: 5, height: 5, borderRadius: '50%', background: 'var(--warn)', transform: 'translate(-50%, 0)' }} title={v} />
      ))}
    </div>
  );
}

export default function NumericalTab({ ns }) {
  if (!ns || !Object.keys(ns).length) {
    return <div className="card"><div className="card-title">Ringkasan Numerik</div><p style={{ color: 'var(--muted)' }}>Tiada kolum numerik ditemui.</p></div>;
  }
  return (
    <div className="card">
      <div className="card-title">Ringkasan Statistik Numerik</div>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 14, lineHeight: 1.7 }}>
        Statistik deskriptif bagi kolum numerik yang dipetakan (berat, tinggi, BMI, umur). Gunakan untuk mengesan outlier,
        nilai luar julat biologi, dan taburan data yang tidak normal.
      </p>
      {Object.entries(ns).map(([col, s]) => (
        <div key={col} style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--accent2)', marginBottom: 4 }}>
            {LABELS[col] || col}
            {s.bio_range && <span style={{ marginLeft: 10, fontSize: '0.65rem', color: 'var(--muted)' }}>Julat biologi: {s.bio_range[0]} – {s.bio_range[1]}</span>}
          </div>
          <MiniBoxPlot bp={s.boxplot} bio={s.bio_range} />
          <div className="num-stat-grid">
            {STAT_KEYS.map(([k, field]) => {
              const val = s[field];
              if (val === undefined || val === null) return null;
              const isOutlier = field.startsWith('outliers') || field === 'extreme_outliers_iqr';
              return (
                <div key={k} className="num-stat-cell">
                  <div className="num-stat-key">{k}</div>
                  <div className="num-stat-val" style={isOutlier && val > 0 ? { color: 'var(--warn)' } : {}}>{val}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
