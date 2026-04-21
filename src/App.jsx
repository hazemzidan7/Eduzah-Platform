import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import GlobalSupportFab from "./components/GlobalSupportFab";
import AccountingGate from "./pages/accounting/AccountingGate";

// Lazy — reduces initial JS for faster LCP on first paint
const Landing = lazy(() => import("./pages/public/Landing"));
const NotFound = lazy(() => import("./pages/public/NotFound"));
const PathQuiz = lazy(() => import("./pages/public/PathQuiz"));

// Lazy loaded — Auth pages are never needed on the initial render
const LoginPage          = lazy(() => import("./pages/public/Auth").then(m => ({ default: m.LoginPage })));
const RegisterPage       = lazy(() => import("./pages/public/Auth").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("./pages/public/Auth").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage  = lazy(() => import("./pages/public/Auth").then(m => ({ default: m.ResetPasswordPage })));
const BootstrapAdmin     = lazy(() => import("./pages/setup/BootstrapAdmin"));
const DevSeed            = lazy(() => import("./pages/setup/DevSeed"));

// Lazy loaded — only downloaded when needed
const CoursesPage        = lazy(() => import("./pages/public/CoursesPage"));
const NewsPage           = lazy(() => import("./pages/public/NewsPage"));
const ServicesPage       = lazy(() => import("./pages/public/ServicesPage"));
const ServiceDetail      = lazy(() => import("./pages/public/ServiceDetail"));
const CorporatePage      = lazy(() => import("./pages/public/CorporatePage"));
const HiringPage         = lazy(() => import("./pages/public/HiringPage"));
const ConsultationPage   = lazy(() => import("./pages/public/ConsultationPage"));
const TeamPage           = lazy(() => import("./pages/public/TeamPage"));

const CourseLanding      = lazy(() => import("./pages/course/CourseLanding"));
const CourseRegister     = lazy(() => import("./pages/course/CourseRegister"));

const StudentDashboard   = lazy(() => import("./pages/student/StudentDashboard"));
const CourseViewer       = lazy(() => import("./pages/student/CourseViewer"));
const ExamPage           = lazy(() => import("./pages/student/ExamPage"));
const CertificatePage    = lazy(() => import("./pages/student/CertificatePage"));
const ProfilePage        = lazy(() => import("./pages/student/ProfilePage"));

const AdminDashboard     = lazy(() => import("./pages/admin/AdminDashboard"));
const InstructorDashboard = lazy(() => import("./pages/instructor/InstructorDashboard"));

const Loader = () => (
  <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 36, height: 36, border: "3px solid rgba(217,27,91,.3)", borderTopColor: "#d91b5b", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function RequireAuth({ children, roles }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardRouter() {
  const { currentUser } = useAuth();
  if (!currentUser)                      return <Navigate to="/login" replace />;
  if (currentUser.role === "admin")      return <AdminDashboard />;
  if (currentUser.role === "instructor") return <InstructorDashboard />;
  return <StudentDashboard />;
}

export default function App() {
  const location = useLocation();
  const isAccounting = location.pathname.startsWith("/accounting");

  // Accounting module is fully isolated — no Navbar, no Fab, no main wrapper
  if (isAccounting) {
    return (
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/accounting/*" element={<AccountingGate />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        style={{
          position: "absolute",
          left: 8,
          top: 8,
          zIndex: 9999,
          padding: "8px 14px",
          background: "#d91b5b",
          color: "#fff",
          fontWeight: 800,
          fontSize: 12,
          borderRadius: 8,
          textDecoration: "none",
          transform: "translateY(-120%)",
          transition: "transform .2s",
        }}
        className="skip-to-content"
      >
        Skip to content
      </a>
      <header style={{ background: "#ffffff" }}>
        <Navbar />
      </header>
      <main id="main-content" tabIndex={-1} style={{ paddingTop: 64, minHeight: "calc(100vh - 64px)", background: "var(--page-bg)", color: "var(--page-text)" }}>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* ── Public ─────────────────────────── */}
          <Route path="/"           element={<Landing />} />
          <Route path="/find-path" element={<PathQuiz />} />
          <Route path="/courses"    element={<CoursesPage />} />
          <Route path="/news"       element={<NewsPage />} />
          <Route path="/services"   element={<ServicesPage />} />
          <Route path="/corporate"  element={<CorporatePage />} />
          <Route path="/hiring"     element={<HiringPage />} />
          <Route path="/consultation" element={<ConsultationPage />} />
          <Route path="/team"       element={<TeamPage />} />

          {/* ── Service Detail Pages ──────────── */}
          <Route path="/services/:slug" element={<ServiceDetail />} />

          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/setup-admin" element={<BootstrapAdmin />} />
          <Route path="/dev-seed"   element={<DevSeed />} />

          {/* ── Course Landing + Register ──────── */}
          <Route path="/courses/:slug"          element={<CourseLanding />} />
          <Route path="/courses/:slug/register" element={<CourseRegister />} />

          {/* ── Protected ──────────────────────── */}
          <Route path="/dashboard"  element={<DashboardRouter />} />
          <Route path="/my-courses" element={<RequireAuth><StudentDashboard /></RequireAuth>} />
          <Route path="/profile"    element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/learn/:slug" element={<RequireAuth><CourseViewer /></RequireAuth>} />
          <Route path="/exam/:examId" element={<RequireAuth><ExamPage /></RequireAuth>} />
          <Route path="/certificate/:slug" element={<RequireAuth><CertificatePage /></RequireAuth>} />

          {/* ── Admin ──────────────────────────── */}
          <Route path="/admin/*" element={<RequireAuth roles={["admin"]}><AdminDashboard /></RequireAuth>} />

          {/* ── Instructor ─────────────────────── */}
          <Route path="/instructor/*" element={<RequireAuth roles={["instructor"]}><InstructorDashboard /></RequireAuth>} />

          {/* ── Fallback ───────────────────────── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </main>
      <GlobalSupportFab />
    </>
  );
}
