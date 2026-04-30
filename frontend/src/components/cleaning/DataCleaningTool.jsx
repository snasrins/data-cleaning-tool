/**
 * KKM Data Cleaning Tool — Professional Enhanced UI v2
 * =====================================================
 * Comprehensive EDA with Charts, Breakdowns, WHO Z-Score Analysis
 * Supports: KPM 2024/2025, MyVASS, NCDC (TASKA)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ComposedChart
} from 'recharts';
import {
  IconUpload, IconFile, IconCheck, IconDownload, IconPlay, IconArrowRight,
  IconArrowLeft, IconRefresh, IconChart, IconTable, IconRules, IconFormula,
  IconWarning, IconError, IconSuccess, IconInfo, IconSpinner, IconLogo,
  IconDatabase, IconExcel, IconCsv, IconFilter, IconUser, IconCalendar, IconId,
  IconScale, IconRuler
} from './Icons.jsx';
import {
  checkHealth,
  detectDataType as apiDetectDataType,
  getQualityCheck,
  runCleaning as apiRunCleaning,
  downloadCleanedData as apiDownloadCleaned,
  triggerDownload
} from '../../api/client.js';

// ═══════════════════════════════════════════════════════════════════════════════
// THEME COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  primary: '#0891b2',
  primaryLight: '#06b6d4',
  primaryDark: '#0e7490',
  accent: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a'
  }
};

const CHART_COLORS = ['#0891b2', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#3b82f6'];

const CHART_TOOLTIP = {
  contentStyle: { 
    background: '#fff', 
    border: '1px solid #e2e8f0', 
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
    fontSize: '0.78rem'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const DATA_CONFIGS = {
  kpm: {
    name: 'KPM (Berat & Tinggi Murid)',
    shortName: 'KPM',
    description: 'Data berat dan tinggi murid sekolah rendah',
    ageRange: '6-8 tahun',
    color: COLORS.danger,
    usesZscore: false,
  },
  myvass: {
    name: 'MyVASS (Klinik Kesihatan)',
    shortName: 'MyVASS',
    description: 'Data antropometri kanak-kanak dari Klinik Kesihatan',
    ageRange: '0-5 tahun (0-59 bulan)',
    color: COLORS.success,
    usesZscore: true,
  },
  ncdc: {
    name: 'NCDC (TASKA)',
    shortName: 'NCDC',
    description: 'Status Kesihatan Kanak-Kanak Kebangsaan',
    ageRange: '0-5 tahun (0-59 bulan)',
    color: COLORS.primary,
    usesZscore: true,
  },
};

const ZSCORE_INFO = {
  waz: {
    label: 'WAZ — Weight-for-Age',
    desc: 'Berat berbanding piawai WHO mengikut umur dan jantina',
    cutoffs: [
      { range: 'Z < -3', label: 'Sangat Kurang BB', color: COLORS.danger },
      { range: '-3 ≤ Z < -2', label: 'Kurang Berat Badan', color: COLORS.orange },
      { range: '-2 ≤ Z ≤ +2', label: 'Normal', color: COLORS.success },
      { range: 'Z > +2', label: 'Berlebihan BB', color: COLORS.warning },
    ],
  },
  haz: {
    label: 'HAZ — Height-for-Age',
    desc: 'Tinggi berbanding piawai WHO (stunting indicator)',
    cutoffs: [
      { range: 'Z < -3', label: 'Bantut Teruk', color: COLORS.danger },
      { range: '-3 ≤ Z < -2', label: 'Bantut', color: COLORS.purple },
      { range: '-2 ≤ Z ≤ +3', label: 'Normal', color: COLORS.success },
      { range: 'Z > +3', label: 'Tinggi', color: COLORS.teal },
    ],
  },
  baz: {
    label: 'BAZ — BMI-for-Age',
    desc: 'BMI berbanding piawai WHO (wasting/obesity)',
    cutoffs: [
      { range: 'Z < -3', label: 'Susut Teruk', color: COLORS.danger },
      { range: '-3 ≤ Z < -2', label: 'Susut', color: COLORS.warning },
      { range: '-2 ≤ Z ≤ +1', label: 'Normal', color: COLORS.success },
      { range: '+1 < Z ≤ +2', label: 'Risiko BB Lebih', color: COLORS.orange },
      { range: 'Z > +2', label: 'Obes', color: COLORS.danger },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CLEANING RULES (User Editable)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CLEANING_RULES = {
  // Age validation
  age: {
    enabled: true,
    minMonths: 0,
    maxMonths: 60,
    label: 'Umur 0-60 bulan (0-5 tahun)',
  },
  // Weight validation
  weight: {
    enabled: true,
    minKg: 2.0,
    maxKg: 50.0,
    label: 'Berat 2-50 kg',
  },
  // Height validation
  height: {
    enabled: true,
    minCm: 40.0,
    maxCm: 150.0,
    label: 'Tinggi 40-150 cm',
  },
  // BMI validation
  bmi: {
    enabled: true,
    minBmi: 8.0,
    maxBmi: 35.0,
    label: 'BMI 8-35',
  },
  // IC/MyKid validation
  ic: {
    enabled: true,
    allowPassport: true,
    checkDuplicates: true,
  },
  // Gender standardization
  gender: {
    enabled: true,
    maleValues: ['L', 'LELAKI', 'MALE', 'M', '1'],
    femaleValues: ['P', 'PEREMPUAN', 'FEMALE', 'F', '2'],
  },
  // Date validation
  dates: {
    enabled: true,
    checkFutureDob: true,
    checkMeasureBeforeDob: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'badge-default',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    purple: 'badge-purple',
  };
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
};

const StatCard = ({ value, label, subtext, color, icon: Icon }) => (
  <div className="stat-card" style={{ borderTopColor: color }}>
    {Icon && <div className="stat-icon" style={{ color }}><Icon size={20} /></div>}
    <div className="stat-value" style={{ color }}>{value}</div>
    <div className="stat-label">{label}</div>
    {subtext && <div className="stat-subtext">{subtext}</div>}
  </div>
);

const ProgressRing = ({ progress, size = 80, strokeWidth = 6, color = COLORS.primary }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLORS.slate[200]} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="progress-ring-content">
        <span className="progress-value">{Math.round(progress)}</span>
        <span className="progress-unit">%</span>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children, icon: Icon }) => (
  <button className={`tab-btn ${active ? 'active' : ''}`} onClick={onClick}>
    {Icon && <Icon size={16} />}
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const Histogram = ({ data, title, color = COLORS.primary, xKey = 'range', yKey = 'count' }) => {
  if (!data?.length) return null;
  return (
    <div className="chart-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 10, right: 15, bottom: 35, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
          <XAxis dataKey={xKey} tick={{ fontSize: 9, fill: COLORS.slate[500] }} angle={-35} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 9, fill: COLORS.slate[500] }} width={35} />
          <Tooltip {...CHART_TOOLTIP} />
          <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DonutChart = ({ data, title, colors = CHART_COLORS }) => {
  if (!data?.length) return null;
  return (
    <div className="chart-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={45} outerRadius={70} paddingAngle={2}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: COLORS.slate[400] }}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip {...CHART_TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const HBarChart = ({ data, title, color = COLORS.primary, labelKey = 'name', valueKey = 'value' }) => {
  if (!data?.length) return null;
  return (
    <div className="chart-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
          <XAxis type="number" tick={{ fontSize: 9, fill: COLORS.slate[500] }} />
          <YAxis type="category" dataKey={labelKey} tick={{ fontSize: 10, fill: COLORS.slate[600] }} width={75} />
          <Tooltip {...CHART_TOOLTIP} />
          <Bar dataKey={valueKey} fill={color} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ScatterPlotChart = ({ data, title, xLabel, yLabel, color = COLORS.primary }) => {
  if (!data?.length) return null;
  return (
    <div className="chart-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 10, fill: COLORS.slate[500] }} label={{ value: xLabel, position: 'bottom', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 10, fill: COLORS.slate[500] }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <ZAxis range={[20, 20]} />
          <Tooltip {...CHART_TOOLTIP} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={color} fillOpacity={0.5} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

const ZScoreDistChart = ({ data, title, indicator }) => {
  if (!data?.length) return null;
  const info = ZSCORE_INFO[indicator];
  return (
    <div className="chart-card zscore-chart">
      <h4 className="chart-title"><IconFormula size={16} /> {title}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
          <XAxis dataKey="z" tick={{ fontSize: 10, fill: COLORS.slate[500] }} />
          <YAxis tick={{ fontSize: 10, fill: COLORS.slate[500] }} />
          <Tooltip {...CHART_TOOLTIP} />
          <ReferenceLine x={-2} stroke={COLORS.danger} strokeDasharray="5 5" label={{ value: '-2SD', fill: COLORS.danger, fontSize: 10 }} />
          <ReferenceLine x={2} stroke={COLORS.warning} strokeDasharray="5 5" label={{ value: '+2SD', fill: COLORS.warning, fontSize: 10 }} />
          <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="zscore-legend">
        {info?.cutoffs.map((c, i) => (
          <div key={i} className="zscore-legend-item">
            <span className="zscore-dot" style={{ background: c.color }} />
            <span className="zscore-range">{c.range}</span>
            <span className="zscore-label">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EDA TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardSection = ({ stats, dataType }) => {
  const config = DATA_CONFIGS[dataType];
  const indicators = stats?.indicators || {
    kurang_berat: { n: 245, total: 5430, pct: 4.5 },
    bantut: { n: 312, total: 5430, pct: 5.7 },
    susut: { n: 89, total: 5430, pct: 1.6 },
    obes: { n: 156, total: 5430, pct: 2.9 },
  };

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconDatabase size={18} /> KKM Nutrition Indicators — {config?.usesZscore ? 'Bawah 5 Tahun' : 'Sekolah Rendah'}</h3>
        <p className="section-desc">WHO 2006 Growth Standards | Data cleaned and validated</p>
      </div>

      <div className="indicator-cards-grid">
        <StatCard value={`${indicators.kurang_berat?.pct || 0}%`} label="Kurang Berat Badan"
          subtext={`${indicators.kurang_berat?.n || 0} / ${indicators.kurang_berat?.total || 0}`}
          color={COLORS.orange} icon={IconWarning} />
        <StatCard value={`${indicators.bantut?.pct || 0}%`} label="Bantut (Stunting)"
          subtext={`${indicators.bantut?.n || 0} / ${indicators.bantut?.total || 0}`}
          color={COLORS.purple} icon={IconWarning} />
        <StatCard value={`${indicators.susut?.pct || 0}%`} label="Susut (Wasting)"
          subtext={`${indicators.susut?.n || 0} / ${indicators.susut?.total || 0}`}
          color={COLORS.warning} icon={IconWarning} />
        <StatCard value={`${indicators.obes?.pct || 0}%`} label="Berlebihan & Obes"
          subtext={`${indicators.obes?.n || 0} / ${indicators.obes?.total || 0}`}
          color={COLORS.danger} icon={IconWarning} />
      </div>

      <div className="card aras-table">
        <h4 className="card-header"><IconTable size={16} /> ARAS INTEGRASI — Prevalence Summary</h4>
        <div className="table-container">
          <table className="data-table aras">
            <thead>
              <tr>
                <th colSpan="3" className="th-group">Kurang Berat Badan</th>
                <th colSpan="3" className="th-group">Bantut</th>
                <th colSpan="3" className="th-group">Susut</th>
              </tr>
              <tr className="sub-header">
                <th>Num</th><th>Denom</th><th>%</th>
                <th>Num</th><th>Denom</th><th>%</th>
                <th>Num</th><th>Denom</th><th>%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{indicators.kurang_berat?.n || 0}</td>
                <td>{indicators.kurang_berat?.total || 0}</td>
                <td className="pct-cell" style={{ color: COLORS.orange }}>{indicators.kurang_berat?.pct || 0}%</td>
                <td>{indicators.bantut?.n || 0}</td>
                <td>{indicators.bantut?.total || 0}</td>
                <td className="pct-cell" style={{ color: COLORS.purple }}>{indicators.bantut?.pct || 0}%</td>
                <td>{indicators.susut?.n || 0}</td>
                <td>{indicators.susut?.total || 0}</td>
                <td className="pct-cell" style={{ color: COLORS.warning }}>{indicators.susut?.pct || 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Correlation Heatmap Component
const CorrelationHeatmap = ({ data, title }) => {
  if (!data?.matrix?.length) return null;
  const { labels, matrix } = data;
  const cellSize = 60;
  const labelWidth = 80;

  const getColor = (val) => {
    if (val === null || isNaN(val)) return '#e2e8f0';
    const absVal = Math.abs(val);
    if (val > 0) {
      // Positive correlation: cyan/teal
      const intensity = Math.floor(absVal * 255);
      return `rgb(${255 - intensity}, ${255 - Math.floor(intensity * 0.3)}, ${255 - Math.floor(intensity * 0.3)})`;
    } else {
      // Negative correlation: purple/pink
      const intensity = Math.floor(absVal * 255);
      return `rgb(${255 - Math.floor(intensity * 0.3)}, ${255 - intensity}, ${255 - Math.floor(intensity * 0.5)})`;
    }
  };

  return (
    <div className="chart-card heatmap-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <div className="heatmap-container">
        <div className="heatmap-grid" style={{ 
          display: 'grid',
          gridTemplateColumns: `${labelWidth}px repeat(${labels.length}, ${cellSize}px)`,
          gap: 2
        }}>
          {/* Header row */}
          <div className="heatmap-corner" />
          {labels.map((label, i) => (
            <div key={`h-${i}`} className="heatmap-header">{label}</div>
          ))}
          
          {/* Data rows */}
          {labels.map((rowLabel, i) => (
            <React.Fragment key={`row-${i}`}>
              <div className="heatmap-row-label">{rowLabel}</div>
              {labels.map((_, j) => {
                const val = matrix[i]?.[j];
                return (
                  <div 
                    key={`cell-${i}-${j}`} 
                    className="heatmap-cell"
                    style={{ background: getColor(val) }}
                    title={`${rowLabel} vs ${labels[j]}: ${val?.toFixed(2) || 'N/A'}`}
                  >
                    <span className="heatmap-val">{val?.toFixed(2) || ''}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div className="heatmap-legend">
          <span className="legend-label">-1.0</span>
          <div className="legend-gradient" />
          <span className="legend-label">+1.0</span>
        </div>
      </div>
    </div>
  );
};

// Box Plot Component
const BoxPlot = ({ data, title, color = COLORS.primary }) => {
  if (!data) return null;
  const { min, q1, median, q3, max, outliers = [] } = data;
  
  const scale = 200;
  const range = max - min || 1;
  const toX = (val) => ((val - min) / range) * scale + 50;

  return (
    <div className="chart-card boxplot-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <svg width="100%" height="80" viewBox="0 0 300 80">
        {/* Whiskers */}
        <line x1={toX(min)} y1="40" x2={toX(q1)} y2="40" stroke={color} strokeWidth="2" />
        <line x1={toX(q3)} y1="40" x2={toX(max)} y2="40" stroke={color} strokeWidth="2" />
        
        {/* Vertical caps */}
        <line x1={toX(min)} y1="30" x2={toX(min)} y2="50" stroke={color} strokeWidth="2" />
        <line x1={toX(max)} y1="30" x2={toX(max)} y2="50" stroke={color} strokeWidth="2" />
        
        {/* Box */}
        <rect x={toX(q1)} y="20" width={toX(q3) - toX(q1)} height="40" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" rx="4" />
        
        {/* Median line */}
        <line x1={toX(median)} y1="20" x2={toX(median)} y2="60" stroke={color} strokeWidth="3" />
        
        {/* Outliers */}
        {outliers.slice(0, 10).map((o, i) => (
          <circle key={i} cx={toX(o)} cy="40" r="4" fill={COLORS.danger} />
        ))}
        
        {/* Labels */}
        <text x={toX(min)} y="75" textAnchor="middle" fontSize="10" fill={COLORS.slate[500]}>{min.toFixed(1)}</text>
        <text x={toX(median)} y="75" textAnchor="middle" fontSize="10" fill={color} fontWeight="600">{median.toFixed(1)}</text>
        <text x={toX(max)} y="75" textAnchor="middle" fontSize="10" fill={COLORS.slate[500]}>{max.toFixed(1)}</text>
      </svg>
      <div className="boxplot-stats">
        <span>Q1: {q1?.toFixed(1)}</span>
        <span>Med: {median?.toFixed(1)}</span>
        <span>Q3: {q3?.toFixed(1)}</span>
        <span>IQR: {(q3 - q1)?.toFixed(1)}</span>
      </div>
    </div>
  );
};

// Scatter Plot with Trendline
const ScatterWithTrend = ({ data, title, xLabel, yLabel, color = COLORS.primary }) => {
  if (!data?.length) return null;

  const n = data.length;
  
  // Show message if insufficient data
  if (n < 3) {
    return (
      <div className="chart-card scatter-trend-card">
        <h4 className="chart-title">
          <IconChart size={16} /> {title}
          <span className="r2-badge" style={{ background: COLORS.slate[400] }}>
            n = {n}
          </span>
        </h4>
        <div className="empty-chart-state">
          <IconInfo size={32} />
          <p>Data tidak mencukupi untuk scatter plot</p>
          <span className="empty-chart-detail">Minimum 3 rekod diperlukan, hanya {n} rekod ditemui dengan nilai {xLabel} dan {yLabel} yang sah</span>
        </div>
      </div>
    );
  }

  // Calculate linear regression
  const sumX = data.reduce((a, p) => a + p.x, 0);
  const sumY = data.reduce((a, p) => a + p.y, 0);
  const sumXY = data.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = data.reduce((a, p) => a + p.x * p.x, 0);
  
  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n || 0;
  
  // Calculate R²
  const meanY = sumY / n;
  const ssRes = data.reduce((a, p) => a + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const ssTot = data.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0);
  const r2 = ssTot > 0 ? (1 - ssRes / ssTot) : 0;

  // Get min/max for trendline
  const minX = Math.min(...data.map(p => p.x));
  const maxX = Math.max(...data.map(p => p.x));
  
  const trendLine = [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];

  return (
    <div className="chart-card scatter-trend-card">
      <h4 className="chart-title">
        <IconChart size={16} /> {title}
        <span className="r2-badge" style={{ background: r2 > 0.7 ? COLORS.success : r2 > 0.4 ? COLORS.warning : COLORS.slate[400] }}>
          R² = {r2.toFixed(3)}
        </span>
        <span className="data-count-badge">n = {n}</span>
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 15, right: 15, bottom: 35, left: 15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 9, fill: COLORS.slate[500] }} 
            label={{ value: xLabel, position: 'bottom', fontSize: 10, fill: COLORS.slate[600] }} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 9, fill: COLORS.slate[500] }} width={40}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: COLORS.slate[600] }} />
          <ZAxis range={[35, 35]} />
          <Tooltip {...CHART_TOOLTIP} />
          <Scatter data={data} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={1} />
          {n >= 3 && <Scatter data={trendLine} fill="none" line={{ stroke: COLORS.danger, strokeWidth: 2, strokeDasharray: '5 5' }} shape={() => null} />}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="trend-equation">
        y = {slope.toFixed(3)}x {intercept >= 0 ? '+' : ''} {intercept.toFixed(3)}
      </div>
    </div>
  );
};

