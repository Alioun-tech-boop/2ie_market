# Espace d’administration 2ie Market

L’administration est une console distincte du site public, disponible sur `/admin`.
Elle nécessite une session valide dont le rôle `ADMIN` est relu en base à chaque requête.

## Sécurité serveur

- Toutes les routes `/v1/admin/*` sont protégées par `authenticate` puis `authorize('ADMIN')`.
- Les écritures admin sont limitées à 60 requêtes par minute et à 200 requêtes globales par minute.
- Les mutations sensibles sont protégées par la vérification d’origine déjà appliquée à l’API.
- Les corps de requête sont validés par Zod en mode strict ; les identifiants sont des UUID validés.
- Les accès Prisma sont paramétrés, sans concaténation SQL.
- Chaque opération sensible est écrite dans `audit_logs` avec l’acteur, la cible, l’action et les métadonnées utiles.
- La suspension d’un compte révoque immédiatement ses refresh tokens.
- Les uploads de logo passent par la validation MIME, la limite de taille et le réencodage WebP existants.

## Données exposées

- Les profils admin contiennent les coordonnées utiles à la modération (e-mail, téléphone, site), mais jamais le bâtiment, la chambre ou l’étage.
- Les commandes globales exposent le client (nom, prénom), la référence, le site, les boutiques et les montants. Aucune adresse, aucun téléphone et aucune coordonnée de livraison détaillée ne sont renvoyés.
- Les signalements exposent l’annonce, le motif, le détail et l’identité publique du signaleur, sans e-mail ni téléphone.
- Le journal d’audit expose l’acteur admin avec son e-mail, car il s’agit d’une trace de responsabilité interne.

## Fonctionnalités

### Vue d’ensemble
Indicateurs consolidés, activité par site, commandes par statut et dernières opérations d’audit.

### Utilisateurs
Recherche par nom, e-mail ou téléphone, filtres rôle/statut, fiche détaillée, suspension/réactivation et gestion des rôles `CLIENT` / `MERCHANT`.
Le rôle `ADMIN` est protégé : il ne peut être ni attribué ni retiré via cette API, et un administrateur ne peut pas modifier son propre rôle ou son propre statut.
La promotion en `MERCHANT` exige une boutique existante. Une rétrogradation désactive la boutique et met ses annonces publiées en pause.

### Annonces
Recherche, filtres statut/type/site/mise en avant, consultation publique, masquage, restauration, archivage et mise à la une.
Les actions sont logiques : masquer = `PAUSED`, restaurer = `PUBLISHED`, supprimer = `ARCHIVED`. Aucune suppression physique n’est effectuée.
Une annonce masquée ou archivée est automatiquement retirée de la une.

### Commandes
Recherche par référence `CMD-…`, filtre par site et par statut, statistiques générales et détail des sous-commandes par boutique.

### Signalements
Les utilisateurs connectés peuvent signaler une annonce publiée depuis la page de l’annonce (`POST /v1/listings/:id/reports`).
L’administration consulte les signalements ouverts, les résout ou les rejette avec une note facultative, et conserve la trace de la décision.

### Catégories
Création, modification, activation/archivage des catégories, avec audit de chaque opération.

### Plateforme
Nom public, logo, e-mail de support, message d’information et activation des avis.
Ces paramètres sont persistés dans `platform_settings`, exposés publiquement via `GET /v1/platform` et réellement utilisés par le site :
- nom et logo dans l’en-tête, le pied de page et le contexte de marque ;
- e-mail de support dans le pied de page ;
- message d’information en bannière publique ;
- activation des avis dans les routes publiques de boutique.

## Migration

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

La migration `20261121000000_admin` ajoute `reports`, `platform_settings`, `listings.is_featured`,
`listings.featured_at` et la relation d’audit vers l’acteur.

## Vérifications

```bash
npm run build
```

Les tests E2E PostgreSQL nécessitent une base disponible et la migration appliquée.
