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
  const [secondPhaseTimeLeft, setSecondPhaseTimeLeft] = useState(1);
  const [payoutState, setPayoutState] = useState({
    firstPhaseClaimed: false,
    secondPhaseClaimed: false,
    secondPhaseUnlockTime: null
  });
  const RLUSD_ADDRESS = contracts.RLUSD.address; // RLUSD testnet
  const coverageAmount = ethers.parseEther("1000"); // 1000 RLUSD coverage

  // Load payout state when component mounts
  useEffect(() => {
    const loadPayoutState = async () => {
      if (!window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const payoutManager = new ethers.Contract(
          contracts.PayoutManager.address,
          contracts.PayoutManager.abi,
          signer
        );

        const currentState = await payoutManager.getCurrentPayoutState();
        const pool = new ethers.Contract(
          contracts.InsurancePool.address,
          contracts.InsurancePool.abi,
          signer
        );

        if (currentState.isActive) {
          const userAddr = await signer.getAddress();
          const delayedPayout = await pool.getDelayedPayout(userAddr);

          setPayoutState({
            firstPhaseClaimed: delayedPayout.firstPhaseClaimed,
            secondPhaseClaimed: delayedPayout.secondPhaseClaimed
          });

          // Convert BigInt to Number for UI handling
          setDepegTimestamp(Number(currentState.triggerTime));
        }
      } catch (error) {
        // Only log the error, don't show alert for background refresh errors
        console.error("Error loading payout state:", error);
        // Clear states if we can't load them
        if (error.code === 'NETWORK_ERROR') {
          setDepegTimestamp(null);
          setPayoutState({ firstPhaseClaimed: false, secondPhaseClaimed: false });
        }
      }
    };

    // Initial load
    loadPayoutState();

    // Set up periodic refresh
    const refreshInterval = setInterval(loadPayoutState, 2000); // Refresh every 2 seconds

    return () => clearInterval(refreshInterval);
  }, []);

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

      // Check if RLUSD is supported
      const stablecoinState = await oracle.getStablecoinState(RLUSD_ADDRESS);
      if (!stablecoinState.isSupported) {
        throw new Error("RLUSD not supported in oracle. Please deploy contracts first.");
      }

      const tx = await oracle.simulateStablecoinDepeg(RLUSD_ADDRESS);
      await tx.wait();
      const timestamp = Math.floor(Date.now() / 1000);
      setDepegTimestamp(timestamp);
      setTimeLeft(1);
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
      const signer = await provider.getSigner();

      // Get contract instances
      const payoutManager = new ethers.Contract(
        contracts.PayoutManager.address,
        contracts.PayoutManager.abi,
        signer
      );
      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      // Trigger the payout
      const tx = await payoutManager.checkAndTriggerPayout();
      await tx.wait();

      // Wait for confirmation period
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Process first phase through PayoutManager
      const firstPhaseTx = await payoutManager.processFirstPhasePayout(await signer.getAddress());
      await firstPhaseTx.wait();
      setPayoutState(prev => ({ ...prev, firstPhaseClaimed: true }));

      // Now claim first phase from pool
      const claimFirstTx = await insurancePool.claimFirstPhasePayout();
      await claimFirstTx.wait();

      // Wait for second phase (now just 1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stop after first phase is complete - second phase will be handled separately
      alert('First phase completed! You can now claim the second phase after the waiting period.');
    } catch (error) {
      console.error('Error during payout process:', error);
      let errorMsg;
      if (error.reason === "Risk condition not met") {
        errorMsg = "Please wait 1 second after the depeg event before triggering the payout.";
      } else if (error.reason === "Cannot claim first phase") {
        errorMsg = "Waiting for confirmation period before first phase payout can be claimed.";
      } else if (error.reason === "Cannot claim second phase") {
        errorMsg = "Second phase is not ready yet. Please wait 1 second.";
      } else if (error.reason === "No payout available") {
        errorMsg = "Please make sure you have active coverage before triggering payout.";
      } else if (error.reason === "Payout already active") {
        errorMsg = "Payout process is already in progress. Click 'Start New Simulation' to begin a new payout cycle.";
      } else if (error.reason === "First phase already claimed") {
        errorMsg = "First phase has already been claimed. Please wait for the second phase or click 'Start New Simulation' to begin a new cycle.";
      } else {
        errorMsg = error.reason || error.message;
      }
      alert(`Payout process failed: ${errorMsg}`);
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
          {payoutState.secondPhaseClaimed ? (
           <>
             <p>✅ Payout completed! Your coverage has been deactivated and both phases (100%) claimed.</p>
             <SimulateButton
               onClick={() => {
                 setDepegTimestamp(null);
                 setPayoutState({ firstPhaseClaimed: false, secondPhaseClaimed: false });
               }}
             >
               Start New Simulation
             </SimulateButton>
           </>
          ) : payoutState.firstPhaseClaimed ? (
           <>
             <p>✓ First phase (50%) has been claimed</p>
             <p>⏳ Preparing second phase payout...</p>
             <SimulateButton
               onClick={async () => {
                 setIsLoading(true);
                 try {
                   const provider = new ethers.BrowserProvider(window.ethereum);
                   const signer = await provider.getSigner();
                   const payoutManager = new ethers.Contract(
                     contracts.PayoutManager.address,
                     contracts.PayoutManager.abi,
                     signer
                   );

                   // Quick retry mechanism with small delay
                   const retry = async (attempts = 3) => {
                     for (let i = 0; i < attempts; i++) {
                       try {
                         const secondPhaseTx = await payoutManager.processSecondPhasePayout(await signer.getAddress());
                         await secondPhaseTx.wait();

                         const insurancePool = new ethers.Contract(
                           contracts.InsurancePool.address,
                           contracts.InsurancePool.abi,
                           signer
                         );
                         const claimSecondTx = await insurancePool.claimSecondPhasePayout();
                         await claimSecondTx.wait();
                         setPayoutState(prev => ({ ...prev, secondPhaseClaimed: true }));
                         return true;
                       } catch (error) {
                         if (i === attempts - 1) throw error;
                         await new Promise(resolve => setTimeout(resolve, 1000));
                       }
                     }
                     return false;
                   };

                   await retry();
                   alert('Successfully claimed second phase payout!');
                 } catch (error) {
                   console.error('Error in second phase:', error);
                   alert(`Failed to process second phase: ${error.reason || error.message}. Please try again in a moment.`);
                 } finally {
                   setIsLoading(false);
                 }
               }}
               disabled={isLoading}
             >
               {isLoading ? 'Processing Second Phase...' : 'Process Final Payout (50%)'}
             </SimulateButton>
           </>
          ) : (
           <>
             <p>Insurance Payout Status:</p>
             <p>{canTriggerPayout ? '🟢 Ready to process payout' : '⏳ Waiting for confirmation period...'}</p>
             <SimulateButton
               onClick={triggerPayout}
               disabled={isLoading || !canTriggerPayout}
             >
               {isLoading ? 'Processing First Phase...' : canTriggerPayout ? 'Start Payout Process' : 'Please Wait...'}
             </SimulateButton>
           </>
          )}
        </div>
      )}
    </Container>
  );
};

export default Simulation;
