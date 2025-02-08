# DeFi Insurance Protocol (MaxCover Protocol) Specification

## Overview

A simplified DeFi insurance protocol providing protection for stablecoin risks. The protocol operates using a configurable stablecoin as its base currency for all operations (deposits, coverage, rewards). The current implementation uses RLUSD (Reaper Liquidity USD) as the base stablecoin. The protocol automatically triggers payouts based on Chainlink oracle conditions without manual claims processing.

## Core Components

### Base Currency

The protocol uses a configurable stablecoin as its base currency for all operations:

- All deposits and coverage amounts are denominated in the base stablecoin
- Liquidity providers deposit the base stablecoin to provide coverage
- Premium payments and rewards are paid in the base stablecoin
- Currently implemented using RLUSD as the base stablecoin

### Risk Types & Premium Calculation

The protocol has two risk buckets that determine dynamic pricing of premiums based on market desired exposure:

1. **Stablecoin Depegging Risk Bucket**

   - Assesses stablecoin stability risk
   - More deposits indicate higher desired exposure to this risk
   - Higher desired exposure (more deposits) leads to lower APY
   - Triggered when stablecoin price deviates more than 5% from $1 for over 1 hour

2. **Smart Contract Risk Bucket**
   - Assesses protocol security risk
   - More deposits indicate higher desired exposure to this risk
   - Higher desired exposure (more deposits) leads to lower APY
   - Triggered by sudden loss of funds from contract

### Coverage Model

1. Insurance Buyers:

   - Purchase coverage using the base stablecoin (RLUSD)
   - Total premium calculated based on market desired exposure to each risk type
   - Premium = Base Rate \* (SmartContractExposureMultiplier + StablecoinExposureMultiplier)
   - Provide security deposit in base stablecoin (20% of coverage amount)
   - Initial coverage fee deducted from deposit to activate coverage
   - Ongoing fees automatically deducted from deposit over time
   - Coverage duration is fixed at 30 days
   - Coverage protects against both monitored risk types

2. Liquidity Providers:
   - Provide liquidity in base stablecoin (RLUSD)
   - Can indicate risk preference by allocating to specific risk buckets
   - Allocations affect APY through market desired exposure mechanism
   - All provided liquidity is pooled together in a single pool
   - Earn fees in base stablecoin proportional to their total stake
   - Subject to a 7-day unstaking delay
   - Returns vary based on market desired exposure to each risk type

### Premium Calculation

- Market desired exposure is determined by deposit distribution
- Higher deposits in a bucket = higher desired exposure = lower APY
- Lower deposits in a bucket = lower desired exposure = higher APY
- Total premium considers exposure levels in both risk types

#### Exposure-Based Premium Multipliers

- Base formula: Base Rate \* (1 + Exposure Multiplier)
- Exposure calculation per bucket:
  - Exposure = Total Bucket Deposits / Total Protocol Deposits
  - Higher exposure results in lower premium multiplier
  - Updated whenever deposits change or withdrawals occur
- Exposure Multiplier calculation:
  - For exposure ≥ 50%: Multiplier = Exposure%
  - For exposure < 50%: Multiplier = Exposure% ^ 2
- Example:
  - At 70% exposure: 2% \* (1 + 0.7) = 3.4% annual rate
  - At 30% exposure: 2% \* (1 + 0.09) = 2.18% annual rate
- Maximum premium cap at 6% annual rate per risk type

#### Total Premium Example

Given:

- Stablecoin Risk: 70% exposure = 3.4% adjusted rate
- Smart Contract Risk: 30% exposure = 2.18% adjusted rate

Total Premium = (3.4% + 2.18%) / 2
= 2.79% annual rate

### Dynamic APY Calculation

#### Core Formula

```
APY = (Base Yield + Premium Share) * Utilization Multiplier
```

#### Components

1. **Base Yield (2%)**

   - Minimum guaranteed return for LPs
   - Helps maintain liquidity during low coverage periods

2. **Premium Share**

   ```
   Premium Share = (Total Premium Income * 365) / (Total Deposits)
   ```

   - Distributes actual premium income to LPs
   - Adjusts dynamically based on coverage demand

3. **Utilization Multiplier**

   ```
   Utilization = Total Active Coverage / Total Deposits

   If Utilization < 50%:
     Multiplier = 1 + (Utilization / 2)
   If 50% ≤ Utilization ≤ 80%:
     Multiplier = 1.25 + (Utilization - 0.5)
   If Utilization > 80%:
     Multiplier = 1.55 + (Utilization - 0.8) * 2
   ```

