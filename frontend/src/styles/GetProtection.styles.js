import styled from 'styled-components';

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 40px;
`;

export const Header = styled.div`
  margin-bottom: 40px;
`;

export const Title = styled.h1`
  font-size: 32px;
  color: #1a1a1a;
  margin-bottom: 16px;
`;

export const Description = styled.p`
  color: #666;
  font-size: 16px;
  line-height: 1.5;
`;

export const SearchContainer = styled.div`
  margin-bottom: 48px;
`;

export const SearchBar = styled.div`
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

export const SearchInput = styled.input`
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

export const SearchOptions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
`;

export const ClearButton = styled.button`
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

export const SortOptions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: #666;
  font-size: 14px;
`;

export const NavLink = styled.a`
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

export const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 32px;
  justify-items: center;
  max-width: 1000px;
  margin: 0 auto;
`;

export const Message = styled.div`
  text-align: center;
  color: #666;
  font-size: 16px;
  margin: 40px 0;
`;
