import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, useLocation } from 'react-router-dom';
import { fetchTopHolders, fetchTransactions, knownDEXAddresses } from './api';
import { formatAddress } from './utils/formatting';
import GigaDegens from './components/GigaDegens';
import { SMALL_TRADE_THRESHOLD, HIGH_VALUE_THRESHOLD, TIME_RANGES } from './constants';
import './App.css';

const getVolatilityLevel = (intensity) => {
  if (intensity > 0.1) return 'high';
  if (intensity > 0.05) return 'medium';
  return 'low';
};

const getVolatilityDescription = (intensity) => {
  if (intensity > 0.1) return ' (High volatility)';
  if (intensity > 0.05) return ' (Moderate activity)';
  return ' (Stable trading)';
};

const calculateStatistics = (holders = [], transactions = []) => {
  const determineTradingSignal = (buyPressure, holdingsPercentage) => {
    const SIGNIFICANT_TRADING = 0.05;
    const totalHoldingsPercentage = parseFloat(holdingsPercentage.percentOfHoldingsBought) + 
                                   parseFloat(holdingsPercentage.percentOfHoldingsSold);
    
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
    totalHolders: holders.length,
    totalBuyVolume24h: 0,
    totalSellVolume24h: 0,
    totalVolume24h: 0,
    volume: 0,
    uniqueBuyers: new Set(),
    uniqueSellers: new Set(),
    volumeBreakdown: { buys: '0', sells: '0' },
    tradingActivity: {
      percentOfHoldingsBought: '0',
      percentOfHoldingsSold: '0',
      averageBuyerPercentage: '0',
      averageSellerPercentage: '0'
    },
    tradingMomentum: { buyPressure: '0', signal: 'NEUTRAL' },
    tradingSignal: {
      signal: 'NEUTRAL',
      description: 'No trading activity'
    }
  };

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

  stats.totalVolume24h = stats.totalBuyVolume24h + stats.totalSellVolume24h;
  stats.volume = stats.totalVolume24h;

  if (stats.totalVolume24h > 0) {
    stats.volumeBreakdown.buys = ((stats.totalBuyVolume24h / stats.totalVolume24h) * 100).toFixed(1);
    stats.volumeBreakdown.sells = ((stats.totalSellVolume24h / stats.totalVolume24h) * 100).toFixed(1);
    
    const recentBuyPressure = stats.totalBuyVolume24h / stats.totalVolume24h;
    const tradingSignal = determineTradingSignal(recentBuyPressure, stats.tradingActivity);
    
    stats.tradingSignal = tradingSignal;
    stats.tradingMomentum = {
      buyPressure: (recentBuyPressure * 100).toFixed(1),
      signal: tradingSignal.signal,
      description: tradingSignal.description
    };
  }

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

  if (stats.totalHoldings > 0) {
    stats.tradingActivity.percentOfHoldingsBought = 
      ((stats.totalBuyVolume24h / stats.totalHoldings) * 100).toFixed(1);
    stats.tradingActivity.percentOfHoldingsSold = 
      ((stats.totalSellVolume24h / stats.totalHoldings) * 100).toFixed(1);
  }

  return stats;
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Address copied to clipboard');
  } catch (err) {
    console.error('Failed to copy address:', err);
  }
};

const isDEXAddress = (address) => {
  address = address.toLowerCase();
  return knownDEXAddresses.includes(address) || isPoolAddress(address);
};

const isPoolAddress = (address) => {
  const poolAddresses = [
    '0x8d58e202016122aae65be55694dbce1b810b4072',   // Uniswap V2 pool
    '0xba12222222228d8ba445958a75a0704d566bf2c8',   // Balancer pool
    // Add more pool addresses as needed
  ].map(addr => addr.toLowerCase());
  
  return poolAddresses.includes(address.toLowerCase());
};

