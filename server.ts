/**
 * @file server.ts
 * @description Serveur Express de production & développement pour Konnect Client Portal
 * Hébergement ciblé : o2switch (Phusion Passenger / Node.js v20+)
 * Conforme aux directives OWASP Top 10 & RGPD
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  handleLoginWithPassword,
  handleRequestMagicLink,
  handleVerifyMagicLink,
  handleGetSession,
  handleLogout,
  handleGetDevInbox,
  handleChangePassword,
  handleAdminCreateClient,
} from './src/server/controllers/authController.ts';
import {
  handleListDocuments,
  handleDownloadDocument,
  handleUploadDocument,
} from './src/server/controllers/documentController.ts';
import {
  handleListProjects,
  handleCreateProject,
  handleUpdateProjectProgress,
} from './src/server/controllers/projectController.ts';
import {
  handleListTickets,
  handleCreateTicket,
  handleReplyTicket,
} from './src/server/controllers/ticketController.ts';
import { requireAuth } from './src/server/middleware/authMiddleware.ts';
import { db } from './src/server/db/index.ts';
import { MARIADB_SCHEMA_SQL } from './src/server/db/schema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function bootstrapServer() {
  const app = express();

  // Définir que le serveur est derrière un reverse proxy (LiteSpeed / Passenger sur o2switch)
  app.set('trust proxy', 1);

  // =========================================================================
  // 1. SÉCURISATION DES EN-TÊTES HTTP (HELMET.JS - OWASP)
  // =========================================================================
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'blob:'],
              connectSrc: ["'self'"],
              frameSrc: ["'self'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false, // Assouplir le CSP en mode dev pour Vite HMR et scripts de preview
      crossOriginEmbedderPolicy: false,
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 an
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  );

  // =========================================================================
  // 2. PARSERS & COOKIES SÉCURISÉS
  // =========================================================================
  app.use(express.json({ limit: '15mb' })); // Support uploads documents chiffrés
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // CORS sécurisé avec support des identifiants (cookies de session)
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // =========================================================================
  // 3. RATE LIMITING (EXPRESS-RATE-LIMIT)
  // =========================================================================
  // Limiteur global sur toutes les routes API
  const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Trop de requêtes détectées depuis cette adresse IP. Veuillez patienter 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  });
  app.use('/api', globalApiLimiter);

  // Limiteur strict anti-brute force / anti-spam sur la génération de Magic Links
  const magicLinkLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Trop de demandes de Magic Link envoyées. Veuillez patienter 15 minutes avant de réessayer.',
      code: 'MAGIC_LINK_RATE_LIMIT',
    },
  });

  // =========================================================================
  // 4. ROUTES D'API REST SÉCURISÉES
  // =========================================================================

  // --- Authentification ---
  app.post('/api/auth/login', handleLoginWithPassword);
  app.post('/api/auth/change-password', requireAuth, handleChangePassword);
  app.post('/api/auth/magic-link', magicLinkLimiter, handleRequestMagicLink);
  app.post('/api/auth/verify', handleVerifyMagicLink);
  app.get('/api/auth/me', requireAuth, handleGetSession);
  app.post('/api/auth/logout', handleLogout);
  app.get('/api/auth/dev-inbox', handleGetDevInbox);

  // --- Clients (Administration) ---
  app.get('/api/clients', requireAuth, (req: any, res: Response) => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      return;
    }
    const clients = db.getAllClients().map((c) => ({
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      email: c.email,
      role: c.role,
      status: c.status,
      mustChangePassword: c.mustChangePassword,
      createdAt: c.createdAt,
    }));
    res.status(200).json({ clients });
  });
  app.post('/api/clients', requireAuth, handleAdminCreateClient);

  // --- Documents (Coffre-fort avec protection IDOR & Dépôt sécurisé) ---
  app.get('/api/documents', requireAuth, handleListDocuments);
  app.get('/api/documents/:id/download', requireAuth, handleDownloadDocument);
  app.post('/api/documents/upload', requireAuth, handleUploadDocument);

  // --- Projets & Avancement ---
  app.get('/api/projects', requireAuth, handleListProjects);
  app.post('/api/projects', requireAuth, handleCreateProject);
  app.patch('/api/projects/:id/progress', requireAuth, handleUpdateProjectProgress);

  // --- Tickets de Support & Alertes Admin ---
  app.get('/api/support', requireAuth, handleListTickets);
  app.post('/api/support', requireAuth, handleCreateTicket);
  app.post('/api/support/:id/reply', requireAuth, handleReplyTicket);

  // --- Utilitaire d'export DDL MariaDB o2switch ---
  app.get('/api/system/schema-sql', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(MARIADB_SCHEMA_SQL);
  });

  // Health check pour Phusion Passenger / Monitoring o2switch
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      app: 'My Konnect',
      server: 'Node.js on LiteSpeed/Passenger (o2switch)',
      timestamp: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 5. INTÉGRATION VITE (DEV) OU STATIC FILES (PROD)
  // =========================================================================
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Mode production : service des assets compilés dans dist/
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // =========================================================================
  // 6. GESTIONNAIRE D'ERREURS GLOBAL (SANS LEAK DE STACK TRACE)
  // =========================================================================
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Express Error]:', err);
    res.status(500).json({
      error: 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  // Démarrage du serveur Express
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Konnect Client Portal] Serveur actif sur http://0.0.0.0:${PORT}`);
  });
}

bootstrapServer().catch((err) => {
  console.error('[Fatal Bootstrap Error]:', err);
  process.exit(1);
});
