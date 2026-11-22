# Authentification & profils — v1

Socle livré pour la phase P1 : API Fastify/Prisma, package partagé de validation, interfaces React.

## Démarrage

```bash
npm install
cp apps/api/.env.example apps/api/.env   # puis renseigner JWT_SECRET et DATABASE_URL
cp apps/web/.env.example apps/web/.env
docker compose up -d                      # PostgreSQL 16 (ou utiliser Neon)
npm run prisma:migrate -- --name init
npm run prisma:seed                       # crée le seul compte ADMIN (CLI uniquement)
npm run dev        # web : http://localhost:5173
npm run dev:api    # api : http://localhost:3000
```

Sans Docker, renseignez une `DATABASE_URL` PostgreSQL distante dans `apps/api/.env`.

## Rôles et élévation de privilèges

| Rôle | Création | Droits |
|---|---|---|
| `CLIENT` | Inscription publique | Profil, localisation, commandes (P3) |
| `MERCHANT` | Inscription publique | Idem + boutique, annonces (P2) |
| `ADMIN` | **Script `prisma:seed` uniquement** | Modération des comptes |

Aucun endpoint n'accepte de modifier `role`. Le schéma d'inscription n'autorise que
`CLIENT | MERCHANT`, et les schémas de mise à jour sont en mode strict. Le rôle est
relu depuis PostgreSQL à chaque requête : un token signé ne peut pas transporter
de privilège supplémentaire.

## Endpoints

| Méthode | Route | Garde | Description |
|---|---|---|---|
| GET | `/v1/auth/session` | — | Sonde silencieuse : `{ user }` ou `{ user: null }` (200) |
| POST | `/v1/auth/register` | rate limit | Création du compte + localisation + boutique si marchand |
| POST | `/v1/auth/login` | rate limit | Connexion, cookies httpOnly |
| POST | `/v1/auth/refresh` | refresh token | Rotation du refresh token |
| POST | `/v1/auth/logout` | — | Révocation du refresh token |
| GET | `/v1/auth/me` | session | Profil complet du propriétaire |
| PATCH | `/v1/me` | session | Nom, prénom, téléphone, photo |
| PATCH | `/v1/me/location` | session | Site, bâtiment, chambre, étage → nouvelle référence |
| PATCH | `/v1/me/store` | `MERCHANT` | Boutique, WhatsApp, description, modes de remise |
| POST | `/v1/me/photo` | session | Upload image (JPEG/PNG/WebP, 2 Mo) |
| GET | `/v1/admin/users` | `ADMIN` | Liste paginée des comptes |
| PATCH | `/v1/admin/users/:id/status` | `ADMIN` | Suspendre/réactiver (jamais son propre compte) |

## Sécurité

- **Mot de passe** : Argon2id (19 Mo, 2 passes, 32 octets), jamais renvoyé ni journalisé.
- **Sessions** : access token JWT 15 min en cookie `httpOnly` + refresh token aléatoire
  7 jours stocké **haché SHA-256** en base, avec rotation et révocation.
- **Cookies** : `SameSite=Lax`, `Secure` en production, contrôle de l'origine sur les
  requêtes de mutation (CSRF).
- **Validation** : Zod partagé entre le client et le serveur pour la localisation.
  Erreurs de champ explicites, affichées dans les formulaires.
- **Données personnelles** : `toSelfUser` (privé) contient email/téléphone/localisation ;
  `toPublicUser` et `toAdminUser` ne contiennent jamais bâtiment/chambre/étage (RG-17).
- **Uploads** : types MIME vérifiés, nom de fichier UUID, servis depuis `/uploads/`.
  Le stockage disque est volontairement simple pour le développement ; en production, le
  remplacer par R2 (cf. `ARCHITECTURE.md`) en conservant le même contrat d'URL publique.

## Localisation

`generateReference(buildingNumber, roomNumber, floor)` produit `B1.87 R1`.
Le composant `LocationForm` affiche un aperçu en direct et valide :
bâtiment alphanumérique, chambre numérique, étage `R0` à `R20`.

## Interfaces

- `/inscription` : choix Client/Commerçant, coordonnées, localisation, bloc boutique conditionnel.
- `/connexion` : email + mot de passe.
- `/profil` : onglets Informations / Localisation / Boutique (commerçants).
- `/admin` : liste des comptes et suspension.
- `/profil` et `/admin` sont protégés ; un visiteur est redirigé vers `/connexion`.
