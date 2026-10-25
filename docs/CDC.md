# 📋 Cahier des charges — Application mobile Workyt

> Document produit. Définit **ce qu'on reprend du site workyt.fr**, **comment on l'adapte au mobile**, et **dans quel ordre on le construit**.
> Cible : app native iOS + Android (Expo/React Native), publiable sur App Store & Play Store.

---

## 1. Vision

Transformer l'expérience d'apprentissage Workyt en une app **mobile, fun et addictive** (boucles d'engagement façon Duolingo) avec une **identité propre** : style papier, orange & beige, ultra-lisible.

**Objectif nº1** : qu'un élève ouvre l'app **tous les jours** (streak, récompenses quotidiennes, notifications).

---

## 2. Ce que propose le site (inventaire)

L'API du site expose déjà (dossier `src/app/api/`) :

| Domaine | Endpoints web | Statut app |
|---------|---------------|:---------:|
| **Auth** | `auth/login`, `register`, `me`, `reset` | 🟡 partiel (login) |
| **Cours / leçons** | `cours`, `courses`, `lessons`, `sections`, `curriculum` | 🟡 écran présent |
| **Forum** | `forum`, `comment`, `reports` | 🟡 écrans présents |
| **Fiches de révision** | `fiches`, `bookmarks` | 🔴 à faire |
| **Quiz / exercices** | `quizzes`, `exercises`, `submissions`, `evaluations` | 🔴 à faire |
| **Gamification** | `badges`, `chests`, `gems`, `mushrooms`, `quests`, `streak`, `calendar`, `inventory`, `recompenses`, `award` | 🟡 badges/points OK |
| **Progression** | `competencies`, `certificates`, `dashboard`, `student-profile` | 🔴 à faire |
| **Social / temps réel** | `notifications`, `live-events`, `youtube-live` | 🔴 à faire |
| **Compte** | `user`, `users`, `avatar`, `student-profile` | 🟡 profil présent |

Légende : 🟢 fait · 🟡 partiel · 🔴 à faire

---

## 3. Ce qu'on prend pour le mobile (et ce qu'on laisse)

### ✅ On reprend (cœur élève)
- **Cours & leçons** — consultation, progression.
- **Fiches de révision** — parfait usage mobile (réviser dans les transports).
- **Quiz / exercices** — format tap-friendly, idéal mobile.
- **Forum** — poser/répondre, notifications.
- **Toute la gamification** — streak, calendrier quotidien, coffres, gemmes, quêtes, badges, récompenses. C'est le moteur d'engagement mobile.
- **Profil & progression** — badges, compétences, certificats.
- **Notifications push** — rappels de streak, réponses au forum.

### ⏸️ On reporte / on laisse au web
- **Admin** (adhérents, rôles, métriques, kanban, contributeurs) → reste web.
- **Génération de cours**, imports curriculum, gestion partenaires, adhésion/carte → web.
- **Certificats PDF** → génération côté web, simple consultation/téléchargement sur mobile.

**Principe** : le mobile = **consommation + engagement quotidien**. Le web = **création + administration**.

---

## 4. Comment mieux l'intégrer sur mobile (valeur ajoutée native)

| Fonction | Web actuel | Amélioration mobile |
|----------|-----------|---------------------|
| Streak | Compteur sur dashboard | **Notification push** quotidienne + animation flamme à l'ouverture |
| Récompenses (calendar) | Page dédiée | **Rappel push** + collecte en 1 tap dès l'accueil |
| Quiz | Formulaire web | Interface **plein écran tap-to-answer**, feedback haptique |
| Fiches | Liste web | **Mode révision hors-ligne** (cache local via AsyncStorage) |
| Notifications | Cloche web | **Push natives** (Expo Notifications) |
| Auth | Formulaire | **Biométrie** (Face ID / empreinte) via `expo-local-authentication` |
| Progression | Tableaux | **Parcours visuel** vertical (chemin d'apprentissage) |
| Coffres / gemmes | Icônes | **Animations d'ouverture** (Reanimated) — dopamine |

---

## 5. Périmètre par version (roadmap)

### 🚀 MVP (v1.0 — publiable App Store)
Objectif : app utile + boucle d'engagement minimale.
- [ ] Auth complète (login, register, reset, session persistante, biométrie option).
- [ ] Accueil dashboard gamifié (points, niveau, streak, progression).
- [ ] Forum : lire, poser, répondre.
- [ ] Cours : parcourir + consulter une leçon.
- [ ] Fiches de révision : liste + lecture.
- [ ] Profil : badges, stats, réglages, déconnexion.
- [ ] Design system « papier » appliqué partout (`DuoButton`, cartes, thème).
- [ ] Notifications push basiques (réponse forum + rappel streak).

### 🎮 v1.1 — Engagement
- [ ] Calendrier de récompenses quotidien + collecte 1 tap.
- [ ] Quêtes journalières.
- [ ] Coffres / gemmes avec animations d'ouverture.
- [ ] Quiz / exercices interactifs plein écran.

### 📈 v1.2 — Progression
- [ ] Compétences & parcours visuel.
- [ ] Certificats (consultation).
- [ ] Mode hors-ligne des fiches.
- [ ] Live events / YouTube live.

---

## 6. Architecture technique

| Sujet | Choix | État |
|-------|-------|:----:|
| Framework | Expo (React Native) + expo-router | ✅ |
| Langage | TypeScript | ✅ |
| Navigation | expo-router (file-based, comme Next.js) | ✅ |
| Appels API | `lib/api.ts` → réutilise l'API REST du site | ✅ |
| Auth / session | `expo-secure-store` (tokens sécurisés) | ✅ |
| Cache / offline | `@react-native-async-storage/async-storage` | ✅ dispo |
| Animations | `react-native-reanimated` | ✅ dispo |
| Notifications | `expo-notifications` | 🔴 à ajouter |
| Biométrie | `expo-local-authentication` | 🔴 à ajouter |
| Build / publication | **EAS Build** + **EAS Submit** | 🔴 à configurer |

**Réutilisation clé** : l'app **ne recrée pas de backend**. Elle consomme la **même API** que le site → cohérence des données garantie.

---

## 7. Contraintes & exigences

- **Design** : style papier orange/beige, polices Funnel Display + Montserrat (identiques au web). Voir [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
- **Accessibilité** : contraste AA minimum, cibles ≥ 44 px, testé clair/sombre.
- **Performance** : écran d'accueil interactif < 2 s. Skeletons plutôt que spinners.
- **Cohérence web/app** : mêmes points, badges, niveaux, mondes que le site.
- **Publication** : bundle IDs déjà réservés (`fr.workyt.app`). Nécessite compte Apple Developer (99 $/an) + Google Play (25 $ une fois).

---

## 8. Critères de succès (MVP)

- App validée et publiée sur les 2 stores.
- Parcours « poser une question » en ≤ 3 taps.
- Streak fonctionnel avec notification quotidienne.
- 0 couleur codée en dur (tout via `useColors()`).
- 0 erreur TypeScript (`npx tsc --noEmit`).

---

## 9. Prochaine étape recommandée

1. Appliquer `DuoButton` + thème papier sur **login** puis **accueil** (impact visuel immédiat).
2. Brancher réellement les données API manquantes (fiches, quiz).
3. Configurer **EAS Build** pour générer un premier build de test (`eas build --profile preview`).

> Docs liées : [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) · [`COMPONENTS.md`](./COMPONENTS.md) · [`SCREENS.md`](./SCREENS.md)
