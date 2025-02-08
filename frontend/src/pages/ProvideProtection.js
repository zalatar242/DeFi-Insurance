import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AccountBalanceWallet, LocalAtm, Security, Warning } from '@mui/icons-material';
import { ethers, formatEther } from 'ethers';
import contracts from '../contracts.json';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 40px;
`;

const Header = styled.div`
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #1a1a1a;
  margin-bottom: 16px;
`;

const Description = styled.p`
  color: #666;
  font-size: 16px;
  line-height: 1.5;
`;

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  margin-top: 32px;
`;

const Card = styled.div`
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const CardTitle = styled.h2`
  font-size: 24px;
  color: #1a1a1a;
  margin: 0;
`;

const CardWeight = styled.div`
  font-size: 14px;
  color: #666;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 16px 0;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  color: #666;
`;

const Value = styled.span`
  color: #1a1a1a;
  font-weight: 500;
`;

const APY = styled.div`
  font-size: 32px;
  font-weight: 600;
  color: #6c5ce7;
  margin: 24px 0;
`;

const InputGroup = styled.div`
  margin: 16px 0;
`;

const AmountInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  margin-top: 8px;

  &:focus {
    outline: none;
    border-color: #6c5ce7;
  }
`;

const ProvideButton = styled.button`
  width: 100%;
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 24px;
  transition: all 0.2s;

  &:hover {
    background: #5f4dd0;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const Message = styled.div`
  text-align: center;
  color: #666;
  font-size: 16px;
  margin: 40px 0;
`;

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
    return (Number(utilizationRate) * 100 / 1e18).toFixed(1);
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

      // Calculate allocations - 100% to selected bucket
      const allocations = [0, 0];
      const index = {
        STABLECOIN_DEPEG: 0,
        SMART_CONTRACT: 1
      }[riskType];
      allocations[index] = BASIS_POINTS; // 100% in basis points

      // Convert amount to wei
      const amountInWei = ethers.parseEther(amounts[riskType]);

      // Call addLiquidity with allocations array
      const tx = await insurancePool.addLiquidity(
        allocations,
        { value: amountInWei }
      );
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

      const [
        stablecoinRiskBucket,
        smartContractRiskBucket,
        stablecoinWeight,
        smartContractWeight
      ] = await Promise.all([
        insurancePool.getRiskBucket(RiskType.STABLECOIN_DEPEG),
        insurancePool.getRiskBucket(RiskType.SMART_CONTRACT),
        insurancePool.getBucketWeight(RiskType.STABLECOIN_DEPEG),
        insurancePool.getBucketWeight(RiskType.SMART_CONTRACT)
      ]);

      setRiskBuckets([
        {
          type: "STABLECOIN_DEPEG",
          title: "Stablecoin Depeg",
          weight: "50%",
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
          weight: "50%",
          icon: <Security />,
          color: "#ff7675",
          apy: calculateAPY(formatUtilization(smartContractRiskBucket.utilizationRate)),
          allocatedLiquidity: formatLiquidity(smartContractRiskBucket.allocatedLiquidity),
          utilization: `${formatUtilization(smartContractRiskBucket.utilizationRate)}%`,
          description: "Protection against smart contract vulnerabilities"
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
                <Label>Amount to Provide (ETH)</Label>
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
