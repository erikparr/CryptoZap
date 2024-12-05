import axios from 'axios';

const API_URL = 'https://streaming.bitquery.io/graphql';
const API_KEY = process.env.REACT_APP_BITQUERY_API_KEY;

export const fetchTopHolders = async (contractAddress) => {
  const query = {
    query: `
      {
        EVM(network: eth, dataset: combined) {
          TokenHolders(
            date: "2024-12-01"
            tokenSmartContract: "${contractAddress}"
            limit: { count: 100 }
            orderBy: { descending: Balance_Amount }
          ) {
            Holder {
              Address
            }
            Balance {
              Amount
            }
          }
        }
      }
    `,
  };
  const response = await axios.post(API_URL, query, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data.data.EVM.TokenHolders;
};

export const fetchTransactions = async (holderAddresses) => {
  try {
    const response = await fetch('your-api-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses: holderAddresses }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};