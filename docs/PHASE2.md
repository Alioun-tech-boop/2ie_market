# Phase 2 — Catalogues et tableau de bord marchand

## Endpoints publics

| Méthode | Route | Description |
|---|---|---|
| GET | `/v1/categories` | Catégories actives, ordonnées |
| GET | `/v1/stores/:slug` | Fiche boutique publique (site uniquement, jamais bâtiment/chambre/étage) |
| GET | `/v1/stores/:slug/listings` | Annonces `PUBLISHED` de la boutique |
| GET | `/v1/listings/:id` | Fiche annonce + incrément du compteur de vues |
| GET | `/v1/stores/:slug/reviews` | Avis (route active seulement si `REVIEWS_ENABLED=true`) |

## Endpoints marchand (`MERCHANT` uniquement)

| Méthode | Route | Description |
|---|---|---|
| GET | `/v1/me/dashboard` | Statistiques, annonces et commandes reçues |
| GET | `/v1/me/listings` | Annonces non archivées du marchand |
| GET | `/v1/me/listings/:id` | Détail d'une annonce possédée |
| POST | `/v1/me/listings` | Création multipart (champs + photos) |
| PATCH | `/v1/me/listings/:id` | Modification JSON (prix, stock, statut, etc.) |
| DELETE | `/v1/me/listings/:id` | Archivage logique (`ARCHIVED`) |
| POST | `/v1/me/listings/:id/photos` | Ajout de photos (limite 6 au total) |
| DELETE | `/v1/me/listings/:id/photos/:photoId` | Suppression d'une photo et de ses fichiers |

## Règles clés

- Un commerçant ne peut jamais modifier une annonce qui ne lui appartient pas : `ownedListing()` filtre sur `store.ownerId` et renvoie `404`.
- `PAUSED` = désactivation temporaire ; `ARCHIVED` = suppression métier irréversible côté client.
- Les services exigent un tarif `> 0` ; les produits physiques gèrent quantité et état.
- Les images sont optimisées avec `sharp` : WebP, 1600 px max, qualité 82, vignette 480 px, métadonnées supprimées.
- Les prix sont stockés en centimes et affichés en XOF ; `0` s'affiche « Gratuit ».
- Aucun paiement en ligne : le contact final se fait via WhatsApp.

## Pages frontend

- `/boutique/$slug` — vitrine publique de la boutique.
- `/annonce/$id` — fiche annonce, galerie, contact WhatsApp.
- `/publier` — création d'annonce (formulaire unique, validation Zod partagée).
- `/annonces/$id/modifier` — édition, prix, stock, statut, photos.
- `/tableau-de-bord` — pilotage complet du marchand, y compris commandes reçues.

## Vérification

```bash
npm run build -w @2ie/api
npm run build -w @2ie/web
docker compose up -d
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
npm run dev:api
```
