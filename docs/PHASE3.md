# Phase 3 — Panier, commandes et suivi

> Objectif P3 : passer d'une sélection d'annonces à une **commande enregistrée**, répartie par commerçant, avec suivi de statuts et confirmation affichée uniquement après enregistrement réel en base.

## Objectif de la phase

- **Panier persistant** : les articles et les notes par boutique sont conservés en base (Prisma/PostgreSQL), rattachés à l'utilisateur connecté.
- **Commandes réparties par commerçant** : un panier contenant N boutiques produit un numéro global et N sous-commandes, une par boutique.
- **Suivi de statuts** : chaque sous-commande évolue selon une machine à états fermée ; le statut du groupe est agrégé à partir des sous-commandes.
- **Confirmation après enregistrement réel en base** : aucun écran de confirmation anticipé, aucune validation « simulée ». La confirmation n'est affichée qu'après une réponse HTTP `2xx` du `POST /v1/orders`.

Le parcours complet est décrit dans `docs/ARCHITECTURE.md` (§ 6, parcours P3 et P4).

## Règle absolue — aucun paiement en ligne

La plateforme n'encaisse rien et n'exécute aucune opération financière. **Aucun paiement en ligne, aucune fausse transaction ni confirmation de paiement.** Le règlement se fait directement entre client et commerçant ; **WhatsApp reste le seul canal de contact**.

Vocabulaire autorisé, à utiliser dans les écrans, les réponses API et les notifications :

- « **commande enregistrée** » ;
- « **accord direct** » ;
- « **remise en main propre / point de rendez-vous** ».

Sont proscrits : « payé », « en attente de paiement », « transaction », « confirmation de paiement », « solde », « remboursement ». Une validation aboutit à une *commande enregistrée* suivie d'un *accord direct* entre le client et le commerçant, jamais à un paiement.

## Modèle de données

| Modèle | Champs clés | Rôle |
|---|---|---|
| `CartItem` | `userId`, `listingId`, `quantity` (1–99), `createdAt` | Ligne de panier ; unique par `(userId, listingId)` |
| `CartNote` | `userId`, `storeId`, `note` (≤ 500 caractères) | Note facultative, une par boutique ; unique par `(userId, storeId)` |
| `OrderGroup` | `reference`, `clientId`, `totalCents`, `currency`, `deliveryMode`, `meetingPointId`, `meetingNote`, statut agrégé, snapshot client, `orders[]` | Numéro global et contexte commun à toutes les sous-commandes |
| `Order` | `orderNumber`, `orderGroupId`, `clientId`, `storeId`, `status`, `totalCents`, `clientNote`, `deliveryMode`, snapshot client, `items[]` | Sous-commande : exactement une par boutique |
| `OrderItem` | `orderId`, `listingId` (nullable, `RESTRICT`), `snapshotTitle`, `snapshotType`, `unitPriceCents`, `quantity`, `lineTotalCents` | Ligne figée : le prix et le titre ne sont jamais relus depuis l'annonce |
| `MeetingPoint` | `site`, `label`, `description`, `isActive` | Point de rendez-vous par site, proposé aux commandes `MEETUP_POINT` |

### Numérotation et séparation par boutique

- Le `OrderGroup` porte une référence globale `CMD-YYYYMMDD-XXXX` (ex. `CMD-20261120-A3F2`).
- Les sous-commandes reprennent cette référence avec un suffixe séquentiel sur deux chiffres : `CMD-20261120-A3F2-01`, `CMD-20261120-A3F2-02`, …
- N boutiques dans le panier ⇒ N sous-commandes, chacune rattachée à un seul `storeId`.
- Chaque sous-commande reçoit la note de panier correspondant à sa boutique (`CartNote.note` → `Order.clientNote`).

### Snapshot client

La confirmation de commande enregistre, dans le groupe **et** dans chaque sous-commande, les données du client au moment de la commande :

- nom (`snapshotClientName`) ;
- téléphone au format E.164 (`snapshotClientPhone` / `snapshotClientWhatsapp`) ;
- site (`snapshotSite`) ;
- bâtiment (`snapshotBuildingNumber`), chambre (`snapshotRoomNumber`), étage (`snapshotFloor`) ;
- référence calculée (`snapshotLocationRef`), ex. `B1.87 R0`.

Ces valeurs sont figées : une modification du profil ou de la localisation après la commande ne réécrit pas l'historique. Le libellé du point de rendez-vous est également snapshoté dans la sous-commande (`snapshotMeetingPointLabel`).

## API endpoints

