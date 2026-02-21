import React from 'react';
import CalculatorClassic from './CalculatorClassic';
import CalculatorD20 from './CalculatorD20';

/**
 * Calculator Router
 * Routes to the appropriate calculator based on game mode
 */
const Calculator = ({ 
  data, 
  players, 
  onClose, 
  onProceedToDistribution,
  gameMode = 'classic'
}) => {
  // Route to appropriate calculator based on mode
  if (gameMode === 'd20') {
    return (
      <CalculatorD20
        data={data}
        players={players}
        onClose={onClose}
        onProceedToDistribution={onProceedToDistribution}
      />
    );
  }

  // Default to Classic mode (also handles Custom mode for now)
  return (
    <CalculatorClassic
      data={data}
      players={players}
      onClose={onClose}
      onProceedToDistribution={onProceedToDistribution}
      gameMode={gameMode}
    />
  );
};

export default Calculator;