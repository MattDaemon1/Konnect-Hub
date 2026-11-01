/**
 * @file authController.ts
 * @description Contrôleur d'authentification pour My Konnect
 * - Double authentification : Mot de passe bcrypt OU Magic Link sécurisé
 * - Création de compte client réservée EXCLUSIVEMENT à l'Administrateur
 * - Forçage du changement de mot de passe à la première connexion (mustChangePassword)
 * - Sessions JWT stockées en cookie HTTP-Only, SameSite=Strict
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { sendEmail, buildMagicLinkTemplate, localEmailLogs } from '../services/emailService.ts';
import { COOKIE_NAME, JWT_SECRET, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

// Validation Zod pour la connexion Identifiant / Mot de passe
const passwordLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Adresse email invalide' }),
  password: z
    .string()
    .min(1, { message: 'Le mot de passe est obligatoire' }),
  expectedRole: z.enum(['client', 'admin']).optional(),
});

// Validation Zod changement de mot de passe obligatoire
const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, { message: 'Le mot de passe doit comporter au moins 6 caractères' })
    .max(100, { message: 'Le mot de passe est trop long' }),
});

// Validation Zod pour la création d'un client par l'Admin
const adminCreateClientSchema = z.object({
  name: z.string().trim().min(2, { message: 'Le nom du contact est requis' }),
  companyName: z.string().trim().min(2, { message: 'La raison sociale est requise' }),
  email: z.string().trim().email({ message: 'Adresse email invalide' }),
  initialPassword: z.string().min(6, { message: 'Le mot de passe temporaire doit faire au moins 6 caractères' }).optional(),
});

// Validation Zod du Magic Link
const magicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Adresse email invalide' })
    .max(255, { message: 'L\'adresse email est trop longue' }),
  role: z.enum(['client', 'admin']).optional(),
});

const verifyTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, { message: 'Format de token invalide' })
    .max(128, { message: 'Format de token invalide' }),
});

/**
 * POST /api/auth/login
 * Connexion par Identifiant (email) et Mot de passe
 */
export async function handleLoginWithPassword(req: Request, res: Response): Promise<void> {
  const parseResult = passwordLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Identifiants invalides',
    });
    return;
  }

  const { email, password, expectedRole } = parseResult.data;
  const client = db.findClientByEmail(email);

  if (!client) {
    res.status(401).json({
      error: 'Identifiant ou mot de passe incorrect.',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  if (client.status !== 'active') {
    res.status(403).json({
      error: 'Votre compte est inactif ou suspendu. Veuillez contacter l\'administrateur My Konnect.',
      code: 'ACCOUNT_SUSPENDED',
    });
    return;
  }

  if (expectedRole && client.role !== expectedRole) {
    res.status(403).json({
      error: expectedRole === 'admin'
        ? 'Ce compte ne dispose pas des privilèges d\'administration My Konnect.'
        : 'Veuillez utiliser l\'espace d\'administration pour ce compte.',
      code: 'ROLE_MISMATCH',
    });
    return;
  }

  if (!client.passwordHash) {
    res.status(401).json({
      error: 'Aucun mot de passe défini pour ce compte. Veuillez utiliser la connexion par lien magique.',
      code: 'NO_PASSWORD_SET',
    });
    return;
  }

  const passwordValid = bcrypt.compareSync(password, client.passwordHash);
  if (!passwordValid) {
    res.status(401).json({
      error: 'Identifiant ou mot de passe incorrect.',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  // Émission du token JWT
  const sessionPayload = {
    clientId: client.id,
    email: client.email,
    role: client.role,
  };

  const jwtToken = jwt.sign(sessionPayload, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Authentification réussie.',
    user: {
      id: client.id,
      name: client.name,
      companyName: client.companyName,
      email: client.email,
      role: client.role,
      status: client.status,
      mustChangePassword: client.mustChangePassword ?? false,
    },
  });
}

/**
 * POST /api/auth/change-password
 * Permet au client de définir son nouveau mot de passe (notamment lors de la première connexion)
 */
export async function handleChangePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Mot de passe invalide',
    });
    return;
  }

  const { newPassword } = parseResult.data;
  const updated = db.updatePassword(req.user.id, newPassword);

  if (!updated) {
    res.status(404).json({ error: 'Compte introuvable' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Votre mot de passe personnel a été enregistré avec succès.',
    user: {
      id: req.user.id,
      name: req.user.name,
      companyName: req.user.companyName,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      mustChangePassword: false,
    },
  });
}

/**
 * POST /api/clients
 * Création d'un nouveau compte client (RÉSERVÉ À L'ADMINISTRATEUR)
 */
export async function handleAdminCreateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Seul l\'administrateur peut créer le compte d\'un client.' });
    return;
  }

  const parseResult = adminCreateClientSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const { name, companyName, email, initialPassword } = parseResult.data;

  // Vérifier unicité email
  if (db.findClientByEmail(email)) {
    res.status(409).json({ error: 'Un compte avec cette adresse email existe déjà.' });
    return;
  }

  const newClient = db.createClientByAdmin({
    name,
    companyName,
    email,
    initialPassword: initialPassword || 'Client2026!',
  });

  res.status(201).json({
    success: true,
    message: `Compte client créé avec succès pour ${newClient.name}. Le client devra changer son mot de passe lors de sa première connexion.`,
    client: {
      id: newClient.id,
      name: newClient.name,
      companyName: newClient.companyName,
      email: newClient.email,
      role: newClient.role,
      status: newClient.status,
      mustChangePassword: newClient.mustChangePassword,
      createdAt: newClient.createdAt,
    },
  });
}

