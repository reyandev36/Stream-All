import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MediaPage from './pages/MediaPage';
import PlayerPage from './pages/PlayerPage';
import AdminUpload from './pages/AdminUpload';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, setupNeeded } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (setupNeeded) return <Navigate to="/setup" />;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => {
  const { setupNeeded, user } = useAuth();
  
  return (
    <Routes>
      <Route path="/setup" element={setupNeeded ? <SetupPage /> : <Navigate to="/" />} />
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/media/:id" element={<ProtectedRoute><MediaPage /></ProtectedRoute>} />
      <Route path="/play/:id" element={<ProtectedRoute><PlayerPage /></ProtectedRoute>} />
      <Route path="/admin/upload" element={<ProtectedRoute adminOnly={true}><AdminUpload /></ProtectedRoute>} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-black text-white font-sans">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
