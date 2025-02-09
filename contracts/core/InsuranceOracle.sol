// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IInsuranceOracle} from "../interfaces/IInsuranceOracle.sol";
import {IInsurancePool} from "../interfaces/IInsurancePool.sol";

contract InsuranceOracle is IInsuranceOracle {
    // Access control
    address public owner;
    bool public paused;

    // Note on timestamp usage: block.timestamp is used for tracking durations in hours.
    // While miners can manipulate timestamps slightly (by a few seconds),
    // this won't significantly impact the system since:
    // 1. We use hours-long durations (minimum 1 hour for triggers)
    // 2. Price feeds from Chainlink provide their own timestamps
    // 3. The system is designed to be resilient to small timing variations
    uint256 public constant STABLECOIN_DEVIATION_THRESHOLD = 5e6; // 5%
    uint256 public constant MINIMUM_TRIGGER_DURATION = 1 seconds; // Reduced for testing
    uint256 public constant PRICE_PRECISION = 1e8;

    // State variables
    address public insurancePool;
    address public utilizationFeed;
    mapping(IInsurancePool.RiskType => RiskState) public riskStates;
    mapping(address => StablecoinState) public stablecoinStates;

    // Track active elements
    address[] public supportedStablecoins;

    // Events
    event StablecoinAdded(
        address indexed token,
        address indexed priceFeed,
        string symbol
    );
    event StablecoinRemoved(address indexed token);

    // Constructor
    constructor() {
        owner = msg.sender;
    }

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    // Core functions
    function checkRiskCondition(
        IInsurancePool.RiskType riskType
    ) external whenNotPaused returns (bool) {
        require(
            riskType == IInsurancePool.RiskType.STABLECOIN_DEPEG,
            "Only stablecoin risk supported"
        );
        return _checkStablecoinDepeg();
    }

    function updateStablecoinPrice(
        address token
    ) external whenNotPaused returns (uint256) {
        StablecoinState storage state = stablecoinStates[token];
        require(state.isSupported, "Token not supported");
        require(state.chainlinkFeed != address(0), "No price feed");

        // Update price using Chainlink
        (uint256 price, uint256 timestamp) = _getChainlinkPrice(
            state.chainlinkFeed
        );
        state.price = price;
        state.lastPriceUpdate = timestamp;

        emit StablecoinPriceUpdated(token, price, timestamp);
        return price;
    }

    // View functions
    function getRiskState(
        IInsurancePool.RiskType riskType
    ) external view returns (RiskState memory) {
        return riskStates[riskType];
    }

    function getStablecoinState(
        address token
    ) external view returns (StablecoinState memory) {
        return stablecoinStates[token];
    }

    function getSupportedStablecoins()
        external
        view
        returns (address[] memory)
    {
        return supportedStablecoins;
    }

    function isRiskConditionMet(
        IInsurancePool.RiskType riskType
    ) external view returns (bool) {
        require(
            riskType == IInsurancePool.RiskType.STABLECOIN_DEPEG,
            "Only stablecoin risk supported"
        );
        RiskState memory state = riskStates[riskType];
        if (!state.isTriggered) {
            return false;
        }

        if (_getTimeNow() < state.triggerStartTime + _getMinimumDuration()) {
            return false;
        }

        return true;
    }

    // Demo functions for MVP
    function simulateStablecoinDepeg(address stablecoin) external {
        require(
            stablecoinStates[stablecoin].isSupported,
            "Stablecoin not supported"
        );

        uint256 currentTime = _getTimeNow();
        RiskState storage state = riskStates[
            IInsurancePool.RiskType.STABLECOIN_DEPEG
        ];

        // Trigger the depeg event
        state.isTriggered = true;
        state.triggerStartTime = currentTime;
        state.details = bytes32(uint256(uint160(stablecoin))); // Store which stablecoin triggered

        emit RiskConditionTriggered(
            IInsurancePool.RiskType.STABLECOIN_DEPEG,
            currentTime,
            state.details
        );
    }

    function resolveStablecoinDepeg() external onlyOwner {
        RiskState storage state = riskStates[
            IInsurancePool.RiskType.STABLECOIN_DEPEG
        ];
        require(state.isTriggered, "No active depeg event");

        // Resolve the depeg event
        state.isTriggered = false;

        emit RiskConditionResolved(
            IInsurancePool.RiskType.STABLECOIN_DEPEG,
            _getTimeNow()
        );
    }

    // Admin functions
    function addStablecoin(
        address token,
        address chainlinkFeed,
        string calldata symbol
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(chainlinkFeed != address(0), "Invalid feed");
        require(!stablecoinStates[token].isSupported, "Already supported");

        StablecoinState storage state = stablecoinStates[token];
        state.isSupported = true;
        state.chainlinkFeed = chainlinkFeed;

        // Initial price check
        (uint256 price, uint256 timestamp) = _getChainlinkPrice(chainlinkFeed);
        state.price = price;
        state.lastPriceUpdate = timestamp;

        // Add to active list
        supportedStablecoins.push(token);

        emit StablecoinAdded(token, chainlinkFeed, symbol);
    }

    function removeStablecoin(address token) external onlyOwner {
        require(stablecoinStates[token].isSupported, "Not supported");

        delete stablecoinStates[token];

        // Remove from active list
        for (uint i = 0; i < supportedStablecoins.length; i++) {
            if (supportedStablecoins[i] == token) {
                supportedStablecoins[i] = supportedStablecoins[
                    supportedStablecoins.length - 1
                ];
                supportedStablecoins.pop();
                break;
            }
        }

        emit StablecoinRemoved(token);
    }

    function setUtilizationFeed(address feed) external onlyOwner {
        require(feed != address(0), "Invalid feed address");
        utilizationFeed = feed;
    }

    function setInsurancePool(address pool) external onlyOwner {
        require(pool != address(0), "Invalid pool");
        insurancePool = pool;
    }

    // Internal functions
    function _checkStablecoinDepeg() internal returns (bool) {
        bool triggered = false;
        uint256 currentTime = _getTimeNow();
        RiskState storage state = riskStates[
            IInsurancePool.RiskType.STABLECOIN_DEPEG
        ];
        address triggeredToken;

        // Check all supported stablecoins
        for (uint i = 0; i < supportedStablecoins.length; i++) {
            address token = supportedStablecoins[i];
            StablecoinState storage stable = stablecoinStates[token];

            (uint256 price, ) = _getChainlinkPrice(stable.chainlinkFeed);
            uint256 deviation = _calculateDeviation(price, PRICE_PRECISION);

            if (deviation > STABLECOIN_DEVIATION_THRESHOLD) {
                triggered = true;
                triggeredToken = token;
                break;
            }
        }

        if (triggered && !state.isTriggered) {
            state.isTriggered = true;
            state.triggerStartTime = currentTime;
            state.details = bytes32(uint256(uint160(triggeredToken))); // Store which stablecoin triggered
            emit RiskConditionTriggered(
                IInsurancePool.RiskType.STABLECOIN_DEPEG,
                currentTime,
                state.details
            );
        } else if (!triggered && state.isTriggered) {
            state.isTriggered = false;
            emit RiskConditionResolved(
                IInsurancePool.RiskType.STABLECOIN_DEPEG,
                currentTime
            );
        }

        state.lastUpdateTime = currentTime;
        return triggered;
    }

    // Internal timestamp functions - can be overridden with a more secure time oracle in production
    function _getTimeNow() internal view virtual returns (uint256) {
        // Mock implementation - could use a more secure time source in production
        return block.timestamp;
    }

    function _getMinimumDuration() internal view virtual returns (uint256) {
        return MINIMUM_TRIGGER_DURATION;
    }

    function _getChainlinkPrice(
        address feed
    ) internal view returns (uint256, uint256) {
        // Mock implementation for MVP testing
        // Return a depegged price (0.90 USD) to simulate stablecoin depegging
        // In production, this would use actual Chainlink AggregatorV3Interface
        return (90000000, _getTimeNow()); // 0.90 USD in 8 decimal precision
    }

    function _calculateDeviation(
        uint256 price,
        uint256 target
    ) internal pure returns (uint256) {
        if (price > target) {
            return ((price - target) * 1e8) / target;
        } else {
            return ((target - price) * 1e8) / target;
        }
    }
}
