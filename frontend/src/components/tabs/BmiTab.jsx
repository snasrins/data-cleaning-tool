import React from 'react';
import StatCard from '../StatCard.jsx';

export default function BmiTab({ bmi }) {
  if (!bmi) return <div className="card"><div className="card-title">Konsistensi BMI</div><p style={{ color: 'var(--muted)' }}>Tiada data.</p></div>;
  if (!bmi.checked) {
    return <div className="card"><div className="card-title">Konsistensi BMI</div><p style={{ color: 'var(--muted)' }}>Tidak dapat disemak -- pastikan berat_kg, tinggi_cm dan bmi dipetakan.</p></div>;
  }
  const pct = bmi.pct_mismatch;
  const color = pct < 5 ? 'var(--success)' : pct < 20 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div className="card">
      <div className="card-title">Konsistensi BMI (Disemak Semula)</div>
      <div className="stats-grid">
        <StatCard val={bmi.n_checked} label="Rekod Disemak" />
        <StatCard val={bmi.n_mismatch} label="Tidak Konsisten" color={color} />
        <StatCard val={`${pct}%`} label="% Tidak Konsisten" color={color} />
        <StatCard val={`\u00B1${bmi.threshold_used}`} label="Ambang (unit BMI)" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className={`sev sev-${bmi.severity || 'low'}`}>{(bmi.severity || 'low').toUpperCase()}</span>
        <span className={`sev-score sev-score-${bmi.severity_score || 1}`}>{bmi.severity_score || 1}/5</span>
      </div>
      <div style={{ background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.18)', borderRadius: 7, padding: '11px 14px', fontSize: '0.78rem', color: '#f5d87a' }}>
        {bmi.note}
      </div>
    </div>
  );
}
