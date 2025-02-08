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

The protocol has two risk buckets that determine premium pricing:

1. **Stablecoin Depegging Risk Bucket** (50% weight)
   - Assesses stablecoin stability risk
   - Higher utilization in this bucket increases premium for depegging risk
   - Triggered when stablecoin price deviates more than 5% from $1 for over 1 hour

2. **Smart Contract Risk Bucket** (50% weight)
   - Assesses protocol security risk
   - Higher utilization in this bucket increases premium for smart contract risk
   - Triggered by predefined signatures of known exploit patterns

### Coverage Model

1. Insurance Buyers:
   - Purchase coverage using the base stablecoin (RLUSD)
   - Total premium calculated based on utilization of both risk buckets
   - Premium = Base Rate * (0.5 * StablecoinBucketMultiplier + 0.5 * SmartContractBucketMultiplier)
   - Provide security deposit in base stablecoin (20% of coverage amount)
   - Initial coverage fee deducted from deposit to activate coverage
   - Ongoing fees automatically deducted from deposit over time
   - Coverage duration is fixed at 30 days
   - Coverage protects against both monitored risk types

2. Liquidity Providers:
   - Provide liquidity in base stablecoin (RLUSD)
   - Can provide liquidity to specific risk buckets
   - Specify percentage allocation across buckets
   - Allocations directly affect bucket utilization rates
   - All provided liquidity is pooled together for maximum capital efficiency
   - Earn fees in base stablecoin proportional to their stake across buckets
   - Subject to a 7-day unstaking delay
   - Returns vary based on bucket utilization and risk weights

### Premium Calculation

- Each risk bucket has its own utilization rate
- Higher utilization in a bucket = higher premium component for that risk
- Total premium = weighted sum of premiums from each bucket
- Risk weights:
  - Stablecoin Depeg: 50%
  - Smart Contract Risk: 50%

#### Utilization-Based Premium Multipliers

- Base formula for each bucket: Base Rate * (1 + Utilization Multiplier)
- Utilization calculation per bucket:
  - Utilization = (Total Active Coverage + Pending Payouts) / Total Allocated Liquidity
  - Includes both active coverage amounts and pending/delayed payouts
  - Updated whenever coverage is purchased or payouts are triggered
- Utilization Multiplier calculation:
  - For utilization ≤ 50%: Multiplier = Utilization%
  - For utilization > 50%: Multiplier = Utilization% ^ 2
- Example:
  - At 30% utilization: 2% * (1 + 0.3) = 2.6% annual rate
  - At 80% utilization: 2% * (1 + 0.64) = 3.28% annual rate
- Maximum premium cap at 6% annual rate per bucket

#### Total Premium Example

Given:
- Stablecoin Bucket: 80% utilized = 3.28% adjusted rate
- Smart Contract Bucket: 50% utilized = 3% adjusted rate

Total Premium = (3.28% * 0.5) + (3% * 0.5)
= 1.64% + 1.5%
= 3.14% annual rate

### Liquidity Management

- Providers deposit base stablecoin (RLUSD) for liquidity
- Providers specify allocation to risk buckets (for premium calculation)
- Allocations directly impact bucket utilization rates
- All provided liquidity goes into a single pool for payouts
- Single pool maximizes capital efficiency
- Bucket allocations only affect premium pricing
- Payouts come from the shared liquidity pool regardless of trigger type

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
- Base Premium Rate: 2% annual (adjusted by bucket utilization)
- Risk Weights: 50/50 split

### Dynamic Parameters

- Individual Bucket Utilization Rates
- Utilization-Based Premium Multipliers
- Weighted Premium Calculations
- Fee multipliers based on bucket utilization

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
   - Manages shared liquidity pool
   - Tracks bucket allocations and utilization rates
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

- Two risk buckets for premium calculation (50/50 weights)
- Single shared liquidity pool for payouts
- Dynamic pricing based on bucket utilization
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
- Custom risk weights
- Adjustable fee structures
- Support for multiple configurable base stablecoins
