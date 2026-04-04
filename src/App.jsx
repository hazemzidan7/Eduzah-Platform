import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";

// Eagerly loaded (always needed)
import Landing from "./pages/public/Landing";
import { LoginPage, RegisterPage } from "./pages/public/Auth";

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
  return (
    <>
      <Navbar />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* ── Public ─────────────────────────── */}
          <Route path="/"           element={<Landing />} />
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

          {/* ── Course Landing + Register ──────── */}
          <Route path="/courses/:slug"          element={<CourseLanding />} />
          <Route path="/courses/:slug/register" element={<CourseRegister />} />

          {/* ── Protected ──────────────────────── */}
          <Route path="/dashboard"  element={<DashboardRouter />} />
          <Route path="/my-courses" element={<RequireAuth><StudentDashboard /></RequireAuth>} />
          <Route path="/profile"    element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/learn/:slug" element={<RequireAuth><CourseViewer /></RequireAuth>} />

          {/* ── Admin ──────────────────────────── */}
          <Route path="/admin/*" element={<RequireAuth roles={["admin"]}><AdminDashboard /></RequireAuth>} />

          {/* ── Instructor ─────────────────────── */}
          <Route path="/instructor/*" element={<RequireAuth roles={["instructor"]}><InstructorDashboard /></RequireAuth>} />

          {/* ── Fallback ───────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
