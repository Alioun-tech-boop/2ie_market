# Découverte et catégories — référence technique

> Date : 19 novembre 2026
> Périmètre : recherche publique des annonces (`/recherche`) et administration des catégories (`/admin`).

## 1. Endpoints

Toutes les routes sont préfixées par `/v1` (voir `api()` dans `apps/web/src/lib/auth.ts`).

| Méthode | Route | Visibilité | Description |
|---|---|---|---|
| `GET` | `/v1/listings` | Publique | Recherche paginée des annonces `PUBLISHED` des boutiques actives |
| `GET` | `/v1/categories` | Publique | Catégories `isActive = true`, triées par `position` puis `name`, avec compteur d'annonces publiées |
| `GET` | `/v1/admin/categories` | Admin | Toutes les catégories (actives et inactives), avec compteur et métadonnées |
| `POST` | `/v1/admin/categories` | Admin | Créer une catégorie (`name`, `slug?`, `icon?`, `position?`, `isActive?`, `parentId?`) |
| `PATCH` | `/v1/admin/categories/:id` | Admin | Renommer / réordonner / activer une catégorie (champs whitelistés) |
| `DELETE` | `/v1/admin/categories/:id` | Admin | Archiver une catégorie (soft-delete : `isActive = false`) |

Les routes admin exigent un compte `ADMIN` (JWT + `authorize('ADMIN')`) et chaque mutation est tracée dans `audit_logs`.

## 2. Paramètres de requête de `GET /v1/listings`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `q` | string (≤ 100) | absent | Recherche insensible à la casse sur le titre, la description et le nom de la boutique |
| `category` | string (≤ 140) | absent | Slug de catégorie |
| `type` | `PRODUCT` \| `PHYSICAL` \| `SECOND_HAND` \| `SERVICE` | absent | Filtre de type (voir règle ci-dessous) |
| `site` | `KAMBOINSIN` \| `OUAGA` | absent | Site de la boutique : **seul élément de localisation exposé** |
| `availability` | `AVAILABLE` \| `OUT_OF_STOCK` \| `PAUSED` | absent | Disponibilité de l'annonce |
| `minPriceCents` | entier ≥ 0 | absent | Prix minimum inclusif, en centimes |
| `maxPriceCents` | entier ≥ 0 | absent | Prix maximum inclusif, en centimes |
| `sort` | `popular` \| `recent` \| `price-asc` \| `price-desc` | `recent` | Tri serveur |
| `page` | entier ≥ 1 | `1` | Numéro de page (1-indexé) |
| `limit` | entier 1…24 | `12` | Taille de page : **12 par défaut, 24 au maximum** |

Règles complémentaires :

- `type=PRODUCT` regroupe `PHYSICAL` + `SECOND_HAND` (`type IN ['PHYSICAL','SECOND_HAND']`) ; les autres valeurs filtrent un type exact.
- Les prix sont exprimés **en centimes** (FCFA × 100) dans les deux sens : requête et réponse (`priceCents`). Le formulaire affiche des francs et convertit avec `Math.round(valeur * 100)`.
- `sort` : `popular` = vues décroissantes puis récence, `recent` = `publishedAt` décroissant, `price-asc` / `price-desc` = prix puis récence.
- `maxPriceCents` doit être supérieur ou égal à `minPriceCents`, sinon la validation Zod renvoie une erreur.
- La réponse contient `listings` et `pagination` (`page`, `limit`, `total`, `pages`, `hasMore`).

## 3. Performance

- Le flux `count + findMany` est exécuté dans une **seule transaction** (`prisma.$transaction([...])`) : total et page sont cohérents et ne coûtent qu'un aller-retour.
- Chaque carte ne charge **qu'une seule photo** grâce à `listingCardInclude` (`photos: { take: 1, orderBy: { position: 'asc' } }`) ; le DTO public n'expose aucun champ superflu.
- Index relationnels présents : `[status, publishedAt]`, `[status, viewsCount]`, `[status, categoryId, publishedAt]`, `[status, storeId, publishedAt]` et `[locationId, isActive]` (jointure boutique → site).
- Recherche textuelle : extension **pg_trgm** avec index **GIN** sur `title` et `description` (`listings_title_trgm_idx`, `listings_description_trgm_idx`).
- Côté client, la saisie est **débouncée de 300 ms** avant navigation (historique remplacé), et un **`requestId`** ignore les réponses périmées lorsque l'utilisateur change rapidement de filtre.

## 4. Rappel RG — localisation privée (RG-17)

Seul le **site** (`KAMBOINSIN` ou `OUAGA`) est public, via `store.site`. Les champs **bâtiment, chambre et étage** (`buildingNumber`, `roomNumber`, `floor`, `reference`) ne doivent jamais apparaître dans un DTO public ni dans la page de découverte : ils ne sont révélés qu'au commerçant concerné par une commande, via le snapshot de commande.

Aucun vocabulaire de paiement : la commande est un engagement de remise, le règlement se fait hors plateforme.

## 5. Administration des catégories

Le panneau `/admin` → onglet **Catégories** permet de :

- **Créer** une catégorie (nom, icône, position ; le slug est généré par le backend s'il n'est pas fourni) ;
- **Renommer** / **réordonner** via `PATCH /v1/admin/categories/:id` (`name`, `slug`, `icon`, `position`, `isActive`, `parentId`) ;
- **Activer / désactiver** une catégorie sans la supprimer ;
- **Archiver** une catégorie via `DELETE /v1/admin/categories/:id`.

L'archivage est un **soft-delete** (`isActive = false`) : les annonces existantes et l'historique des commandes sont préservés. Une catégorie inactive disparaît de `GET /v1/categories` et donc des filtres publics.
