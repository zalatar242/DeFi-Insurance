import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ProtectionCard from '../components/ProtectionCard';
import { ethers } from 'ethers';
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

const SearchContainer = styled.div`
  margin-bottom: 48px;
`;

const SearchBar = styled.div`
  background: white;
  padding: 16px 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  transition: all 0.2s;

  &:focus-within {
    box-shadow: 0 4px 20px rgba(108, 92, 231, 0.1);
  }
`;

const SearchInput = styled.input`
  border: none;
  background: none;
  outline: none;
  width: 100%;
  font-size: 16px;
  color: #1a1a1a;

  &::placeholder {
    color: #999;
  }
`;

const SearchOptions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
`;

const ClearButton = styled.button`
  border: none;
  background: none;
  color: #6c5ce7;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const SortOptions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: #666;
  font-size: 14px;
`;

const NavLink = styled.a`
  text-decoration: none;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  font-size: 15px;

  &:hover {
    color: #6c5ce7;
  }
`;

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 32px;
  justify-items: center;
  max-width: 1000px;
  margin: 0 auto;
`;

const Message = styled.div`
  text-align: center;
  color: #666;
  font-size: 16px;
  margin: 40px 0;
`;

const GetProtection = () => {
  const [stablecoinProtection, setStablecoinProtection] = useState({
    title: "Stablecoin Protection",
    risks: ["Stablecoin Depegging Risk (50% weight)", "Smart Contract Risk (50% weight)"],
    costPerHundred: 0.15,
    availableProtection: "2500",
    maxProtection: "3000",
    currentBalance: 0
  });
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this feature");
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

        // Calculate base premium for $100 coverage
        const baseAmount = ethers.parseEther("100");
        const premium = await insurancePool.calculatePremium(baseAmount);

        // Fetch risk bucket data for stablecoin depeg
        const depegRiskBucket = await insurancePool.getRiskBucket(0); // STABLECOIN_DEPEG is 0

        // Get user's current coverage if any
        const userAddress = await signer.getAddress();
        const coverage = await insurancePool.getCoverage(userAddress);

        setStablecoinProtection({
          title: "Stablecoin Protection",
          risks: ["Stablecoin Depegging Risk (50% weight)", "Smart Contract Risk (50% weight)"],
          costPerHundred: parseFloat(ethers.formatEther(premium)),
          availableProtection: ethers.formatEther(depegRiskBucket.allocatedLiquidity),
          maxProtection: ethers.formatEther(depegRiskBucket.allocatedLiquidity),
          currentBalance: coverage.isActive ? ethers.formatEther(coverage.amount) : 0
        });

        setError(null);
      } catch (err) {
        console.error("Error loading protection data:", err);
        setError("Error loading protection data. Please make sure you are connected to the correct network.");
      }
    };

    loadData();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const filteredProtections = [stablecoinProtection].filter(
    protection => protection.title.toLowerCase().includes(searchTerm)
  );

  return (
    <Container>
      <Header>
        <Title>Get Protection</Title>
        <Description>
          Secure your DeFi investments with comprehensive protocol coverage. Choose from available protection plans below.
        </Description>
      </Header>

      <SearchContainer>
        <SearchBar>
          <SearchInput
            placeholder="Search protocols..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </SearchBar>
        <SearchOptions>
          <ClearButton onClick={clearSearch}>Clear</ClearButton>
          <SortOptions>
            <span>Sort by</span>
            <NavLink>Relevance</NavLink>
          </SortOptions>
        </SearchOptions>
      </SearchContainer>

      {error ? (
        <Message>{error}</Message>
      ) : (
        <CardsContainer>
          {filteredProtections.map((protection, index) => (
            <ProtectionCard
              key={index}
              title={protection.title}
              risks={protection.risks}
              costPerHundred={protection.costPerHundred}
              availableProtection={parseFloat(protection.availableProtection)}
              maxProtection={parseFloat(protection.maxProtection)}
              currentBalance={protection.currentBalance}
            />
          ))}
        </CardsContainer>
      )}
    </Container>
  );
};

export default GetProtection;
