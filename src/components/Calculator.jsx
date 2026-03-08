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
  npcs = [],
  onClose, 
  onProceedToDistribution,
  gameMode = 'classic',
  firstStrike = false,
  onUpdatePlayer = () => {},
}) => {
  if (gameMode === 'd20' || gameMode === 'campaign') {
    return (
      <CalculatorD20
        data={data}
        players={players}
        npcs={npcs}
        onClose={onClose}
        onProceedToDistribution={onProceedToDistribution}
        firstStrike={firstStrike}
        onUpdatePlayer={onUpdatePlayer}
      />
    );
  }

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