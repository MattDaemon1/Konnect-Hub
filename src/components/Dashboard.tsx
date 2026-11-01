/**
 * @file Dashboard.tsx
 * @description Tableau de bord My Konnect (Espace Client & Espace Administration)
 * Intègre les fonctionnalités de création et de gestion :
 * - Création de client exclusive à l'Admin avec premier changement de mot de passe obligatoire
 * - Création de projet exclusive à l'Admin
 * - Dépôt de document par le Client ET l'Admin (avec affectation client pour l'Admin)
 * - Traitement des tickets de support par l'Admin avec option de clôture ou maintien ouvert
 * - Logo officiel vectoriel Matt Konnect (mattkonnect.com)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Project, DocumentRecord, SupportTicket, DocumentCategory, Client } from '../types/index.ts';
import { MattKonnectLogo } from './MattKonnectLogo.tsx';
import {
  FolderKanban,
  FileText,
  LifeBuoy,
  Download,
  Send,
  LogOut,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Upload,
  KeyRound,
  Eye,
  EyeOff,
  Building,
  Check,
  AlertCircle,
  X,
  FileUp,
  ShieldCheck,
} from 'lucide-react';

type TabKey = 'projects' | 'documents' | 'support' | 'clients';

export const Dashboard: React.FC = () => {
  const { user, logout, changePassword } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Onglet actif
  const [activeTab, setActiveTab] = useState<TabKey>('projects');

  // Données
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filtre documents
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Modals d'actions
  const [showCreateClientModal, setShowCreateClientModal] = useState<boolean>(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState<boolean>(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState<boolean>(false);

  // Formulaire : Création Client (Admin)
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientCompany, setNewClientCompany] = useState<string>('');
  const [newClientEmail, setNewClientEmail] = useState<string>('');
  const [newClientInitialPassword, setNewClientInitialPassword] = useState<string>('Client2026!');
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);
  const [clientCreationError, setClientCreationError] = useState<string | null>(null);

  // Formulaire : Création Projet (Admin)
  const [newProjectClientId, setNewProjectClientId] = useState<string>('');
  const [newProjectTitle, setNewProjectTitle] = useState<string>('');
  const [newProjectDescription, setNewProjectDescription] = useState<string>('');
  const [newProjectProgress, setNewProjectProgress] = useState<number>(10);
  const [newProjectStatus, setNewProjectStatus] = useState<Project['status']>('in_progress');
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [projectCreationError, setProjectCreationError] = useState<string | null>(null);

  // Formulaire : Dépôt Document (Client & Admin)
  const [docTitle, setDocTitle] = useState<string>('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('livrable');
  const [docTargetClientId, setDocTargetClientId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; dataUrl: string; mimeType: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulaire : Ticket Support (Client)
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketMessage, setTicketMessage] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState<boolean>(false);
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState<string | null>(null);

  // Réponse Ticket (Admin)
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Modal obligatoire : Changement de mot de passe à la 1ère connexion
  const [newPasswordValue, setNewPasswordValue] = useState<string>('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState<string>('');
  const [showPwdText, setShowPwdText] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  // Chargement des données
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const requests = [
        fetch('/api/projects', { credentials: 'include' }),
        fetch('/api/documents', { credentials: 'include' }),
        fetch('/api/support', { credentials: 'include' }),
      ];

      if (isAdmin) {
        requests.push(fetch('/api/clients', { credentials: 'include' }));
      }

      const responses = await Promise.all(requests);
      const [projRes, docRes, tktRes, clientRes] = responses;

      if (projRes.ok) {
        const d = await projRes.json();
        setProjects(d.projects || []);
      }
      if (docRes.ok) {
        const d = await docRes.json();
        setDocuments(d.documents || []);
      }
      if (tktRes.ok) {
        const d = await tktRes.json();
        setTickets(d.tickets || []);
      }
      if (clientRes && clientRes.ok) {
        const d = await clientRes.json();
        const loadedClients: Client[] = d.clients || [];
        setClientsList(loadedClients);
        // Pré-sélectionner le premier client pour les formulaires admin
        if (loadedClients.length > 0 && !newProjectClientId) {
          const firstClient = loadedClients.find((c) => c.role === 'client') || loadedClients[0];
          setNewProjectClientId(firstClient.id);
          setDocTargetClientId(firstClient.id);
        }
      }
    } catch (err) {
      console.error('[My Konnect] Erreur chargement données:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, newProjectClientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Téléchargement sécurisé
  const handleDownload = async (docId: string, title: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erreur lors du téléchargement du fichier.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erreur réseau lors du téléchargement.');
    }
  };

  // Traitement sélection de fichier upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!docTitle.trim()) {
      // Déduire le titre du nom de fichier propre
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDocTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        dataUrl: reader.result as string,
        mimeType: file.type || 'application/pdf',
      });
    };
    reader.readAsDataURL(file);
  };

  // Soumission Dépôt Document (Client & Admin)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !selectedFile || isUploadingDoc) return;

    try {
      setIsUploadingDoc(true);
      setDocUploadError(null);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle.trim(),
          category: docCategory,
          filename: selectedFile.name,
          fileData: selectedFile.dataUrl,
          mimeType: selectedFile.mimeType,
          targetClientId: isAdmin ? docTargetClientId : undefined,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setDocUploadError(data.error || 'Erreur lors du dépôt du document');
        return;
      }

      // Succès
      setShowUploadDocModal(false);
      setDocTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch {
      setDocUploadError('Erreur de connexion au serveur');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Soumission Création Client (Admin)
  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientEmail.trim() || !newClientCompany.trim() || isCreatingClient) return;

    try {
      setIsCreatingClient(true);
      setClientCreationError(null);

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          companyName: newClientCompany.trim(),
          email: newClientEmail.trim(),
          initialPassword: newClientInitialPassword.trim(),
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setClientCreationError(data.error || 'Erreur lors de la création du compte client');
        return;
      }

      // Succès
      setShowCreateClientModal(false);
      setNewClientName('');
      setNewClientCompany('');
      setNewClientEmail('');
      setNewClientInitialPassword('Client2026!');
      fetchData();
    } catch {
      setClientCreationError('Erreur réseau');
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Soumission Création Projet (Admin)
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim() || !newProjectDescription.trim() || !newProjectClientId || isCreatingProject) return;

    try {
      setIsCreatingProject(true);
      setProjectCreationError(null);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newProjectClientId,
          title: newProjectTitle.trim(),
          description: newProjectDescription.trim(),
          progressPercentage: Number(newProjectProgress) || 0,
          status: newProjectStatus,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setProjectCreationError(data.error || 'Erreur lors de la création du projet');
        return;
      }

      setShowCreateProjectModal(false);
      setNewProjectTitle('');
      setNewProjectDescription('');
      setNewProjectProgress(10);
      setNewProjectStatus('in_progress');
      fetchData();
    } catch {
      setProjectCreationError('Erreur réseau');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Mise à jour de l'avancement d'un projet (Admin)
  const handleUpdateProgress = async (projectId: string, currentProgress: number) => {
    const newProgressStr = prompt('Nouveau taux d\'avancement (0 à 100 %) :', currentProgress.toString());
    if (newProgressStr === null) return;

    const newProgress = parseInt(newProgressStr, 10);
    if (isNaN(newProgress) || newProgress < 0 || newProgress > 100) {
      alert('Veuillez saisir un nombre valide entre 0 et 100.');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressPercentage: newProgress,
          status: newProgress === 100 ? 'completed' : 'in_progress',
        }),
        credentials: 'include',
      });

      if (res.ok) {
        fetchData();
      }
    } catch {
      alert('Erreur lors de la mise à jour');
    }
  };

  // Envoi de ticket support par le client
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || isSubmittingTicket) return;

    try {
      setIsSubmittingTicket(true);
      setTicketSuccessMsg(null);

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          priority: ticketPriority,
        }),
        credentials: 'include',
      });

      if (res.ok) {
        setTicketSuccessMsg('Votre demande a bien été transmise à l\'équipe Matt Konnect.');
        setTicketSubject('');
        setTicketMessage('');
        setTicketPriority('medium');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de l\'envoi du ticket');
      }
    } catch {
      alert('Erreur réseau lors de la création du ticket');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Répondre à un ticket avec choix du statut (Admin)
  const handleAdminReply = async (ticketId: string, status: 'open' | 'resolved') => {
    if (!adminReplyText.trim() || isSubmittingReply) return;

    try {
      setIsSubmittingReply(true);
      const res = await fetch(`/api/support/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply: adminReplyText.trim(),
          status,
        }),
        credentials: 'include',
      });

      if (res.ok) {
        setReplyTicketId(null);
        setAdminReplyText('');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de la réponse au ticket');
      }
    } catch {
      alert('Erreur réseau');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Soumission du premier changement de mot de passe (Client)
  const handleFirstPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordValue || isChangingPassword) return;

    if (newPasswordValue.length < 6) {
      setPasswordChangeError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPasswordValue !== confirmPasswordValue) {
      setPasswordChangeError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordChangeError(null);
      const success = await changePassword(newPasswordValue);
      if (success) {
        setNewPasswordValue('');
        setConfirmPasswordValue('');
      } else {
        setPasswordChangeError('Impossible de mettre à jour le mot de passe.');
      }
    } catch {
      setPasswordChangeError('Erreur réseau');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (categoryFilter === 'all') return true;
    return doc.category === categoryFilter;
  });

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === 'all') return true;
    return t.status === ticketFilter;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  const getCategoryLabel = (category: DocumentCategory): string => {
    switch (category) {
      case 'audit_seo':
        return 'Audit SEO';
      case 'audit_rgpd':
        return 'Conformité RGPD';
      case 'facture':
        return 'Facture';
      case 'livrable':
        return 'Livrable';
      case 'autre':
        return 'Document Déposé';
      default:
        return category;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-slate-800 selection:text-white">
      {/* =========================================================================
          BARRE SUPÉRIEURE ÉPURÉE AVEC LE LOGO OFFICIEL MATTKONNECT.COM
          ========================================================================= */}
      <header className="border-b border-slate-900 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          {/* Logo officiel Mattkonnect.com */}
          <MattKonnectLogo size="md" showSubtitle={true} />

          {/* Navigation sobre et concise */}
          <nav className="hidden sm:flex items-center gap-6 text-xs font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('projects')}
              className={`transition-colors flex items-center gap-1.5 ${
                activeTab === 'projects' ? 'text-white font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Projets</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`transition-colors flex items-center gap-1.5 ${
                activeTab === 'documents' ? 'text-white font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`transition-colors flex items-center gap-1.5 ${
                activeTab === 'support' ? 'text-white font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('clients')}
                className={`transition-colors flex items-center gap-1.5 ${
                  activeTab === 'clients' ? 'text-white font-semibold' : 'hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Clients</span>
              </button>
            )}
          </nav>

          {/* Profil utilisateur & Déconnexion */}
          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <div className="font-medium text-slate-200 flex items-center justify-end gap-1.5">
                <span>{user?.name}</span>
                {isAdmin && (
                  <span className="text-[10px] text-sky-400 font-mono bg-sky-950/60 border border-sky-800/80 px-1.5 py-0.2 rounded">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">{user?.companyName}</div>
            </div>

            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation mobile */}
      <div className="sm:hidden flex border-b border-slate-900 bg-slate-950 px-4 py-2 gap-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3 py-1 rounded ${activeTab === 'projects' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
        >
          Projets
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3 py-1 rounded ${activeTab === 'documents' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`px-3 py-1 rounded ${activeTab === 'support' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
        >
          Support
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-3 py-1 rounded ${activeTab === 'clients' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
          >
            Clients
          </button>
        )}
      </div>

      {/* =========================================================================
          CONTENU PRINCIPAL
          ========================================================================= */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Entête épurée avec actions rapides selon le rôle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-900 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {isAdmin ? 'Espace Administration My Konnect' : 'Espace Client'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin
                ? 'Gestion des clients, suivi des chantiers et assistance technique'
                : `Bienvenue, ${user?.name}. Retrouvez vos projets, audits et déposez vos documents.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Action d'upload de document (Accessible au Client ET à l'Admin) */}
            <button
              onClick={() => {
                setDocUploadError(null);
                setShowUploadDocModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Déposer un document</span>
            </button>

            {/* Actions exclusives Administrateur */}
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setProjectCreationError(null);
                    setShowCreateProjectModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouveau Projet</span>
                </button>

                <button
                  onClick={() => {
                    setClientCreationError(null);
                    setShowCreateClientModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouveau Client</span>
                </button>
              </>
            )}

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded transition-colors"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            ONGLET 1 : PROJETS
            ========================================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{projects.length} projet{projects.length > 1 ? 's' : ''} actif{projects.length > 1 ? 's' : ''}</span>
              {isAdmin && (
                <span className="text-slate-500">
                  Cliquez sur un pourcentage pour ajuster l'avancement
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-full p-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Aucun projet enregistré. {isAdmin && 'Cliquez sur "Nouveau Projet" pour en créer un.'}
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-slate-500">{project.id}</span>
                        {isAdmin && project.clientCompany && (
                          <span className="text-sky-300 font-medium truncate max-w-[140px]">
                            {project.clientCompany}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-300">
                          {project.status === 'completed'
                            ? 'Terminé'
                            : project.status === 'on_hold'
                            ? 'En pause'
                            : 'En cours'}
                        </span>
                      </div>

                      <h2 className="text-sm font-semibold text-white leading-snug">
                        {project.title}
                      </h2>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Avancement</span>
                        {isAdmin ? (
                          <button
                            onClick={() => handleUpdateProgress(project.id, project.progressPercentage)}
                            className="font-bold text-sky-400 hover:text-sky-300 underline tabular-nums"
                            title="Modifier le pourcentage"
                          >
                            {project.progressPercentage}%
                          </button>
                        ) : (
                          <span className="font-bold text-sky-400 tabular-nums">
                            {project.progressPercentage}%
                          </span>
                        )}
                      </div>

                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            project.progressPercentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${project.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ONGLET 2 : DOCUMENTS (AVEC UPLOAD CLIENT & ADMIN)
            ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {/* Filtres de catégories */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tous ({documents.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('audit_seo')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'audit_seo'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Audits SEO
                </button>
                <button
                  onClick={() => setCategoryFilter('audit_rgpd')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'audit_rgpd'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  RGPD
                </button>
                <button
                  onClick={() => setCategoryFilter('facture')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'facture'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Factures
                </button>
                <button
                  onClick={() => setCategoryFilter('livrable')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'livrable'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Livrables &amp; Dépôts
                </button>
              </div>

              <button
                onClick={() => {
                  setDocUploadError(null);
                  setShowUploadDocModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-sky-400 hover:text-sky-300 font-medium whitespace-nowrap"
              >
                <Upload className="w-3 h-3" />
                <span>+ Déposer un document</span>
              </button>
            </div>

            {/* Table des documents */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Document</th>
                    {isAdmin && <th className="py-3 px-4">Client</th>}
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-right">Taille</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-500">
                        Aucun document disponible dans cette catégorie.
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{doc.title}</span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]">
                            {doc.clientCompany || doc.clientName || doc.clientId}
                          </td>
                        )}
                        <td className="py-3 px-4 text-slate-400">
                          {getCategoryLabel(doc.category)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {doc.uploadedBy === 'client' ? (
                            <span className="text-[11px] text-amber-300">Déposé par le Client</span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Agence</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDownload(doc.id, doc.title)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                          >
                            <Download className="w-3 h-3 text-sky-400" />
                            <span>Télécharger</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            ONGLET 3 : SUPPORT & ASSISTANCE (TRAITEMENT ET CLÔTURE)
            ========================================================================= */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Si Client : Formulaire de demande */}
            {!isAdmin && (
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">Ouvrir un ticket</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Notre équipe Matt Konnect vous répondra directement sur cet espace.
                  </p>
                </div>

                {ticketSuccessMsg && (
                  <div className="p-3 rounded text-xs bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{ticketSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleCreateTicket} className="space-y-3.5">
                  <div>
                    <label htmlFor="user-ticket-subject-input" className="block text-xs font-medium text-slate-300 mb-1">
                      Objet
                    </label>
                    <input
                      id="user-ticket-subject-input"
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Ex: Demande d'ajustement technique"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="user-ticket-priority-select" className="block text-xs font-medium text-slate-300 mb-1">
                      Priorité
                    </label>
                    <select
                      id="user-ticket-priority-select"
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="low">Basse (question générale)</option>
                      <option value="medium">Moyenne (demande standard)</option>
                      <option value="high">Haute (ajustement spécifique)</option>
                      <option value="urgent">Urgente (blocage opérationnel)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="user-ticket-message-area" className="block text-xs font-medium text-slate-300 mb-1">
                      Message
                    </label>
                    <textarea
                      id="user-ticket-message-area"
                      required
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Décrivez votre demande avec précision..."
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
                    <span>Envoyer la demande</span>
                  </button>
                </form>
              </div>
            )}

            {/* Liste des tickets (Client ou Admin) */}
            <div className={isAdmin ? 'lg:col-span-12 space-y-4' : 'lg:col-span-7 space-y-4'}>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {isAdmin ? 'Tickets Clients' : 'Historique des échanges'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAdmin
                      ? 'Répondez directement au client et clôturez le ticket si terminé'
                      : 'Consultez les réponses apportées par l\'équipe My Konnect'}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-800 rounded">
                    <button
                      onClick={() => setTicketFilter('all')}
                      className={`px-2.5 py-0.5 rounded ${ticketFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setTicketFilter('open')}
                      className={`px-2.5 py-0.5 rounded ${ticketFilter === 'open' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
                    >
                      En attente
                    </button>
                    <button
                      onClick={() => setTicketFilter('resolved')}
                      className={`px-2.5 py-0.5 rounded ${ticketFilter === 'resolved' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
                    >
                      Clôturés
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded bg-slate-900/30">
                    Aucun ticket pour le moment.
                  </div>
                ) : (
                  filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{ticket.id}</span>
                          {isAdmin && ticket.clientCompany && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-white font-medium">{ticket.clientCompany} ({ticket.clientName})</span>
                            </>
                          )}
                          <span className="text-slate-600">·</span>
                          <span
                            className={`font-medium capitalize ${
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

                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</span>
                          <span className="text-slate-600">·</span>
                          <span
                            className={`font-semibold ${
                              ticket.status === 'resolved' ? 'text-emerald-400' : 'text-sky-400'
                            }`}
                          >
                            {ticket.status === 'resolved' ? 'Clôturé' : 'En attente'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-white">
                        {ticket.subject}
                      </h3>

                      <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded border border-slate-900 whitespace-pre-wrap leading-relaxed">
                        {ticket.message}
                      </p>

                      {/* Réponse enregistrée */}
                      {ticket.adminReply && (
                        <div className="border-l-2 border-sky-500 pl-3 py-1 bg-sky-950/20 rounded-r text-xs space-y-1">
                          <div className="font-semibold text-sky-300 flex items-center justify-between">
                            <span>Réponse de l'équipe Matt Konnect :</span>
                            {ticket.repliedAt && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                {new Date(ticket.repliedAt).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-300 leading-relaxed">{ticket.adminReply}</div>
                        </div>
                      )}

                      {/* Action Admin pour répondre et clôturer si terminé */}
                      {isAdmin && (
                        <div className="pt-2 border-t border-slate-800/80">
                          {replyTicketId === ticket.id ? (
                            <div className="space-y-3 pt-1">
                              <label htmlFor={`ticket-reply-text-${ticket.id}`} className="block text-xs font-medium text-slate-300">
                                Répondre au client
                              </label>
                              <textarea
                                id={`ticket-reply-text-${ticket.id}`}
                                rows={3}
                                value={adminReplyText}
                                onChange={(e) => setAdminReplyText(e.target.value)}
                                placeholder="Rédigez la réponse d'assistance..."
                                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-sky-500"
                              />
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyTicketId(null);
                                    setAdminReplyText('');
                                  }}
                                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  disabled={isSubmittingReply || !adminReplyText.trim()}
                                  onClick={() => handleAdminReply(ticket.id, 'open')}
                                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors disabled:opacity-50"
                                >
                                  Envoyer (Laisser ouvert)
                                </button>
                                <button
                                  type="button"
                                  disabled={isSubmittingReply || !adminReplyText.trim()}
                                  onClick={() => handleAdminReply(ticket.id, 'resolved')}
                                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Envoyer et Clôturer le ticket</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTicketId(ticket.id);
                                  setAdminReplyText(ticket.adminReply || '');
                                }}
                                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                              >
                                <span>{ticket.adminReply ? 'Modifier la réponse' : 'Répondre au ticket'}</span>
                              </button>
                            </div>
                          )}
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
            ONGLET 4 : CLIENTS (RÉSERVÉ ADMIN - CRÉATION EXCLUSIVE)
            ========================================================================= */}
        {isAdmin && activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{clientsList.length} compte{clientsList.length > 1 ? 's' : ''} enregistré{clientsList.length > 1 ? 's' : ''}</span>
              <button
                onClick={() => {
                  setClientCreationError(null);
                  setShowCreateClientModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-200 text-slate-950 font-semibold rounded text-xs transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Créer un nouveau client</span>
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Entreprise</th>
                    <th className="py-3 px-4">Identifiant / Email</th>
                    <th className="py-3 px-4">1ère Connexion</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Création</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {clientsList.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white flex items-center gap-1.5">
                        <span>{client.name}</span>
                        {client.role === 'admin' && (
                          <span className="text-[10px] text-sky-400 font-mono bg-sky-950 px-1 rounded">Admin</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{client.companyName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{client.email}</td>
                      <td className="py-3 px-4">
                        {client.mustChangePassword ? (
                          <span className="text-amber-300 text-[11px] font-medium">Mot de passe à changer</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Défini</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-400 font-medium capitalize">
                          {client.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL 1 : CRÉATION D'UN COMPTE CLIENT (EXCLUSIF ADMIN)
          ========================================================================= */}
      {showCreateClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Créer un nouveau compte Client</span>
              </div>
              <button
                onClick={() => setShowCreateClientModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Seul l'administrateur peut créer le compte d'un client. Le client devra obligatoirement personnaliser son mot de passe lors de sa première connexion.
            </p>

            {clientCreationError && (
              <div className="p-2.5 rounded text-xs bg-red-950/40 border border-red-900/60 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{clientCreationError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClientSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Nom et Prénom du contact</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Raison sociale / Entreprise</label>
                <input
                  type="text"
                  required
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                  placeholder="Ex: Dupont Industrie SAS"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Adresse email (Identifiant de connexion)</label>
                <input
                  type="email"
                  required
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="contact@dupont.fr"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Mot de passe temporaire initial</label>
                <input
                  type="text"
                  required
                  value={newClientInitialPassword}
                  onChange={(e) => setNewClientInitialPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  À transmettre au client pour son premier accès.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClientModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient}
                  className="px-4 py-2 font-semibold bg-white hover:bg-slate-200 text-slate-950 rounded transition-colors disabled:opacity-50"
                >
                  {isCreatingClient ? 'Création en cours...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2 : CRÉATION D'UN PROJET (EXCLUSIF ADMIN)
          ========================================================================= */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <FolderKanban className="w-4 h-4 text-sky-400" />
                <span>Nouveau Projet Client</span>
              </div>
              <button
                onClick={() => setShowCreateProjectModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {projectCreationError && (
              <div className="p-2.5 rounded text-xs bg-red-950/40 border border-red-900/60 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{projectCreationError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProjectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Client bénéficiaire</label>
                <select
                  required
                  value={newProjectClientId}
                  onChange={(e) => setNewProjectClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                >
                  {clientsList
                    .filter((c) => c.role === 'client')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} — {c.name} ({c.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Titre du projet</label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Ex: Stratégie SEO & Refonte Web"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description des travaux</label>
                <textarea
                  required
                  rows={3}
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Objectifs, périmètre d'intervention..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Avancement (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProjectProgress}
                    onChange={(e) => setNewProjectProgress(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white tabular-nums focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Statut</label>
                  <select
                    value={newProjectStatus}
                    onChange={(e) => setNewProjectStatus(e.target.value as Project['status'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="on_hold">En pause</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject}
                  className="px-4 py-2 font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isCreatingProject ? 'Création...' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3 : DÉPÔT D'UN DOCUMENT (ACCESSIBLE CLIENT ET ADMIN)
          ========================================================================= */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <FileUp className="w-4 h-4 text-sky-400" />
                <span>Déposer un document dans le coffre-fort</span>
              </div>
              <button
                onClick={() => setShowUploadDocModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Le document sera stocké de manière sécurisée hors de la racine web et mis à disposition du client sélectionné.'
                : 'Déposez vos pièces justificatives, cahier des charges ou contrats pour l\'équipe Matt Konnect.'}
            </p>

            {docUploadError && (
              <div className="p-2.5 rounded text-xs bg-red-950/40 border border-red-900/60 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{docUploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              {/* Si Admin : sélection du client destinataire */}
              {isAdmin && (
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Client destinataire</label>
                  <select
                    required
                    value={docTargetClientId}
                    onChange={(e) => setDocTargetClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {clientsList
                      .filter((c) => c.role === 'client')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} — {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300 mb-1">Titre descriptif du document</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ex: Audit Sémantique ou Kbis 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Catégorie</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="livrable">Livrable de projet</option>
                  <option value="audit_seo">Audit SEO Technique</option>
                  <option value="audit_rgpd">Conformité RGPD</option>
                  <option value="facture">Facture &amp; Comptabilité</option>
                  <option value="autre">Autre document partagé</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Fichier (PDF, Docx, Image, Zip)</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                />
                {selectedFile && (
                  <span className="text-[11px] text-sky-400 mt-1 block">
                    Fichier prêt : {selectedFile.name}
                  </span>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc || !selectedFile || !docTitle.trim()}
                  className="px-4 py-2 font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploadingDoc ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Chiffrement &amp; Dépôt...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3" />
                      <span>Déposer le document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL OBLIGATOIRE : PREMIÈRE CONNEXION DU CLIENT (CHANGEMENT DE MDP)
          ========================================================================= */}
      {user?.mustChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Sécurisation de votre compte My Konnect</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bonjour <strong>{user.name}</strong>, votre compte a été créé par l'administrateur avec un mot de passe temporaire.
              Pour garantir la sécurité de vos données, veuillez <strong>définir votre mot de passe personnel</strong> dès maintenant.
            </p>

            {passwordChangeError && (
              <div className="p-2.5 rounded text-xs bg-red-950/50 border border-red-900/70 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{passwordChangeError}</span>
              </div>
            )}

            <form onSubmit={handleFirstPasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-200 mb-1">Nouveau mot de passe personnel</label>
                <div className="relative">
                  <input
                    type={showPwdText ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 pr-9 text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwdText(!showPwdText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPwdText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type={showPwdText ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPasswordValue}
                  onChange={(e) => setConfirmPasswordValue(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword || !newPasswordValue}
                className="w-full py-2.5 px-4 font-semibold bg-white hover:bg-slate-200 text-slate-950 rounded transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Enregistrement sécurisé...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Valider mon mot de passe personnel</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          FOOTER MINIMALISTE & SOBRE
          ========================================================================= */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            &copy; {new Date().getFullYear()} My Konnect · Développé par <a href="https://mattkonnect.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white underline">mattkonnect.com</a>
          </div>
          <div className="flex items-center gap-4">
            <span>Confidentialité</span>
            <span>·</span>
            <span>Sécurité OWASP</span>
            <span>·</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
