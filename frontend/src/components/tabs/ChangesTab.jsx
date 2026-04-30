import React from 'react';

export default function ChangesTab({ changes }) {
  if (!changes?.length) return <div className="card"><div className="card-title">Perubahan Digunakan</div><p style={{ color: 'var(--muted)' }}>Tiada perubahan.</p></div>;
  return (
    <div className="card">
      <div className="card-title">Perubahan Digunakan ({changes.length})</div>
      {changes.map((c, i) => {
        const hasDiff = c.before && c.after && (Object.keys(c.before).length || Object.keys(c.after).length);
        return (
          <div key={i} className="change-item">
            <div className="change-header">
              <span className="change-tag">{c.action}</span>
              <div>
                <div className="change-desc">{c.description}</div>
                <div className="change-col">kolum: {c.column}{c.rows_affected != null ? ` - ${c.rows_affected} baris` : ''}</div>
              </div>
              {c.impact_pct != null && <span className="impact-badge">{c.impact_pct}% data</span>}
            </div>
            {hasDiff && (
              <div className="change-diff">
                <div className="change-before"><div className="diff-label">SEBELUM</div><div className="diff-val">{JSON.stringify(c.before, null, 1)}</div></div>
                <div className="change-after"><div className="diff-label">SELEPAS</div><div className="diff-val">{JSON.stringify(c.after, null, 1)}</div></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
