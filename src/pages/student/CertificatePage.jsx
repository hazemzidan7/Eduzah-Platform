import { useParams, useNavigate } from "react-router-dom";
import { C, font } from "../../theme";
import { Btn } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

export default function CertificatePage() {
  const { slug }  = useParams();
  const navigate  = useNavigate();
  const { currentUser } = useAuth();
  const { courses } = useData();
  const { lang } = useLang();
  const ar = lang === "ar";

  const course = courses.find(c => (c.slug || c.id) === slug);
  const enroll = currentUser?.enrolledCourses?.find(e => e.courseId === course?.id);
  const done   = (enroll?.progress || 0) >= 100;

  const print = () => window.print();

  if (!course || !enroll || !done) {
    return (
      <div dir={ar ? "rtl" : "ltr"} style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ color: C.muted, fontSize: 15 }}>
          {ar ? "الشهادة متاحة فقط بعد إتمام الكورس 100%" : "Certificate available only after 100% course completion"}
        </div>
        <Btn children={ar ? "← رجوع" : "← Back"} onClick={() => navigate("/dashboard")} />
      </div>
    );
  }

  const date = enroll?.enrollDate || new Date().toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div dir={ar ? "rtl" : "ltr"} style={{ minHeight: "calc(100vh - 60px)", background: "linear-gradient(135deg,#1a0f24,#2a1540)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 16px" }}>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" }} className="no-print">
        <Btn children={ar ? "طباعة / تحميل PDF" : "Print / Save PDF"} onClick={print} />
        <Btn children={ar ? "← رجوع" : "← Back"} v="ghost" onClick={() => navigate("/dashboard")} style={{ color: "#fff" }} />
      </div>

      {/* Certificate */}
      <div id="certificate" style={{
        background: "#fff",
        color: "#1a1a2e",
        width: "100%",
        maxWidth: 780,
        borderRadius: 20,
        padding: "50px 60px",
        textAlign: "center",
        position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        border: "10px solid #d91b5b",
        outline: "3px solid #faa633",
        outlineOffset: "-18px",
      }}>
        {/* Top decorative line */}
        <div style={{ width: 80, height: 4, background: `linear-gradient(90deg,${C.red},${C.orange})`, margin: "0 auto 28px", borderRadius: 2 }} />

        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 8, textTransform: "uppercase" }}>
          {ar ? "شركة إيدوزا للتدريب الاحترافي" : "Eduzah Professional Training"}
        </div>

        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: font, color: "#1a1a2e", marginBottom: 6 }}>
          {ar ? "شهادة إتمام" : "Certificate of Completion"}
        </div>

        <div style={{ width: 60, height: 2, background: "#e5e7eb", margin: "16px auto" }} />

        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
          {ar ? "يُشهد بأن" : "This is to certify that"}
        </div>

        <div style={{ fontSize: 32, fontWeight: 900, color: C.red, fontFamily: font, marginBottom: 12 }}>
          {currentUser?.name}
        </div>

        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
          {ar ? "قد أتم بنجاح كورس" : "has successfully completed the course"}
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", margin: "8px 0 20px", padding: "12px 20px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          {course.title}
        </div>

        {course.instructor && (
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            {ar ? "بإشراف المدرب:" : "Instructor:"} <strong style={{ color: "#1a1a2e" }}>{course.instructor}</strong>
          </div>
        )}

        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 28 }}>
          {ar ? "تاريخ الإصدار:" : "Issued:"} <strong>{date}</strong>
        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px solid #e5e7eb", paddingTop: 24, flexWrap: "wrap", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: font, color: C.red, marginBottom: 4 }}>Eduzah</div>
            <div style={{ width: 100, height: 1, background: "#e5e7eb", margin: "0 auto 4px" }} />
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{ar ? "المدير التنفيذي" : "CEO"}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>
              {`EDZ-${(course.slug || course.id || "").toUpperCase()}-${currentUser?.id?.slice(-4).toUpperCase()}`}
            </div>
            <div style={{ width: 100, height: 1, background: "#e5e7eb", margin: "0 auto 4px" }} />
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{ar ? "رقم الشهادة" : "Certificate ID"}</div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ marginTop: 20, fontSize: 11, color: "#9ca3af" }}>
          eduzah.com · {ar ? "جميع الحقوق محفوظة" : "All rights reserved"}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #certificate { box-shadow: none; border-radius: 0; max-width: 100%; }
        }
      `}</style>
    </div>
  );
}
