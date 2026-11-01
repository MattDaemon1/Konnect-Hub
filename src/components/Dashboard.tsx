/**
 * @file Dashboard.tsx
 * @description Tableau de bord principal de l'extranet client Konnect Client Portal
 * Respecte les exigences strictes OWASP, RGPD et les principes du Frontend Design Constitution :
 * - Contrat Top Bar 3 zones
 * - Zero-Pill sur les métadonnées (séparateurs typographiques discrets)
 * - Chiffres tabulaires (`tabular-nums`)
 * - Coffre-fort documentaire avec téléchargement sécurisé anti-IDOR
 * - Suivi de projets avec barres d'avancement
 * - Formulaire de support avec alerte email admin
 * - Documentation et console de test de sécurité intégrée (simulation IDOR)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Project, DocumentRecord, SupportTicket, DocumentCategory } from '../types/index.ts';
import {
  FolderKanban,
  FileCheck2,
  LifeBuoy,
  Server,
  Download,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Building,
} from 'lucide-react';

type TabKey = 'projects' | 'documents' | 'support' | 'deployment';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('projects');

  // Données dynamiques
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Filtre documents
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Formulaire Support Ticket
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketMessage, setTicketMessage] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState<boolean>(false);
  const [ticketFeedback, setTicketFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // État du test de pénétration IDOR en direct
  const [idorTestResult, setIdorTestResult] = useState<{ status: 'idle' | 'testing' | 'blocked' | 'error'; message: string; httpStatus?: number } | null>(null);

  // Presse-papier
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Chargement des données du client connecté
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [projRes, docRes, tktRes] = await Promise.all([
        fetch('/api/projects', { credentials: 'include' }),
        fetch('/api/documents', { credentials: 'include' }),
        fetch('/api/support', { credentials: 'include' }),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects || []);
      }
      if (docRes.ok) {
        const data = await docRes.json();
        setDocuments(data.documents || []);
      }
      if (tktRes.ok) {
        const data = await tktRes.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('[Dashboard] Erreur lors de la récupération des données:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Téléchargement sécurisé de document via GET /api/documents/:id/download
  const handleDownload = async (docId: string, title: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`Échec du téléchargement : ${errJson.error || 'Erreur lors de la récupération du fichier.'}`);
        return;
      }

      // Récupération du blob et déclenchement du téléchargement navigateur
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      // Nommage de repli propre
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Erreur réseau lors du téléchargement.');
    }
  };

  // Test de violation IDOR (tentative d'accès à un document tiers)
  const handleRunIdorTest = async () => {
    try {
      setIdorTestResult({ status: 'testing', message: 'Envoi d\'une requête vers un document tiers (doc_5 appartenant à un autre client)...' });
      const res = await fetch('/api/documents/doc_5/download', {
        method: 'GET',
        credentials: 'include',
      });

      if (res.status === 403) {
        const body = await res.json();
        setIdorTestResult({
          status: 'blocked',
          httpStatus: 403,
          message: `Succès du blindage OWASP : Le serveur a rejeté la requête avec HTTP 403 Forbidden. Détail : "${body.error}"`,
        });
      } else if (res.ok) {
        setIdorTestResult({
          status: 'error',
          httpStatus: 200,
          message: 'ALERTE CRITIQUE : La ressource d\'un autre client a été renvoyée ! (IDOR non protégé)',
        });
      } else {
        setIdorTestResult({
          status: 'blocked',
          httpStatus: res.status,
          message: `Requête bloquée avec le code HTTP ${res.status}.`,
        });
      }
    } catch (err) {
      setIdorTestResult({
        status: 'error',
        message: 'Erreur lors du test de sécurité.',
      });
    }
  };

  // Envoi d'un nouveau ticket support
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || isSubmittingTicket) return;

    try {
      setIsSubmittingTicket(true);
      setTicketFeedback(null);

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          priority: ticketPriority,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setTicketFeedback({
          type: 'error',
          message: data.error || 'Erreur lors de la transmission du ticket.',
        });
        return;
      }

      setTicketFeedback({
        type: 'success',
        message: 'Votre ticket a été transmis à l\'équipe Matt Konnect. Une notification email a été expédiée à l\'administrateur.',
      });

      setTicketSubject('');
      setTicketMessage('');
      setTicketPriority('medium');
      // Recharger la liste des tickets
      loadDashboardData();
    } catch {
      setTicketFeedback({
        type: 'error',
        message: 'Erreur de connexion avec le serveur.',
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Filtrage des documents par catégorie
  const filteredDocuments = documents.filter((doc) => {
    if (categoryFilter === 'all') return true;
    return doc.category === categoryFilter;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  const getCategoryLabel = (category: DocumentCategory): string => {
    switch (category) {
      case 'audit_seo':
        return 'Audit SEO Technique';
      case 'audit_rgpd':
        return 'Conformité RGPD';
      case 'facture':
        return 'Facture & Comptabilité';
      case 'livrable':
        return 'Livrable Projet';
      default:
        return category;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-slate-800 selection:text-white">
      {/* =========================================================================
          TOP BAR CONTRACT (ZONE 1: Wordmark - ZONE 2: 4-5 Nav Links - ZONE 3: 1 Action)
          ========================================================================= */}
      <header className="border-b border-slate-900 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-bold text-xs">
              MK
            </div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Konnect Client Portal
            </span>
          </div>

          {/* Zone 2: Navigation Links / Segmented Tabs (Clean Typography, single-line) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('projects')}
              className={`hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'projects' ? 'text-white font-semibold underline underline-offset-8 decoration-sky-400 decoration-2' : ''
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Projets &amp; Avancement</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'documents' ? 'text-white font-semibold underline underline-offset-8 decoration-sky-400 decoration-2' : ''
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Coffre-Fort Documents</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'support' ? 'text-white font-semibold underline underline-offset-8 decoration-sky-400 decoration-2' : ''
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Support &amp; Assistance</span>
            </button>

            <button
              onClick={() => setActiveTab('deployment')}
              className={`hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'deployment' ? 'text-white font-semibold underline underline-offset-8 decoration-sky-400 decoration-2' : ''
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Déploiement o2switch &amp; OWASP</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Session Context */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex flex-col text-right text-xs">
              <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                {user?.companyName || user?.name}
              </span>
              <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                {user?.email}
              </span>
            </div>

            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors whitespace-nowrap"
              title="Clôturer la session HTTP-Only"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Barre de navigation mobile */}
      <div className="md:hidden flex overflow-x-auto border-b border-slate-900 bg-slate-950 px-4 py-2 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'projects' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
        >
          Projets
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'documents' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'support' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
        >
          Support
        </button>
        <button
          onClick={() => setActiveTab('deployment')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'deployment' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
        >
          o2switch &amp; OWASP
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Bandeau d'en-tête client & Isolation */}
        <div className="mb-8 border-b border-slate-900 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
              <Building className="w-3.5 h-3.5" />
              <span>Espace Client Dédié</span>
              <span aria-hidden="true">·</span>
              <span>Tenant ID: <code className="text-slate-400 font-mono">{user?.id}</code></span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Bienvenue, {user?.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Plateforme hébergée sous LiteSpeed o2switch &bull; Données chiffrées &bull; Session protégée par cookie HTTP-Only
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              disabled={isLoadingData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: PROJETS & AVANCEMENT
            ========================================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Projets en cours &amp; Livrables</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suivi en temps réel des chantiers techniques et optimisations SEO / RGPD
                </p>
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                {projects.length} projet{projects.length > 1 ? 's' : ''} actif{projects.length > 1 ? 's' : ''}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2.5">
                    {/* Zero-Pill metadata header */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono">{project.id}</span>
                      <span className="capitalize text-slate-300">
                        {project.status === 'in_progress' ? 'En cours' : project.status === 'completed' ? 'Terminé' : 'En pause'}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white leading-snug">
                      {project.title}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {project.description}
                    </p>
                  </div>

                  {/* Progression & Métriques */}
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Taux d'avancement</span>
                      <span className="font-bold text-sky-400 tabular-nums">
                        {project.progressPercentage}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          project.progressPercentage === 100
                            ? 'bg-emerald-500'
                            : 'bg-sky-500'
                        }`}
                        style={{ width: `${project.progressPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}</span>
                      <span>{project.deliverablesCount || 0} livrables associés</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: COFFRE-FORT DOCUMENTS (PROTECTION IDOR & PRIVACY)
            ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Coffre-Fort Documentaire Privé</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stockage hors web root avec contrôle d'accès strict (Zéro accès direct par URL)
                </p>
              </div>

              {/* Segmented Controls pour le filtrage interactif */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-800 rounded">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tous ({documents.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('audit_seo')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'audit_seo'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Audits SEO
                </button>
                <button
                  onClick={() => setCategoryFilter('audit_rgpd')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'audit_rgpd'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  RGPD
                </button>
                <button
                  onClick={() => setCategoryFilter('facture')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'facture'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Factures
                </button>
                <button
                  onClick={() => setCategoryFilter('livrable')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'livrable'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Livrables
                </button>
              </div>
            </div>

            {/* Note informative OWASP sur l'absence de chemin public */}
            <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Protection OWASP active :</strong> Aucun document n'est accessible via une URL statique directe.
                  Chaque téléchargement transite par <code className="text-slate-300 font-mono">/api/documents/:id/download</code> qui vérifie le tenant du client.
                </span>
              </div>
            </div>

            {/* Tableau haute densité des documents */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Titre du document</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4 text-right">Taille</th>
                    <th className="py-3 px-4">Date de mise à disposition</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Aucun document disponible dans cette catégorie.
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>{doc.title}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {getCategoryLabel(doc.category)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-400">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(doc.createdAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDownload(doc.id, doc.title)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                            title="Téléchargement sécurisé vérifié par jeton"
                          >
                            <Download className="w-3.5 h-3.5 text-sky-400" />
                            <span>Télécharger</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Zone de test interactif de l'IDOR (Démonstration de sécurité pour l'utilisateur) */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">
                    Laboratoire de Sécurité : Épreuve du feu IDOR (Insecure Direct Object Reference)
                  </span>
                </div>
                <button
                  onClick={handleRunIdorTest}
                  disabled={idorTestResult?.status === 'testing'}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-950/70 hover:bg-amber-900/80 border border-amber-800 text-amber-200 rounded transition-colors"
                >
                  {idorTestResult?.status === 'testing' ? 'Test en cours...' : 'Tester la tentative de piratage IDOR'}
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Ce test simule un attaquant qui tente de télécharger l'ID d'un document confidentiel appartenant à un <strong>autre client</strong> (<code className="text-slate-300 font-mono">doc_5</code> appartenant à ACME SAS).
                Le contrôleur doit impérativement bloquer la requête avec une erreur <code className="text-emerald-400 font-mono">403 Forbidden</code>.
              </p>

              {idorTestResult && (
                <div
                  className={`p-3 rounded text-xs border ${
                    idorTestResult.status === 'blocked'
                      ? 'bg-emerald-950/40 border-emerald-900/70 text-emerald-200'
                      : idorTestResult.status === 'error'
                      ? 'bg-red-950/40 border-red-900/70 text-red-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  {idorTestResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: SUPPORT & ASSISTANCE TECHNIQUE
            ========================================================================= */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Formulaire de création de ticket */}
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-lg p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">Créer une demande d'assistance</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Une alerte email immédiate sera transmise à l'administrateur Matt Konnect
                </p>
              </div>

              {ticketFeedback && (
                <div
                  className={`p-3 rounded text-xs border ${
                    ticketFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200'
                      : 'bg-red-950/40 border-red-900/60 text-red-200'
                  }`}
                >
                  {ticketFeedback.message}
                </div>
              )}

              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div>
                  <label htmlFor="ticket-subject" className="block text-xs font-medium text-slate-300 mb-1">
                    Objet de la demande
                  </label>
                  <input
                    id="ticket-subject"
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Ex: Demande d'ajustement du sitemap XML"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="ticket-priority" className="block text-xs font-medium text-slate-300 mb-1">
                    Niveau de priorité
                  </label>
                  <select
                    id="ticket-priority"
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="low">Basse (question générale / conseil)</option>
                    <option value="medium">Moyenne (demande standard)</option>
                    <option value="high">Haute (anomalie détectée)</option>
                    <option value="urgent">Urgente (blocage production)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ticket-message" className="block text-xs font-medium text-slate-300 mb-1">
                    Détail de votre message
                  </label>
                  <textarea
                    id="ticket-message"
                    required
                    rows={4}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Décrivez votre besoin avec précision..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingTicket ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Envoyer ma demande au support</span>
                </button>
              </form>
            </div>

            {/* Historique des tickets */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">Historique de vos échanges</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vos demandes d'assistance et les réponses de l'équipe Matt Konnect
                </p>
              </div>

              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded bg-slate-900/30">
                    Vous n'avez aucun ticket de support ouvert actuellement.
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{ticket.id}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span
                            className={`capitalize font-medium ${
                              ticket.priority === 'urgent'
                                ? 'text-red-400'
                                : ticket.priority === 'high'
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }`}
                          >
                            Priorité {ticket.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span
                            className={`font-semibold ${
                              ticket.status === 'resolved' ? 'text-emerald-400' : 'text-sky-400'
                            }`}
                          >
                            {ticket.status === 'resolved' ? 'Résolu' : 'En traitement'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-white">
                        {ticket.subject}
                      </h3>

                      <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded border border-slate-900 whitespace-pre-wrap">
                        {ticket.message}
                      </p>

                      {ticket.adminReply && (
                        <div className="border-l-2 border-sky-500 pl-3 py-1 bg-sky-950/20 rounded-r text-xs space-y-1">
                          <div className="font-semibold text-sky-300">Réponse Matt Konnect Support :</div>
                          <div className="text-slate-300">{ticket.adminReply}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: DÉPLOIEMENT O2SWITCH & SÉCURITÉ OWASP (GUIDE PRODUCTION)
            ========================================================================= */}
        {activeTab === 'deployment' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-white">Guide de Déploiement o2switch (Phusion Passenger + MariaDB)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Instructions exactes pour mettre en ligne l'extranet Konnect sur votre hébergement mutualisé cPanel o2switch
              </p>
            </div>

            {/* Grille 3 étapes de production */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="text-xs font-mono text-sky-400">ÉTAPE 1</div>
                <h3 className="text-sm font-bold text-white">cPanel : Configuration Node.js</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dans votre interface cPanel o2switch, ouvrez <strong>"Configurer une application Node.js"</strong> (Phusion Passenger) :
                </p>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  <li>Version Node.js : <strong>20.x</strong> ou ultérieure</li>
                  <li>Mode d'application : <strong>Production</strong></li>
                  <li>Application root : <code className="text-slate-300 font-mono">/home/user/konnect_portal</code></li>
                  <li>Fichier de démarrage : <code className="text-slate-300 font-mono">server.ts</code> ou <code className="text-slate-300 font-mono">server.js</code></li>
                  <li>URL d'application : votre sous-domaine ou URI dédiée</li>
                </ul>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="text-xs font-mono text-sky-400">ÉTAPE 2</div>
                <h3 className="text-sm font-bold text-white">Stockage Privé Hors public_html</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pour respecter le principe OWASP de non-divulgation, créez un répertoire strictement en dehors de la racine web :
                </p>
                <div className="p-2.5 bg-slate-950 font-mono text-[11px] text-sky-300 rounded border border-slate-800 break-all">
                  mkdir -p /home/user/private_uploads<br />
                  chmod 700 /home/user/private_uploads
                </div>
                <p className="text-[11px] text-slate-500">
                  LiteSpeed refusera tout accès direct par URL. Seule l'API Express pourra streamer les fichiers.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="text-xs font-mono text-sky-400">ÉTAPE 3</div>
                <h3 className="text-sm font-bold text-white">Build Frontend &amp; .htaccess</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Générez le build statique Vite et placez les fichiers dans votre sous-domaine :
                </p>
                <div className="p-2.5 bg-slate-950 font-mono text-[11px] text-emerald-300 rounded border border-slate-800">
                  npm run build<br />
                  cp -r dist/* public_html/portail/
                </div>
                <p className="text-[11px] text-slate-500">
                  Le fichier <code className="text-slate-400 font-mono">.htaccess</code> redirige les routes vers <code className="text-slate-400 font-mono">index.html</code>.
                </p>
              </div>
            </div>

            {/* Script SQL DDL MariaDB exportable */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Script DDL MariaDB / MySQL o2switch</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    À exécuter dans phpMyAdmin ou en ligne de commande MySQL sur o2switch
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `CREATE TABLE IF NOT EXISTS \`clients\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`company_name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_client_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`projects\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`status\` ENUM('in_progress', 'completed', 'on_hold') NOT NULL DEFAULT 'in_progress',
  \`progress_percentage\` INT NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_projects_client\` (\`client_id\`),
  CONSTRAINT \`fk_projects_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`documents\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`category\` ENUM('audit_seo', 'audit_rgpd', 'facture', 'livrable') NOT NULL,
  \`file_path\` VARCHAR(512) NOT NULL,
  \`file_size\` INT NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_documents_client\` (\`client_id\`),
  CONSTRAINT \`fk_documents_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`magic_links\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`token_hash\` VARCHAR(64) NOT NULL,
  \`expires_at\` DATETIME NOT NULL,
  \`used\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_magic_token_hash\` (\`token_hash\`),
  KEY \`idx_magic_client\` (\`client_id\`),
  CONSTRAINT \`fk_magic_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`support_tickets\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`subject\` VARCHAR(255) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`priority\` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  \`status\` ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_tickets_client\` (\`client_id\`),
  CONSTRAINT \`fk_tickets_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
                      'sql_script'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  {copiedKey === 'sql_script' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copié dans le presse-papier</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copier le script SQL DDL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60 border border-slate-800">
                <pre>{`-- Tables MariaDB / MySQL avec collation UTF-8 et clés étrangères CASCADE
CREATE TABLE IF NOT EXISTS \`clients\` ( ... );
CREATE TABLE IF NOT EXISTS \`projects\` ( ... );
CREATE TABLE IF NOT EXISTS \`documents\` ( ... );
CREATE TABLE IF NOT EXISTS \`magic_links\` ( ... token_hash VARCHAR(64) ... );
CREATE TABLE IF NOT EXISTS \`support_tickets\` ( ... );`}</pre>
              </div>
            </div>

            {/* Configuration .htaccess */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Fichier .htaccess LiteSpeed / Apache</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    À déposer dans <code className="text-slate-300 font-mono">public_html/</code> pour le routage SPA et les en-têtes HTTP
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Options -Indexes -MultiViews

<FilesMatch "^\\.(env|git|htaccess|htpasswd|ini|log|sh|sql)">
    Require all denied
</FilesMatch>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>`,
                      'htaccess'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  {copiedKey === 'htaccess' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copier le .htaccess</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
                <pre>{`Options -Indexes -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]`}</pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} Matt Konnect · Konnect Client Portal v2.0
          </div>
          <div className="flex items-center gap-4">
            <span>Protection IDOR Active</span>
            <span>·</span>
            <span>Cookie HTTP-Only &amp; SameSite=Strict</span>
            <span>·</span>
            <span>o2switch Cloud France</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
