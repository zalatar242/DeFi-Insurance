import React from 'react';
import styled from 'styled-components';
import { AccountBalanceWallet, LocalAtm, Security, Warning } from '@mui/icons-material';

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
`;

const ProvideProtection = () => {
  const riskBuckets = [
    {
      title: "Stablecoin Depeg",
      weight: "40%",
      icon: <Warning />,
      color: "#6c5ce7",
      apy: "4.2%",
      allocatedLiquidity: "5,089",
      utilization: "45%",
      description: "Protection against stablecoin depegging events"
    },
    {
      title: "Liquidity Shortage",
      weight: "20%",
      icon: <LocalAtm />,
      color: "#00d2d3",
      apy: "2.8%",
      allocatedLiquidity: "2,500",
      utilization: "30%",
      description: "Protection against protocol liquidity shortages"
    },
    {
      title: "Smart Contract Risk",
      weight: "40%",
      icon: <Security />,
      color: "#ff7675",
      apy: "3.6%",
      allocatedLiquidity: "5,089",
      utilization: "40%",
      description: "Protection against smart contract vulnerabilities"
    }
  ];

  return (
    <Container>
      <Header>
        <Title>Provide Protection</Title>
        <Description>
          Earn yield by providing liquidity to different risk buckets. Each bucket has its own risk profile and APY based on utilization.
          You can allocate your liquidity across multiple buckets to diversify your risk exposure.
        </Description>
      </Header>

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

            <ProvideButton>
              <AccountBalanceWallet style={{ marginRight: 8 }} />
              Provide Liquidity
            </ProvideButton>
          </Card>
        ))}
      </CardsContainer>
    </Container>
  );
};

export default ProvideProtection;
