import React from 'react';

const LABELS = { negeri: 'Negeri', daerah: 'Daerah', jantina: 'Jantina', pendapatan: 'Pendapatan', status_berat: 'Status Berat', status_tinggi: 'Status Tinggi', status_bmi: 'Status BMI' };

export default function CategoricalTab({ cs }) {
  if (!cs || !Object.keys(cs).length) {
    return <div className="card"><div className="card-title">Ringkasan Kategorikal</div><p style={{ color: 'var(--muted)' }}>Tiada kolum kategorikal ditemui.</p></div>;
  }
  return (
    <div className="card">
      <div className="card-title">Taburan Frekuensi Kategorikal</div>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 14, lineHeight: 1.7 }}>
        Taburan frekuensi bagi kolum kategorikal (negeri, jantina, pendapatan, status BMI/berat/tinggi). Gunakan untuk mengesan
        ketakseimbangan data, ejaan tidak piawaian, dan kategori tidak dijangka.
      </p>
      {Object.entries(cs).map(([col, s]) => {
        const top10 = Object.entries(s.pct || {}).slice(0, 10);
        return (
          <div key={col} style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--accent2)', marginBottom: 6 }}>
              {LABELS[col] || col} <span style={{ color: 'var(--muted)' }}>({s.unique} unik)</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nilai</th><th>Bilangan</th><th>%</th><th style={{ width: 120 }}>Bar</th></tr></thead>
                <tbody>
                  {top10.map(([val, pct]) => (
                    <tr key={val}>
                      <td>{val}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{s.counts[val] || 0}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{pct}%</td>
                      <td><div className="pct-bar-wrap"><div className="pct-bar" style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--accent2)' }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
