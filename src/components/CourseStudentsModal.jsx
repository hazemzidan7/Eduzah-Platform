/**
 * CourseStudentsModal
 * Full in-platform student list viewer for a specific course.
 * Opened by Admin from the Courses tab.
 */
import { useState, useEffect, useMemo } from "react";
import { C, font } from "../theme";
import { fetchCourseStudents, fmtPlan, fmtTraining, exportCourseStudents } from "../utils/exportExcel";

const STATUS_CFG = {
  approved:   { label: "مقبول",    bg: "rgba(52,211,153,.15)", color: "#34d399", dot: "#34d399" },
  pending:    { label: "قيد المراجعة", bg: "rgba(251,191,36,.15)", color: "#fbbf24", dot: "#fbbf24" },
  rejected:   { label: "مرفوض",   bg: "rgba(248,113,113,.15)", color: "#f87171", dot: "#f87171" },
  "no-account":{ label: "بدون حساب", bg: "rgba(255,255,255,.07)", color: C.muted, dot: "rgba(255,255,255,.3)" },
};

const PLAN_CFG = {
  "دفع كامل (−5%)": { color: "#34d399" },
  "أقساط (3×)":     { color: C.orange },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG["no-account"];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:cfg.bg,
      color:cfg.color, borderRadius:50, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot, flexShrink:0 }}/>
      {cfg.label}
    </span>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{ display:"inline-block", background:`${color}20`, color, border:`1px solid ${color}44`,
      borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function Stat({ label, value, color = "#fff", sub }) {
  return (
    <div style={{ background:"rgba(255,255,255,.05)", border:`1px solid ${C.border}`, borderRadius:12,
      padding:"14px 16px", flex:"1 1 120px", minWidth:110 }}>
      <div style={{ fontSize:22, fontWeight:900, color }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginTop:1 }}>{sub}</div>}
    </div>
  );
}

