import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const Container = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
`;

export const Logo = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
`;

export const Nav = styled.nav`
  display: flex;
  gap: 32px;
  align-items: center;
`;

export const NavLink = styled(Link)`
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

export const ConnectButton = styled.button`
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
