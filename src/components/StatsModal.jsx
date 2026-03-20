import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn } from '../theme';

const COMMANDER_STATS = {
  'Lord Fantastic':                 { walk:'6"',run:'12"',shootRange:'8"', shootDamage:'1hp',rollToHit:'2+',rollToBlock:'2+',attacksPerHit:'4x',meleeDamage:'5hp',rollToHeal:'2+',special:'4"/2hp',shootAbility:'⛔',specialAbility:'💔' },
  'The Gray':                       { walk:'6"',run:'12"',shootRange:'12"',shootDamage:'1hp',rollToHit:'4+',rollToBlock:'5+',attacksPerHit:'2x',meleeDamage:'2hp',rollToHeal:'5+',special:'6"/2hp',shootAbility:'',  specialAbility:''   },
  'Prisma K':                       { walk:'5"',run:'12"',shootRange:'8"', shootDamage:'1hp',rollToHit:'2+',rollToBlock:'2+',attacksPerHit:'4x',meleeDamage:'5hp',rollToHeal:'2+',special:'4"/2hp',shootAbility:'⛔',specialAbility:'💔' },
  'Murder Bot 9000':                { walk:'4"',run:'12"',shootRange:'12"',shootDamage:'1hp',rollToHit:'3+',rollToBlock:'2+',attacksPerHit:'4x',meleeDamage:'4hp',rollToHeal:'3+',special:'4"/2hp',shootAbility:'⛔',specialAbility:'💔' },
  'Ganj the Squatch':               { walk:'8"',run:'12"',shootRange:'16"',shootDamage:'1hp',rollToHit:'3+',rollToBlock:'4+',attacksPerHit:'2x',meleeDamage:'3hp',rollToHeal:'4+',special:'8"/2hp',shootAbility:'',  specialAbility:'💔' },
  'Selfcentrica Space Pony Princess':{ walk:'8"',run:'24"',shootRange:'8"', shootDamage:'1hp',rollToHit:'3+',rollToBlock:'3+',attacksPerHit:'2x',meleeDamage:'4hp',rollToHeal:'4+',special:'4"/2hp',shootAbility:'⛔',specialAbility:'💔' },
  'Kronk':                          { walk:'8"',run:'12"',shootRange:'12"',shootDamage:'1hp',rollToHit:'3+',rollToBlock:'3+',attacksPerHit:'2x',meleeDamage:'4hp',rollToHeal:'4+',special:'4"/2hp',shootAbility:'⛔',specialAbility:'⛔' },
  'Queen of Fandom':                { walk:'6"',run:'12"',shootRange:'8"', shootDamage:'1hp',rollToHit:'2+',rollToBlock:'3+',attacksPerHit:'4x',meleeDamage:'4hp',rollToHeal:'3+',special:'6"/2hp',shootAbility:'⛔',specialAbility:'💔' },
  'Kandu Krow':                     { walk:'6"',run:'18"',shootRange:'12"',shootDamage:'1hp',rollToHit:'2+',rollToBlock:'4+',attacksPerHit:'2x',meleeDamage:'3hp',rollToHeal:'4+',special:'6"/2hp',shootAbility:'',  specialAbility:'⛔' },
  'The Glitch':                     { walk:'8"',run:'16"',shootRange:'16"',shootDamage:'1hp',rollToHit:'4+',rollToBlock:'5+',attacksPerHit:'2x',meleeDamage:'2hp',rollToHeal:'5+',special:'8"/2hp',shootAbility:'',  specialAbility:''   },
};

const FACTION_STATS = {
  'Red Rovers':   { walk:'6"',run:'12"',rollToHit:'4+',rollToBlock:'4+',rollToHeal:'4+',shootRange:'12"',shootDamage:'1hp',attacksPerHit:'1x',meleeDamage:'1hp',special:'6"/2hp' },
  'Space Aliens': { walk:'6"',run:'12"',rollToHit:'3+',rollToBlock:'5+',rollToHeal:'4+',shootRange:'12"',shootDamage:'1hp',attacksPerHit:'1x',meleeDamage:'1hp',special:'6"/2hp' },
  'NoLobe Zombies':{ walk:'4"',run:'12"',rollToHit:'6+',rollToBlock:'3+',rollToHeal:'2+',shootRange:'8"', shootDamage:'1hp',attacksPerHit:'1x',meleeDamage:'1hp',special:'4"/2hp' },
  'Murder Bots':  { walk:'4"',run:'12"',rollToHit:'5+',rollToBlock:'3+',rollToHeal:'3+',shootRange:'8"', shootDamage:'1hp',attacksPerHit:'1x',meleeDamage:'1hp',special:'4"/2hp' },
  'Monster':      { walk:'8"',run:'12"',rollToHit:'3+',rollToBlock:'5+',rollToHeal:'5+',shootRange:'16"',shootDamage:'1hp',attacksPerHit:'1x',meleeDamage:'1hp',special:'8"/2hp' },
  'Space Pony':   { walk:'8"',run:'12"',rollToHit:'2+',rollToBlock:'5+',rollToHeal:'6+',shootRange:'16"',shootDamage:'1hp',attacksPerHit:'1x',meleeDamage:'1hp',special:'8"/2hp' },
};

