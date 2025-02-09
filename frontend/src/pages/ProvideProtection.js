import React, { useState, useEffect } from 'react';
import { AccountBalanceWallet, LocalAtm, Security, Warning } from '@mui/icons-material';
import { ethers, formatEther } from 'ethers';
import contracts from '../contracts.json';
import {
  Container,
  Header,
  Title,
  Description,
  CardsContainer,
  Card,
  CardHeader,
  CardIcon,
  CardTitle,
  CardWeight,
  InfoRow,
  Label,
  Value,
  APY,
  InputGroup,
  AmountInput,
  ProvideButton,
  Message
} from '../styles/ProvideProtection.styles';

const ProvideProtection = () => {
  const [riskBuckets, setRiskBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [amounts, setAmounts] = useState({
    STABLECOIN_DEPEG: "",
    SMART_CONTRACT: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Constants from smart contract
  const BASIS_POINTS = 10000;
  const UTILIZATION_BREAKPOINT = 5000; // 50%
  const BASE_PREMIUM_RATE = 200; // 2% annual
  const MAX_PREMIUM_RATE = 600; // 6% annual

  const formatUtilization = (utilizationRate) => {
    return ((Number(utilizationRate) * 100) / BASIS_POINTS).toFixed(1);
  };

  const formatLiquidity = (liquidity) => {
    const inEth = Number(formatEther(liquidity));
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(inEth);
  };

  const calculateAPY = (utilization) => {
    // Convert utilization from basis points to same scale as contract
    const utilizationBP = Math.floor(Number(utilization) * 100);

    let multiplier;
    if (utilizationBP <= UTILIZATION_BREAKPOINT) {
      // Linear increase up to breakpoint
      multiplier = BASIS_POINTS + utilizationBP;
    } else {
      // Quadratic increase after breakpoint
      const excess = utilizationBP - UTILIZATION_BREAKPOINT;
      multiplier = BASIS_POINTS + UTILIZATION_BREAKPOINT + ((excess * excess) / BASIS_POINTS);
    }

    const adjustedRate = Math.min(
      (BASE_PREMIUM_RATE * multiplier) / BASIS_POINTS,
      MAX_PREMIUM_RATE
    );

    return `${(adjustedRate / 100).toFixed(2)}%`;
  };

  const handleAmountChange = (riskType, value) => {
    setAmounts(prev => ({
      ...prev,
      [riskType]: value
    }));
  };

  const handleProvideLiquidity = async (riskType) => {
    if (!window.ethereum || !amounts[riskType]) return;

    try {
      setSubmitting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      // Check if trying to provide to smart contract risk bucket
      if (riskType === "SMART_CONTRACT") {
        setError("Smart contract risk bucket is temporarily disabled. Please check back later.");
        setSubmitting(false);
        return;
      }

      // Convert amount to wei
      const amountInWei = ethers.parseEther(amounts[riskType]);

      // Get RLUSD contract instance
      const rlusd = new ethers.Contract(
        contracts.RLUSD.address,
        contracts.RLUSD.abi,
        signer
      );

      // Approve RLUSD spending
      const approveTx = await rlusd.approve(contracts.InsurancePool.address, amountInWei);
      await approveTx.wait();

      // Call addLiquidity (no need for allocations array in new contract)
      const tx = await insurancePool.addLiquidity(amountInWei);
      await tx.wait();

      // Clear input and refresh data
      setAmounts(prev => ({
        ...prev,
        [riskType]: ""
      }));
      loadData();
      setError(null);
    } catch (err) {
      console.error("Error providing liquidity:", err);
      setError(`Failed to provide liquidity: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const loadData = async () => {
    if (!window.ethereum) {
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      const RiskType = {
        STABLECOIN_DEPEG: 0,
        SMART_CONTRACT: 1
      };

      const stablecoinRiskBucket = await insurancePool.getRiskBucket(RiskType.STABLECOIN_DEPEG);

      setRiskBuckets([
        {
          type: "STABLECOIN_DEPEG",
          title: "Stablecoin Depeg",
          weight: "100%",
          icon: <Warning />,
          color: "#6c5ce7",
          apy: calculateAPY(formatUtilization(stablecoinRiskBucket.utilizationRate)),
          allocatedLiquidity: formatLiquidity(stablecoinRiskBucket.allocatedLiquidity),
          utilization: `${formatUtilization(stablecoinRiskBucket.utilizationRate)}%`,
          description: "Protection against stablecoin depegging events"
        },
        {
          type: "SMART_CONTRACT",
          title: "Smart Contract Risk",
          weight: "0%",
          icon: <Security />,
          color: "#ff7675",
          apy: "0.00%",
          allocatedLiquidity: "0",
          utilization: "0.0%",
          description: "Protection against smart contract vulnerabilities (Coming Soon)"
        }
      ]);

      setError(null);
    } catch (err) {
      console.error("Error loading risk bucket data:", err);
      setError("Error loading risk bucket data. Please make sure you are connected to the correct network.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up event listeners for relevant contract events
    const setupEventListeners = async () => {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        provider
      );

      // Listen for all relevant events that affect liquidity and utilization
      insurancePool.on("CoveragePurchased", (buyer, amount, deposit, premium) => {
        loadData(); // Refresh data when new coverage is purchased
      });

      insurancePool.on("CoverageExpired", (buyer) => {
        loadData(); // Refresh when coverage expires
      });

      insurancePool.on("PayoutInitiated", (buyer, riskType, amount) => {
        loadData(); // Refresh when payout is initiated
      });

      insurancePool.on("PayoutCompleted", (buyer, amount) => {
        loadData(); // Refresh when payout is completed
      });

      insurancePool.on("LiquidityAdded", (provider, amount) => {
        loadData(); // Refresh when new liquidity is added
      });

      insurancePool.on("LiquidityWithdrawn", (provider, amount) => {
        loadData(); // Refresh when liquidity is withdrawn
      });

      insurancePool.on("UtilizationUpdated", (riskType, newRate) => {
        loadData(); // Refresh when utilization rate is updated
      });
    };

    setupEventListeners();

    // Cleanup function to remove event listeners
    return () => {
      const cleanup = async () => {
        if (!window.ethereum) return;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const insurancePool = new ethers.Contract(
          contracts.InsurancePool.address,
          contracts.InsurancePool.abi,
          provider
        );

        // Remove all event listeners
        insurancePool.removeAllListeners("CoveragePurchased");
        insurancePool.removeAllListeners("CoverageExpired");
        insurancePool.removeAllListeners("PayoutInitiated");
        insurancePool.removeAllListeners("PayoutCompleted");
        insurancePool.removeAllListeners("LiquidityAdded");
        insurancePool.removeAllListeners("LiquidityWithdrawn");
        insurancePool.removeAllListeners("UtilizationUpdated");
      };

      cleanup();
    };
  }, []);

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Provide Protection</Title>
        </Header>
        <Message>Loading risk bucket data...</Message>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Provide Protection</Title>
        <Description>
          Earn yield by providing liquidity to different risk buckets. Each bucket has its own risk profile and APY based on utilization.
          You can allocate your liquidity across multiple buckets to diversify your risk exposure.
        </Description>
      </Header>

      {error ? (
        <Message>{error}</Message>
      ) : (
        <CardsContainer>
          {riskBuckets.map((bucket, index) => (
            <Card key={index}>
              <CardHeader>
                <CardIcon color={bucket.color}>
                  {bucket.icon}
                </CardIcon>
                <div>
                  <CardTitle>{bucket.title}</CardTitle>
                  <CardWeight>Weight: {bucket.weight}</CardWeight>
                </div>
              </CardHeader>

              <APY>{bucket.apy} APY</APY>

              <InfoRow>
                <Label>Allocated Liquidity</Label>
                <Value>${bucket.allocatedLiquidity}</Value>
              </InfoRow>

              <InfoRow>
                <Label>Utilization</Label>
                <Value>{bucket.utilization}</Value>
              </InfoRow>

              <InfoRow>
                <Label>Risk Type</Label>
                <Value>{bucket.description}</Value>
              </InfoRow>

              <InputGroup>
                <Label>Amount to Provide (RLUSD)</Label>
                <AmountInput
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  value={amounts[bucket.type] || ""}
                  onChange={(e) => handleAmountChange(bucket.type, e.target.value)}
                  disabled={!window.ethereum || submitting}
                />
              </InputGroup>

              <ProvideButton
                disabled={!window.ethereum || submitting || !amounts[bucket.type]}
                onClick={() => handleProvideLiquidity(bucket.type)}
              >
                <AccountBalanceWallet style={{ marginRight: 8 }} />
                {!window.ethereum
                  ? "Install MetaMask"
                  : submitting
                    ? "Processing..."
                    : "Provide Liquidity"}
              </ProvideButton>
            </Card>
          ))}
        </CardsContainer>
      )}
    </Container>
  );
};

export default ProvideProtection;