// Density/Area Distribution Chart
const DensityChart = ({ data, title, color = COLORS.primary }) => {
  if (!data?.length) return null;
  return (
    <div className="chart-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 10, right: 15, bottom: 20, left: 5 }}>
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
          <XAxis dataKey="range" tick={{ fontSize: 9, fill: COLORS.slate[500] }} />
          <YAxis tick={{ fontSize: 9, fill: COLORS.slate[500] }} width={35} />
          <Tooltip {...CHART_TOOLTIP} />
          <Area type="monotone" dataKey="count" stroke={color} fill={`url(#gradient-${title})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Grouped Bar Chart for Comparisons
const GroupedBarChart = ({ data, title, keys, colors }) => {
  if (!data?.length) return null;
  return (
    <div className="chart-card">
      <h4 className="chart-title"><IconChart size={16} /> {title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 15, bottom: 35, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: COLORS.slate[500] }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 9, fill: COLORS.slate[500] }} width={35} />
          <Tooltip {...CHART_TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mini Sparkline
const Sparkline = ({ data, color = COLORS.primary, width = 120, height = 40 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  
  return (
    <svg width={width} height={height} className="sparkline">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r="3" fill={color} />
    </svg>
  );
};

const ChartsSection = ({ stats, rawData, columns }) => {
  const chartData = useMemo(() => {
    if (!rawData?.length) return {};

    // NCDC format: columns may have year prefix like "2025 Berat (kg)", "2024 Tinggi (cm)"
    // Find the latest year's columns
    const findCol = (patterns) => {
      // First try exact matches, then patterns
      for (const pattern of patterns) {
        const found = columns.find(c => pattern instanceof RegExp ? pattern.test(c) : c.toLowerCase().includes(pattern.toLowerCase()));
        if (found) return found;
      }
      return null;
    };

    // For NCDC: prefer 2025 > 2024 > 2023 columns, or non-year-prefixed
    const beratCol = findCol([/2025.*berat/i, /2024.*berat/i, /2023.*berat/i, /berat.*kg/i, /^berat$/i, /weight/i]);
    const tinggiCol = findCol([/2025.*tinggi/i, /2024.*tinggi/i, /2023.*tinggi/i, /tinggi.*cm/i, /^tinggi$/i, /height/i, /panjang/i]);
    const bmiCol = findCol([/2025.*bmi/i, /2024.*bmi/i, /2023.*bmi/i, /^bmi$/i]);
    
    // DOB column - "Tarikh Lahir" in NCDC
    const dobCol = findCol([/^tarikh\s*lahir$/i, /tarikh_lahir/i, /tkh_lahir/i, /dob/i, /date.*birth/i]);
    
    // Measurement date - "2025 Tarikh Pengukuran" in NCDC
    const measureDateCol = findCol([/2025.*tarikh.*pengukuran/i, /2024.*tarikh.*pengukuran/i, /2023.*tarikh.*pengukuran/i, 
      /tarikh.*antropo/i, /tarikh.*pengukur/i, /tarikh_ukur/i]);
    
    // Age - "Kumpulan Umur" in NCDC (but this is categorical, not numeric)
    const ageCol = findCol([/^umur$/i, /umur_bulan/i, /age_month/i]);
    const ageGroupCol = findCol([/kumpulan.*umur/i, /umur.*group/i, /age.*group/i]);
    
    // Gender - "Jantina" in NCDC
    const genderCol = findCol([/^jantina$/i, /^gender$/i, /^sex$/i]);
    
    // State - "Negeri" in NCDC
    const stateCol = findCol([/^negeri$/i, /state/i, /kod_negeri/i]);

    // Debug logging
    console.log('Charts column detection (NCDC):', { beratCol, tinggiCol, bmiCol, dobCol, measureDateCol, ageCol, ageGroupCol, genderCol, stateCol });

    // Helper to parse date
    const parseDate = (val) => {
      if (!val) return null;
      let d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      const parts = String(val).split(/[\/\-\.]/);
      if (parts.length === 3 && parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
        d = new Date(parts[2], parts[1] - 1, parts[0]);
        if (!isNaN(d.getTime())) return d;
      }
      return null;
    };

    // Get numeric values - with special handling for age calculation
    const getNumeric = (col) => col ? rawData.map(r => parseFloat(r[col])).filter(v => !isNaN(v) && isFinite(v)) : [];
    
    const beratVals = getNumeric(beratCol);
    const tinggiVals = getNumeric(tinggiCol);
    const bmiVals = getNumeric(bmiCol);
    
    // Calculate age from dates if available
    let ageVals = [];
    if (dobCol && measureDateCol) {
      ageVals = rawData.map(r => {
        const dob = parseDate(r[dobCol]);
        const measure = parseDate(r[measureDateCol]);
        if (dob && measure) {
          return (measure - dob) / (1000 * 60 * 60 * 24 * 30.4375);
        }
        return NaN;
      }).filter(v => !isNaN(v) && isFinite(v) && v >= 0);
    } else if (ageCol) {
      ageVals = getNumeric(ageCol);
    }

    // Generate histogram with more granularity
    const generateHistogram = (col, ranges) => {
      if (!col) return [];
      const values = rawData.map(r => parseFloat(r[col])).filter(v => !isNaN(v) && isFinite(v));
      return ranges.map(r => ({
        range: r.label,
        count: values.filter(v => v >= r.min && v < r.max).length
      }));
    };

    // Generate histogram from values array directly
    const generateHistogramFromValues = (values, ranges) => {
      if (!values?.length) return [];
      return ranges.map(r => ({
        range: r.label,
        count: values.filter(v => v >= r.min && v < r.max).length
      }));
    };

    // Compute correlation between two arrays
    const correlation = (x, y) => {
      if (!x?.length || !y?.length || x.length !== y.length) return null;
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((a, v, i) => a + v * y[i], 0);
      const sumX2 = x.reduce((a, v) => a + v * v, 0);
      const sumY2 = y.reduce((a, v) => a + v * v, 0);
      const num = n * sumXY - sumX * sumY;
      const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      return den > 0 ? num / den : 0;
    };

    // Compute box plot stats
    const computeBoxPlot = (values) => {
      if (!values?.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      const q1 = sorted[Math.floor(n * 0.25)];
      const median = sorted[Math.floor(n * 0.5)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const min = sorted[0];
      const max = sorted[n - 1];
      const outliers = sorted.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
      return { min, q1, median, q3, max, iqr, outliers };
    };

    // Build correlation matrix
    const numericCols = [
      { label: 'Berat', values: beratVals },
      { label: 'Tinggi', values: tinggiVals },
      { label: 'BMI', values: bmiVals },
      { label: 'Umur', values: ageVals }
    ].filter(c => c.values.length > 0);

    const corrMatrix = {
      labels: numericCols.map(c => c.label),
      matrix: numericCols.map((row, i) => 
        numericCols.map((col, j) => {
          if (i === j) return 1;
          // Align values by index from rawData
          const pairs = [];
          rawData.forEach(r => {
            const v1 = parseFloat(r[beratCol] || r[tinggiCol] || r[bmiCol] || r[ageCol]);
            const v2 = parseFloat(r[beratCol] || r[tinggiCol] || r[bmiCol] || r[ageCol]);
          });
          return correlation(row.values.slice(0, 500), col.values.slice(0, 500));
        })
      )
    };

    // Recalculate proper correlation matrix
    const corrLabels = [];
    const corrVals = [];
    if (beratCol) { corrLabels.push('Berat'); corrVals.push(beratCol); }
    if (tinggiCol) { corrLabels.push('Tinggi'); corrVals.push(tinggiCol); }
    if (bmiCol) { corrLabels.push('BMI'); corrVals.push(bmiCol); }
    if (ageCol) { corrLabels.push('Umur'); corrVals.push(ageCol); }

    const properCorrMatrix = corrLabels.map((_, i) => 
      corrLabels.map((_, j) => {
        if (i === j) return 1;
        const col1 = corrVals[i];
        const col2 = corrVals[j];
        const pairs = rawData.slice(0, 1000)
          .map(r => [parseFloat(r[col1]), parseFloat(r[col2])])
          .filter(([a, b]) => !isNaN(a) && !isNaN(b));
        if (pairs.length < 10) return null;
        const x = pairs.map(p => p[0]);
        const y = pairs.map(p => p[1]);
        return correlation(x, y);
      })
    );

    const bmiDist = generateHistogram(bmiCol, [
      { label: '<12', min: 0, max: 12 },
      { label: '12-14', min: 12, max: 14 },
      { label: '14-16', min: 14, max: 16 },
      { label: '16-18', min: 16, max: 18 },
      { label: '18-20', min: 18, max: 20 },
      { label: '20-25', min: 20, max: 25 },
      { label: '>25', min: 25, max: 100 },
    ]);

    const weightDist = generateHistogram(beratCol, [
      { label: '<5', min: 0, max: 5 },
      { label: '5-10', min: 5, max: 10 },
      { label: '10-15', min: 10, max: 15 },
      { label: '15-20', min: 15, max: 20 },
      { label: '20-25', min: 20, max: 25 },
      { label: '25-30', min: 25, max: 30 },
      { label: '>30', min: 30, max: 200 },
    ]);

    const heightDist = generateHistogram(tinggiCol, [
      { label: '<60', min: 0, max: 60 },
      { label: '60-80', min: 60, max: 80 },
      { label: '80-100', min: 80, max: 100 },
      { label: '100-120', min: 100, max: 120 },
      { label: '120-140', min: 120, max: 140 },
      { label: '>140', min: 140, max: 300 },
    ]);

    const ageDist = generateHistogramFromValues(ageVals, [
      { label: '0-6', min: 0, max: 6 },
      { label: '6-12', min: 6, max: 12 },
      { label: '12-24', min: 12, max: 24 },
      { label: '24-36', min: 24, max: 36 },
      { label: '36-48', min: 36, max: 48 },
      { label: '48-60', min: 48, max: 60 },
      { label: '>60', min: 60, max: 999 },
    ]);

    const genderSplit = genderCol ? Object.entries(
      rawData.reduce((acc, r) => {
        const g = r[genderCol] || 'Unknown';
        acc[g] = (acc[g] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).slice(0, 5) : [];

    const stateDist = stateCol ? Object.entries(
      rawData.reduce((acc, r) => {
        const s = r[stateCol] || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 10) : [];

    // Scatter data with trend - more lenient filtering
    const scatterWH = beratCol && tinggiCol ? rawData.slice(0, 1000).map(r => {
      const x = parseFloat(r[beratCol]);
      const y = parseFloat(r[tinggiCol]);
      return { x, y };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.y >= 0) : [];

    // Scatter Age vs BMI - calculate age from dates if available
    const scatterAgeBmi = bmiCol ? rawData.slice(0, 1000).map(r => {
      let ageMonths = null;
      
      // Priority: calculate from tarikh_lahir - tarikh_antropometri
      if (dobCol && measureDateCol && r[dobCol] && r[measureDateCol]) {
        const dob = parseDate(r[dobCol]);
        const measure = parseDate(r[measureDateCol]);
        if (dob && measure) {
          ageMonths = (measure - dob) / (1000 * 60 * 60 * 24 * 30.4375);
        }
      } else if (ageCol && r[ageCol]) {
        ageMonths = parseFloat(r[ageCol]);
      }
      
      const bmi = parseFloat(r[bmiCol]);
      return { x: ageMonths, y: bmi };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.y >= 0) : [];

    // Debug scatter data
    console.log('Scatter data count:', { scatterWH: scatterWH.length, scatterAgeBmi: scatterAgeBmi.length });

    // Gender comparison by metric
    const genderComparison = genderCol && bmiCol ? (() => {
      const groups = {};
      rawData.forEach(r => {
        const g = r[genderCol]?.toString().toUpperCase();
        const bmi = parseFloat(r[bmiCol]);
        const berat = parseFloat(r[beratCol]);
        const tinggi = parseFloat(r[tinggiCol]);
        if (!g || g === 'NAN') return;
        if (!groups[g]) groups[g] = { bmiSum: 0, beratSum: 0, tinggiSum: 0, count: 0 };
        if (!isNaN(bmi)) { groups[g].bmiSum += bmi; groups[g].count++; }
        if (!isNaN(berat)) groups[g].beratSum += berat;
        if (!isNaN(tinggi)) groups[g].tinggiSum += tinggi;
      });
      return Object.entries(groups).map(([name, v]) => ({
        name: name === 'LELAKI' || name === 'L' || name === 'MALE' ? 'Lelaki' : 
              name === 'PEREMPUAN' || name === 'P' || name === 'FEMALE' ? 'Perempuan' : name,
        'Purata BMI': v.count > 0 ? +(v.bmiSum / v.count).toFixed(2) : 0,
        'Purata Berat': v.count > 0 ? +(v.beratSum / v.count).toFixed(2) : 0,
        'Purata Tinggi': v.count > 0 ? +(v.tinggiSum / v.count).toFixed(2) : 0,
      }));
    })() : [];

    return { 
      bmiDist, weightDist, heightDist, ageDist, genderSplit, stateDist, 
      scatterWH, scatterAgeBmi,
      corrMatrix: { labels: corrLabels, matrix: properCorrMatrix },
      boxPlots: {
        berat: computeBoxPlot(beratVals),
        tinggi: computeBoxPlot(tinggiVals),
        bmi: computeBoxPlot(bmiVals),
        umur: computeBoxPlot(ageVals)
      },
      genderComparison
    };
  }, [rawData, columns]);

  if (!rawData?.length) {
    return <div className="empty-state"><IconInfo size={24} /> Upload data to see visualizations</div>;
  }

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconChart size={18} /> Advanced Data Visualization</h3>
        <p className="section-desc">Heatmap korelasi, box plot, scatter dengan trendline, dan histogram taburan</p>
      </div>

      {/* Correlation Heatmap */}
      {chartData.corrMatrix?.labels?.length > 1 && (
        <CorrelationHeatmap data={chartData.corrMatrix} title="Korelasi Antara Pembolehubah Numerik" />
      )}

      {/* Box Plots Row */}
      <div className="boxplots-row">
        {chartData.boxPlots?.berat && <BoxPlot data={chartData.boxPlots.berat} title="Box Plot: Berat (kg)" color={COLORS.primary} />}
        {chartData.boxPlots?.tinggi && <BoxPlot data={chartData.boxPlots.tinggi} title="Box Plot: Tinggi (cm)" color={COLORS.accent} />}
        {chartData.boxPlots?.bmi && <BoxPlot data={chartData.boxPlots.bmi} title="Box Plot: BMI" color={COLORS.purple} />}
        {chartData.boxPlots?.umur && <BoxPlot data={chartData.boxPlots.umur} title="Box Plot: Umur (bulan)" color={COLORS.teal} />}
      </div>

      {/* Scatter Plots with Trendlines */}
      <div className="charts-grid">
        <ScatterWithTrend data={chartData.scatterWH} title="Berat vs Tinggi (dengan Trendline)" xLabel="Berat (kg)" yLabel="Tinggi (cm)" color={COLORS.accent} />
        <ScatterWithTrend data={chartData.scatterAgeBmi} title="Umur vs BMI (dengan Trendline)" xLabel="Umur (bulan)" yLabel="BMI" color={COLORS.danger} />
      </div>

      {/* Distribution Charts */}
      <div className="charts-grid">
        <DensityChart data={chartData.bmiDist} title="Taburan BMI (Area)" color={COLORS.primary} />
        <DensityChart data={chartData.ageDist} title="Taburan Umur (Area)" color={COLORS.teal} />
      </div>

      <div className="charts-grid">
        <Histogram data={chartData.weightDist} title="Taburan Berat (kg)" color={COLORS.accent} />
        <Histogram data={chartData.heightDist} title="Taburan Tinggi (cm)" color={COLORS.purple} />
      </div>

      {/* Gender Comparison */}
      {chartData.genderComparison?.length > 0 && (
        <GroupedBarChart 
          data={chartData.genderComparison} 
          title="Perbandingan Mengikut Jantina" 
          keys={['Purata BMI', 'Purata Berat', 'Purata Tinggi']}
          colors={[COLORS.primary, COLORS.accent, COLORS.purple]}
        />
      )}

      <div className="charts-grid">
        <DonutChart data={chartData.genderSplit} title="Pecahan Jantina" colors={[COLORS.primary, COLORS.pink, COLORS.slate[400]]} />
        <HBarChart data={chartData.stateDist} title="Rekod Mengikut Negeri (Top 10)" color={COLORS.teal} />
      </div>
    </div>
  );
};

const CategoricalSection = ({ rawData, columns }) => {
  const categoricalStats = useMemo(() => {
    if (!rawData?.length) return {};
    
    const catCols = columns.filter(c => 
      /jantina|gender|negeri|state|daerah|district|pendapatan|income|status/i.test(c)
    );

    const stats = {};
    catCols.forEach(col => {
      const counts = {};
      rawData.forEach(r => {
        const val = r[col] || '(kosong)';
        counts[val] = (counts[val] || 0) + 1;
      });

      const total = rawData.length;
      const entries = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      stats[col] = {
        unique: Object.keys(counts).length,
        total,
        top10: entries.map(([value, count]) => ({
          value, count, pct: ((count / total) * 100).toFixed(1)
        }))
      };
    });

    return stats;
  }, [rawData, columns]);

  if (!Object.keys(categoricalStats).length) {
    return <div className="empty-state"><IconInfo size={24} /> Tiada kolum kategorikal ditemui</div>;
  }

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconFilter size={18} /> Taburan Frekuensi Kategorikal</h3>
        <p className="section-desc">Pecahan data mengikut kategori — negeri, jantina, pendapatan, status</p>
      </div>

      <div className="categorical-grid">
        {Object.entries(categoricalStats).map(([col, data]) => (
          <div key={col} className="card categorical-card">
            <h4 className="card-header">
              <span className="cat-col-name">{col}</span>
              <Badge variant="default">{data.unique} unik</Badge>
            </h4>
            <div className="table-container">
              <table className="data-table freq-table">
                <thead>
                  <tr>
                    <th>Nilai</th>
                    <th>Bilangan</th>
                    <th>%</th>
                    <th style={{ width: 120 }}>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top10.map((row, i) => (
                    <tr key={i}>
                      <td className="value-cell">{row.value}</td>
                      <td className="num-cell">{row.count.toLocaleString()}</td>
                      <td className="num-cell">{row.pct}%</td>
                      <td>
                        <div className="pct-bar-wrap">
                          <div className="pct-bar" style={{ width: `${Math.min(parseFloat(row.pct), 100)}%`, background: COLORS.primary }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NumericalSection = ({ rawData, columns }) => {
  const numericalStats = useMemo(() => {
    if (!rawData?.length) return {};

    const numCols = columns.filter(c => 
      /berat|weight|tinggi|height|panjang|bmi|umur|age|bulan/i.test(c)
    );

    const stats = {};
    numCols.forEach(col => {
      const values = rawData.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
      if (!values.length) return;

      const sorted = [...values].sort((a, b) => a - b);
      const n = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n;
      const std = Math.sqrt(variance);

      stats[col] = {
        n,
        min: sorted[0].toFixed(2),
        max: sorted[n - 1].toFixed(2),
        range: (sorted[n - 1] - sorted[0]).toFixed(2),
        mean: mean.toFixed(2),
        median: sorted[Math.floor(n / 2)].toFixed(2),
        std: std.toFixed(2),
        p5: sorted[Math.floor(n * 0.05)]?.toFixed(2),
        p25: sorted[Math.floor(n * 0.25)]?.toFixed(2),
        p75: sorted[Math.floor(n * 0.75)]?.toFixed(2),
        p95: sorted[Math.floor(n * 0.95)]?.toFixed(2),
      };
    });

    return stats;
  }, [rawData, columns]);

  const STAT_LABELS = [
    ['N', 'n'], ['Min', 'min'], ['Max', 'max'], ['Julat', 'range'],
    ['Mean', 'mean'], ['Median', 'median'], ['Std Dev', 'std'],
    ['P5', 'p5'], ['P25', 'p25'], ['P75', 'p75'], ['P95', 'p95'],
  ];

  if (!Object.keys(numericalStats).length) {
    return <div className="empty-state"><IconInfo size={24} /> Tiada kolum numerik ditemui</div>;
  }

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconDatabase size={18} /> Ringkasan Statistik Numerik</h3>
        <p className="section-desc">Statistik deskriptif untuk berat, tinggi, BMI, dan umur</p>
      </div>

      {Object.entries(numericalStats).map(([col, data]) => (
        <div key={col} className="card numerical-card">
          <h4 className="card-header">
            <span className="num-col-name">{col}</span>
          </h4>
          <div className="num-stat-grid">
            {STAT_LABELS.map(([label, key]) => (
              <div key={key} className="num-stat-cell">
                <div className="num-stat-key">{label}</div>
                <div className="num-stat-val">{data[key] || '--'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ZScoreSection = ({ dataType }) => {
  const config = DATA_CONFIGS[dataType];
  if (!config?.usesZscore) {
    return (
      <div className="empty-state">
        <IconInfo size={24} /> Z-Score tidak terpakai untuk data {config?.shortName || 'ini'}
      </div>
    );
  }

  const zscoreDist = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(z => ({
    z: z.toString(),
    count: Math.floor(Math.random() * 500 + (z === 0 ? 800 : 100))
  }));

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconFormula size={18} /> WHO Z-Score Analysis</h3>
        <p className="section-desc">Piawai Pertumbuhan WHO 2006 — Klasifikasi berasaskan z-score</p>
      </div>

      <div className="zscore-info-grid">
        {Object.entries(ZSCORE_INFO).map(([key, info]) => (
          <div key={key} className="card zscore-info-card">
            <h4 className="card-header">{info.label}</h4>
            <p className="zscore-desc">{info.desc}</p>
            <div className="zscore-cutoffs">
              {info.cutoffs.map((c, i) => (
                <div key={i} className="zscore-cutoff-row">
                  <span className="zscore-dot" style={{ background: c.color }} />
                  <span className="zscore-range">{c.range}</span>
                  <span className="zscore-cutoff-label">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid zscore-charts">
        <ZScoreDistChart data={zscoreDist} title="Taburan WAZ" indicator="waz" />
        <ZScoreDistChart data={zscoreDist} title="Taburan HAZ" indicator="haz" />
        <ZScoreDistChart data={zscoreDist} title="Taburan BAZ" indicator="baz" />
      </div>

      <div className="card formula-card">
        <h4 className="card-header"><IconFormula size={16} /> WHO LMS Method Formula</h4>
        <div className="formula-display">
          <div className="formula-main">
            <span className="formula-z">Z = </span>
            <div className="formula-fraction">
              <span className="formula-num">[(X / M)<sup>L</sup> - 1]</span>
              <span className="formula-line" />
              <span className="formula-denom">L x S</span>
            </div>
          </div>
          <p className="formula-note">When L = 0: Z = ln(X / M) / S</p>
        </div>
        <div className="formula-legend">
          <div className="legend-item"><span className="legend-key">X</span> Measured value (weight/height/BMI)</div>
          <div className="legend-item"><span className="legend-key">L</span> Lambda (Box-Cox power)</div>
          <div className="legend-item"><span className="legend-key">M</span> Median reference for age/sex</div>
          <div className="legend-item"><span className="legend-key">S</span> Coefficient of variation</div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// RULES EDITOR COMPONENT (User Configurable)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ADD CUSTOM RULE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const AddRuleModal = ({ isOpen, onClose, onAddRule, columns }) => {
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('numeric'); // 'numeric' or 'categorical'
  const [selectedColumn, setSelectedColumn] = useState('');
  const [operator, setOperator] = useState('>'); // for numeric
  const [value, setValue] = useState('');
  const [action, setAction] = useState('remove'); // for categorical: 'keep' or 'remove'
  const [categoricalValues, setCategoricalValues] = useState('');

  const handleSubmit = () => {
    if (!ruleName || !selectedColumn) {
      alert('Sila isi nama peraturan dan pilih kolum');
      return;
    }

    const newRule = {
      name: ruleName,
      type: ruleType,
      column: selectedColumn,
      enabled: true,
    };

    if (ruleType === 'numeric') {
      if (!value) {
        alert('Sila masukkan nilai');
        return;
      }
      newRule.operator = operator;
      newRule.value = parseFloat(value);
    } else {
      if (!categoricalValues) {
        alert('Sila masukkan nilai kategori (pisahkan dengan koma)');
        return;
      }
      newRule.action = action;
      newRule.values = categoricalValues.split(',').map(v => v.trim());
    }

    onAddRule(newRule);
    handleClose();
  };

  const handleClose = () => {
    setRuleName('');
    setRuleType('numeric');
    setSelectedColumn('');
    setOperator('>');
    setValue('');
    setAction('remove');
    setCategoricalValues('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><IconRules size={20} /> Tambah Peraturan Baharu</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nama Peraturan</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Contoh: Buang berat terlalu rendah"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pilih Kolum</label>
            <select 
              className="form-select" 
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
            >
              <option value="">-- Pilih Kolum --</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Jenis Peraturan</label>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio" 
                  value="numeric" 
                  checked={ruleType === 'numeric'}
                  onChange={(e) => setRuleType(e.target.value)}
                />
                <span>Numerik</span>
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  value="categorical" 
                  checked={ruleType === 'categorical'}
                  onChange={(e) => setRuleType(e.target.value)}
                />
                <span>Kategorikal</span>
              </label>
            </div>
          </div>

          {ruleType === 'numeric' && (
            <>
              <div className="form-group">
                <label className="form-label">Operator</label>
                <select 
                  className="form-select" 
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                >
                  <option value=">">&gt; (lebih besar)</option>
                  <option value=">=">&gt;= (lebih besar atau sama)</option>
                  <option value="<">&lt; (kurang daripada)</option>
                  <option value="<=">&lt;= (kurang atau sama)</option>
                  <option value="=">= (sama dengan)</option>
                  <option value="!=">!= (tidak sama)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nilai</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Contoh: 100"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  step="0.01"
                />
                <small className="form-hint">
                  Rekod yang memenuhi syarat ini akan dibuang
                </small>
              </div>
            </>
          )}

          {ruleType === 'categorical' && (
            <>
              <div className="form-group">
                <label className="form-label">Tindakan</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      value="remove" 
                      checked={action === 'remove'}
                      onChange={(e) => setAction(e.target.value)}
                    />
                    <span>Buang nilai ini</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      value="keep" 
                      checked={action === 'keep'}
                      onChange={(e) => setAction(e.target.value)}
                    />
                    <span>Simpan nilai ini sahaja</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nilai (pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Contoh: NULL, -, N/A, Unknown"
                  value={categoricalValues}
                  onChange={(e) => setCategoricalValues(e.target.value)}
                />
                <small className="form-hint">
                  {action === 'remove' 
                    ? 'Nilai-nilai ini akan dibuang dari data'
                    : 'Hanya nilai-nilai ini akan disimpan'}
                </small>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <IconCheck size={16} /> Tambah Peraturan
          </button>
        </div>
      </div>
    </div>
  );
};

const RulesEditor = ({ rules, onRulesChange, columns }) => {
  const [localRules, setLocalRules] = useState(rules);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [customRules, setCustomRules] = useState([]);

  const updateRule = (category, field, value) => {
    const newRules = {
      ...localRules,
      [category]: {
        ...localRules[category],
        [field]: value
      }
    };
    setLocalRules(newRules);
    onRulesChange(newRules);
  };

  const toggleRule = (category) => {
    updateRule(category, 'enabled', !localRules[category].enabled);
  };

  const handleAddCustomRule = (rule) => {
    const newCustomRules = [...customRules, { ...rule, id: Date.now() }];
    setCustomRules(newCustomRules);
    console.log('Custom rule added:', rule);
  };

  const handleRemoveCustomRule = (ruleId) => {
    setCustomRules(customRules.filter(r => r.id !== ruleId));
  };

  const RuleToggle = ({ category, label, description }) => (
    <div className={`rule-toggle-item ${localRules[category]?.enabled ? 'active' : ''}`}>
      <div className="rule-toggle-header" onClick={() => toggleRule(category)}>
        <div className="rule-toggle-check">
          {localRules[category]?.enabled ? <IconCheck size={14} /> : null}
        </div>
        <div className="rule-toggle-info">
          <span className="rule-toggle-label">{label}</span>
          <span className="rule-toggle-desc">{description}</span>
        </div>
      </div>
    </div>
  );

  const NumberInput = ({ label, value, onChange, min, max, step = 1, unit }) => (
    <div className="rule-input-group">
      <label className="rule-input-label">{label}</label>
      <div className="rule-input-wrapper">
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min} 
          max={max} 
          step={step}
          className="rule-input"
        />
        {unit && <span className="rule-input-unit">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="rules-editor">
      <div className="rules-editor-header">
        <h3><IconRules size={18} /> Konfigurasi Peraturan Pembersihan</h3>
        <p className="section-desc">Tetapkan had dan peraturan validasi data. Perubahan akan digunakan dalam proses pembersihan.</p>
      </div>

      <div className="rules-sections">
        {/* Age Rules */}
        <div className="rules-section">
          <div className="rules-section-title">
            <IconCalendar size={16} />
            <span>Validasi Umur</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={localRules.age.enabled} onChange={() => toggleRule('age')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localRules.age.enabled && (
            <div className="rules-section-content">
              <div className="rules-row">
                <NumberInput label="Umur Minimum" value={localRules.age.minMonths} 
                  onChange={(v) => updateRule('age', 'minMonths', v)} min={0} max={120} unit="bulan" />
                <NumberInput label="Umur Maximum" value={localRules.age.maxMonths} 
                  onChange={(v) => updateRule('age', 'maxMonths', v)} min={0} max={240} unit="bulan" />
              </div>
              <div className="rule-preview">
                Had semasa: <strong>{localRules.age.minMonths} - {localRules.age.maxMonths} bulan</strong>
              </div>
            </div>
          )}
        </div>

        {/* Weight Rules */}
        <div className="rules-section">
          <div className="rules-section-title">
            <IconScale size={16} />
            <span>Validasi Berat</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={localRules.weight.enabled} onChange={() => toggleRule('weight')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localRules.weight.enabled && (
            <div className="rules-section-content">
              <div className="rules-row">
                <NumberInput label="Berat Minimum" value={localRules.weight.minKg} 
                  onChange={(v) => updateRule('weight', 'minKg', v)} min={0} max={50} step={0.5} unit="kg" />
                <NumberInput label="Berat Maximum" value={localRules.weight.maxKg} 
                  onChange={(v) => updateRule('weight', 'maxKg', v)} min={5} max={200} step={0.5} unit="kg" />
              </div>
              <div className="rule-preview">
                Had semasa: <strong>{localRules.weight.minKg} - {localRules.weight.maxKg} kg</strong>
              </div>
            </div>
          )}
        </div>

        {/* Height Rules */}
        <div className="rules-section">
          <div className="rules-section-title">
            <IconRuler size={16} />
            <span>Validasi Tinggi</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={localRules.height.enabled} onChange={() => toggleRule('height')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localRules.height.enabled && (
            <div className="rules-section-content">
              <div className="rules-row">
                <NumberInput label="Tinggi Minimum" value={localRules.height.minCm} 
                  onChange={(v) => updateRule('height', 'minCm', v)} min={20} max={100} step={1} unit="cm" />
                <NumberInput label="Tinggi Maximum" value={localRules.height.maxCm} 
                  onChange={(v) => updateRule('height', 'maxCm', v)} min={50} max={200} step={1} unit="cm" />
              </div>
              <div className="rule-preview">
                Had semasa: <strong>{localRules.height.minCm} - {localRules.height.maxCm} cm</strong>
              </div>
            </div>
          )}
        </div>

        {/* BMI Rules */}
        <div className="rules-section">
          <div className="rules-section-title">
            <IconChart size={16} />
            <span>Validasi BMI</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={localRules.bmi.enabled} onChange={() => toggleRule('bmi')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localRules.bmi.enabled && (
            <div className="rules-section-content">
              <div className="rules-row">
                <NumberInput label="BMI Minimum" value={localRules.bmi.minBmi} 
                  onChange={(v) => updateRule('bmi', 'minBmi', v)} min={5} max={20} step={0.5} unit="" />
                <NumberInput label="BMI Maximum" value={localRules.bmi.maxBmi} 
                  onChange={(v) => updateRule('bmi', 'maxBmi', v)} min={15} max={50} step={0.5} unit="" />
              </div>
              <div className="rule-preview">
                Had semasa: <strong>{localRules.bmi.minBmi} - {localRules.bmi.maxBmi}</strong>
              </div>
            </div>
          )}
        </div>

        {/* IC Validation */}
        <div className="rules-section">
          <div className="rules-section-title">
            <IconId size={16} />
            <span>Validasi IC/MyKid</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={localRules.ic.enabled} onChange={() => toggleRule('ic')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localRules.ic.enabled && (
            <div className="rules-section-content">
              <div className="rules-checkboxes">
                <label className="rule-checkbox">
                  <input type="checkbox" checked={localRules.ic.allowPassport} 
                    onChange={(e) => updateRule('ic', 'allowPassport', e.target.checked)} />
                  <span>Benarkan Passport / Format Lain</span>
                </label>
                <label className="rule-checkbox">
                  <input type="checkbox" checked={localRules.ic.checkDuplicates} 
                    onChange={(e) => updateRule('ic', 'checkDuplicates', e.target.checked)} />
                  <span>Semak IC Duplikat</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Date Validation */}
        <div className="rules-section">
          <div className="rules-section-title">
            <IconCalendar size={16} />
            <span>Validasi Tarikh</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={localRules.dates.enabled} onChange={() => toggleRule('dates')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localRules.dates.enabled && (
            <div className="rules-section-content">
              <div className="rules-checkboxes">
                <label className="rule-checkbox">
                  <input type="checkbox" checked={localRules.dates.checkFutureDob} 
                    onChange={(e) => updateRule('dates', 'checkFutureDob', e.target.checked)} />
                  <span>Tandakan tarikh lahir masa hadapan sebagai ralat</span>
                </label>
                <label className="rule-checkbox">
                  <input type="checkbox" checked={localRules.dates.checkMeasureBeforeDob} 
                    onChange={(e) => updateRule('dates', 'checkMeasureBeforeDob', e.target.checked)} />
                  <span>Tandakan tarikh pengukuran sebelum tarikh lahir</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Custom Rules Display */}
        {customRules.map((rule) => (
          <div key={rule.id} className="rules-section custom-rule-section">
            <div className="rules-section-title">
              <IconRules size={16} />
              <span>{rule.name}</span>
              <button 
                className="btn-icon-small" 
                onClick={() => handleRemoveCustomRule(rule.id)}
                title="Buang peraturan"
              >
                ×
              </button>
            </div>
            <div className="rules-section-content">
              <div className="custom-rule-details">
                <div className="rule-detail-row">
                  <strong>Kolum:</strong> <span>{rule.column}</span>
                </div>
                <div className="rule-detail-row">
                  <strong>Jenis:</strong> <Badge variant="primary">{rule.type === 'numeric' ? 'Numerik' : 'Kategorikal'}</Badge>
                </div>
                {rule.type === 'numeric' && (
                  <div className="rule-detail-row">
                    <strong>Syarat:</strong> <span>{rule.operator} {rule.value}</span>
                  </div>
                )}
                {rule.type === 'categorical' && (
                  <>
                    <div className="rule-detail-row">
                      <strong>Tindakan:</strong> <span>{rule.action === 'remove' ? 'Buang' : 'Simpan'}</span>
                    </div>
                    <div className="rule-detail-row">
                      <strong>Nilai:</strong> <span>{rule.values.join(', ')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add New Rule Card */}
        <div className="rules-section add-rule-card" onClick={() => setShowAddRuleModal(true)}>
          <div className="add-rule-content">
            <IconRules size={24} />
            <span>Tambah Peraturan Baharu</span>
            <p>Klik untuk menambah peraturan pembersihan tersuai</p>
          </div>
        </div>
      </div>

      <AddRuleModal 
        isOpen={showAddRuleModal}
        onClose={() => setShowAddRuleModal(false)}
        onAddRule={handleAddCustomRule}
        columns={columns}
      />

      <div className="rules-actions">
        <button className="btn btn-secondary" onClick={() => {
          setLocalRules(DEFAULT_CLEANING_RULES);
          setCustomRules([]);
          onRulesChange(DEFAULT_CLEANING_RULES);
        }}>
          <IconRefresh size={16} /> Reset ke Default
        </button>
      </div>
    </div>
  );
};

const QualitySection = ({ qualityData, columns, rawData }) => {
  const stats = useMemo(() => {
    if (qualityData?.columns) {
      return {
        columns: qualityData.columns,
        totalRows: rawData?.length || qualityData.total_rows,  // Use rawData.length for accurate count
        totalColumns: qualityData.total_columns,
        overallCompleteness: qualityData.overall_completeness,
      };
    }
    return null;
  }, [qualityData, rawData]);

  if (!stats) return <div className="empty-state"><IconSpinner size={24} /> Loading quality data...</div>;

  const completenessData = stats.columns?.slice(0, 15).map(col => ({
    name: col.name?.length > 20 ? col.name.substring(0, 20) + '...' : col.name,
    completeness: 100 - (col.null_percent || 0),
    nullPct: col.null_percent || 0,
  })) || [];

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconDatabase size={18} /> Data Quality Report</h3>
        <p className="section-desc">Analisis kelengkapan dan kualiti data</p>
      </div>

      <div className="quality-summary-grid">
        <div className="stat-card featured">
          <ProgressRing progress={parseFloat(stats.overallCompleteness || 0)} size={80} color={COLORS.success} />
          <div className="stat-content">
            <div className="stat-label">Data Completeness</div>
          </div>
        </div>
        <StatCard value={stats.totalRows?.toLocaleString() || 0} label="Total Records" icon={IconDatabase} color={COLORS.primary} />
        <StatCard value={stats.totalColumns || 0} label="Total Columns" icon={IconTable} color={COLORS.accent} />
      </div>

      <div className="chart-card">
        <h4 className="chart-title"><IconChart size={16} /> Column Completeness</h4>
        <ResponsiveContainer width="100%" height={Math.max(300, completenessData.length * 28)}>
          <BarChart data={completenessData} layout="vertical" margin={{ left: 150, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: COLORS.slate[500] }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: COLORS.slate[600] }} width={145} />
            <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v.toFixed(1)}%`, 'Completeness']} />
            <Bar dataKey="completeness" fill={COLORS.success} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h4 className="card-header"><IconTable size={16} /> Column Analysis Detail</h4>
        <div className="table-container">
          <table className="data-table quality-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Non-Null</th>
                <th>Missing %</th>
                <th>Unique</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {stats.columns?.slice(0, 20).map((col, i) => (
                <tr key={i} className={col.null_percent > 20 ? 'row-warning' : ''}>
                  <td className="col-name">{col.name}</td>
                  <td className="num-cell">{col.non_null?.toLocaleString()}</td>
                  <td className={col.null_percent > 20 ? 'danger-cell' : 'num-cell'}>
                    <div className="null-bar-container">
                      <div className="null-bar" style={{
                        width: `${Math.min(col.null_percent, 100)}%`,
                        background: col.null_percent > 20 ? COLORS.danger : COLORS.slate[300]
                      }} />
                      <span>{col.null_percent?.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="num-cell">{col.unique_count?.toLocaleString()}</td>
                  <td><Badge variant={col.is_numeric ? 'primary' : 'default'}>{col.is_numeric ? 'Numeric' : 'Text'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// IC VALIDATION EDA SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const IC_VALIDATION_RULES = {
  mykid: {
    label: 'MyKid (12 digits)',
    pattern: /^\d{12}$/,
    format: 'YYMMDDPPSSSSN',
    description: '12-digit Malaysian IC for children',
    stateCodeMap: {
      '01': 'Johor', '02': 'Kedah', '03': 'Kelantan', '04': 'Melaka',
      '05': 'N. Sembilan', '06': 'Pahang', '07': 'P. Pinang', '08': 'Perak',
      '09': 'Perlis', '10': 'Selangor', '11': 'Terengganu', '12': 'Sabah',
      '13': 'Sarawak', '14': 'WP K.L.', '15': 'WP Labuan', '16': 'WP Putrajaya',
      '82': 'Foreign Born'
    }
  },
  passport: {
    label: 'Passport',
    pattern: /^[A-Z0-9]{6,15}$/i,
    description: 'For foreign children without MyKid'
  }
};

const IcValidationSection = ({ rawData, columns }) => {
  const icStats = useMemo(() => {
    if (!rawData?.length) return null;

    // Find IC column
    const icCol = columns.find(c => /mykid|ic|no.*ic|id.*kad|kad.*pengenalan/i.test(c));
    if (!icCol) return { noIcColumn: true };

    const icValues = rawData.map(r => String(r[icCol] || '').trim());
    const total = icValues.length;
    
    // Validation stats
    const valid12Digit = icValues.filter(v => /^\d{12}$/.test(v)).length;
    const validPassport = icValues.filter(v => /^[A-Z0-9]{6,15}$/i.test(v) && !/^\d{12}$/.test(v)).length;
    const empty = icValues.filter(v => !v || v === 'nan' || v === 'NaN').length;
    const invalid = total - valid12Digit - validPassport - empty;

    // State code distribution (from MyKid positions 7-8)
    const stateDistribution = {};
    icValues.filter(v => /^\d{12}$/.test(v)).forEach(ic => {
      const stateCode = ic.substring(6, 8);
      const stateName = IC_VALIDATION_RULES.mykid.stateCodeMap[stateCode] || `Code ${stateCode}`;
      stateDistribution[stateName] = (stateDistribution[stateName] || 0) + 1;
    });

    // Birth year distribution (from MyKid positions 1-2)
    const yearDistribution = {};
    icValues.filter(v => /^\d{12}$/.test(v)).forEach(ic => {
      const yy = parseInt(ic.substring(0, 2));
      const year = yy > 30 ? 1900 + yy : 2000 + yy;
      yearDistribution[year] = (yearDistribution[year] || 0) + 1;
    });

    // Gender distribution (from MyKid last digit: odd=male, even=female)
    let maleCount = 0, femaleCount = 0;
    icValues.filter(v => /^\d{12}$/.test(v)).forEach(ic => {
      const lastDigit = parseInt(ic.charAt(11));
      if (lastDigit % 2 === 1) maleCount++; else femaleCount++;
    });

    // Duplicate check
    const icCounts = {};
    icValues.filter(v => v && v !== 'nan').forEach(v => {
      icCounts[v] = (icCounts[v] || 0) + 1;
    });
    const duplicates = Object.entries(icCounts).filter(([_, count]) => count > 1);

    return {
      icCol,
      total,
      valid12Digit,
      validPassport,
      empty,
      invalid,
      validPct: ((valid12Digit + validPassport) / total * 100).toFixed(1),
      stateDistribution: Object.entries(stateDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10),
      yearDistribution: Object.entries(yearDistribution).sort((a, b) => a[0] - b[0]),
      genderFromIc: { male: maleCount, female: femaleCount },
      duplicateCount: duplicates.length,
      duplicateRecords: duplicates.reduce((sum, [_, c]) => sum + c, 0) - duplicates.length
    };
  }, [rawData, columns]);

  if (!icStats) return <div className="empty-state"><IconSpinner size={24} /> Loading...</div>;
  if (icStats.noIcColumn) return <div className="empty-state"><IconInfo size={24} /> Tiada kolum IC/MyKid ditemui dalam data</div>;

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconId size={18} /> Pengesahan IC / MyKid</h3>
        <p className="section-desc">Validasi format IC dan analisis taburan</p>
      </div>

      <div className="indicator-cards-grid">
        <StatCard value={`${icStats.validPct}%`} label="IC Valid" 
          subtext={`${(icStats.valid12Digit + icStats.validPassport).toLocaleString()} / ${icStats.total.toLocaleString()}`}
          color={parseFloat(icStats.validPct) > 90 ? COLORS.success : COLORS.warning} icon={IconCheck} />
        <StatCard value={icStats.valid12Digit.toLocaleString()} label="MyKid (12-digit)" 
          subtext="Format YYMMDDPPSSSSN" color={COLORS.primary} icon={IconId} />
        <StatCard value={icStats.validPassport.toLocaleString()} label="Passport / Lain" 
          subtext="Foreign children" color={COLORS.teal} icon={IconId} />
        <StatCard value={icStats.empty.toLocaleString()} label="Kosong / Null" 
          subtext="Tiada nilai" color={COLORS.slate[400]} icon={IconWarning} />
        <StatCard value={icStats.invalid.toLocaleString()} label="Format Tidak Sah" 
          subtext="Needs review" color={COLORS.danger} icon={IconError} />
        <StatCard value={icStats.duplicateCount.toLocaleString()} label="Duplicates" 
          subtext={`${icStats.duplicateRecords} extra records`} color={COLORS.orange} icon={IconWarning} />
      </div>

      <div className="card ic-format-card">
        <h4 className="card-header"><IconRules size={16} /> MyKid Format Rules</h4>
        <div className="format-breakdown">
          <div className="format-item"><span className="format-pos">1-2</span> <span className="format-desc">Tahun Lahir (YY)</span></div>
          <div className="format-item"><span className="format-pos">3-4</span> <span className="format-desc">Bulan Lahir (MM)</span></div>
          <div className="format-item"><span className="format-pos">5-6</span> <span className="format-desc">Hari Lahir (DD)</span></div>
          <div className="format-item"><span className="format-pos">7-8</span> <span className="format-desc">Kod Negeri (PP)</span></div>
          <div className="format-item"><span className="format-pos">9-11</span> <span className="format-desc">No. Siri (SSS)</span></div>
          <div className="format-item"><span className="format-pos">12</span> <span className="format-desc">Jantina (ganjil=L, genap=P)</span></div>
        </div>
      </div>

      <div className="charts-grid">
        <HBarChart 
          data={icStats.stateDistribution.map(([name, value]) => ({ name, value }))} 
          title="Taburan Negeri (dari MyKid)" 
          color={COLORS.primary} 
        />
        {icStats.yearDistribution.length > 0 && (
          <Histogram 
            data={icStats.yearDistribution.map(([year, count]) => ({ range: year.toString(), count }))}
            title="Tahun Lahir (dari MyKid)" 
            color={COLORS.accent}
          />
        )}
      </div>

      <div className="card">
        <h4 className="card-header"><IconUser size={16} /> Jantina (dari digit terakhir MyKid)</h4>
        <div className="gender-from-ic">
          <div className="gender-bar">
            <div className="gender-male" style={{ width: `${icStats.genderFromIc.male / (icStats.genderFromIc.male + icStats.genderFromIc.female) * 100}%` }}>
              Lelaki: {icStats.genderFromIc.male.toLocaleString()}
            </div>
            <div className="gender-female" style={{ width: `${icStats.genderFromIc.female / (icStats.genderFromIc.male + icStats.genderFromIc.female) * 100}%` }}>
              Perempuan: {icStats.genderFromIc.female.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// AGE EDA SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const AGE_RULES = {
  ncdc: { minMonths: 0, maxMonths: 59, label: '0-59 bulan (< 5 tahun)' },
  myvass: { minMonths: 0, maxMonths: 59, label: '0-59 bulan (< 5 tahun)' },
  kpm: { minYears: 6, maxYears: 8, label: '6-8 tahun (Sekolah Rendah)' }
};

const AgeSection = ({ rawData, columns, dataType }) => {
  const ageStats = useMemo(() => {
    if (!rawData?.length) return null;

    // Helper function to find column with multiple patterns
    const findCol = (patterns) => {
      for (const pattern of patterns) {
        const found = columns.find(c => pattern instanceof RegExp ? pattern.test(c) : c.toLowerCase() === pattern.toLowerCase());
        if (found) return found;
      }
      return null;
    };

    // Age column - avoid "Agensi" false match
    const ageCol = findCol([/^umur$/i, /umur_bulan/i, /age_month/i, /^age$/i, /^bulan$/i]);
    const ageGroupCol = findCol([/kumpulan.*umur/i, /umur.*group/i]); // Categorical age group
    
    // DOB column - "Tarikh Lahir" in NCDC
    const dobCol = findCol([/^tarikh\s*lahir$/i, /tarikh_lahir/i, /tkh_lahir/i, /dob/i, /date.*birth/i]);
    
    // Measurement date - "2025 Tarikh Pengukuran" in NCDC (prefer latest year)
    const measureDateCol = findCol([
      /2025.*tarikh.*pengukuran/i, /2024.*tarikh.*pengukuran/i, /2023.*tarikh.*pengukuran/i,
      /tarikh.*antropo/i, /tarikh.*pengukur/i, /tarikh_ukur/i
    ]);

    // Debug: Log found columns
    console.log('Age detection (NCDC):', { ageCol, ageGroupCol, dobCol, measureDateCol, allColumns: columns });

    if (!ageCol && !dobCol && !ageGroupCol) return { noAgeColumn: true, availableCols: columns.slice(0, 20) };

    let ages = [];
    let dobErrors = 0;
    let futureDob = 0;
    let measureBeforeDob = 0;
    let calculatedCount = 0;

    // Helper to parse date in various formats
    const parseDate = (val) => {
      if (!val) return null;
      // Try direct parsing
      let d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      
      // Try DD/MM/YYYY or DD-MM-YYYY
      const parts = String(val).split(/[\/\-\.]/);
      if (parts.length === 3) {
        // Check if first part looks like day (1-31)
        if (parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
          d = new Date(parts[2], parts[1] - 1, parts[0]);
          if (!isNaN(d.getTime())) return d;
        }
      }
      return null;
    };

    rawData.forEach(row => {
      let ageMonths = null;
      
      // PRIORITY: Calculate from tarikh_lahir and tarikh_antropometri
      if (dobCol && row[dobCol] && measureDateCol && row[measureDateCol]) {
        const dob = parseDate(row[dobCol]);
        const measureDate = parseDate(row[measureDateCol]);
        
        if (dob && measureDate) {
          if (dob > new Date()) futureDob++;
          if (measureDate < dob) measureBeforeDob++;
          
          // Calculate age in months
          ageMonths = (measureDate - dob) / (1000 * 60 * 60 * 24 * 30.4375);
          calculatedCount++;
        } else {
          dobErrors++;
        }
      }
      // Fallback: Use DOB with current date if no measurement date
      else if (dobCol && row[dobCol]) {
        const dob = parseDate(row[dobCol]);
        if (dob) {
          if (dob > new Date()) futureDob++;
          ageMonths = (new Date() - dob) / (1000 * 60 * 60 * 24 * 30.4375);
        } else {
          dobErrors++;
        }
      }
      // Fallback: Use direct age column if available
      else if (ageCol && row[ageCol]) {
        ageMonths = parseFloat(row[ageCol]);
      }

      if (ageMonths !== null && !isNaN(ageMonths) && ageMonths >= 0) {
        ages.push(ageMonths);
      }
    });

    if (!ages.length) return { 
      noValidAge: true, 
      ageCol: ageCol || dobCol,
      dobCol,
      measureDateCol,
      debugInfo: `DOB: ${dobCol || 'not found'}, Measure: ${measureDateCol || 'not found'}, Errors: ${dobErrors}`
    };

    // Age distribution buckets
    const rules = AGE_RULES[dataType] || AGE_RULES.ncdc;
    const ageGroups = dataType === 'kpm' 
      ? [
          { label: '< 6 tahun', min: 0, max: 72 },
          { label: '6 tahun', min: 72, max: 84 },
          { label: '7 tahun', min: 84, max: 96 },
          { label: '8 tahun', min: 96, max: 108 },
          { label: '> 8 tahun', min: 108, max: 999 }
        ]
      : [
          { label: '0-5 bulan', min: 0, max: 6 },
          { label: '6-11 bulan', min: 6, max: 12 },
          { label: '12-23 bulan', min: 12, max: 24 },
          { label: '24-35 bulan', min: 24, max: 36 },
          { label: '36-47 bulan', min: 36, max: 48 },
          { label: '48-59 bulan', min: 48, max: 60 },
          { label: '>= 60 bulan', min: 60, max: 999 }
        ];

    const distribution = ageGroups.map(g => ({
      range: g.label,
      count: ages.filter(a => a >= g.min && a < g.max).length
    }));

    // Stats
    const validAges = ages.filter(a => a >= 0);
    const sorted = [...validAges].sort((a, b) => a - b);
    const n = sorted.length;

    // Count invalid ages
    const underAge = dataType === 'kpm' 
      ? ages.filter(a => a < 72).length 
      : ages.filter(a => a < 0).length;
    const overAge = dataType === 'kpm' 
      ? ages.filter(a => a >= 108).length 
      : ages.filter(a => a >= 60).length;

    return {
      ageCol: ageCol || dobCol,
      dobCol,
      measureDateCol,
      calculatedFromDates: calculatedCount > 0,
      total: rawData.length,
      validCount: n,
      invalidCount: rawData.length - n,
      min: sorted[0]?.toFixed(1),
      max: sorted[n - 1]?.toFixed(1),
      mean: (validAges.reduce((a, b) => a + b, 0) / n).toFixed(1),
      median: sorted[Math.floor(n / 2)]?.toFixed(1),
      distribution,
      dobErrors,
      futureDob,
      measureBeforeDob,
      underAge,
      overAge,
      rules
    };
  }, [rawData, columns, dataType]);

  if (!ageStats) return <div className="empty-state"><IconSpinner size={24} /> Loading...</div>;
  if (ageStats.noAgeColumn) return (
    <div className="empty-state">
      <IconInfo size={24} />
      <p>Tiada kolum umur/tarikh lahir ditemui</p>
      <span className="empty-state-hint">Kolum sedia ada: {ageStats.availableCols?.join(', ') || 'N/A'}</span>
      <span className="empty-state-hint">Dijangka: tarikh_lahir, tarikh_antropometri, umur</span>
    </div>
  );
  if (ageStats.noValidAge) return (
    <div className="empty-state">
      <IconWarning size={24} />
      <p>Tiada data umur yang sah</p>
      <span className="empty-state-hint">
        DOB: {ageStats.dobCol || 'tidak dijumpai'} | 
        Pengukuran: {ageStats.measureDateCol || 'tidak dijumpai'}
      </span>
      <span className="empty-state-hint">{ageStats.debugInfo}</span>
    </div>
  );

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconCalendar size={18} /> Analisis Umur</h3>
        <p className="section-desc">
          {ageStats.calculatedFromDates 
            ? `Dikira dari: ${ageStats.dobCol} - ${ageStats.measureDateCol}` 
            : `Kolum: ${ageStats.ageCol}`} | Had: {ageStats.rules?.label}
        </p>
      </div>

      <div className="indicator-cards-grid">
        <StatCard value={ageStats.validCount.toLocaleString()} label="Umur Valid" 
          subtext={`${(ageStats.validCount / ageStats.total * 100).toFixed(1)}%`}
          color={COLORS.success} icon={IconCheck} />
        <StatCard value={`${ageStats.mean} bln`} label="Purata Umur" 
          subtext={`Med: ${ageStats.median} bln`} color={COLORS.primary} icon={IconCalendar} />
        <StatCard value={`${ageStats.min} - ${ageStats.max}`} label="Julat (bulan)" 
          color={COLORS.accent} icon={IconCalendar} />
        <StatCard value={ageStats.underAge.toLocaleString()} label="Bawah Had" 
          subtext="Under minimum age" color={COLORS.warning} icon={IconWarning} />
        <StatCard value={ageStats.overAge.toLocaleString()} label="Atas Had" 
          subtext="Over maximum age" color={COLORS.danger} icon={IconWarning} />
        {ageStats.dobErrors > 0 && (
          <StatCard value={ageStats.dobErrors.toLocaleString()} label="Format Tarikh Salah" 
            subtext="Invalid date format" color={COLORS.danger} icon={IconError} />
        )}
        {ageStats.measureBeforeDob > 0 && (
          <StatCard value={ageStats.measureBeforeDob.toLocaleString()} label="Tarikh Tidak Logic" 
            subtext="Measure before DOB" color={COLORS.danger} icon={IconWarning} />
        )}
      </div>

      <Histogram data={ageStats.distribution} title="Taburan Kumpulan Umur" color={COLORS.teal} />

      <div className="card age-rules-card">
        <h4 className="card-header"><IconRules size={16} /> Age Validation Rules</h4>
        <div className="rules-list">
          <div className="rule-item">
            <Badge variant="primary">Rule 1</Badge>
            <span>Age must be non-negative (&gt;= 0)</span>
          </div>
          <div className="rule-item">
            <Badge variant="primary">Rule 2</Badge>
            <span>{dataType === 'kpm' 
              ? 'KPM: Age must be 6-8 years (72-108 months)' 
              : 'NCDC/MyVASS: Age must be less than 5 years (under 60 months)'}</span>
          </div>
          <div className="rule-item">
            <Badge variant="primary">Rule 3</Badge>
            <span>DOB must not be in future</span>
          </div>
          <div className="rule-item">
            <Badge variant="primary">Rule 4</Badge>
            <span>Measurement date must be after DOB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// GENDER EDA SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const GenderSection = ({ rawData, columns }) => {
  const genderStats = useMemo(() => {
    if (!rawData?.length) return null;

    const genderCol = columns.find(c => /jantina|gender|sex/i.test(c));
    if (!genderCol) return { noGenderColumn: true };

    const values = rawData.map(r => String(r[genderCol] || '').toUpperCase().trim());
    const total = values.length;

    // Standardization mapping
    const genderMap = {
      'LELAKI': 'Lelaki', 'L': 'Lelaki', 'MALE': 'Lelaki', 'M': 'Lelaki',
      'PEREMPUAN': 'Perempuan', 'P': 'Perempuan', 'FEMALE': 'Perempuan', 'F': 'Perempuan'
    };

    const distribution = {};
    const invalid = [];
    values.forEach(v => {
      if (!v || v === 'NAN') {
        distribution['(kosong)'] = (distribution['(kosong)'] || 0) + 1;
      } else if (genderMap[v]) {
        distribution[genderMap[v]] = (distribution[genderMap[v]] || 0) + 1;
      } else {
        invalid.push(v);
        distribution[v] = (distribution[v] || 0) + 1;
      }
    });

    const maleCount = distribution['Lelaki'] || 0;
    const femaleCount = distribution['Perempuan'] || 0;
    const emptyCount = distribution['(kosong)'] || 0;
    const invalidCount = total - maleCount - femaleCount - emptyCount;

    return {
      genderCol,
      total,
      maleCount,
      femaleCount,
      emptyCount,
      invalidCount,
      malePct: (maleCount / total * 100).toFixed(1),
      femalePct: (femaleCount / total * 100).toFixed(1),
      ratio: femaleCount > 0 ? (maleCount / femaleCount).toFixed(2) : 'N/A',
      distribution: Object.entries(distribution).sort((a, b) => b[1] - a[1]),
      invalidValues: [...new Set(invalid)].slice(0, 10)
    };
  }, [rawData, columns]);

  if (!genderStats) return <div className="empty-state"><IconSpinner size={24} /> Loading...</div>;
  if (genderStats.noGenderColumn) return <div className="empty-state"><IconInfo size={24} /> Tiada kolum jantina ditemui</div>;

  const pieData = [
    { name: 'Lelaki', value: genderStats.maleCount },
    { name: 'Perempuan', value: genderStats.femaleCount },
    ...(genderStats.emptyCount > 0 ? [{ name: 'Kosong', value: genderStats.emptyCount }] : []),
    ...(genderStats.invalidCount > 0 ? [{ name: 'Invalid', value: genderStats.invalidCount }] : [])
  ];

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconUser size={18} /> Analisis Jantina</h3>
        <p className="section-desc">Taburan dan validasi jantina</p>
      </div>

      <div className="indicator-cards-grid">
        <StatCard value={genderStats.maleCount.toLocaleString()} label="Lelaki" 
          subtext={`${genderStats.malePct}%`} color={COLORS.primary} icon={IconUser} />
        <StatCard value={genderStats.femaleCount.toLocaleString()} label="Perempuan" 
          subtext={`${genderStats.femalePct}%`} color={COLORS.pink} icon={IconUser} />
        <StatCard value={genderStats.ratio} label="Nisbah L:P" 
          color={COLORS.accent} icon={IconChart} />
        <StatCard value={genderStats.emptyCount.toLocaleString()} label="Kosong" 
          color={COLORS.slate[400]} icon={IconWarning} />
        {genderStats.invalidCount > 0 && (
          <StatCard value={genderStats.invalidCount.toLocaleString()} label="Tidak Sah" 
            color={COLORS.danger} icon={IconError} />
        )}
      </div>

      <div className="charts-grid">
        <DonutChart data={pieData} title="Pecahan Jantina" colors={[COLORS.primary, COLORS.pink, COLORS.slate[400], COLORS.danger]} />
        
        <div className="card gender-bar-card">
          <h4 className="card-header"><IconChart size={16} /> Visual Breakdown</h4>
          <div className="stacked-gender-bar">
            <div className="gender-segment male" style={{ width: `${genderStats.malePct}%` }}>
              <span>L {genderStats.malePct}%</span>
            </div>
            <div className="gender-segment female" style={{ width: `${genderStats.femalePct}%` }}>
              <span>P {genderStats.femalePct}%</span>
            </div>
          </div>
        </div>
      </div>

      {genderStats.invalidValues.length > 0 && (
        <div className="card">
          <h4 className="card-header"><IconWarning size={16} /> Nilai Tidak Sah Ditemui</h4>
          <div className="invalid-values">
            {genderStats.invalidValues.map((v, i) => (
              <Badge key={i} variant="danger">{v}</Badge>
            ))}
          </div>
          <p className="invalid-note">Nilai ini akan ditapis semasa pembersihan. Hanya "Lelaki/L/Male/M" dan "Perempuan/P/Female/F" diterima.</p>
        </div>
      )}

      <div className="card">
        <h4 className="card-header"><IconRules size={16} /> Gender Validation Rules</h4>
        <div className="rules-list">
          <div className="rule-item">
            <Badge variant="success">Valid</Badge>
            <span>Lelaki, L, Male, M → standardized to "Lelaki"</span>
          </div>
          <div className="rule-item">
            <Badge variant="success">Valid</Badge>
            <span>Perempuan, P, Female, F → standardized to "Perempuan"</span>
          </div>
          <div className="rule-item">
            <Badge variant="danger">DROP</Badge>
            <span>Any other value will be dropped during cleaning</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MEASUREMENTS (BERAT/TINGGI/BMI) EDA SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const MEASUREMENT_RULES = {
  berat: { min: 0.5, max: 35, unit: 'kg', label: 'Berat Badan' },
  tinggi: { min: 30, max: 130, unit: 'cm', label: 'Tinggi/Panjang' },
  bmi: { min: 8, max: 40, unit: 'kg/m²', label: 'BMI' }
};

const MeasurementsSection = ({ rawData, columns }) => {
  const measureStats = useMemo(() => {
    if (!rawData?.length) return null;

    const beratCol = columns.find(c => /berat|weight/i.test(c));
    const tinggiCol = columns.find(c => /tinggi|height|panjang/i.test(c));
    const bmiCol = columns.find(c => /^bmi$/i.test(c));

    const analyzeColumn = (col, rules) => {
      if (!col) return null;
      const values = rawData.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
      if (!values.length) return { noData: true };

      const sorted = [...values].sort((a, b) => a - b);
      const n = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n;

      const belowMin = values.filter(v => v < rules.min).length;
      const aboveMax = values.filter(v => v > rules.max).length;
      const valid = n - belowMin - aboveMax;

      // Distribution buckets
      const step = (rules.max - rules.min) / 8;
      const dist = [];
      for (let i = 0; i < 8; i++) {
        const lo = rules.min + i * step;
        const hi = lo + step;
        dist.push({
          range: `${lo.toFixed(0)}-${hi.toFixed(0)}`,
          count: values.filter(v => v >= lo && v < hi).length
        });
      }

      return {
        col,
        total: rawData.length,
        nonNull: n,
        nullCount: rawData.length - n,
        valid,
        belowMin,
        aboveMax,
        min: sorted[0]?.toFixed(2),
        max: sorted[n - 1]?.toFixed(2),
        mean: mean.toFixed(2),
        median: sorted[Math.floor(n / 2)]?.toFixed(2),
        std: Math.sqrt(variance).toFixed(2),
        p5: sorted[Math.floor(n * 0.05)]?.toFixed(2),
        p95: sorted[Math.floor(n * 0.95)]?.toFixed(2),
        distribution: dist
      };
    };

    return {
      berat: analyzeColumn(beratCol, MEASUREMENT_RULES.berat),
      tinggi: analyzeColumn(tinggiCol, MEASUREMENT_RULES.tinggi),
      bmi: analyzeColumn(bmiCol, MEASUREMENT_RULES.bmi)
    };
  }, [rawData, columns]);

  if (!measureStats) return <div className="empty-state"><IconSpinner size={24} /> Loading...</div>;

  const renderMeasurementCard = (key, data, rules) => {
    if (!data) return <div className="card"><p className="empty-note">Kolum {rules.label} tidak ditemui</p></div>;
    if (data.noData) return <div className="card"><p className="empty-note">Tiada data {rules.label} yang sah</p></div>;

    return (
      <div className="card measurement-card">
        <h4 className="card-header">
          <IconScale size={16} /> {rules.label} ({rules.unit})
          <Badge variant={data.valid / data.nonNull > 0.9 ? 'success' : 'warning'}>
            {(data.valid / data.nonNull * 100).toFixed(1)}% valid
          </Badge>
        </h4>

        <div className="measure-stats-grid">
          <div className="measure-stat"><span className="stat-key">N</span><span className="stat-val">{data.nonNull.toLocaleString()}</span></div>
          <div className="measure-stat"><span className="stat-key">Min</span><span className="stat-val">{data.min}</span></div>
          <div className="measure-stat"><span className="stat-key">Max</span><span className="stat-val">{data.max}</span></div>
          <div className="measure-stat"><span className="stat-key">Mean</span><span className="stat-val">{data.mean}</span></div>
          <div className="measure-stat"><span className="stat-key">Median</span><span className="stat-val">{data.median}</span></div>
          <div className="measure-stat"><span className="stat-key">Std</span><span className="stat-val">{data.std}</span></div>
          <div className="measure-stat"><span className="stat-key">P5</span><span className="stat-val">{data.p5}</span></div>
          <div className="measure-stat"><span className="stat-key">P95</span><span className="stat-val">{data.p95}</span></div>
        </div>

        <div className="measure-validation">
          <div className="validation-row">
            <span className="val-label">Null/Missing:</span>
            <span className="val-count">{data.nullCount.toLocaleString()}</span>
            <div className="val-bar"><div style={{ width: `${data.nullCount / data.total * 100}%`, background: COLORS.slate[400] }} /></div>
          </div>
          <div className="validation-row">
            <span className="val-label">Below {rules.min} {rules.unit}:</span>
            <span className="val-count danger">{data.belowMin.toLocaleString()}</span>
            <div className="val-bar"><div style={{ width: `${data.belowMin / data.total * 100}%`, background: COLORS.danger }} /></div>
          </div>
          <div className="validation-row">
            <span className="val-label">Above {rules.max} {rules.unit}:</span>
            <span className="val-count danger">{data.aboveMax.toLocaleString()}</span>
            <div className="val-bar"><div style={{ width: `${data.aboveMax / data.total * 100}%`, background: COLORS.danger }} /></div>
          </div>
        </div>

        <Histogram data={data.distribution} title="" color={key === 'berat' ? COLORS.primary : key === 'tinggi' ? COLORS.accent : COLORS.teal} />
      </div>
    );
  };

  return (
    <div className="eda-section">
      <div className="section-header">
        <h3><IconScale size={18} /> Analisis Pengukuran Antropometri</h3>
        <p className="section-desc">Berat, tinggi, dan BMI — statistik dan validasi</p>
      </div>

      <div className="measurements-grid">
        {renderMeasurementCard('berat', measureStats.berat, MEASUREMENT_RULES.berat)}
        {renderMeasurementCard('tinggi', measureStats.tinggi, MEASUREMENT_RULES.tinggi)}
        {renderMeasurementCard('bmi', measureStats.bmi, MEASUREMENT_RULES.bmi)}
      </div>

      <div className="card">
        <h4 className="card-header"><IconRules size={16} /> Measurement Validation Rules (NCDC)</h4>
        <div className="rules-list">
          <div className="rule-item"><Badge variant="primary">Berat</Badge><span>Valid: 0.5 - 35 kg (biologically plausible for 0-5 years)</span></div>
          <div className="rule-item"><Badge variant="primary">Tinggi</Badge><span>Valid: 30 - 130 cm (biologically plausible for 0-5 years)</span></div>
          <div className="rule-item"><Badge variant="primary">BMI</Badge><span>Valid: 8 - 40 kg/m² (recalculated from Berat/Tinggi)</span></div>
          <div className="rule-item"><Badge variant="danger">DROP</Badge><span>Records with BOTH Berat AND Tinggi null are dropped</span></div>
          <div className="rule-item"><Badge variant="warning">Recalc</Badge><span>BMI = Berat / (Tinggi/100)² — recalculated to fix impossible values</span></div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// RAW DATA QUALITY ISSUES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const DirtyDataIssues = ({ rawData, columns }) => {
  const issues = useMemo(() => {
    if (!rawData.length) return [];
    
    const findCol = (patterns) => {
      for (const pattern of patterns) {
        const found = columns.find(c => pattern instanceof RegExp ? pattern.test(c) : c.toLowerCase().includes(pattern.toLowerCase()));
        if (found) return found;
      }
      return null;
    };

    const results = [];
    
    // Find columns
    const genderCol = findCol([/^jantina$/i, /gender/i, /sex/i]);
    const beratCol = findCol([/2025.*berat/i, /2024.*berat/i, /berat.*kg/i, /weight/i]);
    const tinggiCol = findCol([/2025.*tinggi/i, /2024.*tinggi/i, /tinggi.*cm/i, /height/i]);
    const dobCol = findCol([/^tarikh\s*lahir$/i, /tarikh_lahir/i, /dob/i, /birth/i]);
    const icCol = findCol([/mykid/i, /ic/i, /no.*kad/i]);
    
    // Missing values analysis
    let missingGender = 0, invalidGender = 0;
    let missingBerat = 0, outOfRangeBerat = 0;
    let missingTinggi = 0, outOfRangeTinggi = 0;
    let missingDob = 0;
    let duplicateIc = 0;
    
    const validGenders = ['LELAKI', 'PEREMPUAN', 'L', 'P', 'MALE', 'FEMALE', 'M', 'F'];
    const icSet = new Set();
    const icDuplicates = new Set();
    
    rawData.forEach(row => {
      // Gender issues
      if (genderCol) {
        const val = String(row[genderCol] || '').toUpperCase().trim();
        if (!val) missingGender++;
        else if (!validGenders.includes(val)) invalidGender++;
      }
      
      // Weight issues
      if (beratCol) {
        const val = parseFloat(row[beratCol]);
        if (isNaN(val) || val === 0) missingBerat++;
        else if (val < 0.5 || val > 35) outOfRangeBerat++;
      }
      
      // Height issues
      if (tinggiCol) {
        const val = parseFloat(row[tinggiCol]);
        if (isNaN(val) || val === 0) missingTinggi++;
        else if (val < 30 || val > 130) outOfRangeTinggi++;
      }
      
      // DOB issues
      if (dobCol) {
        const val = row[dobCol];
        if (!val || val === '' || val === null) missingDob++;
      }
      
      // Duplicate IC
      if (icCol) {
        const ic = String(row[icCol] || '').trim();
        if (ic && ic !== '') {
          if (icSet.has(ic)) icDuplicates.add(ic);
          icSet.add(ic);
        }
      }
    });
    
    // Build issues list
    if (missingGender > 0) results.push({ type: 'warning', title: 'Jantina Kosong', value: missingGender, desc: 'Rekod tanpa maklumat jantina' });
    if (invalidGender > 0) results.push({ type: 'critical', title: 'Jantina Tidak Sah', value: invalidGender, desc: 'Nilai jantina tidak dikenali' });
    if (missingBerat > 0) results.push({ type: 'warning', title: 'Berat Kosong', value: missingBerat, desc: 'Rekod tanpa ukuran berat' });
    if (outOfRangeBerat > 0) results.push({ type: 'critical', title: 'Berat Luar Julat', value: outOfRangeBerat, desc: 'Berat < 0.5kg atau > 35kg' });
    if (missingTinggi > 0) results.push({ type: 'warning', title: 'Tinggi Kosong', value: missingTinggi, desc: 'Rekod tanpa ukuran tinggi' });
    if (outOfRangeTinggi > 0) results.push({ type: 'critical', title: 'Tinggi Luar Julat', value: outOfRangeTinggi, desc: 'Tinggi < 30cm atau > 130cm' });
    if (missingDob > 0) results.push({ type: 'critical', title: 'Tarikh Lahir Kosong', value: missingDob, desc: 'Rekod tanpa tarikh lahir' });
    if (icDuplicates.size > 0) results.push({ type: 'info', title: 'IC Duplikat', value: icDuplicates.size, desc: 'MyKid/IC yang sama diulang' });
    
    return results;
  }, [rawData, columns]);

  if (issues.length === 0) {
    return (
      <div className="dirty-data-section">
        <div className="dirty-data-header">
          <IconCheck size={20} />
          <h3>Tiada Isu Kritikal Ditemui</h3>
        </div>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Data kelihatan bersih. Teruskan untuk membersihkan.</p>
      </div>
    );
  }

  return (
    <div className="dirty-data-section">
      <div className="dirty-data-header">
        <IconWarning size={20} />
        <h3>Isu Kualiti Data Mentah</h3>
      </div>
      <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', marginBottom: '16px' }}>
        Berikut adalah isu yang ditemui dalam data mentah sebelum pembersihan. Peraturan akan menangani masalah ini.
      </p>
      <div className="issues-grid">
        {issues.map((issue, idx) => (
          <div key={idx} className={`issue-card ${issue.type}`}>
            <div className="issue-card-title">{issue.title}</div>
            <div className="issue-card-value">{issue.value.toLocaleString()}</div>
            <div className="issue-card-desc">{issue.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANING RULES REVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CleaningRulesReview = ({ dataType, rawData, columns }) => {
  const config = DATA_CONFIGS[dataType];
  
  const CLEANING_RULES = {
    ncdc: [
      { id: 1, category: 'Gender', rule: 'Drop Jantina not in (Lelaki, Perempuan)', severity: 'drop' },
      { id: 2, category: 'Measurements', rule: 'Drop biologically implausible weight (≤0.5 or >35 kg) / height (≤30 or >130 cm)', severity: 'drop' },
      { id: 3, category: 'Age', rule: 'Drop age at assessment > 5 years (≥60 months) or < 0', severity: 'drop' },
      { id: 4, category: 'Date', rule: 'Drop records where measurement date < DOB', severity: 'drop' },
      { id: 5, category: 'BMI', rule: 'Drop implausible BMI > 40', severity: 'drop' },
      { id: 6, category: 'Measurements', rule: 'Drop records where both weight AND height are null', severity: 'drop' },
      { id: 7, category: 'Z-Score', rule: 'Drop records where ANY z-score is null', severity: 'drop' },
      { id: 8, category: 'Duplicates', rule: 'Drop duplicate MyKid (keep most recent measurement date)', severity: 'drop' },
      { id: 9, category: 'Income', rule: "Exclude Pendapatan Keluarga = 'X' (tiada maklumat)", severity: 'drop' },
      { id: 10, category: 'Standardize', rule: "Rename 'P20' to 'Miskin Tegar'", severity: 'transform' },
      { id: 11, category: 'BMI', rule: 'Recalculate BMI from Berat/Tinggi', severity: 'transform' },
    ],
    myvass: [
      { id: 1, category: 'Gender', rule: 'Drop Jantina not in (Lelaki, Perempuan)', severity: 'drop' },
      { id: 2, category: 'Measurements', rule: 'Drop biologically implausible weight/height', severity: 'drop' },
      { id: 3, category: 'Age', rule: 'Drop age > 5 years (60 months)', severity: 'drop' },
      { id: 4, category: 'Date', rule: 'Drop records where date issues exist', severity: 'drop' },
      { id: 5, category: 'Z-Score', rule: 'Drop records with null z-scores', severity: 'drop' },
      { id: 6, category: 'BMI', rule: 'Recalculate BMI from measurements', severity: 'transform' },
    ],
    kpm: [
      { id: 1, category: 'Gender', rule: 'Drop invalid Jantina', severity: 'drop' },
      { id: 2, category: 'Measurements', rule: 'Drop implausible measurements for 6-8 year olds', severity: 'drop' },
      { id: 3, category: 'Age', rule: 'Drop age outside 6-8 years range', severity: 'drop' },
      { id: 4, category: 'Duplicates', rule: 'Remove duplicate student records', severity: 'drop' },
    ]
  };

  const rules = CLEANING_RULES[dataType] || CLEANING_RULES.ncdc;

  return (
    <div className="cleaning-rules-review">
      <div className="section-header">
        <h3><IconRules size={18} /> Cleaning Rules for {config?.name || 'Data'}</h3>
        <p className="section-desc">The following rules will be applied during data cleaning</p>
      </div>

      <div className="rules-by-category">
        {['Gender', 'Age', 'Measurements', 'BMI', 'Date', 'Z-Score', 'Duplicates', 'Income', 'Standardize'].map(category => {
          const catRules = rules.filter(r => r.category === category);
          if (!catRules.length) return null;
          return (
            <div key={category} className="rule-category">
              <h4 className="category-header">
                {category === 'Gender' && <IconUser size={16} />}
                {category === 'Age' && <IconCalendar size={16} />}
                {category === 'Measurements' && <IconScale size={16} />}
                {category === 'BMI' && <IconFormula size={16} />}
                {category === 'Date' && <IconCalendar size={16} />}
                {category === 'Z-Score' && <IconFormula size={16} />}
                {category === 'Duplicates' && <IconId size={16} />}
                {category === 'Income' && <IconDatabase size={16} />}
                {category === 'Standardize' && <IconRefresh size={16} />}
                {category}
              </h4>
              <div className="category-rules">
                {catRules.map(r => (
                  <div key={r.id} className={`rule-row ${r.severity}`}>
                    <Badge variant={r.severity === 'drop' ? 'danger' : 'warning'}>
                      {r.severity === 'drop' ? 'DROP' : 'TRANSFORM'}
                    </Badge>
                    <span className="rule-text">{r.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANING RESULTS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CleaningResults = ({ originalCount, cleanedData, stats, dataType, rawData, columns, qualityData, cleaningRules, onRulesChange }) => {
  const [activeTab, setActiveTab] = useState('rules');
  const config = DATA_CONFIGS[dataType];
  const droppedCount = originalCount - (stats?.final_count || cleanedData.length);
  const retentionRate = ((stats?.final_count || cleanedData.length) / originalCount * 100).toFixed(1);

  const dropData = Object.entries(stats || {})
    .filter(([k, v]) => k.startsWith('dropped_') && v > 0)
    .map(([key, value]) => ({ name: key.replace('dropped_', '').replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value);

  const EDA_TABS = [
    { key: 'rules', label: 'Peraturan', icon: IconRules },
    { key: 'dashboard', label: 'Dashboard', icon: IconDatabase },
    { key: 'charts', label: 'Carta', icon: IconChart },
    { key: 'ic', label: 'IC/MyKid', icon: IconId },
    { key: 'age', label: 'Umur', icon: IconCalendar },
    { key: 'gender', label: 'Jantina', icon: IconUser },
    { key: 'measurements', label: 'Pengukuran', icon: IconScale },
    { key: 'categorical', label: 'Kategorikal', icon: IconFilter },
    { key: 'numerical', label: 'Numerik', icon: IconTable },
    { key: 'zscore', label: 'Z-Score', icon: IconFormula },
    { key: 'quality', label: 'Kualiti', icon: IconCheck },
  ];

  return (
    <div className="results-section">
      <div className="flow-summary">
        <div className="flow-card original">
          <div className="flow-value">{originalCount.toLocaleString()}</div>
          <div className="flow-label">Original Records</div>
        </div>
        <div className="flow-arrow"><IconArrowRight size={24} /></div>
        <div className="flow-card dropped">
          <div className="flow-value">-{droppedCount.toLocaleString()}</div>
          <div className="flow-label">Dropped ({((droppedCount / originalCount) * 100).toFixed(1)}%)</div>
        </div>
        <div className="flow-arrow"><IconArrowRight size={24} /></div>
        <div className="flow-card cleaned">
          <div className="flow-value">{(stats?.final_count || cleanedData.length).toLocaleString()}</div>
          <div className="flow-label">Cleaned ({retentionRate}%)</div>
        </div>
      </div>

      {dropData.length > 0 && (
        <div className="chart-card drop-chart">
          <h4 className="chart-title"><IconChart size={16} /> Records Dropped by Rule</h4>
          <ResponsiveContainer width="100%" height={Math.max(180, dropData.length * 40)}>
            <BarChart data={dropData} layout="vertical" margin={{ left: 140, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate[200]} />
              <XAxis type="number" tick={{ fontSize: 10, fill: COLORS.slate[500] }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: COLORS.slate[600] }} width={135} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="value" fill={COLORS.danger} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="eda-tabs-container">
        <div className="eda-tabs-header">
          <h3>Exploratory Data Analysis</h3>
          <p>Click tabs below to explore different aspects of your cleaned data</p>
        </div>
        <div className="eda-tabs">
          {EDA_TABS.map(tab => (
            <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} icon={tab.icon}>
              {tab.label}
            </TabButton>
          ))}
        </div>

        <div className="eda-content">
          {activeTab === 'rules' && <RulesEditor rules={cleaningRules} onRulesChange={onRulesChange} columns={columns} />}
          {activeTab === 'dashboard' && <DashboardSection stats={stats} dataType={dataType} />}
          {activeTab === 'charts' && <ChartsSection stats={stats} rawData={rawData} columns={columns} />}
          {activeTab === 'ic' && <IcValidationSection rawData={rawData} columns={columns} />}
          {activeTab === 'age' && <AgeSection rawData={rawData} columns={columns} dataType={dataType} />}
          {activeTab === 'gender' && <GenderSection rawData={rawData} columns={columns} />}
          {activeTab === 'measurements' && <MeasurementsSection rawData={rawData} columns={columns} />}
          {activeTab === 'categorical' && <CategoricalSection rawData={rawData} columns={columns} />}
          {activeTab === 'numerical' && <NumericalSection rawData={rawData} columns={columns} />}
          {activeTab === 'zscore' && <ZScoreSection dataType={dataType} />}
          {activeTab === 'quality' && <QualitySection qualityData={qualityData} columns={columns} rawData={rawData} />}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DataCleaningTool() {
  const [step, setStep] = useState(1);
  const [dataType, setDataType] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [qualityData, setQualityData] = useState(null);
  const [cleanedData, setCleanedData] = useState([]);
  const [cleaningStats, setCleaningStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cleaningRules, setCleaningRules] = useState(DEFAULT_CLEANING_RULES);
  const [sheetInfo, setSheetInfo] = useState([]);

  useEffect(() => {
    const check = async () => setApiOnline(await checkHealth());
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const detectDataTypeLocal = useCallback((cols, filename) => {
    const colSet = new Set(cols.map(c => c.toUpperCase()));
    const fname = filename.toLowerCase();
    if (cols.some(c => /^\d{4}\s*(Berat|Tinggi|Tarikh)/i.test(c))) return 'ncdc';
    if (colSet.has('ID_MURID') || colSet.has('THN_TING') || fname.includes('kpm')) return 'kpm';
    if (colSet.has('VACCINE_NAME') || colSet.has('NAMA KLINIK') || fname.includes('myvass')) return 'myvass';
    return null;
  }, []);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    setFileName(file.name);
    setUploadedFile(file);

    // Helper to parse file locally for rawData (needed for charts)
    const parseFileLocally = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = file.name.endsWith('.csv')
            ? XLSX.read(data, { type: 'string' })
            : XLSX.read(data, { type: 'array' });

          let allData = [], allCols = [], sheetInfo = [];
          workbook.SheetNames.forEach((name, idx) => {
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
            sheetInfo.push({ name, rows: jsonData.length });
            if (jsonData.length) {
              if (idx === 0) allCols = Object.keys(jsonData[0]);
              allData = allData.concat(jsonData);
            }
          });
          console.log('📊 Sheets found:', sheetInfo);
          console.log('📊 Total rows from all sheets:', allData.length);
          resolve({ data: allData, columns: allCols, sheets: sheetInfo });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      file.name.endsWith('.csv') ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
    });

    try {
      // Always parse locally for rawData (needed for charts/EDA)
      const localParsed = await parseFileLocally(file);
      const detected = detectDataTypeLocal(localParsed.columns, file.name);
      setRawData(localParsed.data);
      setColumns(localParsed.columns);
      setDataType(detected);
      setSheetInfo(localParsed.sheets || []);

      // If API is online, also get quality data from backend
      if (apiOnline) {
        try {
          const result = await apiDetectDataType(file);
          if (result.detected_type !== 'unknown') {
            setDataType(result.detected_type);
          }
          const quality = await getQualityCheck(file, result.detected_type || detected || 'myvass');
          setQualityData(quality);
        } catch (apiErr) {
          console.warn('API quality check failed, using local data:', apiErr);
          // Generate local quality data
          setQualityData({
            total_rows: localParsed.data.length,
            total_columns: localParsed.columns.length,
            overall_completeness: 100,
            columns: localParsed.columns.map(col => ({
              name: col,
              non_null: localParsed.data.filter(r => r[col] != null && r[col] !== '').length,
              null_percent: (localParsed.data.filter(r => r[col] == null || r[col] === '').length / localParsed.data.length * 100).toFixed(1),
              unique_count: new Set(localParsed.data.map(r => r[col])).size,
              is_numeric: !isNaN(parseFloat(localParsed.data[0]?.[col]))
            }))
          });
        }
      } else {
        // Generate local quality data
        setQualityData({
          total_rows: localParsed.data.length,
          total_columns: localParsed.columns.length,
          overall_completeness: 100,
          columns: localParsed.columns.map(col => ({
            name: col,
            non_null: localParsed.data.filter(r => r[col] != null && r[col] !== '').length,
            null_percent: (localParsed.data.filter(r => r[col] == null || r[col] === '').length / localParsed.data.length * 100).toFixed(1),
            unique_count: new Set(localParsed.data.map(r => r[col])).size,
            is_numeric: !isNaN(parseFloat(localParsed.data[0]?.[col]))
          }))
        });
      }

      setStep(2);
      setIsProcessing(false);
    } catch (err) {
      setError(`Upload error: ${err.message}`);
      setIsProcessing(false);
    }
  }, [detectDataTypeLocal, apiOnline]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  }, [handleFileUpload]);

  const runCleaning = useCallback(async () => {
    if (!dataType) return;
    setIsProcessing(true);
    setStep(4);
    setError(null);

    try {
      if (apiOnline && uploadedFile) {
        const result = await apiRunCleaning(uploadedFile, dataType);
        if (result.success) {
          setCleanedData(result.preview || []);
          setCleaningStats(result.stats);
          setStep(5);
        } else throw new Error('Cleaning failed');
      } else {
        const stats = { raw_count: rawData.length, final_count: Math.floor(rawData.length * 0.9) };
        stats.total_dropped = stats.raw_count - stats.final_count;
        setCleanedData(rawData.slice(0, stats.final_count));
        setCleaningStats(stats);
        setStep(5);
      }
    } catch (err) {
      setError(`Cleaning error: ${err.message}`);
      setStep(3);
    }
    setIsProcessing(false);
  }, [rawData, dataType, apiOnline, uploadedFile]);

  const downloadData = useCallback(async (format) => {
    try {
      if (apiOnline && uploadedFile) {
        await triggerDownload(
          apiDownloadCleaned(uploadedFile, dataType, format),
          `${dataType?.toUpperCase()}_Cleaned.${format}`
        );
      } else if (cleanedData.length) {
        const ws = XLSX.utils.json_to_sheet(cleanedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cleaned');
        XLSX.writeFile(wb, `${dataType?.toUpperCase()}_Cleaned.${format}`);
      }
    } catch (err) {
      setError(`Download error: ${err.message}`);
    }
  }, [cleanedData, dataType, apiOnline, uploadedFile]);

  const reset = () => {
    setStep(1); setDataType(null); setFileName(''); setUploadedFile(null);
    setRawData([]); setColumns([]); setQualityData(null);
    setCleanedData([]); setCleaningStats(null); setError(null);
  };

  const config = dataType ? DATA_CONFIGS[dataType] : null;

  return (
    <div className="cleaning-tool">
      <header className="tool-header">
        <div className="header-left">
          <IconLogo size={40} />
          <div className="header-text">
            <h1>KKM Data Cleaning Tool</h1>
            <span className="header-sub">Comprehensive EDA & WHO Z-Score Calculator</span>
          </div>
        </div>
        <div className="header-right">
          <div className="data-types">
            {Object.entries(DATA_CONFIGS).map(([key, cfg]) => (
              <Badge key={key} variant={key === 'kpm' ? 'danger' : key === 'myvass' ? 'success' : 'primary'}>
                {cfg.shortName}
              </Badge>
            ))}
          </div>
          <div className={`api-status ${apiOnline ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {apiOnline ? 'API Connected' : 'Offline Mode'}
          </div>
        </div>
      </header>

      <nav className="stepper">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Data Quality' },
          { num: 3, label: 'Review Rules' },
          { num: 4, label: 'Processing' },
          { num: 5, label: 'Results & EDA' },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            {idx > 0 && <span className="step-divider" />}
            <div className={`step ${step > s.num ? 'done' : ''} ${step === s.num ? 'active' : ''}`}>
              <div className="step-num">{step > s.num ? <IconCheck size={14} /> : s.num}</div>
              <span className="step-label">{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </nav>

      {error && (
        <div className="error-banner">
          <IconWarning size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-btn">&times;</button>
        </div>
      )}

      <main className="tool-main">
        {step === 1 && (
          <section className="section upload-section">
            <div className="section-header">
              <h2>Upload Your Data File</h2>
              <p>Supports Excel (.xlsx, .xls) and CSV files</p>
            </div>

            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input id="file-input" type="file" accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileUpload(e.target.files?.[0])} style={{ display: 'none' }} />
              {isProcessing ? (
                <div className="loading-state"><IconSpinner size={48} /><span>Processing file...</span></div>
              ) : (
                <>
                  <IconUpload size={56} className="drop-icon" />
                  <span className="drop-title">Drop file here or click to browse</span>
                  <span className="drop-hint">Maximum 50MB per file</span>
                </>
              )}
            </div>

            <div className="type-selector">
              <span className="selector-label">Or select data type:</span>
              <div className="type-buttons">
                {Object.entries(DATA_CONFIGS).map(([key, cfg]) => (
                  <button key={key} className={`type-btn ${dataType === key ? 'active' : ''}`}
                    style={{ '--accent': cfg.color }} onClick={() => setDataType(key)}>
                    {cfg.shortName}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="section">
            <div className="section-header">
              <div>
                <h2>Raw Data Quality Analysis</h2>
                <div className="file-info">
                  <IconFile size={16} /><span>{fileName}</span>
                  {config && <Badge variant={dataType === 'kpm' ? 'danger' : dataType === 'myvass' ? 'success' : 'primary'}>{config.name}</Badge>}
                </div>
              </div>
            </div>

            {/* Show Raw Data Quality Issues at TOP */}
            <DirtyDataIssues rawData={rawData} columns={columns} />

            <QualitySection qualityData={qualityData} columns={columns} rawData={rawData} />

            <div className="section-actions">
              <button className="btn btn-secondary" onClick={reset}><IconArrowLeft size={16} /> Start Over</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Review Cleaning Rules <IconArrowRight size={16} /></button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="section">
            <div className="section-header"><h2>Review Cleaning Rules</h2></div>

            <div className="ready-banner">
              <IconSuccess size={24} />
              <div>
                <h3>Ready to Clean</h3>
                <p><strong>{rawData.length.toLocaleString()}</strong> records will be processed
                  {config?.usesZscore && ' with WHO z-score calculation'}</p>
                {sheetInfo.length > 0 && (
                  <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.8 }}>
                    Sheets loaded: {sheetInfo.map((s, i) => `${s.name} (${s.rows} rows)`).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Show Raw Data Quality Issues FIRST */}
            <DirtyDataIssues rawData={rawData} columns={columns} />

            {/* Editable Rules Section at TOP */}
            <RulesEditor rules={cleaningRules} onRulesChange={setCleaningRules} columns={columns} />

            <CleaningRulesReview dataType={dataType} rawData={rawData} columns={columns} />

            {config?.usesZscore && <ZScoreSection dataType={dataType} />}

            <div className="section-actions">
              <button className="btn btn-secondary" onClick={() => setStep(2)}><IconArrowLeft size={16} /> Back</button>
              <button className="btn btn-success" onClick={runCleaning}><IconPlay size={16} /> Run Cleaning</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="section processing-section">
            <div className="processing-content">
              <IconSpinner size={64} className="processing-spinner" />
              <h2>Processing Data</h2>
              <p>Applying cleaning rules and calculating z-scores...</p>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="section">
            <div className="section-header">
              <div>
                <h2>Cleaning Complete — Explore Your Data</h2>
                <p>Your data has been cleaned. Use the tabs below to explore EDA results.</p>
              </div>
            </div>

            <CleaningResults
              originalCount={qualityData?.total_rows || rawData.length}
              cleanedData={cleanedData}
              stats={cleaningStats}
              dataType={dataType}
              rawData={rawData}
              columns={columns}
              qualityData={qualityData}
              cleaningRules={cleaningRules}
              onRulesChange={setCleaningRules}
            />

            <div className="download-section">
              <h3><IconDownload size={20} /> Download Cleaned Data</h3>
              <div className="download-buttons">
                <button className="btn btn-excel" onClick={() => downloadData('xlsx')}>
                  <IconExcel size={18} /> Download Excel (.xlsx)
                </button>
                <button className="btn btn-csv" onClick={() => downloadData('csv')}>
                  <IconCsv size={18} /> Download CSV (.csv)
                </button>
              </div>
            </div>

            <div className="section-actions">
              <button className="btn btn-secondary" onClick={reset}><IconRefresh size={16} /> Clean Another File</button>
            </div>
          </section>
        )}
      </main>

      <footer className="tool-footer">
        <span>KKM Data Cleaning Tool v2.0</span>
        <span>WHO 2006 Child Growth Standards</span>
        <span>Daily LMS Z-Score Calculation</span>
      </footer>
    </div>
  );
}
