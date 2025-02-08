import styled from 'styled-components';

export const Container = styled.div`
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
`;

export const WarningBanner = styled.div`
  background: #ff6b6b;
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 40px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
`;

export const SimulateButton = styled.button`
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  margin-top: 20px;
  transition: all 0.2s;

  &:hover {
    background: #5f4dd0;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;
