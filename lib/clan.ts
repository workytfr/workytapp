/**
 * Guerre des Clans — types, appels et catalogues repris du site
 * (workyt-next : lib/clanService.ts, lib/clanSoldierCatalog.ts,
 * lib/clanChatTemplates.ts). Les catalogues sont des DONNÉES PURES recopiées
 * telles quelles : le serveur revalide tout, le client ne fait que proposer.
 *
 * Les routes /api/clan acceptent le jeton Bearer via friends/_auth.ts.
 */
import { apiFetch } from './api';
import { getSiteOrigin } from './siteOrigin';

export type GateName = 'nord' | 'est' | 'sud';
export type ClanRole = 'attaquant' | 'defenseur' | 'soigneur';
export type Stance = 'assaut' | 'garnison';

export interface Gate { name: GateName; hp: number; hpMax: number; fallen: boolean }

export interface ClanEvent { type: string; message: string; [k: string]: unknown }

export interface RankingEntry {
    userId: string;
    username: string;
    dailyPoints: number;
    totalPoints: number;
    rank: number;
    nextMultiplier: number;
    wounded: boolean;
}

export interface MyClanData {
    season: string;
    day: number;
    clan: null | {
        id: string;
        name: string;
        bannerSeed: string;
        tier: number;
        tierName: string;
        gates: Gate[];
        keepHp: number;
        keepHpMax: number;
        daysWon: number;
        resources: number;
        buildings: string[];
        memberCount: number;
        dailyOrder: GateName | null;
        isCaptain: boolean;
    };
    reason?: 'event_week' | 'not_enrolled';
    feed?: ClanEvent[];
    yesterday?: {
        day: number;
        outcome: 'win' | 'loss' | 'draw';
        damageDealt: number;
        damageTaken: number;
        woundedCount: number;
        healedCount: number;
    } | null;
    garrison?: { assaut: number; garnison: number };
    me?: {
        userId: string;
        role: ClanRole;
        dailyPoints: number;
        totalPoints: number;
        multiplier: number;
        nextMultiplier: number;
        roleRank: number | null;
        roleSize: number;
        wounded: boolean;
        gate: GateName | null;
    };
    rankings?: { role: ClanRole; entries: RankingEntry[] }[];
    rewards?: { mvp: string[]; winner: string[]; loserPoints: number; chests: Record<string, { name?: string; description?: string }> };
    rival?: null | {
        id: string;
        name: string;
        bannerSeed: string;
        gates: Gate[];
        keepHp: number;
        keepHpMax: number;
        daysWon: number;
        memberCount: number;
        dailyOrder: GateName | null;
        pressureGate: GateName | null;
        pressureShare: number | null;
        scouted: boolean;
    };
    members?: { userId: string; username: string; role: ClanRole; dailyPoints: number; totalPoints: number; multiplier: number; wounded: boolean }[];
}

export interface GarrisonUnit {
    id: string;
    type: string;
    name: string;
    emoji: string;
    image: string | null;
    kind: 'combat' | 'soutien';
    atk: number;
    def: number;
    wear: number;
    gate: GateName | null;
    stance: Stance | null;
    cost: number;
    cancellable: boolean;
}

export interface SoldiersData {
    garrison: GarrisonUnit[];
    resources: number;
    garrisonMax: number;
    isCaptain: boolean;
}

export interface BattleReport {
    day: number;
    outcome: 'win' | 'loss' | 'draw';
    damageDealt: number;
    damageTaken: number;
    rallyBonus?: number;
    woundedCount: number;
    healedCount: number;
    events: ClanEvent[];
    myMultiplier: number;
    iAmWounded: boolean;
    clan: { name: string; bannerSeed: string; daysWon: number; gates: Gate[] } | null;
    rival: { name: string; bannerSeed: string; daysWon: number; gates: Gate[] } | null;
}

