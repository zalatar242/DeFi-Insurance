import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GetProtection from './pages/GetProtection';
import ProvideProtection from './pages/ProvideProtection';
import Simulation from './pages/Simulation';
import { ethers } from 'ethers';
import {
  Container,
  Header,
  Logo,
  Nav,
  NavLink,
  ConnectButton
} from './styles/App.styles';

const App = () => {
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(!!window.ethereum);

  const connectWallet = async () => {
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (error) {
      console.error("User denied account access");
    }
  };

  return (
    <Router>
      <Container>
        <Header>
          <Logo>CoverMax</Logo>
          <Nav>
            <NavLink to="/">Get Protection</NavLink>
            <NavLink to="/provide">Provide Protection</NavLink>
            <NavLink to="/simulation">Simulation</NavLink>
            {account ? (
              <div>Connected: {account.slice(0, 6)}...{account.slice(-4)}</div>
            ) : (
              <ConnectButton
                onClick={connectWallet}
                disabled={!isMetaMaskInstalled}
                title={!isMetaMaskInstalled ? "Please install MetaMask" : ""}
              >
                {isMetaMaskInstalled ? "Connect Wallet" : "Install MetaMask"}
              </ConnectButton>
            )}
          </Nav>
        </Header>

        <Routes>
          <Route path="/" element={<GetProtection />} />
          <Route path="/provide" element={<ProvideProtection />} />
          <Route path="/simulation" element={<Simulation />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;
