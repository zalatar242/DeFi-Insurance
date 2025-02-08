import React from 'react';
import styled from 'styled-components';
import { AccountBalanceWallet, Search, Shield } from '@mui/icons-material';

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

const ProtectionCard = ({
  title,
  risks,
  costPerHundred,
  availableProtection,
  maxProtection,
  currentBalance
}) => {
  const progressPercentage = (availableProtection / maxProtection) * 100;

  return (
    <Card>
      <Title>
        <Shield />
        {title}
      </Title>

      <PriceSection>
        <PriceLabel>Cost for $100 Protection</PriceLabel>
        <Price>${costPerHundred}</Price>
      </PriceSection>

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
        <Label>Available</Label>
        <Value>${availableProtection.toLocaleString()}</Value>
      </InfoRow>

      <ProgressBar>
        <Progress value={progressPercentage} />
      </ProgressBar>

      <InfoRow>
        <Label>Max</Label>
        <Value>${maxProtection.toLocaleString()}</Value>
      </InfoRow>

      <Divider />

      <InfoRow>
        <Label>Protection Balance</Label>
        <Value>
          <AccountBalanceWallet style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
          {currentBalance} USDC
        </Value>
      </InfoRow>
    </Card>
  );
};

export default ProtectionCard;
