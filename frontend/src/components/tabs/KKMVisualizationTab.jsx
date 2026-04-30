import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie
} from 'recharts';
import SvgIcon from '../SvgIcon.jsx';

export default function KKMVisualizationTab({ cleanedData }) {
  const [activeChart, setActiveChart] = useState('overview');

  if (!cleanedData || cleanedData.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <SvgIcon name="chartDown" size={48} color="var(--muted)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: '0.9rem' }}>No data available for visualization</div>
        </div>
      </div>
    );
  }

  // Helper functions (defined before useMemo)
  const createHistogram = (values, binSize) => {
    if (values.length === 0) return [];
    const min = Math.floor(Math.min(...values) / binSize) * binSize;
    const max = Math.ceil(Math.max(...values) / binSize) * binSize;
    const bins = [];
    
    for (let i = min; i <= max; i += binSize) {
      const count = values.filter(v => v >= i && v < i + binSize).length;
      bins.push({
        bin: `${i.toFixed(1)}`,
        binCenter: i + binSize / 2,
        count: count,
      });
    }
    return bins;
  };

  const calculateStats = (values) => {
    if (values.length === 0) return {};
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    
    return {
      n: values.length,
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
      mean: mean.toFixed(1),
      median: sorted[Math.floor(sorted.length / 2)].toFixed(1),
      std: Math.sqrt(variance).toFixed(1),
      p5: sorted[Math.floor(sorted.length * 0.05)].toFixed(1),
      p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
    };
  };

  // Process data for visualizations
  const processedData = useMemo(() => {
    // Helper to convert to number
    const toNum = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return isNaN(num) ? null : num;
    };

    // Extract numeric values
    const data = cleanedData.map(row => {
      const berat = toNum(row.BERAT || row['BERAT (kg)'] || row.berat_kg);
      const tinggi = toNum(row.TINGGI || row['TINGGI (cm)'] || row.tinggi_cm);
      const bmi = (berat && tinggi) ? (berat / Math.pow(tinggi / 100, 2)) : toNum(row.BMI || row.bmi);
      
      return {
        berat,
        tinggi,
        bmi,
        jantina: row.JANTINA || row.jantina,
        tahun: row.THN_TING || row.thn_ting,
        negeri: row.NEGERI || row.negeri,
      };
    }).filter(d => d.berat !== null || d.tinggi !== null);

    // BMI Categories (WHO for 7-year-olds)
    const bmiCategories = data.map(d => {
      if (!d.bmi) return null;
      if (d.bmi < 13.5) return 'Underweight';
      if (d.bmi < 16.5) return 'Normal';
      if (d.bmi < 18.5) return 'Overweight';
      return 'Obese';
    }).filter(c => c !== null);

    const bmiCategoryData = Object.entries(
      bmiCategories.reduce((acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Histogram data for weight
    const beratHistogram = createHistogram(data.map(d => d.berat).filter(v => v !== null), 2);
    
    // Histogram data for height
    const tinggiHistogram = createHistogram(data.map(d => d.tinggi).filter(v => v !== null), 5);
    
    // Histogram data for BMI
    const bmiHistogram = createHistogram(data.map(d => d.bmi).filter(v => v !== null), 1);

    // Gender breakdown
    const genderData = Object.entries(
      data.reduce((acc, d) => {
        const gender = d.jantina || 'Unknown';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Weight vs Height scatter
    const scatterData = data
      .filter(d => d.berat && d.tinggi)
      .slice(0, 1000) // Limit for performance
      .map(d => ({
        berat: d.berat,
        tinggi: d.tinggi,
        bmi: d.bmi,
        gender: d.jantina
      }));

    // Statistics
    const stats = {
      berat: calculateStats(data.map(d => d.berat).filter(v => v !== null)),
      tinggi: calculateStats(data.map(d => d.tinggi).filter(v => v !== null)),
      bmi: calculateStats(data.map(d => d.bmi).filter(v => v !== null)),
    };

    return {
      data,
      beratHistogram,
      tinggiHistogram,
      bmiHistogram,
      bmiCategoryData,
      genderData,
      scatterData,
      stats,
    };
  }, [cleanedData]);

  const COLORS = ['#4f8ef7', '#f05c6b', '#f6b53d', '#38d9c0', '#8b5cf6'];

  return (
    <div>
      {/* Overview Statistics */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(79,142,247,0.1) 0%, rgba(56,217,192,0.1) 100%)',
        borderColor: 'rgba(79,142,247,0.3)' 
      }}>
        <div className="card-title" style={{ marginBottom: 16 }}>
          KKM ANTHROPOMETRIC STATISTICS
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {/* Weight Stats */}
          <div className="stat-card" style={{ borderLeft: '4px solid #4f8ef7' }}>
            <div className="stat-label">BERAT (kg)</div>
            <div className="stat-val" style={{ fontSize: '1.4rem' }}>{processedData.stats.berat.mean || 'N/A'}</div>
            <div className="stat-sublabel">
              Range: {processedData.stats.berat.min} - {processedData.stats.berat.max} kg
            </div>
          </div>

          {/* Height Stats */}
          <div className="stat-card" style={{ borderLeft: '4px solid #38d9c0' }}>
            <div className="stat-label">TINGGI (cm)</div>
            <div className="stat-val" style={{ fontSize: '1.4rem' }}>{processedData.stats.tinggi.mean || 'N/A'}</div>
            <div className="stat-sublabel">
              Range: {processedData.stats.tinggi.min} - {processedData.stats.tinggi.max} cm
            </div>
          </div>

          {/* BMI Stats */}
          <div className="stat-card" style={{ borderLeft: '4px solid #f6b53d' }}>
            <div className="stat-label">BMI</div>
            <div className="stat-val" style={{ fontSize: '1.4rem' }}>{processedData.stats.bmi.mean || 'N/A'}</div>
            <div className="stat-sublabel">
              Range: {processedData.stats.bmi.min} - {processedData.stats.bmi.max}
            </div>
          </div>

          {/* Sample Size */}
          <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div className="stat-label">Valid Records</div>
            <div className="stat-val" style={{ fontSize: '1.4rem' }}>
              {processedData.stats.berat.n?.toLocaleString() || 'N/A'}
            </div>
            <div className="stat-sublabel">With anthropometric data</div>
          </div>
        </div>
      </div>

      {/* Chart Selector */}
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'overview', label: 'Overview', icon: 'dashboard' },
            { key: 'berat', label: 'Weight Distribution', icon: 'scale' },
            { key: 'tinggi', label: 'Height Distribution', icon: 'ruler' },
            { key: 'bmi', label: 'BMI Distribution', icon: 'chartDown' },
            { key: 'scatter', label: 'Weight vs Height', icon: 'chartUp' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              className={`btn ${activeChart === key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveChart(key)}
            >
              <SvgIcon name={icon} size={14} style={{ marginRight: 4 }} />
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeChart === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Gender Breakdown */}
              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                  Gender Distribution
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={processedData.genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {processedData.genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* BMI Categories */}
              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--accent)' }}>
                  BMI Categories (WHO 7-year-olds)
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={processedData.bmiCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                    <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
                    <Bar dataKey="value" fill="#f6b53d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Weight Distribution */}
        {activeChart === 'berat' && (
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--accent)' }}>
              Weight (BERAT) Distribution — All Students
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={processedData.beratHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="bin" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} label={{ value: 'Weight (kg)', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
                <ReferenceLine x="22" stroke="var(--success)" strokeWidth={2} label={{ value: 'Normal Range', fill: 'var(--success)', fontSize: 10 }} />
                <Bar dataKey="count" fill="#4f8ef7" />
              </BarChart>
            </ResponsiveContainer>
            
            <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.7 }}>
              <strong>Statistics:</strong> Mean: {processedData.stats.berat.mean} kg | Median: {processedData.stats.berat.median} kg | 
              Std Dev: {processedData.stats.berat.std} kg | Range: {processedData.stats.berat.min} - {processedData.stats.berat.max} kg
            </div>
          </div>
        )}

        {/* Height Distribution */}
        {activeChart === 'tinggi' && (
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--accent)' }}>
              Height (TINGGI) Distribution — All Students
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={processedData.tinggiHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="bin" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} label={{ value: 'Height (cm)', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
                <ReferenceLine x="120" stroke="var(--success)" strokeWidth={2} label={{ value: 'Normal Range', fill: 'var(--success)', fontSize: 10 }} />
                <Bar dataKey="count" fill="#38d9c0" />
              </BarChart>
            </ResponsiveContainer>
            
            <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.7 }}>
              <strong>Statistics:</strong> Mean: {processedData.stats.tinggi.mean} cm | Median: {processedData.stats.tinggi.median} cm | 
              Std Dev: {processedData.stats.tinggi.std} cm | Range: {processedData.stats.tinggi.min} - {processedData.stats.tinggi.max} cm
            </div>
          </div>
        )}

        {/* BMI Distribution */}
        {activeChart === 'bmi' && (
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--accent)' }}>
              BMI Distribution — All Students
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={processedData.bmiHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="bin" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} label={{ value: 'BMI', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
                <ReferenceLine x="15" stroke="var(--success)" strokeWidth={2} label={{ value: 'Normal', fill: 'var(--success)', fontSize: 10 }} />
                <ReferenceLine x="13.5" stroke="var(--warn)" strokeDasharray="3 3" label={{ value: 'Underweight', fill: 'var(--warn)', fontSize: 10 }} />
                <ReferenceLine x="16.5" stroke="var(--warn)" strokeDasharray="3 3" label={{ value: 'Overweight', fill: 'var(--warn)', fontSize: 10 }} />
                <Bar dataKey="count" fill="#f6b53d" />
              </BarChart>
            </ResponsiveContainer>
            
            <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.7 }}>
              <strong>Statistics:</strong> Mean: {processedData.stats.bmi.mean} | Median: {processedData.stats.bmi.median} | 
              Std Dev: {processedData.stats.bmi.std} | Range: {processedData.stats.bmi.min} - {processedData.stats.bmi.max}
            </div>
          </div>
        )}

        {/* Scatter Plot */}
        {activeChart === 'scatter' && (
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--accent)' }}>
              Weight vs Height Scatter Plot — Growth Pattern Analysis
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  type="number" 
                  dataKey="tinggi" 
                  name="Height (cm)" 
                  stroke="var(--muted)" 
                  style={{ fontSize: '0.7rem' }}
                  label={{ value: 'Height (cm)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="berat" 
                  name="Weight (kg)" 
                  stroke="var(--muted)" 
                  style={{ fontSize: '0.7rem' }}
                  label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                  formatter={(value, name) => [typeof value === 'number' ? value.toFixed(1) : value, name]}
                />
                <Legend />
                <Scatter name="Students" data={processedData.scatterData} fill="#4f8ef7" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
            
            <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.7, fontStyle: 'italic' }}>
              <strong>Note:</strong> Each point represents a student. Clustered points indicate normal growth patterns. 
              Outliers (far from cluster) may indicate measurement errors or health concerns requiring review.
              Showing up to 1,000 random students for performance.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
