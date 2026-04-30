import React from 'react';

export default function QualityScore({ qs }) {
  if (!qs) return null;
  const { score, grade, label, breakdown } = qs;
  const circ = 2 * Math.PI * 42;
  const offset = circ * (1 - score / 100);
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  const gradientId = `score-gradient-${score}`;
  
  const BD_LABELS = {
    field_coverage:  'Liputan Medan',
    ic_validity:     'Ketepatan IC',
    missing_critical:'Medan Kritikal',
    duplicates:      'Duplikat',
    bmi_consistency: 'BMI Konsisten',
    spelling:        'Ejaan',
  };
  
  const BD_ICONS = {
    field_coverage:  '📊',
    ic_validity:     '🪪',
    missing_critical:'⚠️',
    duplicates:      '🔄',
    bmi_consistency: '📐',
    spelling:        '✏️',
  };

  return (
    <div className="quality-score-card">
      <div className="qs-header">
        <h3 className="qs-title">Skor Kualiti Data</h3>
        <span className="qs-badge" style={{ background: color }}>{label}</span>
      </div>
      
      <div className="qs-main">
        <div className="qs-ring-container">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.6" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Background track */}
            <circle 
              cx="60" cy="60" r="42" 
              fill="none" 
              stroke="rgba(0,0,0,0.05)" 
              strokeWidth="12" 
            />
            
            {/* Animated progress arc */}
            <circle 
              cx="60" cy="60" r="42" 
              fill="none" 
              stroke={`url(#${gradientId})`}
              strokeWidth="12"
              strokeDasharray={circ} 
              strokeDashoffset={offset} 
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              filter="url(#glow)"
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} 
            />
            
            {/* Center content */}
            <text x="60" y="52" textAnchor="middle" fontSize="28" fontWeight="700" fill={color}>
              {score}
            </text>
            <text x="60" y="70" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">
              Gred {grade}
            </text>
          </svg>
        </div>
        
        <div className="qs-breakdown">
          {breakdown && Object.entries(breakdown).map(([k, v]) => {
            const pct = (v.score / v.max) * 100;
            const itemColor = pct >= 85 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
            
            return (
              <div key={k} className="qs-item" title={v.note || v.unmapped?.join(', ') || ''}>
                <div className="qs-item-header">
                  <span className="qs-item-icon">{BD_ICONS[k] || '📌'}</span>
                  <span className="qs-item-label">{BD_LABELS[k] || k}</span>
                  <span className="qs-item-score" style={{ color: itemColor }}>
                    {v.score}/{v.max}
                  </span>
                </div>
                <div className="qs-item-bar">
                  <div 
                    className="qs-item-fill" 
                    style={{ 
                      width: `${pct}%`, 
                      background: `linear-gradient(90deg, ${itemColor}, ${itemColor}88)`
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="qs-footer">
        <span className="qs-footer-text">
          Berdasarkan: Liputan (20) • IC (15) • Kritikal (25) • Duplikat (20) • BMI (10) • Ejaan (10)
        </span>
      </div>
    </div>
  );
}
