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
        return 1 seconds; // Reduced for demo purposes
    }

    function _triggerConfirmationPeriod() internal pure returns (uint256) {
        return 1 seconds;
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
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event InsurancePoolSet(address indexed newPool);
    event OracleSet(address indexed newOracle);

    constructor() {
        owner = msg.sender;
        paused = false; // Start paused for setup
    }

    // Internal time functions - can be overridden with a more secure time oracle in production
    function _getTimeNow() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    // Core functions
    function checkAndTriggerPayout()
        external
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        require(address(oracle) != address(0), "Oracle not set");
        require(address(insurancePool) != address(0), "Pool not set");
        require(!currentPayoutState.isActive, "Payout already active");

        IInsurancePool.RiskType riskType = IInsurancePool
            .RiskType
            .STABLECOIN_DEPEG;
        require(
            oracle.checkRiskCondition(riskType) &&
                oracle.isRiskConditionMet(riskType),
            "Risk condition not met"
        );

        uint256 totalCoverage = calculateTotalAffectedCoverage(riskType);
        require(totalCoverage > 0, "No affected coverage");

        uint256 currentTime = _getTimeNow();
        currentPayoutState = PayoutState({
            isActive: true,
            riskType: riskType,
            triggerTime: currentTime,
            totalCoverage: totalCoverage,
            isFirstPhaseComplete: false,
            isSecondPhaseComplete: false
        });

        emit PayoutTriggered(riskType, currentTime, totalCoverage);
        return true;
    }

    function processFirstPhasePayout(
        address buyer
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(canClaimFirstPhase(buyer), "Cannot claim first phase");

        uint256 amount = calculatePayoutAmount(buyer);
        require(amount > 0, "No payout available");

        uint256 firstPhaseAmount = (amount * _firstPhasePercentage()) /
            BASIS_POINTS;
        uint256 currentTime = _getTimeNow();
        uint256 delay = _secondPhaseDelay();

        // Initialize payout in insurance pool
        insurancePool.initiatePayout(
            buyer,
            amount,
            currentTime + delay,
            IInsurancePool.RiskType.STABLECOIN_DEPEG
        );

        // Mark first phase as complete in insurance pool
        insurancePool.updatePayoutState(buyer, true, false);

        emit FirstPhaseInitiated(buyer, firstPhaseAmount, currentTime);
        emit SecondPhaseInitiated(
            buyer,
            amount - firstPhaseAmount,
            currentTime + delay
        );

        return firstPhaseAmount;
    }

    function processSecondPhasePayout(
        address buyer
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(canClaimSecondPhase(buyer), "Cannot claim second phase");

        uint256 amount = calculatePayoutAmount(buyer);
        require(amount > 0, "No payout available");

        uint256 secondPhaseAmount = amount -
            (amount * _firstPhasePercentage()) /
            BASIS_POINTS;

        // Update payout state in insurance pool
        insurancePool.updatePayoutState(buyer, true, true);

        // Update local payout state
        currentPayoutState.isSecondPhaseComplete = true;

        // Reset the payout state after successful completion
        delete currentPayoutState;

        emit PayoutProcessed(buyer, secondPhaseAmount, false);
        return secondPhaseAmount;
    }

    function validatePayoutConditions() external view returns (bool) {
        if (
            address(oracle) == address(0) ||
            address(insurancePool) == address(0)
        ) {
            return false;
        }

        return
            oracle.isRiskConditionMet(IInsurancePool.RiskType.STABLECOIN_DEPEG);
    }

    // View functions
    function getCurrentPayoutState()
        external
        view
        returns (PayoutState memory)
    {
        return currentPayoutState;
    }

    function canClaimFirstPhase(address buyer) public view returns (bool) {
        if (
            !currentPayoutState.isActive ||
            currentPayoutState.isFirstPhaseComplete
        ) {
            return false;
        }

        IInsurancePool.Coverage memory coverage = insurancePool.getCoverage(
            buyer
        );
        if (!coverage.isActive) {
            return false;
        }

        if (
            _getTimeNow() <
            currentPayoutState.triggerTime + _triggerConfirmationPeriod()
        ) {
            return false;
        }

        return true;
    }

    function canClaimSecondPhase(address buyer) public view returns (bool) {
        if (
            !currentPayoutState.isActive ||
            !currentPayoutState.isFirstPhaseComplete ||
            currentPayoutState.isSecondPhaseComplete
        ) {
            return false;
        }

        IInsurancePool.DelayedPayout memory payout = insurancePool
            .getDelayedPayout(buyer);
        if (!payout.firstPhaseClaimed || payout.secondPhaseClaimed) {
            return false;
        }

        if (_getTimeNow() < payout.unlockTime) {
            return false;
        }

        return true;
    }

    function calculatePayoutAmount(
        address buyer
    ) public view returns (uint256) {
        if (!currentPayoutState.isActive) {
            return 0;
        }

        IInsurancePool.Coverage memory coverage = insurancePool.getCoverage(
            buyer
        );
        if (!coverage.isActive) {
            return 0;
        }

        return coverage.amount; // Full amount as we're using single risk bucket
    }

    function getPayoutRiskType()
        external
        pure
        returns (IInsurancePool.RiskType)
    {
        return IInsurancePool.RiskType.STABLECOIN_DEPEG;
    }

    // Internal functions
    function calculateTotalAffectedCoverage(
        IInsurancePool.RiskType riskType
    ) internal view returns (uint256) {
        require(
            riskType == IInsurancePool.RiskType.STABLECOIN_DEPEG,
            "Invalid risk type"
        );

        IInsurancePool.RiskBucket memory bucket = insurancePool.getRiskBucket(
            riskType
        );
        uint256 totalLiquidity = insurancePool.getTotalLiquidity();

        if (totalLiquidity == 0) {
            return 0;
        }

        uint256 maxPayout = (totalLiquidity * _maxPayoutRatio()) / BASIS_POINTS;
        return
            bucket.activeCoverage > maxPayout
                ? maxPayout
                : bucket.activeCoverage;
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
