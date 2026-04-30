import React from 'react';

export default function DataTable({ rows }) {
  if (!rows?.length) return <p style={{ padding: 16, color: 'var(--muted)' }}>Tiada data</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const v = row[c];
                return v == null
                  ? <td key={c} className="null-cell">null</td>
                  : <td key={c} title={String(v)}>{String(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
