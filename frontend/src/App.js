import React, { useState } from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GetProtection from './pages/GetProtection';
import ProvideProtection from './pages/ProvideProtection';
import { ethers } from 'ethers';

const Container = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
`;

const Nav = styled.nav`
  display: flex;
  gap: 32px;
  align-items: center;
`;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  font-size: 15px;

  &:hover {
    color: #6c5ce7;
  }

  &.active {
    color: #6c5ce7;
  }
`;

const ConnectButton = styled.button`
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-size: 15px;

  &:hover {
    background: #5f4dd0;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

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
            <NavLink to="/create">Create</NavLink>
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
          <Route path="/create" element={<div>Coming Soon</div>} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;
