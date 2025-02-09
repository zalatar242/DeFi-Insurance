import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contracts from '../contracts.json';
import {
  Container,
  WarningBanner,
  SimulateButton
} from '../styles/Simulation.styles';

const Simulation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [depegTimestamp, setDepegTimestamp] = useState(null);
  const [timeLeft, setTimeLeft] = useState(1);
  const RLUSD_ADDRESS = contracts.RLUSD.address; // RLUSD testnet

  // Check if enough time has passed since depeg
  const canTriggerPayout = depegTimestamp &&
    (Math.floor(Date.now() / 1000) - depegTimestamp) >= 1; // 1 second waiting period

  // Countdown timer
  useEffect(() => {
    if (!depegTimestamp || canTriggerPayout) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor(Date.now() / 1000) - depegTimestamp;
      const remaining = Math.max(1 - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [depegTimestamp, canTriggerPayout]);

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
      const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp
      setDepegTimestamp(timestamp);
      setTimeLeft(30);
      alert('Successfully simulated RLUSD depeg event! Wait 1 second for payout eligibility.');
    } catch (error) {
      console.error('Error simulating depeg:', error);
      alert('Failed to simulate RLUSD depeg event');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerPayout = async () => {
    if (!window.ethereum) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const payoutManager = new ethers.Contract(
        contracts.PayoutManager.address,
        contracts.PayoutManager.abi,
        await provider.getSigner()
      );

      const tx = await payoutManager.checkAndTriggerPayout();
      await tx.wait();
      alert('Successfully triggered payout process!');
    } catch (error) {
      console.error('Error triggering payout:', error);
      alert('Failed to trigger payout process. Make sure 1 second has passed since the depeg event.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <WarningBanner>
        ⚠️ This page is for demonstration purposes only. Actions here simulate insurance events for testing.
      </WarningBanner>

      {!depegTimestamp ? (
        <SimulateButton
          onClick={simulateDepeg}
          disabled={isLoading}
        >
          {isLoading ? 'Simulating...' : 'Simulate RLUSD Depeg Event'}
        </SimulateButton>
      ) : (
        <div>
          <p>Depeg event simulated at: {new Date(depegTimestamp * 1000).toLocaleString()}</p>
          <p>Status: {canTriggerPayout ? 'Ready for payout!' : `Waiting for confirmation... ${timeLeft} second${timeLeft !== 1 ? 's' : ''} remaining`}</p>
          <SimulateButton
            onClick={triggerPayout}
            disabled={isLoading || !canTriggerPayout}
          >
            {isLoading ? 'Processing...' : 'Trigger Insurance Payout'}
          </SimulateButton>
        </div>
      )}
    </Container>
  );
};

export default Simulation;
