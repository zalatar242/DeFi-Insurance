import React from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GetProtection from './pages/GetProtection';
import ProvideProtection from './pages/ProvideProtection';

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
`;

const App = () => {
  return (
    <Router>
      <Container>
        <Header>
          <Logo>DeFi Insurance</Logo>
          <Nav>
            <NavLink to="/">Get Protection</NavLink>
            <NavLink to="/provide">Provide Protection</NavLink>
            <NavLink to="/create">Create</NavLink>
            <ConnectButton>Connect Wallet</ConnectButton>
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
