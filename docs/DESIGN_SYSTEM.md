# 2ie Market — Système de design & direction artistique (v1.0)

> Complément de `ARCHITECTURE.md`. Ce document décrit **uniquement la couche présentation**.
> Aucune règle métier n'a été modifiée : prix en centimes affichés en XOF (RG-05), WhatsApp
> en E.164 via `wa.me` (RG-04), localisation détaillée jamais rendue publique (RG-17),
> aucun vocabulaire ni parcours de paiement (RG-12).

## 1. Principe directeur

**Aéré, premium, immédiatement reconnaissable.** Beaucoup de blanc, une hiérarchie typographique
forte, des surfaces bleu clair, une seule couleur d'accent chaude réservée aux actions et
bonnes affaires. Aucune densité inutile, aucune décoration qui concurrence le contenu.

## 2.Tokens

### Couleurs
| Rôle | Token | Valeur | Usage |
|---|---|---|---|
| Bleu institutionnel | `brand.800` | `#163274` | CTA principal, titre, navigation |
| Bleu principal hover | `brand.700` | `#1E3F91` | Survol des actions |
| Bleu profond | `brand.950` | `#0C1B3D` | Hero headline |
| Bleu clair surfaces | `brand.50` | `#F2F6FF` | Fonds secondaires, pastilles |
| Canvas | `canvas` | `#F7FAFF` | Sections alternées |
| Blanc | `white` | `#FFFFFF` | Dominante |
| Separations | `line` | `#E6ECF5` | Borders subtiles |
| Texte principal | `ink` | `#0F172A` | Corps, titres secondaires |
| Texte secondaire | `ink.muted` | `#5B6B82` | Descriptions (contraste AA) |
| Accent chaude | `accent.600` | `#A85F14` | Bonnes affaires, accents (contraste AA) |
| Accent clair | `accent.50` | `#FFF7ED` | Fond de la section « Bonnes affaires » |

### Typographie
- Famille unique : **Plus Jakarta Sans** (400 → 800), fallback `Inter`, `system-ui`.
- Échelle : `text-xs` métadonnées, `text-sm` corps de carte, `text-base` paragraphes,
  `text-2xl`/`text-3xl` titres de section, `text-4xl` → `64px` hero.
- `tracking-[-0.035em]` sur le hero, `tracking-[0.14em]` sur les eyebrows.

### Rayons, ombres, mouvement
- Rayons : `xl = 20px`, `2xl = 24px`, `3xl = 32px`, pastilles `full`.
- Ombres : `soft` (quasi invisible), `card` (flottante légère), `lift` (survol).
- Easing unique : `cubic-bezier(0.22, 1, 0.36, 1)`. Durées 150-300 ms.
- Animations : `fade-up` (entrée), `shimmer` (skeletons), `toast-in`, `float` (décor).
- `prefers-reduced-motion` : toutes les animations sont désactivées.

## 3.Composants réutilisables

### `components/ui`
| Composant | Responsabilité |
|---|---|
| `Button` + `buttonStyles()` | 6 variantes (primary, secondary, ghost, accent, outline, soft), 3 tailles, état `loading`, micro-interaction `active:scale` |
| `Badge` | 5 tons, option `dot`, libellés uppercase |
| `Card` | Surface standard, option `hoverable` (translation + ombre) |
| `Input` | Label, icône, hint, erreur accessible (`aria-invalid`, `aria-describedby`) |
| `SearchBar` | Variantes `hero` / `compact`, filtre site intégré, bouton d'effacement |
| `Avatar` | Initiales sur dégradé ou image uploadée, 3 tailles, 6 tons |
| `Skeleton` | Shimmer réutilisable |
| `EmptyState` | Icône + titre + description + action |
| `SectionHeader` | Eyebrow, titre, description, lien d'action avec flèche animée |
| `Price` | Format XOF, libellé « Tarif » pour les services, « Gratuit » si 0 |
| `SiteChip` | Site élargi uniquement — **jamais** bâtiment/chambre/étage |
| `Toast` / `useToast` | Provider + notifications auto-dismiss (3,8 s), 3 tons |
| `Logo` | Monogramme SVG « 2 » + point accent, avec/sans wordmark |

