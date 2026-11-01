/**
 * @file authMiddleware.ts
 * @description Middleware d'authentification par session JWT stocké dans un cookie HTTP-Only
 * Conforme aux directives OWASP :
 * - Aucun token dans le localStorage (protection absolue contre les vols de session via XSS).
 * - Vérification de la signature cryptographique du JWT.
 * - Validation du statut du compte client en base.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import { Client } from '../../types/index.ts';

// Clé secrète JWT (générée par variable d'environnement ou repli sécurisé)
export const JWT_SECRET = process.env.JWT_SECRET || 'konnect_extranet_secret_token_change_in_production_owasp_9876543210';
export const COOKIE_NAME = 'konnect_session';

export interface AuthenticatedRequest extends Request {
  user?: Client;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // 1. Extraction du cookie HTTP-Only (prioritaire) ou du header Bearer (pour tests API)
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({
      error: 'Non authentifié : session requise.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { clientId: string; email: string };

    const client = db.findClientById(decoded.clientId);
    if (!client) {
      res.status(401).json({
        error: 'Compte client introuvable ou supprimé.',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (client.status !== 'active') {
      res.status(403).json({
        error: 'Accès suspendu : veuillez contacter le support Matt Konnect.',
        code: 'ACCOUNT_SUSPENDED',
      });
      return;
    }

    // Attacher l'utilisateur vérifié à la requête
    req.user = client;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'Session expirée ou invalide. Veuillez vous reconnecter.',
      code: 'INVALID_SESSION',
    });
  }
}
