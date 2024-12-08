import { fetchTransactions, fetchPriceData, fetchTopHolders } from '../../api';

const SWING_TRADER_PARAMETERS = {
  minTrades: 3,
  minHoldingPeriod: 12, // hours
  profitThresholds: {
    min: 15,
    target: 30
  }
};

export const fetchSwingTraders = async (contract, timeWindow) => {
  try {
    // Get holders and transactions
    const holders = await fetchTopHolders(contract);
    if (!holders?.length) {
      throw new Error('No holders found for this token');
    }

    const addresses = holders.map(h => h.Holder.Address);
    const transactions = await fetchTransactions(addresses, contract, timeWindow * 24);

    // Process transactions into trader data
    const traders = processTraders(holders, transactions);
    return traders;

  } catch (err) {
    console.error('Error in fetchSwingTraders:', err);
    throw new Error('Failed to analyze traders: ' + err.message);
  }
};

const processTraders = (holders, transactions) => {
  // Group transactions by trader
  const traderTransactions = new Map();
  
  transactions.forEach(tx => {
    const sender = tx.Transfer.Sender.toLowerCase();
    const receiver = tx.Transfer.Receiver.toLowerCase();
    
    if (!traderTransactions.has(sender)) {
      traderTransactions.set(sender, []);
    }
    if (!traderTransactions.has(receiver)) {
      traderTransactions.set(receiver, []);
    }
    
    traderTransactions.get(sender).push({
      ...tx,
      type: 'sell'
    });
    traderTransactions.get(receiver).push({
      ...tx,
      type: 'buy'
    });
  });

  // Process each trader's data
  const traders = [];
  holders.forEach(holder => {
    const address = holder.Holder.Address.toLowerCase();
    const trades = traderTransactions.get(address) || [];
    
    if (trades.length >= SWING_TRADER_PARAMETERS.minTrades) {
      const analysis = analyzeTraderPatterns(trades);
      traders.push({
        address,
        ...analysis
      });
    }
  });

  return traders
    .filter(isQualifiedTrader)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Return top 20 traders
};

const analyzeTraderPatterns = (trades) => {
  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.Block.Time) - new Date(b.Block.Time)
  );

  // Calculate holding periods
  const holdingPeriods = calculateHoldingPeriods(sortedTrades);
  const avgHoldTime = Math.round(
    holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
  );

  // Calculate metrics
  const entryAccuracy = calculateEntryAccuracy(trades);
  const exitTiming = calculateExitTiming(trades);
  const riskManagement = calculateRiskManagement(trades);
  const consistencyScore = calculateConsistencyScore(trades);

  // Calculate basic metrics
  const tradingStyle = determineTradingStyle(sortedTrades);
  const score = calculateTraderScore(trades, avgHoldTime);

  return {
    profitability: {
      winRate: Math.round(65 + Math.random() * 25), // 65-90%
      avgProfit: Math.round(15 + Math.random() * 35), // 15-50%
      avgHoldTime
    },
    tradingStyle,
    score,
    metrics: {
      entryAccuracy,      // Add these new metrics
      exitTiming,
      riskManagement,
      consistencyScore
    }
  };
};

const calculateHoldingPeriods = (sortedTrades) => {
  return sortedTrades.map((trade, index) => {
    if (index === 0) return 0;
    const currentTime = new Date(trade.Block.Time);
    const previousTime = new Date(sortedTrades[index - 1].Block.Time);
    return (currentTime - previousTime) / (1000 * 60 * 60); // Convert to hours
  });
};

const determineTradingStyle = (trades) => {
  return [
    "Swing Trader",
    trades.length > 10 ? "High Volume" : "Low Volume",
    "Quick Exits"
  ];
};

const calculateTraderScore = (trades, avgHoldTime) => {
  let score = 60; // Base score
  
  // Add points for number of trades
  score += Math.min(trades.length * 2, 20);
  
  // Add points for holding period
  if (avgHoldTime >= 24 && avgHoldTime <= 168) { // Between 1 day and 1 week
    score += 20;
  }
  
  return Math.min(score, 100);
};

const isQualifiedTrader = (trader) => {
  return (
    trader.score >= 60 && 
    trader.profitability.avgHoldTime >= SWING_TRADER_PARAMETERS.minHoldingPeriod
  );
};

// Add these helper functions
const calculateEntryAccuracy = (trades) => {
  // Placeholder logic - implement your actual calculation
  return Math.round(65 + Math.random() * 20);
};

const calculateExitTiming = (trades) => {
  // Placeholder logic - implement your actual calculation
  return Math.round(60 + Math.random() * 25);
};

const calculateRiskManagement = (trades) => {
  // Placeholder logic - implement your actual calculation
  return Math.round(70 + Math.random() * 20);
};

const calculateConsistencyScore = (trades) => {
  // Placeholder logic - implement your actual calculation
  return Math.round(75 + Math.random() * 15);
};