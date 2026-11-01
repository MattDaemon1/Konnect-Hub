/**
 * @file ticketController.ts
 * @description Contrôleur de gestion des tickets de support client My Konnect
 * - Validation stricte des entrées utilisateurs via Zod (anti-XSS et injection)
 * - Notification email immédiate à l'administrateur
 * - Support des rôles Client (ses tickets) et Administrateur (tous les tickets + réponses)
 */

import { Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { sendEmail } from '../services/emailService.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

// Schéma de validation Zod anti-injection
const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, { message: 'L\'objet de la demande doit contenir au moins 3 caractères' })
    .max(150, { message: 'L\'objet ne peut pas dépasser 150 caractères' }),
  message: z
    .string()
    .trim()
    .min(10, { message: 'Votre message doit contenir au moins 10 caractères' })
    .max(3000, { message: 'Votre message ne peut pas dépasser 3 000 caractères' }),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
});

const replyTicketSchema = z.object({
  reply: z
    .string()
    .trim()
    .min(3, { message: 'La réponse doit comporter au moins 3 caractères' })
    .max(3000, { message: 'La réponse est trop longue' }),
  status: z.enum(['open', 'resolved']).optional(),
});

/**
 * GET /api/support
 * Renvoie la liste des tickets (du client connecté, ou de tous les clients si admin)
 */
export async function handleListTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const tickets = req.user.role === 'admin'
    ? db.getAllTickets()
    : db.getTicketsByClientId(req.user.id);

  res.status(200).json({ tickets });
}

/**
 * POST /api/support
 * Enregistre un nouveau ticket support et expédie une alerte email à l'admin
 */
export async function handleCreateTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const parseResult = createTicketSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données du ticket invalides',
    });
    return;
  }

  const { subject, message, priority } = parseResult.data;

  // Création du ticket rattaché au client en BDD
  const newTicket = db.createTicket({
    clientId: req.user.id,
    subject,
    message,
    priority,
  });

  // Expédition d'une alerte email à l'administrateur My Konnect
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@mykonnect.fr';
  const emailSubject = `[My Konnect Support] [${priority.toUpperCase()}] Nouveau ticket : ${subject}`;
  const emailText = `Nouveau ticket support reçu sur My Konnect :\n\nClient : ${req.user.name} (${req.user.companyName})\nEmail : ${req.user.email}\nPriorité : ${priority}\n\nObjet : ${subject}\n\nMessage :\n${message}\n\nIdentifiant Ticket : ${newTicket.id}`;
  const emailHtml = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
    <h3 style="color: #0f172a; margin-top: 0;">Nouveau ticket support client My Konnect</h3>
    <p><strong>Client :</strong> ${req.user.name} &bull; ${req.user.companyName}</p>
    <p><strong>Email :</strong> ${req.user.email}</p>
    <p><strong>Priorité :</strong> <span style="font-weight: bold; color: ${priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#d97706' : '#2563eb'};">${priority.toUpperCase()}</span></p>
    <p><strong>Objet :</strong> ${subject}</p>
    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 16px 0;">
    <p style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 4px;">${message}</p>
    <p style="font-size: 12px; color: #64748b;">Réf Ticket: ${newTicket.id} | Reçu le ${new Date().toLocaleString('fr-FR')}</p>
  </div>
</body>
</html>`;

  // Envoi asynchrone sans bloquer la réponse client
  sendEmail({
    to: adminEmail,
    subject: emailSubject,
    text: emailText,
    html: emailHtml,
  }).catch((err) => console.error('[Erreur Alerte Admin Ticket]:', err));

  res.status(201).json({
    success: true,
    message: 'Votre ticket de support a été enregistré avec succès. Un responsable My Konnect va vous répondre dans les plus brefs délais.',
    ticket: newTicket,
  });
}

/**
 * POST /api/support/:id/reply
 * Répondre à un ticket client (Réservé à l'administrateur)
 */
export async function handleReplyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    return;
  }

  const { id } = req.params;
  const parseResult = replyTicketSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues?.[0]?.message || 'Données invalides',
    });
    return;
  }

  const { reply, status } = parseResult.data;
  const updatedTicket = db.replyToTicket(id, reply, status || 'resolved');

  if (!updatedTicket) {
    res.status(404).json({ error: 'Ticket introuvable' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Réponse enregistrée avec succès.',
    ticket: updatedTicket,
  });
}
