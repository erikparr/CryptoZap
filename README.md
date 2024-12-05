# ZAP IT - Token Monitor

A React application that provides real-time analytics for ERC-20 token holder activity, including:

1. Market direction analysis based on buy/sell pressure
2. Risk metrics including holder concentration and trading intensity
3. Detailed 24-hour trading statistics
4. Transaction monitoring for top holders
    
## Features

### Market Analytics
- Buy/sell pressure indicators with volume context
- Trading momentum signals (Strong buying, Light selling, etc.)
- Percentage-based analysis of trading activity
- Individual holder trading patterns

### Risk Assessment
- Holder concentration metrics
- Trading intensity analysis
- Volume distribution analytics
- Top holder activity monitoring

### Transaction Monitoring
- Real-time transaction feed
- Buy/sell classification
- Volume analysis
- Holder-specific activity tracking

## Setup

### Prerequisites
- Node.js (v16.x or v18.x)
- npm (included with Node.js)
- Bitquery API Key (get one at https://bitquery.io)

### Installation

1. Clone and install:
   ```bash
   git clone <repository_url>
   cd token-monitor
   npm install
   ```

2. Create `.env` file:
   ```bash
   REACT_APP_BITQUERY_TOKEN=your_api_key_here
   ```

3. Start development server:
   ```bash
   npm start
   ```

## Usage

1. Enter an ERC-20 token contract address
2. View comprehensive analytics including:
   - 24h trading summary
   - Buy/sell pressure
   - Risk metrics
   - Recent transactions

## Technical Details

### Data Sources
- Holder data: Bitquery GraphQL API
- Transaction data: Real-time transfer events
- Price data: DEX trading information

### Architecture
- React frontend with hooks for state management
- Axios for API communication
- Real-time data processing and analytics

## Future Enhancements

- Historical trend analysis
- Wallet profiling and categorization
- Advanced risk metrics
- Multi-token comparison
- Custom alert system

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please open an issue or PR for any improvements.