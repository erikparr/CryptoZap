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

const queryBitquery = async (query, variables) => {
  if (!BITQUERY_TOKEN) {
    throw new Error('Bitquery token is not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': BITQUERY_TOKEN
  };

  const response = await axiosWithRetry({
    url: BITQUERY_ENDPOINT,
    method: 'post',
    headers: headers,
    data: { 
      query,
      variables
    }
  });

  if (response.data?.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
  }

  return response.data;
};

console.log('Token available:', !!process.env.REACT_APP_BITQUERY_TOKEN);
console.log('Loading DEX addresses...');

export const knownDEXAddresses = [
  // Uniswap
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap V3 Router
  '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router 02
  
  // 1inch
  '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch Router
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch V5 Router
  
  // SushiSwap
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', // SushiSwap Router
  
  // PancakeSwap
  '0x10ed43c718714eb63d5aa57b78b54704e256024e', // PancakeSwap Router
  '0x13f4ea83d0bd40e75c8222255bc855a974568dd4', // PancakeSwap Router V3
  
  // Other DEXs
  '0x40359b38db010a1d0ff5e7d00cc477d5b393bd72', // BasedAI staking
  '0x9642b23ed1e01df1092b92641051881a322f5d4e', // MEXC
  '0x3cc936b795a188f0e246cbb2d74c5bd190aecf18', //
'0x9008d19f58aabd9ed0d60971565aa8510560ab41', // cowswap  
  // Balancer
  '0xba12222222228d8ba445958a75a0704d566bf2c8', // Balancer Vault
  
  // Curve
  '0x99a58482bd75cbab83b27ec03ca68ff489b5788f', // Curve Router
  
  // 0x Protocol
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x Router
  
  // Kyber
  '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6', // KyberSwap Router
  
  // Bancor
  '0x2f9ec37d6ccfff1cab21733bdadede11c823ccb0', // Bancor Network
  
  // DODO
  '0xa356867fdcea8e71aeaf87805808803806231fdc', // DODO Router
  
  // Shibaswap
  '0x03f7724180aa6b939894b5ca4314783b0b36b329',  // ShibaSwap Router
  '0x40359b38db010a1d0ff5e7d00cc477d5b393bd72', // basedai staking
  '0x9642b23ed1e01df1092b92641051881a322f5d4e', // mexc 
  '0xfa4a4c553733f2e0c54f1c4b0ddc1fa2f5f10ce6',
  
  // More Uniswap-related
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', // Uniswap Universal Router
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b', // Uniswap Universal Router 2
  
  // TraderJoe
  '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd', // TraderJoe Router

  // More 1inch
  '0x11111112542d85b3ef69ae05771c2dccff4faa26', // 1inch Aggregation Router
  '0x1111111254760f7ab3f16433eea9304126dcd199', // 1inch V4
  
  // OpenOcean
  '0x6352a56caadc4f1e25cd6c75970fa768a3304e64', // OpenOcean Router
  
  // ParaSwap
  '0xdef171fe48cf0115b1d80b88dc8eab59176fee57', // ParaSwap Router
  
  // Matcha/0x
  '0x59a92749e07c5cd50dc79800de37aa0396c58a1d', // Matcha Router
  
  // DODO Additional
  '0x8f8dd7db1bda5ed3da8c9daf3bfa471c12d58486', // DODO V2 Proxy
  
  // Maverick
  '0x75e42e6f01baf1d6022bea862a28774a9f8a4a0c', // Maverick Router
  
  // Hashflow
  '0x9b8c989ff27e948f55b53bb19b3cc1947852e394', // Hashflow Router
  
  // Synthetix
  '0x8700daec35af8ff88c16bdf0418774cb3d7599b4', // Synthetix Proxy
  
  // Balancer Additional
  '0x7226daC5E62f46E5eB8E88527685eC5B7258F174', // Balancer Router
  
  // KyberSwap Additional
  '0x6131b5fae19ea4f9d964eac0408e4408b66337b5', // KyberSwap Router 2
  
  // Add these missing DEX addresses
  '0x8d58e202016122aae65be55694dbce1b810b4072', // Uniswap V2 Pool
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', // Uniswap Universal Router
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // ParaSwap Router
  '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch Router
  
].map(addr => addr.toLowerCase());

// Add debug logging to verify addresses are included
console.log('DEX Addresses after update:', knownDEXAddresses);

const TRANSACTION_THRESHOLD = 30;      // If an address has more than 30 transactions, it might be a DEX
const SMALL_TRADE_THRESHOLD = 500;     // Trades below 500 tokens are considered "small"
const HIGH_VALUE_THRESHOLD = 100000;   // Trades above 100,000 tokens are considered "high value"
const REPEAT_THRESHOLD = 8;            // If an address makes 8+ similar trades, it might be automated

export const isLikelyDEX = (transactions, address) => {
  if (!transactions) return false;
  
  const addressTxs = transactions.filter(tx => 
    tx.Transfer.Sender.toLowerCase() === address.toLowerCase() || 
    tx.Transfer.Receiver.toLowerCase() === address.toLowerCase()
  );

  if (addressTxs.length > TRANSACTION_THRESHOLD) {
    console.log(`High frequency trader detected: ${address} - ${addressTxs.length} transactions`);
    return true;
  }

  return false;
};

export const fetchTopHolders = async (contract, limit = 200) => {
  if (!BITQUERY_TOKEN) {
    throw new Error('Bitquery token is not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const query = `
    query {
      EVM(dataset: archive) {
        TokenHolders(
          tokenSmartContract: "${contract}"
          date: "${today}"
          limit: {count: ${limit}}
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

    let holders = response.data?.data?.EVM?.TokenHolders || [];
    
    // Create a Map object for holder rankings
    const holderRankings = new Map();
    holders.forEach((holder, index) => {
      if (holder?.Holder?.Address) {
        holderRankings.set(holder.Holder.Address.toLowerCase(), index + 1);
      }
    });

    console.log('Holder rankings Map created:', {
      size: holderRankings.size,
      sample: Array.from(holderRankings.entries()).slice(0, 3)
    });

    // Get addresses and pass the Map
    const holderAddresses = holders.map(h => h.Holder.Address);
    // Pass 24 as default timeRange if not specified
    const txResponse = await fetchTransactions(holderAddresses, contract, holderRankings, 24);

    // Filter out DEX addresses from holders
    const filteredHolders = holders.filter(holder => {
      const address = holder.Holder.Address.toLowerCase();
      return !knownDEXAddresses.includes(address);
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

export const fetchTransactions = async (holderAddresses, contract, holderRankings, timeRange = 24) => {
  // Validate holderRankings is a Map
  if (!(holderRankings instanceof Map)) {
    console.error('Invalid holderRankings:', holderRankings);
    holderRankings = new Map(); // Fallback to empty Map
  }

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

    if (response.data?.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    const sendingTransfers = response.data?.data?.EVM?.Transfers || [];
    const receivingTransfers = response.data?.data?.EVM?.ReceivingTransfers || [];
    
    const rawTransfers = [...sendingTransfers, ...receivingTransfers]
      .sort((a, b) => new Date(b.Block.Time) - new Date(a.Block.Time))
      .filter((tx, index, self) => 
        index === self.findIndex(t => 
          t.Block.Time === tx.Block.Time && 
          t.Transfer.Amount === tx.Transfer.Amount &&
          t.Transfer.Sender === tx.Transfer.Sender &&
          t.Transfer.Receiver === tx.Transfer.Receiver
        )
      );

    const filteredTransfers = rawTransfers.map(tx => {
      const sender = tx.Transfer.Sender.toLowerCase();
      const receiver = tx.Transfer.Receiver.toLowerCase();
      
      return {
        ...tx,
        senderRank: holderRankings.get(sender),
        receiverRank: holderRankings.get(receiver)
      };
    });

    console.log('Sample transaction with ranks:', {
      sample: filteredTransfers[0],
      rankingsSize: holderRankings.size
    });

    return {
      raw: rawTransfers,
      filtered: filteredTransfers
    };

  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

const calculatePercentageChange = (amount, balance) => {
  if (!balance) return 100;
  return (amount / balance) * 100;
};

export const processTransactions = (transactions, holders) => {
  const holderActivity = {};
  
  console.log('Known DEX addresses:', knownDEXAddresses);
  
  // Debug: Log all holders we're tracking
  console.log('Tracking holders:', holders.map(h => h.Holder.Address.toLowerCase()));
  
  holders.forEach(holder => {
    const address = holder.Holder.Address.toLowerCase();
    holderActivity[address] = {
      buys: 0,
      sells: 0,
      netAmount: 0,
      lastActivity: null
    };
  });

  transactions.forEach(tx => {
    const { Transfer: { Amount, Sender, Receiver }, Block: { Time } } = tx;
    const amount = Number(Amount);
    
    const senderLower = Sender.toLowerCase();
    const receiverLower = Receiver.toLowerCase();
    const senderIsDEX = knownDEXAddresses.includes(senderLower);
    const receiverIsDEX = knownDEXAddresses.includes(receiverLower);
    
    // Debug: Log each transaction analysis
    console.log('Analyzing transaction:', {
      sender: senderLower,
      receiver: receiverLower,
      senderIsDEX,
      receiverIsDEX,
      amount,
      time: Time,
      isInHolderList: {
        sender: holderActivity[senderLower] !== undefined,
        receiver: holderActivity[receiverLower] !== undefined
      }
    });

    // Skip DEX-to-DEX transactions
    if (senderIsDEX && receiverIsDEX) {
      console.log('Skipping DEX-to-DEX transaction');
      return;
    }
    
    // If sender is DEX and receiver is in our holder list, it's a BUY
    if (senderIsDEX && holderActivity[receiverLower]) {
      console.log('Recording BUY transaction');
      holderActivity[receiverLower].buys += amount;
      holderActivity[receiverLower].netAmount += amount;
      holderActivity[receiverLower].lastActivity = Time;
    }
    
    // If receiver is DEX and sender is in our holder list, it's a SELL
    if (receiverIsDEX && holderActivity[senderLower]) {
      console.log('Recording SELL transaction');
      holderActivity[senderLower].sells += amount;
      holderActivity[senderLower].netAmount -= amount;
      holderActivity[senderLower].lastActivity = Time;
    }
  });

  // Debug: Log final activity summary
  console.log('Final holder activity:', holderActivity);

  return holderActivity;
};

export const fetchPriceData = async (contract, timeWindow) => {
  try {
    const query = `
      query ($contract: String!, $from: DateTime) {
        EVM(dataset: archive) {
          DEXTrades(
            where: {
              Trade: {
                Buy: {Currency: {SmartContract: {is: $contract}}}
              }
              Block: {Time: {since: $from}}
            }
            orderBy: {descending: Block_Time}
          ) {
            Block {
              Time
            }
            Trade {
              Buy {
                Price
              }
            }
          }
        }
      }
    `;

    const variables = {
      contract: contract,
      from: new Date(Date.now() - timeWindow * 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await queryBitquery(query, variables);

    if (!response?.data?.EVM?.DEXTrades) {
      console.warn('No price data available for contract:', contract);
      return [];
    }

    return response.data.EVM.DEXTrades.map(trade => ({
      timestamp: trade.Block.Time,
      price: trade.Trade.Buy.Price
    }));

  } catch (err) {
    console.error('Error fetching price data:', err);
    return [];
  }
};

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