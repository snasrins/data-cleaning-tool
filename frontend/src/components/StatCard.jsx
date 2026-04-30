import React from 'react';

export default function StatCard({ val, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-val" style={{ fontSize: '1.35rem', ...(color ? { color } : {}) }}>{val}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
