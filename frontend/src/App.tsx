import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Toaster } from 'react-hot-toast';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import IncidentRoomPage from './pages/IncidentRoomPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import IssuesPage from './pages/IssuesPage';
import SmartSearchPage from './pages/SmartSearchPage';
import GrafanaPage from './pages/GrafanaPage';
import UptimePage from './pages/UptimePage';
import AgentSetupPage from './pages/AgentSetupPage';
import OnboardingPage from './pages/OnboardingPage';
import ComingSoonPage from './pages/ComingSoonPage';
import ProfilePage from './pages/ProfilePage';
import UserSetupPage from './pages/UserSetupPage';
import AdminUsersPage from './pages/AdminUsersPage';
import { Layout } from './components/Layout';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(11,5,1,0.95)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              fontFamily: "'Satoshi', sans-serif",
              backdropFilter: 'blur(20px)',
            },
            success: {
              iconTheme: { primary: '#16F456', secondary: '#fff' }
            },
            error: {
              iconTheme: { primary: '#FF4444', secondary: '#fff' }
            }
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/about" element={<ComingSoonPage />} />
          <Route path="/services" element={<ComingSoonPage />} />
          <Route path="/blog" element={<ComingSoonPage />} />
          <Route path="/pricing" element={<ComingSoonPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="rooms/:roomId" element={<IncidentRoomPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="search" element={<SmartSearchPage />} />
            <Route path="grafana" element={<GrafanaPage />} />
            <Route path="uptime" element={<UptimePage />} />
            <Route path="agent-setup" element={<AgentSetupPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="user-setup" element={<UserSetupPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
