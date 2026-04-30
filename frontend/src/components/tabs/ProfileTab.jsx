import React, { useState } from 'react';
import SvgIcon from '../SvgIcon.jsx';

const STANDARD_FIELDS = new Set([
  'id','nama','jantina','tarikh_lahir','negeri','daerah','taska','pendapatan',
  'kumpulan_umur','tarikh_ukur','berat_kg','tinggi_cm','bmi',
  'status_berat','status_tinggi','status_bmi','tahun_ukur','sumber',
]);
const DERIVED_FIELDS = new Set([
  'id_cleaned','id_type','is_valid_ic','age_months_computed','age_group_computed',
  'bulan_ukur','suku_tahun','kawasan_bahagian','flag_bawah_2','flag_bawah_5',
  'is_missing_critical','is_missing_age','flag_bmi_mismatch','status_bmi_grouped',
  'ind_kurang_berat','ind_bantut','ind_susut','ind_obes','bmi_calc',
  'negeri_was_null','daerah_was_null','jantina_was_null','pendapatan_was_null',
  'status_berat_was_null','status_tinggi_was_null','status_bmi_was_null',
]);

const TYPE_STYLE = {
  identifier: { bg: 'rgba(56,217,192,0.12)', color: 'var(--accent)',  label: 'identifier' },
  date:       { bg: 'rgba(139,92,246,0.12)', color: 'var(--purple)', label: 'date' },
  categorical:{ bg: 'rgba(250,173,20,0.12)', color: 'var(--warn)',   label: 'categorical' },
  numerical:  { bg: 'rgba(79,142,247,0.12)', color: '#4f8ef7',       label: 'numerical' },
  text:       { bg: 'rgba(255,255,255,0.05)', color: 'var(--muted)', label: 'text' },
};

export default function ProfileTab({ colTypes, mv, totalRows }) {
  const [showDerived, setShowDerived] = useState(false);
  const [filterType, setFilterType] = useState('all');

  if (!colTypes || !Object.keys(colTypes).length) {
    return <div className="card"><p style={{ color: 'var(--muted)', padding: 16 }}>No column profile available.</p></div>;
  }

  const entries = Object.entries(colTypes).filter(([col]) => showDerived || !DERIVED_FIELDS.has(col));
  const filtered = filterType === 'all' ? entries
    : filterType === 'standard' ? entries.filter(([col]) => STANDARD_FIELDS.has(col))
    : filterType === 'original' ? entries.filter(([col]) => !STANDARD_FIELDS.has(col) && !DERIVED_FIELDS.has(col))
    : entries.filter(([col]) => DERIVED_FIELDS.has(col));

  const nStd     = entries.filter(([c]) => STANDARD_FIELDS.has(c)).length;
  const nOrig    = entries.filter(([c]) => !STANDARD_FIELDS.has(c) && !DERIVED_FIELDS.has(c)).length;
  const nDerived = Object.entries(colTypes).filter(([c]) => DERIVED_FIELDS.has(c)).length;

  return (
    <>
      <div className="card">
        <div className="row-flex" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div className="card-title" style={{ margin: 0 }}>Column Profile</div>
          <div style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showDerived} onChange={(e) => setShowDerived(e.target.checked)} />
            Show derived columns ({nDerived})
          </label>
          {['all','standard','original','derived'].map((f) => (
            <button key={f} className="btn btn-secondary"
              style={filterType === f ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' } : {}}
              onClick={() => setFilterType(f)}>
              {f === 'all' ? `All (${entries.length})` : f === 'standard' ? `Standard (${nStd})` : f === 'original' ? `Original (${nOrig})` : `Derived (${nDerived})`}
            </button>
          ))}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.73rem', marginBottom: 12, lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--accent)' }}>Standard</strong>: columns mapped to KKM schema. &nbsp;
          <strong style={{ color: 'var(--muted)' }}>Original</strong>: raw file columns not mapped. &nbsp;
          <strong style={{ color: 'var(--purple)' }}>Derived</strong>: computed columns added during EDA (age, geo, indicators, etc).
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Record Type</th>
                <th>Raw dtype</th>
                <th>Inferred Type</th>
                <th style={{ textAlign: 'right' }}>Unique Values</th>
                <th style={{ textAlign: 'right' }}>% Null</th>
                <th style={{ width: 80 }}>Null Bar</th>
                <th>Sample Values</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(([col, info]) => {
                const isStd  = STANDARD_FIELDS.has(col);
                const isDeriv = DERIVED_FIELDS.has(col);
                const mvInfo  = mv?.[col];
                const pctNull = mvInfo?.pct_missing ?? 0;
                const barCol  = pctNull > 30 ? 'var(--danger)' : pctNull > 10 ? 'var(--warn)' : 'var(--success)';
                const typeStyle = TYPE_STYLE[info.inferred] || TYPE_STYLE.text;
                return (
                  <tr key={col}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                      {col}
                      {isStd  && <span style={{ marginLeft: 5, fontSize: '0.6rem', color: 'var(--accent)', background: 'rgba(56,217,192,0.1)', borderRadius: 3, padding: '1px 5px' }}>standard</span>}
                      {isDeriv && <span style={{ marginLeft: 5, fontSize: '0.6rem', color: 'var(--purple)', background: 'rgba(139,92,246,0.1)', borderRadius: 3, padding: '1px 5px' }}>derived</span>}
                    </td>
                    <td>
                      {isStd  ? <span style={{ color: 'var(--accent)',  fontSize: '0.7rem' }}>Standard</span>
                      : isDeriv ? <span style={{ color: 'var(--purple)', fontSize: '0.7rem' }}>Derived</span>
                      : <span style={{ color: 'var(--muted)',  fontSize: '0.7rem' }}>Original</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>{info.original_dtype}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.62rem',
                        background: typeStyle.bg, color: typeStyle.color, fontFamily: 'var(--mono)',
                      }}>
                        {typeStyle.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontSize: '0.75rem' }}>
                      {info.unique_values?.toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontSize: '0.75rem',
                      color: pctNull > 30 ? 'var(--danger)' : pctNull > 10 ? 'var(--warn)' : pctNull > 0 ? 'var(--text)' : 'var(--success)' }}>
                      {mvInfo ? `${pctNull}%` : '--'}
                    </td>
                    <td>
                      {mvInfo && pctNull > 0 ? (
                        <div className="pct-bar-wrap"><div className="pct-bar" style={{ width: `${Math.min(pctNull, 100)}%`, background: barCol }} /></div>
                      ) : <span style={{ fontSize: '0.65rem', color: 'var(--success)' }}>{mvInfo ? <SvgIcon name="check" size={12} color="var(--success)" /> : '--'}</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(info.sample_values || []).join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
