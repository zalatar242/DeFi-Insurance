import React, { useState, useEffect } from 'react';
import ProtectionCard from '../components/ProtectionCard';
import { ethers } from 'ethers';
import contracts from '../contracts.json';
import {
  Container,
  Header,
  Title,
  Description,
  SearchContainer,
  SearchBar,
  SearchInput,
  SearchOptions,
  ClearButton,
  SortOptions,
  NavLink,
  CardsContainer,
  Message
} from '../styles/GetProtection.styles';

const GetProtection = () => {
  const [stablecoinProtection, setStablecoinProtection] = useState({
    title: "RLUSD Protection",
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
          title: "RLUSD Protection",
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