export default function CourseStudentsModal({ course, allUsers, onClose, onExport }) {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortCol,    setSortCol]    = useState("requestedAt");
  const [sortDir,    setSortDir]    = useState("desc");
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchCourseStudents(course, allUsers)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [course.id]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const fullCount    = rows.filter(r => r.payPlan.includes("كامل")).length;
  const instCount    = rows.filter(r => r.payPlan.includes("قساط")).length;
  const onlineCount  = rows.filter(r => r.training.includes("Online")).length;

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    }
    if (filterPlan !== "all") out = out.filter(r =>
      filterPlan === "full" ? r.payPlan.includes("كامل") : r.payPlan.includes("قساط")
    );
    if (filterType !== "all") out = out.filter(r =>
      filterType === "online" ? r.training.includes("Online") : r.training.includes("Offline") || r.training.includes("Branch")
    );
    out.sort((a, b) => {
      const av = a[sortCol] || ""; const bv = b[sortCol] || "";
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return out;
  }, [rows, search, filterPlan, filterType, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportCourseStudents(course, allUsers); }
    catch(e) { console.error(e); }
    finally { setExporting(false); }
  };

  // ── Column definitions ────────────────────────────────────────────────────
  const COL_DEFS = [
    { key:"#",           label:"#",           w:40,  render:(_,i)=><span style={{color:C.muted,fontSize:11}}>{i+1}</span> },
    { key:"name",        label:"الاسم",        w:160, sortable:true,
      render:(r)=>(
        <div>
          <div style={{fontWeight:700,fontSize:13}}>{r.name}</div>
          <div style={{color:C.muted,fontSize:11,marginTop:1}}>{r.email}</div>
        </div>
      )
    },
    { key:"phone",       label:"الهاتف",       w:130,
      render:(r)=><span style={{fontFamily:"monospace",fontSize:12,color:"#fff"}}>{r.phone||"—"}</span>
    },
    { key:"training",    label:"نوع التدريب", w:130,
      render:(r)=><Pill color={r.training.includes("Online")?C.purple:C.orange}>{r.training}</Pill>
    },
    { key:"payPlan",     label:"خطة الدفع",   w:130,
      render:(r)=>{
        const cfg = PLAN_CFG[r.payPlan] || { color: C.muted };
        return <Pill color={cfg.color}>{r.payPlan}</Pill>;
      }
    },
    { key:"amount",      label:"المبلغ",       w:110,
      render:(r)=>r.amount!=null
        ? <span style={{fontWeight:800,color:"#34d399",fontSize:13}}>{Number(r.amount).toLocaleString()} <small style={{fontSize:10,fontWeight:400,color:C.muted}}>EGP</small></span>
        : <span style={{color:C.muted}}>—</span>
    },
    { key:"level",       label:"المستوى",      w:100,
      render:(r)=><span style={{fontSize:12,color:C.muted}}>{r.level}</span>
    },
    { key:"status",      label:"الحالة",       w:130,
      render:(r)=><StatusBadge status={r.status}/>
    },
    { key:"progress",    label:"التقدم",       w:80,
      render:(r)=>{
        const num = parseInt(r.progress) || 0;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <span style={{fontSize:12,fontWeight:700,color:num>=100?"#34d399":num>0?C.orange:C.muted}}>{r.progress}</span>
            {num > 0 && (
              <div style={{width:"100%",height:4,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden"}}>
                <div style={{width:`${Math.min(num,100)}%`,height:"100%",background:num>=100?"#34d399":C.orange,borderRadius:99}}/>
              </div>
            )}
          </div>
        );
      }
    },
    { key:"requestedAt", label:"تاريخ الطلب", w:150, sortable:true,
      render:(r)=><span style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{r.requestedAt||r.enrollDate||"—"}</span>
    },
  ];

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span style={{opacity:.3,fontSize:10}}>↕</span>;
    return <span style={{fontSize:10,color:C.orange}}>{sortDir==="asc"?"↑":"↓"}</span>;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1200,
        display:"flex", alignItems:"flex-start", justifyContent:"center",
        padding:"20px 12px", overflowY:"auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:"#1a0a2e", border:`1px solid ${C.border}`, borderRadius:20,
        width:"100%", maxWidth:1100, minHeight:400, boxShadow:"0 30px 80px rgba(0,0,0,.6)",
        display:"flex", flexDirection:"column" }}
        onClick={e=>e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ background:"linear-gradient(135deg,#2a1540,#3d1f5c)", borderRadius:"20px 20px 0 0",
          padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"center",
          flexWrap:"wrap", gap:10, borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{fontSize:10,color:C.muted,marginBottom:3,letterSpacing:1}}>COURSE STUDENTS</div>
            <h2 style={{fontFamily:font,fontSize:18,fontWeight:900,margin:0}}>{course.title}</h2>
            {course.title_en && course.title_en !== course.title &&
              <div style={{color:C.muted,fontSize:12,marginTop:2}}>{course.title_en}</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button
              onClick={handleExport}
              disabled={exporting||loading||rows.length===0}
              style={{ display:"flex", alignItems:"center", gap:7, background:"#1D6F42",
                color:"#fff", border:"none", borderRadius:9, padding:"8px 16px",
                fontFamily:font, fontWeight:700, fontSize:12, cursor:"pointer",
                opacity:(exporting||loading||rows.length===0)?0.5:1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
              {exporting ? "جاري التصدير..." : "تصدير Excel"}
            </button>
            <button onClick={onClose}
              style={{ width:34, height:34, borderRadius:8, background:"rgba(255,255,255,.08)",
                border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer",
                fontSize:18, display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:font }}>×</button>
          </div>
        </div>

        <div style={{padding:"18px 22px", display:"flex", flexDirection:"column", gap:16}}>

          {/* ── Stats bar ── */}
          {!loading && rows.length > 0 && (
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <Stat label="إجمالي الطلاب"       value={rows.length}                     color="#fff"/>
              <Stat label="دفع كامل"             value={fullCount}                       color="#34d399"/>
              <Stat label="أقساط"                value={instCount}                       color={C.orange}/>
              <Stat label="أونلاين"              value={onlineCount}                     color={C.purple}/>
              <Stat label="إجمالي الإيرادات"     value={`${totalRevenue.toLocaleString()}`} color="#34d399" sub="EGP"/>
            </div>
          )}

          {/* ── Search + Filters ── */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            {/* Search */}
            <div style={{flex:"1 1 200px",position:"relative"}}>
              <svg style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="ابحث باسم أو إيميل أو تليفون..."
                style={{ width:"100%", padding:"8px 34px 8px 12px", background:"rgba(255,255,255,.07)",
                  border:`1px solid ${C.border}`, borderRadius:9, color:"#fff",
                  fontFamily:font, fontSize:12, outline:"none", boxSizing:"border-box",
                  direction:"rtl" }}
              />
            </div>

            {/* Filter pills */}
            {[
              { key:"filterPlan", val:filterPlan, set:setFilterPlan,
                opts:[{v:"all",l:"كل الدفع"},{v:"full",l:"كامل"},{v:"inst",l:"أقساط"}] },
              { key:"filterType", val:filterType, set:setFilterType,
                opts:[{v:"all",l:"كل الأنواع"},{v:"online",l:"أونلاين"},{v:"offline",l:"حضوري"}] },
            ].map(({ key, val, set: setter, opts }) => (
              <div key={key} style={{display:"flex",gap:4}}>
                {opts.map(o => (
                  <button key={o.v} onClick={()=>setter(o.v)}
                    style={{ padding:"6px 12px", borderRadius:7, fontFamily:font, fontSize:11,
                      fontWeight:600, cursor:"pointer", transition:"all .2s",
                      background: val===o.v ? C.purple : "rgba(255,255,255,.06)",
                      color: val===o.v ? "#fff" : C.muted,
                      border: `1px solid ${val===o.v ? C.purple : C.border}` }}>
                    {o.l}
                  </button>
                ))}
              </div>
            ))}

            {/* Result count */}
            {(search||filterPlan!=="all"||filterType!=="all") && (
              <span style={{fontSize:11,color:C.muted}}>
                {filtered.length} نتيجة
              </span>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{overflowX:"auto",borderRadius:12,border:`1px solid ${C.border}`}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:font,fontSize:12}}>
              <thead>
                <tr style={{background:"linear-gradient(135deg,#2a1540,#3d1f5c)"}}>
                  {COL_DEFS.map(col => (
                    <th key={col.key}
                      onClick={col.sortable ? ()=>handleSort(col.key) : undefined}
                      style={{ padding:"11px 12px", textAlign:"right", color:"#fff",
                        fontWeight:700, fontSize:11, whiteSpace:"nowrap",
                        borderBottom:`1px solid ${C.border}`,
                        cursor:col.sortable?"pointer":"default",
                        userSelect:"none", width:col.w, minWidth:col.w }}>
                      <span style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>
                        {col.label}
                        {col.sortable && <SortIcon col={col.key}/>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={COL_DEFS.length} style={{padding:40,textAlign:"center",color:C.muted}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                        <div style={{width:20,height:20,border:`2px solid ${C.purple}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                        جاري التحميل...
                      </div>
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COL_DEFS.length} style={{padding:40,textAlign:"center",color:C.muted}}>
                      {rows.length === 0
                        ? "لا يوجد طلاب مسجلون في هذا الكورس بعد"
                        : "لا توجد نتائج تطابق البحث"}
                    </td>
                  </tr>
                ) : filtered.map((row, idx) => (
                  <tr key={row.email+idx}
                    style={{ background: idx%2===0 ? "rgba(255,255,255,.02)" : "transparent",
                      transition:"background .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(125,61,158,.12)"}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?"rgba(255,255,255,.02)":"transparent"}>
                    {COL_DEFS.map(col => (
                      <td key={col.key}
                        style={{ padding:"10px 12px", borderBottom:`1px solid rgba(255,255,255,.05)`,
                          verticalAlign:"middle", textAlign:"right" }}>
                        {col.render ? col.render(row, idx) : (row[col.key] || "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer ── */}
          {!loading && rows.length > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              borderTop:`1px solid ${C.border}`,paddingTop:12,flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:11,color:C.muted}}>
                عرض {filtered.length} من {rows.length} طالب
              </span>
              <span style={{fontSize:11,color:C.muted}}>
                آخر تحديث: {new Date().toLocaleTimeString("ar-EG")}
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