export interface WeeklyReward {
    clanName: string;
    rivalName?: string;
    outcome: 'win' | 'loss' | 'draw';
    isMvp: boolean;
    daysWon: number;
    rivalDaysWon: number;
    tierName?: string;
    tierDelta: number;
    points: number;
    leftover: number;
    loot: { chestType: string; rewardType: string; amount?: number; cosmeticType?: string }[];
}

export interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    text: string;
    targetUserId: string | null;
    createdAt: string;
    mine: boolean;
}

export interface ChatData { messages: ChatMessage[]; day: number; remaining: number; max: number }

// ─── Appels ───

type Envelope<T> = { success?: boolean; data?: T; error?: string };

export async function getMyClan(): Promise<MyClanData> {
    return (await apiFetch<Envelope<MyClanData>>('/clan')).data as MyClanData;
}

export async function getSoldiers(): Promise<SoldiersData> {
    return (await apiFetch<Envelope<SoldiersData>>('/clan/soldiers')).data as SoldiersData;
}

export async function getBattleReport(): Promise<BattleReport | null> {
    return (await apiFetch<Envelope<BattleReport | null>>('/clan/report')).data ?? null;
}

export async function getWeeklyReward(): Promise<WeeklyReward | null> {
    return (await apiFetch<{ reward: WeeklyReward | null }>('/clan/rewards')).reward ?? null;
}

export const markRewardSeen = () => apiFetch('/clan/rewards', { method: 'POST', body: '{}' });

export const setRole = (role: ClanRole) =>
    apiFetch('/clan/role', { method: 'POST', body: JSON.stringify({ role }) });

export const setMyGate = (gate: GateName | null) =>
    apiFetch('/clan/deploy', { method: 'POST', body: JSON.stringify({ action: 'gate', gate }) });

/** Capitaine : ordre du jour */
export const setDailyOrder = (gate: GateName | null) =>
    apiFetch('/clan/deploy', { method: 'POST', body: JSON.stringify({ action: 'order', gate }) });

/** Capitaine : déploiement d'une unité (porte + posture) */
export const deployUnit = (soldierId: string, gate: GateName | null, stance: Stance | null) =>
    apiFetch('/clan/deploy', { method: 'POST', body: JSON.stringify({ action: 'garrison', assignments: [{ soldierId, gate, stance }] }) });

export const cancelPurchase = (soldierId: string) =>
    apiFetch('/clan/deploy', { method: 'POST', body: JSON.stringify({ action: 'cancel', soldierId }) });

/** Capitaine : recrutement */
export const buySoldier = (type: string) =>
    apiFetch('/clan/soldiers', { method: 'POST', body: JSON.stringify({ type }) });

export async function getChat(since?: string | null): Promise<ChatData | null> {
    const q = since ? `?since=${encodeURIComponent(since)}` : '';
    return (await apiFetch<Envelope<ChatData | null>>(`/clan/chat${q}`)).data ?? null;
}

export const sendChat = (input: { template: string; memberId?: string | null; gate?: string | null; soldier?: string | null; role?: string | null }) =>
    apiFetch<{ remaining: number }>('/clan/chat', { method: 'POST', body: JSON.stringify(input) });

// ─── Libellés ───

export const GATES: GateName[] = ['nord', 'est', 'sud'];
export const GATE_LABEL: Record<GateName, string> = { nord: 'Nord', est: 'Est', sud: 'Sud' };

export const ROLE_META: Record<ClanRole, { label: string; emoji: string; hint: string; color: string; bg: string }> = {
    attaquant: { label: 'Attaquant', emoji: '⚔️', hint: 'Tes points frappent les remparts adverses', color: '#C2272D', bg: '#FDECEC' },
    defenseur: { label: 'Défenseur', emoji: '🛡️', hint: 'Tes points protègent ta porte — mais tu peux être blessé', color: '#2F86B3', bg: '#EAF6FB' },
    soigneur: { label: 'Soigneur', emoji: '💚', hint: "Tes points remettent d'aplomb tes coéquipiers blessés", color: '#3F8A1F', bg: '#ECFDF5' },
};

