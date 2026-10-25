// Généré depuis workyt-next/src/data/badges.ts — ne pas modifier à la main.
// Sert de repli hors ligne ; à l'exécution, /api/badges fait foi.

export interface BadgeDef {
    slug: string;
    name: string;
    description: string;
    /** Chemin sur le site (ex. /badge/forum_answer_1.svg) */
    icon: string;
    category: 'progression' | 'engagement' | 'performance' | 'special';
    rarity: 'commun' | 'rare' | 'épique' | 'légendaire';
}

export const BADGE_CATALOG: BadgeDef[] = [
    {
        slug: "forum_answer_1",
        name: "Repondeur niveau 1",
        description: "A poste 1 reponse sur le forum.",
        icon: "/badge/forum_answer_1.svg",
        category: "engagement",
        rarity: "commun"
    },
    {
        slug: "forum_answer_2",
        name: "Repondeur niveau 2",
        description: "A poste 10 reponses sur le forum.",
        icon: "/badge/forum_answer_2.svg",
        category: "engagement",
        rarity: "commun"
    },
    {
        slug: "forum_answer_3",
        name: "Repondeur niveau 3",
        description: "A poste 50 reponses sur le forum.",
        icon: "/badge/forum_answer_3.svg",
        category: "engagement",
        rarity: "rare"
    },
    {
        slug: "forum_answer_4",
        name: "Repondeur niveau 4",
        description: "A poste 200 reponses sur le forum.",
        icon: "/badge/forum_answer_4.svg",
        category: "engagement",
        rarity: "épique"
    },
    {
        slug: "forum_answer_5",
        name: "Repondeur niveau 5",
        description: "A poste 500 reponses sur le forum.",
        icon: "/badge/forum_answer_5.svg",
        category: "engagement",
        rarity: "légendaire"
    },
    {
        slug: "forum_validated_1",
        name: "Expert niveau 1",
        description: "A eu 1 reponse validee.",
        icon: "/badge/forum_validated_1.svg",
        category: "performance",
        rarity: "commun"
    },
    {
        slug: "forum_validated_2",
        name: "Expert niveau 2",
        description: "A eu 5 reponses validees.",
        icon: "/badge/forum_validated_2.svg",
        category: "performance",
        rarity: "rare"
    },
    {
        slug: "forum_validated_3",
        name: "Expert niveau 3",
        description: "A eu 20 reponses validees.",
        icon: "/badge/forum_validated_3.svg",
        category: "performance",
        rarity: "épique"
    },
    {
        slug: "course_completed_1",
        name: "Etudiant assidu 1",
        description: "A termine 1 cours.",
        icon: "/badge/course_completed_1.svg",
        category: "progression",
        rarity: "commun"
    },
    {
        slug: "course_completed_2",
        name: "Etudiant assidu 2",
        description: "A termine 5 cours.",
        icon: "/badge/course_completed_2.svg",
        category: "progression",
        rarity: "rare"
    },
    {
        slug: "course_completed_3",
        name: "Etudiant assidu 3",
        description: "A termine 20 cours.",
        icon: "/badge/course_completed_3.svg",
        category: "progression",
        rarity: "épique"
    },
    {
        slug: "quiz_success_1",
        name: "Quiz Master 1",
        description: "A reussi 1 quiz.",
        icon: "/badge/quiz_success_1.svg",
        category: "performance",
        rarity: "commun"
    },
    {
        slug: "quiz_success_2",
        name: "Quiz Master 2",
        description: "A reussi 10 quiz.",
        icon: "/badge/quiz_success_2.svg",
        category: "performance",
        rarity: "rare"
    },
    {
        slug: "quiz_success_3",
        name: "Quiz Master 3",
        description: "A reussi 50 quiz.",
        icon: "/badge/quiz_success_3.svg",
        category: "performance",
        rarity: "épique"
    },
    {
        slug: "quiz_perfect_1",
        name: "Perfectionniste",
        description: "A obtenu un score parfait (100%) sur un quiz.",
        icon: "/badge/quiz_perfect_1.svg",
        category: "performance",
        rarity: "rare"
    },
    {
        slug: "quiz_perfect_2",
        name: "Sans faute",
        description: "A obtenu 10 scores parfaits sur des quiz.",
        icon: "/badge/quiz_perfect_2.svg",
        category: "performance",
        rarity: "épique"
    },
    {
        slug: "quiz_perfect_3",
        name: "Infaillible",
        description: "A obtenu 50 scores parfaits sur des quiz.",
        icon: "/badge/quiz_perfect_3.svg",
        category: "performance",
        rarity: "légendaire"
    },
    {
        slug: "fiche_created_1",
        name: "Auteur niveau 1",
        description: "A cree 1 fiche.",
        icon: "/badge/fiche_created_1.svg",
        category: "engagement",
        rarity: "commun"
    },
    {
        slug: "fiche_created_2",
        name: "Auteur niveau 2",
        description: "A cree 5 fiches.",
        icon: "/badge/fiche_created_2.svg",
        category: "engagement",
        rarity: "rare"
    },
    {
        slug: "fiche_created_3",
        name: "Auteur niveau 3",
        description: "A cree 20 fiches.",
        icon: "/badge/fiche_created_3.svg",
        category: "engagement",
        rarity: "épique"
    },
    {
        slug: "fiche_liked_1",
        name: "Apprecie",
        description: "A recu 10 likes sur ses fiches.",
        icon: "/badge/fiche_liked_1.svg",
        category: "engagement",
        rarity: "commun"
    },
    {
        slug: "fiche_liked_2",
        name: "Populaire",
        description: "A recu 50 likes sur ses fiches.",
        icon: "/badge/fiche_liked_2.svg",
        category: "engagement",
        rarity: "rare"
    },
    {
        slug: "fiche_liked_3",
        name: "Star des fiches",
        description: "A recu 200 likes sur ses fiches.",
        icon: "/badge/fiche_liked_3.svg",
        category: "engagement",
        rarity: "épique"
    },
    {
        slug: "fiche_bookmarked_1",
        name: "Reference",
        description: "Ses fiches ont ete mises en favoris 10 fois.",
        icon: "/badge/fiche_bookmarked_1.svg",
        category: "engagement",
        rarity: "rare"
    },
    {
        slug: "fiche_bookmarked_2",
        name: "Incontournable",
        description: "Ses fiches ont ete mises en favoris 50 fois.",
        icon: "/badge/fiche_bookmarked_2.svg",
        category: "engagement",
        rarity: "épique"
    },
    {
        slug: "fiche_diverse_1",
        name: "Polyvalent",
        description: "A cree des fiches dans 5 matieres differentes.",
        icon: "/badge/fiche_diverse_1.svg",
        category: "engagement",
        rarity: "rare"
    },
    {
        slug: "streak_3",
        name: "Flamme naissante",
        description: "A maintenu un streak de 3 jours.",
        icon: "/badge/streak_3.svg",
        category: "progression",
        rarity: "commun"
    },
    {
        slug: "streak_7",
        name: "Flamme stable",
        description: "A maintenu un streak de 7 jours.",
        icon: "/badge/streak_7.svg",
        category: "progression",
        rarity: "commun"
    },
    {
        slug: "streak_14",
        name: "Flamme ardente",
        description: "A maintenu un streak de 14 jours.",
        icon: "/badge/streak_14.svg",
        category: "progression",
        rarity: "rare"
    },
    {
        slug: "streak_30",
        name: "Flamme infernale",
        description: "A maintenu un streak de 30 jours.",
        icon: "/badge/streak_30.svg",
        category: "progression",
        rarity: "rare"
    },
    {
        slug: "flamme_eternelle",
        name: "Flamme eternelle",
        description: "A maintenu un streak de 60 jours.",
        icon: "/badge/flamme_eternelle.svg",
        category: "progression",
        rarity: "épique"
    },
    {
        slug: "flamme_legendaire",
        name: "Flamme legendaire",
        description: "A maintenu un streak de 100 jours.",
        icon: "/badge/flamme_legendaire.svg",
        category: "progression",
        rarity: "légendaire"
    },
    {
        slug: "points_150",
        name: "Sensei",
        description: "A atteint le Monde des Mangas (150 pts).",
        icon: "/badge/points_150.svg",
        category: "progression",
        rarity: "commun"
    },
    {
        slug: "points_500",
        name: "Etudiant",
        description: "A atteint le Monde Francais (500 pts).",
        icon: "/badge/points_500.svg",
        category: "progression",
        rarity: "commun"
    },
    {
        slug: "points_1200",
        name: "Renardeau",
        description: "A atteint le Monde des Renards et Fees (1 200 pts).",
        icon: "/badge/points_1200.svg",
        category: "progression",
        rarity: "rare"
    },
    {
        slug: "points_2500",
        name: "Hockeyeur",
        description: "A atteint le Monde Quebecois (2 500 pts).",
        icon: "/badge/points_2500.svg",
        category: "progression",
        rarity: "rare"
    },
    {
        slug: "points_4000",
        name: "Sphinx",
        description: "A atteint le Monde Egyptien (4 000 pts).",
        icon: "/badge/points_4000.svg",
        category: "progression",
        rarity: "épique"
    },
    {
        slug: "points_5500",
        name: "Nomade",
        description: "A atteint le Monde des Neiges et des Sables (5 500 pts).",
        icon: "/badge/points_5500.svg",
        category: "progression",
        rarity: "épique"
    },
    {
        slug: "points_7000",
        name: "Immortel",
        description: "A atteint le Monde de l'Imaginaire (7 000 pts).",
        icon: "/badge/points_7000.svg",
        category: "progression",
        rarity: "légendaire"
    },
    {
        slug: "mushroom_first",
        name: "Premier boost",
        description: "A utilise son premier champignon.",
        icon: "/badge/mushroom_first.svg",
        category: "special",
        rarity: "commun"
    },
    {
        slug: "mushroom_10",
        name: "Mycologue",
        description: "A utilise 10 champignons.",
        icon: "/badge/mushroom_10.svg",
        category: "special",
        rarity: "rare"
    },
    {
        slug: "mushroom_50",
        name: "Champi-addict",
        description: "A utilise 50 champignons.",
        icon: "/badge/mushroom_50.svg",
        category: "special",
        rarity: "épique"
    },
    {
        slug: "calendar_7",
        name: "Habitue",
        description: "A reclame 7 recompenses du calendrier.",
        icon: "/badge/calendar_7.svg",
        category: "progression",
        rarity: "commun"
    },
    {
        slug: "calendar_30",
        name: "Assidu",
        description: "A reclame 30 recompenses du calendrier.",
        icon: "/badge/calendar_30.svg",
        category: "progression",
        rarity: "rare"
    },
    {
        slug: "calendar_100",
        name: "Fidele",
        description: "A reclame 100 recompenses du calendrier.",
        icon: "/badge/calendar_100.svg",
        category: "progression",
        rarity: "épique"
    },
    {
        slug: "seniority_1",
        name: "Pionnier",
        description: "Inscrit depuis 1 an.",
        icon: "/badge/seniority_1.svg",
        category: "special",
        rarity: "rare"
    },
    {
        slug: "seniority_2",
        name: "Loyal",
        description: "Inscrit depuis 2 ans.",
        icon: "/badge/seniority_2.svg",
        category: "special",
        rarity: "épique"
    },
    {
        slug: "clan_win_1",
        name: "Palissade",
        description: "A remporte sa premiere Guerre des Clans.",
        icon: "/badge/guerredesclans_level1.svg",
        category: "performance",
        rarity: "commun"
    },
    {
        slug: "clan_win_5",
        name: "Bourg fortifie",
        description: "A remporte 5 Guerres des Clans.",
        icon: "/badge/guerredesclans_level2.svg",
        category: "performance",
        rarity: "rare"
    },
    {
        slug: "clan_win_15",
        name: "Chateau fort",
        description: "A remporte 15 Guerres des Clans.",
        icon: "/badge/guerredesclans_level3.svg",
        category: "performance",
        rarity: "rare"
    },
    {
        slug: "clan_win_30",
        name: "Citadelle",
        description: "A remporte 30 Guerres des Clans.",
        icon: "/badge/guerredesclans_level4.svg",
        category: "performance",
        rarity: "épique"
    },
    {
        slug: "clan_win_60",
        name: "Capitale imprenable",
        description: "A remporte 60 Guerres des Clans.",
        icon: "/badge/guerredesclans_level5.svg",
        category: "performance",
        rarity: "légendaire"
    },
    {
        slug: "mentorship_started_1",
        name: "Premier pas",
        description: "A commence un suivi avec un benevole de Workyt.",
        icon: "/badge/suivi_premier_pas.svg",
        category: "engagement",
        rarity: "commun"
    },
    {
        slug: "mentorship_goal_1",
        name: "Objectif atteint",
        description: "A atteint un objectif de son plan de suivi.",
        icon: "/badge/suivi_objectif.svg",
        category: "progression",
        rarity: "commun"
    },
    {
        slug: "mentorship_goal_10",
        name: "Cap sur la reussite",
        description: "A atteint 10 objectifs de suivi.",
        icon: "/badge/suivi_objectifs.svg",
        category: "progression",
        rarity: "rare"
    },
    {
        slug: "mentorship_success_1",
        name: "Remontee",
        description: "A termine un suivi avec son objectif atteint.",
        icon: "/badge/suivi_remontee.svg",
        category: "performance",
        rarity: "épique"
    },
    {
        slug: "mentorship_duo_4",
        name: "Assidus",
        description: "A tenu 4 semaines de serie avec son binome de suivi.",
        icon: "/badge/suivi_binome_4.svg",
        category: "engagement",
        rarity: "rare"
    },
    {
        slug: "mentorship_duo_12",
        name: "Inseparables",
        description: "A tenu 12 semaines de serie avec son binome de suivi.",
        icon: "/badge/suivi_binome_12.svg",
        category: "engagement",
        rarity: "légendaire"
    },
    {
        slug: "mentor_completed_1",
        name: "Premier accompagnement",
        description: "A mene un suivi jusqu'a son terme.",
        icon: "/badge/mentor_1.svg",
        category: "engagement",
        rarity: "commun"
    },
    {
        slug: "mentor_completed_5",
        name: "Guide",
        description: "A mene 5 suivis jusqu'a leur terme.",
        icon: "/badge/mentor_5.svg",
        category: "engagement",
        rarity: "rare"
    },
    {
        slug: "mentor_completed_15",
        name: "Phare",
        description: "A mene 15 suivis jusqu'a leur terme.",
        icon: "/badge/mentor_15.svg",
        category: "engagement",
        rarity: "légendaire"
    },
    {
        slug: "mentor_subjects_3",
        name: "Touche-a-tout",
        description: "A accompagne des eleves dans 3 matieres differentes.",
        icon: "/badge/mentor_polyvalent.svg",
        category: "special",
        rarity: "rare"
    },
    {
        slug: "halloween_2025",
        name: "Halloween 2025",
        description: "A participe a l'evenement Halloween 2025.",
        icon: "/badge/halloween2025.png",
        category: "special",
        rarity: "légendaire"
    }
];