| Méthode | Route | Garde | Description |
|---|---|---|---|
| GET | `/v1/cart` | session | Panier du client, groupé par boutique, avec notes et sous-totaux |
| POST | `/v1/cart/items` | session | Ajout ou mise à jour d'une quantité (`upsert`) |
| PATCH | `/v1/cart/items/:listingId` | session | Modification de la quantité d'un article présent |
| DELETE | `/v1/cart/items/:listingId` | session | Retrait d'un article du panier |
| PATCH | `/v1/cart/notes` | session | Écriture de la note pour une boutique |
| DELETE | `/v1/cart` | session | Vidage du panier (articles + notes) |
| GET | `/v1/meeting-points` | public | Points de rendez-vous actifs |
| GET | `/v1/orders` | session | Historique des groupes de commandes du client |
| GET | `/v1/orders/:reference` | session | Détail d'un groupe appartenant au client |
| POST | `/v1/orders` | session | Enregistrement du panier : groupe + sous-commandes, puis retour du groupe |
| PATCH | `/v1/me/orders/:id/status` | `MERCHANT` | Mise à jour du statut d'une sous-commande possédée |

Contrôles lors de la confirmation de commande : panier non vide, annonce `PUBLISHED`, boutique active, annonce `AVAILABLE`, quantité ≤ stock disponible, annonce n'appartenant pas au client, mode de remise proposé par la boutique, point de rendez-vous actif, téléphone E.164 valide.

## Statuts et transitions

| Statut | Transitions autorisées |
|---|---|
| `PENDING` | `CONFIRMED`, `REJECTED`, `CANCELLED` |
| `CONFIRMED` | `PREPARING`, `CANCELLED` |
| `PREPARING` | `READY`, `CANCELLED` |
| `READY` | `COMPLETED` |
| `REJECTED` | terminal |
| `COMPLETED` | terminal |
| `CANCELLED` | terminal |

Une transition non listée est refusée (`400 INVALID_STATUS`). Le statut du `OrderGroup` est recalculé à partir de ses sous-commandes : `COMPLETED` si toutes le sont, `CANCELLED` si toutes le sont, sinon le statut le plus significatif selon l'ordre `PENDING > REJECTED > PREPARING > READY > CONFIRMED`.

Le suivi est alimenté par les notifications `ORDER_PLACED` (confirmation client), `NEW_ORDER` (commerçant) et `ORDER_STATUS` (client), créées dans la même transaction que la mutation correspondante et diffusées en SSE après commit. Voir `docs/NOTIFICATIONS_WHATSAPP.md`.

## Garantie base de données et confirmation

- La création du `OrderGroup`, des `Order`, des `OrderItem` et des notifications est exécutée dans **une transaction Prisma** (`prisma.$transaction`).
- Le panier (`CartItem` + `CartNote`) n'est vidé **qu'après succès** de cette transaction, dans le même bloc transactionnel : un échec ne laisse ni commande partielle ni panier perdu.
- Le groupe créé est relu après la transaction pour construire le DTO retourné.
- Le frontend n'affiche la confirmation qu'après réponse HTTP `2xx`. Toute erreur (`4xx`/`5xx`) laisse le panier intact et n'affiche aucun écran de confirmation : il n'existe pas de « fausse » commande enregistrée côté client.

## Règles de gestion complémentaires

- Le **site** (`KAMBOINSIN` / `OUAGA`) est une information publique. Le bâtiment, la chambre et l'étage ne sont visibles que par le propriétaire du compte et par le commerçant concerné par la commande, via le snapshot ; ils n'apparaissent dans aucun DTO public.
- **RBAC** : le client ne voit que ses propres groupes et sous-commandes (`clientId`) ; le commerçant ne met à jour que ses sous-commandes via `store.ownerId` (sinon `404`).
- Les prix sont stockés en **centimes** (`*Cents`) et affichés en **XOF** ; `0` s'affiche « **Gratuit** ».
- Le client ne peut pas commander ses propres annonces ; un commerçant reste client possible ailleurs, jamais dans sa propre boutique.
- Les quantités sont limitées à `1..99` et plafonnées au stock disponible ; les articles devenus indisponibles sont rejetés au checkout (`409 CART_CHANGED`).
- Les snapshots (`OrderItem`, snapshot client) sont immuables : l'historique des commandes n'est jamais réécrit.
- Le contact après commande se fait uniquement par lien `wa.me` pré-rempli, sans API payante.

## Vérification

```bash
npm run prisma:validate -w @2ie/api
npm run prisma:generate -w @2ie/api
npm run build -w @2ie/api
npm run build -w @2ie/web
```

Tests E2E à faire avec PostgreSQL : panier persistant → quantités et notes par boutique → confirmation de commande multi-boutiques → référence `CMD-…` et sous-commandes `-01`/`-02` → vidage du panier après succès uniquement → transitions de statuts → contrôle d'accès client/commerçant → affichage de la confirmation après `2xx`.

> Docker et `psql` sont absents de l'environnement courant : les tests E2E avec une base PostgreSQL réelle restent à exécuter dans un environnement disposant de ces outils (ou d'une `DATABASE_URL` PostgreSQL accessible).
