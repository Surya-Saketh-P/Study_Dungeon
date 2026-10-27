import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CreateDungeonPage from './pages/CreateDungeonPage';
import DungeonMapPage from './pages/DungeonMapPage';
import BattlePage from './pages/BattlePage';
import SummaryPage from './pages/SummaryPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        Authenticating adventurer...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1, paddingBottom: '3rem' }}>
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateDungeonPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dungeon/:id"
                element={
                  <ProtectedRoute>
                    <DungeonMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/run/:runId"
                element={
                  <ProtectedRoute>
                    <BattlePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/run/:runId/summary"
                element={
                  <ProtectedRoute>
                    <SummaryPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
