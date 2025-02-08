import React, { useState } from 'react';
import styled from 'styled-components';
import { AccountBalanceWallet, Search, Shield } from '@mui/icons-material';
import { ethers } from 'ethers';
import contracts from '../contracts.json';

const Card = styled.div`
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  width: 380px;
  margin: 16px;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }
`;

const Title = styled.h2`
  font-size: 24px;
  margin: 0 0 24px 0;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #6c5ce7;
    font-size: 28px;
  }
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 12px 0;
  color: #666;
`;

const Label = styled.span`
  color: #999;
  font-size: 14px;
`;

const Value = styled.span`
  color: #1a1a1a;
  font-weight: 500;
  font-size: 14px;
`;

const PriceSection = styled.div`
  margin: 24px 0;
`;

const PriceLabel = styled.div`
  color: #999;
  font-size: 14px;
  margin-bottom: 8px;
`;

const Price = styled.div`
  font-size: 32px;
  font-weight: 600;
  color: #6c5ce7;
`;

const RiskList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 24px 0;
`;

const RiskItem = styled.li`
  padding: 8px 0;
  color: #666;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;

  svg {
    color: #6c5ce7;
    font-size: 20px;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  margin: 8px 0;
  overflow: hidden;
`;

const Progress = styled.div`
  width: ${props => props.value}%;
  height: 100%;
  background: #6c5ce7;
  transition: width 0.3s ease;
`;

const Divider = styled.div`
  height: 1px;
  background: #f0f0f0;
  margin: 24px 0;
`;

const InputContainer = styled.div`
  margin: 24px 0;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #6c5ce7;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 14px;
  background: #6c5ce7;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #ff4757;
  font-size: 14px;
  margin-top: 8px;
`;

const ProtectionCard = ({
  title,
  risks,
  costPerHundred,
  availableProtection,
  maxProtection,
  currentBalance,
  onUpdate
}) => {
  const [protectionAmount, setProtectionAmount] = useState('100');
  const [error, setError] = useState('');
  const [calculatedPremium, setCalculatedPremium] = useState(null);
  const [requiredDeposit, setRequiredDeposit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const progressPercentage = (availableProtection / maxProtection) * 100;

  const calculateProtectionCost = async (amount) => {
    if (!amount || isNaN(amount)) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      const coverageAmount = ethers.parseEther(amount.toString());
      const premium = await insurancePool.calculatePremium(coverageAmount);
      const deposit = await insurancePool.calculateRequiredDeposit(coverageAmount);

      setCalculatedPremium(ethers.formatEther(premium));
      setRequiredDeposit(ethers.formatEther(deposit));
      setError('');
    } catch (err) {
      console.error("Error calculating protection cost:", err);
      setError('Error calculating protection cost');
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setProtectionAmount(value);
    if (value && !isNaN(value)) {
      calculateProtectionCost(value);
    }
  };

  const handlePurchaseProtection = async () => {
    if (!protectionAmount || isNaN(protectionAmount) || parseFloat(protectionAmount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      const coverageAmount = ethers.parseEther(protectionAmount.toString());
      const deposit = await insurancePool.calculateRequiredDeposit(coverageAmount);

      // Get RLUSD contract instance
      const rlusd = new ethers.Contract(
        contracts.RLUSD.address,
        contracts.RLUSD.abi,
        signer
      );

      // Approve RLUSD spending
      const approveTx = await rlusd.approve(contracts.InsurancePool.address, deposit);
      await approveTx.wait();

      // Purchase coverage with RLUSD
      const tx = await insurancePool.purchaseCoverage(coverageAmount);
      await tx.wait();

      setError('');
      // Reload data after successful purchase
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error purchasing protection:", err);
      setError(err.message || 'Error purchasing protection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <Title>
        <Shield />
        {title}
      </Title>

      <PriceSection>
        <PriceLabel>Base Cost for $100 Protection</PriceLabel>
        <Price>${costPerHundred}</Price>
      </PriceSection>

      <InputContainer>
        <PriceLabel>Protection Amount (USD)</PriceLabel>
        <Input
          type="number"
          min="0"
          step="1"
          value={protectionAmount}
          onChange={handleAmountChange}
          placeholder="Enter amount..."
        />
      </InputContainer>

      {calculatedPremium && (
        <InfoRow>
          <Label>Premium Cost</Label>
          <Value>${parseFloat(calculatedPremium).toFixed(4)} RLUSD</Value>
        </InfoRow>
      )}

      {requiredDeposit && (
        <InfoRow>
          <Label>Required Deposit</Label>
          <Value>${parseFloat(requiredDeposit).toFixed(4)} RLUSD</Value>
        </InfoRow>
      )}

      <RiskList>
        {risks.map((risk, index) => (
          <RiskItem key={index}>
            <Search />
            {risk}
          </RiskItem>
        ))}
      </RiskList>

      <Divider />

      <InfoRow>
        <Label>Available for Coverage</Label>
        <Value>${availableProtection.toLocaleString()}</Value>
      </InfoRow>

      <ProgressBar>
        <Progress value={progressPercentage} />
      </ProgressBar>

      <InfoRow>
        <Label>Maximum Liquidity</Label>
        <Value>${maxProtection.toLocaleString()}</Value>
      </InfoRow>

      <Divider />

      <InfoRow>
        <Label>Protection Balance</Label>
        <Value>
          <AccountBalanceWallet style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
          {currentBalance} RLUSD
        </Value>
      </InfoRow>

      <Button
        onClick={handlePurchaseProtection}
        disabled={isLoading || !calculatedPremium || !requiredDeposit}
      >
        {isLoading ? 'Processing...' : 'Purchase Protection'}
      </Button>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Card>
  );
};

export default ProtectionCard;