const UNCIVILIZED_STATS = {
  'Caveman':  { walk:'6"',run:'12"',rollToHit:'5+',rollToBlock:'3+',rollToHeal:'5+',shootRange:'8"',shootDamage:'1hp',attacksPerHit:'2x',meleeDamage:'1hp',special:'4"/2hp',specialAbility:'⛔' },
  'Dinosaur': { walk:'8"',run:'16"',rollToHit:'5+',rollToBlock:'3+',rollToHeal:'5+',shootRange:'8"',shootDamage:'1hp',attacksPerHit:'2x',meleeDamage:'1hp',special:'4"/1hp',specialAbility:'💔' },
};

const StatsModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('commanders');

  const tdStyle = {
    padding: '0.45rem 0.65rem',
    borderBottom: `1px solid rgba(255,255,255,0.04)`,
    fontSize: '0.78rem', whiteSpace: 'nowrap',
    color: colors.textSecondary,
    fontFamily: fonts.body,
  };

  const thStyle = {
    padding: '0.45rem 0.65rem',
    textAlign: 'left',
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: '0.72rem', fontWeight: '700',
    borderBottom: `1px solid rgba(255,255,255,0.08)`,
    whiteSpace: 'nowrap',
    background: 'rgba(0,0,0,0.35)',
  };

  const renderRow = (name, s) => (
    <tr key={name} style={{ transition: 'background 0.15s' }}>
      <td style={{ ...tdStyle, color: colors.gold, fontWeight: '700', fontFamily: fonts.display }}>{name}</td>
      <td style={tdStyle}>🚶{s.walk}</td>
      <td style={tdStyle}>🏃{s.run}</td>
      <td style={tdStyle}>🎯{s.shootRange}/{s.shootDamage} {s.shootAbility || ''}</td>
      <td style={tdStyle}>⚔️{s.rollToHit}</td>
      <td style={tdStyle}>🛡️{s.rollToBlock}</td>
      <td style={tdStyle}>💥{s.attacksPerHit}</td>
      <td style={tdStyle}>🗡️{s.meleeDamage}</td>
      <td style={tdStyle}>💚{s.rollToHeal}</td>
      <td style={tdStyle}>⚡{s.special} {s.specialAbility || ''}</td>
    </tr>
  );

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={{
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
        width: '100%', maxWidth: '900px',
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

        {/* Legend */}
        <div style={{
          display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
          padding: '0.6rem 0.75rem',
          background: 'rgba(0,0,0,0.25)', border: borders.default,
          borderRadius: '6px', marginBottom: '1.1rem',
        }}>
          {[['🚶 Walk',''],['🏃 Run',''],['🎯 Shoot Range/Dmg',''],['⚔️ Roll to Hit',''],['🛡️ Roll to Block',''],
            ['💥 Attacks/Hit',''],['🗡️ Melee Dmg',''],['💚 Roll to Heal',''],['⚡ Special',''],
            ['⛔ No Ability',''],['💔 Breaks Cooldown','']].map(([label]) => (
            <span key={label} style={{ color: colors.textSecondary, fontSize: '0.72rem' }}>{label}</span>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: '7px', border: `1px solid rgba(255,255,255,0.06)` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: surfaces.card }}>
            <thead>
              <tr>
                {['Name','Walk','Run','Shoot','Hit','Block','Attacks','Melee','Heal','Special'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'commanders' && Object.entries(COMMANDER_STATS).map(([name, s]) => renderRow(name, s))}
              {activeTab === 'factions' && (
                <>
                  {Object.entries(FACTION_STATS).map(([name, s]) => renderRow(name, s))}
                  <tr>
                    <td colSpan={10} style={{
                      padding: '0.4rem', color: colors.gold, fontFamily: fonts.display,
                      fontWeight: '700', background: 'rgba(0,0,0,0.35)', textAlign: 'center',
                      fontSize: '0.75rem', borderBottom: `1px solid rgba(255,255,255,0.04)`,
                    }}>─── Uncivilized ───</td>
                  </tr>
                  {Object.entries(UNCIVILIZED_STATS).map(([name, s]) => renderRow(name, s))}
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