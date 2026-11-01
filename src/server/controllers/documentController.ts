/**
 * @file documentController.ts
 * @description Contrôleur de gestion sécurisée des documents (Audits, Factures, Livrables)
 * Conforme aux directives OWASP & RGPD :
 * 1. Zéro accès direct via URL statique : les fichiers sont placés HORS de public_html.
 * 2. Protection stricte contre l'IDOR (Insecure Direct Object Reference) :
 *    Vérification obligatoire de la correspondance entre `req.user.id` et `doc.clientId`.
 * 3. Blindage contre le Path Traversal :
 *    Résolution du chemin absolu et vérification de son confinement dans `PRIVATE_STORAGE_DIR`.
 * 4. Cache-Control privé (RGPD) : interdiction de mise en cache sur proxies intermédiaires.
 */

import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db, PRIVATE_STORAGE_DIR } from '../db/index.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

/**
 * GET /api/documents
 * Récupère la liste des métadonnées des documents du client connecté uniquement.
 * Le chemin physique 'filePath' est volontairement omis de la réponse JSON pour ne pas divulguer l'arborescence serveur.
 */
export async function handleListDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const clientDocuments = db.getDocumentsByClientId(req.user.id);

  // Masquage du chemin physique du serveur pour le client
  const safeDocuments = clientDocuments.map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt,
    mimeType: doc.mimeType || 'application/pdf',
  }));

  res.status(200).json({
    documents: safeDocuments,
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

  // =========================================================================
  // BLINDAGE OWASP N°1 : PRÉVENTION DE L'IDOR (Insecure Direct Object Reference)
  // Vérification stricte de la propriété du document par le client connecté
  // =========================================================================
  if (doc.clientId !== req.user.id) {
    console.warn(`[Alerte Sécurité OWASP - Tentative IDOR] Le client "${req.user.id}" a tenté d'accéder au document "${doc.id}" appartenant à "${doc.clientId}"`);
    res.status(403).json({
      error: 'Accès refusé : vous n\'avez pas les droits nécessaires pour accéder à ce document.',
      code: 'IDOR_ACCESS_DENIED',
    });
    return;
  }

  // =========================================================================
  // BLINDAGE OWASP N°2 : PRÉVENTION DU PATH TRAVERSAL (../ etc.)
  // Le chemin du fichier doit être confiné strictement au répertoire de stockage privé
  // =========================================================================
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

  // Vérification de l'existence effective du fichier
  if (!fs.existsSync(resolvedPath)) {
    res.status(404).json({
      error: 'Le fichier physique associé est manquant sur le stockage sécurisé.',
      code: 'FILE_NOT_FOUND',
    });
    return;
  }

  // =========================================================================
  // SÉCURISATION DES EN-TÊTES HTTP DE TRANSMISSION DU FICHIER
  // =========================================================================
  const stats = fs.statSync(resolvedPath);
  const baseFilename = path.basename(resolvedPath);
  // Nettoyage strict du nom de fichier pour le header Content-Disposition
  const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

  res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
  // RGPD & Confidentialité : Ne pas cacher les documents sensibles dans les mandataires
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Envoi en flux continu (stream) pour économiser la mémoire du serveur mutualisé o2switch
  const fileStream = fs.createReadStream(resolvedPath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('[Erreur Streaming Document]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors du streaming du document' });
    }
  });
}
