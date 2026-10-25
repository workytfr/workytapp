/** Copie fidèle de workyt-next : lib/pomodoro/fable.ts */
/**
 * « Corvy et Foxy », la fable de Workyt, d'après « Le Corbeau et le Renard »
 * (La Fontaine, 1668). Mise en scène du Pomodoro : Corvy tient le fromage
 * pendant le focus, Foxy (les distractions) tente de le flatter. Cette fois,
 * le corbeau connaît la leçon : tenir jusqu'au bout = garder le fromage.
 *
 * Chaque pomodoro réussi débloque un couplet (2 vers) : 9 pomodoros pour
 * réciter la fable entière.
 */

export const FABLE_TITLE = "Corvy et Foxy";
export const FABLE_CREDIT = "D'après Le Corbeau et le Renard, Jean de La Fontaine (1668)";

export const FABLE_VERSES = [
    "Maître Corvy, sur sa branche perché,",
    "Tenait en son bec un fromage.",
    "Maître Foxy, par l'odeur alléché,",
    "Lui tint à peu près ce langage :",
    "« Hé ! bonjour, Monsieur Corvy ! Que vous travaillez bien !",
    "Un esprit aussi vif mérite qu'il se repose :",
    "Une vidéo, deux messages, cela ne coûte rien,",
    "Et vous en savez tant… Parlons donc d'autre chose ! »",
    "Mais Corvy connaissait l'histoire de son aïeul ;",
    "Le bec bien fermé, il lança son minuteur :",
    "« Encore vingt-cinq minutes, je travaille tout seul.",
    "Repassez à la pause, Monsieur le flatteur. »",
    "Foxy flatta, rusa, chanta mille chansons ;",
    "Corvy ne broncha pas, tout à ses leçons.",
    "Puis la sonnerie vint : la pause était gagnée,",
    "Et le fromage aussi, bouchée après bouchée.",
    "Tout flatteur, on le sait, vit aux dépens de qui l'écoute ;",
    "Qui ne l'écoute pas garde son fromage, sans doute.",
] as const;

export const VERSES_PER_POMODORO = 2;
export const POMODOROS_PER_FABLE = FABLE_VERSES.length / VERSES_PER_POMODORO;

/** Avancement dans la fable à partir du nombre total de pomodoros réussis. */
export function fableProgress(completed: number) {
    const recitations = Math.floor(completed / POMODOROS_PER_FABLE);
    const inCurrent = completed % POMODOROS_PER_FABLE;
    // Fable terminée pile : on l'affiche en entier plutôt que vide
    const shown = inCurrent === 0 && completed > 0 ? POMODOROS_PER_FABLE : inCurrent;
    return {
        recitations,
        unlockedVerses: shown * VERSES_PER_POMODORO,
        complete: shown === POMODOROS_PER_FABLE,
    };
}

/** Flatteries de Foxy pendant le focus : ce sont les distractions. */
export const FOX_FLATTERIES = [
    "Hé, Monsieur du Corbeau… une petite vidéo, juste une ?",
    "Que vous êtes joli ! Vos notifications vous réclament.",
    "Vous avez tellement travaillé, une pause bien méritée, non ?",
    "Un si beau ramage mérite un petit tour sur les réseaux…",
    "Sans mentir, cet exercice peut bien attendre demain.",
    "Le Phénix des hôtes de ces bois ne vérifie pas son téléphone ?",
    "Allez, ouvrez le bec, racontez-moi votre journée !",
    "Juste un coup d'œil au groupe de classe, ça ne compte pas…",
] as const;

/** Réponses de Corvy (pauses / victoire). */
export const CROW_LINES = {
    idle: "Le fromage est prêt. On s'y met quand tu veux.",
    focus: "Bec fermé, je reste concentré.",
    paused: "Pause… Foxy rôde, ne tarde pas trop.",
    shortBreak: "Une bouchée de fromage bien méritée.",
    longBreak: "Grande pause : je savoure tout mon fromage.",
    kept: "J'ai gardé mon fromage ! Tout flatteur peut repasser.",
    stolen: "J'ai ouvert le bec… On ne m'y prendra plus !",
} as const;

export const FOX_LINES = {
    idle: "Hmm… ça sent bon le fromage par ici.",
    paused: "Tiens, tiens, le bec s'entrouvre ?",
    break: "Bon, je repasserai plus tard…",
    kept: "Grrr, raté pour cette fois.",
    stolen: "Cette leçon vaut bien un fromage, sans doute !",
} as const;
