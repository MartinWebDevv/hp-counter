import React, { useState } from 'react';
import { colors, fonts, borders, surfaces } from '../theme';

// ── Status effect definitions ──────────────────────────────────────────────
const STATUS_EFFECTS = [
  { type: 'poison',        label: '🤢 Poison',         hasValue: true,  hasDuration: true,  defaultValue: 2, defaultDuration: 2 },
  { type: 'burn',          label: '🔥 Burn',            hasValue: true,  hasDuration: true,  defaultValue: 2, defaultDuration: 2 },
  { type: 'stun',          label: '💫 Stun',            hasValue: false, hasDuration: true,  defaultDuration: 1 },
  { type: 'attackBuff',    label: '⚔️↑ Attack Buff',    hasValue: true,  hasDuration: true,  defaultValue: 2, defaultDuration: 2 },
  { type: 'defenseBuff',   label: '🛡️↑ Defense Buff',   hasValue: true,  hasDuration: true,  defaultValue: 2, defaultDuration: 2 },
  { type: 'attackDebuff',  label: '⚔️↓ Attack Debuff',  hasValue: true,  hasDuration: true,  defaultValue: 2, defaultDuration: 2 },
  { type: 'defenseDebuff', label: '🛡️↓ Defense Debuff', hasValue: true,  hasDuration: true,  defaultValue: 2, defaultDuration: 2 },
  { type: 'shieldWall',    label: '🛡️ Shield Wall',     hasValue: false, hasDuration: true,  defaultDuration: 1 },
  { type: 'counterStrike', label: '⚡ Counter Strike',  hasValue: false, hasDuration: true,  defaultDuration: 1 },
  { type: 'marked',        label: '🎯 Marked',          hasValue: false, hasDuration: true,  defaultDuration: 1 },
];

