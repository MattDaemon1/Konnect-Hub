/**
 * @file projectController.ts
 * @description Contrôleur de consultation des projets et de leur avancement
 */

import { Response } from 'express';
import { db } from '../db/index.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

/**
 * GET /api/projects
 * Liste les projets du client connecté
 */
export async function handleListProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const projects = db.getProjectsByClientId(req.user.id);
  res.status(200).json({ projects });
}
