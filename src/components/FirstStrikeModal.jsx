import React from 'react';
import { colors, fonts } from '../theme';

const FirstStrikeModal = ({ players, selected, onToggle, onConfirm }) => {
  const [awarding, setAwarding] = React.useState(null);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3000}}>
      <div style={{background:'linear-gradient(145deg,#1a0f0a,#0f0805)',border:'3px solid #f59e0b',borderRadius:'14px',padding:'1.75rem',width:'90%',maxWidth:'420px',boxShadow:'0 0 40px rgba(245,158,11,0.2),0 24px 64px rgba(0,0,0,0.95)',fontFamily:'"Rajdhani","Cinzel",sans-serif'}}>
        <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>⚡</div>
          <h2 style={{color:'#f59e0b',fontSize:'1.3rem',fontFamily:'"Cinzel",Georgia,serif',fontWeight:'900',letterSpacing:'0.1em',margin:'0 0 0.5rem'}}>FIRST STRIKE</h2>
          <p style={{color:colors.textMuted,fontSize:'0.85rem',margin:0}}>Does this activation grant a First Strike bonus?</p>
        </div>
        {awarding===null&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
          <button onClick={()=>setAwarding(true)} style={{padding:'1rem',background:'linear-gradient(135deg,#ca8a04,#a16207)',border:'2px solid #f59e0b',color:'#fef3c7',borderRadius:'10px',cursor:'pointer',fontFamily:fonts.body,fontWeight:'800',fontSize:'1.1rem'}}>⚡ YES</button>
          <button onClick={()=>onConfirm(false)} style={{padding:'1rem',background:'rgba(0,0,0,0.4)',border:'2px solid #374151',color:colors.textMuted,borderRadius:'10px',cursor:'pointer',fontFamily:fonts.body,fontWeight:'800',fontSize:'1.1rem'}}>✕ NO</button>
        </div>}
        {awarding===true&&<>
          <p style={{color:'#f59e0b',fontSize:'0.85rem',fontWeight:'700',marginBottom:'0.75rem',textAlign:'center',letterSpacing:'0.08em',textTransform:'uppercase'}}>Select player(s)</p>
          <div style={{marginBottom:'1rem'}}>
            {players.map(player=>{
              const has=player.firstStrike===true, isSel=selected.includes(player.id), disabled=has&&!isSel;
              return <div key={player.id} onClick={()=>!disabled&&onToggle(player.id)} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',marginBottom:'0.4rem',borderRadius:'8px',border:'2px solid',borderColor:isSel?'#f59e0b':disabled?'#1f1108':'rgba(201,169,97,0.2)',background:isSel?'rgba(245,158,11,0.12)':disabled?'rgba(0,0,0,0.1)':'rgba(0,0,0,0.3)',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1}}>
                <div style={{width:'20px',height:'20px',borderRadius:'4px',border:'2px solid',borderColor:isSel?'#f59e0b':colors.textFaint,background:isSel?'#f59e0b':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',color:'#000',fontWeight:'900',flexShrink:0}}>{isSel&&'✓'}</div>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:player.playerColor||'#3b82f6',flexShrink:0}}/>
                <span style={{color:isSel?'#fbbf24':disabled?colors.textFaint:colors.gold,fontWeight:'700',fontSize:'0.95rem',flex:1}}>{player.playerName||'Player'}</span>
                {has&&<span style={{color:'#f59e0b',fontSize:'0.7rem',fontWeight:'700'}}>⚡ HAS BONUS</span>}
              </div>;
            })}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
            <button onClick={()=>onConfirm(true)} disabled={selected.length===0} style={{padding:'0.85rem',background:selected.length>0?'linear-gradient(135deg,#ca8a04,#a16207)':'rgba(0,0,0,0.3)',border:'2px solid',borderColor:selected.length>0?'#f59e0b':colors.textDisabled,color:selected.length>0?'#fef3c7':colors.textFaint,borderRadius:'8px',cursor:selected.length>0?'pointer':'not-allowed',fontFamily:fonts.body,fontWeight:'800'}}>⚡ Award</button>
            <button onClick={()=>setAwarding(null)} style={{padding:'0.85rem',background:'rgba(0,0,0,0.3)',border:'2px solid #374151',color:colors.textMuted,borderRadius:'8px',cursor:'pointer',fontFamily:fonts.body,fontWeight:'700'}}>← Back</button>
          </div>
        </>}
      </div>
    </div>
  );
};

export default FirstStrikeModal;
