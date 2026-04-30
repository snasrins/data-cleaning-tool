// TASKA Performance Dashboard Tab
import React, { useState } from 'react';
import SvgIcon from '../SvgIcon.jsx';

export default function TaskaTab({ taskaData }) {
  const [sortBy, setSortBy] = useState('rank_overall');
  const [filterRisk, setFilterRisk] = useState('all');
  
  if (!taskaData || !taskaData.enabled) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏫</div>
        <h3>TASKA Performance Data Not Available</h3>
        <p>{taskaData?.reason || "No TASKA column mapped in your dataset"}</p>
      </div>
    );
  }

  const { summary, taska_list, top_10_worst, top_10_best } = taskaData;
  
  // Filter by risk level
  let filteredList = taska_list;
  if (filterRisk !== 'all') {
    filteredList = taska_list.filter(t => t.risk_level === filterRisk);
  }

  // Sort
  const sortedList = [...filteredList].sort((a, b) => {
    if (sortBy === 'rank_overall') return a.rank_overall - b.rank_overall;
    if (sortBy === 'quality_score') return b.quality_score - a.quality_score;
    if (sortBy === 'n_children') return b.n_children - a.n_children;
    if (sortBy === 'prevalence') return b.prevalence.any_malnutrition.pct - a.prevalence.any_malnutrition.pct;
    return 0;
  });

  return (
    <div className="taska-dashboard">
      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="stat-card" style={{borderLeft: '4px solid var(--accent)'}}>
          <div className="stat-value">{summary.total_taska}</div>
          <div className="stat-label">Total TASKA</div>
        </div>
        <div className="stat-card" style={{borderLeft: '4px solid var(--accent2)'}}>
          <div className="stat-value">{summary.total_children.toLocaleString()}</div>
          <div className="stat-label">Total Children</div>
        </div>
        <div className="stat-card" style={{borderLeft: '4px solid var(--danger)'}}>
          <div className="stat-value">{summary.high_risk_taska}</div>
          <div className="stat-label">High Risk TASKA (>30%)</div>
        </div>
        <div className="stat-card" style={{borderLeft: '4px solid var(--success)'}}>
          <div className="stat-value">{summary.avg_quality_score}%</div>
          <div className="stat-label">Avg Quality Score</div>
        </div>
        <div className="stat-card" style={{borderLeft: '4px solid var(--warn)'}}>
          <div className="stat-value">{summary.avg_prevalence}%</div>
          <div className="stat-label">Avg Malnutrition Rate</div>
        </div>
      </div>

      {/* Top 10 Comparisons */}
      <div className="comparison-section">
        <div className="comparison-card">
          <h3 className="section-title">
            <SvgIcon name="target" size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Top 10 Best Performing TASKA
          </h3>
          <div className="taska-list">
            {top_10_best.map((taska, idx) => (
              <div key={idx} className="taska-item best">
                <div className="taska-rank">#{idx + 1}</div>
                <div className="taska-info">
                  <div className="taska-name">{taska.taska}</div>
                  <div className="taska-location">{taska.daerah}, {taska.negeri}</div>
                </div>
                <div className="taska-stats">
                  <div className="stat-pill success">
                    {taska.prevalence.any_malnutrition.pct}% malnutrition
                  </div>
                  <div className="stat-pill">
                    {taska.n_children} children
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="comparison-card">
          <h3 className="section-title">
            <SvgIcon name="warning" size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Top 10 Needs Attention
          </h3>
          <div className="taska-list">
            {top_10_worst.map((taska, idx) => (
              <div key={idx} className="taska-item worst">
                <div className="taska-rank danger">#{idx + 1}</div>
                <div className="taska-info">
                  <div className="taska-name">{taska.taska}</div>
                  <div className="taska-location">{taska.daerah}, {taska.negeri}</div>
                </div>
                <div className="taska-stats">
                  <div className="stat-pill danger">
                    {taska.prevalence.any_malnutrition.pct}% malnutrition
                  </div>
                  <div className="stat-pill">
                    {taska.n_children} children
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full TASKA Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <SvgIcon name="clipboard" size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            All TASKA Performance Details
          </h3>
          <div className="table-controls">
            <div className="filter-group">
              <label>Risk Level:</label>
              <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                <option value="all">All</option>
                <option value="High">High (&gt;30%)</option>
                <option value="Medium">Medium (15-30%)</option>
                <option value="Low">Low (&lt;15%)</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Sort By:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="rank_overall">Overall Rank</option>
                <option value="prevalence">Malnutrition Rate</option>
                <option value="quality_score">Quality Score</option>
                <option value="n_children">Number of Children</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>TASKA Name</th>
                <th>Location</th>
                <th>Children</th>
                <th>Malnutrition Rate</th>
                <th>Kurang Berat</th>
                <th>Bantut</th>
                <th>Susut</th>
                <th>Obes</th>
                <th>Quality Score</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {sortedList.map((taska, idx) => (
                <tr key={idx} className={`risk-${taska.risk_level.toLowerCase()}`}>
                  <td>
                    <span className="badge"># {taska.rank_overall}</span>
                    {taska.rank_in_district && (
                      <span className="badge-secondary">D#{taska.rank_in_district}</span>
                    )}
                  </td>
                  <td><strong>{taska.taska}</strong></td>
                  <td>{taska.daerah}, {taska.negeri}</td>
                  <td>{taska.n_children}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{
                            width: `${taska.prevalence.any_malnutrition.pct}%`,
                            background: taska.risk_level === 'High' ? 'var(--danger)' : 
                                        taska.risk_level === 'Medium' ? 'var(--warn)' : 'var(--success)'
                          }}
                        />
                      </div>
                      <span>{taska.prevalence.any_malnutrition.pct}%</span>
                    </div>
                  </td>
                  <td>{taska.prevalence.kurang_berat_badan.pct}%</td>
                  <td>{taska.prevalence.bantut.pct}%</td>
                  <td>{taska.prevalence.susut.pct}%</td>
                  <td>{taska.prevalence.obes_berlebihan.pct}%</td>
                  <td>
                    <span className={`score-badge ${taska.quality_score > 80 ? 'high' : taska.quality_score > 60 ? 'medium' : 'low'}`}>
                      {taska.quality_score}
                    </span>
                  </td>
                  <td>
                    <span className={`risk-badge ${taska.risk_level.toLowerCase()}`}>
                      {taska.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
