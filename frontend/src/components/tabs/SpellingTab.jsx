import React from 'react';

export default function SpellingTab({ sp }) {
  if (!sp || !Object.keys(sp).length) {
    return <div className="card"><div className="card-title">Ejaan & Normalisasi</div><p style={{ color: 'var(--success)' }}>Tiada isu ejaan</p></div>;
  }
  return (
    <div className="card">
      <div className="card-title">Isu Ejaan & Normalisasi</div>
      {Object.entries(sp).map(([col, issues]) => (
        <div key={col} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', color: 'var(--accent2)', marginBottom: 8 }}>{col}</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nilai Asal</th><th>Isu</th><th>Cadangan</th><th>Tahap</th><th>Skor</th></tr></thead>
              <tbody>
                {(Array.isArray(issues) ? issues : Object.entries(issues)).map((item, i) => {
                  const it = Array.isArray(item) && typeof item[0] === 'string'
                    ? { original: item[0], issue: JSON.stringify(item[1]), suggestion: null, severity: 'medium', severity_score: 2 }
                    : item;
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--warn)' }}>{it.original ?? ''}</td>
                      <td>{it.issue ?? ''}</td>
                      <td style={{ color: 'var(--success)' }}>{it.suggestion ?? '--'}</td>
                      <td><span className={`sev sev-${it.severity || 'medium'}`}>{(it.severity || 'medium').toUpperCase()}</span></td>
                      <td><span className={`sev-score sev-score-${it.severity_score || 2}`}>{it.severity_score || 2}/5</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
