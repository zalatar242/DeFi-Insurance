// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IPayoutManager} from "../interfaces/IPayoutManager.sol";
import {IInsurancePool} from "../interfaces/IInsurancePool.sol";
import {IInsuranceOracle} from "../interfaces/IInsuranceOracle.sol";

contract PayoutManager is IPayoutManager {
    // Access control
    address public owner;
    bool public paused;
    bool private locked;

    // Constants
    uint256 private constant BASIS_POINTS = 10000;

    // Internal constants
    function _firstPhasePercentage() internal pure returns (uint256) {
        return 5000; // 50%
    }

    function _secondPhaseDelay() internal pure returns (uint256) {
        return 72 hours;
    }

    function _triggerConfirmationPeriod() internal pure returns (uint256) {
        return 24 hours;
    }

    function _maxPayoutRatio() internal pure returns (uint256) {
        return 8000; // 80%
    }

    // Interface constants
    function FIRST_PHASE_PERCENTAGE() external pure returns (uint256) {
        return _firstPhasePercentage();
    }

    function SECOND_PHASE_DELAY() external pure returns (uint256) {
        return _secondPhaseDelay();
    }

    function TRIGGER_CONFIRMATION_PERIOD() external pure returns (uint256) {
        return _triggerConfirmationPeriod();
    }

    function MAX_PAYOUT_RATIO() external pure returns (uint256) {
        return _maxPayoutRatio();
    }

    // State variables
    IInsurancePool public insurancePool;
    IInsuranceOracle public oracle;
    PayoutState public currentPayoutState;

    // Access control modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    // Additional events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event InsurancePoolSet(address indexed newPool);
    event OracleSet(address indexed newOracle);

    constructor() {
        owner = msg.sender;
        paused = true; // Start paused for setup
    }

    // Core functions
    function checkAndTriggerPayout() external nonReentrant whenNotPaused returns (bool) {
        require(address(oracle) != address(0), "Oracle not set");
        require(address(insurancePool) != address(0), "Pool not set");
        require(!currentPayoutState.isActive, "Payout already active");

        // Check each risk type for trigger conditions
        IInsurancePool.RiskType triggerType;
        bool found = false;

        for (uint i = 0; i < 3; i++) {
            triggerType = IInsurancePool.RiskType(i);
            if (oracle.checkRiskCondition(triggerType) && oracle.isRiskConditionMet(triggerType)) {
                found = true;
                break;
            }
        }

        require(found, "No trigger conditions met");

        uint256 totalCoverage = calculateTotalAffectedCoverage(triggerType);
        require(totalCoverage > 0, "No affected coverage");

        currentPayoutState = PayoutState({
            isActive: true,
            riskType: triggerType,
            triggerTime: block.timestamp,
            totalCoverage: totalCoverage,
            isFirstPhaseComplete: false,
            isSecondPhaseComplete: false
        });

        emit PayoutTriggered(triggerType, block.timestamp, totalCoverage);
        return true;
    }

                return true;
            }
        }

        return false;
    }

    // View functions
    function getCurrentPayoutState() external view returns (PayoutState memory) {
        return currentPayoutState;
    }

    function canClaimFirstPhase(address buyer) public view returns (bool) {
        if (!currentPayoutState.isActive || currentPayoutState.isFirstPhaseComplete) {
            return false;
        }

        IInsurancePool.Coverage memory coverage = insurancePool.getCoverage(buyer);
        if (!coverage.isActive) {
            return false;
        }

        if (block.timestamp < currentPayoutState.triggerTime + TRIGGER_CONFIRMATION_PERIOD) {
            return false;
        }

        return true;
    }

    function canClaimSecondPhase(address buyer) public view returns (bool) {
        if (!currentPayoutState.isActive || !currentPayoutState.isFirstPhaseComplete ||
            currentPayoutState.isSecondPhaseComplete) {
            return false;
        }

        IInsurancePool.DelayedPayout memory payout = insurancePool.getDelayedPayout(buyer);
        if (!payout.firstPhaseClaimed || payout.secondPhaseClaimed) {
            return false;
        }

        if (block.timestamp < payout.unlockTime) {
            return false;
        }

        return true;
    }

    function calculatePayoutAmount(address buyer) public view returns (uint256) {
        if (!currentPayoutState.isActive) {
            return 0;
        }

        IInsurancePool.Coverage memory coverage = insurancePool.getCoverage(buyer);
        if (!coverage.isActive) {
            return 0;
        }

        // Calculate affected portion based on risk type weights
        uint256 weight = insurancePool.getBucketWeight(currentPayoutState.riskType);
        return (coverage.amount * weight) / BASIS_POINTS;
    }

    function getPayoutRiskType() external view returns (IInsurancePool.RiskType) {
        return currentPayoutState.riskType;
    }

    // Constants
    function FIRST_PHASE_PERCENTAGE() external pure returns (uint256) {
        return 5000; // 50%
    }

    function SECOND_PHASE_DELAY() external pure returns (uint256) {
        return 72 hours;
    }

    function TRIGGER_CONFIRMATION_PERIOD() external pure returns (uint256) {
        return 24 hours;
    }

    function MAX_PAYOUT_RATIO() external pure returns (uint256) {
        return 8000; // 80%
    }

    // Internal functions
    function calculateTotalAffectedCoverage(IInsurancePool.RiskType riskType) internal view returns (uint256) {
        IInsurancePool.RiskBucket memory bucket = insurancePool.getRiskBucket(riskType);
        uint256 totalLiquidity = insurancePool.getTotalLiquidity();

        if (totalLiquidity == 0) {
            return 0;
        }

        uint256 maxPayout = (totalLiquidity * MAX_PAYOUT_RATIO) / BASIS_POINTS;
        return bucket.activeCoverage > maxPayout ? maxPayout : bucket.activeCoverage;
    }

    // Admin functions
    function setInsurancePool(address pool) external onlyOwner {
        require(pool != address(0), "Invalid address");
        insurancePool = IInsurancePool(pool);
        emit InsurancePoolSet(pool);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        oracle = IInsuranceOracle(_oracle);
        emit OracleSet(_oracle);
    }

    function resetPayoutState() external onlyOwner {
        delete currentPayoutState;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Emergency functions
    function emergencyCancel() external onlyOwner {
        delete currentPayoutState;
        paused = true;
    }

    function emergencyPause() external onlyOwner {
        paused = true;
    }
}
