/**
 * @file Login.tsx
 * @description Page de connexion sans mot de passe (Magic Link) pour Konnect Client Portal
 * Design institutionnel B2B, typographie nette, retours d'état immédiats
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, Mail, ArrowRight, CheckCircle2, AlertCircle, Lock, RefreshCw, Sparkles, Inbox } from 'lucide-react';

interface SentEmailItem {
  id: string;
  to: string;
  subject: string;
  sentAt: string;
  magicLinkUrl?: string;
}

export const Login: React.FC = () => {
  const { requestMagicLink, error, clearError } = useAuth();
  const [email, setEmail] = useState<string>('Matt4Daemon@gmail.com');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const [lastSentEmail, setLastSentEmail] = useState<string>('');
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [inboxEmails, setInboxEmails] = useState<SentEmailItem[]>([]);
  const [showInboxModal, setShowInboxModal] = useState<boolean>(false);

  // Décompte de temporisation anti-spam (60 secondes)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Récupérer les emails simulés récents pour faciliter le test
  const fetchInbox = async () => {
    try {
      const res = await fetch('/api/auth/dev-inbox');
      if (res.ok) {
        const data = await res.json();
        setInboxEmails(data.emails || []);
      }
    } catch {
      // Ignorer silencieusement en cas d'indisponibilité
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [sentSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting || cooldown > 0) return;

    try {
      setIsSubmitting(true);
      clearError();
      const res = await requestMagicLink(email.trim());
      setSentSuccess(true);
      setLastSentEmail(email.trim());
      setCooldown(45); // Cooldown de 45 secondes
      if (res.previewUrl) {
        setPreviewLink(res.previewUrl);
      }
      fetchInbox();
    } catch {
      setSentSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPreload = (presetEmail: string) => {
    setEmail(presetEmail);
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-slate-800 selection:text-white">
      {/* Top bar contract: 1-line wordmark - clean links - 1 primary action */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-100 font-bold text-sm tracking-wider">
              MK
            </div>
            <span className="font-semibold tracking-tight text-white text-base">
              Matt Konnect
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              · Extranet Client Sécurisé
            </span>
          </div>

          <nav className="flex items-center gap-6 text-xs text-slate-400">
            <span className="hidden md:inline">Norme OWASP Top 10</span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">RGPD Conforme</span>
            <span className="hidden md:inline">·</span>
            <span>Hébergé sur o2switch France</span>
          </nav>

          <button
            onClick={() => {
              fetchInbox();
              setShowInboxModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
            title="Inspecter les Magic Links envoyés en environnement de test"
          >
            <Inbox className="w-3.5 h-3.5 text-slate-400" />
            <span>Boîte Mail o2switch</span>
            {inboxEmails.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                {inboxEmails.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full items-center">
          {/* Colonne gauche : Présentation & Garanties de Sécurité */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1 rounded">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Authentification sans mot de passe (Zero-Password Architecture)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Espace Client Privé & Coffre-Fort Documentaire
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Accédez à vos audits SEO & RGPD, suivez l'avancement de vos projets web et échangez
              en direct avec l'équipe Matt Konnect au sein d'un environnement hermétique.
            </p>

            {/* Fiches de garanties OWASP */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded bg-slate-900/40 border border-slate-900">
                <Lock className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Session JWT dans un Cookie HTTP-Only</div>
                  <div className="text-slate-400 mt-0.5">
                    Aucun jeton de session dans le stockage local (protection absolue contre les vols de session via XSS).
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded bg-slate-900/40 border border-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Magic Link SHA-256 à Usage Unique</div>
                  <div className="text-slate-400 mt-0.5">
                    Le token brut n'est jamais stocké en clair en BDD. Validité stricte de 15 minutes et invalidation immédiate après usage.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded bg-slate-900/40 border border-slate-900">
                <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Isolation Multi-Tenant & Anti-IDOR</div>
                  <div className="text-slate-400 mt-0.5">
                    Vos documents sont stockés hors de <code className="text-slate-300 font-mono">public_html</code> et inaccessibles par d'autres clients.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite : Formulaire de Connexion Magic Link */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-7 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Connexion Client</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Saisissez votre email pour recevoir votre lien sécurisé
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700/50">
                  <Mail className="w-4 h-4" />
                </div>
              </div>

              {/* Erreur éventuelle */}
              {error && (
                <div className="mb-4 p-3 bg-red-950/50 border border-red-900/60 rounded text-xs text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Confirmation d'envoi */}
              {sentSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-950/40 border border-emerald-900/60 rounded text-xs text-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Lien de connexion expédié avec succès !
                    </div>
                    <p className="text-emerald-300/80 leading-relaxed">
                      Un lien sécurisé valide 15 minutes a été envoyé à l'adresse{' '}
                      <strong className="text-white font-mono">{lastSentEmail}</strong> via le serveur SMTP o2switch.
                    </p>
                  </div>

                  {/* Accès rapide direct pour l'environnement de test / simulation */}
                  {previewLink && (
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-medium text-slate-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Lien direct de simulation (Dev Mode) :
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">Usage unique</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-sky-300 break-all select-all border border-slate-800">
                        {previewLink}
                      </div>
                      <a
                        href={previewLink}
                        className="inline-flex items-center justify-center w-full gap-2 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors"
                      >
                        <span>Se connecter immédiatement avec ce lien</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setSentSuccess(false)}
                      className="text-xs text-slate-400 hover:text-white underline underline-offset-4 transition-colors"
                    >
                      Utiliser une autre adresse email
                    </button>

                    {cooldown > 0 ? (
                      <span className="text-xs text-slate-500 tabular-nums">
                        Renvoyer possible dans {cooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
                      >
                        Renvoyer l'email
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="client-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Adresse email professionnelle
                    </label>
                    <div className="relative">
                      <input
                        id="client-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@entreprise.fr"
                        disabled={isSubmitting}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Comptes de test préconfigurés */}
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-500 block mb-2">Comptes de test rapides préconfigurés :</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectPreload('Matt4Daemon@gmail.com')}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          email === 'Matt4Daemon@gmail.com'
                            ? 'bg-sky-950/80 border-sky-700 text-sky-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Matt Konnect (Matt4Daemon@gmail.com)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPreload('sophie.durand@acme-logistique.fr')}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          email === 'sophie.durand@acme-logistique.fr'
                            ? 'bg-sky-950/80 border-sky-700 text-sky-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        ACME Logistique (Test IDOR)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim() || cooldown > 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-white text-slate-950 hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Chiffrement du jeton & expédition...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span>Veuillez patienter ({cooldown}s)</span>
                    ) : (
                      <>
                        <span>Recevoir mon lien de connexion sécurisé</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-500 text-center pt-2">
                    En cliquant, vous recevrez un courriel avec un jeton cryptographique à usage unique.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer sobre et conforme */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} Matt Konnect · Portail Extranet Sécurisé TPE/PME
          </div>
          <div className="flex items-center gap-4">
            <span>Sécurité OWASP Level 2</span>
            <span>·</span>
            <span>Protection IDOR Active</span>
            <span>·</span>
            <span>Phusion Passenger Node.js</span>
          </div>
        </div>
      </footer>

      {/* Modal / Tiroir de consultation de la boîte aux lettres simulée */}
      {showInboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Inbox className="w-4 h-4 text-sky-400" />
                <span>Simulateur de Boîte Mail o2switch (Environnement Sandbox)</span>
              </div>
              <button
                onClick={() => setShowInboxModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                Fermer
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Dans l'environnement de développement ou avant configuration des identifiants SMTP cPanel,
              les emails sortants sont enregistrés ici avec leur lien Magic Link prêt à l'emploi :
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {inboxEmails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
                  Aucun email n'a encore été envoyé. Entrez votre email ci-dessus pour générer un Magic Link.
                </div>
              ) : (
                inboxEmails.map((mail) => (
                  <div key={mail.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Destinataire: {mail.to}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(mail.sentAt).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium">{mail.subject}</div>

                    {mail.magicLinkUrl && (
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-sky-400 font-mono truncate max-w-[260px]">
                          {mail.magicLinkUrl}
                        </span>
                        <a
                          href={mail.magicLinkUrl}
                          className="px-2.5 py-1 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded whitespace-nowrap shrink-0 transition-colors"
                        >
                          Valider la connexion
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
              <span>Configuration SMTP cPanel : mail.o2switch.net (Port 465 SSL)</span>
              <button
                onClick={fetchInbox}
                className="text-sky-400 hover:underline flex items-center gap-1"
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
