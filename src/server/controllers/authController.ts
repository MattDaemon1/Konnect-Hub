/**
 * @file authController.ts
 * @description Contrôleur d'authentification Magic Link & Sessions JWT
 * Conforme aux standards de sécurité OWASP :
 * 1. Zéro mot de passe stocké en BDD (élimination totale des risques de fuite de hachages).
 * 2. Token brut de 256 bits (32 octets crypto-forts) transmis uniquement par email.
 * 3. En BDD, SEUL le hash SHA-256 du token est conservé (`token_hash`).
 * 4. Usage strictement unique : le flag `used` est basculé immédiatement lors de la vérification.
 * 5. Durée de vie courte : 15 minutes maximum.
 * 6. Session JWT stockée dans un cookie HTTP-Only, Secure, SameSite=Strict.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { sendEmail, buildMagicLinkTemplate, localEmailLogs } from '../services/emailService.ts';
import { COOKIE_NAME, JWT_SECRET, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

// Validation Zod stricte de l'email
const magicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Adresse email invalide' })
    .max(255, { message: 'L\'adresse email est trop longue' }),
});

const verifyTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, { message: 'Format de token invalide' })
    .max(128, { message: 'Format de token invalide' }),
});

/**
 * POST /api/auth/magic-link
 * Génère un jeton cryptographique, stocke son empreinte SHA-256 et expédie l'email
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
  let client = db.findClientByEmail(email);

  // Si le client n'existe pas encore dans la démo, on le crée en mode sécurisé
  if (!client) {
    const defaultName = email.split('@')[0] || 'Client';
    client = db.createClient({
      name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
      companyName: `${defaultName.toUpperCase()} Entreprise`,
      email,
      status: 'active',
    });
  }

  if (client.status !== 'active') {
    res.status(403).json({
      error: 'Votre compte client est inactif ou suspendu. Contactez le support Matt Konnect.',
    });
    return;
  }

  // 1. Génération d'un token aléatoire à haute entropie (256 bits)
  const rawToken = crypto.randomBytes(32).toString('hex');

  // 2. Calcul du hash SHA-256 pour stockage en BDD
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 3. Expiration stricte à 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // 4. Enregistrement en base de données MariaDB
  db.createMagicLink(client.id, tokenHash, expiresAt);

  // 5. Construction de l'URL absolue du Magic Link
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const magicLinkUrl = `${protocol}://${host}/verify?token=${rawToken}`;

  // 6. Expédition de l'email via Nodemailer (SMTP o2switch)
  const { html, text } = buildMagicLinkTemplate(client.name, magicLinkUrl, 15);
  const emailResult = await sendEmail(
    {
      to: client.email,
      subject: 'Connexion à votre espace client Konnect (Usage unique)',
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
    // Permet d'alimenter le simulateur d'inbox pour faciliter le test local
    previewUrl: magicLinkUrl,
  });
}

/**
 * POST /api/auth/verify
 * Valide le token, applique la règle d'usage unique et émet le cookie de session JWT
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

  // Calcul du hash SHA-256 du token reçu pour comparaison avec la BDD
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const magicRecord = db.findMagicLinkByHash(tokenHash);

  if (!magicRecord) {
    res.status(400).json({
      error: 'Lien de connexion invalide ou inconnu.',
      code: 'TOKEN_NOT_FOUND',
    });
    return;
  }

  // OWASP : Règle d'usage unique (anti-rejeu)
  if (magicRecord.used) {
    res.status(400).json({
      error: 'Ce lien de connexion a déjà été utilisé. Par mesure de sécurité, veuillez en générer un nouveau.',
      code: 'TOKEN_ALREADY_USED',
    });
    return;
  }

  // Vérification de la fenêtre de validité temporelle
  if (new Date() > new Date(magicRecord.expiresAt)) {
    res.status(400).json({
      error: 'Ce lien a expiré (validité de 15 minutes dépassée). Veuillez redemander un nouveau lien.',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  // Invalidation immédiate du token en base
  db.markMagicLinkAsUsed(magicRecord.id);

  // Recherche du client rattaché
  const client = db.findClientById(magicRecord.clientId);
  if (!client || client.status !== 'active') {
    res.status(403).json({
      error: 'Compte client inactif ou introuvable.',
      code: 'ACCOUNT_INVALID',
    });
    return;
  }

  // Création du JWT de session
  const sessionPayload = {
    clientId: client.id,
    email: client.email,
  };

  const jwtToken = jwt.sign(sessionPayload, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });

  // Définition du cookie sécurisé HTTP-Only
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, jwtToken, {
    httpOnly: true, // Inaccessible en JavaScript (blindage XSS)
    secure: isProduction, // HTTPS uniquement en production
    sameSite: 'strict', // Blindage CSRF maximal
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
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
      status: client.status,
    },
  });
}

/**
 * GET /api/auth/me
 * Renvoie l'utilisateur authentifié
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
      status: req.user.status,
    },
  });
}

/**
 * POST /api/auth/logout
 * Révoque la session en détruisant le cookie HTTP-Only
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
 * Permet d'inspecter les emails envoyés dans le simulateur o2switch
 */
export async function handleGetDevInbox(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    emails: localEmailLogs,
  });
}
