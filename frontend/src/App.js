import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
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
  if (user === null) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-400">
        <div data-testid="loading-state">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user === null) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
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
