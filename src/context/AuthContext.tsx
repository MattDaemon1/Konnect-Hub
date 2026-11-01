/**
 * @file AuthContext.tsx
 * @description Contexte d'authentification React sécurisé sans stockage en localStorage
 * Toutes les sessions reposent sur le cookie HTTP-Only géré par le navigateur.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SessionUser, AuthState } from '../types/index.ts';

interface AuthContextType extends AuthState {
  requestMagicLink: (email: string) => Promise<{ success: boolean; message: string; previewUrl?: string; simulated?: boolean }>;
  verifyToken: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Vérifier la session active au chargement
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/auth/me', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include', // Envoie le cookie HTTP-Only konnect_session
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Erreur vérification session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Demander un Magic Link
  const requestMagicLink = async (email: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Impossible d\'envoyer le lien de connexion.';
        setError(errMsg);
        throw new Error(errMsg);
      }

      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(msg);
      throw err;
    }
  };

  // Valider le jeton Magic Link
  const verifyToken = async (token: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ token }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ce lien de connexion est invalide ou a expiré.');
        setUser(null);
        return false;
      }

      setUser(data.user);
      return true;
    } catch (err) {
      setError('Erreur réseau lors de la vérification du lien.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Déconnexion
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[AuthContext] Erreur logout:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        error,
        requestMagicLink,
        verifyToken,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