#### Example Calculations

1. **Low Utilization Scenario**

   - Total Deposits: 1,000,000 USDC
   - Active Coverage: 300,000 USDC (30% utilization)
   - Annual Premium Income: 20,000 USDC

   ```
   Premium Share = 20,000 / 1,000,000 = 2%
   Utilization Multiplier = 1 + (0.3 / 2) = 1.15
   APY = (2% + 2%) * 1.15 = 4.6%
   ```

2. **High Utilization Scenario**
   - Total Deposits: 1,000,000 USDC
   - Active Coverage: 850,000 USDC (85% utilization)
   - Annual Premium Income: 60,000 USDC
   ```
   Premium Share = 60,000 / 1,000,000 = 6%
   Utilization Multiplier = 1.55 + (0.85 - 0.8) * 2 = 1.65
   APY = (2% + 6%) * 1.65 = 13.2%
   ```

### Liquidity Management

- All liquidity is pooled in a single shared pool
- Providers deposit base stablecoin (RLUSD) into the shared pool
- Risk bucket allocations only affect APY calculation
- Market desired exposure determined by deposit distribution
- Single pool ensures maximum capital efficiency
- All payouts come from the shared pool regardless of trigger type

### Oracle Integration

1. Risk Monitoring:

   - Uses Chainlink price feeds for stablecoin rates
   - Updates every block
   - Maintains continuous risk assessment

2. Risk Conditions:
   - Predefined trigger conditions for each risk type
   - Automated checks via Chainlink automation
   - No manual intervention required

### Automated Payouts

1. Trigger Process:

   - Oracle detects trigger condition from any risk type
   - 24-hour delay period starts
   - If condition persists, payout is processed

2. Payout Distribution:
   - 50% paid immediately from shared liquidity pool
   - 50% after 72-hour delay
   - Proportional to coverage amount
   - All payouts in base stablecoin (RLUSD)

## Protocol Parameters

### Fixed Parameters

- Coverage Duration: 30 days
- Unstaking Delay: 7 days
- Security Deposit: 20% of coverage amount
- Maximum Coverage: $10M (denominated in base stablecoin)
- Minimum Coverage: $1,000 (denominated in base stablecoin)
- Initial Coverage Fee: 0.5% of coverage amount
- Base Premium Rate: 2% annual (adjusted by exposure levels)

### Dynamic Parameters

- Market Exposure Levels per Risk Type
- Exposure-Based Premium Multipliers
- Premium Calculations
- APY adjustments based on market desired exposure

## Technical Implementation

### Base Stablecoin Configuration

Current Implementation (RLUSD):

- Testnet Contract: 0x866386C7f4F2A5f46C5F4566D011dbe3e8679BE4
- Testnet Proxy: 0xe101FB315a64cDa9944E570a7bFfaFE60b994b1D
- Mainnet Contract: 0xCfd748B9De538c9f5b1805e8db9e1d4671f7F2ec
- Mainnet Proxy: 0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD

### Smart Contracts

1. InsurancePool.sol

   - Core contract managing deposits and coverage
   - Handles fee deductions from security deposits
   - Manages single shared liquidity pool
   - Tracks deposit distribution for exposure calculation
   - Configurable base stablecoin integration

2. PayoutManager.sol

   - Manages automated payouts from shared pool
   - Validates oracle triggers
   - Processes claims distribution
   - Handles stablecoin payouts

3. InsuranceOracle.sol
   - Integrates with Chainlink
   - Monitors stablecoin prices and smart contract conditions
   - Manages risk data aggregation

### Risk Bucket Architecture

- Two risk types for premium calculation
- Single shared liquidity pool for all operations
- Dynamic pricing based on market desired exposure
- Built-in buffer requirements

## Limitations and Constraints

1. Coverage:

   - Single stablecoin coverage per purchase
   - Fixed coverage duration
   - Requires security deposit in base stablecoin

2. Liquidity:

   - Maximum pool capacity limits
   - Minimum stake requirements
   - Unstaking delays
   - All operations in base stablecoin only

3. Payouts:
   - Automated triggers only
   - Two-phase distribution
   - Maximum payout caps
   - All payouts in base stablecoin

## Future Considerations

- Multi-stablecoin coverage
- Variable coverage duration
- Custom exposure thresholds
- Adjustable fee structures
- Support for multiple configurable base stablecoins
