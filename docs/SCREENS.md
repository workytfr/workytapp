# 📱 Workyt App — Écrans & parcours (UX)

> Maquettes textuelles, hiérarchie visuelle et intentions UX de chaque écran.
> Approche : *mobile-first, une intention par écran, parcours sans friction.*

---

## Carte des écrans

```
Auth
 └─ login                → entrée

(tabs)  — navigation persistante
 ├─ index    (Accueil)   → tableau de bord gamifié
 ├─ courses  (Cours)     → catalogue d'apprentissage
 ├─ forum    (Forum)     → entraide
 └─ profile  (Profil)    → identité, badges, réglages

forum
 ├─ [id]                 → détail d'une question
 └─ create               → poser une question
```

---

## 1. Login — première impression

**Intention** : rassurer + connecter vite.

```
        ●  (logo Workyt)
        Workyt
   Connecte-toi pour continuer

 ┌─────────────────────────────┐
 │ Email                       │
 │ [ ✉  ton@email.com        ] │
 │ Mot de passe          👁     │
 │ [ 🔒 ••••••••            ] │
 │              Mot de passe ? │
 │                             │
 │  ▟ SE CONNECTER  →  ▙       │  ← DuoButton 3D (orange)
 │        —— ou ——             │
 │  [ Continuer avec Discord ] │
 └─────────────────────────────┘
      Pas de compte ? S'inscrire
```

**UX**
- Bouton primaire = `DuoButton` orange, unique et dominant.
- État loading sur le bouton (pas de spinner plein écran).
- Erreurs affichées **dans** la carte, près des champs.

---

## 2. Accueil — tableau de bord gamifié

**Intention** : donner envie de progresser (dopamine douce).

```
╭─────────────────────────────╮  ← header gradient (niveau)
│ [★ Niveau]      (avatar)    │
│ Salut, Nadir !              │
│ Monde : Les Explorateurs    │
│ ⭐ 1250 pts   🏅 Niveau 4    │
╰─────────────────────────────╯
 ┌ Progression ──────────────┐
 │ 320 pts avant niveau 5     │
 │ ▓▓▓▓▓▓░░░░  62 %           │
 └───────────────────────────┘
 Actions rapides
 [Cours] [Forum] [Quiz] [Fiches]
 Ton activité
 [12 Q] [34 R] [8 Fiches]
 Derniers badges  → scroll →
```

**UX**
- **Loi de Hick** : 4 actions rapides max.
- La progression est *au-dessus de la ligne de flottaison* (motivation immédiate).
- Empty state si nouveau : « Gagne tes 1ers points en posant une question ».

---

## 3. Forum — entraide

**Intention** : trouver ou poser vite.

- Liste de questions = cartes papier : titre, extrait, tags matière, statut (résolu/en attente via **couleur + icône**).
- **FAB** (bouton flottant orange 3D) « + » en bas à droite → `forum/create`.
- Recherche + filtres par matière en haut, repliables.

### 3b. Créer une question
- 1 champ titre, 1 zone contenu (markdown), sélection matière/niveau.
- Bouton primaire `DuoButton` « Publier ». Désactivé tant que titre vide → prévention d'erreur.

---

## 4. Cours — apprentissage

**Intention** : parcours clair de progression.

- Regroupement par **matière → niveau**.
- Chaque cours : carte avec progression (%) + icône matière teintée.
- Piste de progression verticale possible (façon « chemin » Duolingo) en évolution.

---

## 5. Profil — identité & fierté

**Intention** : montrer ses accomplissements.

- En-tête : avatar, pseudo, niveau/monde, points.
- Grille de badges (rareté colorée + label).
- Réglages : thème (clair/sombre auto), notifications, déconnexion.

---

## Règles UX globales (Nielsen appliqué)

| Heuristique | Mise en œuvre Workyt |
|-------------|----------------------|
| Visibilité de l'état | Barre d'onglets persistante, progression toujours visible |
| Correspondance monde réel | Vocabulaire élève : « points », « badges », « mondes » |
| Contrôle utilisateur | Retour arrière natif, annulation possible |
| Prévention d'erreur | Boutons désactivés tant que le formulaire est incomplet |
| Reconnaissance > rappel | Labels visibles, icônes explicites |
| Esthétique & minimalisme | 1 action primaire/écran, papier épuré |
| Aide à récupérer d'une erreur | Messages clairs + action « Réessayer » |

---

## Parcours clé — « Poser une question »

```
Accueil ──tap Forum──▶ Liste forum ──tap FAB +──▶ Créer
   ▲                                                  │
   └───────── Toast « +10 XP » ◀── Publier ◀──────────┘
```

Objectif : **≤ 3 taps** entre l'accueil et la publication. Récompense XP immédiate à la fin (boucle d'engagement).
