import React from 'react';
import { formatAddress, formatNumber } from '../../utils/formatting';
import TraderMetrics from './TraderMetrics';

const TraderCard = ({ trader }) => {
  const {
    address,
    profitability,
    tradingStyle,
    score,
    metrics
  } = trader;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      // Optional: Add a visual feedback like a tooltip or flash
      console.log('Address copied:', address);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className="trader-card">
      <div className="trader-header">
        <div 
          className="trader-address" 
          onClick={copyToClipboard}
          style={{ cursor: 'pointer' }}
          title="Click to copy full address"
        >
          {formatAddress(address)}
        </div>
        <div className="trader-score">{score}</div>
      </div>

      <TraderMetrics metrics={metrics} />

      <div className="trading-style">
        <ul>
          {tradingStyle.map((trait, index) => (
            <li key={index}>{trait}</li>
          ))}
        </ul>
      </div>

      <div className="profitability">
        <div className="stat">
          <div>
            <span>Win Rate:</span>
            <span>{profitability.winRate}%</span>
          </div>
          <div>
            <span>Avg Profit:</span>
            <span>{formatNumber(profitability.avgProfit)}%</span>
          </div>
          <div>
            <span>Avg Hold Time:</span>
            <span>{profitability.avgHoldTime}h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraderCard; 