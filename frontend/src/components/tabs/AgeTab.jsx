import React from 'react';
import StatCard from '../StatCard.jsx';

export default function AgeTab({ age }) {
  if (!age?.mean_months) return <div className="card"><div className="card-title">Taburan Umur</div><p style={{ color: 'var(--muted)' }}>Tiada data umur (perlukan tarikh_lahir + tarikh_ukur).</p></div>;
  return (
    <div className="card">
      <div className="card-title">Taburan Umur</div>
      <div className="stats-grid">
        <StatCard val={age.min_months} label="Min Bulan" />
        <StatCard val={age.median_months ?? age.mean_months} label="Median Bulan" />
        <StatCard val={age.mean_months} label="Min Purata" />
        <StatCard val={age.max_months} label="Maks Bulan" />
        <StatCard val={age.under_2_years} label="Bawah 2 Tahun" color="var(--accent2)" />
        <StatCard val={age.under_5_years} label="Bawah 5 Tahun" color="var(--accent)" />
        <StatCard val={age.over_5_years} label=">= 5 Tahun" color="var(--warn)" />
        <StatCard val={age.missing_age || 0} label="Umur Hilang" color="var(--danger)" />
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Kumpulan Umur</th><th>Bilangan</th></tr></thead>
          <tbody>
            {Object.entries(age.age_group_counts || {}).map(([g, c]) => (
              <tr key={g}><td>{g}</td><td style={{ fontFamily: 'var(--mono)' }}>{c}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