const sectionTitle = { color: colors.gold, fontFamily: fonts.display, fontWeight: '900', fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(201,169,97,0.2)' };
const card = { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.35)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' };
const inputStyle = { width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(90,74,58,0.4)', borderRadius: '6px', color: colors.textPrimary, padding: '0.5rem 0.7rem', fontFamily: fonts.body, fontSize: '0.82rem', boxSizing: 'border-box', outline: 'none' };
const numInput = { ...inputStyle, width: '70px', textAlign: 'center' };
const applyBtn = { padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(109,40,217,0.15))', border: '1px solid rgba(139,92,246,0.5)', borderRadius: '8px', color: '#c4b5fd', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.82rem', letterSpacing: '0.05em' };

// ── Status Effect Tool ─────────────────────────────────────────────────────
const StatusEffectTool = ({ players, npcs, updatePlayer, setNpcs, addLog }) => {
  const [selectedEffect, setSelectedEffect] = useState(STATUS_EFFECTS[0]);
  const [value, setValue] = useState(2);
  const [duration, setDuration] = useState(2);
  const [permanent, setPermanent] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState([]); // [{ type: 'player'|'npc', id, unitKey, label }]
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [msg, setMsg] = useState('');

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const toggleTarget = (target) => {
    const key = `${target.type}-${target.id}-${target.unitKey || ''}`;
    setSelectedTargets(prev => {
      const exists = prev.find(t => `${t.type}-${t.id}-${t.unitKey || ''}` === key);
      return exists ? prev.filter(t => `${t.type}-${t.id}-${t.unitKey || ''}` !== key) : [...prev, target];
    });
  };

  const isSelected = (type, id, unitKey = '') =>
    !!selectedTargets.find(t => t.type === type && t.id === id && (t.unitKey || '') === unitKey);

  const handleApply = () => {
    if (selectedTargets.length === 0) { flash('Select at least one target.'); return; }
    const effect = {
      type: selectedEffect.type,
      value: selectedEffect.hasValue ? (parseInt(value) || 0) : 0,
      duration: permanent ? 999 : (parseInt(duration) || 1),
      permanent,
    };

    selectedTargets.forEach(t => {
      if (t.type === 'npc') {
        setNpcs(prev => prev.map(n => n.id === t.id
          ? { ...n, statusEffects: [...(n.statusEffects || []), effect] }
          : n));
        addLog(`${selectedEffect.label} applied to NPC "${t.label}"`, 'combat');
      } else {
        const player = players.find(p => String(p.id) === String(t.id));
        if (!player) return;
        if (t.unitKey === 'commander') {
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...(player.commanderStats.statusEffects || []), effect] } });
        } else {
          const unitIdx = t.unitKey === 'special' ? 0 : parseInt((t.unitKey || '').replace('soldier', ''));
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, statusEffects: [...(u.statusEffects || []), effect] } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`${selectedEffect.label} applied to ${player.playerName}'s ${t.label}`, 'combat');
      }
    });

    flash(`✓ Applied to ${selectedTargets.length} target${selectedTargets.length !== 1 ? 's' : ''}`);
    setSelectedTargets([]);
  };

  return (
    <div>
      {/* Effect picker */}
      <div style={card}>
        <div style={sectionTitle}>Status Effect</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
          {STATUS_EFFECTS.map(ef => (
            <button key={ef.type} onClick={() => { setSelectedEffect(ef); setValue(ef.defaultValue || 2); setDuration(ef.defaultDuration || 2); }} style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', background: selectedEffect.type === ef.type ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)', border: `1px solid ${selectedEffect.type === ef.type ? 'rgba(139,92,246,0.6)' : 'rgba(90,74,58,0.3)'}`, color: selectedEffect.type === ef.type ? '#c4b5fd' : colors.textMuted }}>
              {ef.label}
            </button>
          ))}
        </div>

        {/* Value / Duration */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedEffect.hasValue && (
            <div>
              <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '800', marginBottom: '0.2rem' }}>VALUE</div>
              <input type="number" min="1" value={value} onChange={e => setValue(e.target.value)} style={numInput} />
            </div>
          )}
          <div>
            <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '800', marginBottom: '0.2rem' }}>DURATION (rounds)</div>
            <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} disabled={permanent} style={{ ...numInput, opacity: permanent ? 0.4 : 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem' }}>
            <input type="checkbox" id="perm" checked={permanent} onChange={e => setPermanent(e.target.checked)} style={{ cursor: 'pointer' }} />
            <label htmlFor="perm" style={{ color: colors.textMuted, fontSize: '0.72rem', cursor: 'pointer' }}>Permanent</label>
          </div>
        </div>
      </div>

      {/* Target picker */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={sectionTitle}>Targets {selectedTargets.length > 0 && <span style={{ color: '#c4b5fd' }}>({selectedTargets.length} selected)</span>}</div>
          {selectedTargets.length > 0 && <button onClick={() => setSelectedTargets([])} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '0.68rem' }}>Clear all</button>}
        </div>

        {/* Players */}
        {players.filter(p => !p.isAbsent).map(p => (
          <div key={p.id} style={{ marginBottom: '0.4rem' }}>
            <div onClick={() => setExpandedPlayer(expandedPlayer === p.id ? null : p.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: expandedPlayer === p.id ? '7px 7px 0 0' : '7px', cursor: 'pointer', background: 'rgba(0,0,0,0.25)', border: `1px solid ${expandedPlayer === p.id ? 'rgba(201,169,97,0.4)' : 'rgba(90,74,58,0.25)'}`, borderBottom: expandedPlayer === p.id ? '1px solid rgba(201,169,97,0.15)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.playerColor || colors.gold, flexShrink: 0 }} />
                <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.8rem' }}>{p.playerName}</span>
              </div>
              <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{expandedPlayer === p.id ? '▲' : '▼'}</span>
            </div>
            {expandedPlayer === p.id && (
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(90,74,58,0.2)', borderTop: 'none', borderRadius: '0 0 7px 7px', padding: '0.3rem' }}>
                {/* Commander */}
                {[
                  { unitKey: 'commander', label: p.commanderStats?.customName || p.commander || 'Commander', hp: p.commanderStats?.hp, maxHp: p.commanderStats?.maxHp },
                  ...(p.subUnits || []).map((u, i) => ({ unitKey: i === 0 ? 'special' : `soldier${i}`, label: u.name || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp })),
                ].map(unit => {
                  const sel = isSelected('player', p.id, unit.unitKey);
                  return (
                    <div key={unit.unitKey} onClick={() => toggleTarget({ type: 'player', id: p.id, unitKey: unit.unitKey, label: unit.label })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: '5px', cursor: 'pointer', marginBottom: '0.15rem', background: sel ? 'rgba(139,92,246,0.12)' : 'transparent', border: `1px solid ${sel ? 'rgba(139,92,246,0.4)' : 'transparent'}` }}>
                      <span style={{ color: sel ? '#c4b5fd' : colors.textSecondary, fontWeight: sel ? '800' : '600', fontSize: '0.75rem' }}>{unit.label}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{unit.hp}/{unit.maxHp}hp</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Active NPCs */}
        {npcs.filter(n => n.active && !n.isDead).length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ color: '#f87171', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Active NPCs</div>
            {npcs.filter(n => n.active && !n.isDead).map(npc => {
              const sel = isSelected('npc', npc.id);
              return (
                <div key={npc.id} onClick={() => toggleTarget({ type: 'npc', id: npc.id, label: npc.name })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.2rem', background: sel ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.2)', border: `1px solid ${sel ? 'rgba(239,68,68,0.4)' : 'rgba(90,74,58,0.2)'}` }}>
                  <span style={{ color: sel ? '#fca5a5' : colors.textSecondary, fontWeight: sel ? '800' : '600', fontSize: '0.78rem' }}>👾 {npc.name}</span>
                  <span style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{npc.hp}/{npc.maxHp}hp</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {msg && <div style={{ textAlign: 'center', color: '#86efac', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{msg}</div>}
      <button onClick={handleApply} style={{ ...applyBtn, width: '100%', padding: '0.75rem' }}>
        ✦ Apply {selectedEffect.label}{selectedTargets.length > 0 ? ` to ${selectedTargets.length} target${selectedTargets.length !== 1 ? 's' : ''}` : ''}
      </button>
    </div>
  );
};

// ── Manual Log Entry ───────────────────────────────────────────────────────
const LogEntryTool = ({ addLog }) => {
  const [msg, setMsg] = useState('');
  const [category, setCategory] = useState('system');
  const [sent, setSent] = useState(false);

  const categories = [
    { id: 'system', label: '📋 System' },
    { id: 'combat', label: '⚔️ Combat' },
    { id: 'items',  label: '🎁 Items' },
  ];

  const handleSend = () => {
    if (!msg.trim()) return;
    addLog(msg.trim(), category);
    setMsg('');
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <div style={card}>
      <div style={sectionTitle}>Manual Log Entry</div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', background: category === c.id ? 'rgba(201,169,97,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${category === c.id ? 'rgba(201,169,97,0.5)' : 'rgba(90,74,58,0.3)'}`, color: category === c.id ? colors.gold : colors.textMuted }}>
            {c.label}
          </button>
        ))}
      </div>
      <textarea
        value={msg}
        onChange={e => setMsg(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        placeholder="Type a log entry... (Enter to send)"
        rows={3}
        style={{ ...inputStyle, resize: 'vertical', marginBottom: '0.5rem' }}
      />
      <button onClick={handleSend} disabled={!msg.trim()} style={{ ...applyBtn, width: '100%', opacity: msg.trim() ? 1 : 0.5, cursor: msg.trim() ? 'pointer' : 'not-allowed' }}>
        {sent ? '✓ Logged!' : '📋 Add to Log'}
      </button>
    </div>
  );
};

// ── Round Controls ─────────────────────────────────────────────────────────
const RoundControlTool = ({ currentRound, onSetRound, onAdvanceRound }) => {
  const [roundInput, setRoundInput] = useState('');
  const [confirm, setConfirm] = useState(null); // 'advance' | 'set'

  const handleAdvance = () => {
    if (confirm === 'advance') {
      onAdvanceRound();
      setConfirm(null);
    } else setConfirm('advance');
  };

  const handleSet = () => {
    const n = parseInt(roundInput);
    if (!n || n < 1) return;
    if (confirm === 'set') {
      onSetRound(n);
      setRoundInput('');
      setConfirm(null);
    } else setConfirm('set');
  };

  return (
    <div style={card}>
      <div style={sectionTitle}>Round Controls</div>
      <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginBottom: '0.75rem' }}>
        Current Round: <span style={{ color: colors.gold, fontWeight: '900', fontSize: '0.9rem' }}>{currentRound}</span>
      </div>

      <button onClick={handleAdvance} style={{ ...applyBtn, width: '100%', marginBottom: '0.5rem', background: confirm === 'advance' ? 'rgba(249,115,22,0.2)' : undefined, border: confirm === 'advance' ? '1px solid rgba(249,115,22,0.5)' : undefined, color: confirm === 'advance' ? '#fdba74' : undefined }}>
        {confirm === 'advance' ? '⚠️ Confirm Advance Round?' : `⏭️ Advance to Round ${currentRound + 1}`}
      </button>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="number" min="1" value={roundInput}
          onChange={e => setRoundInput(e.target.value)}
          placeholder="Round #"
          style={{ ...numInput, flex: 1, width: 'auto' }}
        />
        <button onClick={handleSet} disabled={!roundInput} style={{ ...applyBtn, opacity: roundInput ? 1 : 0.5, cursor: roundInput ? 'pointer' : 'not-allowed', background: confirm === 'set' ? 'rgba(249,115,22,0.2)' : undefined, border: confirm === 'set' ? '1px solid rgba(249,115,22,0.5)' : undefined, color: confirm === 'set' ? '#fdba74' : undefined }}>
          {confirm === 'set' ? '⚠️ Confirm?' : '📍 Set Round'}
        </button>
      </div>
      {confirm && <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.4rem', textAlign: 'center' }}>Click again to confirm, or choose another action to cancel.</div>}
    </div>
  );
};

// ── DM Notes ──────────────────────────────────────────────────────────────
const NoteColor = ['#fbbf24','#86efac','#f9a8d4','#93c5fd','#fca5a5','#c4b5fd'];

const DMNotesTool = ({ notes, setNotes }) => {
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState(NoteColor[0]);
  const [expanded, setExpanded] = useState(null);

  const addNote = () => {
    if (!draft.trim()) return;
    const note = { id: Date.now(), text: draft.trim(), color, createdAt: new Date().toLocaleString() };
    setNotes([note, ...(notes || [])]);
    setDraft('');
  };

  const deleteNote = (id) => setNotes((notes || []).filter(n => n.id !== id));
  const editNote = (id, text) => setNotes((notes || []).map(n => n.id === id ? { ...n, text } : n));

  return (
    <div>
      {/* New note composer */}
      <div style={card}>
        <div style={sectionTitle}>DM Notes</div>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
          {NoteColor.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? `2px solid white` : '2px solid transparent', flexShrink: 0 }} />
          ))}
        </div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); addNote(); } }}
          placeholder="Write a note... (Ctrl+Enter to save)"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', marginBottom: '0.5rem' }}
        />
        <button onClick={addNote} disabled={!draft.trim()} style={{ ...applyBtn, width: '100%', opacity: draft.trim() ? 1 : 0.5, cursor: draft.trim() ? 'pointer' : 'not-allowed' }}>
          📝 Save Note
        </button>
      </div>

      {/* Notes list */}
      {(notes || []).length === 0 && (
        <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.72rem', padding: '1rem' }}>No notes yet.</div>
      )}
      {(notes || []).map(note => (
        <div key={note.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${note.color}40`, borderLeft: `3px solid ${note.color}`, borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            {expanded === note.id ? (
              <textarea
                defaultValue={note.text}
                onBlur={e => { editNote(note.id, e.target.value); setExpanded(null); }}
                autoFocus
                rows={3}
                style={{ ...inputStyle, flex: 1, resize: 'vertical', borderColor: `${note.color}60` }}
              />
            ) : (
              <div onClick={() => setExpanded(note.id)} style={{ color: colors.textPrimary, fontSize: '0.78rem', lineHeight: '1.45', flex: 1, cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note.text}</div>
            )}
            <button onClick={() => deleteNote(note.id)} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '0.9rem', padding: '0', flexShrink: 0, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.58rem', marginTop: '0.3rem' }}>{note.createdAt} · Click to edit</div>
        </div>
      ))}
    </div>
  );
};

// ── Main DMToolsPanel ──────────────────────────────────────────────────────
const DMToolsPanel = ({ players = [], npcs = [], currentRound = 1, updatePlayer, setNpcs, addLog, onSetRound, onAdvanceRound, dmNotes = [], setDmNotes }) => {
  const [activeTab, setActiveTab] = useState('status');

  const tabs = [
    { id: 'status', label: '✨ Effects' },
    { id: 'log',    label: '📋 Log' },
    { id: 'round',  label: '⏱️ Round' },
    { id: 'notes',  label: '📝 Notes' },
  ];

  return (
    <div style={{ padding: '0 0.5rem 0.5rem' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '0.3rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '0.4rem 0.2rem', borderRadius: '6px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', border: 'none', background: activeTab === t.id ? 'rgba(201,169,97,0.15)' : 'transparent', color: activeTab === t.id ? colors.gold : colors.textFaint, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'status' && <StatusEffectTool players={players} npcs={npcs} updatePlayer={updatePlayer} setNpcs={setNpcs} addLog={addLog} />}
      {activeTab === 'log'    && <LogEntryTool addLog={addLog} />}
      {activeTab === 'round'  && <RoundControlTool currentRound={currentRound} onSetRound={onSetRound} onAdvanceRound={onAdvanceRound} addLog={addLog} />}
      {activeTab === 'notes'  && <DMNotesTool notes={dmNotes} setNotes={setDmNotes} />}
    </div>
  );
};

export default DMToolsPanel;