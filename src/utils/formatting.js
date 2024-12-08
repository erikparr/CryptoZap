export const formatAddress = (address) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatNumber = (number, decimals = 2) => {
  return number.toFixed(decimals);
}; 