export const OUTCOME_META: Record<'win' | 'loss' | 'draw', { label: string; emoji: string; color: string }> = {
    win: { label: 'Victoire', emoji: '🏆', color: '#2E7D32' },
    loss: { label: 'Défaite', emoji: '🛡️', color: '#C62828' },
    draw: { label: 'Égalité', emoji: '🤝', color: '#8C6D1F' },
};

export const CHEST_LABEL: Record<string, string> = {
    common: 'Coffre commun',
    rare: 'Coffre rare',
    epic: 'Coffre épique',
    legendary: 'Coffre légendaire',
};

export const WAR_DAYS = 7;

/* ─── Thèmes saisonniers du château (copie de lib/clanThemes.ts, décor seulement) ───
 * Le thème se déduit de la seule clé de saison (`2026-W43`), comme sur le
 * site : même résultat partout, rien à demander au serveur. Il ne touche
 * jamais aux couleurs des camps (bleu pour soi, rouge pour l'adversaire). */

export interface CastleTheme {
    id: string;
    label: string;
    emoji: string;
    /** Ciel derrière le château (haut → bas) ; absent = papier de la charte */
    sky?: readonly [string, string];
    hills: string;
    ground: string;
    grass: string;
    /** Flamme des portes critiques : extérieur, cœur */
    flame: readonly [string, string];
    smoke: string;
}

const FLAMME = ['#ff6a1a', '#ffb547'] as const;

export const CASTLE_THEMES: Record<string, CastleTheme> = {
    classique: { id: 'classique', label: 'Guerre des Clans', emoji: '⚔️', hills: '#f5efe3', ground: '#efe6d4', grass: '#5fae3c', flame: FLAMME, smoke: '#b9ad9b' },
    halloween: { id: 'halloween', label: 'La Nuit des Citrouilles', emoji: '🎃', sky: ['#241a38', '#6b4f93'], hills: '#3b2b55', ground: '#e3d6bd', grass: '#7d8f3a', flame: ['#7ed957', '#d9ffb0'], smoke: '#a596bd' },
    automne: { id: 'automne', label: 'Les Brumes d’automne', emoji: '🍂', sky: ['#f2c38f', '#fbeee0'], hills: '#d08a4a', ground: '#ecdcbf', grass: '#b0812f', flame: FLAMME, smoke: '#b9ad9b' },
    hiver: { id: 'hiver', label: 'Le Siège d’hiver', emoji: '❄️', sky: ['#7fb2dc', '#dcf0fa'], hills: '#f4f9fc', ground: '#f7fbfd', grass: '#9fc6d9', flame: FLAMME, smoke: '#c7d3dc' },
    nouvel_an: { id: 'nouvel_an', label: 'Les Aurores du Nouvel An', emoji: '🎆', sky: ['#101a3f', '#3a3f7d'], hills: '#1f2752', ground: '#e3dccd', grass: '#6c8f6a', flame: FLAMME, smoke: '#9aa3c7' },
    carnaval: { id: 'carnaval', label: 'Le Grand Carnaval', emoji: '🎭', sky: ['#ffe2bd', '#fdf3e6'], hills: '#f4c6d8', ground: '#efe6d4', grass: '#5fae3c', flame: FLAMME, smoke: '#b9ad9b' },
    printemps: { id: 'printemps', label: 'Le Printemps des Cerisiers', emoji: '🌸', sky: ['#bfe6fb', '#f0fbff'], hills: '#a8dc8a', ground: '#e9efd2', grass: '#4fae3c', flame: FLAMME, smoke: '#b9ad9b' },
    examens: { id: 'examens', label: 'Le Siège des Examens', emoji: '📚', sky: ['#fdf8ea', '#fffdf6'], hills: '#e9dfc7', ground: '#efe6d4', grass: '#5fae3c', flame: FLAMME, smoke: '#b9ad9b' },
    ete: { id: 'ete', label: 'L’Été des Pirates', emoji: '🏴‍☠️', sky: ['#7cc8ee', '#e6f6fd'], hills: '#3fa4d6', ground: '#f2dcaa', grass: '#8fb04a', flame: FLAMME, smoke: '#b9ad9b' },
};

