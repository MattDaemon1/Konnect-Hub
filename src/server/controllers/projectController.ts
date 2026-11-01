/**
 * @file projectController.ts
 * @description Contrôleur de consultation et gestion des projets (Client & Admin)
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
  clientId: z.string().min(1),
  title: z.string().min(3).max(255),
  description: z.string().min(5),
  progressPercentage: z.number().min(0).max(100).default(0),
  status: z.enum(['in_progress', 'completed', 'on_hold']).default('in_progress'),
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
 * PATCH /api/projects/:id/progress
 * Met à jour le taux d'avancement d'un projet (Admin)
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
