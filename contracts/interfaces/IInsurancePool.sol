// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IInsurancePool {
    // Risk Types (Single risk type for simplified design)
    enum RiskType {
        STABLECOIN_DEPEG // Only supporting stablecoin depeg risk
    }

    // Structs
    struct Coverage {
        uint256 amount; // Total coverage amount
        uint256 securityDeposit; // Security deposit amount
        uint256 startTime; // Coverage start timestamp
        uint256 expirationTime; // Coverage expiration timestamp
        uint256 lastFeeDeduction; // Last fee deduction timestamp
        uint256 remainingDeposit; // Remaining security deposit after fees
        bool isActive; // Whether coverage is currently active
    }

    struct RiskBucket {
        uint256 allocatedLiquidity; // LP funds allocated to this bucket
        uint256 activeCoverage; // Total active coverage amount
        uint256 pendingPayouts; // Pending/delayed payouts
        uint256 utilizationRate; // Current utilization rate (scaled by BASIS_POINTS)
    }

    struct DelayedPayout {
        uint256 amount; // Total payout amount
        uint256 unlockTime; // When second phase can be claimed
        bool firstPhaseClaimed; // Whether first 50% was claimed
        bool secondPhaseClaimed; // Whether second 50% was claimed
        RiskType triggerType; // Will always be STABLECOIN_DEPEG
    }

    // Events
    event CoveragePurchased(
        address indexed buyer,
        uint256 coverageAmount,
        uint256 securityDeposit,
        uint256 premium
    );
    event FeeDeducted(address indexed buyer, uint256 amount);
    event CoverageExpired(address indexed buyer);
    event PayoutInitiated(
        address indexed buyer,
        RiskType indexed riskType,
        uint256 amount
    );
    event PayoutCompleted(address indexed buyer, uint256 amount);
    event LiquidityAdded(
        address indexed provider,
        uint256 amount
    );
    event LiquidityWithdrawn(
        address indexed provider,
        uint256 amount
    );
    event UtilizationUpdated(RiskType indexed riskType, uint256 newRate);
    event WithdrawRequested(
        address indexed provider,
        uint256 amount,
        uint256 unlockTime
    );

    // View functions
    function getCoverage(address buyer) external view returns (Coverage memory);

    function getRiskBucket(
        RiskType bucket
    ) external view returns (RiskBucket memory);

    function getTotalLiquidity() external view returns (uint256);

    function getUtilizationRate(
        RiskType bucket
    ) external view returns (uint256);

    function calculatePremium(
        uint256 coverageAmount
    ) external view returns (uint256);

    function calculateRequiredDeposit(
        uint256 coverageAmount
    ) external pure returns (uint256);

    function getBucketWeight(RiskType bucket) external pure returns (uint256);

    function getDelayedPayout(
        address buyer
    ) external view returns (DelayedPayout memory);

    // Liquidity Provider functions
    function addLiquidity(uint256 amount) external;
    function requestWithdraw(uint256 amount) external;
    function executeWithdraw() external;

    // Coverage Buyer functions
    function purchaseCoverage(uint256 amount) external;
    function claimFirstPhasePayout() external;
    function claimSecondPhasePayout() external;

    // Premium Collection
    function deductFees() external returns (uint256);

    // Payout Management functions
    function initiatePayout(
        address buyer,
        uint256 amount,
        uint256 unlockTime,
        RiskType riskType
    ) external;

    function updatePayoutState(
        address buyer,
        bool firstPhaseClaimed,
        bool secondPhaseClaimed
    ) external;

    // Admin functions
    function setPayoutManager(address manager) external;
    function setOracle(address oracle) external;
    function pause() external;
    function unpause() external;
}
