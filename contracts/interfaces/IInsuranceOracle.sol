// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IInsurancePool} from "./IInsurancePool.sol";

interface IInsuranceOracle {
    // Structs
    struct RiskState {
        bool isTriggered; // Whether risk condition is currently triggered
        uint256 triggerStartTime; // When the risk condition was first detected
        uint256 lastUpdateTime; // Last time the risk was checked
        bytes32 details; // Additional details about the trigger
    }

    struct StablecoinState {
        uint256 price; // Current price in USD (scaled by 1e8)
        uint256 lastPriceUpdate; // Last price update timestamp
        bool isSupported; // Whether this stablecoin is monitored
        address chainlinkFeed; // Chainlink price feed address
    }

    // Events
    event RiskConditionTriggered(
        IInsurancePool.RiskType indexed riskType,
        uint256 timestamp,
        bytes32 details
    );

    event RiskConditionResolved(
        IInsurancePool.RiskType indexed riskType,
        uint256 timestamp
    );

    event StablecoinPriceUpdated(
        address indexed token,
        uint256 price,
        uint256 timestamp
    );

    event ExploitSignatureAdded(bytes32 indexed signature, string description);

    // Core functions
    function checkRiskCondition(
        IInsurancePool.RiskType riskType
    ) external returns (bool);

    function updateStablecoinPrice(address token) external returns (uint256);

    function checkSmartContractSafety() external returns (bool);

    // View functions
    function getRiskState(
        IInsurancePool.RiskType riskType
    ) external view returns (RiskState memory);

    function getStablecoinState(
        address token
    ) external view returns (StablecoinState memory);

    function getExploitSignatures() external view returns (bytes32[] memory);

    function isRiskConditionMet(
        IInsurancePool.RiskType riskType
    ) external view returns (bool);

    // Admin functions
    function addStablecoin(
        address token,
        address chainlinkFeed,
        string calldata symbol
    ) external;

    function removeStablecoin(address token) external;

    function addExploitSignature(
        bytes32 signature,
        string calldata description
    ) external;

    function removeExploitSignature(bytes32 signature) external;

    function setUtilizationFeed(address feed) external;

    function setInsurancePool(address pool) external;
}
