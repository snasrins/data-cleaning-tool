import React, { useState, useMemo } from 'react';
import SvgIcon from '../SvgIcon.jsx';
import DataTable from '../DataTable.jsx';

export default function KKMDuplicatesTab({ cleanedData, duplicateGroups }) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [sortBy, setSortBy] = useState('count'); // 'count' or 'id'

  // Process duplicate data
  const processedDuplicates = useMemo(() => {
    if (!cleanedData || cleanedData.length === 0) return null;

    // Find ID_MURID column
    const idCol = Object.keys(cleanedData[0]).find(k => 
      k.toLowerCase().includes('id') && k.toLowerCase().includes('murid')
    );

    if (!idCol) return null;

    // Group duplicates
    const idCounts = {};
    cleanedData.forEach(row => {
      const id = row[idCol];
      if (id) {
        if (!idCounts[id]) {
          idCounts[id] = [];
        }
        idCounts[id].push(row);
      }
    });

    // Filter to only duplicates (count > 1)
    const duplicates = Object.entries(idCounts)
      .filter(([id, rows]) => rows.length > 1)
      .map(([id, rows]) => ({
        id,
        count: rows.length,
        rows: rows,
        // Check if measurements differ (suggesting different students with same ID)
        hasDifferentMeasurements: rows.some((r, i) => 
          i > 0 && (
            r.BERAT !== rows[0].BERAT || 
            r.TINGGI !== rows[0].TINGGI ||
            r['BERAT (kg)'] !== rows[0]['BERAT (kg)'] ||
            r['TINGGI (cm)'] !== rows[0]['TINGGI (cm)']
          )
        ),
      }));

    // Sort
    if (sortBy === 'count') {
      duplicates.sort((a, b) => b.count - a.count);
    } else {
      duplicates.sort((a, b) => a.id.localeCompare(b.id));
    }

    const totalDuplicateRows = duplicates.reduce((sum, d) => sum + d.count, 0);
    const uniqueDuplicateIds = duplicates.length;

    return {
      idCol,
      duplicates,
      totalDuplicateRows,
      uniqueDuplicateIds,
    };
  }, [cleanedData, sortBy]);

  if (!processedDuplicates || processedDuplicates.duplicates.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--success)' }}>
          <SvgIcon name="checkCircle" size={48} color="var(--success)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No Duplicate IDs Found</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
            All ID_MURID values are unique.
          </div>
        </div>
      </div>
    );
  }

  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div>
      {/* Summary */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(246,181,61,0.1) 0%, rgba(240,92,107,0.1) 100%)',
        borderColor: 'rgba(246,181,61,0.3)' 
      }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SvgIcon name="duplicate" size={20} color="var(--warn)" />
          DUPLICATE ID_MURID ANALYSIS
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
          Multiple rows share the same ID_MURID value. This could indicate: (1) Same student measured multiple times, 
          or (2) Data entry error assigning same ID to different students. Click each group to investigate.
        </p>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--warn)' }}>
            <div className="stat-val">{processedDuplicates.uniqueDuplicateIds}</div>
            <div className="stat-label">Unique Duplicate IDs</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="stat-val">{processedDuplicates.totalDuplicateRows}</div>
            <div className="stat-label">Total Affected Rows</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div className="stat-val">
              {((processedDuplicates.totalDuplicateRows / cleanedData.length) * 100).toFixed(2)}%
            </div>
            <div className="stat-label">% of Dataset</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--accent2)' }}>
            <div className="stat-val">
              {(processedDuplicates.totalDuplicateRows / processedDuplicates.uniqueDuplicateIds).toFixed(1)}
            </div>
            <div className="stat-label">Avg Duplicates per ID</div>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Duplicate Groups</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${sortBy === 'count' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '4px 12px' }}
              onClick={() => setSortBy('count')}
            >
              Sort by Count
            </button>
            <button
              className={`btn ${sortBy === 'id' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '4px 12px' }}
              onClick={() => setSortBy('id')}
            >
              Sort by ID
            </button>
          </div>
        </div>

        {/* Duplicate Groups Table */}
        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                ID_MURID
              </th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                Duplicate Count
              </th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                Issue Type
              </th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {processedDuplicates.duplicates.map((dup, idx) => {
              const isExpanded = expandedGroups[dup.id];
              
              return (
                <React.Fragment key={dup.id}>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleGroup(dup.id)}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                      {dup.id}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        background: dup.count > 3 ? 'rgba(240,92,107,0.2)' : 'rgba(246,181,61,0.2)',
                        color: dup.count > 3 ? 'var(--danger)' : 'var(--warn)',
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {dup.count}x
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.72rem' }}>
                      {dup.hasDifferentMeasurements ? (
                        <span style={{ color: 'var(--danger)' }}>
                          <SvgIcon name="warning" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          Different Measurements
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent)' }}>
                          <SvgIcon name="checkCircle" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          Same Measurements
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <SvgIcon 
                        name={isExpanded ? 'close' : 'eye'} 
                        size={14} 
                        color="var(--accent)" 
                      />
                    </td>
                  </tr>

                  {/* Expanded Rows */}
                  {isExpanded && (
                    <tr style={{ background: 'rgba(79,142,247,0.05)' }}>
                      <td colSpan={4} style={{ padding: '20px' }}>
                        <div style={{ marginBottom: 12 }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                            All {dup.count} rows with ID_MURID: {dup.id}
                          </strong>
                        </div>

                        {dup.hasDifferentMeasurements && (
                          <div style={{
                            background: 'rgba(240,92,107,0.1)',
                            border: '1px solid rgba(240,92,107,0.3)',
                            borderRadius: 6,
                            padding: '10px 12px',
                            marginBottom: 12,
                            fontSize: '0.72rem',
                            lineHeight: 1.6
                          }}>
                            <SvgIcon name="warning" size={14} color="var(--danger)" style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            <strong style={{ color: 'var(--danger)' }}>Warning:</strong> These rows have <strong>different BERAT/TINGGI values</strong>. 
                            This suggests either: (1) Same student measured at different times, or (2) Data entry error where different students were assigned the same ID.
                            <strong> Recommended action:</strong> Keep most recent measurement if same student, otherwise escalate to KKM for ID correction.
                          </div>
                        )}

                        <div style={{ maxHeight: 400, overflow: 'auto' }}>
                          <DataTable rows={dup.rows} />
                        </div>

                        <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                          💡 Tip: Compare BERAT, TINGGI, TARIKH PENGUKURAN, and NEGERI columns to determine if these are the same student or different students.
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {processedDuplicates.duplicates.length > 50 && (
          <div style={{ marginTop: 16, fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic' }}>
            Showing all {processedDuplicates.duplicates.length} duplicate ID groups
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card" style={{ borderColor: 'rgba(56,217,192,0.3)', background: 'rgba(56,217,192,0.05)' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SvgIcon name="note" size={18} color="var(--success)" />
          Resolution Strategy
        </div>
        <ul style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.8, paddingLeft: 20 }}>
          <li><strong>Same measurements:</strong> Likely accidental duplicate entries. Keep one, remove others.</li>
          <li><strong>Different measurements, same school:</strong> Probably same student measured at different dates. Keep most recent measurement.</li>
          <li><strong>Different measurements, different schools/negeri:</strong> Likely data entry error. Different students incorrectly assigned same ID. Escalate to KKM for ID correction.</li>
          <li><strong>Multiple measurements over time:</strong> If tracking growth over time is intended, ensure TARIKH PENGUKURAN dates are distinct and properly recorded.</li>
        </ul>
      </div>
    </div>
  );
}
