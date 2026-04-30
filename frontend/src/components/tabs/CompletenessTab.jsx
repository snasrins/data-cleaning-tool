import React from 'react';
import StatCard from '../StatCard.jsx';

export default function CompletenessTab({ dc }) {
  if (!dc) return <div className="card"><p style={{ color: 'var(--muted)' }}>Tiada maklumat kelengkapan.</p></div>;
  const pct = dc.pct_complete;
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div className="card">
      <div className="card-title">Kelengkapan Data</div>
      <div className="stats-grid">
        <StatCard val={`${pct}%`} label="Rekod Lengkap" color={color} />
        <StatCard val={dc.complete_cases?.toLocaleString()} label="Kes Lengkap" />
        <StatCard val={dc.missing_critical_rows?.toLocaleString()} label="Rekod Kritikal Hilang" color="var(--danger)" />
        <StatCard val={`${dc.pct_missing_critical}%`} label="% Rekod Lemah" />
      </div>
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 7, padding: 12, fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14 }}>
        <strong style={{ color: 'var(--warn)' }}>Medan Kritikal:</strong> {(dc.critical_fields_checked || []).join(', ') || '--'}
        <br /><span style={{ color: 'var(--accent2)', marginTop: 4, display: 'block' }}>{dc.note || ''}</span>
      </div>
      {dc.coverage_by_negeri?.length > 0 && (
        <>
          <div className="card-title" style={{ marginTop: 18 }}>Liputan Mengikut Negeri</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Negeri</th><th>N Jumlah</th><th>N Missing Kritikal</th><th>% Lengkap</th><th style={{ width: 110 }}>Bar</th></tr></thead>
              <tbody>
                {dc.coverage_by_negeri.map((r, i) => (
                  <tr key={i}>
                    <td>{r.negeri}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{r.n_total}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--danger)' }}>{r.n_missing}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{r.pct_complete}%</td>
                    <td><div className="pct-bar-wrap"><div className="pct-bar" style={{ width: `${r.pct_complete}%`, background: 'var(--success)' }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
