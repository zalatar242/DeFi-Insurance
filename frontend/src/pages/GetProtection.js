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

  const loadData = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to use this feature");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress()

      // Contract setup
      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );
      if (await insurancePool.paused()) {
        throw new Error("Insurance Pool contract is currently paused");
      }

      // Get pool data
      const totalLiquidity = await insurancePool.getTotalLiquidity();
      const totalSecurityDeposits = await insurancePool.totalSecurityDeposits();
      const totalActiveCoverage = await insurancePool.totalActiveCoverage();

      // Calculate available coverage using same formula as contract:
      // initialLiquidity = totalLiquidity - totalSecurityDeposits
      // maxCoverage = (initialLiquidity * 80) / 100
      // availableCoverage = maxCoverage - totalActiveCoverage + totalSecurityDeposits
      const initialLiquidity = totalLiquidity - totalSecurityDeposits;
      const maxCoverage = (initialLiquidity * 80n) / 100n;
      const availableCoverage = maxCoverage - totalActiveCoverage + totalSecurityDeposits;

      console.log("Pool data:", {
        totalLiquidity: ethers.formatEther(totalLiquidity),
        totalSecurityDeposits: ethers.formatEther(totalSecurityDeposits),
        totalActiveCoverage: ethers.formatEther(totalActiveCoverage),
        initialLiquidity: ethers.formatEther(initialLiquidity),
        maxCoverage: ethers.formatEther(maxCoverage),
        availableCoverage: ethers.formatEther(availableCoverage)
      });

      // Calculate premium for $100 coverage
      const baseAmount = ethers.parseEther("100");
      const premium = await insurancePool.calculatePremium(baseAmount);

      // Get user's current coverage
      const coverage = await insurancePool.getCoverage(userAddress);

      setStablecoinProtection({
        title: "RLUSD Protection",
        risks: ["Stablecoin Depegging Risk (100% weight)", "Smart Contract Risk (0% weight)"],
        costPerHundred: parseFloat(ethers.formatEther(premium)),
        maxProtection: ethers.formatEther(totalLiquidity),
        availableProtection: ethers.formatEther(availableCoverage),
        currentBalance: coverage.isActive ? ethers.formatEther(coverage.amount) : 0
      });

      setError(null);

    } catch (err) {
      console.error("Error loading protection data:", err);
      setError(err.message || "Unknown error occurred");
    }
  };

  useEffect(() => {
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
              onUpdate={loadData}
            />
          ))}
        </CardsContainer>
      )}
    </Container>
  );
};

export default GetProtection;
