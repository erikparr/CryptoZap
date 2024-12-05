import React, { useState } from 'react';
import { fetchTopHolders, fetchTransactions, TIME_RANGES } from './api';

const calculateStatistics = (holders = [], transactions = []) => {
  const determineTradingSignal = (buyPressure, holdingsPercentage) => {
    const SIGNIFICANT_TRADING = 0.05;
    const totalHoldingsPercentage = parseFloat(holdingsPercentage.percentOfHoldingsBought) + 
                                   parseFloat(holdingsPercentage.percentOfHoldingsSold);
    
    console.log('Trading Signal Debug:', {
      buyPressure,
      totalHoldingsPercentage,
      holdingsPercentage
    });
    
    // Convert from string percentages to decimals for comparison
    if (totalHoldingsPercentage < (SIGNIFICANT_TRADING * 100)) {
      return {
        signal: 'NEUTRAL',
        description: buyPressure < 0.4 ?
          `Light selling (${(buyPressure * 100).toFixed(1)}% buys, low volume)` :
          buyPressure > 0.6 ?
          `Light buying (${(buyPressure * 100).toFixed(1)}% buys, low volume)` :
          `Light trading (${(buyPressure * 100).toFixed(1)}% buys, low volume)`
      };
    }
    
    if (buyPressure > 0.6 && totalHoldingsPercentage >= (SIGNIFICANT_TRADING * 100)) {
      return {
        signal: 'BUYING_PRESSURE',
        description: `Strong buying (${(buyPressure * 100).toFixed(1)}% buys with significant volume)`
      };
    } else if (buyPressure < 0.4 && totalHoldingsPercentage >= (SIGNIFICANT_TRADING * 100)) {
      return {
        signal: 'SELLING_PRESSURE',
        description: `Heavy selling (${(buyPressure * 100).toFixed(1)}% buys with significant volume)`
      };
    }
    
    return {
      signal: 'NEUTRAL',
      description: `Balanced trading (${(buyPressure * 100).toFixed(1)}% buys)`
    };
  };

  if (!holders || !Array.isArray(holders)) {
    console.warn('Invalid holders data received:', holders);
    return null;
  }

  const tokenSymbol = holders[0]?.Currency?.Symbol || 'tokens';

  const stats = {
    tokenSymbol,
    totalHoldings: 0,
    totalBuyVolume24h: 0,
    totalSellVolume24h: 0,
    totalVolume24h: 0,
    uniqueBuyers: new Set(),
    uniqueSellers: new Set(),
    volumeBreakdown: {
      buys: '0',
      sells: '0'
    },
    tradingActivity: {
      percentOfHoldingsBought: '0',
      percentOfHoldingsSold: '0',
      averageBuyerPercentage: '0',
      averageSellerPercentage: '0'
    },
    tradingMomentum: {
      buyPressure: '0',
      signal: 'NEUTRAL'
    },
    riskMetrics: {
      holderConcentration: 0,
      tradingIntensity: 0
    },
    significantTrades: []
  };

  // Create a map of valid holder balances for quick lookup
  const holderBalances = new Map();
  holders.forEach(holder => {
    if (holder?.Holder?.Address && holder?.Balance?.Amount) {
      holderBalances.set(
        holder.Holder.Address.toLowerCase(),
        Number(holder.Balance.Amount)
      );
    }
  });

  stats.totalHoldings = Array.from(holderBalances.values()).reduce((sum, balance) => sum + balance, 0);

  // Track individual holder trading volumes
  const holderBuyVolumes = new Map();
  const holderSellVolumes = new Map();

  transactions.forEach(tx => {
    if (!tx?.Transfer?.Amount || !tx?.Transfer?.Sender || !tx?.Transfer?.Receiver) return;
    
    const amount = Number(tx.Transfer.Amount);
    const sender = tx.Transfer.Sender.toLowerCase();
    const receiver = tx.Transfer.Receiver.toLowerCase();
    
    if (holderBalances.has(sender)) {
      stats.totalSellVolume24h += amount;
      stats.uniqueSellers.add(sender);
      holderSellVolumes.set(sender, (holderSellVolumes.get(sender) || 0) + amount);
    }
    
    if (holderBalances.has(receiver)) {
      stats.totalBuyVolume24h += amount;
      stats.uniqueBuyers.add(receiver);
      holderBuyVolumes.set(receiver, (holderBuyVolumes.get(receiver) || 0) + amount);
    }
  });

  // Calculate average percentages
  let totalBuyerPercentage = 0;
  let totalSellerPercentage = 0;

  holderBuyVolumes.forEach((volume, address) => {
    const balance = holderBalances.get(address) || 0;
    if (balance > 0) {
      totalBuyerPercentage += (volume / balance) * 100;
    }
  });

  holderSellVolumes.forEach((volume, address) => {
    const balance = holderBalances.get(address) || 0;
    if (balance > 0) {
      totalSellerPercentage += (volume / balance) * 100;
    }
  });

  stats.tradingActivity.averageBuyerPercentage = 
    stats.uniqueBuyers.size > 0 
      ? (totalBuyerPercentage / stats.uniqueBuyers.size).toFixed(1)
      : '0';
  
  stats.tradingActivity.averageSellerPercentage = 
    stats.uniqueSellers.size > 0 
      ? (totalSellerPercentage / stats.uniqueSellers.size).toFixed(1)
      : '0';

  stats.totalVolume24h = stats.totalBuyVolume24h + stats.totalSellVolume24h;
  
  if (stats.totalVolume24h > 0) {
    stats.volumeBreakdown.buys = ((stats.totalBuyVolume24h / stats.totalVolume24h) * 100).toFixed(1);
    stats.volumeBreakdown.sells = ((stats.totalSellVolume24h / stats.totalVolume24h) * 100).toFixed(1);
  }

  if (stats.totalHoldings > 0) {
    stats.tradingActivity.percentOfHoldingsBought = 
      ((stats.totalBuyVolume24h / stats.totalHoldings) * 100).toFixed(1);
    stats.tradingActivity.percentOfHoldingsSold = 
      ((stats.totalSellVolume24h / stats.totalHoldings) * 100).toFixed(1);  
  }

  // Calculate trading momentum with proper percentages
  const totalVolume = stats.totalBuyVolume24h + stats.totalSellVolume24h;
  if (totalVolume > 0) {
    const recentBuyPressure = stats.totalBuyVolume24h / totalVolume;
    const tradingSignal = determineTradingSignal(recentBuyPressure, {
      percentOfHoldingsBought: stats.tradingActivity.percentOfHoldingsBought,
      percentOfHoldingsSold: stats.tradingActivity.percentOfHoldingsSold
    });
    
    stats.tradingMomentum = {
      buyPressure: (recentBuyPressure * 100).toFixed(1),
      signal: tradingSignal.signal,
      description: tradingSignal.description
    };
  }

  // Calculate risk metrics with proper percentages
  if (stats.totalHoldings > 0) {
    const validBalances = Array.from(holderBalances.values())
      .sort((a, b) => b - a);
    
    const top5Holdings = validBalances
      .slice(0, 5)
      .reduce((sum, balance) => sum + balance, 0);
    
    stats.riskMetrics = {
      holderConcentration: top5Holdings / stats.totalHoldings,
      tradingIntensity: stats.totalVolume24h / stats.totalHoldings
    };

    console.log('Debug metrics:', {
      top5Holdings,
      totalHoldings: stats.totalHoldings,
      concentration: (top5Holdings / stats.totalHoldings * 100).toFixed(1),
      tradingIntensity: (stats.totalVolume24h / stats.totalHoldings * 100).toFixed(1)
    });
  }

  // Calculate volume breakdown
  if (stats.totalVolume24h > 0) {
    stats.volumeBreakdown = {
      buys: ((stats.totalBuyVolume24h / stats.totalVolume24h) * 100).toFixed(1),
      sells: ((stats.totalSellVolume24h / stats.totalVolume24h) * 100).toFixed(1)
    };
  }

  // Calculate trading activity percentages
  if (stats.totalHoldings > 0) {
    stats.tradingActivity = {
      percentOfHoldingsBought: ((stats.totalBuyVolume24h / stats.totalHoldings) * 100).toFixed(1),
      percentOfHoldingsSold: ((stats.totalSellVolume24h / stats.totalHoldings) * 100).toFixed(1),
      averageBuyerPercentage: stats.tradingActivity.averageBuyerPercentage,
      averageSellerPercentage: stats.tradingActivity.averageSellerPercentage
    };
  }

  // Add some debug logging
  console.log('Final stats:', {
    totalHoldings: stats.totalHoldings,
    totalVolume: stats.totalVolume24h,
    buyVolume: stats.totalBuyVolume24h,
    sellVolume: stats.totalSellVolume24h,
    tradingMomentum: stats.tradingMomentum,
    riskMetrics: stats.riskMetrics
  });

  return stats;
};

