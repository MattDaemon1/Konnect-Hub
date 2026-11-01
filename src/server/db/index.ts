/**
 * @file index.ts
 * @description Couche d'accès aux données sécurisée (Multi-Tenant & OWASP)
 * Supporte MariaDB/MySQL (o2switch) et intègre un moteur transactionnel
 * pré-chargé pour l'environnement de développement AI Studio.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  Client,
  Project,
  DocumentRecord,
  MagicLinkRecord,
  SupportTicket,
} from '../../types/index.ts';

// Répertoire privé de stockage des documents (HORS de public_html)
// Sur o2switch cPanel : ex: /home/utilisateur/private_uploads/
export const PRIVATE_STORAGE_DIR = path.resolve(process.cwd(), 'private_storage', 'uploads');

// Assurer l'existence du dossier de stockage sécurisé
if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true, mode: 0o700 }); // Permissions 0700 : lecture/écriture proprio uniquement
}

// ============================================================================
// DONNÉES DE DÉMONSTRATION RÉALISTES (SEEDS)
// ============================================================================

// Client 1 : Utilisateur principal (Matt Konnect Studio)
export const SEED_CLIENT_1: Client = {
  id: 'cli_matt_001',
  name: 'Matthieu Konnect',
  companyName: 'Studio Matt Konnect',
  email: 'Matt4Daemon@gmail.com',
  status: 'active',
  createdAt: new Date('2026-01-15T09:00:00Z').toISOString(),
};

// Client 2 : Autre client pour vérifier la protection IDOR (Inaccessible par Client 1)
export const SEED_CLIENT_2: Client = {
  id: 'cli_acme_002',
  name: 'Sophie Durand',
  companyName: 'ACME Logistique SAS',
  email: 'sophie.durand@acme-logistique.fr',
  status: 'active',
  createdAt: new Date('2026-02-01T10:30:00Z').toISOString(),
};

// Documents réels créés dans private_storage
function initializeSampleFiles() {
  const sampleDocs = [
    {
      filename: 'audit_seo_matt_konnect_2026.pdf',
      title: 'Audit SEO Technique & Core Web Vitals 2026',
      category: 'audit_seo' as const,
      clientId: SEED_CLIENT_1.id,
      content: `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Title (Audit SEO Technique - Matt Konnect)
   /Author (Matt Konnect SecOps)
   /Creator (Konnect Audit Engine)
   /Producer (o2switch LiteSpeed Node Service) >>
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
<< /Length 280 >>
stream
BT
/F1 18 Tf 50 720 Td (AUDIT SEO TECHNIQUE - MATT KONNECT) Tj
/F1 12 Tf 50 690 Td (Date: Mars 2026 - Conforme OWASP & Performance LiteSpeed) Tj
/F1 10 Tf 50 660 Td (Score LCP: 1.1s | FID: 12ms | CLS: 0.00 | Statut: Excellent) Tj
/F1 10 Tf 50 630 Td (Indexation Googlebot: 100% | Sitemap XML valide | SSL TLS 1.3 actif) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000180 00000 n 
0000000230 00000 n 
0000000290 00000 n 
0000000380 00000 n 
trailer
<< /Size 6 /Root 2 0 R >>
startxref
720
%%EOF`,
    },
    {
      filename: 'audit_rgpd_registre_traitements.pdf',
      title: 'Rapport d\'Audit RGPD & Registre des Traitements',
      category: 'audit_rgpd' as const,
      clientId: SEED_CLIENT_1.id,
      content: `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Title (Rapport de Conformite RGPD)
   /Author (DPO Matt Konnect) >>
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
<< /Length 260 >>
stream
BT
/F1 18 Tf 50 720 Td (RAPPORT DE CONFORMITE RGPD & SECURITE DES DONNEES) Tj
/F1 12 Tf 50 690 Td (Client: Studio Matt Konnect | Hebergement: o2switch France) Tj
/F1 10 Tf 50 660 Td (Purge automatique Magic Links: Active apres 15 min) Tj
/F1 10 Tf 50 630 Td (Cookies: HttpOnly, Secure, SameSite=Strict - Zero traceur tiers) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000120 00000 n 
0000000170 00000 n 
0000000230 00000 n 
0000000320 00000 n 
trailer
<< /Size 6 /Root 2 0 R >>
startxref
640
%%EOF`,
    },
    {
      filename: 'facture_acompte_2026_03.pdf',
      title: 'Facture d\'acompte N° FA-2026-042',
      category: 'facture' as const,
      clientId: SEED_CLIENT_1.id,
      content: `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Title (Facture FA-2026-042)
   /Author (Comptabilite Matt Konnect) >>
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
<< /Length 240 >>
stream
BT
/F1 18 Tf 50 720 Td (FACTURE N FA-2026-042 - MATT KONNECT) Tj
/F1 12 Tf 50 690 Td (Prestation: Extranet Securise & Deploiement o2switch) Tj
/F1 10 Tf 50 660 Td (Montant Total TTC: 2 400.00 EUR | Statut: REGLE) Tj
ET
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 2 0 R >>
startxref
580
%%EOF`,
    },
    {
      filename: 'cahier_charges_extranet_v2.pdf',
      title: 'Cahier des Charges & Spécifications OWASP',
      category: 'livrable' as const,
      clientId: SEED_CLIENT_1.id,
      content: `%PDF-1.4
1 0 obj
<< /Title (Cahier des Charges Extranet) >>
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
/F1 16 Tf 50 720 Td (SPECIFICATIONS TECHNIQUES ET ARCHITECTURE OWASP) Tj
/F1 10 Tf 50 680 Td (Isolation multi-tenant - Phusion Passenger Node.js v20) Tj
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
    // Document appartenant à Client 2 (ACME) - Pour tester l'IDOR !
    {
      filename: 'audit_confidentiel_acme_logistique.pdf',
      title: 'Document Confidentiel ACME Logistique SAS (Usage Test IDOR)',
      category: 'audit_rgpd' as const,
      clientId: SEED_CLIENT_2.id,
      content: `%PDF-1.4
1 0 obj
<< /Title (Document Confidentiel ACME) >>
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
/F1 16 Tf 50 720 Td (DONNEES CONFIDENTIELLES ACME LOGISTIQUE) Tj
/F1 10 Tf 50 680 Td (Acces strictement reserve au client cli_acme_002) Tj
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
      createdAt: new Date(Date.now() - (index * 86400000 * 3)).toISOString(),
      mimeType: 'application/pdf',
    } satisfies DocumentRecord;
  });
}

// ============================================================================
// BASE EN MÉMOIRE COHÉRENTE AVEC MARIADB
// ============================================================================
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
    // Clients
    this.clients.set(SEED_CLIENT_1.id, SEED_CLIENT_1);
    this.clients.set(SEED_CLIENT_2.id, SEED_CLIENT_2);

    // Projects Client 1
    const p1: Project = {
      id: 'proj_101',
      clientId: SEED_CLIENT_1.id,
      title: 'Refonte Web & SEO Local Matt Konnect',
      description: 'Audit sémantique, optimisation Core Web Vitals et déploiement sous LiteSpeed o2switch.',
      status: 'in_progress',
      progressPercentage: 75,
      createdAt: '2026-02-10T11:00:00Z',
      deliverablesCount: 4,
    };
    const p2: Project = {
      id: 'proj_102',
      clientId: SEED_CLIENT_1.id,
      title: 'Conformité RGPD & Politique Confidentialité',
      description: 'Cartographie des flux de données, registre DPO et sécurisation des formulaires.',
      status: 'completed',
      progressPercentage: 100,
      createdAt: '2026-01-20T14:30:00Z',
      deliverablesCount: 2,
    };
    const p3: Project = {
      id: 'proj_103',
      clientId: SEED_CLIENT_1.id,
      title: 'Portail Extranet Client & API REST Sécurisée',
      description: 'Développement de l\'extranet sécurisé avec Magic Links SHA-256 et sessions HTTP-Only.',
      status: 'in_progress',
      progressPercentage: 45,
      createdAt: '2026-02-25T09:15:00Z',
      deliverablesCount: 3,
    };

    this.projects.set(p1.id, p1);
    this.projects.set(p2.id, p2);
    this.projects.set(p3.id, p3);

    // Initialisation des documents réels
    const initialDocs = initializeSampleFiles();
    for (const doc of initialDocs) {
      this.documents.set(doc.id, doc);
    }

    // Support Tickets Client 1
    const t1: SupportTicket = {
      id: 'tkt_201',
      clientId: SEED_CLIENT_1.id,
      subject: 'Question sur la configuration DKIM / SPF sur o2switch',
      message: 'Bonjour Matt, pourriez-vous vérifier si les enregistrements DNS DKIM et DMARC sont bien propagés sur notre domaine ? Merci.',
      priority: 'medium',
      status: 'resolved',
      createdAt: '2026-02-18T16:20:00Z',
      adminReply: 'Bonjour Matthieu, les clés DKIM 2048-bit et DMARC strict (p=reject) sont bien validées et 100% opérationnelles sur le serveur o2switch.',
    };
    this.tickets.set(t1.id, t1);
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

  createClient(data: Omit<Client, 'id' | 'createdAt'>): Client {
    const client: Client = {
      id: `cli_${crypto.randomBytes(6).toString('hex')}`,
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.clients.set(client.id, client);
    return client;
  }

  // --- MAGIC LINKS (OWASP SHA-256) ---
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
    return Array.from(this.projects.values()).filter((p) => p.clientId === clientId);
  }

  // --- DOCUMENTS (Protection IDOR) ---
  getDocumentsByClientId(clientId: string): DocumentRecord[] {
    return Array.from(this.documents.values()).filter((d) => d.clientId === clientId);
  }

  findDocumentById(id: string): DocumentRecord | undefined {
    return this.documents.get(id);
  }

  // --- SUPPORT TICKETS ---
  getTicketsByClientId(clientId: string): SupportTicket[] {
    return Array.from(this.tickets.values())
      .filter((t) => t.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createTicket(data: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>): SupportTicket {
    const ticket: SupportTicket = {
      id: `tkt_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      ...data,
    };
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }
}

// Instance singleton
export const db = new DatabaseStore();