export const analyzeTransaction = (tx, holderActivity) => {
  const amount = Number(tx.Transfer.Amount);
  
  // Skip very small trades
  if (amount < SMALL_TRADE_THRESHOLD) {
    console.log('Skipping small trade:', amount);
    return;
  }

  // Flag high value transactions
  if (amount > HIGH_VALUE_THRESHOLD) {
    console.log('High value transaction detected:', amount);
  }

  // Rest of your transaction analysis logic
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
  const transactionsPerPage = 100;
  const [timeRange, setTimeRange] = useState(24); // Default to 24h
  const [showDexOnly, setShowDexOnly] = useState(true);

  const filterTransactions = (txs) => {
    if (!txs) return [];
    
    console.log('Total transactions before filtering:', txs.length);
    
    const filtered = txs.filter(tx => {
      const sender = tx.Transfer.Sender.toLowerCase();
      const receiver = tx.Transfer.Receiver.toLowerCase();
      const senderIsDEX = isDEXAddress(sender);
      const receiverIsDEX = isDEXAddress(receiver);
      
      // Log DEX detection
      if (senderIsDEX || receiverIsDEX) {
        console.log('DEX transaction found:', {
          sender,
          receiver,
          senderIsDEX,
          receiverIsDEX,
          amount: tx.Transfer.Amount
        });
      }
      
      // If we're in DEX-only mode, keep only transactions where exactly one party is a DEX
      if (showDexOnly) {
        return (senderIsDEX && !receiverIsDEX) || (!senderIsDEX && receiverIsDEX);
      }
      
      return true;
    });
    
    console.log('Transactions after filtering:', filtered.length);
    return filtered;
  };

  const filteredTransactions = filterTransactions(transactions);
  const totalPagesTransactions = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const currentTransactions = filteredTransactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );

  const fetchData = async () => {
    if (!contract) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const holdersData = await fetchTopHolders(contract);
      
      if (!holdersData || !Array.isArray(holdersData)) {
        throw new Error('Invalid holders data received');
      }
      
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

      const validAddresses = validHolders.map(h => h.Holder.Address);
      const transactionsData = await fetchTransactions(validAddresses, contract, timeRange);
      
      setHolders(validHolders);
      setTransactions(transactionsData);
      
      const filteredTxs = filterTransactions(transactionsData);
      const statsData = calculateStatistics(validHolders, filteredTxs);
      if (statsData) {
        setStats(statsData);
        const activity = processTransactions(filteredTxs, validHolders);
        setHolderActivity(activity);
      }
      
    } catch (err) {
      console.error('Data fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (transactions, holders) => {
    const activity = {};
    
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

  const NavBar = () => {
    const location = useLocation();
    
    return (
      <nav className="app-nav">
        <ul>
          <li>
            <Link 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              Top Holder Analysis
            </Link>
          </li>
          <li>
            <Link 
              to="/giga-degens" 
              className={location.pathname === '/giga-degens' ? 'active' : ''}
            >
              Giga Degens 🔍
            </Link>
          </li>
        </ul>
      </nav>
    );
  };

  const renderPagination = () => {
    if (transactions.length <= transactionsPerPage) return null;

    return (
      <div className="pagination">
        <button
          onClick={() => setCurrentPage(prev => prev - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPagesTransactions}</span>
        <button
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={currentPage === totalPagesTransactions}
        >
          Next
        </button>
      </div>
    );
  };

  const DisplayModeToggle = () => (
    <button
      onClick={() => setShowDexOnly(!showDexOnly)}
      style={{
        padding: '8px 16px',
        backgroundColor: showDexOnly ? '#00ffbb' : '#2a2b2e',
        color: showDexOnly ? '#1a1b1e' : '#e0e0e0',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontSize: '0.9em',
        fontWeight: 'bold',
        marginBottom: '20px'
      }}
    >
      {showDexOnly ? '🔍 DEX-Only Mode Active' : '🔍 Showing All Transactions'}
    </button>
  );

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Switch>
          <Route exact path="/">
            <div className="container">
              <h1>Token Holder Analysis</h1>
              
              <div className="search-container">
                <input
                  type="text"
                  value={contract}
                  onChange={(e) => setContract(e.target.value)}
                  placeholder="Enter token contract address"
                />
                <button onClick={fetchData}>Analyze</button>
              </div>

              <TimeRangeSelector />
              <DisplayModeToggle />

              {error && (
                <div className="error-message">
                  Error: {error}
                </div>
              )}

              {/* Market Statistics Panel */}
              {stats && (
                <div className="stats-panel">
                  <div>
                    <strong>{timeRange}h Trading Summary {showDexOnly ? '(DEX Trades Only)' : '(All Trades)'}:</strong> Top holders traded{' '} 
                    <strong>{stats.totalVolume24h.toLocaleString()} {stats.tokenSymbol}</strong>{' '}
                    tokens in the last {timeRange} hours ({' '}
                    <span className="buy-color">{stats.volumeBreakdown.buys}% buys</span>
                    {' / '}
                    <span className="sell-color">{stats.volumeBreakdown.sells}% sells</span>
                    ). This represents{' '}
                    <strong>
                      {((stats.totalVolume24h / stats.totalHoldings) * 100).toFixed(1)}%
                    </strong>
                    {' '}of total holdings.
                  </div>

                  <div className="trading-activity">
                    Trading Activity{showDexOnly ? ' (DEX Only)' : ''}: {' '}
                    <span className="buy-color">
                      Bought {stats.tradingActivity.percentOfHoldingsBought}%
                    </span>
                    {' / '}
                    <span className="sell-color">
                      Sold {stats.tradingActivity.percentOfHoldingsSold}%
                    </span>
                    {' '}of top holders' total holdings
                  </div>

                  <div className="individual-activity">
                    Individual Trading Activity{showDexOnly ? ' (DEX Only)' : ''}: {' '}
                    <span className="buy-color">
                      Average buyer bought {stats.tradingActivity.averageBuyerPercentage}%
                    </span>
                    {' / '}
                    <span className="sell-color">
                      Average seller sold {stats.tradingActivity.averageSellerPercentage}%
                    </span>
                    {' '}of their holdings
                  </div>

                  {/* Market Direction */}
                  {stats.tradingMomentum && (
                    <div className="market-direction">
                      <strong>Market Direction{showDexOnly ? ' (DEX Only)' : ''}:</strong>{' '}
                      <span className={`signal-${stats.tradingMomentum.signal.toLowerCase()}`}>
                        {stats.tradingSignal.description}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Transactions Table */}
              {filteredTransactions.length > 0 && (
                <div className="transactions-table">
                  <h3>Recent Transactions {showDexOnly ? '(DEX Trades Only)' : '(All Trades)'}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>From</th>
                        <th>To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTransactions.map((tx, index) => {
                        const senderIsDEX = isDEXAddress(tx.Transfer.Sender.toLowerCase());
                        const receiverIsDEX = isDEXAddress(tx.Transfer.Receiver.toLowerCase());
                        
                        let txType;
                        if (senderIsDEX && !receiverIsDEX) {
                          // DEX -> Individual = BUY
                          txType = 'BUY';
                        } else if (!senderIsDEX && receiverIsDEX) {
                          // Individual -> DEX = SELL
                          txType = 'SELL';
                        } else {
                          // Individual -> Individual = TRANSFER
                          txType = 'TRANSFER';
                        }
                        
                        // Skip rendering if it's a DEX-to-DEX transaction
                        if (senderIsDEX && receiverIsDEX) {
                          return null;
                        }
                        
                        return (
                          <tr key={index}>
                            <td>{new Date(tx.Block.Time).toLocaleString()}</td>
                            <td style={{ 
                              color: txType === 'BUY' ? '#44bb44' : 
                                    txType === 'SELL' ? '#ff4444' :
                                    txType === 'TRANSFER' ? '#bbbb44' : '#888888'
                            }}>
                              {txType}
                            </td>
                            <td>{Number(tx.Transfer.Amount).toLocaleString()}</td>
                            <td>
                              <span 
                                title="Click to copy" 
                                onClick={() => copyToClipboard(tx.Transfer.Sender)}
                                style={{ 
                                  color: senderIsDEX ? '#00ffbb' : 'inherit',
                                  fontStyle: senderIsDEX ? 'italic' : 'normal'
                                }}
                              >
                                {formatAddress(tx.Transfer.Sender)}
                              </span>
                            </td>
                            <td>
                              <span 
                                title="Click to copy" 
                                onClick={() => copyToClipboard(tx.Transfer.Receiver)}
                                style={{ 
                                  color: receiverIsDEX ? '#00ffbb' : 'inherit',
                                  fontStyle: receiverIsDEX ? 'italic' : 'normal'
                                }}
                              >
                                {formatAddress(tx.Transfer.Receiver)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {renderPagination()}
            </div>
          </Route>

          <Route path="/giga-degens">
            <GigaDegens contract={contract} />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;