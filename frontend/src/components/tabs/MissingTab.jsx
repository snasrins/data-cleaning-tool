import React, { useState } from 'react';

export default function MissingTab({ mv, missingRows }) {
  const [openRows, setOpenRows] = useState({});
  const [filter, setFilter] = useState('all'); // all | missing | complete
  const [showDetailedRows, setShowDetailedRows] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  if (!mv || !Object.keys(mv).length) {
    return <div className="card"><p style={{ padding: 16, color: 'var(--success)' }}>Tiada nilai hilang</p></div>;
  }

  const allEntries = Object.entries(mv).sort((a, b) => b[1].pct_missing - a[1].pct_missing);
  const sorted = filter === 'all' ? allEntries
    : filter === 'missing' ? allEntries.filter(([, info]) => info.n_missing > 0)
    : allEntries.filter(([, info]) => info.n_missing === 0);
  const toggleRow = (col) => setOpenRows((p) => ({ ...p, [col]: !p[col] }));

  const totalMissing = allEntries.reduce((s, [, i]) => s + i.n_missing, 0);
  const colsMissing = allEntries.filter(([, i]) => i.n_missing > 0).length;

  // Get rows for selected column
  const getRowsForColumn = (column) => {
    if (!missingRows || !Array.isArray(missingRows)) return [];
    return missingRows.filter(row => row.column === column);
  };

  const handleShowDetailedRows = (column) => {
    setSelectedColumn(column);
    setShowDetailedRows(true);
  };

  return (
    <>
      <div className="card">
        <div className="row-flex" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>Ringkasan Nilai Hilang</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'missing', 'complete'].map((f) => (
              <button key={f} className={`btn btn-secondary ${filter === f ? 'active' : ''}`}
                style={filter === f ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' } : {}}
                onClick={() => setFilter(f)}>
                {f === 'all' ? `Semua (${allEntries.length})` : f === 'missing' ? `Ada Null (${colsMissing})` : `Lengkap (${allEntries.length - colsMissing})`}
              </button>
            ))}
          </div>
        </div>
        <div className="stats-grid" style={{ marginBottom: 14 }}>
          <div className="stat-card"><div className="stat-val">{allEntries.length}</div><div className="stat-label">Jumlah Kolum</div></div>
          <div className="stat-card"><div className="stat-val" style={{ color: colsMissing > 0 ? 'var(--warn)' : 'var(--success)' }}>{colsMissing}</div><div className="stat-label">Kolum dgn Null</div></div>
          <div className="stat-card"><div className="stat-val" style={{ color: totalMissing > 0 ? 'var(--danger)' : 'var(--success)' }}>{totalMissing.toLocaleString()}</div><div className="stat-label">Jumlah Sel Null</div></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Kolum</th><th>N Hilang</th><th>%</th><th>Tahap</th><th>Skor</th><th style={{ width: 120 }}>Bar</th><th>Baris Null</th></tr>
            </thead>
            <tbody>
              {sorted.map(([col, info]) => {
                const nullIds = info.null_row_indices || [];
                const hasNull = nullIds.length > 0;
                const idStr = nullIds.join(', ') + (info.n_missing > 20 ? ` ... (+${info.n_missing - 20} lagi)` : '');
                const sev = info.severity || 'low';
                const barColor = sev === 'high' ? 'var(--danger)' : sev === 'medium' ? 'var(--warn)' : 'var(--success)';
                return (
                  <tr key={col} style={info.n_missing === 0 ? { opacity: 0.5 } : {}}>
                    <td>{col}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{info.n_missing}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{info.pct_missing}%</td>
                    <td><span className={`sev sev-${sev}`}>{sev.toUpperCase()}</span></td>
                    <td><span className={`sev-score sev-score-${info.severity_score || 1}`}>{info.severity_score || 1}/5</span></td>
                    <td>
                      <div className="pct-bar-wrap">
                        <div className="pct-bar" style={{ width: `${Math.min(info.pct_missing, 100)}%`, background: barColor }} />
                      </div>
                    </td>
                    <td>
                      {hasNull ? (
                        <>
                          <span className="null-rows-toggle" onClick={() => toggleRow(col)}>
                            Lihat baris {openRows[col] ? '\u25B4' : '\u25BE'}
                          </span>
                          {openRows[col] && <div className="null-rows-list open">{idStr}</div>}
                          {info.n_missing > 0 && missingRows && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ fontSize: '0.7rem', padding: '2px 8px', marginLeft: 8 }}
                              onClick={() => handleShowDetailedRows(col)}
                            >
                              View All ({info.n_missing})
                            </button>
                          )}
                        </>
                      ) : <span style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>--</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Missing Value Rows Table */}
      {showDetailedRows && selectedColumn && missingRows && (
        <div className="card" style={{ borderColor: 'rgba(240,92,107,0.2)' }}>
          <div className="row-flex" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>
              All Missing Value Rows — {selectedColumn}
              <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>
                ({getRowsForColumn(selectedColumn).length} rows shown, up to 1000)
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}
              onClick={() => setShowDetailedRows(false)}>
              Close
            </button>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
            These are the actual rows where the column "{selectedColumn}" has missing/null values.
            Use this to identify patterns in data entry issues.
          </p>
          <div className="table-wrap" style={{ maxHeight: 500, overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Row Index</th>
                  <th>Sheet</th>
                  {getRowsForColumn(selectedColumn)[0] && Object.keys(getRowsForColumn(selectedColumn)[0])
                    .filter(k => !['row_index', 'column', 'sheet_name'].includes(k))
                    .map(k => <th key={k}>{k}</th>)
                  }
                </tr>
              </thead>
              <tbody>
                {getRowsForColumn(selectedColumn).map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--mono)' }}>{row.row_index}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{row.sheet_name || '--'}</td>
                    {Object.keys(row)
                      .filter(k => !['row_index', 'column', 'sheet_name'].includes(k))
                      .map(k => (
                        <td key={k} style={{ fontSize: '0.72rem' }}>
                          {row[k] || <span style={{ color: 'var(--muted)' }}>--</span>}
                        </td>
                      ))
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
