import "@/App.css";
import "@/index.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import Register from "@/pages/Register";
import AppLayout from "@/components/AppLayout";
import StudentDashboard from "@/pages/student/Dashboard";
import StudentBatches from "@/pages/student/Batches";
import BatchDetail from "@/pages/student/BatchDetail";
import SubjectDetail from "@/pages/student/SubjectDetail";
import ChapterDetail from "@/pages/student/ChapterDetail";
import VideoPlayer from "@/pages/student/VideoPlayer";
import LiveClasses from "@/pages/student/LiveClasses";
import TestPage from "@/pages/student/TestPage";
import TestResult from "@/pages/student/TestResult";
import RecentlyViewed from "@/pages/student/RecentlyViewed";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminBatches from "@/pages/admin/Batches";
import AdminSubjects from "@/pages/admin/Subjects";
import AdminChapters from "@/pages/admin/Chapters";
import AdminVideos from "@/pages/admin/Videos";
import AdminNotes from "@/pages/admin/Notes";
import AdminTests from "@/pages/admin/Tests";
import AdminTestEditor from "@/pages/admin/TestEditor";
import AdminLiveClasses from "@/pages/admin/LiveClasses";
import AdminStudents from "@/pages/admin/Students";

function Guard({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-400">
        <div data-testid="loading-state">Loading…</div>
      </div>
    );
  }
  const onAdminPath = location.pathname.startsWith("/admin");
  if (!user) return <Navigate to={onAdminPath ? "/admin-login" : "/login"} replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user === null) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function App() {
  useEffect(() => {
    // App-wide content protection
    const isInteractiveTarget = (el) => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };
    const onContext = (e) => {
      if (!isInteractiveTarget(e.target)) e.preventDefault();
    };
    const onDragStart = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "img" || tag === "video" || tag === "iframe") e.preventDefault();
    };
    const onKey = (e) => {
      // Block save (Ctrl/Cmd+S), select-all on the page (allow inside inputs), and view-source shortcuts
      const k = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s", "p"].includes(k)) {
        if (!isInteractiveTarget(e.target)) e.preventDefault();
      }
      // Block F12 / DevTools-ish keys is unreliable across browsers; intentionally NOT trying to block DevTools
    };

    // Block any same-origin attempt to open youtube.com URLs in a new tab.
    // Note: cross-origin iframe popups (YouTube's own logo click) can NOT be intercepted by us;
    // this is a defense layer for our own anchors and any wrapper code.
    const isYouTubeUrl = (u) => {
      try {
        const host = new URL(u, window.location.origin).hostname.toLowerCase();
        return host.endsWith("youtube.com") || host.endsWith("youtu.be") || host.endsWith("youtube-nocookie.com");
      } catch { return false; }
    };
    const origOpen = window.open;
    window.open = function patchedOpen(url, ...rest) {
      if (typeof url === "string" && isYouTubeUrl(url)) return null;
      return origOpen.call(window, url, ...rest);
    };
    const onClickCapture = (e) => {
      // Stop our own anchors that point to youtube.com from navigating
      let el = e.target;
      while (el && el !== document.body) {
        if (el.tagName === "A" && el.href && isYouTubeUrl(el.href)) {
          e.preventDefault(); e.stopPropagation();
          return;
        }
        el = el.parentElement;
      }
    };

    document.addEventListener("contextmenu", onContext, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("contextmenu", onContext, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClickCapture, true);
      window.open = origOpen;
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />

          {/* Student */}
          <Route element={<Guard role="student"><AppLayout /></Guard>}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/batches" element={<StudentBatches />} />
            <Route path="/batches/:batchId" element={<BatchDetail />} />
            <Route path="/subjects/:subjectId" element={<SubjectDetail />} />
            <Route path="/chapters/:chapterId" element={<ChapterDetail />} />
            <Route path="/videos/:videoId" element={<VideoPlayer />} />
            <Route path="/live-classes" element={<LiveClasses />} />
            <Route path="/recent" element={<RecentlyViewed />} />
            <Route path="/tests/:testId" element={<TestPage />} />
            <Route path="/tests/:testId/result" element={<TestResult />} />
          </Route>

          {/* Admin */}
          <Route element={<Guard role="admin"><AppLayout /></Guard>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/batches" element={<AdminBatches />} />
            <Route path="/admin/subjects" element={<AdminSubjects />} />
            <Route path="/admin/chapters" element={<AdminChapters />} />
            <Route path="/admin/videos" element={<AdminVideos />} />
            <Route path="/admin/notes" element={<AdminNotes />} />
            <Route path="/admin/tests" element={<AdminTests />} />
            <Route path="/admin/tests/:testId/edit" element={<AdminTestEditor />} />
            <Route path="/admin/tests/new" element={<AdminTestEditor />} />
            <Route path="/admin/live-classes" element={<AdminLiveClasses />} />
            <Route path="/admin/students" element={<AdminStudents />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
