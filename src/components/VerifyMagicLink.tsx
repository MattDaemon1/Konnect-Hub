/**
 * @file VerifyMagicLink.tsx
 * @description Page de validation automatique du Magic Link
 * Traite le jeton cryptographique transmis dans l'URL et active la session HTTP-Only
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

export const VerifyMagicLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyToken, error, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMessage('Aucun jeton de sécurité n\'a été fourni dans le lien.');
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      if (!token) return;
      try {
        const success = await verifyToken(token);
        if (!isMounted) return;

        if (success) {
          setStatus('success');
          // Redirection douce après 1.2s pour confirmer visuellement le succès
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1200);
        } else {
          setStatus('error');
          setErrorMessage(error || 'Ce lien est invalide, a déjà été utilisé ou a expiré (validité 15 min).');
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage('Erreur réseau lors de la vérification de votre lien.');
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, isAuthenticated, navigate, verifyToken, error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
          <ShieldCheck className="w-6 h-6 text-sky-400" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Vérification de Sécurité
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Validation cryptographique SHA-256 du Magic Link
          </p>
        </div>

        {status === 'verifying' && (
          <div className="space-y-4 py-4">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
            <div className="text-sm text-slate-300 font-medium">
              Vérification du jeton et émission du cookie HTTP-Only...
            </div>
            <p className="text-xs text-slate-500">
              Contrôle de la signature, de l'unicité et de l'expiration temporelle (15 min).
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-emerald-300">
              Authentification validée avec succès !
            </div>
            <p className="text-xs text-slate-400">
              Votre session sécurisée a été initialisée. Redirection vers votre tableau de bord...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <div className="text-sm font-semibold text-red-300">
              Échec de validation
            </div>
            <p className="text-xs text-slate-400 leading-relaxed bg-red-950/30 border border-red-900/50 p-3 rounded text-left">
              {errorMessage}
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
              >
                <span>Demander un nouveau lien de connexion</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-500">
          Matt Konnect Client Portal &bull; OWASP Compliant
        </div>
      </div>
    </div>
  );
};