/** Périodes (mois, jour) : une semaine prend le thème qui contient son LUNDI. */
const CALENDRIER: { id: string; from: [number, number]; to: [number, number] }[] = [
    { id: 'halloween', from: [10, 15], to: [10, 31] },
    { id: 'automne', from: [11, 1], to: [11, 30] },
    { id: 'hiver', from: [12, 1], to: [12, 27] },
    { id: 'nouvel_an', from: [12, 28], to: [1, 31] },
    { id: 'carnaval', from: [2, 1], to: [2, 29] },
    { id: 'printemps', from: [3, 1], to: [4, 30] },
    { id: 'examens', from: [5, 1], to: [6, 30] },
    { id: 'ete', from: [7, 1], to: [8, 31] },
];

/** Lundi (UTC) d'une semaine ISO `2026-W43`, ou null si la clé est invalide. */
function seasonMonday(season: string): Date | null {
    const m = /^(\d{4})-W(\d{2})$/.exec(season);
    if (!m) return null;
    const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (Number(m[2]) - 1) * 7);
    return monday;
}

/** Thème du château pour une saison ; le classique hors période. */
export function clanCastleTheme(season: string | null | undefined): CastleTheme {
    const monday = season ? seasonMonday(season) : null;
    if (!monday) return CASTLE_THEMES.classique;
    const md = (monday.getUTCMonth() + 1) * 100 + monday.getUTCDate();
    const hit = CALENDRIER.find(({ from, to }) => {
        const a = from[0] * 100 + from[1];
        const b = to[0] * 100 + to[1];
        return a <= b ? md >= a && md <= b : md >= a || md <= b;
    });
    return hit ? CASTLE_THEMES[hit.id] : CASTLE_THEMES.classique;
}

/** Image d'unité : chemin relatif du site (« /clans/soldats/… ») → URL absolue. */
export const soldierImage = (path: string | null | undefined) =>
    !path ? null : /^https?:\/\//.test(path) ? path : `${getSiteOrigin()}${path.startsWith('/') ? '' : '/'}${path}`;

// ─── Catalogue des unités (copie de lib/clanSoldierCatalog.ts) ───

export interface SoldierDef {
    key: string; name: string; emoji: string; kind: 'combat' | 'soutien';
    cost: number; atk: number; def: number; description: string; image: string;
}

const IMG = (f: string) => `/clans/soldats/${f}`;

