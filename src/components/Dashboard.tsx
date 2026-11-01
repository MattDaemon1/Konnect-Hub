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
import { Project, ProjectAction, DocumentRecord, SupportTicket, DocumentCategory, Client } from '../types/index.ts';
import { MattKonnectLogo } from './MattKonnectLogo.tsx';
import { apiFetch } from '../utils/api.ts';
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
  Calendar,
  DollarSign,
  Layers,
  Edit3,
  Trash2,
  Filter,
  Briefcase,
  ListTodo,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
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
  const [newProjectProgress, setNewProjectProgress] = useState<number>(0);
  const [newProjectStatus, setNewProjectStatus] = useState<Project['status']>('in_progress');
  const [newProjectTargetDate, setNewProjectTargetDate] = useState<string>('');
  const [newProjectBudget, setNewProjectBudget] = useState<string>('');
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [projectCreationError, setProjectCreationError] = useState<string | null>(null);

  // Vue détaillée / Feuille de route & Actions d'un projet
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Modal d'édition complète de projet (Admin)
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState<string>('');
  const [editProjectDescription, setEditProjectDescription] = useState<string>('');
  const [editProjectClientId, setEditProjectClientId] = useState<string>('');
  const [editProjectStatus, setEditProjectStatus] = useState<Project['status']>('in_progress');
  const [editProjectProgress, setEditProjectProgress] = useState<number>(0);
  const [editProjectTargetDate, setEditProjectTargetDate] = useState<string>('');
  const [editProjectBudget, setEditProjectBudget] = useState<string>('');
  const [isSavingProject, setIsSavingProject] = useState<boolean>(false);
  const [projectEditError, setProjectEditError] = useState<string | null>(null);

  // Filtre et affichage des projets (Vue CRM)
  const [projectClientFilter, setProjectClientFilter] = useState<string>('all');
  const [projectViewGroup, setProjectViewGroup] = useState<'grid' | 'crm'>('grid');

  // Formulaire : Ajout d'une action / jalon dans le projet sélectionné
  const [newActionTitle, setNewActionTitle] = useState<string>('');
  const [newActionDescription, setNewActionDescription] = useState<string>('');
  const [newActionAssignedTo, setNewActionAssignedTo] = useState<'admin' | 'client'>('admin');
  const [newActionDueDate, setNewActionDueDate] = useState<string>('');
  const [isAddingAction, setIsAddingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
        apiFetch('/api/projects'),
        apiFetch('/api/documents'),
        apiFetch('/api/support'),
      ];

      if (isAdmin) {
        requests.push(apiFetch('/api/clients'));
      }

      const responses = await Promise.all(requests);
      const [projRes, docRes, tktRes, clientRes] = responses;

      if (projRes.ok) {
        const d = await projRes.json();
        const loadedProjects: Project[] = d.projects || [];
        setProjects(loadedProjects);
        setSelectedProject((prev) => {
          if (!prev) return null;
          return loadedProjects.find((p) => p.id === prev.id) || null;
        });
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
      const res = await apiFetch(`/api/documents/${docId}/download`, {
        method: 'GET',
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

      const res = await apiFetch('/api/documents/upload', {
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

      const res = await apiFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          companyName: newClientCompany.trim(),
          email: newClientEmail.trim(),
          initialPassword: newClientInitialPassword.trim(),
        }),
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

      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newProjectClientId,
          title: newProjectTitle.trim(),
          description: newProjectDescription.trim(),
          progressPercentage: Number(newProjectProgress) || 0,
          status: newProjectStatus,
          targetDate: newProjectTargetDate.trim() || undefined,
          budget: newProjectBudget.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProjectCreationError(data.error || 'Erreur lors de la création du projet');
        return;
      }

      setShowCreateProjectModal(false);
      setNewProjectTitle('');
      setNewProjectDescription('');
      setNewProjectProgress(0);
      setNewProjectStatus('in_progress');
      setNewProjectTargetDate('');
      setNewProjectBudget('');
      fetchData();
    } catch {
      setProjectCreationError('Erreur réseau');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Préparation et ouverture du modal d'édition d'un projet (Admin)
  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectTitle(project.title);
    setEditProjectDescription(project.description);
    setEditProjectClientId(project.clientId);
    setEditProjectStatus(project.status);
    setEditProjectProgress(project.progressPercentage);
    setEditProjectTargetDate(project.targetDate || '');
    setEditProjectBudget(project.budget || '');
    setProjectEditError(null);
  };

  // Enregistrement des modifications d'un projet (Admin)
  const handleSaveProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectTitle.trim() || isSavingProject) return;

    try {
      setIsSavingProject(true);
      setProjectEditError(null);

      const res = await apiFetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editProjectTitle.trim(),
          description: editProjectDescription.trim(),
          clientId: editProjectClientId,
          status: editProjectStatus,
          progressPercentage: Number(editProjectProgress),
          targetDate: editProjectTargetDate.trim() || undefined,
          budget: editProjectBudget.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProjectEditError(data.error || 'Erreur lors de la mise à jour');
        return;
      }

      setEditingProject(null);
      if (selectedProject && selectedProject.id === editingProject.id) {
        setSelectedProject(data.project);
      }
      fetchData();
    } catch {
      setProjectEditError('Erreur réseau lors de la modification');
    } finally {
      setIsSavingProject(false);
    }
  };

  // Suppression d'un projet (Admin)
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce projet et ses actions associées ?')) {
      return;
    }

    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (selectedProject?.id === projectId) setSelectedProject(null);
        if (editingProject?.id === projectId) setEditingProject(null);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de la suppression');
      }
    } catch {
      alert('Erreur réseau');
    }
  };

  // Bascule cochée/décochée d'une action du projet (Client & Admin)
  const handleToggleAction = async (projectId: string, actionId: string) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/actions/${actionId}/toggle`, {
        method: 'PATCH',
      });

      if (res.ok) {
        const data = await res.json();
        const updatedProject: Project = data.project;

        // Mise à jour instantanée du state sans attendre un refetch
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)));
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(updatedProject);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de la validation de l\'action');
      }
    } catch {
      alert('Erreur réseau');
    }
  };

  // Ajout d'une action dans la feuille de route du projet (Admin)
  const handleAddAction = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!newActionTitle.trim() || isAddingAction) return;

    try {
      setIsAddingAction(true);
      setActionError(null);

      const res = await apiFetch(`/api/projects/${projectId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newActionTitle.trim(),
          description: newActionDescription.trim() || undefined,
          assignedTo: newActionAssignedTo,
          dueDate: newActionDueDate.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Erreur lors de l\'ajout de l\'action');
        return;
      }

      setNewActionTitle('');
      setNewActionDescription('');
      setNewActionAssignedTo('admin');
      setNewActionDueDate('');

      const updatedProject: Project = data.project;
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)));
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(updatedProject);
      }
    } catch {
      setActionError('Erreur réseau');
    } finally {
      setIsAddingAction(false);
    }
  };

  // Suppression d'une action d'un projet (Admin)
  const handleDeleteAction = async (projectId: string, actionId: string) => {
    if (!confirm('Supprimer cette action de la feuille de route ?')) return;

    try {
      const res = await apiFetch(`/api/projects/${projectId}/actions/${actionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        const updatedProject: Project = data.project;
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)));
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(updatedProject);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de la suppression de l\'action');
      }
    } catch {
      alert('Erreur réseau');
    }
  };

  // Pré-sélection d'un client et ouverture de création projet (Vue CRM)
  const handleQuickCreateForClient = (clientId: string) => {
    setNewProjectClientId(clientId);
    setProjectCreationError(null);
    setShowCreateProjectModal(true);
  };

  // Mise à jour rapide de l'avancement d'un projet (Admin)
  const handleUpdateProgress = async (projectId: string, currentProgress: number) => {
    const newProgressStr = prompt('Nouveau taux d\'avancement (0 à 100 %) :', currentProgress.toString());
    if (newProgressStr === null) return;

    const newProgress = parseInt(newProgressStr, 10);
    if (isNaN(newProgress) || newProgress < 0 || newProgress > 100) {
      alert('Veuillez saisir un nombre valide entre 0 et 100.');
      return;
    }

    try {
      const res = await apiFetch(`/api/projects/${projectId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressPercentage: newProgress,
          status: newProgress === 100 ? 'completed' : 'in_progress',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.project;
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(updated);
        }
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

      const res = await apiFetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          priority: ticketPriority,
        }),
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
      const res = await apiFetch(`/api/support/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply: adminReplyText.trim(),
          status,
        }),
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
            ONGLET 1 : PROJETS & SUIVI OPÉRATIONNEL (CRM)
            ========================================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Barre d'outils CRM & Filtres */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/80 rounded-lg p-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <FolderKanban className="w-4 h-4 text-sky-400" />
                  <span>
                    {projects.length} projet{projects.length > 1 ? 's' : ''} au total
                  </span>
                </div>

                {isAdmin && (
                  <>
                    <span className="text-slate-700 hidden sm:inline">|</span>
                    {/* Filtre par client */}
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={projectClientFilter}
                        onChange={(e) => setProjectClientFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="all">Tous les clients ({clientsList.filter((c) => c.role === 'client').length})</option>
                        {clientsList
                          .filter((c) => c.role === 'client')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.companyName} ({c.name})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Sélecteur de vue : Grille vs CRM Groupé */}
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
                      <button
                        onClick={() => setProjectViewGroup('grid')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          projectViewGroup === 'grid'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Grille
                      </button>
                      <button
                        onClick={() => setProjectViewGroup('crm')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                          projectViewGroup === 'crm'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800/50'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Briefcase className="w-3 h-3 text-sky-400" />
                        <span>Vue CRM (Client)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'Cliquez sur une carte pour gérer les actions & la feuille de route'
                  : 'Consultez la feuille de route et validez les actions qui vous sont assignées'}
              </div>
            </div>

            {/* VUE 1 : VUE CRM GROUPÉE PAR CLIENT (ADMIN) */}
            {isAdmin && projectViewGroup === 'crm' ? (
              <div className="space-y-6">
                {clientsList
                  .filter((c) => c.role === 'client')
                  .filter((c) => projectClientFilter === 'all' || c.id === projectClientFilter)
                  .map((client) => {
                    const clientProjects = projects.filter((p) => p.clientId === client.id);
                    const avgProgress = clientProjects.length > 0
                      ? Math.round(
                          clientProjects.reduce((acc, p) => acc + (p.progressPercentage || 0), 0) /
                            clientProjects.length
                        )
                      : 0;

                    return (
                      <div
                        key={client.id}
                        className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 space-y-4"
                      >
                        {/* En-tête de fiche client CRM */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-sky-950/80 border border-sky-800/50 flex items-center justify-center text-sky-300 font-bold text-xs uppercase">
                              {client.companyName.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white">{client.companyName}</h3>
                                <span className="text-[11px] text-slate-400 font-normal">
                                  ({client.name})
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                <span className="font-mono">{client.email}</span>
                                <span>·</span>
                                <span>
                                  {clientProjects.length} projet{clientProjects.length > 1 ? 's' : ''} rattaché{clientProjects.length > 1 ? 's' : ''}
                                </span>
                                {clientProjects.length > 0 && (
                                  <>
                                    <span>·</span>
                                    <span className="text-sky-400 font-medium">Avancement global : {avgProgress}%</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleQuickCreateForClient(client.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded transition-colors self-start sm:self-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Nouveau projet pour ce client</span>
                          </button>
                        </div>

                        {/* Liste des projets du client */}
                        {clientProjects.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800/60 rounded-md">
                            Aucun projet actif pour ce client.{' '}
                            <button
                              onClick={() => handleQuickCreateForClient(client.id)}
                              className="text-sky-400 underline hover:text-sky-300 ml-1"
                            >
                              Créer un premier projet
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {clientProjects.map((project) => {
                              const actionsCount = project.actions?.length || 0;
                              const completedCount = (project.actions || []).filter((a) => a.status === 'completed').length;
                              const hasClientActionPending = (project.actions || []).some(
                                (a) => a.assignedTo === 'client' && a.status !== 'completed'
                              );

                              return (
                                <div
                                  key={project.id}
                                  onClick={() => setSelectedProject(project)}
                                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-lg p-4 flex flex-col justify-between space-y-3 cursor-pointer group transition-all hover:bg-slate-950"
                                >
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                      <span className="font-mono text-slate-500">{project.id}</span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                                          project.status === 'completed'
                                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                            : project.status === 'on_hold'
                                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                            : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                                        }`}
                                      >
                                        {project.status === 'completed'
                                          ? 'Terminé'
                                          : project.status === 'on_hold'
                                          ? 'En pause'
                                          : 'En cours'}
                                      </span>
                                    </div>

                                    <h4 className="text-xs font-semibold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
                                      {project.title}
                                    </h4>

                                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                      {project.description}
                                    </p>
                                  </div>

                                  <div className="space-y-2 pt-2 border-t border-slate-900">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <ListTodo className="w-3 h-3 text-slate-500" />
                                        <span>{completedCount}/{actionsCount} actions</span>
                                      </span>
                                      <span className="font-bold text-sky-400 tabular-nums">
                                        {project.progressPercentage}%
                                      </span>
                                    </div>

                                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          project.progressPercentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                                        }`}
                                        style={{ width: `${project.progressPercentage}%` }}
                                      />
                                    </div>

                                    {hasClientActionPending && (
                                      <div className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                                        <span>Action client requise</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* VUE 2 : GRILLE GLOBALE DES PROJETS */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects
                  .filter((p) => {
                    if (!isAdmin) return true;
                    if (projectClientFilter === 'all') return true;
                    return p.clientId === projectClientFilter;
                  })
                  .map((project) => {
                    const actionsCount = project.actions?.length || 0;
                    const completedCount = (project.actions || []).filter((a) => a.status === 'completed').length;
                    const hasClientActionPending = (project.actions || []).some(
                      (a) => a.assignedTo === 'client' && a.status !== 'completed'
                    );

                    return (
                      <div
                        key={project.id}
                        className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-lg p-5 flex flex-col justify-between space-y-4 transition-colors"
                      >
                        <div className="space-y-3">
                          {/* Badge client & statut */}
                          <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
                            <span className="font-mono text-[11px] text-slate-500">{project.id}</span>
                            {isAdmin && project.clientCompany && (
                              <button
                                onClick={() => {
                                  setProjectClientFilter(project.clientId);
                                  setProjectViewGroup('crm');
                                }}
                                className="text-sky-300 hover:underline font-medium truncate max-w-[150px] text-left text-xs"
                                title="Filtrer sur ce client"
                              >
                                {project.clientCompany}
                              </button>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize shrink-0 ${
                                project.status === 'completed'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                  : project.status === 'on_hold'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                              }`}
                            >
                              {project.status === 'completed'
                                ? 'Terminé'
                                : project.status === 'on_hold'
                                ? 'En pause'
                                : 'En cours'}
                            </span>
                          </div>

                          {/* Titre et description */}
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-white leading-snug">
                              {project.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          </div>

                          {/* Métadonnées : Échéance & Budget */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                            {project.targetDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>Échéance : {new Date(project.targetDate).toLocaleDateString('fr-FR')}</span>
                              </div>
                            )}
                            {isAdmin && project.budget && (
                              <div className="flex items-center gap-1 text-slate-300">
                                <DollarSign className="w-3 h-3 text-emerald-500" />
                                <span>{project.budget}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Avancement et actions */}
                        <div className="space-y-3 pt-3 border-t border-slate-800/80">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <ListTodo className="w-3.5 h-3.5 text-slate-500" />
                                <span>
                                  {completedCount}/{actionsCount} action{actionsCount > 1 ? 's' : ''} réalisée{completedCount > 1 ? 's' : ''}
                                </span>
                              </span>
                              <span className="font-bold text-sky-400 tabular-nums">
                                {project.progressPercentage}%
                              </span>
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

                          {/* Alerte si le client a une action en attente */}
                          {hasClientActionPending && (
                            <div className="p-2 rounded text-[11px] bg-amber-950/40 border border-amber-900/60 text-amber-200 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Action requise du client</span>
                              </div>
                              <button
                                onClick={() => setSelectedProject(project)}
                                className="text-[10px] text-amber-300 font-semibold underline hover:text-white"
                              >
                                Voir
                              </button>
                            </div>
                          )}

                          {/* Bouton pour ouvrir la feuille de route & boutons admin */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => setSelectedProject(project)}
                              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                            >
                              <span>Feuille de route & actions</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditProject(project)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                  title="Modifier le projet (CRM)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Supprimer le projet"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
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
                    <th className="py-3 px-4">Projets rattachés (CRM)</th>
                    <th className="py-3 px-4">1ère Connexion</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {clientsList.map((client) => {
                    const clientProjects = projects.filter((p) => p.clientId === client.id);

                    return (
                      <tr key={client.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-white flex items-center gap-1.5">
                          <span>{client.name}</span>
                          {client.role === 'admin' && (
                            <span className="text-[10px] text-sky-400 font-mono bg-sky-950 px-1 rounded">Admin</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">{client.companyName}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{client.email}</td>
                        <td className="py-3 px-4">
                          {client.role === 'client' ? (
                            clientProjects.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {clientProjects.map((cp) => (
                                  <button
                                    key={cp.id}
                                    onClick={() => setSelectedProject(cp)}
                                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/80 text-[11px] flex items-center gap-1.5 group transition-colors"
                                    title="Voir la feuille de route"
                                  >
                                    <span className="text-white group-hover:text-sky-300 max-w-[120px] truncate">
                                      {cp.title}
                                    </span>
                                    <span className="font-bold text-sky-400 text-[10px] tabular-nums">
                                      {cp.progressPercentage}%
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600 italic text-[11px]">Aucun projet</span>
                            )
                          ) : (
                            <span className="text-slate-600 text-[11px]">Compte Admin</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {client.mustChangePassword ? (
                            <span className="text-amber-300 text-[11px] font-medium">À définir</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Défini</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400 font-medium capitalize">
                            {client.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {client.role === 'client' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleQuickCreateForClient(client.id)}
                                className="px-2 py-1 bg-sky-950 hover:bg-sky-900 border border-sky-800/60 text-sky-300 rounded text-[11px] font-medium transition-colors flex items-center gap-1"
                                title="Créer un nouveau projet pour ce client"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Projet</span>
                              </button>
                              <button
                                onClick={() => {
                                  setProjectClientFilter(client.id);
                                  setProjectViewGroup('crm');
                                  setActiveTab('projects');
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition-colors"
                                title="Filtrer l'onglet projets"
                              >
                                Filtrer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
                  <label className="block font-medium text-slate-300 mb-1">Date d'échéance cible</label>
                  <input
                    type="date"
                    value={newProjectTargetDate}
                    onChange={(e) => setNewProjectTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Budget prévisionnel</label>
                  <input
                    type="text"
                    value={newProjectBudget}
                    onChange={(e) => setNewProjectBudget(e.target.value)}
                    placeholder="Ex: 3 500 € HT"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Avancement initial (%)</label>
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
                  <label className="block font-medium text-slate-300 mb-1">Statut initial</label>
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
          MODAL 5 : FEUILLE DE ROUTE & ACTIONS D'UN PROJET (STRUCTURE DÉTAILLÉE)
          ========================================================================= */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
            {/* En-tête du modal */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-800 gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-slate-500 font-semibold">{selectedProject.id}</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-sky-300 font-medium">
                    {selectedProject.clientCompany || 'Client'} ({selectedProject.clientName})
                  </span>
                  <span className="text-slate-700">·</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                      selectedProject.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : selectedProject.status === 'on_hold'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                    }`}
                  >
                    {selectedProject.status === 'completed'
                      ? 'Terminé'
                      : selectedProject.status === 'on_hold'
                      ? 'En pause'
                      : 'En cours'}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white leading-tight">
                  {selectedProject.title}
                </h2>

                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  {selectedProject.description}
                </p>

                {/* Métadonnées : Échéance & Budget */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  {selectedProject.targetDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Échéance cible : <strong className="text-slate-200">{new Date(selectedProject.targetDate).toLocaleDateString('fr-FR')}</strong></span>
                    </div>
                  )}
                  {selectedProject.budget && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Budget prévisionnel : <strong className="text-white">{selectedProject.budget}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleOpenEditProject(selectedProject)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded transition-colors text-xs flex items-center gap-1 px-2.5"
                      title="Modifier les informations du projet"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProject(selectedProject.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800/80 hover:bg-slate-700 rounded transition-colors text-xs"
                      title="Supprimer ce projet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded transition-colors"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Jauge d'avancement & Mesure du progrès */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <div>
                  <span className="font-semibold text-white">Progression globale du chantier</span>
                  <span className="text-slate-400 ml-2">
                    ({(selectedProject.actions || []).filter((a) => a.status === 'completed').length} / {selectedProject.actions?.length || 0} actions validées)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-sky-400 tabular-nums">
                    {selectedProject.progressPercentage}%
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleUpdateProgress(selectedProject.id, selectedProject.progressPercentage)}
                      className="text-[11px] text-slate-400 hover:text-sky-300 underline"
                      title="Forcer manuellement le pourcentage"
                    >
                      Ajuster %
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    selectedProject.progressPercentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${selectedProject.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Section FEUILLE DE ROUTE & CHECKLIST DES ACTIONS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-sky-400" />
                    <span>Feuille de route & Checklist des actions</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAdmin
                      ? 'Cochez les jalons terminés pour actualiser l\'avancement, ou ajoutez de nouvelles étapes.'
                      : 'Cochez les actions qui vous sont assignées une fois réalisées (ex: fourniture d\'accès, validation).'}
                  </p>
                </div>

                <span className="text-xs text-slate-500">
                  {selectedProject.actions?.length || 0} étape{(selectedProject.actions?.length || 0) > 1 ? 's' : ''}
                </span>
              </div>

              {/* Liste interactive des actions */}
              <div className="space-y-2.5">
                {(selectedProject.actions || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    Aucune action définie pour ce projet. {isAdmin && 'Utilisez le formulaire ci-dessous pour créer la première étape.'}
                  </div>
                ) : (
                  selectedProject.actions.map((action: ProjectAction, index: number) => {
                    const isCompleted = action.status === 'completed';
                    const canToggle = isAdmin || (user?.role === 'client' && action.assignedTo === 'client');

                    return (
                      <div
                        key={action.id}
                        className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                          isCompleted
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Checkbox interactive */}
                        <button
                          type="button"
                          disabled={!canToggle}
                          onClick={() => handleToggleAction(selectedProject.id, action.id)}
                          className={`mt-0.5 p-0.5 rounded transition-colors ${
                            canToggle
                              ? 'cursor-pointer hover:scale-110'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          title={
                            canToggle
                              ? isCompleted
                                ? 'Marquer comme à faire'
                                : 'Marquer comme terminée'
                              : 'Cette action est prise en charge par Matt Konnect'
                          }
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500 hover:text-sky-400" />
                          )}
                        </button>

                        {/* Contenu de l'action */}
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`text-xs font-medium leading-snug ${
                                isCompleted ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              <span className="font-mono text-slate-500 text-[11px] mr-1.5">
                                #{index + 1}
                              </span>
                              {action.title}
                            </span>

                            <div className="flex items-center gap-2">
                              {/* Badge d'assignation */}
                              {action.assignedTo === 'client' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-400" />
                                  <span>Action Client</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-800/60 flex items-center gap-1">
                                  <span>Matt Konnect</span>
                                </span>
                              )}

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAction(selectedProject.id, action.id)}
                                  className="text-slate-500 hover:text-red-400 p-0.5 transition-colors"
                                  title="Supprimer cette action"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {action.description && (
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {action.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                            {action.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Date cible : {new Date(action.dueDate).toLocaleDateString('fr-FR')}</span>
                              </span>
                            )}
                            {action.completedAt && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Validé le {new Date(action.completedAt).toLocaleDateString('fr-FR')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulaire Admin d'ajout rapide d'une action */}
              {isAdmin && (
                <form
                  onSubmit={(e) => handleAddAction(e, selectedProject.id)}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-3 text-xs"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ajouter une action à la feuille de route</span>
                  </div>

                  {actionError && (
                    <div className="p-2 rounded text-xs bg-red-950/40 border border-red-900/60 text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Intitulé de l'action / Jalon
                      </label>
                      <input
                        type="text"
                        required
                        value={newActionTitle}
                        onChange={(e) => setNewActionTitle(e.target.value)}
                        placeholder="Ex: Validation de la maquette par le client"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Assigné à
                      </label>
                      <select
                        value={newActionAssignedTo}
                        onChange={(e) => setNewActionAssignedTo(e.target.value as 'admin' | 'client')}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none focus:border-sky-500 text-xs"
                      >
                        <option value="admin">Matt Konnect (Agence)</option>
                        <option value="client">Action Requise Client</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Date cible (optionnel)
                      </label>
                      <input
                        type="date"
                        value={newActionDueDate}
                        onChange={(e) => setNewActionDueDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Consigne ou détail complémentaire (optionnel)
                    </label>
                    <input
                      type="text"
                      value={newActionDescription}
                      onChange={(e) => setNewActionDescription(e.target.value)}
                      placeholder="Ex: Fournir les accès SFTP o2switch ou valider le BAT"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingAction || !newActionTitle.trim()}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {isAddingAction ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span>Ajouter à la feuille de route</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Documents & Livrables associés au client / projet */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Documents & Livrables rattachés au dossier</span>
                </h4>
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setActiveTab('documents');
                  }}
                  className="text-sky-400 hover:underline text-[11px]"
                >
                  Voir tous les documents
                </button>
              </div>

              {documents.filter((d) => d.clientId === selectedProject.clientId).length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Aucun document déposé pour ce dossier pour le moment.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {documents
                    .filter((d) => d.clientId === selectedProject.clientId)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="truncate text-xs">
                          <div className="font-medium text-slate-200 truncate">{doc.title}</div>
                          <div className="text-[10px] text-slate-500">
                            {getCategoryLabel(doc.category)} · {formatFileSize(doc.fileSize)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(doc.id, doc.title)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors shrink-0"
                          title="Télécharger"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6 : ÉDITION COMPLÈTE D'UN PROJET (EXCLUSIF ADMIN)
          ========================================================================= */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <span>Modifier le projet ({editingProject.id})</span>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {projectEditError && (
              <div className="p-2.5 rounded text-xs bg-red-950/40 border border-red-900/60 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{projectEditError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProjectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Client rattaché (CRM)</label>
                <select
                  required
                  value={editProjectClientId}
                  onChange={(e) => setEditProjectClientId(e.target.value)}
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
                  value={editProjectTitle}
                  onChange={(e) => setEditProjectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description des travaux</label>
                <textarea
                  required
                  rows={3}
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Date d'échéance cible</label>
                  <input
                    type="date"
                    value={editProjectTargetDate}
                    onChange={(e) => setEditProjectTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Budget prévisionnel</label>
                  <input
                    type="text"
                    value={editProjectBudget}
                    onChange={(e) => setEditProjectBudget(e.target.value)}
                    placeholder="Ex: 4 500 € HT"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Avancement (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editProjectProgress}
                    onChange={(e) => setEditProjectProgress(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white tabular-nums focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Statut du chantier</label>
                  <select
                    value={editProjectStatus}
                    onChange={(e) => setEditProjectStatus(e.target.value as Project['status'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="on_hold">En pause</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="px-4 py-2 font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isSavingProject ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
