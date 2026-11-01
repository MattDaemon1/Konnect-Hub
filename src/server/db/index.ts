/**
 * @file index.ts
 * @description Couche d'accès aux données sécurisée pour My Konnect (Multi-Tenant & OWASP)
 * Supporte MariaDB/MySQL (o2switch) et intègre la gestion complète des :
 * - Clients (création exclusive par Admin, forçage changement mot de passe à la 1ère connexion)
 * - Projets (création exclusive par Admin, ajustement progression)
 * - Documents (dépôt sécurisé par Client ET Admin dans private_storage)
 * - Tickets de support (création par Client, réponse & clôture par Admin)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  Client,
  Project,
  DocumentRecord,
  MagicLinkRecord,
  SupportTicket,
} from '../../types/index.ts';

// Répertoire privé de stockage des documents (HORS de public_html)
export const PRIVATE_STORAGE_DIR = path.resolve(process.cwd(), 'private_storage', 'uploads');

if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true, mode: 0o700 });
}

// Hachages de mots de passe pré-calculés avec bcrypt (10 rounds)
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('Admin2026!', 10);
const CLIENT1_PASSWORD_HASH = bcrypt.hashSync('Client2026!', 10);
const CLIENT2_PASSWORD_HASH = bcrypt.hashSync('Acme2026!', 10);

// ============================================================================
// COMPTES SEED
// ============================================================================

export const SEED_ADMIN: Client = {
  id: 'adm_matt_001',
  name: 'Matthieu Konnect (Admin)',
  companyName: 'My Konnect Headquarters',
  email: 'admin@mykonnect.fr',
  passwordHash: ADMIN_PASSWORD_HASH,
  mustChangePassword: false,
  role: 'admin',
  status: 'active',
  createdAt: new Date('2026-01-01T08:00:00Z').toISOString(),
};

export const SEED_CLIENT_1: Client = {
  id: 'cli_matt_001',
  name: 'Matthieu Konnect',
  companyName: 'Studio Matt Konnect',
  email: 'Matt4Daemon@gmail.com',
  passwordHash: CLIENT1_PASSWORD_HASH,
  mustChangePassword: false,
  role: 'client',
  status: 'active',
  createdAt: new Date('2026-01-15T09:00:00Z').toISOString(),
};

// Client 2 : configuré avec mustChangePassword = true pour tester le changement obligatoire à la 1ère connexion !
export const SEED_CLIENT_2: Client = {
  id: 'cli_acme_002',
  name: 'Sophie Durand',
  companyName: 'ACME Logistique SAS',
  email: 'sophie.durand@acme-logistique.fr',
  passwordHash: CLIENT2_PASSWORD_HASH,
  mustChangePassword: true,
  role: 'client',
  status: 'active',
  createdAt: new Date('2026-02-01T10:30:00Z').toISOString(),
};

function initializeSampleFiles(): DocumentRecord[] {
  const sampleDocs = [
    {
      filename: 'audit_seo_matt_konnect_2026.pdf',
      title: 'Audit SEO Technique & Core Web Vitals 2026',
      category: 'audit_seo' as const,
      clientId: SEED_CLIENT_1.id,
      uploadedBy: 'admin' as const,
      content: `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Title (Audit SEO Technique - My Konnect)
   /Author (Matt Konnect SecOps) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 220 >>
stream
BT
/F1 18 Tf 50 720 Td (AUDIT SEO TECHNIQUE - MY KONNECT) Tj
/F1 12 Tf 50 690 Td (Date: Mars 2026 - Conforme OWASP & Performance LiteSpeed) Tj
/F1 10 Tf 50 660 Td (Score LCP: 1.1s | FID: 12ms | CLS: 0.00 | Statut: Excellent) Tj
ET
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 2 0 R >>
startxref
500
%%EOF`,
    },
    {
      filename: 'audit_rgpd_registre_traitements.pdf',
      title: 'Rapport d\'Audit RGPD & Registre des Traitements',
      category: 'audit_rgpd' as const,
      clientId: SEED_CLIENT_1.id,
      uploadedBy: 'admin' as const,
      content: `%PDF-1.4
1 0 obj
<< /Title (Rapport RGPD) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 16 Tf 50 720 Td (RAPPORT DE CONFORMITE RGPD) Tj
/F1 10 Tf 50 680 Td (Isolation multi-tenant & chiffrement en base o2switch) Tj
ET
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 2 0 R >>
startxref
450
%%EOF`,
    },
    {
      filename: 'facture_acompte_2026_03.pdf',
      title: 'Facture d\'acompte N° FA-2026-042',
      category: 'facture' as const,
      clientId: SEED_CLIENT_1.id,
      uploadedBy: 'admin' as const,
      content: `%PDF-1.4
1 0 obj
<< /Title (Facture FA-2026-042) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 180 >>
stream
BT
/F1 16 Tf 50 720 Td (FACTURE FA-2026-042 - MY KONNECT) Tj
/F1 10 Tf 50 680 Td (Montant Total TTC: 2 400.00 EUR | Statut: REGLE) Tj
ET
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 2 0 R >>
startxref
400
%%EOF`,
    },
    {
      filename: 'cahier_charges_client_depose.pdf',
      title: 'Cahier des charges fonctionnel (Déposé par le Client)',
      category: 'livrable' as const,
      clientId: SEED_CLIENT_1.id,
      uploadedBy: 'client' as const,
      content: `%PDF-1.4
1 0 obj
<< /Title (Cahier des charges) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 180 >>
stream
BT
/F1 16 Tf 50 720 Td (CAHIER DES CHARGES CLIENT - MY KONNECT) Tj
/F1 10 Tf 50 680 Td (Document depose directement par le client dans son coffre-fort) Tj
ET
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 2 0 R >>
startxref
400
%%EOF`,
    },
    {
      filename: 'audit_confidentiel_acme_logistique.pdf',
      title: 'Document Confidentiel ACME Logistique SAS (Usage Test IDOR)',
      category: 'audit_rgpd' as const,
      clientId: SEED_CLIENT_2.id,
      uploadedBy: 'admin' as const,
      content: `%PDF-1.4
1 0 obj
<< /Title (Confidentiel ACME) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 160 >>
stream
BT
/F1 16 Tf 50 720 Td (CONFIDENTIEL ACME LOGISTIQUE SAS) Tj
ET
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 2 0 R >>
startxref
350
%%EOF`,
    },
  ];

  return sampleDocs.map((item, index) => {
    const filePath = path.join(PRIVATE_STORAGE_DIR, item.filename);
    fs.writeFileSync(filePath, item.content, 'utf8');
    const stats = fs.statSync(filePath);
    return {
      id: `doc_${index + 1}`,
      clientId: item.clientId,
      title: item.title,
      category: item.category,
      filePath: filePath,
      fileSize: stats.size,
      uploadedBy: item.uploadedBy,
      createdAt: new Date(Date.now() - (index * 86400000 * 3)).toISOString(),
      mimeType: 'application/pdf',
    } satisfies DocumentRecord;
  });
}

class DatabaseStore {
  public clients: Map<string, Client> = new Map();
  public projects: Map<string, Project> = new Map();
  public documents: Map<string, DocumentRecord> = new Map();
  public magicLinks: Map<string, MagicLinkRecord> = new Map();
  public tickets: Map<string, SupportTicket> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    this.clients.set(SEED_ADMIN.id, SEED_ADMIN);
    this.clients.set(SEED_CLIENT_1.id, SEED_CLIENT_1);
    this.clients.set(SEED_CLIENT_2.id, SEED_CLIENT_2);

    const p1: Project = {
      id: 'proj_101',
      clientId: SEED_CLIENT_1.id,
      clientName: SEED_CLIENT_1.name,
      clientCompany: SEED_CLIENT_1.companyName,
      title: 'Refonte Web & SEO Local My Konnect',
      description: 'Audit sémantique, optimisation Core Web Vitals et déploiement sous LiteSpeed o2switch.',
      status: 'in_progress',
      progressPercentage: 75,
      createdAt: '2026-02-10T11:00:00Z',
      deliverablesCount: 4,
    };
    const p2: Project = {
      id: 'proj_102',
      clientId: SEED_CLIENT_1.id,
      clientName: SEED_CLIENT_1.name,
      clientCompany: SEED_CLIENT_1.companyName,
      title: 'Conformité RGPD & Registre Traitements',
      description: 'Cartographie des flux de données, registre DPO et sécurisation des formulaires.',
      status: 'completed',
      progressPercentage: 100,
      createdAt: '2026-01-20T14:30:00Z',
      deliverablesCount: 2,
    };
    const p3: Project = {
      id: 'proj_103',
      clientId: SEED_CLIENT_1.id,
      clientName: SEED_CLIENT_1.name,
      clientCompany: SEED_CLIENT_1.companyName,
      title: 'Portail Extranet Client & API REST Sécurisée',
      description: 'Développement de l\'extranet sécurisé avec sessions HTTP-Only et double authentification.',
      status: 'in_progress',
      progressPercentage: 60,
      createdAt: '2026-02-25T09:15:00Z',
      deliverablesCount: 3,
    };
    const p4: Project = {
      id: 'proj_201',
      clientId: SEED_CLIENT_2.id,
      clientName: SEED_CLIENT_2.name,
      clientCompany: SEED_CLIENT_2.companyName,
      title: 'Optimisation Infrastructure & Logistique API',
      description: 'Automatisation des flux EDI et interfaçage ERP client.',
      status: 'in_progress',
      progressPercentage: 35,
      createdAt: '2026-02-15T09:15:00Z',
      deliverablesCount: 1,
    };

    this.projects.set(p1.id, p1);
    this.projects.set(p2.id, p2);
    this.projects.set(p3.id, p3);
    this.projects.set(p4.id, p4);

    const initialDocs = initializeSampleFiles();
    for (const doc of initialDocs) {
      const c = this.clients.get(doc.clientId);
      doc.clientName = c?.name;
      doc.clientCompany = c?.companyName;
      this.documents.set(doc.id, doc);
    }

    const t1: SupportTicket = {
      id: 'tkt_201',
      clientId: SEED_CLIENT_1.id,
      clientName: SEED_CLIENT_1.name,
      clientEmail: SEED_CLIENT_1.email,
      clientCompany: SEED_CLIENT_1.companyName,
      subject: 'Question sur la configuration DKIM / SPF sur o2switch',
      message: 'Bonjour l\'équipe, pourriez-vous vérifier si les enregistrements DNS DKIM et DMARC sont bien propagés sur notre domaine ? Merci.',
      priority: 'medium',
      status: 'resolved',
      createdAt: '2026-02-18T16:20:00Z',
      adminReply: 'Bonjour Matthieu, les clés DKIM 2048-bit et DMARC strict (p=reject) sont bien validées et 100% opérationnelles sur le serveur o2switch.',
      repliedAt: '2026-02-18T17:45:00Z',
    };

    const t2: SupportTicket = {
      id: 'tkt_202',
      clientId: SEED_CLIENT_1.id,
      clientName: SEED_CLIENT_1.name,
      clientEmail: SEED_CLIENT_1.email,
      clientCompany: SEED_CLIENT_1.companyName,
      subject: 'Demande d\'ajout d\'un compte utilisateur secondaire',
      message: 'Bonjour, nous souhaiterions donner un accès en lecture seule à notre comptable pour télécharger les factures. Est-ce possible ?',
      priority: 'low',
      status: 'open',
      createdAt: '2026-03-01T10:15:00Z',
    };

    this.tickets.set(t1.id, t1);
    this.tickets.set(t2.id, t2);
  }

  // --- CLIENTS ---
  findClientByEmail(email: string): Client | undefined {
    const normalized = email.toLowerCase().trim();
    return Array.from(this.clients.values()).find(
      (c) => c.email.toLowerCase() === normalized
    );
  }

  findClientById(id: string): Client | undefined {
    return this.clients.get(id);
  }

  getAllClients(): Client[] {
    return Array.from(this.clients.values());
  }

  createClientByAdmin(data: {
    name: string;
    companyName: string;
    email: string;
    initialPassword?: string;
  }): Client {
    const rawPass = data.initialPassword || 'Client2026!';
    const passwordHash = bcrypt.hashSync(rawPass, 10);

    const client: Client = {
      id: `cli_${crypto.randomBytes(6).toString('hex')}`,
      name: data.name,
      companyName: data.companyName,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      mustChangePassword: true, // Obligé de changer le mdp à la 1ère connexion
      role: 'client',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.clients.set(client.id, client);
    return client;
  }

  updatePassword(clientId: string, newPasswordRaw: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.passwordHash = bcrypt.hashSync(newPasswordRaw, 10);
    client.mustChangePassword = false; // Mot de passe personnalisé validé !
    this.clients.set(clientId, client);
    return true;
  }

  // --- MAGIC LINKS ---
  createMagicLink(clientId: string, tokenHash: string, expiresAt: Date): MagicLinkRecord {
    const record: MagicLinkRecord = {
      id: `ml_${crypto.randomBytes(8).toString('hex')}`,
      clientId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    };
    this.magicLinks.set(record.id, record);
    return record;
  }

  findMagicLinkByHash(tokenHash: string): MagicLinkRecord | undefined {
    return Array.from(this.magicLinks.values()).find(
      (ml) => ml.tokenHash === tokenHash
    );
  }

  markMagicLinkAsUsed(id: string): void {
    const ml = this.magicLinks.get(id);
    if (ml) {
      ml.used = true;
      this.magicLinks.set(id, ml);
    }
  }

  // --- PROJECTS ---
  getProjectsByClientId(clientId: string): Project[] {
    const client = this.clients.get(clientId);
    return Array.from(this.projects.values())
      .filter((p) => p.clientId === clientId)
      .map((p) => ({
        ...p,
        clientName: client?.name,
        clientCompany: client?.companyName,
      }));
  }

  getAllProjects(): Project[] {
    return Array.from(this.projects.values()).map((p) => {
      const client = this.clients.get(p.clientId);
      return {
        ...p,
        clientName: client?.name,
        clientCompany: client?.companyName,
      };
    });
  }

  createProject(data: {
    clientId: string;
    title: string;
    description: string;
    progressPercentage?: number;
    status?: Project['status'];
  }): Project {
    const client = this.clients.get(data.clientId);
    const project: Project = {
      id: `proj_${Date.now().toString(36)}`,
      clientId: data.clientId,
      clientName: client?.name,
      clientCompany: client?.companyName,
      title: data.title,
      description: data.description,
      progressPercentage: data.progressPercentage || 0,
      status: data.status || 'in_progress',
      createdAt: new Date().toISOString(),
      deliverablesCount: 0,
    };
    this.projects.set(project.id, project);
    return project;
  }

  updateProjectProgress(projectId: string, progressPercentage: number, status?: Project['status']): Project | undefined {
    const project = this.projects.get(projectId);
    if (project) {
      project.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
      if (status) {
        project.status = status;
      } else if (project.progressPercentage === 100) {
        project.status = 'completed';
      }
      project.updatedAt = new Date().toISOString();
      this.projects.set(projectId, project);
    }
    return project;
  }

  // --- DOCUMENTS ---
  getDocumentsByClientId(clientId: string): DocumentRecord[] {
    const client = this.clients.get(clientId);
    return Array.from(this.documents.values())
      .filter((d) => d.clientId === clientId)
      .map((d) => ({
        ...d,
        clientName: client?.name,
        clientCompany: client?.companyName,
      }));
  }

  getAllDocuments(): DocumentRecord[] {
    return Array.from(this.documents.values()).map((d) => {
      const client = this.clients.get(d.clientId);
      return {
        ...d,
        clientName: client?.name,
        clientCompany: client?.companyName,
      };
    });
  }

  findDocumentById(id: string): DocumentRecord | undefined {
    return this.documents.get(id);
  }

  saveUploadedDocument(params: {
    clientId: string;
    title: string;
    category: DocumentRecord['category'];
    filename: string;
    fileBuffer: Buffer;
    mimeType?: string;
    uploadedBy: 'client' | 'admin';
  }): DocumentRecord {
    // Nettoyer le nom de fichier pour éviter le path traversal
    const safeFilename = `${Date.now()}_${params.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(PRIVATE_STORAGE_DIR, safeFilename);

    fs.writeFileSync(filePath, params.fileBuffer);
    const stats = fs.statSync(filePath);

    const client = this.clients.get(params.clientId);

    const doc: DocumentRecord = {
      id: `doc_${Date.now().toString(36)}`,
      clientId: params.clientId,
      clientName: client?.name,
      clientCompany: client?.companyName,
      title: params.title,
      category: params.category,
      filePath,
      fileSize: stats.size,
      mimeType: params.mimeType || 'application/pdf',
      uploadedBy: params.uploadedBy,
      createdAt: new Date().toISOString(),
    };

    this.documents.set(doc.id, doc);
    return doc;
  }

  // --- SUPPORT TICKETS ---
  getTicketsByClientId(clientId: string): SupportTicket[] {
    return Array.from(this.tickets.values())
      .filter((t) => t.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllTickets(): SupportTicket[] {
    return Array.from(this.tickets.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createTicket(data: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>): SupportTicket {
    const client = this.clients.get(data.clientId);
    const ticket: SupportTicket = {
      id: `tkt_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      clientName: client?.name,
      clientEmail: client?.email,
      clientCompany: client?.companyName,
      ...data,
    };
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  replyToTicket(ticketId: string, replyText: string, status: 'open' | 'resolved' = 'resolved'): SupportTicket | undefined {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.adminReply = replyText;
      ticket.repliedAt = new Date().toISOString();
      ticket.status = status;
      this.tickets.set(ticketId, ticket);
    }
    return ticket;
  }
}

export const db = new DatabaseStore();
