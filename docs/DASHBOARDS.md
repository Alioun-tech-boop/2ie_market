# Tableaux de bord client et marchand

## Routes

- `/tableau-de-bord` : espace marchand, protégé par le rôle `MERCHANT`.
- `/espace-client` : espace client, protégé par les rôles `CLIENT`, `MERCHANT`, `ADMIN`.
- `/commandes` : même espace client, conservé pour les liens existants.

## Espace marchand

Sections disponibles :

1. Vue d'ensemble
2. Mes annonces
3. Ajouter un produit ou service
4. Mes commandes
5. Notifications
6. Ma boutique
7. Mes informations personnelles
8. Paramètres

Indicateurs calculés côté API sur l'ensemble des données de la boutique :

- produits publiés (`PHYSICAL` + `SECOND_HAND`) ;
- services publiés (`SERVICE`) ;
- commandes reçues ;
- commandes en attente ;
- commandes terminées ;
- vues cumulées des annonces.

Les graphiques affichent la répartition réelle des commandes par statut et les annonces les plus vues.

Le filtre de commandes appelle `GET /v1/me/dashboard?status=...`. Les indicateurs restent calculés sur toutes les commandes, pas seulement sur la liste filtrée.

Actions marchand : accepter, refuser, préparer, marquer prête, terminer ou annuler une commande selon les transitions autorisées.

## Espace client

Sections disponibles :

1. Mes commandes
2. Commandes en cours
3. Historique
4. Mes favoris
5. Mon panier
6. Mes informations
7. Notifications
8. Paramètres

Les données proviennent de `GET /v1/orders`, `GET /v1/cart`, `GET /v1/favorites`, `GET /v1/notifications` et de la session utilisateur. Aucune statistique n'est générée localement sans données réelles.

## Favoris

Nouveau modèle Prisma `Favorite` avec contrainte unique `(user_id, listing_id)`.

Endpoints :

- `GET /v1/favorites`
- `POST /v1/favorites/:listingId`
- `DELETE /v1/favorites/:listingId`

Le bouton cœur est disponible sur les cartes d'annonces et les fiches détail. Les favoris sont persistés en base et visibles dans l'espace client.

## Paramètres

La section Paramètres n'invente pas de préférences : elle expose les informations réellement enregistrées (rôle, statut du compte, boutique) et des liens vers les formulaires existants de profil, localisation, notifications et boutique.
