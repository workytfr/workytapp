/** Copie fidèle de workyt-next : lib/exams/common.ts */
/** Outils communs aux calculateurs de moyenne (bac, brevet). */

export interface WeightedNote {
    note: number | null;
    coef: number;
}

/** Note saisie valide (0 à 20), sinon null. */
export function parseNote(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n <= 20 ? n : null;
}

/** Somme pondérée des notes renseignées et coefficients correspondants. */
export function weighted(items: WeightedNote[]) {
    let points = 0;
    let filledCoef = 0;
    let totalCoef = 0;
    for (const it of items) {
        totalCoef += it.coef;
        if (it.note === null) continue;
        points += it.note * it.coef;
        filledCoef += it.coef;
    }
    return { points, filledCoef, totalCoef, average: filledCoef > 0 ? points / filledCoef : null };
}

export interface Mention {
    label: string;
    min: number;
}

/** Mentions du bac et du brevet (félicitations du jury depuis 2021 au bac, 2025 au brevet). */
export const MENTIONS: Mention[] = [
    { label: "Très bien avec félicitations du jury", min: 18 },
    { label: "Très bien", min: 16 },
    { label: "Bien", min: 14 },
    { label: "Assez bien", min: 12 },
    { label: "Admis sans mention", min: 10 },
];

export function mentionFor(avg: number): Mention | null {
    return MENTIONS.find((m) => avg >= m.min) ?? null;
}

/** Arrondi d'affichage au centième, à la française. */
export function fmt(n: number, digits = 2): string {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
