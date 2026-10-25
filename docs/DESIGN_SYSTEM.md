# 🎨 Workyt App — Design System « Papier »

> Identité visuelle de l'application mobile Workyt.
> Style **papier / cahier**, palette **orange & beige**, pensé pour être **fun** (façon Duolingo) tout en restant **ultra-lisible pour tous les yeux** (contrastes AA).

---

## 1. Principes

| Principe | Traduction concrète |
|----------|---------------------|
| **Papier & chaleur** | Fonds crème/beige, cartes « feuille », bordures façon trait de crayon. Jamais de blanc/gris froid pur. |
| **Fun & tactile** | Boutons 3D qui s'enfoncent, gros radius, gamification (XP, badges, niveaux, mondes). |
| **Lisible pour tous** | Texte brun encre foncé sur papier clair → contraste ≥ 4.5:1. Tailles minimales respectées. |
| **Cohérent avec le site** | Mêmes polices que workyt.fr : **Funnel Display** (titres) + **Montserrat** (texte). |

---

## 2. Couleurs

Source de vérité : [`lib/theme.ts`](../lib/theme.ts). **Ne jamais coder une couleur en dur** dans un écran — toujours passer par `useColors()`.

### Palette clair (papier) — alignée sur les tokens `--wk-*` du site (globals.css)

| Rôle | Token | Hex | Usage |
|------|-------|-----|-------|
| Primaire | `primary` | `#FF6A1A` | Orange Workyt (`--wk-accent`) : boutons, FAB, points |
| Socle 3D | `primaryDark` | `#C24A0A` | Bordure basse des boutons 3D (ombre `wk-btn-orange`) |
| Orange texte | `accent` | `#C24A0A` | Liens, libellés de matière (lisible sur papier) |
| Miel | `accent2` | `#FFB547` | XP, étoiles, compte à rebours |
| Ciel | `accent3` | `#6EC1E4` | Raccourcis, décor |
| Pomme | `accent4` | `#7ED957` | Raccourcis, décor |
| Fond | `background` | `#FDFAF4` | Papier (`--wk-paper`) |
| Surface | `surface` | `#FFFFFF` | Cartes |
| Surface variante | `surfaceVariant` | `#F5EFE3` | Pastilles de niveau, pistes de barres (`--wk-paper-2`) |
| Texte | `text` / `ink` | `#1A1512` | Encre (`--wk-ink`) |
| Texte secondaire | `textSecondary` | `#635E5A` | Encre à 68 % |
| Texte discret | `textMuted` | `#8C8883` | Encre à 50 % |
| Bordure | `border` | `#E9E5DE` | Encre à 8 % |

> **Dark mode** : même identité, encre en fond (`#1A1512`) et papier en texte.
> Les couleurs viennent toutes de `lib/theme.ts` ; `useColors()` et `lib/colors.ts` n'en sont que des alias.

### Briques partagées (`components/wk.tsx`)

`PageHeader` (surtitre + grand titre au point orange), `ContentCard` (carte commune fiches/forum/cours/favoris, comme `ContentCard` du site), `SubjectLabel`, `LevelChip`, `FicheStatus`, `QuestionStatus`, `ChipTabs`, `EmptyState`, `SkeletonList`, `XpBar`, `IconButton`.

## 3. Typographie

Polices identiques au site (chargées via `@expo-google-fonts`).

| Token | Police | Emploi |
|-------|--------|--------|
| `display` | **Funnel Display 700** | Titres, boutons, chiffres clés |
| `heading` | **Montserrat 700** | Sous-titres forts |
| `semiBold` | Montserrat 600 | Labels, boutons secondaires |
| `medium` | Montserrat 500 | Emphases légères |
| `regular` | Montserrat 400 | Corps de texte |

### Échelle (`typography.size`)

```
xs 11 · sm 12 · base 14 · lg 16 · xl 18 · 2xl 20 · 3xl 24 · 4xl 28 · 5xl 32
```

**Règle lisibilité** : le corps de texte ne descend jamais sous `base` (14). Les titres d'écran utilisent `3xl`/`4xl` en `display`.

---

## 4. Espacement, rayons, ombres

```ts
spacing : xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40
radius  : sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · full 9999
```

- **Rayons généreux** partout (`lg`+) pour le côté doux/papier.
- **Ombres** : discrètes (`shadows.sm`/`md`). Le relief vient surtout des **bordures** et des **boutons 3D**, pas d'ombres portées lourdes.

---

## 5. Composant signature — Bouton 3D

Fichier : [`components/DuoButton.tsx`](../components/DuoButton.tsx)

Un bouton en deux couches : une **face** posée sur un **socle** plus foncé. Au tap, la face descend de `5px` → sensation d'enfoncement satisfaisante.

```tsx
import DuoButton from '../components/DuoButton';

<DuoButton label="Se connecter" icon="arrow-forward" onPress={handleLogin} />
<DuoButton label="Continuer" variant="accent" size="md" />
<DuoButton label="Valider" variant="success" />
```

| Prop | Valeurs | Défaut |
|------|---------|--------|
| `variant` | `primary` · `accent` · `success` · `danger` · `white` | `primary` |
| `size` | `sm` · `md` · `lg` | `lg` |
| `icon` | nom Ionicons | — |
| `fullWidth` | booléen | `true` |
| `disabled` | booléen | `false` |

---

## 6. Anatomie « papier » d'une carte

```
┌───────────────────────────────┐  ← surface #FFFDF8
│  bordure 1px #E4D3B8          │  ← trait crayon
│                               │  ← radius xl (20)
│   Titre (Funnel Display)      │
│   Texte (Montserrat)          │
│                               │
└───────────────────────────────┘  ← ombre sm à peine visible
```

Recette :
```ts
{
  backgroundColor: colors.surface,
  borderRadius: radius.xl,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  ...shadows.sm,
}
```

---

## 7. Checklist accessibilité (à chaque écran)

- [ ] Texte principal en `colors.text` sur `background`/`surface` (jamais gris clair sur beige).
- [ ] Cibles tactiles ≥ 44×44 px.
- [ ] Aucune info portée **uniquement** par la couleur (ajouter icône/texte).
- [ ] Contraste vérifié pour tout texte < 18px (viser ≥ 4.5:1).
- [ ] Test réel en plein soleil + en mode sombre.

---

## 8. Fichiers liés

- [`COMPONENTS.md`](./COMPONENTS.md) — catalogue des composants
- [`SCREENS.md`](./SCREENS.md) — maquettes des écrans
- [`lib/theme.ts`](../lib/theme.ts) — tokens (source de vérité)
