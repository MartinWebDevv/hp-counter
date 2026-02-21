import React from "react";
import { useGameState } from "../hooks/useGameState";
import { useDamageCalculation } from "../hooks/useDamageCalculation";
import PlayerCard from "./PlayerCard";
import Calculator from "./Calculator";
import DamageDistribution from "./DamageDistribution";
import LogPanel from "./LogPanel";
import StatsModal from "./StatsModal";
import GameModeSelector from "./GameModeSelector";
import { getModeConfig } from "../data/gameModes";

const HPCounter = () => {
  const {
    players,
    currentRound,
    combatLog,
    gameMode,
    customModeSettings,
    currentPlayerIndex,
    playersWhoActedThisRound,
    gameStarted,
    setPlayers,
    addPlayer,
    removePlayer,
    reorderPlayers,
    updatePlayer,
    toggleSquad,
    useRevive,
    changeGameMode,
    getModeValues,
    startGame,
    endTurn,
    undo,
    addLog,
    clearLog,
    loadGameState,
  } = useGameState();

  const {
    showCalculator,
    showDamageDistribution,
    calculatorData,
    damageDistribution,
    openCalculator,
    closeCalculator,
    updateDamageDistribution,
    setShowDamageDistribution,
    setCalculatorData,
    applyDamage,
  } = useDamageCalculation(players, addLog);

  const [showStats, setShowStats] = React.useState(false);
  const [showModeSelector, setShowModeSelector] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('all');
  const [draggedIndex, setDraggedIndex] = React.useState(null);

  const saveGameToFile = () => {
    const gameState = {
      players,
      currentRound,
      combatLog,
      gameMode,
      customModeSettings,
      currentPlayerIndex,
      playersWhoActedThisRound,
      gameStarted,
      savedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(gameState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `battle-tracker-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadGameFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const gameState = JSON.parse(event.target.result);
          
          // Validate the data has required fields
          if (!gameState.players || !Array.isArray(gameState.players)) {
            alert('Invalid save file format!');
            return;
          }
          
          // Restore game state using the hook function
          loadGameState(gameState);
          
          addLog(`Game loaded from ${new Date(gameState.savedAt).toLocaleString()}`);
          alert('Game loaded successfully!');
        } catch (error) {
          console.error('Error loading save file:', error);
          alert('Failed to load save file. Make sure it\'s a valid Battle Tracker save.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const currentModeConfig = getModeConfig(gameMode);
  const currentPlayer = players[currentPlayerIndex];
  const hasActed = currentPlayer ? playersWhoActedThisRound.includes(currentPlayer.id) : false;
  const displayedPlayers = viewMode === 'current' && currentPlayer ? [currentPlayer] : players;

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    reorderPlayers(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>⚔️ BATTLE TRACKER</h1>
          <div style={styles.subtitle}>Game Master Control Panel</div>
        </div>
        
        <div style={styles.headerControls}>
          {currentPlayer && (
            <div style={styles.currentPlayerDisplay}>
              <div style={styles.currentPlayerLabel}>ACTIVE PLAYER</div>
              <div style={styles.currentPlayerName}>{currentPlayer.playerName}</div>
            </div>
          )}
          
          <div style={styles.modeDisplay}>
            <span style={styles.modeIcon}>{currentModeConfig.icon}</span>
            <span style={styles.modeText}>{currentModeConfig.name}</span>
          </div>
          
          <div style={styles.roundDisplay}>
            <div style={styles.roundLabel}>ROUND</div>
            <div style={styles.roundNumber}>{currentRound}</div>
          </div>
          
          <button 
            onClick={() => {
              if (!gameStarted) {
                startGame();
              } else {
                endTurn();
              }
            }}
            style={styles.endTurnBtn}
          >
            {!gameStarted 
              ? '▶️ START GAME' 
              : (() => {
                  // Check if current player is the last alive player
                  const alivePlayers = players.filter(p => p.commanderStats.hp > 0);
                  const alivePlayersWhoActed = alivePlayers.filter(p => 
                    playersWhoActedThisRound.includes(p.id)
                  );
                  const isLastPlayer = currentPlayer && 
                    alivePlayersWhoActed.length === alivePlayers.length - 1;
                  
                  return isLastPlayer ? '🔄 END ROUND' : '➡️ END TURN';
                })()
            }
          </button>
          
          <button onClick={() => setViewMode(viewMode === 'all' ? 'current' : 'all')} style={styles.viewModeBtn} disabled={!currentPlayer}>
            {viewMode === 'all' ? '👤 FOCUS' : '👥 ALL'}
          </button>
          
          <button onClick={() => setShowModeSelector(true)} style={styles.modeBtn}>
            🎮 MODE
          </button>
          
          <button onClick={() => setShowStats(true)} style={styles.statsBtn}>
            📊 STATS
          </button>
          
          <button onClick={undo} style={styles.undoBtn}>
            ↩️ UNDO
          </button>
          
          <button onClick={() => {
            if (window.confirm('Reset the entire game? This will clear all players and progress.')) {
              // Clear ALL localStorage items related to the game
              localStorage.removeItem('hpCounterPlayers');
              localStorage.removeItem('hpCounterRound');
              localStorage.removeItem('hpCounterLog');
              localStorage.removeItem('hpCounterGameMode');
              localStorage.removeItem('hpCounterCustomSettings');
              localStorage.removeItem('hpCounterCurrentPlayerIndex');
              localStorage.removeItem('hpCounterGameStarted');
              // Reload page to fresh state
              window.location.reload();
            }
          }} style={styles.resetBtn}>
            🔄 RESET
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        gap: '1rem',
      }}>
        <div style={{ flex: 1 }}>
          <LogPanel battleLog={combatLog} onClearLog={clearLog} />
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem',
        }}>
          <button onClick={saveGameToFile} style={styles.saveBtn}>
            💾 SAVE
          </button>
          <button onClick={loadGameFromFile} style={styles.loadBtn}>
            📂 LOAD
          </button>
        </div>
      </div>

      <div style={styles.addPlayerSection}>
        <button onClick={addPlayer} style={styles.addPlayerBtn}>
          + ADD PLAYER
        </button>
      </div>

      <div style={styles.playersContainer}>
        {viewMode === 'current' && (
          <div style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>⚔️ TURN ORDER</h3>
            {players.map((player, index) => {
              const isCurrent = index === currentPlayerIndex;
              const hasActed = playersWhoActedThisRound.includes(player.id);
              const isDead = player.commanderStats.hp === 0;
              const isBeingDragged = draggedIndex === index;
              
              return (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...styles.sidebarPlayer,
                    background: isCurrent ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))' : hasActed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    borderLeft: isCurrent ? `4px solid ${player.playerColor || '#8b5cf6'}` : hasActed ? '4px solid #22c55e' : '4px solid transparent',
                    opacity: isBeingDragged ? 0.5 : (isDead ? 0.4 : 1),
                  }}
                >
                  <div style={styles.sidebarPlayerHeader}>
                    <span style={{ ...styles.sidebarPlayerName, color: isCurrent ? (player.playerColor || '#8b5cf6') : '#d4af37' }}>
                      {player.playerName || `Player ${index + 1}`}
                    </span>
                    {isCurrent && <span style={{ color: player.playerColor || '#8b5cf6' }}>▶</span>}
                    {!isCurrent && hasActed && <span style={{ color: '#22c55e' }}>✓</span>}
                    {isDead && <span>💀</span>}
                  </div>
                  <div style={styles.sidebarPlayerInfo}>
                    {player.commanderStats.customName || player.commander} • {player.commanderStats.hp}/{player.commanderStats.maxHp}hp
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: players.length === 1 ? "1fr" : viewMode === 'current' ? '1fr' : "48% 48%",
          gap: "1%",
          padding: "0 0.5%",
          width: "100%",
          justifyContent: players.length === 1 ? "center" : "flex-start",
          maxWidth: players.length === 1 ? "50%" : "100%",
          margin: players.length === 1 ? "0 auto" : "0",
          flex: viewMode === 'current' ? 1 : 'initial',
        }}>
          {displayedPlayers.map((player, index) => {
            const actualIndex = players.findIndex(p => p.id === player.id);
            const isBeingDragged = draggedIndex === actualIndex;
            
            return (
              <div
                key={player.id}
                draggable={viewMode === 'all'}
                onDragStart={(e) => viewMode === 'all' && handleDragStart(e, actualIndex)}
                onDragOver={viewMode === 'all' ? handleDragOver : undefined}
                onDrop={(e) => viewMode === 'all' && handleDrop(e, actualIndex)}
                onDragEnd={viewMode === 'all' ? handleDragEnd : undefined}
                style={{
                  opacity: isBeingDragged ? 0.5 : 1,
                  cursor: viewMode === 'all' ? 'grab' : 'default',
                  transition: 'opacity 0.2s',
                }}
              >
                <PlayerCard
                  player={player}
                  onUpdate={updatePlayer}
                  onRemove={removePlayer}
                  onToggleSquad={toggleSquad}
                  onOpenCalculator={openCalculator}
                  onUseRevive={useRevive}
                  allPlayers={players}
                  isCurrentTurn={actualIndex === currentPlayerIndex}
                  hasActedThisRound={playersWhoActedThisRound.includes(player.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {showCalculator && (
        <Calculator data={calculatorData} players={players} onClose={closeCalculator} onProceedToDistribution={(data) => { setCalculatorData(data); setShowDamageDistribution(true); }} gameMode={gameMode} />
      )}

      {showDamageDistribution && (
        <DamageDistribution calculatorData={calculatorData} players={players} damageDistribution={damageDistribution} onUpdateDistribution={updateDamageDistribution} onApply={() => { applyDamage((updatedPlayers) => { updatedPlayers.forEach((p) => { updatePlayer(p.id, p); }); }); }} onClose={() => setShowDamageDistribution(false)} />
      )}

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      {showModeSelector && <GameModeSelector currentMode={gameMode} onModeChange={changeGameMode} onClose={() => setShowModeSelector(false)} />}
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    height: "100vh",
    background: "radial-gradient(ellipse at top, #1a0f1e 0%, #0a0507 50%, #000000 100%)",
    color: "#e8dcc4",
    fontFamily: '"Rajdhani", "Cinzel", sans-serif',
    padding: "0.75rem",
    overflow: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
    padding: "1rem 1.5rem",
    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  },
  titleSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    fontSize: "2rem",
    margin: 0,
    fontWeight: "800",
    letterSpacing: "0.1em",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 0 30px rgba(245, 158, 11, 0.3)",
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "#8b7355",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
  },
  headerControls: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  currentPlayerDisplay: {
    display: "flex",
    flexDirection: "column",
    padding: "0.5rem 1rem",
    background: "rgba(139, 92, 246, 0.15)",
    border: "1px solid rgba(139, 92, 246, 0.5)",
    borderRadius: "8px",
    boxShadow: "0 0 20px rgba(139, 92, 246, 0.2)",
  },
  currentPlayerLabel: {
    fontSize: "0.65rem",
    color: "#c4b5fd",
    letterSpacing: "0.1em",
    fontWeight: "700",
  },
  currentPlayerName: {
    fontSize: "1rem",
    color: "#a78bfa",
    fontWeight: "700",
    letterSpacing: "0.05em",
  },
  modeDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    background: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    borderRadius: "8px",
  },
  modeIcon: {
    fontSize: "1.2rem",
  },
  modeText: {
    fontSize: "0.85rem",
    color: "#fbbf24",
    fontWeight: "700",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  roundDisplay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.5rem 1rem",
    background: "rgba(20, 184, 166, 0.1)",
    border: "1px solid rgba(20, 184, 166, 0.4)",
    borderRadius: "8px",
  },
  roundLabel: {
    fontSize: "0.65rem",
    color: "#5eead4",
    letterSpacing: "0.1em",
    fontWeight: "700",
  },
  roundNumber: {
    fontSize: "1.25rem",
    color: "#14b8a6",
    fontWeight: "800",
    lineHeight: "1",
  },
  endTurnBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, #059669, #047857)",
    border: "1px solid #10b981",
    color: "#d1fae5",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
    transition: "all 0.2s",
  },
  viewModeBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, #1e40af, #1e3a8a)",
    border: "1px solid #3b82f6",
    color: "#dbeafe",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)",
    transition: "all 0.2s",
  },
  modeBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    border: "1px solid #a78bfa",
    color: "#f3e8ff",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)",
    transition: "all 0.2s",
  },
  statsBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))",
    border: "1px solid #f59e0b",
    color: "#fde68a",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
    transition: "all 0.2s",
  },
  undoBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, #ca8a04, #a16207)",
    border: "1px solid #eab308",
    color: "#fef3c7",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    boxShadow: "0 4px 12px rgba(234, 179, 8, 0.2)",
    transition: "all 0.2s",
  },
  resetBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, #b91c1c, #991b1b)",
    border: "1px solid #dc2626",
    color: "#fecaca",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
    transition: "all 0.2s",
  },
  saveBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, #0891b2, #0e7490)",
    border: "2px solid #06b6d4",
    color: "#cffafe",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
    transition: "all 0.2s",
  },
  loadBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    border: "2px solid #a78bfa",
    color: "#f3e8ff",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    boxShadow: "0 4px 12px rgba(167, 139, 250, 0.3)",
    transition: "all 0.2s",
  },
  addPlayerSection: {
    marginBottom: "0.75rem",
    textAlign: "center",
  },
  addPlayerBtn: {
    padding: "1rem 2.5rem",
    background: "linear-gradient(135deg, #1e40af, #1e3a8a)",
    border: "2px solid #3b82f6",
    color: "#dbeafe",
    borderRadius: "10px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "800",
    fontSize: "1rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    boxShadow: "0 8px 24px rgba(59, 130, 246, 0.3)",
    transition: "all 0.2s",
  },
  playersContainer: {
    display: 'flex',
    gap: '1rem',
  },
  sidebar: {
    width: '280px',
    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.6))',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '12px',
    padding: '1.25rem',
    height: 'fit-content',
    position: 'sticky',
    top: '1rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  sidebarTitle: {
    color: '#f59e0b',
    fontSize: '1rem',
    marginTop: 0,
    marginBottom: '1rem',
    fontFamily: "inherit",
    fontWeight: "800",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  sidebarPlayer: {
    padding: '0.75rem',
    marginBottom: '0.5rem',
    borderRadius: '8px',
    cursor: 'grab',
    transition: 'all 0.2s',
  },
  sidebarPlayerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  },
  sidebarPlayerName: {
    fontWeight: '700',
    fontSize: '0.875rem',
    letterSpacing: '0.05em',
  },
  sidebarPlayerInfo: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
};

export default HPCounter;