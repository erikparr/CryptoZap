import React from 'react';

const TraderMetrics = ({ metrics }) => {
  const getColorForMetric = (value) => {
    if (value >= 80) return '#44bb44';
    if (value >= 60) return '#ff8800';
    return '#ff4444';
  };

  return (
    <div className="trader-metrics">
      <div className="metric-grid">
        <div className="metric">
          <label>Entry Accuracy</label>
          <div className="metric-value" style={{ color: getColorForMetric(metrics.entryAccuracy) }}>
            {metrics.entryAccuracy}%
          </div>
        </div>
        <div className="metric">
          <label>Exit Timing</label>
          <div className="metric-value" style={{ color: getColorForMetric(metrics.exitTiming) }}>
            {metrics.exitTiming}%
          </div>
        </div>
        <div className="metric">
          <label>Risk Management</label>
          <div className="metric-value" style={{ color: getColorForMetric(metrics.riskManagement) }}>
            {metrics.riskManagement}%
          </div>
        </div>
        <div className="metric">
          <label>Consistency</label>
          <div className="metric-value" style={{ color: getColorForMetric(metrics.consistencyScore) }}>
            {metrics.consistencyScore}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraderMetrics; 