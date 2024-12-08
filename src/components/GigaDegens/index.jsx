import React, { useState } from 'react';
import { fetchSwingTraders } from '../../services/traders/analysis';
import TraderCard from './TraderCard';
import FilterControls from './FilterControls';
import './styles.css';

const GigaDegens = ({ contract }) => {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeWindow, setTimeWindow] = useState(30);
  const [filters, setFilters] = useState({
    minScore: 50,
    minProfitability: 15,
    sortBy: 'score'
  });

  const loadTraders = async () => {
    if (!contract) {
      setError("Please enter a contract address");
      return;
    }
    
    console.log('Loading traders for contract:', contract);
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchSwingTraders(contract, timeWindow);
      console.log('Received trader data:', data);
      setTraders(data);
    } catch (err) {
      console.error('Error loading traders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Apply filters and sorting to traders
  const filteredTraders = traders
    .filter(trader => 
      trader.score >= filters.minScore && 
      trader.profitability.avgProfit >= filters.minProfitability
    )
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'profit':
          return b.profitability.avgProfit - a.profitability.avgProfit;
        case 'consistency':
          return b.metrics.consistencyScore - a.metrics.consistencyScore;
        case 'score':
        default:
          return b.score - a.score;
      }
    });

  return (
    <div className="giga-degens-container">
      <h2>Giga Degens 🔍</h2>
      <p className="subtitle">Top performing swing traders for this token</p>
      
      <div className="search-container">
        <button 
          onClick={loadTraders}
          disabled={loading || !contract}
          className="analyze-button"
        >
          {loading ? 'Analyzing...' : 'Analyze Traders'}
        </button>
      </div>

      <FilterControls 
        timeWindow={timeWindow}
        filters={filters}
        onTimeWindowChange={setTimeWindow}
        onFilterChange={handleFilterChange}
      />

      {loading && <div className="loading">Loading trader data...</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="traders-grid">
        {filteredTraders.map(trader => (
          <TraderCard key={trader.address} trader={trader} />
        ))}
      </div>
    </div>
  );
};

export default GigaDegens; 