function App() {
  const [contract, setContract] = useState('');
  const [holders, setHolders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [holderActivity, setHolderActivity] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState(null);
  const holdersPerPage = 25;
  const [timeRange, setTimeRange] = useState(24); // Default to 24h

  // Calculate pagination
  const indexOfLastHolder = currentPage * holdersPerPage;
  const indexOfFirstHolder = indexOfLastHolder - holdersPerPage;
  const currentHolders = holders.slice(indexOfFirstHolder, indexOfLastHolder);
  const totalPages = Math.ceil(holders.length / holdersPerPage);

  const fetchData = async () => {
    if (!contract) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const holdersData = await fetchTopHolders(contract);
      
      // Early validation of holders data
      if (!holdersData || !Array.isArray(holdersData)) {
        throw new Error('Invalid holders data received');
      }
      
      // Filter out invalid holder entries before processing
      const validHolders = holdersData.filter(holder => {
        try {
          return holder && 
                 holder.Holder && 
                 typeof holder.Holder === 'object' &&
                 holder.Holder.Address && 
                 holder.Balance && 
                 holder.Balance.Amount;
        } catch (e) {
          return false;
        }
      });

      if (validHolders.length === 0) {
        throw new Error('No valid holder data found');
      }

      // Only fetch transactions for valid holders
      const validAddresses = validHolders.map(h => h.Holder.Address);
      const transactionsData = await fetchTransactions(validAddresses, contract, timeRange);
      
      setHolders(validHolders);
      setTransactions(transactionsData);
      
      const statsData = calculateStatistics(validHolders, transactionsData);
      if (statsData) {
        setStats(statsData);
        const activity = processTransactions(transactionsData, validHolders);
        setHolderActivity(activity);
      }
      
    } catch (err) {
      console.error('Data fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add pagination controls
  const Pagination = () => (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
      <button 
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        style={{ margin: '0 10px' }}
      >
        Previous
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button 
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        style={{ margin: '0 10px' }}
      >
        Next
      </button>
    </div>
  );

  const processTransactions = (transactions, holders) => {
    const activity = {};
    
    // Initialize holder activity with safer null checks
    holders?.forEach(holder => {
      if (holder?.Holder?.Address) {
        const address = holder.Holder.Address.toLowerCase();
        activity[address] = {
          buys: 0,
          sells: 0,
          netAmount: 0,
          lastActivity: null,
          transactions: [],
          balance: Number(holder.Balance?.Amount || 0)
        };
      }
    });

    // Process each transaction with null checks
    transactions?.forEach(tx => {
      if (!tx?.Transfer?.Amount || !tx?.Block?.Time) return;
      
      const { Transfer: { Amount, Sender, Receiver }, Block: { Time } } = tx;
      const amount = Number(Amount);
      
      const senderLower = Sender?.toLowerCase();
      const receiverLower = Receiver?.toLowerCase();
      
      if (senderLower && activity[senderLower]) {
        activity[senderLower].sells += amount;
        activity[senderLower].netAmount -= amount;
        activity[senderLower].lastActivity = Time;
      }
      
      if (receiverLower && activity[receiverLower]) {
        activity[receiverLower].buys += amount;
        activity[receiverLower].netAmount += amount;
        activity[receiverLower].lastActivity = Time;
      }
    });

    return activity;
  };

  // Add the time range selector component
  const TimeRangeSelector = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '20px'
    }}>
      {Object.entries(TIME_RANGES).map(([label, hours]) => (
        <button
          key={label}
          onClick={() => setTimeRange(hours)}
          style={{
            padding: '8px 16px',
            backgroundColor: timeRange === hours ? '#00ffbb' : '#2a2b2e',
            color: timeRange === hours ? '#1a1b1e' : '#e0e0e0',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '0.9em',
            fontWeight: timeRange === hours ? 'bold' : 'normal'
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="App" style={{ 
      backgroundColor: '#1a1b1e',
      minHeight: '100vh',
      color: '#e0e0e0',
      padding: '20px 0'
    }}>
      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
        <h1 style={{ 
          textAlign: 'center', 
          color: '#00ffbb',
          marginBottom: '30px',
          fontSize: '2.5em',
          textShadow: '0 0 10px rgba(0,255,187,0.3)',
          fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
        }}>
          TOP TRADERS ACTIVITY MONITOR
        </h1>
        <h3 style={{ 
          textAlign: 'center', 
          color: '#8b8b8d',
          marginBottom: '30px',
          fontWeight: 'normal',
          fontSize: '1.2em',
          letterSpacing: '0.5px'
        }}>
          Real-time analysis of whale trading patterns and market direction
        </h3>
        
        {/* Add TimeRangeSelector before the input */}
        <TimeRangeSelector />

        <div style={{ 
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <input
            type="text"
            value={contract}
            onChange={(e) => setContract(e.target.value)}
            placeholder="Enter token contract address"
            style={{ 
              width: '400px', 
              marginRight: '10px', 
              padding: '12px',
              backgroundColor: '#2a2b2e',
              border: '1px solid #3a3b3e',
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '1em'
            }}
          />
          <button 
            onClick={fetchData}
            style={{
              padding: '12px 24px',
              backgroundColor: '#00ffbb',
              color: '#1a1b1e',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1em',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 10px rgba(0,255,187,0.3)'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Analyze Token
          </button>
        </div>

        {error && (
          <div style={{ 
            color: '#ff4444', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'rgba(255,68,68,0.1)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            Error: {error}
          </div>
        )}

        {/* Market Statistics Panel */}
        {stats && (
          <div style={{ 
            backgroundColor: '#2a2b2e', 
            padding: '25px', 
            marginBottom: '30px', 
            borderRadius: '12px',
            fontSize: '1.1em',
            lineHeight: '1.6',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div>
              <strong>24h Trading Summary:</strong> Top holders traded{' '} 
              <strong>{stats.totalVolume24h.toLocaleString()} {stats.tokenSymbol}</strong>{' '}
              tokens in the last 24 hours ({' '}
              <span style={{ color: '#44bb44' }}>
                {stats.volumeBreakdown.buys}% buys
              </span>
              {' / '}
              <span style={{ color: '#ff4444' }}>
                {stats.volumeBreakdown.sells}% sells
              </span>
              ). This represents{' '}
              <strong>
                {((stats.totalVolume24h / stats.totalHoldings) * 100).toFixed(1)}%
              </strong>
              {' '}of total holdings.
            </div>
            <div style={{ marginTop: '10px' }}>
              Trading Activity:{' '}
              <span style={{ color: '#44bb44' }}>
                Bought {stats.tradingActivity.percentOfHoldingsBought}%
              </span>
              {' / '}
              <span style={{ color: '#ff4444' }}>
                Sold {stats.tradingActivity.percentOfHoldingsSold}%
              </span>
              {' '}of top holders' total holdings
            </div>
            <div style={{ marginTop: '10px' }}>
              Individual Trading Activity:{' '}
              <span style={{ color: '#44bb44' }}>
                Average buyer bought {stats.tradingActivity.averageBuyerPercentage}%
              </span>
              {' / '}
              <span style={{ color: '#ff4444' }}>
                Average seller sold {stats.tradingActivity.averageSellerPercentage}%
              </span>
              {' '}of their holdings
            </div>
            {stats.tradingMomentum && (
              <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                backgroundColor: '#2a2b2e',
                borderRadius: '5px' 
              }}>
                <strong>Market Direction:</strong>{' '}
                <span style={{ 
                  color: stats.tradingMomentum.signal === 'BUYING_PRESSURE' ? '#44bb44' : 
                         stats.tradingMomentum.signal === 'SELLING_PRESSURE' ? '#ff4444' : '#8b8b8d'
                }}>
                  {stats.tradingMomentum.description}
                </span>
              </div>
            )}
            
            {stats.riskMetrics && (
              <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                backgroundColor: '#2a2b2e',
                borderRadius: '5px' 
              }}>
                <strong>Risk Analysis:</strong>
                <div style={{ marginTop: '8px' }}>
                  <div>
                    <span style={{ 
                      color: stats.riskMetrics.holderConcentration > 0.5 ? '#ff4444' : 
                             stats.riskMetrics.holderConcentration > 0.3 ? '#ff8800' : '#44bb44'
                    }}>
                      • Top 5 wallets control {(stats.riskMetrics.holderConcentration * 100).toFixed(1)}% of all tokens
                      {stats.riskMetrics.holderConcentration > 0.5 ? ' (High concentration)' :
                       stats.riskMetrics.holderConcentration > 0.3 ? ' (Moderate concentration)' : ' (Well distributed)'}
                    </span>
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    <span style={{
                      color: stats.riskMetrics.tradingIntensity > 0.1 ? '#ff4444' :
                             stats.riskMetrics.tradingIntensity > 0.05 ? '#ff8800' : '#44bb44'
                    }}>
                      • Daily trading volume is {(stats.riskMetrics.tradingIntensity * 100).toFixed(1)}% of total supply
                      {stats.riskMetrics.tradingIntensity > 0.1 ? ' (High volatility)' :
                       stats.riskMetrics.tradingIntensity > 0.05 ? ' (Moderate activity)' : ' (Stable trading)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Transactions Table */}
        {transactions.length > 0 && (
          <div style={{
            backgroundColor: '#2a2b2e',
            padding: '25px',
            borderRadius: '12px',
            marginTop: '30px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ color: '#00ffbb', marginBottom: '20px' }}>Recent Holder Transactions (24h)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#3a3b3e' }}>
                  <th style={{ padding: '10px', border: '1px solid #3a3b3e' }}>Time</th>
                  <th style={{ padding: '10px', border: '1px solid #3a3b3e' }}>Type</th>
                  <th style={{ padding: '10px', border: '1px solid #3a3b3e' }}>Address</th>
                  <th style={{ padding: '10px', border: '1px solid #3a3b3e' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isSell = holders.some(holder => 
                    holder?.Holder?.Address?.toLowerCase() === tx?.Transfer?.Sender?.toLowerCase()
                  );
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {new Date(tx.Block.Time).toLocaleString()}
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        border: '1px solid #ddd',
                        color: isSell ? '#ff4444' : '#44bb44'
                      }}>
                        {isSell ? 'SELL' : 'BUY'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {(isSell ? tx.Transfer.Sender : tx.Transfer.Receiver).slice(0, 6)}...
                        {(isSell ? tx.Transfer.Sender : tx.Transfer.Receiver).slice(-4)}
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        border: '1px solid #ddd',
                        color: isSell ? '#ff4444' : '#44bb44'
                      }}>
                        {Number(tx.Transfer.Amount).toLocaleString()} {tx.Transfer.Currency.Symbol}
                        <span style={{ marginLeft: '8px', fontSize: '0.9em' }}>(Transfer)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Significant trades section with null check */}
        {stats?.significantTrades?.length > 0 && (
          <div style={{ 
            backgroundColor: '#fff3cd', 
            padding: '15px', 
            marginTop: '10px', 
            borderRadius: '8px' 
          }}>
            <strong>Significant Trades Alert:</strong>
            {stats.significantTrades.map((trade, i) => (
              <div key={i} style={{ 
                color: trade.type === 'BUY' ? '#44bb44' : '#ff4444',
                marginTop: '5px' 
              }}>
                {trade.type}: {trade.percentage}% of total
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;