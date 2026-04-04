import { useState } from "react";
import { C, font } from "../theme";

export function Btn({ children, onClick, v="primary", sm, full, disabled, style={}, type = "button", ...rest }) {
  const [h,setH] = useState(false);
  const vs = {
    primary: { bg: h?C.rdark:C.red, color:"#fff" },
    outline:  { bg: h?C.faint:"transparent", color:"#fff", border:`1.5px solid ${C.border}` },
    orange:   { bg: h?C.odark:C.orange, color:C.pdark },
    ghost:    { bg:"transparent", color:C.muted, border:"none" },
    danger:   { bg: h?"#dc2626":C.danger, color:"#fff" },
    success:  { bg: h?"#059669":C.success, color:"#fff" },
    purple:   { bg: h?"#5b21b6":C.purple, color:"#fff" },
  };
  const s = vs[v]||vs.primary;
  return (
    <button type={type} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={disabled?undefined:onClick}
      style={{background:disabled?"#555":s.bg,color:s.color,border:s.border||"none",borderRadius:10,padding:sm?"5px 12px":"9px 20px",fontFamily:font,fontWeight:700,fontSize:sm?12:13,cursor:disabled?"not-allowed":"pointer",transition:"all .2s",width:full?"100%":"auto",opacity:disabled?.6:1,...style}}
      {...rest}>
      {children}
    </button>
  );
}

export function Card({ children, style={}, onClick }) {
  const [h,setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:h?"rgba(103,45,134,.22)":"rgba(50,29,61,.58)",border:`1px solid ${h?C.purple+"55":C.border}`,borderRadius:18,padding:20,backdropFilter:"blur(12px)",transition:"all .25s",cursor:onClick?"pointer":"default",...style}}>
      {children}
    </div>
  );
}

export function PBar({ value, color=C.red, h=6 }) {
  return (
    <div style={{background:C.faint,borderRadius:99,height:h,overflow:"hidden"}}>
      <div style={{width:`${value}%`,height:"100%",background:color,borderRadius:99,transition:"width .6s"}}/>
    </div>
  );
}

export function Badge({ children, color=C.red }) {
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:50,padding:"2px 9px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
}

export function Stars({ n=5 }) {
  return <span style={{color:C.orange,fontSize:13}}>{"★".repeat(n)}{"☆".repeat(5-n)}</span>;
}

export function Input({ label, value, onChange, type="text", placeholder="", error, rows }) {
  const [f,setF] = useState(false);
  const style = {background:"rgba(255,255,255,.06)",border:`1.5px solid ${error?C.danger:f?C.red:C.border}`,borderRadius:10,padding:"9px 13px",color:"#fff",fontFamily:font,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color .2s"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
      {label && <label style={{fontSize:12,fontWeight:600,color:C.muted}}>{label}</label>}
      {rows
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{...style,resize:"vertical"}}/>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={style}/>}
      {error && <span style={{color:C.danger,fontSize:11}}>{error}</span>}
    </div>
  );
}

export function Select({ label, value, onChange, options=[] }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
      {label && <label style={{fontSize:12,fontWeight:600,color:C.muted}}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{background:"#2a1540",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 13px",color:"#fff",fontFamily:font,fontSize:13,outline:"none"}}>
        {options.map(o => <option key={o.v} value={o.v} style={{background:"#321d3d"}}>{o.l}</option>)}
      </select>
    </div>
  );
}

export function Modal({ children, onClose, title }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"#2a1540",border:`1px solid ${C.border}`,borderRadius:20,padding:24,maxWidth:520,width:"100%",maxHeight:"88vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
        {title && <div style={{fontWeight:800,fontSize:16,marginBottom:18,display:"flex",justifyContent:"space-between"}}>
          {title}
          <button style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",fontFamily:font}} onClick={onClose}>✕</button>
        </div>}
        {children}
      </div>
    </div>
  );
}
