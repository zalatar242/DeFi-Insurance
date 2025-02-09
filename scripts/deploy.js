const { ethers } = require("hardhat");
const hre = require("hardhat");
const { formatEther, parseEther } = ethers.utils;

async function main() {
  // Print network details for MetaMask
  console.log("\nNetwork Details for MetaMask:");
  console.log("=============================");
  console.log("Network Name: Hardhat Local");
  console.log("RPC URL: http://127.0.0.1:8545");
  console.log("Chain ID: 31337");
  console.log("Currency Symbol: ETH");

  // Print test account details
  const testAccount = {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  };

  console.log("\nTest Account Details:");
  console.log("=====================");
  console.log("Address:", testAccount.address);
  console.log("Private Key:", testAccount.privateKey);
  console.log("\nDeployment Starting...\n");

  const deployer = await ethers.provider.getSigner();
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);

  console.log("Deployer Address:", deployerAddress);
  console.log("Deployer Balance:", formatEther(deployerBalance.toString()), "ETH");

  // Deploy InsuranceOracle
  const InsuranceOracle = await hre.ethers.getContractFactory("InsuranceOracle");
  const oracle = await InsuranceOracle.deploy();
  await oracle.deployed();
  console.log("InsuranceOracle deployed to:", oracle.address);

  // Deploy PayoutManager
  const PayoutManager = await hre.ethers.getContractFactory("PayoutManager");
  const payoutManager = await PayoutManager.deploy();
  await payoutManager.deployed();
  console.log("PayoutManager deployed to:", payoutManager.address);

  // Deploy mock RLUSD
  const RLUSDMock = await hre.ethers.getContractFactory("RLUSDMock");
  const rlusd = await RLUSDMock.deploy();
  await rlusd.deployed();
  console.log("RLUSDMock deployed to:", rlusd.address);

  // Deploy InsurancePool with mock RLUSD
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const pool = await InsurancePool.deploy(rlusd.address);
  await pool.deployed();
  console.log("InsurancePool deployed to:", pool.address);

  // Set PayoutManager and Oracle addresses in InsurancePool
  await pool.setPayoutManager(payoutManager.address);
  console.log("PayoutManager address set in InsurancePool");

  await pool.setOracle(oracle.address);
  console.log("Oracle address set in InsurancePool");

  // Set InsurancePool and Oracle in PayoutManager
  await payoutManager.setInsurancePool(pool.address);
  console.log("InsurancePool address set in PayoutManager");

  await payoutManager.setOracle(oracle.address);
  console.log("Oracle address set in PayoutManager");

  // Deploy Chainlink mocks
  const ChainlinkMock = await hre.ethers.getContractFactory("ChainlinkMock");
  const stablecoinFeed = await ChainlinkMock.deploy(1e8, Math.floor(Date.now() / 1000)); // $1.00
  await stablecoinFeed.deployed();
  console.log("Stablecoin feed deployed to:", stablecoinFeed.address);

  const utilizationFeed = await ChainlinkMock.deploy(50e6, Math.floor(Date.now() / 1000)); // 50%
  await utilizationFeed.deployed();
  console.log("Utilization feed deployed to:", utilizationFeed.address);

  // Set InsurancePool address in InsuranceOracle
  await oracle.setInsurancePool(pool.address);
  console.log("InsurancePool address set in InsuranceOracle");

  // Add RLUSD to InsuranceOracle
  await oracle.addStablecoin(rlusd.address, stablecoinFeed.address, "RLUSD");
  console.log("RLUSD added to InsuranceOracle");

  // Set utilization feed in InsuranceOracle
  await oracle.setUtilizationFeed(utilizationFeed.address);
  console.log("Utilization feed set in InsuranceOracle");

  // First unpause the pool
  await pool.unpause();
  console.log("Insurance pool activated");

  // Set up initial liquidity
  const initialLiquidity = parseEther("10"); // 10 RLUSD initial liquidity

  // Since we're using mock RLUSD, we already have enough tokens
  const rlusdBalance = await rlusd.balanceOf(deployerAddress);
  console.log("Initial RLUSD Balance:", formatEther(rlusdBalance));

  // Approve and add initial liquidity
  await rlusd.approve(pool.address, initialLiquidity);
  await pool.addLiquidity(initialLiquidity);
  console.log("Added initial liquidity:", formatEther(initialLiquidity), "RLUSD");
const remainingBalance = await rlusd.balanceOf(deployerAddress);
console.log("Remaining RLUSD Balance:", formatEther(remainingBalance));

// Save contract addresses and ABIs to a JSON file
  // Save contract addresses and ABIs to a JSON file
  const fs = require('fs');
  const contracts = {
    InsuranceOracle: {
      address: oracle.address,
      abi: InsuranceOracle.interface.format('json')
    },
    InsurancePool: {
      address: pool.address,
      abi: InsurancePool.interface.format('json')
    },
    PayoutManager: {
      address: payoutManager.address,
      abi: PayoutManager.interface.format('json')
    },
    RLUSD: {
      address: rlusd.address,
      abi: RLUSDMock.interface.format('json')
    }
  };
  fs.writeFileSync(
    'frontend/src/contracts.json',
    JSON.stringify(contracts, null, 2)
  );
  console.log('Contract addresses and ABIs saved to frontend/src/contracts.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

