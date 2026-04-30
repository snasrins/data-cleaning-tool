import React from 'react';
import StatCard from '../StatCard.jsx';

export default function DupTab({ dup }) {
  if (!dup) return <div className="card"><div className="card-title">Duplikat</div><p style={{ color: 'var(--muted)' }}>Tiada semakan duplikat.</p></div>;
  const col = dup.duplicate_rows > 0 ? 'var(--danger)' : 'var(--success)';
  return (
    <div className="card">
      <div className="card-title">Baris Duplikat</div>
      <div className="stats-grid">
        <StatCard val={dup.duplicate_rows} label="Duplikat Dijumpai" color={col} />
        <StatCard val={`${dup.pct_duplicate}%`} label="% Data" />
        <StatCard val={dup.before_count} label="Baris Asal" />
        <StatCard val={dup.after_dedup_count} label="Selepas Nyah-dup" color="var(--success)" />
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
        Semak pada: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{(dup.duplicate_check_columns || []).join(', ')}</span>
      </p>
    </div>
  );
}
