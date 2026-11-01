/**
 * @file projectController.ts
 * @description Contrôleur de consultation et gestion des projets et de leurs actions (Client & Admin)
 * Supporte :
 * - Liste et détails avec isolation multi-tenant (OWASP)
 * - Création, modification, suppression de projets (Admin)
 * - Gestion de la roadmap d'actions / jalons (Ajout, bascule terminée/à faire, mise à jour, suppression)
 * - Recalcul automatique ou ajustement de l'avancement
 */

import { Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const updateProgressSchema = z.object({
  progressPercentage: z.number().min(0).max(100),
  status: z.enum(['in_progress', 'completed', 'on_hold']).optional(),
});

const createProjectSchema = z.object({
  clientId: z.string().min(1, 'Le client est requis'),
  title: z.string().min(3, 'Le titre doit comporter au moins 3 caractères').max(255),
  description: z.string().min(5, 'La description doit comporter au moins 5 caractères'),
  progressPercentage: z.number().min(0).max(100).optional(),
  status: z.enum(['in_progress', 'completed', 'on_hold']).default('in_progress'),
  targetDate: z.string().optional(),
  budget: z.string().optional(),
  initialActions: z.array(
    z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      assignedTo: z.enum(['admin', 'client']).default('admin'),
      dueDate: z.string().optional(),
    })
  ).optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(5).optional(),
  clientId: z.string().min(1).optional(),
  status: z.enum(['in_progress', 'completed', 'on_hold']).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  targetDate: z.string().optional(),
  budget: z.string().optional(),
});

const addActionSchema = z.object({
  title: z.string().min(2, 'Le titre de l\'action est requis'),
  description: z.string().optional(),
  assignedTo: z.enum(['admin', 'client']).default('admin'),
  dueDate: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).default('todo'),
});

const updateActionSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assignedTo: z.enum(['admin', 'client']).optional(),
  dueDate: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
});

/**
 * GET /api/projects
 * Liste les projets du client connecté, ou tous les projets pour l'admin
 */
export async function handleListProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const projects = req.user.role === 'admin'
    ? db.getAllProjects()
    : db.getProjectsByClientId(req.user.id);

  res.status(200).json({ projects });
}

/**
 * GET /api/projects/:id
 * Récupère le détail d'un projet avec ses actions et jalons
 */
export async function handleGetProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const { id } = req.params;
  const project = db.findProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Projet introuvable' });
    return;
  }

  // Vérification de sécurité multi-tenant (OWASP anti-IDOR)
  if (req.user.role !== 'admin' && project.clientId !== req.user.id) {
    res.status(403).json({ error: 'Accès non autorisé à ce projet' });
    return;
  }

  res.status(200).json({ project });
}

/**
 * POST /api/projects
 * Crée un projet pour un client (Admin)
 */
export async function handleCreateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Réservé aux administrateurs' });
    return;
  }

  const parseResult = createProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const project = db.createProject(parseResult.data);
  res.status(201).json({ success: true, project });
}

/**
 * PATCH /api/projects/:id
 * Modifie les informations générales d'un projet (Admin)
 */
export async function handleUpdateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Réservé aux administrateurs' });
    return;
  }

  const { id } = req.params;
  const parseResult = updateProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const updated = db.updateProject(id, parseResult.data);
  if (!updated) {
    res.status(404).json({ error: 'Projet introuvable' });
    return;
  }

  res.status(200).json({ success: true, project: updated });
}

/**
 * DELETE /api/projects/:id
 * Supprime un projet (Admin)
 */
export async function handleDeleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Réservé aux administrateurs' });
    return;
  }

  const { id } = req.params;
  const deleted = db.deleteProject(id);
  if (!deleted) {
    res.status(404).json({ error: 'Projet introuvable' });
    return;
  }

  res.status(200).json({ success: true, message: 'Projet supprimé avec succès' });
}

/**
 * PATCH /api/projects/:id/progress
 * Met à jour manuellement le taux d'avancement d'un projet (Admin)
 */
export async function handleUpdateProjectProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Réservé aux administrateurs' });
    return;
  }

  const { id } = req.params;
  const parseResult = updateProgressSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const updated = db.updateProjectProgress(id, parseResult.data.progressPercentage, parseResult.data.status);
  if (!updated) {
    res.status(404).json({ error: 'Projet introuvable' });
    return;
  }

  res.status(200).json({ success: true, project: updated });
}

/**
 * POST /api/projects/:id/actions
 * Ajoute une action ou un jalon dans le projet (Admin)
 */
export async function handleAddProjectAction(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Réservé aux administrateurs' });
    return;
  }

  const { id } = req.params;
  const parseResult = addActionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const result = db.addProjectAction(id, parseResult.data);
  if (!result) {
    res.status(404).json({ error: 'Projet introuvable' });
    return;
  }

  res.status(201).json({ success: true, project: result.project, action: result.action });
}

/**
 * PATCH /api/projects/:id/actions/:actionId/toggle
 * Coche / décoche une action (accessible à l'Admin, et au Client pour son propre projet)
 */
export async function handleToggleProjectAction(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const { id, actionId } = req.params;
  const result = db.toggleProjectAction(id, actionId, req.user.role, req.user.id);
  if (!result) {
    res.status(404).json({ error: 'Projet ou action introuvable, ou accès non autorisé' });
    return;
  }

  res.status(200).json({ success: true, project: result.project, action: result.action });
}

/**
 * PATCH /api/projects/:id/actions/:actionId
 * Modifie les détails d'une action (Admin)
 */
export async function handleUpdateProjectAction(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Réservé aux administrateurs' });
    return;
  }

  const { id, actionId } = req.params;
  const parseResult = updateActionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const result = db.updateProjectAction(id, actionId, parseResult.data);
  if (!result) {
    res.status(404).json({ error: 'Projet ou action introuvable' });
    return;
  }

  res.status(200).json({ success: true, project: result.project, action: result.action });
}

/**
 * DELETE /api/projects/:id/actions/:actionId
 * Supprime une action d'un projet (Admin)
 */
export async function handleDeleteProjectAction(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Réservé aux administrateurs' });
    return;
  }

  const { id, actionId } = req.params;
  const updatedProject = db.deleteProjectAction(id, actionId);
  if (!updatedProject) {
    res.status(404).json({ error: 'Projet introuvable' });
    return;
  }

  res.status(200).json({ success: true, project: updatedProject });
}

