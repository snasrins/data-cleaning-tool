import React from 'react';

export default function Pagination({ current, total, onPage, disabled }) {
  if (total <= 1) return null;
  const pages = [];
  const W = 3;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - W && i <= current + W)) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return (
    <div className="pagination" style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
      <button className="page-btn" disabled={disabled || current === 1} onClick={() => onPage(current - 1)}>&#8249;</button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} className="page-info">...</span>
          : <button key={p} className={`page-btn ${p === current ? 'active' : ''}`} disabled={disabled} onClick={() => onPage(p)}>{p}</button>
      )}
      <button className="page-btn" disabled={disabled || current === total} onClick={() => onPage(current + 1)}>&#8250;</button>
      <span className="page-info">Halaman {current}/{total}</span>
    </div>
  );
}
