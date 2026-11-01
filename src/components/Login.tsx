/**
 * @file Login.tsx
 * @description Page de connexion My Konnect pour Clients et Administrateurs
 * Propose deux méthodes d'authentification :
 * 1. Identifiants classiques (Email / Identifiant + Mot de passe sécurisé bcrypt)
 * 2. Lien magique (Magic Link sécurisé à usage unique)
 * Interface sobre, professionnelle, exempte de superflu.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types/index.ts';
import { MattKonnectLogo } from './MattKonnectLogo.tsx';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Inbox,
  CheckCircle2,
  Shield,
  UserCheck,
} from 'lucide-react';

interface SentEmailItem {
  id: string;
  to: string;
  subject: string;
  sentAt: string;
  magicLinkUrl?: string;
}

export const Login: React.FC = () => {
  const { loginWithPassword, requestMagicLink, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Rôle sélectionné : 'client' ou 'admin'
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');

  // Méthode de connexion : 'password' (par défaut) ou 'magic_link'
  const [authMethod, setAuthMethod] = useState<'password' | 'magic_link'>('password');

  // Champs de saisie
  const [email, setEmail] = useState<string>('Matt4Daemon@gmail.com');
  const [password, setPassword] = useState<string>('Client2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // États de soumission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Tiroir simulateur emails dev
  const [inboxEmails, setInboxEmails] = useState<SentEmailItem[]>([]);
  const [showInboxModal, setShowInboxModal] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Décompte de temporisation
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Basculer vers le rôle Client
  const switchToClient = () => {
    setSelectedRole('client');
    setEmail('Matt4Daemon@gmail.com');
    setPassword('Client2026!');
    setMagicLinkSent(false);
    clearError();
  };

  // Basculer vers le rôle Administrateur
  const switchToAdmin = () => {
    setSelectedRole('admin');
    setEmail('admin@mykonnect.fr');
    setPassword('Admin2026!');
    setMagicLinkSent(false);
    clearError();
  };

  const fetchInbox = async () => {
    try {
      const res = await fetch('/api/auth/dev-inbox');
      if (res.ok) {
        const data = await res.json();
        setInboxEmails(data.emails || []);
      }
    } catch {
      // Ignorer
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    clearError();
    setIsSubmitting(true);

    try {
      if (authMethod === 'password') {
        const success = await loginWithPassword(email.trim(), password, selectedRole);
        if (success) {
          navigate('/', { replace: true });
        }
      } else {
        // Envoi Magic Link
        const res = await requestMagicLink(email.trim(), selectedRole);
        setMagicLinkSent(true);
        setCooldown(45);
        if (res.previewUrl) {
          setPreviewLink(res.previewUrl);
        }
        fetchInbox();
      }
    } catch {
      // Les erreurs sont propagées dans error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-slate-800 selection:text-white">
      {/* Top Bar Sobre - My Konnect */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <MattKonnectLogo size="md" showSubtitle={true} />

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => {
                fetchInbox();
                setShowInboxModal(true);
              }}
              className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
              title="Inspecter les Magic Links envoyés"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Boîte de réception test</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Carte Principale de Connexion */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 sm:p-8 shadow-xl space-y-6">
            {/* Sélecteur de profil Client / Administrateur */}
            <div className="flex p-1 bg-slate-950 rounded border border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={switchToClient}
                className={`flex-1 py-2 rounded text-center transition-colors flex items-center justify-center gap-2 ${
                  selectedRole === 'client'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Espace Client</span>
              </button>

              <button
                type="button"
                onClick={switchToAdmin}
                className={`flex-1 py-2 rounded text-center transition-colors flex items-center justify-center gap-2 ${
                  selectedRole === 'admin'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administration</span>
              </button>
            </div>

            {/* Titre & Sous-titre sobre */}
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {selectedRole === 'admin' ? 'Connexion Administrateur' : 'Connexion Espace Client'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {selectedRole === 'admin'
                  ? 'Gestion des comptes, projets, documents et support My Konnect'
                  : 'Consultez vos projets, audits, livrables et factures'}
              </p>
            </div>

            {/* Choix de la méthode d'authentification */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password');
                  setMagicLinkSent(false);
                  clearError();
                }}
                className={`pb-2.5 px-3 font-medium transition-colors ${
                  authMethod === 'password'
                    ? 'text-white border-b-2 border-sky-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mot de passe
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('magic_link');
                  setMagicLinkSent(false);
                  clearError();
                }}
                className={`pb-2.5 px-3 font-medium transition-colors ${
                  authMethod === 'magic_link'
                    ? 'text-white border-b-2 border-sky-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lien magique
              </button>
            </div>

            {/* Affichage d'erreur éventuelle */}
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulaire : Méthode 1 - Identifiants & Mot de passe */}
            {authMethod === 'password' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Identifiant / Adresse email
                  </label>
                  <div className="relative">
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@entreprise.fr"
                      disabled={isSubmitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-pwd" className="block text-xs font-medium text-slate-300">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMethod('magic_link')}
                      className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-pwd"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      disabled={isSubmitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Bouton de soumission */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || !password}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-white text-slate-950 hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Se connecter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Formulaire : Méthode 2 - Lien Magique sans mot de passe */}
            {authMethod === 'magic_link' && (
              <div className="space-y-4">
                {magicLinkSent ? (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/60 rounded text-xs text-emerald-200 space-y-1.5">
                      <div className="flex items-center gap-2 font-semibold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Lien magique envoyé !
                      </div>
                      <p className="text-emerald-300/80 leading-relaxed">
                        Un lien de connexion valable 15 minutes a été expédié à <strong className="text-white font-mono">{email}</strong>.
                      </p>
                    </div>

                    {previewLink && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="font-medium text-slate-300 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Accès direct immédiat (Sandbox) :
                          </span>
                        </div>
                        <a
                          href={previewLink}
                          className="inline-flex items-center justify-center w-full gap-2 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors"
                        >
                          <span>Valider la connexion</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setMagicLinkSent(false)}
                        className="text-slate-400 hover:text-white underline underline-offset-4"
                      >
                        Changer d'adresse
                      </button>

                      {cooldown > 0 ? (
                        <span className="text-slate-500 tabular-nums">
                          Renvoyer ({cooldown}s)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="text-sky-400 hover:text-sky-300 font-medium"
                        >
                          Renvoyer le lien
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="magic-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Adresse email professionnelle
                      </label>
                      <input
                        id="magic-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@entreprise.fr"
                        disabled={isSubmitting}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Vous recevrez un email contenant un lien sécurisé à usage unique pour vous connecter sans mot de passe.
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting || !email.trim() || cooldown > 0}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-white text-slate-950 hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Génération du jeton...</span>
                        </>
                      ) : (
                        <>
                          <span>Recevoir mon lien magique</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Raccourcis de test préremplis (discrets) */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-500 mb-2 font-medium">Comptes de test préconfigurés :</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={switchToClient}
                  className={`p-2 rounded border text-left transition-colors ${
                    selectedRole === 'client'
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-200">Client Démo</div>
                  <div className="text-slate-500 truncate">Matt4Daemon@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={switchToAdmin}
                  className={`p-2 rounded border text-left transition-colors ${
                    selectedRole === 'admin'
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-200">Admin Démo</div>
                  <div className="text-slate-500 truncate">admin@mykonnect.fr</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer sobre et minimaliste */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            &copy; {new Date().getFullYear()} My Konnect · Tous droits réservés
          </div>
          <div className="flex items-center gap-4">
            <span>Confidentialité</span>
            <span>·</span>
            <span>Sécurité</span>
            <span>·</span>
            <span>Support</span>
          </div>
        </div>
      </footer>

      {/* Modal Boîte de réception test (Sandbox) */}
      {showInboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Inbox className="w-4 h-4 text-sky-400" />
                <span>Simulateur d'emails sortants</span>
              </div>
              <button
                onClick={() => setShowInboxModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                Fermer
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {inboxEmails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
                  Aucun email n'a encore été envoyé.
                </div>
              ) : (
                inboxEmails.map((mail) => (
                  <div key={mail.id} className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{mail.to}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(mail.sentAt).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <div className="text-slate-400">{mail.subject}</div>

                    {mail.magicLinkUrl && (
                      <div className="pt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-sky-400 font-mono truncate max-w-[240px]">
                          {mail.magicLinkUrl}
                        </span>
                        <a
                          href={mail.magicLinkUrl}
                          className="px-2.5 py-1 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded whitespace-nowrap shrink-0 transition-colors"
                        >
                          Valider
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={fetchInbox}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
