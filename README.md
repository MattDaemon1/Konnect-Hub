# 🔐 Konnect Client Portal — Extranet Client Sécurisé (OWASP & RGPD)

> Extranet client TPE/PME 100 % sécurisé pour l'écosystème **Matt Konnect**, conçu pour fonctionner en environnement de développement local et prêt pour un déploiement en production sur un serveur mutualisé **o2switch** (cPanel / Phusion Passenger / LiteSpeed / MariaDB).

---

## 📋 Table des matières

1. [Architecture & Stack Technique](#-architecture--stack-technique)
2. [Exigences de Sécurité & Conformité OWASP](#-exigences-de-sécurité--conformité-owasp)
3. [Installation & Exécution en Local](#-installation--exécution-en-local)
   - [Prérequis](#prérequis)
   - [Installation des dépendances](#installation-des-dépendances)
   - [Variables d'environnement (.env)](#variables-denvironnement-env)
   - [Lancement du serveur de développement](#lancement-du-serveur-de-développement)
   - [Comptes de test & Simulateur d'emails](#comptes-de-test--simulateur-demails)
4. [Déploiement sur o2switch (Pas-à-Pas)](#-déploiement-sur-o2switch-pas-à-pas)
   - [Étape 1 : Création de la Base MariaDB](#étape-1--création-de-la-base-mariadb)
   - [Étape 2 : Stockage Privé Hors de public_html (Anti-IDOR)](#étape-2--stockage-privé-hors-de-public_html-anti-idor)
   - [Étape 3 : Application Node.js (Phusion Passenger)](#étape-3--application-nodejs-phusion-passenger)
   - [Étape 4 : Variables d'Environnement en Production](#étape-4--variables-denvironnement-en-production)
   - [Étape 5 : Configuration du .htaccess (LiteSpeed / SPA)](#étape-5--configuration-du-htaccess-litespeed--spa)
   - [Étape 6 : Configuration SMTP o2switch & Délivrabilité](#étape-6--configuration-smtp-o2switch--délivrabilité)
5. [Schéma de Base de Données (MariaDB / Drizzle)](#-schéma-de-base-de-données-mariadb--drizzle)
6. [Arborescence du Projet](#-arborescence-du-projet)
7. [Checklist de Sécurité Pré-Production](#-checklist-de-sécurité-pré-production)

---

## 📐 Architecture & Stack Technique

- **Frontend (SPA)** :
  - React 19 + TypeScript + Vite.
  - Routage client via **React Router v6**.
  - Styles : **Tailwind CSS v4** avec typographies soignées (*Plus Jakarta Sans*, *DM Sans*, *JetBrains Mono*).
- **Backend (API REST)** :
  - **Node.js (v20+)** hébergé via **Phusion Passenger** sous LiteSpeed (o2switch).
  - Framework : **Express.js** avec typage strict TypeScript.
  - Base de données : **MariaDB 10.x / MySQL 8.x** natif o2switch (avec schéma Drizzle ORM & script SQL DDL fourni).
  - Sécurité : **Helmet.js**, **express-rate-limit**, **cookie-parser**, **jsonwebtoken**, **zod**.
  - Expédition d'emails : **Nodemailer** (compatible SMTP SSL/TLS o2switch).

---

## 🔒 Exigences de Sécurité & Conformité OWASP

| Règle de Sécurité | Implémentation dans Konnect Client Portal |
| :--- | :--- |
| **Authentification sans mot de passe** | Génération de Magic Link à haute entropie (token 256 bits via `crypto.randomBytes(32)`). |
| **Protection anti-fuite de BDD** | Seul le hachage **SHA-256** du token est stocké en BDD (`magic_links.token_hash`). Le token brut n'est jamais persisté. |
| **Usage Unique & Expiration** | Le lien expire au bout de **15 minutes** et est invalidé immédiatement dès la première utilisation (`used = 1`). |
| **Session Anti-XSS** | Le JWT de session est placé dans un cookie `konnect_session` avec les flags `HttpOnly: true`, `SameSite: Strict`, et `Secure: true`. Aucun jeton dans `localStorage`. |
| **Protection Documentaire Anti-IDOR** | Fichiers stockés **hors de `public_html`** (ex: `/home/user/private_uploads/`). Accès uniquement via `GET /api/documents/:id/download` qui valide strictement l'appartenance de la ressource au client connecté (`doc.clientId === req.user.id`). |
| **Anti-Path Traversal** | Résolution stricte et confinement dans le répertoire de stockage (`path.resolve` + validation du préfixe). |
| **Anti-Bruteforce & Anti-Spam** | Limitation par `express-rate-limit` (10 requêtes de Magic Link par 15 min par IP ; 200 requêtes globales sur l'API). |
| **Validation des Entrées** | Validation stricte et assainissement des entrées avec **Zod**. |
| **En-têtes HTTP Sécurisés** | **Helmet** activé avec Content-Security-Policy (CSP), HSTS (1 an), et `X-Content-Type-Options: nosniff`. |

---

## 💻 Installation & Exécution en Local

### Prérequis

- **Node.js** : version 20.x ou supérieure recommandée (`node -v`).
- **npm** : version 10.x ou supérieure (`npm -v`).
- Git installé.

### Installation des dépendances

Clonez ou décompressez le projet, puis installez les dépendances :

```bash
cd konnect-client-portal
npm install
```

### Variables d'environnement (.env)

Créez un fichier `.env` à la racine du projet (en vous basant sur `.env.example`) :

```bash
cp .env.example .env
```

Contenu recommandé pour le développement local :

```env
# Port du serveur Express / Vite
PORT=3000
NODE_ENV=development

# Clé secrète pour signer les cookies JWT (à remplacer par une chaîne aléatoire longue)
JWT_SECRET=votre_cle_secrete_ultra_robuste_changez_moi_en_prod_2026

# Configuration SMTP o2switch (facultative en dev : si vide, le simulateur d'inbox prend le relais)
SMTP_HOST=mail.o2switch.net
SMTP_PORT=465
SMTP_USER=contact@votre-domaine.fr
SMTP_PASS=votre_mot_de_passe_messagerie
SMTP_FROM="Matt Konnect <contact@votre-domaine.fr>"

# Email de réception des alertes de tickets support
ADMIN_ALERT_EMAIL=contact@mattkonnect.fr

# Répertoire de stockage des fichiers hors web root (par défaut: ./private_storage/uploads)
PRIVATE_STORAGE_PATH=./private_storage/uploads
```

### Lancement du serveur de développement

Le projet utilise `tsx server.ts` qui intègre le serveur Express et les middlewares Vite pour le développement à rechargement instantané :

```bash
npm run dev
```

L'application est immédiatement accessible à l'adresse suivante :
👉 **http://localhost:3000**

### Comptes de test & Simulateur d'emails

L'application intègre deux comptes de démonstration pour valider les flux d'authentification et les tests de pénétration :

1. **Client Principal** :
   - Email : `Matt4Daemon@gmail.com`
   - Entreprise : *Studio Matt Konnect*
   - Contient : 3 projets en cours, des audits SEO / RGPD téléchargeables, factures et tickets support.
2. **Client Tiers (Pour test anti-IDOR)** :
   - Email : `sophie.durand@acme-logistique.fr`
   - Entreprise : *ACME Logistique SAS*
   - Permet de tester le rejet immédiat (`403 Forbidden`) lorsqu'un client tente de télécharger un document appartenant à un autre locataire.

💡 **Simulateur d'Inbox o2switch intégré** :
En local ou si vos accès SMTP ne sont pas encore configurés, cliquez sur le bouton **"Boîte Mail o2switch"** en haut à droite de l'écran de connexion. Le simulateur intercepte les emails envoyés et vous fournit directement le lien de connexion Magic Link en un clic.

### Tests de qualité de code

```bash
# Vérification TypeScript sans émission
npm run lint

# Compilation de production du frontend
npm run build
```

---

## 🚀 Déploiement sur o2switch (Pas-à-Pas)

Sur un hébergement mutualisé **o2switch**, l'infrastructure utilise **cPanel**, **LiteSpeed Web Server**, **Phusion Passenger** pour Node.js et **MariaDB**.

Voici le guide complet pas-à-pas pour déployer l'application en production :

---

### Étape 1 : Création de la Base MariaDB

1. Connectez-vous à votre interface **cPanel o2switch**.
2. Rendez-vous dans la section **Bases de données MySQL®** (ou *Assistant de bases de données*).
3. Créez une nouvelle base de données (ex: `user_konnect_db`).
4. Créez un utilisateur MySQL dédié avec un mot de passe robuste (ex: `user_konnect_app`).
5. Associez l'utilisateur à la base en cochant **TOUS LES PRIVILÈGES**.
6. Ouvrez **phpMyAdmin** depuis cPanel, sélectionnez votre base, rendez-vous dans l'onglet **SQL**, et collez le script DDL suivant :

```sql
CREATE TABLE IF NOT EXISTS `clients` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_client_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(36) NOT NULL,
  `client_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('in_progress', 'completed', 'on_hold') NOT NULL DEFAULT 'in_progress',
  `progress_percentage` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_client` (`client_id`),
  CONSTRAINT `fk_projects_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(36) NOT NULL,
  `client_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` ENUM('audit_seo', 'audit_rgpd', 'facture', 'livrable') NOT NULL,
  `file_path` VARCHAR(512) NOT NULL COMMENT 'Chemin privé hors de public_html',
  `file_size` INT NOT NULL COMMENT 'Taille en octets',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_documents_client` (`client_id`),
  KEY `idx_documents_category` (`category`),
  CONSTRAINT `fk_documents_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `magic_links` (
  `id` VARCHAR(36) NOT NULL,
  `client_id` VARCHAR(36) NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL COMMENT 'SHA-256 du token hexadécimal à usage unique',
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_magic_token_hash` (`token_hash`),
  KEY `idx_magic_client` (`client_id`),
  CONSTRAINT `fk_magic_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(36) NOT NULL,
  `client_id` VARCHAR(36) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tickets_client` (`client_id`),
  KEY `idx_tickets_status` (`status`),
  CONSTRAINT `fk_tickets_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### Étape 2 : Stockage Privé Hors de public_html (Anti-IDOR)

Pour respecter scrupuleusement la règle d'or OWASP de non-divulgation des fichiers :

1. Connectez-vous en SSH ou via le **Gestionnaire de fichiers cPanel**.
2. Créez un dossier au niveau de votre racine utilisateur `/home/<votre_utilisateur>/` :
   ```bash
   mkdir -p /home/<votre_utilisateur>/private_uploads
   chmod 700 /home/<votre_utilisateur>/private_uploads
   ```
3. **Important** : Ne placez jamais ce dossier à l'intérieur de `public_html/`. Grâce aux permissions `0700` et à l'emplacement en amont de `public_html`, le serveur LiteSpeed refusera catégoriquement tout accès direct par URL. Seul le processus Node.js pourra lire les fichiers après vérification des droits de session du client.

---

### Étape 3 : Application Node.js (Phusion Passenger)

1. Dans cPanel, cliquez sur **"Configurer une application Node.js"** (*Setup Node.js App*).
2. Cliquez sur le bouton **"Créer une application"** (*Create Application*) :
   - **Node.js version** : Sélectionnez **20.x** (ou supérieure).
   - **Mode d'application** : `Production`.
   - **Racine de l'application (Application root)** : `konnect_portal` (situé dans `/home/<user>/konnect_portal`).
   - **URL de l'application (Application URL)** : sélectionnez votre domaine ou sous-domaine (ex: `portail.mattkonnect.fr`).
   - **Fichier de démarrage (Application startup file)** : `server.ts` (ou `server.js` compilé).
3. Cliquez sur **Créer**.

---

### Étape 4 : Variables d'Environnement en Production

Dans la même page de configuration Node.js de cPanel, descendez jusqu'à la section **Variables d'environnement** et ajoutez :

| Variable | Valeur recommandée | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Active le mode sécurisé, HSTS et cookies sécurisés |
| `PORT` | `3000` | Port d'écoute interne géré par Passenger |
| `JWT_SECRET` | *(64 car. aléatoires)* | Clé cryptographique secrète pour les sessions |
| `PRIVATE_STORAGE_PATH` | `/home/<user>/private_uploads` | Chemin absolu du coffre-fort documentaire |
| `SMTP_HOST` | `mail.o2switch.net` | Serveur SMTP sécurisé o2switch |
| `SMTP_PORT` | `465` | Port SSL direct |
| `SMTP_USER` | `contact@mattkonnect.fr` | Compte email cPanel |
| `SMTP_PASS` | `********` | Mot de passe de la boîte mail |
| `ADMIN_ALERT_EMAIL`| `contact@mattkonnect.fr` | Réception des alertes de tickets support |

---

### Étape 5 : Configuration du .htaccess (LiteSpeed / SPA)

Un fichier `.htaccess` prêt pour la production est disponible dans le dossier `public/.htaccess`.

Lors du déploiement du frontend compilé (`dist/`) dans la racine web (`public_html` ou sous-domaine `public_html/portail`), assurez-vous de déposer ce fichier `.htaccess` à la racine des fichiers statiques :

```apache
# 1. Empêcher le listing des répertoires
Options -Indexes -MultiViews

# 2. Bloquer l'accès aux fichiers sensibles
<FilesMatch "^\.(env|git|htaccess|htpasswd|ini|log|sh|sql)">
    Require all denied
</FilesMatch>

# 3. Réécriture pour React Router v6 (SPA)
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    # Si le fichier physique existe, le servir directement
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    # Sinon, rediriger toutes les routes virtuelles vers index.html
    RewriteRule ^ index.html [L]
</IfModule>

# 4. En-têtes de Sécurité HTTP additionnels (OWASP)
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
</IfModule>

# 5. Compression LiteSpeed
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json image/svg+xml
</IfModule>
```

---

### Étape 6 : Configuration SMTP o2switch & Délivrabilité

Pour garantir que les emails de **Magic Link** arrivent instantanément en boîte de réception principale (sans passer en spam) :

1. Dans cPanel, ouvrez **Comptes de messagerie** et créez l'adresse d'expédition (ex: `contact@mattkonnect.fr`).
2. Ouvrez l'outil **Délivrabilité des e-mails** (*Email Deliverability*) dans cPanel :
   - Vérifiez que l'enregistrement **SPF** est valide (`v=spf1 include:mx.o2switch.net ~all`).
   - Activez et validez la clé **DKIM** (2048-bit).
   - Ajoutez un enregistrement **DMARC** dans l'éditeur de zone DNS (`v=DMARC1; p=quarantine;`).

---

## 🗄️ Schéma de Base de Données (MariaDB / Drizzle)

Le schéma complet est défini dans `src/server/db/schema.ts` avec Drizzle ORM et s'articule autour de 5 tables clés :

1. **`clients`** : Table pivot du multi-tenant. Chaque entité client possède un identifiant UUID unique.
2. **`projects`** : Projets rattachés à un client avec titre, description, avancement (0-100%) et statut.
3. **`documents`** : Métadonnées des audits SEO, audits RGPD, factures et livrables. La colonne `file_path` pointe vers le chemin privé absolu sur le disque.
4. **`magic_links`** : Tokens d'accès temporaires. Seul `token_hash` (hachage SHA-256) est conservé, avec horodatage d'expiration et flag booléen `used`.
5. **`support_tickets`** : Demandes d'assistance émises par les clients avec niveaux de priorité (`low`, `medium`, `high`, `urgent`).

---

## 📂 Arborescence du Projet

```text
konnect-client-portal/
├── public/
│   └── .htaccess                 # Règles de réécriture LiteSpeed & en-têtes OWASP
├── private_storage/              # Emplacement local des fichiers hors web root
│   └── uploads/                  # Audits, factures et livrables sécurisés
├── src/
│   ├── assets/                   # Images & logos optimisés
│   ├── components/
│   │   ├── Dashboard.tsx         # Extranet client (projets, coffre-fort, support, guide)
│   │   ├── Login.tsx             # Écran d'authentification Magic Link & inbox sandbox
│   │   └── VerifyMagicLink.tsx   # Contrôle cryptographique & activation de session
│   ├── context/
│   │   └── AuthContext.tsx       # Gestionnaire de session React sans localStorage
│   ├── server/
│   │   ├── controllers/
│   │   │   ├── authController.ts     # Magic Link, SHA-256 & sessions JWT HTTP-Only
│   │   │   ├── documentController.ts # Téléchargement sécurisé & isolation anti-IDOR
│   │   │   ├── projectController.ts  # Consultation des projets du client
│   │   │   └── ticketController.ts   # Support client & alertes email administrateur
│   │   ├── db/
│   │   │   ├── index.ts          # Couche d'accès aux données & seeds
│   │   │   └── schema.ts         # Schéma Drizzle ORM & script SQL MariaDB
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts # Vérification du JWT dans le cookie HTTP-Only
│   │   └── services/
│   │       └── emailService.ts   # Envoi SMTP o2switch & templates HTML responsive
│   ├── types/
│   │   └── index.ts              # Modèles TypeScript stricts
│   ├── App.tsx                   # Routage React Router v6 & gardes d'authentification
│   ├── index.css                 # Import Tailwind CSS v4 & règles typographiques
│   └── main.tsx                  # Point d'entrée React
├── index.html                    # Entrée HTML avec polices Google Fonts
├── metadata.json                 # Métadonnées de l'application
├── package.json                  # Dépendances et scripts de démarrage
├── server.ts                     # Serveur Express principal (Production & Dev)
├── tsconfig.json                 # Configuration TypeScript stricte
└── vite.config.ts                # Configuration Vite & Tailwind v4
```

---

## ✅ Checklist de Sécurité Pré-Production

Avant l'ouverture aux clients finaux :

- [ ] **Secret JWT** : Remplacer `JWT_SECRET` par une clé cryptographique aléatoire de 64 caractères minimum.
- [ ] **HTTPS forcé** : Vérifier que le certificat SSL Let's Encrypt o2switch est actif et force la redirection HTTPS.
- [ ] **Cookie Secure** : S'assurer que `NODE_ENV=production` est défini dans cPanel pour que le flag `Secure` du cookie `konnect_session` soit actif.
- [ ] **Stockage hors racine** : Confirmer que `PRIVATE_STORAGE_PATH` pointe bien en amont de `public_html/`.
- [ ] **Permissions fichier** : Exécuter `chmod 700` sur le dossier privé d'uploads.
- [ ] **Enregistrements DNS** : Valider les scores de délivrabilité SPF, DKIM et DMARC sur o2switch.
- [ ] **Test IDOR** : Effectuer le test de sécurité inclus dans l'onglet *Coffre-Fort Documents* du Dashboard pour vérifier le code HTTP `403 Forbidden` en cas d'accès non autorisé.

---

### 👨‍💻 Auteur & Support
Développé pour l'écosystème **Matt Konnect** · Spécialiste SEO, RGPD & Solutions Web Haute Sécurité pour TPE/PME.
