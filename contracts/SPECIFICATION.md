# DeFi Insurance Protocol Specification

## Overview

A simplified DeFi insurance protocol providing blanket coverage for protocol risks, initially focused on Aave as a prototype. The protocol automatically triggers payouts based on Chainlink oracle conditions without manual claims processing.

## Core Components

### Risk Types & Premium Calculation

The protocol has three risk buckets that determine premium pricing:

1. **Stablecoin Depegging Risk Bucket** (40% weight)

   - Assesses stablecoin stability risk
   - Higher utilization in this bucket increases premium for depegging risk
   - Triggered when stablecoin price deviates more than 5% from $1 for over 1 hour

2. **Liquidity Risk Bucket** (20% weight)

   - Assesses protocol liquidity risk
   - Higher utilization in this bucket increases premium for liquidity risk
   - Triggered when utilization rate exceeds 95% for more than 6 hours

3. **Smart Contract Risk Bucket** (40% weight)
   - Assesses protocol security risk
   - Higher utilization in this bucket increases premium for smart contract risk
   - Triggered by predefined signatures of known exploit patterns

### Coverage Model

1. Insurance Buyers:

   - Purchase blanket coverage for entire protocol
   - Total premium calculated based on utilization of all three risk buckets
   - Premium = Base Rate _ (0.4 _ StablecoinBucketMultiplier + 0.2 _ LiquidityBucketMultiplier + 0.4 _ SmartContractBucketMultiplier)
   - Provide security deposit (20% of coverage amount)
   - Initial coverage fee deducted from deposit to activate coverage
   - Ongoing fees automatically deducted from deposit over time
   - Coverage duration is fixed at 30 days
   - Coverage protects against all monitored risk types

2. Liquidity Providers:
   - Can provide liquidity to specific risk buckets
   - Specify percentage allocation across buckets
   - Allocations directly affect bucket utilization rates
   - All provided liquidity is pooled together for maximum capital efficiency
   - Earn fees proportional to their stake across buckets
   - Subject to a 7-day unstaking delay
   - Returns vary based on bucket utilization and risk weights

### Premium Calculation

- Each risk bucket has its own utilization rate
- Higher utilization in a bucket = higher premium component for that risk
- Total premium = weighted sum of premiums from each bucket
- Risk weights:
  - Stablecoin Depeg: 40%
  - Liquidity Shortage: 20%
  - Smart Contract Risk: 40%

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
- Liquidity Bucket: 30% utilized = 2.6% adjusted rate
- Smart Contract Bucket: 50% utilized = 3% adjusted rate

Total Premium = (3.28% * 0.4) + (2.6% * 0.2) + (3% * 0.4)
              = 1.312% + 0.52% + 1.2%
              = 3.032% annual rate

### Liquidity Management

- Providers specify allocation to risk buckets (for premium calculation)
- Allocations directly impact bucket utilization rates
- All provided liquidity goes into a single pool for payouts
- Single pool maximizes capital efficiency
- Bucket allocations only affect premium pricing
- Payouts come from the shared liquidity pool regardless of trigger type

### Oracle Integration

1. Risk Monitoring:

   - Uses Chainlink price feeds for stablecoin rates
   - Uses Chainlink data feeds for protocol metrics
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

## Protocol Parameters

### Fixed Parameters

- Coverage Duration: 30 days
- Unstaking Delay: 7 days
- Security Deposit: 20% of coverage amount
- Maximum Coverage: $10M
- Minimum Coverage: $1,000
- Initial Coverage Fee: 0.5% of coverage amount
- Base Premium Rate: 2% annual (adjusted by bucket utilization)
- Risk Weights: 40/20/40 split

### Dynamic Parameters

- Individual Bucket Utilization Rates
- Utilization-Based Premium Multipliers
- Weighted Premium Calculations
- Fee multipliers based on bucket utilization

## Technical Implementation

### Smart Contracts

1. InsurancePool.sol

   - Core contract managing deposits and coverage
   - Handles fee deductions from security deposits
   - Manages shared liquidity pool
   - Tracks bucket allocations and utilization rates

2. PayoutManager.sol

   - Manages automated payouts from shared pool
   - Validates oracle triggers
   - Processes claims distribution

3. InsuranceOracle.sol
   - Integrates with Chainlink
   - Monitors protocol risk conditions
   - Manages risk data aggregation

### Risk Bucket Architecture

- Three risk buckets for premium calculation (40/20/40 weights)
- Single shared liquidity pool for payouts
- Dynamic pricing based on bucket utilization
- Built-in buffer requirements

## Limitations and Constraints

1. Coverage:

   - Single protocol coverage per purchase
   - Fixed coverage duration
   - Requires security deposit

2. Liquidity:

   - Maximum pool capacity limits
   - Minimum stake requirements
   - Unstaking delays

3. Payouts:
   - Automated triggers only
   - Two-phase distribution
   - Maximum payout caps

## Future Considerations

- Multi-protocol coverage
- Variable coverage duration
- Custom risk weights
- Adjustable fee structures
