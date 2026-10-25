# API gamification & progression (côté app)

Routes du site `workyt-next` qui acceptent **aussi** le jeton Bearer de l'app (patch `src/lib/bearerUser.ts` : `currentUserEmail()` / `currentUserId()`). Client : `lib/gamification.ts`.

> ⚠️ Le patch doit être **déployé** sur workyt.fr pour que ces écrans fonctionnent dans l'app. Avant ça, ils répondent 401 → l'app affiche un état « indisponible ».

Erreurs communes : 401 non connecté · 404 utilisateur introuvable · 429 `{ error, retryAfter }` (rate limit) · 500 `{ error }`.

| Domaine | Route | Notes |
|---|---|---|
| Série | `GET /api/streak` | `{ success, data: { currentStreak, longestStreak, lastActivityDate, milestones[] } }` — paliers 3/7/14/30/60/100 j |
| | `POST /api/streak/claim` `{ milestoneDays }` | 5/min · 400 palier invalide / non atteint / déjà réclamé |
| Quêtes | `GET /api/quests?type=daily\|weekly\|monthly` | `{ quests[] }` (auto-initialisées) · `needsSeed` si base vide |
| | `POST /api/quests/:id/claim` | 5/min · **erreurs métier en 500** avec `{ error }` → afficher le message |
| Coffres | `GET /api/chests` | catalogue lecture seule · **5/min** → cache 30 min |
| Calendrier | `GET /api/calendar/data?startDate&endDate` | dates locales `YYYY-MM-DD` (1er et dernier jour du mois) |
| | `POST /api/calendar/claim` `{ date }` | jour même uniquement · 3/min · bloqué si quiz du jour non résolu (« quiz ») ou héros évanoui |
| Gemmes | `GET /api/gems/balance`, `GET /api/gems/history?limit&skip` | achats/conversion **non** ouverts à l'app |
| Inventaire | `GET /api/inventory`, `POST /api/inventory` `{ cosmeticType, cosmeticId, action }` | 10/min |
| Champignons | `GET /api/mushrooms`, `GET /api/mushrooms/boosts`, `POST /api/mushrooms/use` `{ boostType }` | coûts 1/2/3 · soigne aussi le héros |
| Héros | `GET /api/hero`, `POST /api/hero/heal`, `POST /api/hero/monster-strike` | heal = 1 champignon |
| Quiz du jour | `GET /api/daily-quiz/play`, `POST /api/daily-quiz/start`, `POST /api/daily-quiz/play` `{ answerIndex }` | le chrono démarre au `start` · victoire = XP héros |
| Compétences | `GET /api/competencies/by-course?courseId` | connexion facultative |
| Points | `GET /api/user/me/points` | |
| Live | `GET /api/live-events` | déjà publique |

Non ouvertes à l'app (volontairement) : `calendar/init` (admin), gestion des quiz du jour (bénévoles), `certificates/*` (attestations de bénévoles, admin), achats de gemmes.

Sur le site, tout cela vit sur `src/app/recompenses` (BattleModal, AdventureBoard, GuildQuests), `src/app/calendrier`, `src/app/gems`, et les indicateurs de la barre de navigation (StreakIndicator, MushroomIndicator, QuestsPanel).
