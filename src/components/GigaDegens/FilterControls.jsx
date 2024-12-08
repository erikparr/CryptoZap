import React from 'react';
import './styles.css';

const FilterControls = ({ 
  filters, 
  timeWindow, 
  onFilterChange, 
  onTimeWindowChange 
}) => {
  const timeWindows = [
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 }
  ];

  const sortOptions = [
    { label: 'Score', value: 'score' },
    { label: 'Profit', value: 'profit' },
    { label: 'Consistency', value: 'consistency' }
  ];

  return (
    <div className="filter-controls">
      <div className="filter-group">
        <label>Time Window</label>
        <div className="button-group">
          {timeWindows.map(({ label, value }) => (
            <button
              key={value}
              className={`time-window-btn ${timeWindow === value ? 'active' : ''}`}
              onClick={() => onTimeWindowChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label>Min Score</label>
        <div className="range-control">
          <input
            type="range"
            min="50"
            max="90"
            step="5"
            value={filters.minScore}
            onChange={(e) => onFilterChange({ minScore: Number(e.target.value) })}
          />
          <span>{filters.minScore}</span>
        </div>
      </div>

      <div className="filter-group">
        <label>Min Profitability</label>
        <div className="range-control">
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={filters.minProfitability}
            onChange={(e) => onFilterChange({ minProfitability: Number(e.target.value) })}
          />
          <span>{filters.minProfitability}%</span>
        </div>
      </div>

      <div className="filter-group">
        <label>Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value })}
          className="sort-select"
        >
          {sortOptions.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FilterControls; 