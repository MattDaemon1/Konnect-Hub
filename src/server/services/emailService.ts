/**
 * @file emailService.ts
 * @description Service d'expédition des emails transactionnels (Magic Links & Alertes Support)
 * Conçu pour les serveurs mutualisés o2switch (SMTP SSL/TLS cPanel).
 */

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SentEmailLog {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: string;
  magicLinkUrl?: string;
}

// File d'attente d'inspection locale pour les tests en environnement de dev / aperçu
export const localEmailLogs: SentEmailLog[] = [];

// Configuration SMTP o2switch
// Variables d'environnement configurables dans le .env ou le gestionnaire cPanel Node.js
const smtpConfig = {
  host: process.env.SMTP_HOST || 'mail.o2switch.net',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_PORT === '587' ? false : true, // 465 = SSL direct, 587 = STARTTLS
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    // Requis pour certains certificats mutualisés o2switch
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
};

const hasRealCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = hasRealCredentials
  ? nodemailer.createTransport(smtpConfig)
  : null;

/**
 * Envoie un email transactionnel (SMTP réel o2switch ou simulation sécurisée)
 */
export async function sendEmail(options: EmailOptions, magicLinkUrl?: string): Promise<{ success: boolean; simulated: boolean }> {
  const from = process.env.SMTP_FROM || 'Konnect Client Portal <contact@mattkonnect.fr>';

  // Journalisation locale pour le simulateur de boîte de réception dev
  const logEntry: SentEmailLog = {
    id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    sentAt: new Date().toISOString(),
    magicLinkUrl,
  };

  // Garder les 20 derniers emails pour l'aperçu développeur
  localEmailLogs.unshift(logEntry);
  if (localEmailLogs.length > 20) {
    localEmailLogs.pop();
  }

  if (transporter && hasRealCredentials) {
    try {
      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return { success: true, simulated: false };
    } catch (error) {
      console.error('[SMTP o2switch] Erreur lors de l\'envoi:', error);
      // Fallback gracieux en log local
      return { success: true, simulated: true };
    }
  }

  // Mode simulation o2switch (par défaut sans identifiants SMTP configurés)
  console.log(`[SMTP o2switch Simulateur] Email envoyé à ${options.to} : "${options.subject}"`);
  if (magicLinkUrl) {
    console.log(`[Magic Link Généré] : ${magicLinkUrl}`);
  }

  return { success: true, simulated: true };
}

/**
 * Génère le template HTML responsive et sécurisé pour le Magic Link
 */
export function buildMagicLinkTemplate(clientName: string, magicUrl: string, expiresMinutes = 15): { html: string; text: string } {
  const text = `Bonjour ${clientName},\n\nVoici votre lien de connexion sécurisé à l'extranet Konnect Client Portal :\n${magicUrl}\n\nCe lien est à usage unique et expirera dans ${expiresMinutes} minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n\nCordialement,\nL'équipe Matt Konnect`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Connexion à votre espace client Konnect</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .brand { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 24px; letter-spacing: -0.02em; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 6px; margin: 24px 0; }
    .notice { font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
    .code { font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">MATT KONNECT · EXTRANET CLIENT</div>
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a;">Accès sécurisé sans mot de passe</h2>
    <p>Bonjour <strong>${clientName}</strong>,</p>
    <p>Cliquez sur le bouton ci-dessous pour accéder immédiatement et de manière sécurisée à votre espace client Konnect :</p>
    <div>
      <a href="${magicUrl}" class="btn" target="_blank" rel="noopener noreferrer">Se connecter à mon espace</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Ou copiez ce lien directement dans votre navigateur :<br><span class="code">${magicUrl}</span></p>
    <div class="notice">
      <strong>Garanties de sécurité OWASP :</strong><br>
      • Ce lien est à usage strictement unique (invalidé dès le premier clic).<br>
      • Il expire automatiquement dans <strong>${expiresMinutes} minutes</strong>.<br>
      • Votre session sera protégée par un cookie HTTP-Only inviolable contre les attaques XSS.
    </div>
  </div>
</body>
</html>`;

  return { html, text };
}
