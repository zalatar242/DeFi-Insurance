import React, { useState } from 'react';
import { ethers } from 'ethers';
import contracts from '../contracts.json';
import {
  Container,
  WarningBanner,
  SimulateButton
} from '../styles/Simulation.styles';

const Simulation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const RLUSD_ADDRESS = "0x866386C7f4F2A5f46C5F4566D011dbe3e8679BE4"; // RLUSD testnet

  const simulateDepeg = async () => {
    if (!window.ethereum) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const oracle = new ethers.Contract(
        contracts.InsuranceOracle.address,
        contracts.InsuranceOracle.abi,
        await provider.getSigner()
      );

      const tx = await oracle.simulateStablecoinDepeg(RLUSD_ADDRESS);
      await tx.wait();
      alert('Successfully simulated RLUSD depeg event!');
    } catch (error) {
      console.error('Error simulating depeg:', error);
      alert('Failed to simulate RLUSD depeg event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <WarningBanner>
        ⚠️ This page is for demonstration purposes only. Actions here simulate insurance events for testing.
      </WarningBanner>

      <SimulateButton
        onClick={simulateDepeg}
        disabled={isLoading}
      >
        {isLoading ? 'Simulating...' : 'Simulate RLUSD Depeg Event'}
      </SimulateButton>
    </Container>
  );
};

export default Simulation;
