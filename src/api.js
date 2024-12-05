import axios from 'axios';

const BITQUERY_ENDPOINT = 'https://streaming.bitquery.io/graphql';
const BITQUERY_TOKEN = process.env.REACT_APP_BITQUERY_TOKEN;

// Add retry logic
const axiosWithRetry = axios.create();
axiosWithRetry.interceptors.response.use(null, async (error) => {
  if (error.response) {
    // Handle rate limiting
    if (error.response.status === 429) {
      console.log('Rate limited, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return axiosWithRetry(error.config);
    }
    // Handle temporary failures
    if (error.response.status === 424) {
      console.log('Temporary failure, retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return axiosWithRetry(error.config);
    }
  }
  throw error;
});

console.log('Token available:', !!process.env.REACT_APP_BITQUERY_TOKEN);

// Add this list at the top of your file
const knownDEXAddresses = [
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap V3 Router
  '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch Router
  // Add more as needed
].map(addr => addr.toLowerCase());

const TRANSACTION_THRESHOLD = 30; // Lowered from 50 to catch high-frequency traders
const SMALL_TRADE_THRESHOLD = 500;
const HIGH_VALUE_THRESHOLD = 100000;
const REPEAT_THRESHOLD = 8; // Lowered from 12 to be more sensitive

export const isLikelyDEX = (transactions, address) => {
  if (!transactions) return false;
  
  const addressTxs = transactions.filter(tx => 
    tx.Transfer.Sender.toLowerCase() === address.toLowerCase() || 
    tx.Transfer.Receiver.toLowerCase() === address.toLowerCase()
  );

  // Check transaction frequency
  if (addressTxs.length > TRANSACTION_THRESHOLD) {
    console.log(`Filtered ${address} - high transaction count: ${addressTxs.length}`);
    return true;
  }

  // Group by time windows and amounts
  const txGroups = {};
  let smallTradesCount = 0;
  let largeTradesCount = 0;
  let timeWindowCount = new Set(); // Track number of different time windows with activity

  addressTxs.forEach(tx => {
    const amount = Number(tx.Transfer.Amount);
    const time = new Date(tx.Block.Time).getTime();
    const timeWindow = Math.floor(time / (5 * 60 * 1000)); // 5-minute windows
    timeWindowCount.add(timeWindow);
    
    const key = `${Math.floor(amount)}_${timeWindow}`;
    txGroups[key] = (txGroups[key] || 0) + 1;
    
    if (amount < SMALL_TRADE_THRESHOLD) {
      smallTradesCount++;
    } else if (amount > HIGH_VALUE_THRESHOLD) {
      largeTradesCount++;
    }
  });

  // Check for sustained trading activity
  if (timeWindowCount.size >= 5 && smallTradesCount > 10) {
    console.log(`Filtered ${address} - sustained trading activity: ${timeWindowCount.size} windows`);
    return true;
  }

  return false;
};

export const fetchTopHolders = async (contract) => {
  if (!BITQUERY_TOKEN) {
    throw new Error('Bitquery token is not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const timestamp = oneDayAgo.toISOString();

  // First, get top 100 holders
  const query = `
    query {
      EVM(dataset: archive) {
        TokenHolders(
          tokenSmartContract: "${contract}"
          date: "${today}"
          limit: {count: 100}
          orderBy: {descendingByField: "Balance_Amount"}
          where: {Balance: {Amount: {gt: "0"}}}
        ) {
          Balance {
            Amount
          }
          Holder {
            Address
          }
          Currency {
            Name
            Symbol
          }
        }
      }
    }
  `;

  try {
    console.log('Making request for top holders...');
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-KEY': BITQUERY_TOKEN
    };

    const response = await axios({
      url: BITQUERY_ENDPOINT,
      method: 'post',
      headers: headers,
      data: { query }
    });

    console.log('Raw response data structure:', JSON.stringify(response.data, null, 2));

    if (response.data?.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    let holders = response.data?.data?.EVM?.TokenHolders || [];

    // First get all transactions
    const txResponse = await fetchTransactions(
      holders.map(h => h.Holder.Address), 
      contract
    );
    const transactions = txResponse || [];

    // Filter holders
    const filteredHolders = holders.filter(holder => {
      const address = holder.Holder.Address.toLowerCase();
      
      // Check known DEX addresses
      if (knownDEXAddresses.includes(address)) {
        console.log(`Filtered out known DEX: ${address}`);
        return false;
      }

      // Check transaction patterns
      if (isLikelyDEX(transactions, address)) {
        return false;
      }

      return true;
    });

    return filteredHolders;
  } catch (error) {
    console.error('Error in fetchTopHolders:', error);
    throw error;
  }
};

export const TIME_RANGES = {
  '1H': 1,
  '6H': 6,
  '12H': 12,
  '24H': 24
};

export const fetchTransactions = async (holderAddresses, contract, timeRange = 24) => {
  const timeAgo = new Date();
  timeAgo.setHours(timeAgo.getHours() - timeRange);
  const timestamp = timeAgo.toISOString();

  const query = `
    query {
      EVM(dataset: archive) {
        Transfers(
          where: {
            Block: {Time: {since: "${timestamp}"}},
            Transfer: {
              Currency: {SmartContract: {is: "${contract}"}},
              Sender: {in: ${JSON.stringify(holderAddresses)}}
            }
          }
          limit: {count: 100}
          orderBy: {descending: Block_Time}
        ) {
          Block {
            Time
          }
          Transfer {
            Amount
            Sender
            Receiver
            Currency {
              Symbol
            }
          }
        }

        ReceivingTransfers: Transfers(
          where: {
            Block: {Time: {since: "${timestamp}"}},
            Transfer: {
              Currency: {SmartContract: {is: "${contract}"}},
              Receiver: {in: ${JSON.stringify(holderAddresses)}}
            }
          }
          limit: {count: 100}
          orderBy: {descending: Block_Time}
        ) {
          Block {
            Time
          }
          Transfer {
            Amount
            Sender
            Receiver
            Currency {
              Symbol
            }
          }
        }
      }
    }
  `;

  try {
    console.log('Fetching recent transactions for holders...');
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-KEY': BITQUERY_TOKEN
    };

    const response = await axios({
      url: BITQUERY_ENDPOINT,
      method: 'post',
      headers: headers,
      data: { query }
    });

    console.log('Raw transactions data:', JSON.stringify(response.data, null, 2));

    if (response.data?.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    // Combine both sending and receiving transactions
    const sendingTransfers = response.data?.data?.EVM?.Transfers || [];
    const receivingTransfers = response.data?.data?.EVM?.ReceivingTransfers || [];
    
    // Add deduplication logic
    const allTransfers = [...sendingTransfers, ...receivingTransfers]
      .sort((a, b) => new Date(b.Block.Time) - new Date(a.Block.Time))
      .filter((tx, index, self) => 
        index === self.findIndex(t => 
          t.Block.Time === tx.Block.Time && 
          t.Transfer.Amount === tx.Transfer.Amount &&
          t.Transfer.Sender === tx.Transfer.Sender &&
          t.Transfer.Receiver === tx.Transfer.Receiver
        )
      );

    return allTransfers;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}; 

// Add helper function to calculate percentage change
const calculatePercentageChange = (amount, balance) => {
  if (!balance) return 100; // If no previous balance, it's a 100% increase
  return (amount / balance) * 100;
};

// Modify the transaction processing logic
export const processTransactions = (transactions, holders) => {
  const holderActivity = {};
  
  // Initialize holder activity
  holders.forEach(holder => {
    const address = holder.Holder.Address.toLowerCase();
    holderActivity[address] = {
      buys: 0,
      sells: 0,
      netAmount: 0,
      lastActivity: null
    };
  });

  // Process each transaction
  transactions.forEach(tx => {
    const { Transfer: { Amount, Sender, Receiver }, Block: { Time } } = tx;
    const amount = Number(Amount);
    
    const senderLower = Sender.toLowerCase();
    const receiverLower = Receiver.toLowerCase();
    
    if (holderActivity[senderLower]) {
      holderActivity[senderLower].sells += amount;
      holderActivity[senderLower].netAmount -= amount;
      holderActivity[senderLower].lastActivity = Time;
    }
    
    if (holderActivity[receiverLower]) {
      holderActivity[receiverLower].buys += amount;
      holderActivity[receiverLower].netAmount += amount;
      holderActivity[receiverLower].lastActivity = Time;
    }
  });

  return holderActivity;
};

// In your GraphQL query, make sure to include holder balances
const query = `
  {
    EVM {
      // ... existing query ...
      TokenHolders {
        Balance {
          Amount
        }
        Holder {
          Address
        }
      }
    }
  }
`; 

// Move priceQuery inside the fetchPriceData function
export const fetchPriceData = async (contract) => {
  // Define the query here so it has access to the contract parameter
  const priceQuery = `
    {
      EVM {
        DEXTrades(
          where: {
            BaseCurrency: {is: "${contract}"}
          }
          orderBy: {descending: Block_Time}
          limit: 1000
        ) {
          Block {
            Time
          }
          Price: QuotePrice
        }
      }
    }
  `;

  try {
    const response = await axiosWithRetry.post(
      BITQUERY_ENDPOINT,
      { query: priceQuery },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': BITQUERY_TOKEN,
        },
      }
    );

    const trades = response.data.data.EVM.DEXTrades;
    if (!trades || trades.length === 0) return null;

    // Get current price
    const currentPrice = trades[0].Price;

    // Get 24h ago price
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldPrice = trades.find(t => new Date(t.Block.Time) <= oneDayAgo)?.Price || trades[trades.length - 1].Price;

    // Calculate price change percentage
    const priceChange24h = ((currentPrice - oldPrice) / oldPrice) * 100;

    return {
      currentPrice,
      priceChange24h
    };
  } catch (error) {
    console.error('Error fetching price data:', error);
    return null;
  }
};

// Update your main fetch function
export const fetchData = async (contract) => {
  const [holdersData, transactionsData, priceData] = await Promise.all([
    fetchTopHolders(contract),
    fetchTransactions(contract),
    fetchPriceData(contract)
  ]);

  return {
    holders: holdersData,
    transactions: transactionsData,
    price: priceData
  };
};