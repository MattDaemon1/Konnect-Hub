/**
 * @file schema.ts
 * @description Schéma de Base de Données MariaDB pour Konnect Client Portal (Matt Konnect)
 * Compatible avec Drizzle ORM (MySQL / MariaDB natif o2switch) et exportable en DDL SQL pur.
 *
 * Principes de sécurité OWASP appliqués :
 * - `magic_links.token_hash` : Seul le hachage SHA-256 du token aléatoire (32 octets) est conservé.
 *   En cas de compromission de la BDD, les tokens bruts ne peuvent pas être réutilisés.
 * - `magic_links.used` & `expires_at` : Invalidité automatique après 15 minutes et usage unique immédiat.
 * - `documents.file_path` : Emplacement privé hors de la racine `public_html/`.
 * - Multi-tenant strict : Toutes les ressources possèdent une clé étrangère `client_id` obligatoire.
 */

import {
  mysqlTable,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  mysqlEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';

// ==========================================
// 1. TABLE DES CLIENTS (MULTI-TENANT ROOTS)
// ==========================================
export const clients = mysqlTable(
  'clients',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    role: mysqlEnum('role', ['client', 'admin']).default('client').notNull(),
    status: mysqlEnum('status', ['active', 'suspended', 'pending']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table: any) => ({
    emailIdx: uniqueIndex('clients_email_unique_idx').on(table.email),
    roleIdx: index('clients_role_idx').on(table.role),
  })
);

// ==========================================
// 2. TABLE DES PROJETS
// ==========================================
export const projects = mysqlTable(
  'projects',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    clientId: varchar('client_id', { length: 36 })
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    status: mysqlEnum('status', ['in_progress', 'completed', 'on_hold'])
      .default('in_progress')
      .notNull(),
    progressPercentage: int('progress_percentage').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table: any) => ({
    clientIdx: index('projects_client_id_idx').on(table.clientId),
  })
);

// ==========================================
// 3. TABLE DES DOCUMENTS (STOCKAGE HORS WEB ROOT)
// ==========================================
export const documents = mysqlTable(
  'documents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    clientId: varchar('client_id', { length: 36 })
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    category: mysqlEnum('category', ['audit_seo', 'audit_rgpd', 'facture', 'livrable']).notNull(),
    filePath: varchar('file_path', { length: 512 }).notNull(), // ex: /home/konnect/private_uploads/doc_xyz.pdf
    fileSize: int('file_size').notNull(), // taille en octets
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table: any) => ({
    clientIdx: index('documents_client_id_idx').on(table.clientId),
    categoryIdx: index('documents_category_idx').on(table.category),
  })
);

// ==========================================
// 4. TABLE DES MAGIC LINKS (OWASP AUTH)
// ==========================================
export const magicLinks = mysqlTable(
  'magic_links',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    clientId: varchar('client_id', { length: 36 })
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(), // Hash hexadécimal SHA-256 (64 car.)
    expiresAt: timestamp('expires_at').notNull(), // max 15 minutes
    used: boolean('used').default(false).notNull(), // Flag usage unique
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table: any) => ({
    tokenHashIdx: uniqueIndex('magic_links_token_hash_unique_idx').on(table.tokenHash),
    clientIdx: index('magic_links_client_id_idx').on(table.clientId),
  })
);

// ==========================================
// 5. TABLE DES TICKETS SUPPORT
// ==========================================
export const supportTickets = mysqlTable(
  'support_tickets',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    clientId: varchar('client_id', { length: 36 })
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    subject: varchar('subject', { length: 255 }).notNull(),
    message: text('message').notNull(),
    priority: mysqlEnum('priority', ['low', 'medium', 'high', 'urgent']).default('medium').notNull(),
    status: mysqlEnum('status', ['open', 'resolved']).default('open').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table: any) => ({
    clientIdx: index('support_tickets_client_id_idx').on(table.clientId),
    statusIdx: index('support_tickets_status_idx').on(table.status),
  })
);

// ==========================================
// SCRIPT SQL DDL NATIF MARIADB (o2switch cPanel)
// ==========================================
export const MARIADB_SCHEMA_SQL = `-- ========================================================
-- Konnect Client Portal - Script DDL MariaDB 10.x / MySQL 8.x
-- Hôte : o2switch (cPanel / phpMyAdmin)
-- Collation recommandée : utf8mb4_unicode_ci
-- ========================================================

CREATE TABLE IF NOT EXISTS \`clients\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`company_name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`password_hash\` VARCHAR(255) DEFAULT NULL COMMENT 'Hachage securise bcrypt',
  \`role\` ENUM('client', 'admin') NOT NULL DEFAULT 'client',
  \`status\` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_client_email\` (\`email\`),
  KEY \`idx_clients_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`projects\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`status\` ENUM('in_progress', 'completed', 'on_hold') NOT NULL DEFAULT 'in_progress',
  \`progress_percentage\` INT NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_projects_client\` (\`client_id\`),
  CONSTRAINT \`fk_projects_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`documents\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`category\` ENUM('audit_seo', 'audit_rgpd', 'facture', 'livrable') NOT NULL,
  \`file_path\` VARCHAR(512) NOT NULL COMMENT 'Chemin privé hors de public_html',
  \`file_size\` INT NOT NULL COMMENT 'Taille en octets',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_documents_client\` (\`client_id\`),
  KEY \`idx_documents_category\` (\`category\`),
  CONSTRAINT \`fk_documents_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`magic_links\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`token_hash\` VARCHAR(64) NOT NULL COMMENT 'SHA-256 du token hexadécimal à usage unique',
  \`expires_at\` DATETIME NOT NULL,
  \`used\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_magic_token_hash\` (\`token_hash\`),
  KEY \`idx_magic_client\` (\`client_id\`),
  CONSTRAINT \`fk_magic_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`support_tickets\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`subject\` VARCHAR(255) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`priority\` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  \`status\` ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_tickets_client\` (\`client_id\`),
  KEY \`idx_tickets_status\` (\`status\`),
  CONSTRAINT \`fk_tickets_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