/**
 * POST /api/auth/magic-link
 * Envoi d'un lien magique (uniquement aux comptes existants créés par l'admin !)
 */
export async function handleRequestMagicLink(req: Request, res: Response): Promise<void> {
  const parseResult = magicLinkSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const { email } = parseResult.data;
  const client = db.findClientByEmail(email);

  // SEUL L'ADMIN PEUT CRÉER UN COMPTE CLIENT : Pas d'auto-création pour les emails inconnus
  if (!client) {
    res.status(404).json({
      error: 'Aucun compte associé à cette adresse email. Seul l\'administrateur My Konnect peut créer votre compte.',
    });
    return;
  }

  if (client.status !== 'active') {
    res.status(403).json({
      error: 'Votre compte est inactif ou suspendu. Contactez le support My Konnect.',
    });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  db.createMagicLink(client.id, tokenHash, expiresAt);

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const magicLinkUrl = `${protocol}://${host}/verify?token=${rawToken}`;

  const { html, text } = buildMagicLinkTemplate(client.name, magicLinkUrl, 15);
  const emailResult = await sendEmail(
    {
      to: client.email,
      subject: 'Connexion à votre espace My Konnect (Lien sécurisé à usage unique)',
      html,
      text,
    },
    magicLinkUrl
  );

  res.status(200).json({
    success: true,
    message: `Un lien de connexion sécurisé a été expédié à ${client.email}.`,
    expiresInMinutes: 15,
    simulated: emailResult.simulated,
    previewUrl: magicLinkUrl,
  });
}

/**
 * POST /api/auth/verify
 * Valide le token Magic Link et émet la session
 */
export async function handleVerifyMagicLink(req: Request, res: Response): Promise<void> {
  const parseResult = verifyTokenSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Jeton de vérification manquant ou corrompu.',
    });
    return;
  }

  const { token } = parseResult.data;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const magicRecord = db.findMagicLinkByHash(tokenHash);

  if (!magicRecord) {
    res.status(400).json({
      error: 'Lien de connexion invalide ou inconnu.',
      code: 'TOKEN_NOT_FOUND',
    });
    return;
  }

  if (magicRecord.used) {
    res.status(400).json({
      error: 'Ce lien de connexion a déjà été utilisé. Par mesure de sécurité, veuillez en demander un nouveau.',
      code: 'TOKEN_ALREADY_USED',
    });
    return;
  }

  if (new Date() > new Date(magicRecord.expiresAt)) {
    res.status(400).json({
      error: 'Ce lien a expiré (validité de 15 minutes dépassée). Veuillez demander un nouveau lien.',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  db.markMagicLinkAsUsed(magicRecord.id);

  const client = db.findClientById(magicRecord.clientId);
  if (!client || client.status !== 'active') {
    res.status(403).json({
      error: 'Compte inactif ou introuvable.',
      code: 'ACCOUNT_INVALID',
    });
    return;
  }

  const sessionPayload = {
    clientId: client.id,
    email: client.email,
    role: client.role,
  };

  const jwtToken = jwt.sign(sessionPayload, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Authentification réussie.',
    user: {
      id: client.id,
      name: client.name,
      companyName: client.companyName,
      email: client.email,
      role: client.role,
      status: client.status,
      mustChangePassword: client.mustChangePassword ?? false,
    },
  });
}

/**
 * GET /api/auth/me
 */
export async function handleGetSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  res.status(200).json({
    user: {
      id: req.user.id,
      name: req.user.name,
      companyName: req.user.companyName,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      mustChangePassword: req.user.mustChangePassword ?? false,
    },
  });
}

/**
 * POST /api/auth/logout
 */
export async function handleLogout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({
    success: true,
    message: 'Déconnexion effectuée avec succès.',
  });
}

/**
 * GET /api/auth/dev-inbox
 */
export async function handleGetDevInbox(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    emails: localEmailLogs,
  });
}
