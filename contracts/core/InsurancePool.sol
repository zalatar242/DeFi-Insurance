// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IInsurancePool} from "../interfaces/IInsurancePool.sol";
import {IInsuranceOracle} from "../interfaces/IInsuranceOracle.sol";
import {IPayoutManager} from "../interfaces/IPayoutManager.sol";
import {IERC20} from "../interfaces/IERC20.sol";

contract InsurancePool is IInsurancePool {
    // For handling withdraw requests
    struct UnlockRequest {
        uint256 amount;
        uint256 unlockTime;
        bool isActive;
    }

    // Events needed for admin functions
    event PayoutManagerSet(address indexed newPayoutManager);
    event OracleSet(address indexed newOracle);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // State variables for access control
    address public owner;
    bool public paused;
    bool private locked;

    // Configurable stablecoin
    IERC20 public stablecoin;

    // Coverage parameters
    uint256 public constant COVERAGE_DURATION = 30 days;
    uint256 public constant SECURITY_DEPOSIT_RATIO = 2000; // 20%
    uint256 public constant BASE_PREMIUM_RATE = 200; // 2% annual (in basis points)
    uint256 public constant MAX_COVERAGE = 10_000_000e18; // $10M in wei
    uint256 public constant INITIAL_FEE_RATE = 50; // 0.5% in basis points
    uint256 public constant UTILIZATION_BREAKPOINT = 5000; // 50%
    uint256 public constant MAX_PREMIUM_RATE = 600; // 6% annual (in basis points)
    uint256 private constant BASIS_POINTS = 10000;
    uint256 public constant UNLOCK_PERIOD = 7 days;

    // Pool state
    RiskBucket public riskBucket;
    uint256 public totalLiquidity;
    uint256 public totalActiveCoverage;

    // Coverage tracking
    mapping(address => Coverage) public activeCoverages;
    mapping(address => DelayedPayout) public delayedPayouts;
    mapping(address => UnlockRequest[]) public unlockRequests;

    // External contracts
    IInsuranceOracle public oracle;
    IPayoutManager public payoutManager;

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

    constructor(address _stablecoin) {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        owner = msg.sender;
        paused = true;
        stablecoin = IERC20(_stablecoin);
        riskBucket = RiskBucket({
            allocatedLiquidity: 0,
            activeCoverage: 0,
            pendingPayouts: 0,
            utilizationRate: 0
        });
    }

    function getRiskBucket(RiskType) external view returns (RiskBucket memory) {
        return riskBucket;
    }

    function getTotalLiquidity() external view returns (uint256) {
        return totalLiquidity;
    }

    function getUtilizationRate(RiskType) external view returns (uint256) {
        return riskBucket.utilizationRate;
    }

    function getBucketWeight(RiskType) external pure returns (uint256) {
        return BASIS_POINTS;
    }

    function getCoverage(
        address buyer
    ) external view returns (Coverage memory) {
        return activeCoverages[buyer];
    }

    function getDelayedPayout(
        address buyer
    ) external view returns (DelayedPayout memory) {
        return delayedPayouts[buyer];
    }

    function _updateUtilization() internal {
        if (riskBucket.allocatedLiquidity == 0) {
            riskBucket.utilizationRate = 0;
            emit UtilizationUpdated(RiskType.STABLECOIN_DEPEG, 0);
            return;
        }

        uint256 newRate = ((riskBucket.activeCoverage +
            riskBucket.pendingPayouts) * BASIS_POINTS) /
            riskBucket.allocatedLiquidity;
        riskBucket.utilizationRate = newRate;
        emit UtilizationUpdated(RiskType.STABLECOIN_DEPEG, newRate);
    }

    function calculatePremium(
        uint256 coverageAmount
    ) external view returns (uint256) {
        // For initial coverage with no liquidity, use base rate
        if (riskBucket.allocatedLiquidity == 0) {
            return
                (coverageAmount * BASE_PREMIUM_RATE * COVERAGE_DURATION) /
                (365 days * BASIS_POINTS);
        }

        uint256 utilization = riskBucket.utilizationRate;
        uint256 multiplier = (BASIS_POINTS * 8) / 10; // Start with 80% of base multiplier

        if (utilization <= UTILIZATION_BREAKPOINT) {
            // Linear increase up to breakpoint, but slower (divide by 4)
            multiplier = ((BASIS_POINTS * 8) / 10) + (utilization / 4);
        } else {
            // Quadratic increase after breakpoint, but slower
            uint256 excess = utilization - UTILIZATION_BREAKPOINT;
            multiplier =
                ((BASIS_POINTS * 8) / 10) +
                (UTILIZATION_BREAKPOINT / 4) +
                ((excess * excess) / (BASIS_POINTS * 4));
        }

        uint256 adjustedRate = (BASE_PREMIUM_RATE * multiplier) / BASIS_POINTS;
        if (adjustedRate > MAX_PREMIUM_RATE) {
            adjustedRate = MAX_PREMIUM_RATE;
        }

        return
            (coverageAmount * adjustedRate * COVERAGE_DURATION) /
            (365 days * BASIS_POINTS);
    }

    function calculateRequiredDeposit(
        uint256 coverageAmount
    ) external pure returns (uint256) {
        return (coverageAmount * SECURITY_DEPOSIT_RATIO) / BASIS_POINTS;
    }

    function purchaseCoverage(
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(amount <= MAX_COVERAGE, "Exceeds maximum coverage");
        require(
            !activeCoverages[msg.sender].isActive,
            "Active coverage exists"
        );

        // Check if coverage exceeds 80% of total liquidity
        uint256 maxCoverage = (totalLiquidity * 80) / 100;
        require(
            amount <= maxCoverage,
            "Coverage exceeds 80% of total liquidity"
        );
        require(
            amount <= riskBucket.allocatedLiquidity,
            "Exceeds bucket liquidity"
        );

        uint256 requiredDeposit = (amount * SECURITY_DEPOSIT_RATIO) /
            BASIS_POINTS;
        uint256 initialFee = (requiredDeposit * INITIAL_FEE_RATE) /
            BASIS_POINTS;
        uint256 remainingDeposit = requiredDeposit - initialFee;

        require(
            stablecoin.transferFrom(msg.sender, address(this), requiredDeposit),
            "Security deposit transfer failed"
        );

        activeCoverages[msg.sender] = Coverage({
            amount: amount,
            securityDeposit: requiredDeposit,
            startTime: block.timestamp,
            expirationTime: block.timestamp + COVERAGE_DURATION,
            lastFeeDeduction: block.timestamp,
            remainingDeposit: remainingDeposit,
            isActive: true
        });

        riskBucket.activeCoverage += amount;
        totalActiveCoverage += amount;
        _updateUtilization();

        uint256 premium = this.calculatePremium(amount);
        emit CoveragePurchased(msg.sender, amount, requiredDeposit, premium);
    }

    function addLiquidity(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "No deposit provided");
        require(
            stablecoin.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        riskBucket.allocatedLiquidity += amount;
        totalLiquidity += amount;
        _updateUtilization();

        emit LiquidityAdded(msg.sender, amount);
    }

    function requestWithdraw(
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Nothing to withdraw");
        require(
            amount <= riskBucket.allocatedLiquidity,
            "Exceeds available liquidity"
        );

        unlockRequests[msg.sender].push(
            UnlockRequest({
                amount: amount,
                unlockTime: block.timestamp + UNLOCK_PERIOD,
                isActive: true
            })
        );

        emit WithdrawRequested(
            msg.sender,
            amount,
            block.timestamp + UNLOCK_PERIOD
        );
    }

    function executeWithdraw() external nonReentrant whenNotPaused {
        require(
            unlockRequests[msg.sender].length > 0,
            "No pending withdrawals"
        );
        UnlockRequest storage request = unlockRequests[msg.sender][
            unlockRequests[msg.sender].length - 1
        ];
        require(request.isActive, "Request not active");
        require(block.timestamp >= request.unlockTime, "Still locked");

        uint256 withdrawAmount = request.amount;
        request.isActive = false;

        riskBucket.allocatedLiquidity -= withdrawAmount;
        totalLiquidity -= withdrawAmount;
        _updateUtilization();

        require(
            stablecoin.transfer(msg.sender, withdrawAmount),
            "Token transfer failed"
        );

        emit LiquidityWithdrawn(msg.sender, withdrawAmount);
    }

    function claimFirstPhasePayout() external nonReentrant whenNotPaused {
        DelayedPayout storage payout = delayedPayouts[msg.sender];
        require(!payout.firstPhaseClaimed, "First phase already claimed");
        require(payout.amount > 0, "No payout available");

        uint256 amount = payout.amount / 2; // 50% of total payout
        payout.firstPhaseClaimed = true;

        riskBucket.pendingPayouts += amount;
        _updateUtilization();

        require(
            stablecoin.transfer(msg.sender, amount),
            "Token transfer failed"
        );

        emit PayoutCompleted(msg.sender, amount);
    }

    function claimSecondPhasePayout() external nonReentrant whenNotPaused {
        DelayedPayout storage payout = delayedPayouts[msg.sender];
        require(payout.firstPhaseClaimed, "Must claim first phase first");
        require(!payout.secondPhaseClaimed, "Second phase already claimed");
        require(block.timestamp >= payout.unlockTime, "Still locked");

        uint256 amount = payout.amount / 2; // 50% of total payout
        payout.secondPhaseClaimed = true;

        riskBucket.pendingPayouts += amount;
        _updateUtilization();

        require(
            stablecoin.transfer(msg.sender, amount),
            "Token transfer failed"
        );

        // Deactivate coverage after second phase is claimed
        Coverage storage coverage = activeCoverages[msg.sender];
        coverage.isActive = false;

        emit PayoutCompleted(msg.sender, amount);
    }

    function deductFees() external returns (uint256) {
        Coverage storage coverage = activeCoverages[msg.sender];
        require(coverage.isActive, "No active coverage");
        require(
            block.timestamp > coverage.lastFeeDeduction + 1 days,
            "Too soon"
        );

        uint256 dailyFee = this.calculatePremium(coverage.amount) / 365;
        require(coverage.remainingDeposit >= dailyFee, "Insufficient deposit");

        coverage.remainingDeposit -= dailyFee;
        coverage.lastFeeDeduction = block.timestamp;

        emit FeeDeducted(msg.sender, dailyFee);
        return dailyFee;
    }

    function initiatePayout(
        address buyer,
        uint256 amount,
        uint256 unlockTime,
        RiskType riskType
    ) external {
        delayedPayouts[buyer] = DelayedPayout({
            amount: amount,
            unlockTime: unlockTime,
            firstPhaseClaimed: false,
            secondPhaseClaimed: false,
            triggerType: riskType
        });

        emit PayoutInitiated(buyer, riskType, amount);
    }

    function updatePayoutState(
        address buyer,
        bool firstPhaseClaimed,
        bool secondPhaseClaimed
    ) external {
        DelayedPayout storage payout = delayedPayouts[buyer];
        payout.firstPhaseClaimed = firstPhaseClaimed;
        payout.secondPhaseClaimed = secondPhaseClaimed;
    }

    function setPayoutManager(address _payoutManager) external onlyOwner {
        require(_payoutManager != address(0), "Invalid address");
        payoutManager = IPayoutManager(_payoutManager);
        emit PayoutManagerSet(_payoutManager);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        oracle = IInsuranceOracle(_oracle);
        emit OracleSet(_oracle);
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
}
