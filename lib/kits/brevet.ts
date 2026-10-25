/** Copie fidèle de workyt-next : lib/exams/brevet.ts */
/**
 * Diplôme national du brevet, sessions 2026 et 2027 (arrêté du 10 avril 2025,
 * note de service du 11 septembre 2026). Note finale sur 20 :
 *   60 % épreuves finales (coefficients ci-dessous, total 10)
 *   40 % contrôle continu (moyenne des moyennes annuelles de 3e, toutes au même poids)
 * Enseignement facultatif : les points au-dessus de 10 s'ajoutent au total des
 * moyennes du contrôle continu, sans le faire dépasser 20.
 */

import { weighted, type WeightedNote } from "./common";

export const BREVET_EXAMS: { key: string; label: string; coef: number; hint?: string }[] = [
    { key: "francais", label: "Français", coef: 2 },
    { key: "maths", label: "Mathématiques", coef: 2 },
    { key: "hg", label: "Histoire-géographie", coef: 1.5 },
    { key: "emc", label: "Enseignement moral et civique", coef: 0.5 },
    { key: "sciences", label: "Sciences", coef: 2, hint: "2 disciplines parmi SVT, physique-chimie, technologie" },
    { key: "oral", label: "Oral", coef: 2 },
];

export const BREVET_DISCIPLINES = [
    "Français",
    "Mathématiques",
    "Histoire-géographie",
    "Enseignement moral et civique",
    "Langue vivante 1",
    "Langue vivante 2",
    "SVT",
    "Physique-chimie",
    "Technologie",
    "Arts plastiques",
    "Éducation musicale",
    "EPS",
];

export interface BrevetResult {
    exams: number | null;
    controle: number | null;
    final: number | null;
    /** Moyenne nécessaire aux épreuves finales pour avoir 10 (si le contrôle continu est connu) */
    neededExams: number | null;
}

export function computeBrevet(exams: WeightedNote[], disciplines: (number | null)[], option: number | null): BrevetResult {
    const e = weighted(exams).average;
    const filled = disciplines.filter((n): n is number => n !== null);
    let controle: number | null = null;
    if (filled.length > 0) {
        const bonus = option !== null ? Math.max(0, option - 10) : 0;
        controle = Math.min(20, (filled.reduce((a, b) => a + b, 0) + bonus) / filled.length);
    }
    const final = e !== null && controle !== null ? 0.6 * e + 0.4 * controle : e ?? controle;
    const neededExams = controle !== null ? (10 - 0.4 * controle) / 0.6 : null;
    return { exams: e, controle, final, neededExams };
}
