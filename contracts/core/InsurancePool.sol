// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IInsurancePool} from "../interfaces/IInsurancePool.sol";
import {IInsuranceOracle} from "../interfaces/IInsuranceOracle.sol";
import {IPayoutManager} from "../interfaces/IPayoutManager.sol";

contract InsurancePool is IInsurancePool {
    // State variables for access control
    address public owner;
    bool public paused;
    bool private locked;

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

    // Fixed bucket weights (in basis points, 100 = 1%)
    uint256 private constant STABLECOIN_WEIGHT = 4000; // 40%
    uint256 private constant LIQUIDITY_WEIGHT = 2000;  // 20%
    uint256 private constant SMART_CONTRACT_WEIGHT = 4000; // 40%

    // Coverage parameters
    uint256 public constant COVERAGE_DURATION = 30 days;
    uint256 public constant SECURITY_DEPOSIT_RATIO = 2000; // 20%
    uint256 public constant BASE_PREMIUM_RATE = 200;  // 2% annual (in basis points)
    uint256 public constant MAX_COVERAGE = 10_000_000e18; // $10M in wei
    uint256 public constant MIN_COVERAGE = 1_000e18;    // $1K in wei
    uint256 public constant INITIAL_FEE_RATE = 50;     // 0.5% in basis points

    // Time delays
    uint256 public constant UNLOCK_PERIOD = 7 days;

    // Events
    event WithdrawRequested(
        address indexed provider,
        uint256[3] amounts,
        uint256 unlockTime
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PayoutManagerSet(address indexed newPayoutManager);
    event OracleSet(address indexed newOracle);

    // Structs
    struct UnlockRequest {
        uint256[3] amounts;       // Amount to withdraw from each bucket
        uint256 unlockTime;       // When withdrawal becomes available
        bool isActive;            // Whether request is still valid
    }

    // Risk buckets
    mapping(RiskType => RiskBucket) public riskBuckets;
    uint256 public totalLiquidity;

    // Coverage tracking
    mapping(address => Coverage) public activeCoverages;
    mapping(address => BucketAllocation) private providerAllocations;
    mapping(address => DelayedPayout) public delayedPayouts;
    uint256 public totalActiveCoverage;

    // Withdrawal tracking
    mapping(address => UnlockRequest[]) public unlockRequests;

    // External contracts
    IInsuranceOracle public oracle;
    IPayoutManager public payoutManager;

    // Premium calculation parameters
    uint256 private constant UTILIZATION_BREAKPOINT = 5000; // 50%
    uint256 private constant MAX_PREMIUM_RATE = 600;   // 6% annual (in basis points)
    uint256 private constant BASIS_POINTS = 10000;

    constructor() {
        owner = msg.sender;
        paused = true; // Start paused for setup
        _initializeRiskBuckets();
    }

    // Initialization
    function _initializeRiskBuckets() private {
        riskBuckets[RiskType.STABLECOIN_DEPEG] = RiskBucket({
            allocatedLiquidity: 0,
            activeCoverage: 0,
            pendingPayouts: 0,
            utilizationRate: 0
        });

        riskBuckets[RiskType.LIQUIDITY_SHORTAGE] = RiskBucket({
            allocatedLiquidity: 0,
            activeCoverage: 0,
            pendingPayouts: 0,
            utilizationRate: 0
        });

        riskBuckets[RiskType.SMART_CONTRACT] = RiskBucket({
            allocatedLiquidity: 0,
            activeCoverage: 0,
            pendingPayouts: 0,
            utilizationRate: 0
        });
    }

    // View functions
    function getBucketWeight(RiskType bucket) public pure returns (uint256) {
        if (bucket == RiskType.STABLECOIN_DEPEG) return STABLECOIN_WEIGHT;
        if (bucket == RiskType.LIQUIDITY_SHORTAGE) return LIQUIDITY_WEIGHT;
        return SMART_CONTRACT_WEIGHT;
    }

    function getRiskBucket(RiskType bucket) external view returns (RiskBucket memory) {
        return riskBuckets[bucket];
    }

    function getProviderAllocations(address provider) external view returns (BucketAllocation memory) {
        return providerAllocations[provider];
    }

    function getTotalLiquidity() external view returns (uint256) {
        return totalLiquidity;
    }

    function getUtilizationRate(RiskType bucket) external view returns (uint256) {
        return riskBuckets[bucket].utilizationRate;
    }

    function getDelayedPayout(address buyer) external view returns (DelayedPayout memory) {
        return delayedPayouts[buyer];
    }

    function getCoverage(address buyer) external view returns (Coverage memory) {
        return activeCoverages[buyer];
    }

    function calculatePremium(uint256 coverageAmount) public view returns (uint256) {
        uint256 totalPremium = 0;

        for (uint256 i = 0; i < 3; i++) {
            RiskType bucket = RiskType(i);
            uint256 weight = getBucketWeight(bucket);
            uint256 bucketPremium = _calculateBucketPremium(bucket, coverageAmount);
            totalPremium += (bucketPremium * weight) / BASIS_POINTS;
        }

        return totalPremium;
    }

    function calculateRequiredDeposit(uint256 coverageAmount) public pure returns (uint256) {
        return (coverageAmount * SECURITY_DEPOSIT_RATIO) / BASIS_POINTS;
    }

    function _calculateBucketPremium(RiskType bucket, uint256 coverageAmount) private view returns (uint256) {
        RiskBucket storage riskBucket = riskBuckets[bucket];
        uint256 utilization = riskBucket.utilizationRate;

        uint256 multiplier;
        if (utilization <= UTILIZATION_BREAKPOINT) {
            // Linear increase up to breakpoint
            multiplier = BASIS_POINTS + utilization;
        } else {
            // Quadratic increase after breakpoint
            uint256 excess = utilization - UTILIZATION_BREAKPOINT;
            multiplier = BASIS_POINTS + UTILIZATION_BREAKPOINT + ((excess * excess) / BASIS_POINTS);
        }

        uint256 adjustedRate = (BASE_PREMIUM_RATE * multiplier) / BASIS_POINTS;
        if (adjustedRate > MAX_PREMIUM_RATE) {
            adjustedRate = MAX_PREMIUM_RATE;
        }

        return (coverageAmount * adjustedRate * COVERAGE_DURATION) / (365 days * BASIS_POINTS);
    }

    // Core functions
    function purchaseCoverage(uint256 amount) external payable nonReentrant whenNotPaused {
        require(amount >= MIN_COVERAGE, "Below minimum coverage");
        require(amount <= MAX_COVERAGE, "Exceeds maximum coverage");
        require(!activeCoverages[msg.sender].isActive, "Active coverage exists");

        uint256 requiredDeposit = calculateRequiredDeposit(amount);
        require(msg.value >= requiredDeposit, "Insufficient security deposit");

        // Calculate premium and initial fee
        uint256 premium = calculatePremium(amount);
        uint256 initialFee = (requiredDeposit * INITIAL_FEE_RATE) / BASIS_POINTS;
        uint256 remainingDeposit = requiredDeposit - initialFee;

        // Update coverage state
        _updateCoverageState(msg.sender, amount, requiredDeposit, remainingDeposit);

        // Update risk bucket utilization
        totalActiveCoverage += amount;
        _updateBucketUtilization();

        emit CoveragePurchased(msg.sender, amount, requiredDeposit, premium);

        // Return excess deposit if any
        if (msg.value > requiredDeposit) {
            (bool success, ) = msg.sender.call{value: msg.value - requiredDeposit}("");
            require(success, "Refund failed");
        }
    }

    function addLiquidity(uint256[3] calldata allocations) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "No deposit provided");

        uint256 totalAllocation = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            totalAllocation += allocations[i];
        }
        require(totalAllocation == BASIS_POINTS, "Invalid allocations");

        // Update provider allocations
        providerAllocations[msg.sender].allocations = allocations;

        // Update bucket liquidity
        for (uint256 i = 0; i < 3; i++) {
            RiskType bucket = RiskType(i);
            uint256 bucketAmount = (msg.value * allocations[i]) / BASIS_POINTS;
            riskBuckets[bucket].allocatedLiquidity += bucketAmount;
        }

        // Update total liquidity
        totalLiquidity += msg.value;
        _updateBucketUtilization();

        emit LiquidityAdded(msg.sender, msg.value, allocations);
    }

    function requestWithdraw(uint256[3] calldata amounts) external nonReentrant whenNotPaused {
        uint256 totalWithdrawal = 0;
        BucketAllocation storage providerAlloc = providerAllocations[msg.sender];

        // Verify withdrawal amounts against allocations
        for (uint256 i = 0; i < 3; i++) {
            RiskType bucket = RiskType(i);
            uint256 maxAmount = (totalLiquidity * providerAlloc.allocations[i]) / BASIS_POINTS;
            require(amounts[i] <= maxAmount, "Exceeds allocation");
            totalWithdrawal += amounts[i];
        }

        require(totalWithdrawal > 0, "Nothing to withdraw");

        // Create withdrawal request
        unlockRequests[msg.sender].push(UnlockRequest({
            amounts: amounts,
            unlockTime: block.timestamp + UNLOCK_PERIOD,
            isActive: true
        }));

        emit WithdrawRequested(msg.sender, amounts, block.timestamp + UNLOCK_PERIOD);
    }

    function executeWithdraw() external nonReentrant whenNotPaused {
        require(unlockRequests[msg.sender].length > 0, "No pending withdrawals");
        UnlockRequest storage request = unlockRequests[msg.sender][unlockRequests[msg.sender].length - 1];

        require(request.isActive, "Request not active");
        require(block.timestamp >= request.unlockTime, "Still locked");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < 3; i++) {
            RiskType bucket = RiskType(i);
            uint256 amount = request.amounts[i];
            if (amount > 0) {
                riskBuckets[bucket].allocatedLiquidity -= amount;
                totalAmount += amount;
            }
        }

        request.isActive = false;
        totalLiquidity -= totalAmount;
        _updateBucketUtilization();

        (bool success, ) = msg.sender.call{value: totalAmount}("");
        require(success, "Transfer failed");

        emit LiquidityWithdrawn(msg.sender, totalAmount, request.amounts);
    }

    function claimFirstPhasePayout() external nonReentrant whenNotPaused {
        DelayedPayout storage payout = delayedPayouts[msg.sender];
        require(!payout.firstPhaseClaimed, "First phase already claimed");
        require(payout.amount > 0, "No payout available");

        uint256 amount = payout.amount / 2; // 50% of total payout
        payout.firstPhaseClaimed = true;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit PayoutCompleted(msg.sender, amount);
    }

    function claimSecondPhasePayout() external nonReentrant whenNotPaused {
        DelayedPayout storage payout = delayedPayouts[msg.sender];
        require(payout.firstPhaseClaimed, "Must claim first phase first");
        require(!payout.secondPhaseClaimed, "Second phase already claimed");
        require(block.timestamp >= payout.unlockTime, "Still locked");

        uint256 amount = payout.amount / 2; // 50% of total payout
        payout.secondPhaseClaimed = true;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit PayoutCompleted(msg.sender, amount);
    }

    function deductFees() external returns (uint256) {
        Coverage storage coverage = activeCoverages[msg.sender];
        require(coverage.isActive, "No active coverage");
        require(block.timestamp > coverage.lastFeeDeduction + 1 days, "Too soon");

        uint256 dailyFee = calculatePremium(coverage.amount) / 365;
        require(coverage.remainingDeposit >= dailyFee, "Insufficient deposit");

        coverage.remainingDeposit -= dailyFee;
        coverage.lastFeeDeduction = block.timestamp;

        emit FeeDeducted(msg.sender, dailyFee);
        return dailyFee;
    }

    // Internal functions
    function _updateCoverageState(
        address buyer,
        uint256 amount,
        uint256 deposit,
        uint256 remainingDeposit
    ) internal {
        Coverage storage coverage = activeCoverages[buyer];
        coverage.amount = amount;
        coverage.securityDeposit = deposit;
        coverage.remainingDeposit = remainingDeposit;
        coverage.startTime = block.timestamp;
        coverage.lastFeeDeduction = block.timestamp;
        coverage.expirationTime = block.timestamp + COVERAGE_DURATION;
        coverage.isActive = true;
    }

    function _updateBucketUtilization() internal {
        if (totalLiquidity == 0) return;

        for (uint256 i = 0; i < 3; i++) {
            RiskType bucket = RiskType(i);
            RiskBucket storage riskBucket = riskBuckets[bucket];
            riskBucket.utilizationRate = ((riskBucket.activeCoverage + riskBucket.pendingPayouts) * BASIS_POINTS) / riskBucket.allocatedLiquidity;
            emit UtilizationUpdated(bucket, riskBucket.utilizationRate);
        }
    }

    // Admin functions
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
