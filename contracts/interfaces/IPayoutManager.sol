// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IInsurancePool} from "./IInsurancePool.sol";
import {IInsuranceOracle} from "./IInsuranceOracle.sol";

interface IPayoutManager {
    // Events
    event PayoutTriggered(
        IInsurancePool.RiskType indexed riskType, // Will always be STABLECOIN_DEPEG
        uint256 timestamp,
        uint256 totalCoverage
    );

    event FirstPhaseInitiated(
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    event SecondPhaseInitiated(
        address indexed buyer,
        uint256 amount,
        uint256 unlockTime
    );

    event PayoutProcessed(
        address indexed buyer,
        uint256 amount,
        bool isFirstPhase
    );

    // Structs
    struct PayoutState {
        bool isActive;                    // Whether a payout event is currently active
        IInsurancePool.RiskType riskType; // Will always be STABLECOIN_DEPEG
        uint256 triggerTime;              // When the payout was triggered
        uint256 totalCoverage;            // Total coverage amount affected
        bool isFirstPhaseComplete;        // Whether first phase payments are done
        bool isSecondPhaseComplete;       // Whether second phase payments are done
    }

    // Core functions - All payouts are for stablecoin depeg risk
    function checkAndTriggerPayout() external returns (bool);
    function processFirstPhasePayout(address buyer) external returns (uint256);
    function processSecondPhasePayout(address buyer) external returns (uint256);
    function validatePayoutConditions() external view returns (bool);

    // View functions
    function getCurrentPayoutState() external view returns (PayoutState memory);
    function canClaimFirstPhase(address buyer) external view returns (bool);
    function canClaimSecondPhase(address buyer) external view returns (bool);
    function calculatePayoutAmount(address buyer) external view returns (uint256);
    function getPayoutRiskType() external view returns (IInsurancePool.RiskType);

    // Constants
    function FIRST_PHASE_PERCENTAGE() external pure returns (uint256);  // 50%
    function SECOND_PHASE_DELAY() external pure returns (uint256);      // 72 hours
    function TRIGGER_CONFIRMATION_PERIOD() external pure returns (uint256); // 24 hours
    function MAX_PAYOUT_RATIO() external pure returns (uint256);        // Maximum % of pool that can be paid out

    // Admin functions
    function setInsurancePool(address pool) external;
    function setOracle(address oracle) external;
    function resetPayoutState() external;
    function pause() external;
    function unpause() external;

    // Emergency functions
    function emergencyCancel() external;
    function emergencyPause() external;
}
