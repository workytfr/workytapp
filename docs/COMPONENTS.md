# 🧩 Workyt App — Catalogue de composants

> Chaque composant est décrit avec ses **états**, son **comportement tactile** et ses **règles UX**.
> Convention pro : *un composant = un rôle*, états explicites, feedback immédiat (< 100 ms).

---

## Principes d'interaction (transversaux)

| Règle UX | Application |
|----------|-------------|
| **Feedback immédiat** | Tout tap produit une réaction visible en < 100 ms (enfoncement, opacité, ripple). |
| **Cibles ≥ 44 px** | Zone tappable minimale, même si l'icône est plus petite (`hitSlop`). |
| **Motion utile** | Durées 120–250 ms, easing `ease-out`. Jamais d'animation qui bloque l'action. |
| **États complets** | Chaque composant définit : *default · pressed · disabled · loading · focus*. |
| **Une action primaire par écran** | Le bouton primaire orange est unique et dominant visuellement. |

---

## 1. `DuoButton` — Bouton 3D (action primaire)

**Rôle** : action principale d'un écran (valider, continuer, se connecter).

| État | Rendu |
|------|-------|
| Default | Face orange sur socle `primaryDark`, relief 5 px |
| Pressed | Face descend 5 px (socle disparaît) → « clic » |
| Disabled | Opacité 0.5, pas de relief |
| Loading | Remplacer le label par un spinner (à venir : prop `loading`) |

**Do**
- Un seul `DuoButton primary` par écran.
- Verbe d'action clair : « Se connecter », « Publier ».

**Don't**
- Empiler 3 boutons 3D (bruit visuel).
- L'utiliser pour une action destructrice sans `variant="danger"`.

```tsx
<DuoButton label="Publier ma question" icon="send" onPress={submit} />
```

---

## 2. `ModernCard` / `StatCard` / `ProgressCard`

**Rôle** : conteneurs de contenu façon « feuille de papier ».

- `ModernCard` : bloc générique (radius `xl`, bordure crayon, ombre `sm`).
- `StatCard` : chiffre-clé + icône teintée + label. Utilisé en grille de 3.
- `ProgressCard` : titre + barre de progression + %.

**Règle hiérarchie** : la valeur (`statValue`) en `Funnel Display`, le label en `Montserrat` discret. Le regard va au chiffre d'abord.

---

## 3. Champs de saisie (`TextInput`)

| État | Rendu |
|------|-------|
| Default | Bordure `border`, fond `background`, icône `textMuted` |
| Focus | Bordure `primary` (2 px), icône `primary` |
| Erreur | Bordure `error`, message sous le champ + icône alerte |
| Disabled | Opacité 0.6 |

**Do** : label toujours visible au-dessus (pas de placeholder-seul → mauvais pour la mémoire et l'accessibilité).
**Don't** : masquer le mot de passe sans bouton « œil ».

---

## 4. Barre d'onglets (`(tabs)/_layout`)

- 4 onglets max : **Accueil · Cours · Forum · Profil**.
- Icône + label courts. Onglet actif : `primary` plein ; inactif : `textMuted`.
- Toujours visible (navigation persistante) → règle Nielsen « visibilité de l'état système ».

---

## 5. Badges & niveaux (`HexagonBadge`, niveaux/mondes)

- **Gamification cœur du produit** : XP, niveaux, mondes, badges par rareté.
- Rareté codée par **couleur + libellé** (jamais couleur seule) : commun / rare / épique / légendaire.
- Badges récents en scroll horizontal sur l'accueil.

---

## 6. Feedback système (à standardiser)

| Type | Pattern recommandé |
|------|--------------------|
| Succès | Toast bas + micro-animation (ex : +10 XP qui monte) |
| Erreur réseau | Bandeau non-bloquant + bouton « Réessayer » |
| Chargement | Skeletons (pas de spinner plein écran si évitable) |
| Vide (empty state) | Illustration + phrase + 1 action (« Pose ta 1re question ») |

---

## Tokens de motion (proposition)

```ts
export const motion = {
  fast: 120,      // feedback tactile
  base: 200,      // transitions d'UI
  slow: 320,      // entrées d'écran
  easing: 'ease-out',
};
```

À ajouter dans `lib/theme.ts` pour uniformiser les animations (Reanimated est déjà installé).
