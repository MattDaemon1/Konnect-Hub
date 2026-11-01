/**
 * @file documentController.ts
 * @description Contrôleur de gestion sécurisée des documents (Audits, Factures, Livrables, Dépôts)
 * Conforme aux directives OWASP & RGPD :
 * 1. Zéro accès direct via URL statique : les fichiers sont placés HORS de public_html.
 * 2. Protection stricte contre l'IDOR (Insecure Direct Object Reference).
 * 3. Dépôt de document autorisé pour le Client ET l'Administrateur.
 * 4. Blindage contre le Path Traversal et streaming protégé.
 */

import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { db, PRIVATE_STORAGE_DIR } from '../db/index.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const uploadDocumentSchema = z.object({
  title: z.string().trim().min(3, { message: 'Le titre du document doit comporter au moins 3 caractères' }),
  category: z.enum(['audit_seo', 'audit_rgpd', 'facture', 'livrable', 'autre']),
  filename: z.string().trim().min(1, { message: 'Nom de fichier requis' }),
  fileData: z.string().min(1, { message: 'Contenu du fichier requis' }),
  mimeType: z.string().optional(),
  targetClientId: z.string().optional(),
});

/**
 * GET /api/documents
 * Récupère la liste des métadonnées des documents du client connecté uniquement (ou tous si admin).
 */
export async function handleListDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const clientDocuments = req.user.role === 'admin'
    ? db.getAllDocuments()
    : db.getDocumentsByClientId(req.user.id);

  const safeDocuments = clientDocuments.map((doc) => ({
    id: doc.id,
    clientId: doc.clientId,
    clientName: doc.clientName,
    clientCompany: doc.clientCompany,
    title: doc.title,
    category: doc.category,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt,
    mimeType: doc.mimeType || 'application/pdf',
    uploadedBy: doc.uploadedBy || 'admin',
  }));

  res.status(200).json({
    documents: safeDocuments,
  });
}

/**
 * POST /api/documents/upload
 * Permet au Client et à l'Administrateur de déposer un document dans le coffre-fort
 */
export async function handleUploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const parseResult = uploadDocumentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données du document invalides',
    });
    return;
  }

  const { title, category, filename, fileData, mimeType, targetClientId } = parseResult.data;

  // Détermination du client cible
  let assignedClientId = req.user.id;
  if (req.user.role === 'admin' && targetClientId) {
    const target = db.findClientById(targetClientId);
    if (!target) {
      res.status(404).json({ error: 'Client cible introuvable' });
      return;
    }
    assignedClientId = target.id;
  }

  // Décodage du contenu du fichier (base64 data URL ou chaîne brute)
  let buffer: Buffer;
  try {
    if (fileData.includes(';base64,')) {
      const base64Content = fileData.split(';base64,').pop() || '';
      buffer = Buffer.from(base64Content, 'base64');
    } else {
      buffer = Buffer.from(fileData, 'utf-8');
    }
  } catch {
    res.status(400).json({ error: 'Format de fichier corrompu ou illisible' });
    return;
  }

  // Enregistrement sécurisé dans private_storage (hors public_html)
  const newDoc = db.saveUploadedDocument({
    clientId: assignedClientId,
    title,
    category,
    filename,
    fileBuffer: buffer,
    mimeType: mimeType || 'application/pdf',
    uploadedBy: req.user.role,
  });

  res.status(201).json({
    success: true,
    message: 'Document déposé avec succès dans le coffre-fort.',
    document: {
      id: newDoc.id,
      clientId: newDoc.clientId,
      clientName: newDoc.clientName,
      clientCompany: newDoc.clientCompany,
      title: newDoc.title,
      category: newDoc.category,
      fileSize: newDoc.fileSize,
      createdAt: newDoc.createdAt,
      mimeType: newDoc.mimeType,
      uploadedBy: newDoc.uploadedBy,
    },
  });
}

/**
 * GET /api/documents/:id/download
 * Route de téléchargement ultra-sécurisée avec contrôle d'autorisation RBAC / Multi-Tenant.
 */
export async function handleDownloadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const { id } = req.params;
  const doc = db.findDocumentById(id);

  if (!doc) {
    res.status(404).json({
      error: 'Document introuvable.',
      code: 'DOCUMENT_NOT_FOUND',
    });
    return;
  }

  // Protection IDOR : seul l'admin ou le propriétaire du document peut y accéder
  if (req.user.role !== 'admin' && doc.clientId !== req.user.id) {
    console.warn(`[Alerte Sécurité OWASP - Tentative IDOR] Le client "${req.user.id}" a tenté d'accéder au document "${doc.id}" appartenant à "${doc.clientId}"`);
    res.status(403).json({
      error: 'Accès refusé : vous n\'avez pas les droits nécessaires pour accéder à ce document.',
      code: 'IDOR_ACCESS_DENIED',
    });
    return;
  }

  const resolvedPath = path.resolve(doc.filePath);
  const normalizedStorageDir = path.resolve(PRIVATE_STORAGE_DIR);

  if (!resolvedPath.startsWith(normalizedStorageDir)) {
    console.error(`[Alerte Sécurité OWASP - Path Traversal] Chemin suspect détecté : ${resolvedPath}`);
    res.status(403).json({
      error: 'Accès au fichier interdit.',
      code: 'PATH_TRAVERSAL_DETECTED',
    });
    return;
  }

  if (!fs.existsSync(resolvedPath)) {
    res.status(404).json({
      error: 'Le fichier physique associé est manquant sur le stockage sécurisé.',
      code: 'FILE_NOT_FOUND',
    });
    return;
  }

  const stats = fs.statSync(resolvedPath);
  const baseFilename = path.basename(resolvedPath);
  const sanitizedFilename = baseFilename.replace(/^[0-9]+_/, '').replace(/[^a-zA-Z0-9._-]/g, '_');

  res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const fileStream = fs.createReadStream(resolvedPath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('[Erreur Streaming Document]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors du streaming du document' });
    }
  });
}
