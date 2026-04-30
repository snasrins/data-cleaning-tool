// Age & Year Filter Controls Component
import React from 'react';
import SvgIcon from './SvgIcon.jsx';

export default function FilterControls({ onFilterChange, currentFilters }) {
  const ageRanges = [
    { value: '', label: 'All Ages' },
    { value: '0-12', label: '0-12 months (Infants)' },
    { value: '12-24', label: '12-24 months (1-2 years)' },
    { value: '24-36', label: '24-36 months (2-3 years)' },
    { value: '36-60', label: '36-60 months (3-5 years)' },
    { value: '0-24', label: 'Bawah 2 Tahun (<24 months)' },
    { value: '0-60', label: 'Bawah 5 Tahun (<60 months)' },
  ];

  const years = [
    { value: '', label: 'All Years' },
    { value: '2023', label: '2023' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
  ];

  return (
    <div className="filter-controls">
      <div className="filter-group">
        <label htmlFor="age-filter">
          <span className="filter-icon">👶</span>
          Filter by Age:
        </label>
        <select
          id="age-filter"
          className="filter-select"
          value={currentFilters.age || ''}
          onChange={(e) => onFilterChange({ ...currentFilters, age: e.target.value })}
        >
          {ageRanges.map(range => (
            <option key={range.value} value={range.value}>{range.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="year-filter">
          <span className="filter-icon">📅</span>
          Filter by Year:
        </label>
        <select
          id="year-filter"
          className="filter-select"
          value={currentFilters.year || ''}
          onChange={(e) => onFilterChange({ ...currentFilters, year: e.target.value })}
        >
          {years.map(year => (
            <option key={year.value} value={year.value}>{year.label}</option>
          ))}
        </select>
      </div>

      {(currentFilters.age || currentFilters.year) && (
        <button
          className="btn-clear-filters"
          onClick={() => onFilterChange({ age: '', year: '' })}
        >
          <span>✕</span> Clear Filters
        </button>
      )}
    </div>
  );
}
