// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChainlinkMock {
    uint256 public price;
    uint256 public timestamp;

    constructor(uint256 _price, uint256 _timestamp) {
        price = _price;
        timestamp = _timestamp;
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        roundId = 1;
        answer = int256(price);
        startedAt = timestamp;
        updatedAt = timestamp;
        answeredInRound = 1;
    }

    function updatePrice(uint256 _price, uint256 _timestamp) external {
        price = _price;
        timestamp = _timestamp;
    }
}