### `components/market`
`ProductCard`, `ServiceCard`, `VendorCard`, `CategoryCard`, `ProductImage`,
`WhatsappButton`, `ProductCardSkeleton`.

### `components/layout`
`Header` (desktop + mobile), `MobileBottomNav` (5 onglets, safe-area), `Footer`.

### `components/sections`
`HeroSection`, `CategoriesSection`, `PopularProductsSection`, `ServicesSection`,
`NewVendorsSection`, `DealsSection`.

## 4.Page d'accueil — structure

1. Header sticky, translucide, logo + navigation + Connexion / S'inscrire.
2. Hero centré : badge, headline, sous-titre, recherche centrale, filtres de site,
   double CTA, trois signaux de confiance (remise, rendez-vous, WhatsApp).
3. Catégories illustrées (6 cartes).
4. Produits populaires (grille 2 → 4 colonnes, skeletons, état vide).
5. Services (fond canvas, libellé « Tarif »).
6. Nouveaux vendeurs (storefront + WhatsApp).
7. Bonnes affaires (fond accent clair, badge accent).
8. Footer professionnel, puis navigation mobile fixe.

## 5.Responsive

- Mobile : grille 2 colonnes, barre de recherche pleine largeur, navigation basse à 5 onglets,
  `pb-20` pour ne jamais masquer le contenu, `env(safe-area-inset-bottom)`.
- `md` : la navigation basse disparaît, la navigation horizontale prend le relais.
- `lg` : navigation complète, hero 64 px, grilles 4 colonnes.
- Aucun débordement horizontal mesuré à 375 px de largeur utile.

## 6.États et micro-interactions

- **Chargement** : 4 skeletons produits pendant 700 ms en entrée (démo UI).
- **Vide** : `EmptyState` avec action « Effacer les filtres ».
- **Confirmation** : toasts « Bientôt disponible » sur les actions non encore câblées.
- **Hover** : survol des cartes = -4 px + ombre `lift` ; boutons = scale 0.98 au clic.
- **Focus** : ring bleu 4 px sur tous les éléments interactifs.

## 7.Notes d'intégration

Les seules données sont dans `src/data/demo.ts` et clairement marquées comme telles.
Les phases P1/P3 branches les composants sur l'API réelle ; les composants UI ne contiennent
aucune règle métier et n'appellent aucun service de paiement.

## 8.P1 — Authentification & profils

Nouvelles surfaces, sans rupture de la direction artistique :

- `AuthShell` : panneau éditorial bleu (arguments confiance) + carte blanche de formulaire.
- `/inscription` : sélecteur de rôle en deux cartes, coordonnées, `LocationForm`, bloc boutique
  conditionnel pour les commerçants. Erreurs de champ affichées sous chaque input.
- `/connexion` : formulaire deux champs, CTA pleine largeur, lien vers l'inscription.
- `LocationForm` : site, bâtiment, chambre, étage (`R0`…`R10`) et aperçu live de la référence
  `B1.87 R1`. Validation Zod partagée avec l'API.
- `/profil` : carte d'identité (rôle, statut, date d'inscription, référence) + onglets
  Informations / Localisation / Boutique ; upload photo de profil et logo marchand.
- `/admin` : liste des comptes, badges de rôle/statut, actions de suspension. Aucun contrôle
  de changement de rôle n'est exposé.
- `Header` : menu de compte contextuel (profil, boutique, administration, déconnexion).
- Routeurs protégés : visiteur redirigé vers `/connexion`, client redirigé hors de `/admin`.

Voir `AUTH.md` pour les règles de sécurité et les endpoints.
