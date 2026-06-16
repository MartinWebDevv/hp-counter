import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn } from '../theme';
import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';

/**
 * StatsModal
 * Reference table for commander and faction squad stats.
 * Columns: Walk, Run, Shoot, Attacks, Heal/Revive
 */
const StatsModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('commanders');

  const thStyle = {
    padding: '0.45rem 0.75rem',
    textAlign: 'left',
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: '0.72rem', fontWeight: '700',
    borderBottom: `1px solid rgba(255,255,255,0.08)`,
    whiteSpace: 'nowrap',
    background: 'rgba(0,0,0,0.35)',
  };

  const tdStyle = {
    padding: '0.45rem 0.75rem',
    borderBottom: `1px solid rgba(255,255,255,0.04)`,
    fontSize: '0.8rem', whiteSpace: 'nowrap',
    color: colors.textSecondary,
    fontFamily: fonts.body,
  };

  const nameStyle = {
    ...tdStyle,
    color: colors.gold,
    fontWeight: '700',
    fontFamily: fonts.display,
  };

  const statRow = (name, s) => (
    <tr key={name}>
      <td style={nameStyle}>{name}</td>
      <td style={tdStyle}>🚶 {s.walk}</td>
      <td style={tdStyle}>🏃 {s.run}</td>
      <td style={tdStyle}>🎯 {s.shootRange}</td>
      <td style={tdStyle}>⚔️ ×{s.attacksPerHit}</td>
      <td style={tdStyle}>💚 {s.rollToHeal}+</td>
    </tr>
  );

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setActiveTab(id)} style={{
      padding: '0.45rem 1.1rem',
      background: activeTab === id ? colors.amberSubtle : 'rgba(0,0,0,0.3)',
      border: `1px solid ${activeTab === id ? colors.amberBorder : 'rgba(255,255,255,0.06)'}`,
      color: activeTab === id ? colors.amber : colors.textMuted,
      borderRadius: '6px', cursor: 'pointer',
      fontFamily: fonts.body, fontWeight: '800', fontSize: '0.8rem',
      transition: 'all 0.15s',
    }}>{label}</button>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: surfaces.overlay,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: surfaces.elevated,
        border: borders.warm,
        borderRadius: '12px', padding: '1.75rem',
        width: '100%', maxWidth: '700px',
        maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ color: colors.gold, fontFamily: fonts.display, fontSize: '1.35rem', margin: 0 }}>
            📊 Stats Reference
          </h2>
          <button onClick={onClose} style={btn.danger()}>✕ Close</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {tabBtn('commanders', '⚔️ Commanders')}
          {tabBtn('factions',   '🛡️ Factions')}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: '7px', border: `1px solid rgba(255,255,255,0.06)` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: surfaces.card }}>
            <thead>
              <tr>
                {['Name', 'Walk', 'Run', 'Shoot', 'Attacks', 'Revive'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'commanders' && Object.entries(COMMANDER_STATS).map(([name, s]) =>
                statRow(name, s)
              )}
              {activeTab === 'factions' && (
                <>
                  {Object.entries(FACTION_STATS).map(([name, s]) => {
                    // Uncivilized has sub-types
                    if (name === 'Uncivilized') {
                      return (
                        <React.Fragment key={name}>
                          <tr>
                            <td colSpan={6} style={{
                              padding: '0.4rem 0.75rem',
                              color: colors.gold, fontFamily: fonts.display,
                              fontWeight: '700', background: 'rgba(0,0,0,0.35)',
                              textAlign: 'center', fontSize: '0.75rem',
                              borderBottom: `1px solid rgba(255,255,255,0.04)`,
                            }}>─── Uncivilized ───</td>
                          </tr>
                          {statRow('🪨 Caveman',  s.caveman)}
                          {statRow('🦕 Dinosaur', s.dinosaur)}
                        </React.Fragment>
                      );
                    }
                    return statRow(name, s);
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;