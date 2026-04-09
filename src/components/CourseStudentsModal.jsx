/**
 * CourseStudentsModal — in-platform student list viewer
 * Features: search, filter, sort, payment confirmation, Excel export
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { C, font } from "../theme";
import { fetchCourseStudents, fmtDate, exportCourseStudents } from "../utils/exportExcel";

// ─── Mini UI helpers ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved:    { label:"مقبول",        bg:"rgba(52,211,153,.15)",  color:"#34d399", dot:"#34d399"  },
  pending:     { label:"قيد المراجعة", bg:"rgba(251,191,36,.15)",  color:"#fbbf24", dot:"#fbbf24"  },
  rejected:    { label:"مرفوض",        bg:"rgba(248,113,113,.15)", color:"#f87171", dot:"#f87171"  },
  "no-account":{ label:"بدون حساب",   bg:"rgba(255,255,255,.07)", color:C.muted,   dot:"rgba(255,255,255,.3)" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG["no-account"];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      background:cfg.bg, color:cfg.color, borderRadius:50,
      padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot, flexShrink:0 }}/>
      {cfg.label}
    </span>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{ display:"inline-block", background:`${color}20`, color,
      border:`1px solid ${color}44`, borderRadius:6,
      padding:"2px 9px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function Stat({ label, value, sub, color="#fff", accent=false }) {
  return (
    <div style={{ background: accent ? "rgba(52,211,153,.08)" : "rgba(255,255,255,.04)",
      border:`1px solid ${accent ? "rgba(52,211,153,.25)" : C.border}`,
      borderRadius:12, padding:"12px 16px", flex:"1 1 110px", minWidth:100 }}>
      <div style={{ fontSize:20, fontWeight:900, color, fontFamily:font }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:1 }}>{sub}</div>}
    </div>
  );
}

// ─── Editable amount cell ─────────────────────────────────────────────────────
function AmountCell({ row, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(row.amount != null ? String(row.amount) : "");

  const commit = () => {
    const num = val.trim() === "" ? null : Number(val);
    if (isNaN(num) && val.trim() !== "") { setEditing(false); return; } // invalid
    setEditing(false);
    if (num !== row.amount) onSave(row, num);
  };

  if (editing) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        <input
          autoFocus
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape") setEditing(false); }}
          style={{
            width:90, padding:"4px 8px", borderRadius:7,
            background:"rgba(255,255,255,.1)", border:`1.5px solid ${C.purple}`,
            color:"#fff", fontFamily:font, fontSize:13, fontWeight:700,
            outline:"none", textAlign:"right",
          }}
        />
        <span style={{ fontSize:10, color:C.muted }}>EGP</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => { if (!saving) setEditing(true); }}
      title="اضغط لتعديل المبلغ"
      style={{
        display:"inline-flex", alignItems:"center", gap:6,
        cursor: saving ? "wait" : "pointer",
        padding:"4px 8px", borderRadius:7,
        border:`1.5px dashed ${row.amount != null ? "rgba(52,211,153,.3)" : "rgba(255,255,255,.18)"}`,
        background: row.amount != null ? "rgba(52,211,153,.06)" : "rgba(255,255,255,.04)",
        transition:"all .15s", minWidth:70,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.background = "rgba(125,61,158,.12)"; }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = row.amount != null ? "rgba(52,211,153,.3)" : "rgba(255,255,255,.18)";
        e.currentTarget.style.background  = row.amount != null ? "rgba(52,211,153,.06)" : "rgba(255,255,255,.04)";
      }}>
      {saving
        ? <span style={{ width:12, height:12, border:"2px solid #34d399", borderTopColor:"transparent",
            borderRadius:"50%", animation:"spin .6s linear infinite", display:"inline-block" }}/>
        : row.amount != null
          ? <span style={{ fontWeight:800, fontSize:13, color:"#34d399" }}>
              {Number(row.amount).toLocaleString()}
              <small style={{ fontSize:10, color:C.muted, fontWeight:400, marginRight:3 }}>EGP</small>
            </span>
          : <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>+ أضف مبلغ</span>
      }
      {!saving && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>}
    </div>
  );
}

// ─── Payment confirm button ───────────────────────────────────────────────────
function PayConfirmBtn({ row, onToggle, loading }) {
  const confirmed = row.paymentConfirmed;
  return (
    <button
      onClick={() => onToggle(row)}
      disabled={loading || !row.docId}
      title={row.docId ? (confirmed ? "إلغاء التأكيد" : "تأكيد استلام الدفع") : "لا يوجد معرف طلب"}
      style={{
        display:"inline-flex", alignItems:"center", gap:5,
        padding:"5px 11px", borderRadius:8, cursor: (loading || !row.docId) ? "not-allowed" : "pointer",
        fontFamily:font, fontWeight:700, fontSize:11,
        transition:"all .2s", border:"none",
        background: confirmed ? "rgba(52,211,153,.18)" : "rgba(255,255,255,.07)",
        color: confirmed ? "#34d399" : C.muted,
        outline: `1.5px solid ${confirmed ? "rgba(52,211,153,.45)" : C.border}`,
        opacity: (loading || !row.docId) ? 0.5 : 1,
      }}>
      {loading
        ? <span style={{ width:12, height:12, border:"2px solid currentColor",
            borderTopColor:"transparent", borderRadius:"50%",
            animation:"spin .6s linear infinite", display:"inline-block" }}/>
        : confirmed ? "✓" : "○"
      }
      {confirmed ? "مؤكد" : "تأكيد"}
    </button>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function CourseStudentsModal({ course, allUsers, onClose }) {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPay,  setFilterPay]  = useState("all"); // all | confirmed | pending
  const [sortCol,    setSortCol]    = useState("requestedAt");
  const [sortDir,    setSortDir]    = useState("desc");
  const [confirming,   setConfirming]   = useState(null); // docId being toggled
  const [savingAmount, setSavingAmount] = useState(null); // docId being saved
  const [exporting,    setExporting]    = useState(false);

  const loadRows = useCallback(() => {
    setLoading(true);
    fetchCourseStudents(course, allUsers)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [course.id]);

  useEffect(() => { loadRows(); }, [loadRows]);

  // ── Toggle payment confirmation ───────────────────────────────────────────
  const handleTogglePay = async (row) => {
    if (!row.docId || confirming) return;
    setConfirming(row.docId);
    const newVal = !row.paymentConfirmed;
    try {
      await updateDoc(doc(db, "enrollmentRequests", row.docId), {
        paymentConfirmed: newVal,
        confirmedAt:      newVal ? new Date().toISOString() : null,
      });
      setRows(prev => prev.map(r =>
        r.docId === row.docId
          ? { ...r, paymentConfirmed: newVal, confirmedAt: newVal ? fmtDate(new Date().toISOString()) : null }
          : r
      ));
    } catch (err) {
      console.error("Payment confirm error:", err);
    } finally {
      setConfirming(null);
    }
  };

  // ── Save manual amount ────────────────────────────────────────────────────
  const handleSaveAmount = async (row, newAmount) => {
    if (!row.docId || savingAmount) return;
    setSavingAmount(row.docId);
    try {
      await updateDoc(doc(db, "enrollmentRequests", row.docId), {
        amountQuoted: newAmount,
      });
      setRows(prev => prev.map(r =>
        r.docId === row.docId ? { ...r, amount: newAmount } : r
      ));
    } catch (err) {
      console.error("Amount save error:", err);
    } finally {
      setSavingAmount(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const confirmedRows    = rows.filter(r => r.paymentConfirmed);
  const pendingPayRows   = rows.filter(r => !r.paymentConfirmed && r.amount != null);
  const confirmedRevenue = confirmedRows.reduce((s,r) => s + (Number(r.amount)||0), 0);
  const pendingRevenue   = pendingPayRows.reduce((s,r) => s + (Number(r.amount)||0), 0);
  const fullCount        = rows.filter(r => r.payPlan.includes("كامل")).length;
  const instCount        = rows.filter(r => r.payPlan.includes("قساط")).length;

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone||"").includes(q)
      );
    }
    if (filterPlan !== "all") out = out.filter(r =>
      filterPlan === "full" ? r.payPlan.includes("كامل") : r.payPlan.includes("قساط")
    );
    if (filterType !== "all") out = out.filter(r =>
      filterType === "online"
        ? r.training.includes("Online")
        : r.training.includes("Offline") || r.training.includes("Branch")
    );
    if (filterPay !== "all") out = out.filter(r =>
      filterPay === "confirmed" ? r.paymentConfirmed : !r.paymentConfirmed
    );
    out.sort((a, b) => {
      const av = String(a[sortCol]||""); const bv = String(b[sortCol]||"");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return out;
  }, [rows, search, filterPlan, filterType, filterPay, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportCourseStudents(course, allUsers); }
    catch(e) { console.error(e); }
    finally { setExporting(false); }
  };

  // ── Column definitions ────────────────────────────────────────────────────
  const COLS = [
    { key:"#", label:"#", w:40,
      render:(_,i) => <span style={{color:C.muted,fontSize:11}}>{i+1}</span> },
    { key:"name", label:"الطالب", w:180, sortable:true,
      render:(r) => (
        <div>
          <div style={{fontWeight:700,fontSize:13,marginBottom:1}}>{r.name}</div>
          <div style={{color:C.muted,fontSize:11}}>{r.email}</div>
        </div>
      )},
    { key:"phone", label:"الهاتف", w:130,
      render:(r) => <span style={{fontFamily:"monospace",fontSize:12}}>{r.phone||"—"}</span> },
    { key:"payPlan", label:"خطة الدفع", w:130,
      render:(r) => {
        const color = r.payPlan.includes("كامل") ? "#34d399" : C.orange;
        return <Pill color={color}>{r.payPlan}</Pill>;
      }},
    { key:"amount", label:"المبلغ ✎", w:140,
      render:(r) => (
        <AmountCell
          row={r}
          onSave={handleSaveAmount}
          saving={savingAmount === r.docId}
        />
      )},

    // ── Payment Confirmation column ───────────────────────────────────────
    { key:"paymentConfirmed", label:"تأكيد الدفع", w:140,
      render:(r) => (
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <PayConfirmBtn
            row={r}
            onToggle={handleTogglePay}
            loading={confirming === r.docId}
          />
          {r.paymentConfirmed && r.confirmedAt && (
            <span style={{fontSize:10,color:"rgba(52,211,153,.6)",marginTop:1}}>
              {r.confirmedAt}
            </span>
          )}
        </div>
      )},

    { key:"training", label:"التدريب", w:120,
      render:(r) => <Pill color={r.training.includes("Online")?C.purple:C.orange}>{r.training}</Pill> },
    { key:"status", label:"الحساب", w:130,
      render:(r) => <StatusBadge status={r.status}/> },
    { key:"progress", label:"التقدم", w:90,
      render:(r) => {
        const num = parseInt(r.progress)||0;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
            <span style={{fontSize:12,fontWeight:700,color:num>=100?"#34d399":num>0?C.orange:C.muted}}>{r.progress}</span>
            {num > 0 && (
              <div style={{width:60,height:4,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden"}}>
                <div style={{width:`${Math.min(num,100)}%`,height:"100%",background:num>=100?"#34d399":C.orange,borderRadius:99}}/>
              </div>
            )}
          </div>
        );
      }},
    { key:"requestedAt", label:"تاريخ الطلب", w:150, sortable:true,
      render:(r) => <span style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{r.requestedAt||r.enrollDate||"—"}</span> },
  ];

  const SortIcon = ({ col }) => sortCol===col
    ? <span style={{fontSize:10,color:C.orange}}>{sortDir==="asc"?"↑":"↓"}</span>
    : <span style={{opacity:.25,fontSize:10}}>↕</span>;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:1200,
          display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:"20px 12px", overflowY:"auto" }}
        onClick={e => { if(e.target===e.currentTarget) onClose(); }}>

        <div style={{ background:"#1a0a2e", border:`1px solid ${C.border}`, borderRadius:20,
          width:"100%", maxWidth:1150, boxShadow:"0 30px 80px rgba(0,0,0,.65)",
          display:"flex", flexDirection:"column" }}
          onClick={e=>e.stopPropagation()}>

          {/* ── Header ── */}
          <div style={{ background:"linear-gradient(135deg,#2a1540,#3d1f5c)",
            borderRadius:"20px 20px 0 0", padding:"18px 22px",
            display:"flex", justifyContent:"space-between", alignItems:"center",
            flexWrap:"wrap", gap:10, borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:3,letterSpacing:1}}>قائمة الطلاب</div>
              <h2 style={{fontFamily:font,fontSize:17,fontWeight:900,margin:0}}>{course.title}</h2>
              {course.title_en && course.title_en!==course.title &&
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>{course.title_en}</div>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={handleExport} disabled={exporting||loading||rows.length===0}
                style={{ display:"flex", alignItems:"center", gap:6,
                  background:"#1D6F42", color:"#fff", border:"none",
                  borderRadius:9, padding:"8px 16px", fontFamily:font,
                  fontWeight:700, fontSize:12, cursor:"pointer",
                  opacity:(exporting||loading||rows.length===0)?.5:1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <polyline points="9 15 12 18 15 15"/>
                </svg>
                {exporting ? "جاري التصدير..." : "تصدير Excel"}
              </button>
              <button onClick={onClose}
                style={{ width:34,height:34,borderRadius:8,background:"rgba(255,255,255,.08)",
                  border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",
                  fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font }}>
                ×
              </button>
            </div>
          </div>

          <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:16}}>

            {/* ── Stats bar ── */}
            {!loading && rows.length > 0 && (
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <Stat label="إجمالي الطلاب"      value={rows.length}/>
                <Stat label="دفع كامل"            value={fullCount}        color="#34d399"/>
                <Stat label="أقساط"               value={instCount}        color={C.orange}/>
                <Stat label="✅ إيرادات مؤكدة"    value={`${confirmedRevenue.toLocaleString()}`}
                      sub="EGP"  color="#34d399" accent={true}/>
                <Stat label="⏳ إيرادات متوقعة"   value={`${pendingRevenue.toLocaleString()}`}
                      sub="EGP"  color={C.orange}/>
                <Stat label="🎯 إجمالي كامل"      value={`${(confirmedRevenue+pendingRevenue).toLocaleString()}`}
                      sub="EGP"  color={C.muted}/>
              </div>
            )}

            {/* ── Filters ── */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              {/* Search */}
              <div style={{flex:"1 1 200px",position:"relative"}}>
                <svg style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="ابحث باسم أو إيميل أو تليفون..."
                  style={{ width:"100%", padding:"8px 34px 8px 12px",
                    background:"rgba(255,255,255,.07)", border:`1px solid ${C.border}`,
                    borderRadius:9, color:"#fff", fontFamily:font, fontSize:12,
                    outline:"none", boxSizing:"border-box", direction:"rtl" }}/>
              </div>

              {/* Filter groups */}
              {[
                { state:filterPlan, set:setFilterPlan,
                  opts:[{v:"all",l:"كل الدفع"},{v:"full",l:"✓ كامل"},{v:"inst",l:"أقساط"}] },
                { state:filterType, set:setFilterType,
                  opts:[{v:"all",l:"كل الأنواع"},{v:"online",l:"أونلاين"},{v:"offline",l:"حضوري"}] },
                { state:filterPay, set:setFilterPay,
                  opts:[{v:"all",l:"كل الحالات"},{v:"confirmed",l:"✅ مؤكد"},{v:"pending",l:"⏳ غير مؤكد"}] },
              ].map((group, gi) => (
                <div key={gi} style={{display:"flex",gap:4}}>
                  {group.opts.map(o => (
                    <button key={o.v} onClick={()=>group.set(o.v)}
                      style={{ padding:"6px 12px", borderRadius:7, fontFamily:font,
                        fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .2s",
                        background: group.state===o.v ? C.purple : "rgba(255,255,255,.06)",
                        color: group.state===o.v ? "#fff" : C.muted,
                        border:`1px solid ${group.state===o.v ? C.purple : C.border}` }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              ))}

              {(search||filterPlan!=="all"||filterType!=="all"||filterPay!=="all") && (
                <span style={{fontSize:11,color:C.muted}}>{filtered.length} نتيجة</span>
              )}
            </div>

            {/* ── Table ── */}
            <div style={{overflowX:"auto",borderRadius:12,border:`1px solid ${C.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontFamily:font,fontSize:12}}>
                <thead>
                  <tr style={{background:"linear-gradient(135deg,#2a1540,#3d1f5c)"}}>
                    {COLS.map(col => (
                      <th key={col.key}
                        onClick={col.sortable ? ()=>toggleSort(col.key) : undefined}
                        style={{ padding:"11px 12px", textAlign:"right", color:"#fff",
                          fontWeight:700, fontSize:11, whiteSpace:"nowrap",
                          borderBottom:`1px solid ${C.border}`,
                          cursor:col.sortable?"pointer":"default",
                          userSelect:"none", minWidth:col.w }}>
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
                      <td colSpan={COLS.length} style={{padding:48,textAlign:"center",color:C.muted}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                          <div style={{width:20,height:20,border:`2px solid ${C.purple}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                          جاري التحميل...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} style={{padding:48,textAlign:"center",color:C.muted}}>
                        {rows.length===0 ? "لا يوجد طلاب مسجلون بعد" : "لا توجد نتائج تطابق البحث"}
                      </td>
                    </tr>
                  ) : filtered.map((row, idx) => {
                    const confirmed = row.paymentConfirmed;
                    return (
                      <tr key={row.email+idx}
                        style={{
                          background: confirmed
                            ? "rgba(52,211,153,.04)"
                            : idx%2===0 ? "rgba(255,255,255,.02)" : "transparent",
                          transition:"background .15s",
                          borderRight: confirmed ? "3px solid rgba(52,211,153,.4)" : "3px solid transparent",
                        }}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(125,61,158,.12)"}
                        onMouseLeave={e=>e.currentTarget.style.background=
                          confirmed ? "rgba(52,211,153,.04)" : idx%2===0?"rgba(255,255,255,.02)":"transparent"}>
                        {COLS.map(col => (
                          <td key={col.key}
                            style={{ padding:"10px 12px",
                              borderBottom:`1px solid rgba(255,255,255,.04)`,
                              verticalAlign:"middle", textAlign:"right" }}>
                            {col.render ? col.render(row,idx) : (row[col.key]||"—")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Footer ── */}
            {!loading && rows.length > 0 && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                borderTop:`1px solid ${C.border}`,paddingTop:12,flexWrap:"wrap",gap:8}}>
                <span style={{fontSize:11,color:C.muted}}>
                  {filtered.length} من {rows.length} طالب · {confirmedRows.length} مؤكد الدفع
                </span>
                <span style={{fontSize:11,color:"rgba(52,211,153,.7)",fontWeight:700}}>
                  إيرادات مؤكدة: {confirmedRevenue.toLocaleString()} EGP
                </span>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
