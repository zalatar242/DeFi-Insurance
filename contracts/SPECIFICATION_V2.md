# DeFi Insurance Protocol Specification V2

## Risk Mitigation Updates

### 1. Enhanced Oracle Security

```solidity
struct OracleConfig {
    address[] oracles;           // Multiple oracle sources
    uint256 minResponses;       // Minimum required responses
    uint256 twapWindow;         // Time window for TWAP
    uint256 heartbeatInterval;  // Maximum time between updates
    uint256 deviationThreshold; // Max allowed deviation between sources
}

struct TriggerCondition {
    uint256 threshold;          // Trigger threshold value
    uint256 confirmationBlocks; // Required blocks for confirmation
    uint256 cooldownPeriod;    // Time between trigger checks
    OracleConfig oracle;       // Oracle configuration
    bool isTriggered;          // Current trigger status
}
```

- Multi-oracle support (Chainlink + API3 + DIA)
- TWAP implementation for all price feeds
- Required confirmation periods for triggers
- Heartbeat checks for oracle freshness
- Cross-validation between oracle sources

### 2. Liquidity Protection

```solidity
struct RiskPool {
    uint256 allocatedLiquidity;      // Amount allocated to risk
    uint256 activeExposure;          // Current coverage sold
    uint256 riskWeight;              // Risk coefficient
    uint256 dynamicBuffer;           // Required liquidity buffer
    uint256 maxPoolCapacity;         // Maximum pool size
    TriggerCondition trigger;        // Payout conditions
    TieredPayout payoutStructure;    // Staged payout config
}

struct TieredPayout {
    uint256 immediatePayout;         // % paid immediately
    uint256[] remainingSchedule;     // Delayed payout schedule
    uint256[] scheduleIntervals;     // Time between payments
}
```

- Dynamic liquidity buffers based on risk exposure
- Tiered payout system for large claims
- Hard caps on pool capacity
- Risk-adjusted LP staking requirements

### 3. Premium and Risk Management

```solidity
struct RiskParameters {
    uint256 baseRate;               // Base premium rate
    uint256 riskWeight;             // Risk multiplier
    uint256 utilizationCap;         // Maximum utilization
    uint256 exposureCap;           // Max coverage per buyer
    uint256 volatilityMultiplier;  // Market condition adjuster
}

function calculatePremium(
    uint256 coverageAmount,
    bytes32 riskType
) public view returns (uint256) {
    RiskParameters memory params = getRiskParameters(riskType);
    uint256 marketConditionAdjustment = getMarketStressLevel();

    return baseRate * coverageAmount * (
        params.riskWeight *
        (1 + getUtilizationRate(riskType))^2 *
        (totalLiquidity / getRiskPoolLiquidity(riskType))^0.5 *
        (1 + marketConditionAdjustment)
    );
}
```

- Dynamic risk weight adjustments
- Market stress multipliers
- Utilization-based circuit breakers
- Exposure caps per buyer

### 4. Coverage Management

```solidity
struct Coverage {
    uint256 amount;                // Coverage amount
    uint256 premium;               // Paid premium
    uint256 expiration;           // Coverage end time
    bool autoRenewal;             // Auto-renewal status
    address stablecoinVault;      // Auto-payment vault
    bool isActive;                // Coverage status
}

function enableAutoRenewal(
    address stablecoinToken,
    uint256 allowance
) external {
    // Setup auto-renewal with stablecoin payments
}
```

- Auto-renewal system
- Stablecoin payment support
- One-click coverage purchase
- Premium payment scheduling

### 5. Governance and Security

```solidity
struct GovernanceConfig {
    uint256 proposalDelay;        // Timelock duration
    uint256 minApprovals;         // Required approvals
    address[] approvers;          // Approved signers
    mapping(bytes4 => bool) emergencyActions;  // Emergency functions
}

modifier withTimelock(bytes4 func) {
    require(
        proposals[func].timestamp + governanceConfig.proposalDelay <= block.timestamp,
        "Timelock active"
    );
    _;
}

modifier withMultiSig(bytes4 func) {
    require(
        proposals[func].approvals >= governanceConfig.minApprovals,
        "Insufficient approvals"
    );
    _;
}
```

- Timelocked governance actions
- Multi-sig requirements for critical functions
- Emergency pause mechanisms
- Upgradeable contract security

### 6. Risk Monitoring

```solidity
struct RiskMetrics {
    uint256 tvlTrend;            // TVL change rate
    uint256 utilizationRate;      // Pool utilization
    uint256 marketStressLevel;    // Market condition index
    uint256 lastUpdateTime;       // Last metrics update
}

function updateRiskMetrics() external {
    // Update risk metrics from oracles
    // Adjust risk parameters if needed
    // Emit risk level changes
}
```

- Real-time risk monitoring
- Automated parameter adjustments
- Market stress detection
- Risk level broadcasts

## Updated Events

```solidity
event RiskLevelChanged(bytes32 indexed riskType, uint256 oldLevel, uint256 newLevel);
event MarketStressDetected(uint256 level, uint256 timestamp);
event TieredPayoutInitiated(address indexed beneficiary, uint256[] schedule);
event OracleDeviation(address[] oracles, uint256[] prices, uint256 timestamp);
```

## Implementation Priorities

1. Oracle Security:
   - Multiple oracle integration
   - TWAP implementation
   - Deviation checks

2. Liquidity Protection:
   - Dynamic buffers
   - Tiered payouts
   - Pool caps

3. Risk Management:
   - Dynamic pricing
   - Market stress detection
   - Circuit breakers

4. User Experience:
   - Auto-renewals
   - Stablecoin payments
   - Risk metrics dashboard

## Initial Parameters

- Minimum oracle responses: 2/3
- TWAP window: 1 hour
- Confirmation blocks: 10
- Immediate payout: 40%
- Delayed payout schedule: 30% after 24h, 30% after 72h
- Market stress multiplier: 1.0-2.0x
- Maximum pool capacity: 20% of total liquidity
- Governance timelock: 24 hours
- Minimum approvals: 3/5
