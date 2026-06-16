import React from 'react';
import { colors, fonts } from '../theme';

const AwardShowcase = ({ showcase, onPrev, onNext, onFinish }) => {
  const { awards, index, sessionName } = showcase;
  const award=awards[index], isFirst=index===0, isLast=index===awards.length-1;
  const valLabel = () => {
    if (award.isManual)                          return award.label;
    if (award.categoryId==='itemsObtained')      return `${award.value} items obtained`;
    if (award.categoryId==='leastDeaths')        return `only ${award.value} revives used`;
    if (award.categoryId==='immortal')           return 'not a single death all session';
    if (award.categoryId==='leastDamageTaken')   return `only ${award.value} damage taken`;
    if (award.categoryId==='finalBossKill')      return 'delivered the killing blow';
    if (award.categoryId==='firstBlood')         return 'drew first blood this session';
    if (award.categoryId==='warmonger')          return `initiated ${award.value} attacks`;
    return `${award.value} damage dealt`;
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:2002,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#1a0f0a',border:'3px solid rgba(251,191,36,0.7)',borderRadius:'16px',padding:'2rem 1.5rem',width:'100%',maxWidth:'440px',textAlign:'center'}}>
        <div style={{color:colors.textMuted,fontSize:'0.62rem',fontWeight:'800',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'1.75rem'}}>{sessionName} · Award {index+1} of {awards.length}</div>
        <div style={{fontSize:'5rem',marginBottom:'0.75rem',lineHeight:1}}>{award.icon}</div>
        <div style={{color:colors.textSecondary,fontWeight:'800',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'0.2rem'}}>{award.label}</div>
        {award.desc && <div style={{color:colors.textFaint,fontSize:'0.75rem',fontWeight:'600',marginBottom:'0.85rem',fontStyle:'italic'}}>{award.desc}</div>}
        <div style={{color:award.playerColor||colors.gold,fontWeight:'900',fontSize:'2rem',marginBottom:'0.4rem',textShadow:`0 0 20px ${award.playerColor||colors.gold}66`}}>{award.playerName}</div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.5rem',marginBottom:'2rem'}}>
          {valLabel() && <div style={{color:colors.textMuted,fontSize:'0.82rem',padding:'0.35rem 1rem',background:'rgba(0,0,0,0.3)',borderRadius:'6px'}}>{valLabel()}</div>}
          <div style={{padding:'0.5rem 2rem',background:'rgba(251,191,36,0.12)',border:'2px solid rgba(251,191,36,0.5)',borderRadius:'10px',color:'#fbbf24',fontWeight:'900',fontSize:'1.75rem',letterSpacing:'0.05em'}}>+{award.pts} VP</div>
        </div>
        <div style={{display:'flex',gap:'0.75rem'}}>
          <button disabled={isFirst} onClick={onPrev} style={{flex:1,padding:'0.75rem',background:'rgba(0,0,0,0.3)',border:`1px solid ${isFirst?'transparent':'rgba(90,74,58,0.4)'}`,borderRadius:'8px',color:isFirst?'#1f2937':colors.textSecondary,fontWeight:'800',cursor:isFirst?'default':'pointer',fontFamily:fonts.body}}>← Prev</button>
          {isLast
            ? <button onClick={onFinish} style={{flex:2,padding:'0.75rem',background:'linear-gradient(135deg,#065f46,#047857)',border:'2px solid #10b981',borderRadius:'8px',color:'#d1fae5',fontWeight:'900',cursor:'pointer',fontFamily:fonts.body,fontSize:'0.95rem'}}>✓ Finish</button>
            : <button onClick={onNext}   style={{flex:2,padding:'0.75rem',background:'linear-gradient(135deg,#92400e,#78350f)',border:'2px solid #fbbf24',borderRadius:'8px',color:'#fbbf24',fontWeight:'900',cursor:'pointer',fontFamily:fonts.body,fontSize:'0.95rem'}}>Next →</button>
          }
        </div>
      </div>
    </div>
  );
};

export default AwardShowcase;
