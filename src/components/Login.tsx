/**
 * @file Login.tsx
 * @description Page de connexion UNIQUE My Konnect (Clients & Administrateurs réunis)
 * - 1 SEUL formulaire de connexion universel (pas de séparation artificielle client/admin)
 * - Détection automatique du rôle (client ou admin) à la connexion
 * - Deux méthodes d'authentification : Identifiants & Mot de passe OU Lien magique (Magic Link)
 * - Formulaire intégré de création de compte client (inscription directe sans session préalable)
 * - Logo officiel Matt Konnect (mattkonnect.com)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import { MattKonnectLogo } from './MattKonnectLogo.tsx';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Inbox,
  CheckCircle2,
  UserPlus,
  LogIn,
} from 'lucide-react';

interface SentEmailItem {
  id: string;
  to: string;
  subject: string;
  sentAt: string;
  magicLinkUrl?: string;
}

type AuthMode = 'login' | 'register';
type LoginMethod = 'password' | 'magic_link';

export const Login: React.FC = () => {
  const { loginWithPassword, register, requestMagicLink, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Mode principal : Connexion ou Inscription (Créer un compte)
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Méthode de connexion : Mot de passe ou Lien magique
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');

  // Champs de connexion
  const [email, setEmail] = useState<string>('Matt4Daemon@gmail.com');
  const [password, setPassword] = useState<string>('Client2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Champs d'inscription (Créer un compte client)
  const [regName, setRegName] = useState<string>('');
  const [regCompany, setRegCompany] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

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

  // Décompte de temporisation Magic Link
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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

  // Soumission du formulaire unique de connexion
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    clearError();
    setIsSubmitting(true);

    try {
      if (loginMethod === 'password') {
        const success = await loginWithPassword(email.trim(), password);
        if (success) {
          navigate('/', { replace: true });
        }
      } else {
        // Envoi Magic Link
        const res = await requestMagicLink(email.trim());
        setMagicLinkSent(true);
        setCooldown(45);
        if (res.previewUrl) {
          setPreviewLink(res.previewUrl);
        }
        fetchInbox();
      }
    } catch {
      // L'erreur est gérée dans AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soumission de la création directe de compte client (sans session requise !)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regCompany.trim() || !regEmail.trim() || !regPassword || isSubmitting) {
      return;
    }

    clearError();
    setIsSubmitting(true);

    try {
      const success = await register({
        name: regName.trim(),
        companyName: regCompany.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });

      if (success) {
        navigate('/', { replace: true });
      }
    } catch {
      // L'erreur est gérée dans AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // Raccourcis de pré-remplissage rapide pour tests
  const fillTestCredentials = (testEmail: string, testPass: string) => {
    setAuthMode('login');
    setLoginMethod('password');
    setEmail(testEmail);
    setPassword(testPass);
    setMagicLinkSent(false);
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-slate-800 selection:text-white">
      {/* Barre supérieure épurée */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <MattKonnectLogo size="md" showSubtitle={true} />

          <button
            onClick={() => {
              fetchInbox();
              setShowInboxModal(true);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            title="Inspecter les emails et tokens Magic Link sortants"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Boîte de réception test</span>
          </button>
        </div>
      </header>

      {/* Zone centrale */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Carte Unique */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 sm:p-8 shadow-xl space-y-6">
            {/* Titre & Sous-titre sobre */}
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {authMode === 'login' ? 'Connexion' : 'Créer un compte'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {authMode === 'login'
                  ? 'Accédez à votre espace sécurisé My Konnect (Client ou Administrateur)'
                  : 'Renseignez vos coordonnées pour accéder à votre portail client'}
              </p>
            </div>

            {/* Affichage d'erreur éventuelle */}
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* ============================================================= */}
            {/* VUE 1 : FORMULAIRE UNIQUE DE CONNEXION (CLIENT & ADMIN RÉUNIS) */}
            {/* ============================================================= */}
            {authMode === 'login' && (
              <div className="space-y-4">
                {/* Méthode d'authentification : Mot de passe ou Lien magique */}
                <div className="flex border-b border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setMagicLinkSent(false);
                      clearError();
                    }}
                    className={`pb-2.5 px-3 font-medium transition-colors ${
                      loginMethod === 'password'
                        ? 'text-white border-b-2 border-sky-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mot de passe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('magic_link');
                      setMagicLinkSent(false);
                      clearError();
                    }}
                    className={`pb-2.5 px-3 font-medium transition-colors ${
                      loginMethod === 'magic_link'
                        ? 'text-white border-b-2 border-sky-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Lien magique
                  </button>
                </div>

                {/* Option 1A : Connexion par Identifiant / Mot de passe */}
                {loginMethod === 'password' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="login-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Identifiant / Adresse email
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@entreprise.fr ou admin@mykonnect.fr"
                        disabled={isSubmitting}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="login-pwd" className="block text-xs font-medium text-slate-300">
                          Mot de passe
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginMethod('magic_link');
                            clearError();
                          }}
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

                {/* Option 1B : Connexion sans mot de passe par Lien Magique */}
                {loginMethod === 'magic_link' && (
                  <div className="space-y-4">
                    {magicLinkSent ? (
                      <div className="space-y-4">
                        <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/60 rounded text-xs text-emerald-200 space-y-1.5">
                          <div className="flex items-center gap-2 font-semibold text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Lien magique envoyé !
                          </div>
                          <p className="text-emerald-300/80 leading-relaxed">
                            Un lien de connexion valable 15 minutes a été envoyé à <strong className="text-white font-mono">{email}</strong>.
                          </p>
                        </div>

                        {previewLink && (
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-2">
                            <span className="font-medium text-slate-300 flex items-center gap-1.5 text-[11px]">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              Accès direct immédiat (Sandbox) :
                            </span>
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
                              onClick={handleLoginSubmit}
                              className="text-sky-400 hover:text-sky-300 font-medium"
                            >
                              Renvoyer le lien
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="magic-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                            Adresse email du compte
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
                              <span>Génération du lien...</span>
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

                {/* Bascule vers Créer un compte */}
                <div className="pt-3 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      clearError();
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Pas encore de compte ? <strong className="text-sky-400 font-medium underline underline-offset-2">Créer un compte</strong></span>
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* VUE 2 : CRÉATION DIRECTE DE COMPTE CLIENT (SANS SESSION REQUISE) */}
            {/* ============================================================= */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-medium text-slate-300 mb-1">
                    Nom & Prénom du contact
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Jean Dupont"
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="reg-company" className="block text-xs font-medium text-slate-300 mb-1">
                    Société / Raison sociale
                  </label>
                  <input
                    id="reg-company"
                    type="text"
                    required
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    placeholder="Dupont Conseil SARL"
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-slate-300 mb-1">
                    Adresse email professionnelle
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="jean.dupont@entreprise.fr"
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-xs font-medium text-slate-300 mb-1">
                    Mot de passe (6 caractères min)
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••••"
                      disabled={isSubmitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !regName.trim() || !regCompany.trim() || !regEmail.trim() || regPassword.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-white text-slate-950 hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50 mt-3"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Création de votre compte...</span>
                    </>
                  ) : (
                    <>
                      <span>Créer mon compte</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      clearError();
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5 text-sky-400" />
                    <span>Déjà un compte ? <strong className="text-sky-400 font-medium underline underline-offset-2">Se connecter</strong></span>
                  </button>
                </div>
              </form>
            )}

            {/* Raccourcis de test démo discrets */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-500 mb-2 font-medium">Comptes de test préconfigurés :</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => fillTestCredentials('Matt4Daemon@gmail.com', 'Client2026!')}
                  className="p-2 rounded bg-slate-950 border border-slate-800 text-left hover:border-slate-700 transition-colors"
                >
                  <div className="font-semibold text-slate-300">Client Démo</div>
                  <div className="text-slate-500 truncate">Matt4Daemon@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillTestCredentials('admin@mykonnect.fr', 'Admin2026!')}
                  className="p-2 rounded bg-slate-950 border border-slate-800 text-left hover:border-slate-700 transition-colors"
                >
                  <div className="font-semibold text-slate-300">Admin Démo</div>
                  <div className="text-slate-500 truncate">admin@mykonnect.fr</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer minimaliste et sobre */}
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
