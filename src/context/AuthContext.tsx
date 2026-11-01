/**
 * @file AuthContext.tsx
 * @description Contexte d'authentification pour My Konnect
 * Gère la connexion unifiée (Identifiant/Mot de passe ou Magic Link),
 * l'inscription client directe, et la session sécurisée (Cookie HTTP-Only + Bearer Token).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SessionUser, AuthState } from '../types/index.ts';
import { apiFetch, setStoredToken } from '../utils/api.ts';

interface RegisterData {
  name: string;
  companyName: string;
  email: string;
  password: string;
}

interface AuthContextType extends AuthState {
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<boolean>;
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
      const res = await apiFetch('/api/auth/me');

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        setStoredToken(null);
      }
    } catch (err) {
      console.error('[AuthContext] Erreur vérification session:', err);
      setUser(null);
      setStoredToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Connexion unifiée par Identifiant (email) et Mot de passe (pour client ET admin)
  const loginWithPassword = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Identifiant ou mot de passe incorrect.';
        setError(errMsg);
        setUser(null);
        setStoredToken(null);
        return false;
      }

      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion au serveur.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Création / Inscription directe d'un compte client
  const register = async (regData: RegisterData): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Erreur lors de la création du compte.';
        setError(errMsg);
        return false;
      }

      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau lors de la création du compte.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Demander un Magic Link
  const requestMagicLink = async (email: string) => {
    setError(null);
    try {
      const res = await apiFetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
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
      const res = await apiFetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ce lien de connexion est invalide ou a expiré.');
        setUser(null);
        setStoredToken(null);
        return false;
      }

      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return true;
    } catch {
      setError('Erreur réseau lors de la vérification du lien.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Changement de mot de passe (notamment lors de la 1ère connexion)
  const changePassword = async (newPassword: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors du changement de mot de passe');
        return false;
      }

      if (data.user) {
        setUser(data.user);
      }
      return true;
    } catch {
      setError('Erreur réseau lors du changement de mot de passe');
      return false;
    }
  };

  // Déconnexion
  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[AuthContext] Erreur logout:', err);
    } finally {
      setStoredToken(null);
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
        loginWithPassword,
        register,
        changePassword,
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
