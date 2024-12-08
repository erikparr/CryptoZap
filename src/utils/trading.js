export const findLocalMinimum = (priceData, timestamp, windowHours) => {
  const windowStart = new Date(timestamp).getTime() - windowHours * 60 * 60 * 1000;
  const windowEnd = new Date(timestamp).getTime() + windowHours * 60 * 60 * 1000;

  const pricesInWindow = priceData.filter(data => {
    const time = new Date(data.Block.Time).getTime();
    return time >= windowStart && time <= windowEnd;
  }).map(data => data.Price);

  return Math.min(...pricesInWindow);
};

export const findLocalMaximum = (priceData, timestamp, windowHours = 24) => {
  if (!priceData || !Array.isArray(priceData)) {
    return null;
  }

  const windowMs = windowHours * 60 * 60 * 1000;
  const targetTime = new Date(timestamp).getTime();
  
  const windowPrices = priceData.filter(p => {
    const priceTime = new Date(p.timestamp).getTime();
    return Math.abs(priceTime - targetTime) <= windowMs;
  });

  if (!windowPrices.length) return null;
  
  return Math.max(...windowPrices.map(p => Number(p.price)));
}; 