export const SOLDIER_CATALOG: SoldierDef[] = [
    { key: 'milicien', name: 'Milicien', emoji: '🪖', kind: 'combat', cost: 50, atk: 10, def: 10, image: IMG('Milicien.png'), description: 'Polyvalent et bon marché.' },
    { key: 'archer', name: 'Archer', emoji: '🏹', kind: 'combat', cost: 80, atk: 25, def: 5, image: IMG('Archer.png'), description: 'Frappe fort, encaisse mal.' },
    { key: 'piquier', name: 'Piquier', emoji: '🛡️', kind: 'combat', cost: 80, atk: 5, def: 25, image: IMG('Piquier.png'), description: 'Encaisse, ne frappe pas.' },
    { key: 'chevalier', name: 'Chevalier', emoji: '⚜️', kind: 'combat', cost: 150, atk: 30, def: 30, image: IMG('Chevalier.png'), description: 'Élite polyvalente.' },
    { key: 'baliste', name: 'Baliste', emoji: '🎯', kind: 'combat', cost: 180, atk: 45, def: 10, image: IMG('Baliste.png'), description: 'Frappe à distance.' },
    { key: 'belier', name: 'Bélier', emoji: '🐏', kind: 'combat', cost: 200, atk: 60, def: 0, image: IMG('Belier.png'), description: "Uniquement contre les portes. C'est une clé, pas une arme." },
    { key: 'sapeur', name: 'Sapeur', emoji: '🔥', kind: 'combat', cost: 220, atk: 50, def: 5, image: IMG('Sapeur.png'), description: 'Ignore la moitié de la défense adverse.' },
    { key: 'eclaireur', name: 'Éclaireur', emoji: '🔭', kind: 'soutien', cost: 90, atk: 0, def: 0, image: IMG('Eclaireur.png'), description: "Révèle en direct où l'ennemi masse son assaut." },
    { key: 'infirmier', name: 'Infirmier', emoji: '⛑️', kind: 'soutien', cost: 100, atk: 0, def: 0, image: IMG('infirmier.png'), description: "Remet 1 joueur blessé d'aplomb chaque jour." },
    { key: 'medecin', name: 'Médecin de camp', emoji: '🩺', kind: 'soutien', cost: 120, atk: 0, def: 0, image: IMG('medecin.png'), description: 'Remet 1 unité à 100 % chaque jour.' },
    { key: 'forgeron', name: 'Forgeron', emoji: '🔨', kind: 'soutien', cost: 140, atk: 0, def: 0, image: IMG('forgeron.png'), description: 'Répare 40 PV sur sa porte chaque jour.' },
    { key: 'etendard', name: 'Porte-étendard', emoji: '🚩', kind: 'soutien', cost: 160, atk: 0, def: 0, image: IMG('Porte.png'), description: '+10 % à toutes les unités de sa porte.' },
];

// ─── Tchat à phrases fermées (copie de lib/clanChatTemplates.ts) ───

export type SlotKind = 'member' | 'gate' | 'soldier' | 'role';

export interface ChatTemplateDef {
    key: string;
    category: 'tactique' | 'demande' | 'etat' | 'social';
    pattern: string;
    slots: SlotKind[];
    label: string;
}

