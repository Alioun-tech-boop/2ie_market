# Notifications internes et intégration WhatsApp

Ce document décrit le périmètre livré après P3 : centre de notifications persistant, temps réel dans l'instance, et liens WhatsApp préremplis.

## 1. Principe

- Aucun paiement, aucune transaction et aucune confirmation de paiement ne sont simulés.
- Le règlement et la remise se font directement entre le client et le commerçant.
- WhatsApp est uniquement un lien `https://wa.me/<numéro>` avec un message encodé. Aucun message n'est envoyé automatiquement : aucune API officielle n'est configurée.
- Le système de commandes reste totalement fonctionnel si WhatsApp est indisponible.

## 2. Modèle de notifications

`Notification` (table `notifications`) contient `userId`, `type`, `payload` JSON, `readAt`, `createdAt`.

Types utilisés :

| Type | Destinataire | Moment | Objectif |
|---|---|---|---|
| `ORDER_PLACED` | Client | Après enregistrement de la commande | Confirmation visible dans l'espace personnel |
| `NEW_ORDER` | Commerçant concerné | Après création de la sous-commande | Nouvelle commande dans le tableau de bord |
| `ORDER_STATUS` | Client | À chaque changement de statut d'une sous-commande | Suivi en temps réel |
| `LISTING_ARCHIVED` | Commerçant | Type réservé aux évolutions de modération | — |

Les notifications sont créées **dans la même transaction Prisma** que la commande ou le changement de statut. Elles ne sont publiées sur le bus d'événements qu'après `commit`, puis le panier n'est vidé qu'après succès de la transaction.

## 3. API notifications

Toutes les routes exigent une session (cookie `httpOnly`).

| Méthode | Route | Réponse |
|---|---|---|
| `GET` | `/v1/notifications` | `{ notifications, unreadCount }` (50 dernières) |
| `PATCH` | `/v1/notifications/:id/read` | `{ notification }` |
| `PATCH` | `/v1/notifications/read-all` | `{ ok, unreadCount: 0 }` |
| `GET` | `/v1/notifications/stream` | flux SSE (`text/event-stream`) |

Le filtre `userId` est appliqué côté serveur sur toutes les routes : un utilisateur ne peut lire ou marquer que ses propres notifications. Aucun changement de rôle ou d'identité n'est possible via ces endpoints.

### Server-Sent Events

- `EventSource` est ouvert avec `withCredentials: true` : la session JWT est transmise par cookie, aucun token n'est exposé au JavaScript.
- Événements :
  - `ready` : `{ unreadCount }` à la connexion ;
  - `notification` : le DTO complet dès qu'une notification est publiée ;
  - commentaire `: ping` toutes les 25 secondes pour maintenir le flux.
- Le bus est un `EventEmitter` en mémoire dans le processus Fastify. Cela couvre l'architecture actuelle (monolithe, une instance API). Pour plusieurs instances, remplacer le bus par Redis Pub/Sub ; les routes et le frontend restent inchangés.
- Un rafraîchissement HTTP de sécurité toutes les 90 secondes couvre les proxys qui couperaient le flux SSE.

## 4. Interface

### Commerçant

`/tableau-de-bord` affiche :

- un panneau « Notifications » avec les nouvelles commandes et les mises à jour ;
- le compteur `Commandes en attente` recomputé depuis les sous-commandes `PENDING`, rafraîchi immédiatement lors d'un événement `NEW_ORDER` reçu en SSE ;
- pour chaque commande : nom du client, téléphone, site, bâtiment/chambre/étage et référence de localisation, articles, quantités, prix, total, point de rendez-vous, instructions éventuelles et statut ;
- un bouton WhatsApp prérempli pour répondre au client.

### Client

- `/profil`, onglet **Notifications** : confirmation `ORDER_PLACED` et changements de statut.
- `/commandes` et `/commande/$reference` : récapitulatif complet, référence `CMD-…`, articles, prix unitaires, total et localisation.
- Le header affiche une cloche avec le nombre de notifications non lues.

Les notifications non lues sont marquées automatiquement quand on ouvre leur cible ; « Tout marquer » est disponible dans le panneau.

## 5. WhatsApp

### Numéro

Le numéro affiché provient du profil boutique du commerçant (`stores.whatsapp_e164`, saisi à l'inscription ou modifiable depuis `/profil`, onglet Boutique), normalisé en E.164 puis débarrassé du `+` pour `wa.me`.

### Messages préremplis

| Contexte | Contenu |
|---|---|
| Carte d'annonce / fiche annonce | Nom du produit ou service, prix affiché, référence `ANN-XXXXXX`, question de disponibilité |
| Boutique | Nom de la boutique et question sur les annonces disponibles |
| Commande côté client | Référence de la sous-commande et référence globale, récapitulatif articles/quantités/prix unitaires, total, localisation du client, instructions, demande de confirmation |
| Commande côté commerçant | Référence, récapitulatif, total, localisation et instructions du client |

La référence d'annonce est dérivée de l'identifiant (`ANN-` + 6 caractères) et exposée dans les DTO publics : aucune colonne supplémentaire et aucune information privée.

Tous les messages passent par `encodeURIComponent` via `whatsappLink()`. Les liens utilisent `target="_blank"` et `rel="noopener noreferrer"`.

Une phrase explicite accompagne les boutons : « message prérempli, aucun envoi automatique ».

## 6. Sécurité et confidentialité

- La localisation précise du client n'est pas exposée dans les DTO publics : elle est uniquement visible par le propriétaire du compte et par le commerçant concerné par la sous-commande.
- Le commerçant ne voit que ses propres sous-commandes (`store.ownerId`) ; le client ne voit que ses groupes (`clientId`).
- Les liens WhatsApp ne déclenchent aucune requête serveur et ne divulguent pas de données à un tiers avant le clic de l'utilisateur.
- Aucun statut de « paiement » n'est introduit ; seuls les statuts de commande métier sont utilisés.

## 7. Vérifications

Validé sans base de données :

- `npm run prisma:validate -w @2ie/api` ;
- `npm run build` ;
- `/health` → `200` ;
- `/v1/notifications`, `/v1/notifications/read-all` et `/v1/notifications/stream` sans session → `401`.

À valider avec PostgreSQL :

1. Appliquer la migration (enum `ORDER_PLACED` inclus) et le seed.
2. Client passe commande multi-boutiques → notifications `ORDER_PLACED` client et `NEW_ORDER` marchands.
3. SSE reçoit les événements ; cloche et tableau de bord se mettent à jour sans rechargement.
4. Marchand change le statut → notification `ORDER_STATUS` client et suivi mis à jour.
5. Ouvrir chaque lien WhatsApp : message prérempli complet et encodé, aucun envoi automatique.
6. Tenter de lire/marquer une notification appartenant à un autre compte → `404`.
