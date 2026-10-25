import type { Reward } from './api';

type IconName = string;

/** Libellés des modes de classement des concours (cf. models/Reward.ts du site). */
export const METHOD_META: Record<Reward['method'], { label: string; icon: IconName; hint: string }> = {
    highestPoints: { label: 'Le plus de points', icon: 'flash', hint: 'Gagne un max de points pendant la période.' },
    mostRevisions: { label: 'Le plus de fiches', icon: 'document-text', hint: 'Publie le plus de fiches de révision.' },
    mostRevisionsInCategory: { label: 'Fiches par matière', icon: 'ribbon', hint: 'Publie le plus de fiches dans la matière.' },
};

export function formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${new Date(start).toLocaleDateString('fr-FR', opts)} → ${new Date(end).toLocaleDateString('fr-FR', opts)}`;
}
