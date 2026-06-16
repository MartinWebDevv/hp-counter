import React from 'react';
import { colors, fonts } from '../theme';

const EndSessionModal = ({ sessionNameInput, setSessionNameInput, onUseCurrentStats, onFromFile, onClose }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
    <div style={{background:'#1a0f0a',border:'2px solid rgba(251,191,36,0.5)',borderRadius:'12px',padding:'1.5rem',width:'100%',maxWidth:'480px'}}>
      <div style={{color:'#fbbf24',fontWeight:'900',fontSize:'1.1rem',letterSpacing:'0.08em',marginBottom:'0.25rem'}}>🏆 END SESSION</div>
      <div style={{color:colors.textMuted,fontSize:'0.75rem',marginBottom:'1rem'}}>Give this session a name, then calculate awards.</div>
      <input style={{background:'rgba(0,0,0,0.5)',border:'1px solid rgba(201,169,97,0.4)',borderRadius:'8px',padding:'0.6rem 0.85rem',color:'#e5d5b5',fontFamily:fonts.body,fontSize:'0.9rem',width:'100%',outline:'none',marginBottom:'1rem',boxSizing:'border-box'}} value={sessionNameInput} onChange={e=>setSessionNameInput(e.target.value)} placeholder='e.g. The Sleeping Giant' onKeyDown={e=>e.key==='Enter'&&onUseCurrentStats()} autoFocus/>
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem'}}>
        <button onClick={onUseCurrentStats} style={{flex:2,padding:'0.65rem',background:'linear-gradient(135deg,#92400e,#78350f)',border:'2px solid #fbbf24',borderRadius:'8px',color:'#fbbf24',fontWeight:'900',cursor:'pointer',fontFamily:fonts.body,fontSize:'0.85rem'}}>⚡ Use Current Stats</button>
        <button onClick={onFromFile} style={{flex:1,padding:'0.65rem',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(201,169,97,0.3)',borderRadius:'8px',color:'#c9a961',fontWeight:'800',cursor:'pointer',fontFamily:fonts.body,fontSize:'0.78rem'}}>📂 From File</button>
      </div>
      <button onClick={onClose} style={{width:'100%',padding:'0.5rem',background:'transparent',border:'none',color:colors.textFaint,fontWeight:'700',cursor:'pointer',fontFamily:fonts.body,fontSize:'0.78rem'}}>Cancel</button>
    </div>
  </div>
);

// ── ManualStatsModal (inline) ─────────────────────────────────────────────────

const STAT_FIELDS = [
  { key:'npcDamage',    label:'🐉 NPC Damage' },
  { key:'pvpDamage',    label:'⚔️ PvP Damage' },
  { key:'damageTaken',  label:'🛡️ Damage Taken' },
  { key:'revivesUsed',  label:'💪 Times Revived' },
  { key:'finalBossKill',label:'👑 Boss Kill (0/1)' },
  { key:'warmonger',    label:'⚡ Attacks' },
  { key:'firstBlood',   label:'🩸 First Blood (0/1)' },
];

const ManualStatsModal = ({ data, onChange, onConfirm, onClose }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:2001,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
    <div style={{background:'#1a0f0a',border:'2px solid rgba(251,191,36,0.5)',borderRadius:'12px',padding:'1.5rem',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflowY:'auto'}}>
      <div style={{color:'#fbbf24',fontWeight:'900',fontSize:'1rem',marginBottom:'0.25rem'}}>📋 ENTER SESSION STATS</div>
      <div style={{color:colors.textMuted,fontSize:'0.72rem',marginBottom:'1.25rem'}}>No VP data found. Enter what you remember — leave blank for 0.</div>
      {(data.players||[]).map(p=>(
        <div key={p.id} style={{background:'rgba(0,0,0,0.3)',border:`1px solid ${p.playerColor||'#555'}40`,borderRadius:'8px',padding:'0.75rem',marginBottom:'0.75rem'}}>
          <div style={{color:p.playerColor||colors.gold,fontWeight:'800',fontSize:'0.85rem',marginBottom:'0.6rem'}}>{p.playerName}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem'}}>
            {STAT_FIELDS.map(f=>(
              <div key={f.key}>
                <div style={{color:colors.textMuted,fontSize:'0.6rem',fontWeight:'700',marginBottom:'2px'}}>{f.label}</div>
                <input type='number' min='0' style={{background:'rgba(0,0,0,0.5)',border:'1px solid rgba(201,169,97,0.25)',borderRadius:'6px',padding:'0.3rem 0.5rem',color:'#e5d5b5',fontFamily:fonts.body,fontSize:'0.8rem',width:'100%',outline:'none',boxSizing:'border-box'}} value={data.stats[p.id]?.[f.key]??''} onChange={e=>onChange(p.id,f.key,e.target.value)} placeholder='0'/>
              </div>
            ))}
            <div>
              <div style={{color:colors.textMuted,fontSize:'0.6rem',fontWeight:'700',marginBottom:'2px'}}>📦 Items</div>
              <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(201,169,97,0.15)',borderRadius:'6px',padding:'0.3rem 0.5rem',color:colors.textSecondary,fontSize:'0.8rem'}}>{(p.inventory||[]).length} (auto)</div>
            </div>
          </div>
        </div>
      ))}
      <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
        <button onClick={onClose} style={{flex:1,padding:'0.65rem',background:'transparent',border:'1px solid rgba(90,74,58,0.4)',borderRadius:'8px',color:colors.textMuted,fontWeight:'700',cursor:'pointer',fontFamily:fonts.body}}>Cancel</button>
        <button onClick={onConfirm} style={{flex:2,padding:'0.65rem',background:'linear-gradient(135deg,#92400e,#78350f)',border:'2px solid #fbbf24',borderRadius:'8px',color:'#fbbf24',fontWeight:'900',cursor:'pointer',fontFamily:fonts.body}}>Calculate Awards →</button>
      </div>
    </div>
  </div>
);

// ── AwardShowcase (inline) ────────────────────────────────────────────────────

export { EndSessionModal, ManualStatsModal, STAT_FIELDS };
