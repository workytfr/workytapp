/** Copie fidèle de workyt-next : lib/exams/bac.ts */
/**
 * Baccalauréat, session 2027 (élèves entrés en première à la rentrée 2025).
 * Total : 100 coefficients, 60 pour les épreuves finales, 40 pour le contrôle
 * continu (moyennes annuelles de première et de terminale).
 *
 * Nouveautés 2027 : épreuve anticipée de mathématiques en fin de première
 * (coefficient 2) et grand oral ramené à 8 (général) / 12 (technologique).
 */

import { weighted, type WeightedNote } from "./common";

export type BacVoie = "generale" | "technologique";

export interface BacSubject {
    key: string;
    label: string;
    coef: number;
    group: "epreuves" | "controle";
    hint?: string;
}

export function bacSubjects(voie: BacVoie): BacSubject[] {
    const g = voie === "generale";
    return [
        { key: "francaisEcrit", label: "Français écrit (anticipé)", coef: 5, group: "epreuves", hint: "Fin de première" },
        { key: "francaisOral", label: "Français oral (anticipé)", coef: 5, group: "epreuves", hint: "Fin de première" },
        { key: "mathsAnticipe", label: "Mathématiques (épreuve anticipée)", coef: 2, group: "epreuves", hint: "Nouveauté 2027, fin de première" },
        { key: "spe1", label: "Spécialité 1", coef: 16, group: "epreuves" },
        { key: "spe2", label: "Spécialité 2", coef: 16, group: "epreuves" },
        { key: "philo", label: "Philosophie", coef: g ? 8 : 4, group: "epreuves" },
        { key: "grandOral", label: "Grand oral", coef: g ? 8 : 12, group: "epreuves" },

        { key: "speAbandonnee", label: "Spécialité abandonnée en fin de première", coef: 8, group: "controle" },
        { key: "hg", label: "Histoire-géographie", coef: 6, group: "controle" },
        { key: "lva", label: "Langue vivante A", coef: 6, group: "controle" },
        { key: "lvb", label: "Langue vivante B", coef: 6, group: "controle" },
        g
            ? { key: "ensSci", label: "Enseignement scientifique", coef: 6, group: "controle" }
            : { key: "mathsTechno", label: "Mathématiques", coef: 6, group: "controle" },
        { key: "eps", label: "EPS", coef: 6, group: "controle" },
        { key: "emc", label: "Enseignement moral et civique", coef: 2, group: "controle" },
    ];
}

/** Chaque enseignement optionnel compte coefficient 2 par année suivie. */
export const OPTION_COEF_PER_YEAR = 2;

export interface BacResult {
    average: number | null;
    filledCoef: number;
    totalCoef: number;
    points: number;
    /** Moyenne à obtenir sur ce qui reste à saisir pour atteindre chaque seuil (null si plus rien à saisir) */
    needed: { target: number; note: number }[] | null;
}

export function computeBac(items: WeightedNote[]): BacResult {
    const w = weighted(items);
    const remaining = w.totalCoef - w.filledCoef;
    const needed = remaining > 0 && w.filledCoef > 0
        ? [10, 12, 14, 16].map((target) => ({ target, note: (target * w.totalCoef - w.points) / remaining }))
        : null;
    return { ...w, needed };
}

/** Résultat d'après la moyenne : admis, oral de rattrapage (8 à 10) ou ajourné. */
export function bacStatus(avg: number): "admis" | "rattrapage" | "ajourne" {
    if (avg >= 10) return "admis";
    if (avg >= 8) return "rattrapage";
    return "ajourne";
}
