/**
 * @file App.tsx
 * @description Racine de l'application Konnect Client Portal avec React Router v6 et AuthProvider
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Login } from './components/Login.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { VerifyMagicLink } from './components/VerifyMagicLink.tsx';
import { RefreshCw } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
        <span className="text-xs font-mono">Chargement de la session sécurisée...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
        <span className="text-xs font-mono">Chargement de la session sécurisée...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Validation automatique du Magic Link */}
          <Route path="/verify" element={<VerifyMagicLink />} />

          {/* Connexion sans mot de passe */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          {/* Espace Extranet Protégé */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Redirection des sous-routes non trouvées vers la racine */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
