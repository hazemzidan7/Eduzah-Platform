import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";

// Public pages
import Landing       from "./pages/public/Landing";
import CoursesPage   from "./pages/public/CoursesPage";
import NewsPage      from "./pages/public/NewsPage";
import ServicesPage  from "./pages/public/ServicesPage";
import ServiceDetail from "./pages/public/ServiceDetail";
import CorporatePage     from "./pages/public/CorporatePage";
import HiringPage        from "./pages/public/HiringPage";
import ConsultationPage  from "./pages/public/ConsultationPage";
import { LoginPage, RegisterPage } from "./pages/public/Auth";
import TeamPage from "./pages/public/TeamPage";

// Course marketing pages
import CourseLanding  from "./pages/course/CourseLanding";
import CourseRegister from "./pages/course/CourseRegister";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import CourseViewer     from "./pages/student/CourseViewer";
import ProfilePage      from "./pages/student/ProfilePage";

// Admin & Instructor
import AdminDashboard      from "./pages/admin/AdminDashboard";
import InstructorDashboard from "./pages/instructor/InstructorDashboard";

function RequireAuth({ children, roles }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardRouter() {
  const { currentUser } = useAuth();
  if (!currentUser)                        return <Navigate to="/login" replace />;
  if (currentUser.role === "admin")        return <AdminDashboard />;
  if (currentUser.role === "instructor")   return <InstructorDashboard />;
  return <StudentDashboard />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* ── Public ─────────────────────────── */}
        <Route path="/"           element={<Landing />} />
        <Route path="/courses"    element={<CoursesPage />} />
        <Route path="/news"       element={<NewsPage />} />
        <Route path="/services"   element={<ServicesPage />} />
        <Route path="/corporate"    element={<CorporatePage />} />
        <Route path="/hiring"       element={<HiringPage />} />
        <Route path="/consultation" element={<ConsultationPage />} />

        {/* ── Service Detail Pages ──────────── */}
        <Route path="/services/:slug" element={<ServiceDetail />} />

        <Route path="/team"     element={<TeamPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Course Landing + Register ──────── */}
        <Route path="/courses/:slug"          element={<CourseLanding />} />
        <Route path="/courses/:slug/register" element={<CourseRegister />} />

        {/* ── Protected ──────────────────────── */}
        <Route path="/dashboard"   element={<DashboardRouter />} />
        <Route path="/my-courses"  element={<RequireAuth><StudentDashboard /></RequireAuth>} />
        <Route path="/profile"     element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/learn/:slug" element={<RequireAuth><CourseViewer /></RequireAuth>} />

        {/* ── Admin ──────────────────────────── */}
        <Route path="/admin/*" element={<RequireAuth roles={["admin"]}><AdminDashboard /></RequireAuth>} />

        {/* ── Instructor ─────────────────────── */}
        <Route path="/instructor/*" element={<RequireAuth roles={["instructor"]}><InstructorDashboard /></RequireAuth>} />

        {/* ── Fallback ───────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
