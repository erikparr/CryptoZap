// Transaction thresholds
export const TRANSACTION_THRESHOLD = 30;      // If an address has more than 30 transactions, it might be a DEX
export const SMALL_TRADE_THRESHOLD = 500;     // Trades below 500 tokens are considered "small"
export const HIGH_VALUE_THRESHOLD = 100000;   // Trades above 100,000 tokens are considered "high value"
export const REPEAT_THRESHOLD = 8;            // If an address makes 8+ similar trades, it might be automated

// Time ranges (in hours)
export const TIME_RANGES = {
  '1H': 1,
  '6H': 6,
  '12H': 12,
  '24H': 24
};

// API endpoints
export const BITQUERY_ENDPOINT = 'https://graphql.bitquery.io'; 