// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IInsuranceOracle} from "../interfaces/IInsuranceOracle.sol";

/**
 * @title RiskPool
 * @notice Manages individual risk-specific liquidity pools with dynamic pricing
 */
contract RiskPool is Ownable, ReentrancyGuard {
    struct PoolState {
        uint256 totalLiquidity;      // Total liquidity in the pool
        uint256 allocatedCover;      // Amount of coverage currently allocated
        uint256 utilizationRate;     // Current utilization rate (scaled by 1e18)
        uint256 baseRate;            // Base premium rate (scaled by 1e18)
        uint256 lastUpdateTime;      // Last time pool state was updated
    }

    struct StakingPosition {
        uint256 amount;              // Amount staked
        uint256 joinTime;            // When position was created
        uint256 lastClaimTime;       // Last time rewards were claimed
        bool active;                 // Whether position is currently active
    }

    // Pool configuration
    uint256 public constant MIN_STAKE = 1000;           // Minimum stake amount
    uint256 public constant MAX_UTILIZATION = 8e17;     // 80% maximum utilization
    uint256 public constant RATE_MULTIPLIER = 1e18;     // For fixed-point math
    uint256 public constant MIN_LOCKUP = 7 days;        // Minimum stake lockup
    uint256 public constant REWARD_PERIOD = 1 days;     // Period for reward distribution

    // Pool state
    PoolState public poolState;
    bytes32 public immutable riskType;
    IInsuranceOracle public immutable oracle;

    // Staking tracking
    mapping(address => StakingPosition) public stakes;
    uint256 public totalStaked;
    uint256 public rewardPool;

    // Events
    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);
    event RewardsClaimed(address indexed staker, uint256 amount);
    event CoverageAllocated(uint256 amount, uint256 premium);
    event UtilizationUpdated(uint256 newRate);
    event PremiumRateUpdated(uint256 newRate);

    constructor(
        bytes32 _riskType,
        address _oracle,
        uint256 _baseRate
    ) Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle address");
        require(_baseRate > 0, "Invalid base rate");

        riskType = _riskType;
        oracle = IInsuranceOracle(_oracle);

        poolState = PoolState({
            totalLiquidity: 0,
            allocatedCover: 0,
            utilizationRate: 0,
            baseRate: _baseRate,
            lastUpdateTime: block.timestamp
        });
    }

    /**
     * @notice Allow liquidity providers to stake in this risk pool
     */
    function stake() external payable nonReentrant {
        require(msg.value >= MIN_STAKE, "Below minimum stake");

        StakingPosition storage position = stakes[msg.sender];
        if (position.active) {
            // Add to existing position
            position.amount += msg.value;
        } else {
            // Create new position
            position.amount = msg.value;
            position.joinTime = block.timestamp;
            position.lastClaimTime = block.timestamp;
            position.active = true;
        }

        totalStaked += msg.value;
        poolState.totalLiquidity += msg.value;
        _updateUtilizationRate();

        emit Staked(msg.sender, msg.value);
    }

    /**
     * @notice Allow stakers to unstake their liquidity after lockup
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        StakingPosition storage position = stakes[msg.sender];
        require(position.active, "No active stake");
        require(block.timestamp >= position.joinTime + MIN_LOCKUP, "Still locked");
        require(amount <= position.amount, "Insufficient stake");

        // Check pool can support withdrawal
        uint256 availableLiquidity = poolState.totalLiquidity - poolState.allocatedCover;
        require(amount <= availableLiquidity, "Insufficient liquidity");

        // Claim any pending rewards first
        _claimRewards(msg.sender);

        // Process unstaking
        position.amount -= amount;
        if (position.amount == 0) {
            position.active = false;
        }

        totalStaked -= amount;
        poolState.totalLiquidity -= amount;
        _updateUtilizationRate();

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim accumulated rewards
     */
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }

    /**
     * @notice Calculate premium for coverage amount based on utilization
     * @param amount Amount of coverage requested
     * @return Premium amount
     */
    function calculatePremium(uint256 amount) public view returns (uint256) {
        uint256 newUtilization = _simulateUtilization(amount);
        require(newUtilization <= MAX_UTILIZATION, "Exceeds max utilization");

        // Premium increases exponentially with utilization
        uint256 premium = (amount * poolState.baseRate * newUtilization) / (RATE_MULTIPLIER * RATE_MULTIPLIER);
        return premium;
    }

    /**
     * @notice Update pool state when coverage is allocated
     * @param amount Coverage amount allocated
     */
    function allocateCoverage(uint256 amount) external onlyOwner {
        uint256 premium = calculatePremium(amount);
        poolState.allocatedCover += amount;
        _updateUtilizationRate();

        // Add premium to reward pool
        rewardPool += premium;

        emit CoverageAllocated(amount, premium);
    }

    // Internal functions

    function _claimRewards(address staker) internal {
        StakingPosition storage position = stakes[staker];
        require(position.active, "No active stake");

        uint256 elapsed = block.timestamp - position.lastClaimTime;
        require(elapsed >= REWARD_PERIOD, "Too soon to claim");

        // Calculate share of rewards based on stake
        uint256 rewardShare = (rewardPool * position.amount) / totalStaked;
        require(rewardShare > 0, "No rewards to claim");

        position.lastClaimTime = block.timestamp;
        rewardPool -= rewardShare;

        (bool success, ) = staker.call{value: rewardShare}("");
        require(success, "Transfer failed");

        emit RewardsClaimed(staker, rewardShare);
    }

    function _updateUtilizationRate() internal {
        if (poolState.totalLiquidity == 0) {
            poolState.utilizationRate = 0;
        } else {
            poolState.utilizationRate = (poolState.allocatedCover * RATE_MULTIPLIER) / poolState.totalLiquidity;
        }
        poolState.lastUpdateTime = block.timestamp;

        emit UtilizationUpdated(poolState.utilizationRate);
    }

    function _simulateUtilization(uint256 additionalCover) internal view returns (uint256) {
        if (poolState.totalLiquidity == 0) return RATE_MULTIPLIER;
        return ((poolState.allocatedCover + additionalCover) * RATE_MULTIPLIER) / poolState.totalLiquidity;
    }

    receive() external payable {
        revert("Use stake() to add liquidity");
    }
}
