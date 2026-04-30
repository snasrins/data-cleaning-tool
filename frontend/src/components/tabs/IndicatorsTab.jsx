import React, { useState } from 'react';

const AGE_LABELS = { bawah_2_tahun: 'Bawah 2 Tahun (< 24 bulan)', bawah_5_tahun: 'Bawah 5 Tahun (< 60 bulan)' };
const IND_COLORS = { kurang_berat_badan: 'var(--accent)', bantut: 'var(--warn)', susut: 'var(--accent2)', obes_berlebihan: 'var(--danger)' };
const GEO_KEYS = [
  { key: 'by_negeri', label: 'Negeri' },
  { key: 'by_kawasan_bahagian', label: 'Kawasan / Bahagian (Sabah & Sarawak)' },
  { key: 'by_daerah', label: 'Daerah' },
  { key: 'by_negeri_jantina', label: 'Negeri x Jantina' },
  { key: 'by_negeri_pendapatan', label: 'Negeri x Pendapatan' },
  { key: 'by_tahun', label: 'Trend Tahunan' },
];

export default function IndicatorsTab({ ind }) {
  const [activeSubtabs, setActiveSubtabs] = useState({});

  if (!ind || !Object.keys(ind).length) {
    return <div className="card" style={{ color: 'var(--muted)' }}>Tiada indikator -- pastikan kolum status dipetakan.</div>;
  }

  const getSubtab = (uid) => activeSubtabs[uid];
  const setSubtab = (uid, key) => setActiveSubtabs((prev) => ({ ...prev, [uid]: key }));

  return (
    <>
      {Object.entries(ind).map(([ageKey, ageData]) => (
        <div key={ageKey} className="card">
          <div className="card-title">{AGE_LABELS[ageKey] || ageKey}</div>
          {Object.entries(ageData).map(([indKey, indData]) => {
            const color = IND_COLORS[indKey] || 'var(--accent)';
            const pct = indData.overall?.pct || 0;
            const n = indData.overall?.n_affected || 0;
            const total = indData.overall?.n_total || 0;
            const uid = `${ageKey}_${indKey}`.replace(/[^a-z0-9]/g, '_');
            const availGeos = GEO_KEYS.filter((g) => indData[g.key]?.length);
            const defaultGeo = availGeos[0]?.key;
            const activeGeo = getSubtab(uid) || defaultGeo;

            return (
              <div key={indKey} className="ind-group">
                <div className="ind-title">
                  <span style={{ width: 9, height: 9, background: color, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                  {indData.label}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>
                    {n}/{total} ({pct}%)
                  </span>
                </div>
                <div className="pct-bar-wrap" style={{ marginBottom: 14 }}>
                  <div className="pct-bar" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </div>
                <div className="subtabs">
                  {availGeos.map((g) => (
                    <div key={g.key} className={`subtab ${activeGeo === g.key ? 'active' : ''}`} onClick={() => setSubtab(uid, g.key)}>
                      {g.label}
                    </div>
                  ))}
                </div>
                {availGeos.map((geo) => {
                  if (geo.key !== activeGeo) return null;
                  const rows = indData[geo.key] || [];
                  const allKeys = Object.keys(rows[0] || {}).filter((k) => !['n_affected', 'n_total', 'pct'].includes(k));
                  return (
                    <div key={geo.key}>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              {allKeys.map((k) => <th key={k}>{k}</th>)}
                              <th>N Terjejas</th><th>N Jumlah</th><th>%</th><th style={{ width: 100 }}>Bar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, ri) => (
                              <tr key={ri}>
                                {allKeys.map((k) => <td key={k}>{row[k] ?? '--'}</td>)}
                                <td style={{ fontFamily: 'var(--mono)' }}>{row.n_affected}</td>
                                <td style={{ fontFamily: 'var(--mono)' }}>{row.n_total}</td>
                                <td style={{ fontFamily: 'var(--mono)' }}>{row.pct}%</td>
                                <td>
                                  <div className="pct-bar-wrap">
                                    <div className="pct-bar" style={{ width: `${Math.min(row.pct, 100)}%`, background: color }} />
                                  </div>
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
            );
          })}
        </div>
      ))}
    </>
  );
}
