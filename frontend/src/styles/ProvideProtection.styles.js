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

export const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  margin-top: 32px;
`;

export const Card = styled.div`
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

export const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

export const CardTitle = styled.h2`
  font-size: 24px;
  color: #1a1a1a;
  margin: 0;
`;

export const CardWeight = styled.div`
  font-size: 14px;
  color: #666;
`;

export const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 16px 0;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

export const Label = styled.span`
  color: #666;
`;

export const Value = styled.span`
  color: #1a1a1a;
  font-weight: 500;
`;

export const APY = styled.div`
  font-size: 32px;
  font-weight: 600;
  color: #6c5ce7;
  margin: 24px 0;
`;

export const InputGroup = styled.div`
  margin: 16px 0;
`;

export const AmountInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  margin-top: 8px;

  &:focus {
    outline: none;
    border-color: #6c5ce7;
  }
`;

export const ProvideButton = styled.button`
  width: 100%;
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 24px;
  transition: all 0.2s;

  &:hover {
    background: #5f4dd0;
    transform: translateY(-2px);
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

export const Message = styled.div`
  text-align: center;
  color: #666;
  font-size: 16px;
  margin: 40px 0;
`;
