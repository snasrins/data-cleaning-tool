import React, { useState } from 'react';
import SvgIcon from '../SvgIcon.jsx';

const STATUS_COLOR = {
  done:         { bg: 'rgba(56,217,192,0.10)', color: 'var(--success)',  icon: 'check', label: 'Done' },
  needed:       { bg: 'rgba(240,92,107,0.10)', color: 'var(--danger)',   icon: 'close', label: 'Needed' },
  not_required: { bg: 'rgba(255,255,255,0.04)', color: 'var(--muted)',   icon: 'close', label: 'N/A' },
  optional:     { bg: 'rgba(250,173,20,0.10)', color: 'var(--warn)',     icon: 'warning', label: 'Optional' },
};

const PRIORITY_COLOR = {
  critical:    'var(--danger)',
  required:    'var(--warn)',
  recommended: '#4f8ef7',
  info:        'var(--muted)',
};

export default function TableauPrepTab({ tp }) {
  const [showCalcFields, setShowCalcFields] = useState(false);

  if (!tp || !tp.data_grain) {
    return (
      <div className="card">
        <p style={{ color: 'var(--muted)', padding: 16 }}>
          Tableau Prep analysis not available. Run EDA first.
        </p>
      </div>
    );
  }

  const blockers = tp.transforms?.filter((t) => t.status === 'needed' && t.priority === 'critical') || [];
  const needed   = tp.transforms?.filter((t) => t.status === 'needed' && t.priority !== 'critical') || [];
  const done     = tp.transforms?.filter((t) => t.status === 'done') || [];
  const na       = tp.transforms?.filter((t) => t.status === 'not_required') || [];

  return (
    <>
      {/* ── Data Grain ─────────────────────────────────────────────────── */}
      <div className="card" style={{ borderColor: 'rgba(56,217,192,0.2)' }}>
        <div className="card-title">Data Structure</div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>DATA GRAIN</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{tp.data_grain}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>TOTAL ROWS</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' }}>{tp.row_count?.toLocaleString()}</div>
          </div>
          {tp.unique_id_count != null && (
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>UNIQUE CHILDREN</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' }}>{tp.unique_id_count?.toLocaleString()}</div>
            </div>
          )}
          {tp.unique_id_count && tp.row_count && (
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>RECORDS / CHILD</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--warn)' }}>
                {(tp.row_count / tp.unique_id_count).toFixed(1)}
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.7, padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 6, borderLeft: '3px solid rgba(56,217,192,0.3)' }}>
          {tp.grain_note}
        </div>
      </div>

      {/* ── Transform Status Summary ───────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(240,92,107,0.3)' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger)' }}>{blockers.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Critical Blockers</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>Will break Tableau output</div>
        </div>
        <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(250,173,20,0.3)' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--warn)' }}>{needed.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Recommended</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>Needed for full analysis</div>
        </div>
        <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(56,217,192,0.2)' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)' }}>{done.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Already Done</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>Handled by EDA pipeline</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--muted)' }}>{na.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Not Required</div>
        </div>
      </div>

      {/* ── Transforms Checklist ──────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">Required Transforms Checklist</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
          Items marked <span style={{ color: 'var(--success)', fontWeight: 600 }}>Done</span> were handled automatically by the EDA pipeline.
          Items marked <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Needed</span> must be resolved before loading into Tableau.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tp.transforms?.map((t, i) => {
            const s = STATUS_COLOR[t.status] || STATUS_COLOR.optional;
            const pc = PRIORITY_COLOR[t.priority] || 'var(--muted)';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 14px', borderRadius: 8,
                background: s.bg, border: `1px solid ${s.color}22`,
              }}>
                <div style={{
                  minWidth: 28, height: 28, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: s.color + '22', color: s.color, fontWeight: 700, fontSize: '0.9rem',
                }}>
                  <SvgIcon name={s.icon} size={16} color={s.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)' }}>{t.label}</span>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'var(--mono)', padding: '1px 6px',
                      background: pc + '18', color: pc, borderRadius: 4 }}>
                      {t.priority}
                    </span>
                    {t.field && t.field !== '—' && (
                      <span style={{ fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                        → {t.field}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {t.description}
                  </div>
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: s.color, whiteSpace: 'nowrap' }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Join Keys ─────────────────────────────────────────────────── */}
      {tp.join_keys?.length > 0 && (
        <div className="card">
          <div className="card-title">Join Keys (Multi-Source)</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12 }}>
            Use these fields to join MyVASS and Klinik datasets in Tableau Prep or SQL.
          </p>
          {tp.join_keys.map((jk, i) => (
            <div key={i} style={{ padding: '10px 14px', background: 'rgba(79,142,247,0.06)',
              border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: '#4f8ef7', marginBottom: 4 }}>{jk.field}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: jk.valid_count != null ? 6 : 0 }}>
                {jk.description}
              </div>
              {jk.valid_count != null && (
                <div style={{ fontSize: '0.72rem', color: 'var(--warn)' }}>
                  <SvgIcon name="warning" size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Only {jk.valid_count?.toLocaleString()} records have a valid IC for joining
                </div>
              )}
              {jk.note && (
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                  {jk.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Calculated Fields ─────────────────────────────────────────── */}
      <div className="card">
        <div className="row-flex" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>Calculated Fields for Tableau</div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}
            onClick={() => setShowCalcFields((x) => !x)}>
            {showCalcFields ? 'Hide Formulas' : 'Show Formulas'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
          Create these calculated fields in Tableau Desktop or Tableau Prep after loading your cleaned data.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tp.calculated_fields?.map((cf, i) => (
            <div key={i} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showCalcFields ? 8 : 0 }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--accent2)' }}>{cf.field}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{cf.notes}</span>
              </div>
              {showCalcFields && (
                <pre style={{
                  fontFamily: 'var(--mono)', fontSize: '0.7rem', color: '#a5d6a7',
                  background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6,
                  margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {cf.formula}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
