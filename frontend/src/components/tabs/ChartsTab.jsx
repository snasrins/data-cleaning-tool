import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import DataTable from '../DataTable.jsx';

const COLORS = ['#38d9c0','#8b5cf6','#faad14','#ef4444','#3b82f6','#10b981','#f97316','#ec4899','#06b6d4','#a855f7'];
const DARK_TT = { contentStyle: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: '0.75rem' } };

function Histogram({ data, title, color = '#38d9c0' }) {
  if (!data?.length) return null;
  return (
    <div className="chart-section">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#999' }} interval={1} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: '#999' }} />
          <Tooltip {...DARK_TT} />
          <Bar dataKey="count" fill={color} radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HBarChart({ data, title, color = '#38d9c0', labelKey, countKey = 'count' }) {
  if (!data?.length) return null;
  const lk = labelKey || Object.keys(data[0]).find((k) => typeof data[0][k] === 'string') || Object.keys(data[0])[0];
  return (
    <div className="chart-section">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#999' }} />
          <YAxis type="category" dataKey={lk} tick={{ fontSize: 11, fill: '#ccc' }} width={75} />
          <Tooltip {...DARK_TT} />
          <Bar dataKey={countKey} fill={color} radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutChart({ data, title }) {
  if (!data?.length) return null;
  return (
    <div className="chart-section">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%"
            innerRadius={55} outerRadius={100} paddingAngle={2}
            label={({ label, percent }) => `${label} ${(percent * 100).toFixed(1)}%`}
            labelLine={{ stroke: '#666' }}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip {...DARK_TT} />
          <Legend wrapperStyle={{ fontSize: '0.72rem', color: '#aaa' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendLine({ data, title }) {
  if (!data?.length) return null;
  const keys = Object.keys(data[0]).filter((k) => k !== 'tahun_ukur' && k !== 'n_total');
  return (
    <div className="chart-section">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="tahun_ukur" tick={{ fontSize: 11, fill: '#999' }} />
          <YAxis tick={{ fontSize: 10, fill: '#999' }} />
          <Tooltip {...DARK_TT} />
          <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <DataTable rows={data} />
    </div>
  );
}

function ScatterPlot({ data, color = '#38d9c0' }) {
  if (!data?.points?.length) return null;
  return (
    <div className="chart-section">
      <div className="chart-title">{data.title}</div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" dataKey="x" name={data.x_label} tick={{ fontSize: 10, fill: '#999' }} />
          <YAxis type="number" dataKey="y" name={data.y_label} tick={{ fontSize: 10, fill: '#999' }} />
          <ZAxis range={[15, 15]} />
          <Tooltip {...DARK_TT} cursor={{ strokeDasharray: '3 3' }}
            formatter={(val, name) => [val, name === 'x' ? data.x_label : data.y_label]} />
          <Scatter data={data.points} fill={color} fillOpacity={0.4} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ChartsTab({ charts }) {
  if (!charts || !Object.keys(charts).length) {
    return <div className="card"><div className="card-title">Carta</div><p style={{ color: 'var(--muted)' }}>Tiada data carta tersedia.</p></div>;
  }
  return (
    <div className="card">
      <div className="card-title">Visualisasi Data</div>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 14, lineHeight: 1.7 }}>
        Histogram menunjukkan taburan data, carta pai untuk komposisi kategori, carta garis untuk trend,
        dan scatter plot untuk hubungan antara pembolehubah.
      </p>

      <Histogram data={charts.bmi_distribution} title="Taburan BMI" color="#38d9c0" />
      <Histogram data={charts.berat_kg_distribution} title="Taburan Berat (kg)" color="#3b82f6" />
      <Histogram data={charts.tinggi_cm_distribution} title="Taburan Tinggi (cm)" color="#8b5cf6" />
      <Histogram data={charts.age_months_computed_distribution} title="Taburan Umur (bulan)" color="#f97316" />

      <DonutChart data={charts.status_bmi_pie} title="Status BMI (Kumpulan)" />
      <HBarChart data={charts.gender_split} title="Pecahan Jantina" color="#38d9c0" />
      <HBarChart data={charts.records_by_negeri} title="Rekod Mengikut Negeri (Top 15)" color="#8b5cf6" labelKey="negeri" />

      <TrendLine data={charts.trend_by_year} title="Trend Tahunan" />

      <ScatterPlot data={charts.scatter_berat_kg_vs_tinggi_cm} color="#3b82f6" />
      <ScatterPlot data={charts.scatter_bmi_vs_age_months_computed} color="#ef4444" />
    </div>
  );
}
