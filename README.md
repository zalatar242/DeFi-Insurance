# DeFi Insurance Protocol (MaxCover Protocol)

A decentralized claim-less insurance protocol providing automated protection against stablecoin depegging and smart contract risks. The protocol uses RLUSD (Ripple USD) as its base currency for all operations including deposits, coverage, and rewards.

## Key Features

- **Automated Insurance**: No manual claims processing - payouts trigger automatically based on Chainlink oracle conditions
- **Dual Risk Protection**: Covers both stablecoin depegging and smart contract risks
- **Dynamic Pricing**: Premium rates adjust based on market exposure and utilization
- **Liquidity Pooling**: Single shared pool with risk-based APY calculations
- **Transparent Triggers**: Clear conditions for automated payouts using oracles (e.g., 5% stablecoin deviation for 1+ hour)

## Protocol Components

### Core Smart Contracts

- `InsurancePool.sol`: Manages deposits, coverage, and the shared liquidity pool
- `PayoutManager.sol`: Handles automated claim distributions and payouts
- `InsuranceOracle.sol`: Integrates Chainlink for price feeds and risk monitoring

### Frontend Application

- React-based dashboard for insurance buyers and liquidity providers
- Real-time premium calculations and risk analytics
- User-friendly interface for managing coverage and deposits

## How It Works

### For Insurance Buyers

1. Purchase coverage using RLUSD
2. Provide 20% security deposit
3. Get 30-day protection against both risk types
4. Receive automatic payouts if risks materialize

### For Liquidity Providers

1. Deposit RLUSD into the shared pool
2. Earn dynamic APY based on:
   - Base yield (2%)
   - Buyer premiums
   - Utilization multiplier
3. Subject to 7-day unstaking delay
4. Returns vary based on market exposure

## Premium Calculation

Premiums are calculated dynamically based on:

- Market desired exposure to each risk type
- Base rate (2% annual)
- Exposure-based multipliers

## Protocol Parameters

- Coverage Duration: 30 days
- Security Deposit: 20% of coverage amount
- Maximum Coverage: $10M
- Base Premium Rate: 2% annual

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install
   ```
3. Copy `.env.example` to `.env` and configure variables
4. Run the development environment:

   ```bash

   #If and only if Deploying contracts locally
   npx hardhat node

   # Deploy contracts
   npx hardhat run scripts/deploy.js

   # Start frontend
   cd frontend && npm start
   ```

## Testing

```bash
npx hardhat test
```

## Future Roadmap

- Multi-stablecoin coverage support
- Variable coverage duration options
- Custom exposure thresholds
- Adjustable fee structures
- Multiple base stablecoin support

## License

All rights reserved.