export const CHAT_TEMPLATES: ChatTemplateDef[] = [
    { key: 'ask_attack', category: 'tactique', label: 'Demander une attaque', pattern: '{member}, peux-tu attaquer la porte {gate} ?', slots: ['member', 'gate'] },
    { key: 'ask_defend', category: 'tactique', label: 'Demander une défense', pattern: '{member}, peux-tu défendre la porte {gate} ?', slots: ['member', 'gate'] },
    { key: 'ask_role', category: 'tactique', label: 'Proposer un rôle', pattern: '{member}, peux-tu passer {role} aujourd’hui ?', slots: ['member', 'role'] },
    { key: 'focus_all', category: 'tactique', label: 'Proposer de tout concentrer', pattern: 'On concentre tout sur la porte {gate} ?', slots: ['gate'] },
    { key: 'enemy_massing', category: 'tactique', label: "Signaler l'assaut ennemi", pattern: 'L’ennemi masse son assaut sur notre porte {gate}.', slots: ['gate'] },
    { key: 'gate_critical', category: 'tactique', label: 'Alerter sur une porte', pattern: 'Notre porte {gate} est en mauvais état, il faut la tenir.', slots: ['gate'] },
    { key: 'breach_keep', category: 'tactique', label: 'Viser le donjon', pattern: 'Leur porte {gate} est tombée : en la visant, on frappe le donjon.', slots: ['gate'] },
    { key: 'ask_order', category: 'demande', label: 'Demander un ordre du jour', pattern: 'Capitaine, peux-tu donner l’ordre du jour sur la porte {gate} ?', slots: ['gate'] },
    { key: 'ask_recruit', category: 'demande', label: 'Demander un recrutement', pattern: 'Capitaine, peux-tu recruter un {soldier} ?', slots: ['soldier'] },
    { key: 'ask_deploy', category: 'demande', label: 'Demander un déploiement', pattern: 'Capitaine, peux-tu déployer le {soldier} sur la porte {gate} ?', slots: ['soldier', 'gate'] },
    { key: 'im_attacking', category: 'etat', label: 'Annoncer ma cible', pattern: 'Je vise la porte {gate}.', slots: ['gate'] },
    { key: 'im_holding', category: 'etat', label: 'Annoncer ma porte', pattern: 'Je tiens la porte {gate}.', slots: ['gate'] },
    { key: 'im_switching', category: 'etat', label: 'Annoncer mon rôle', pattern: 'Je passe {role}.', slots: ['role'] },
    { key: 'im_wounded', category: 'etat', label: 'Signaler ma blessure', pattern: 'Je suis blessé, un soigneur peut-il m’aider ?', slots: [] },
    { key: 'im_done', category: 'etat', label: 'Annoncer que j’ai fini', pattern: 'J’ai marqué mes points pour aujourd’hui.', slots: [] },
    { key: 'im_away', category: 'etat', label: 'Prévenir de mon absence', pattern: 'Je ne pourrai pas jouer aujourd’hui, désolé.', slots: [] },
    { key: 'congrats_member', category: 'social', label: 'Féliciter quelqu’un', pattern: 'Bravo {member}, beau travail !', slots: ['member'] },
    { key: 'thanks_member', category: 'social', label: 'Remercier quelqu’un', pattern: 'Merci {member} !', slots: ['member'] },
    { key: 'welcome_member', category: 'social', label: 'Souhaiter la bienvenue', pattern: 'Bienvenue {member}, content de t’avoir avec nous !', slots: ['member'] },
    { key: 'congrats_all', category: 'social', label: 'Féliciter le clan', pattern: 'Bien joué à tous pour cette journée !', slots: [] },
    { key: 'good_luck', category: 'social', label: 'Encourager', pattern: 'Bon courage à tous aujourd’hui !', slots: [] },
    { key: 'nice_try', category: 'social', label: 'Remonter le moral', pattern: 'On a perdu la journée, mais rien n’est joué. On s’accroche !', slots: [] },
    { key: 'hello', category: 'social', label: 'Dire bonjour', pattern: 'Salut tout le monde !', slots: [] },
];

export const CHAT_CATEGORY_LABEL: Record<ChatTemplateDef['category'], string> = {
    tactique: 'Tactique',
    demande: 'Au capitaine',
    etat: 'Mon état',
    social: 'Encouragements',
};

/** Aperçu local de la phrase (le serveur la re-rend à l'identique). */
export function renderTemplate(t: ChatTemplateDef, v: { memberName?: string; gate?: string; soldierName?: string; role?: string }): string {
    return t.pattern.replace(/\{(member|gate|soldier|role)\}/g, (_, k: SlotKind) => {
        if (k === 'member') return v.memberName ? `@${v.memberName}` : '@…';
        if (k === 'gate') return v.gate ?? '…';
        if (k === 'soldier') return v.soldierName ?? '…';
        return v.role ? ({ attaquant: 'attaquant', defenseur: 'défenseur', soigneur: 'soigneur' } as Record<string, string>)[v.role] : '…';
    });
}

/** État minimal de la guerre (route légère, pour l'accueil). null = pas enrôlé. */
export interface WarStatus {
    day: number;
    clanName: string;
    tierName: string;
    daysWon: number;
    resources: number;
    rivalName: string | null;
    rivalDaysWon: number;
    breached: boolean;
    me: { role: ClanRole; multiplier: number; dailyPoints: number; wounded: boolean };
}

export async function getWarStatus(): Promise<WarStatus | null> {
    return (await apiFetch<Envelope<WarStatus | null>>('/clan/status')).data ?? null;
}
