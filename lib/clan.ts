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

/** Couleurs de blason dérivées de la graine (stables d'un appareil à l'autre). */
export function bannerColors(seed: string): [string, string] {
    const PALETTE: [string, string][] = [
        ['#FF6A1A', '#C24A0A'], ['#2F86B3', '#1B5C80'], ['#3F8A1F', '#27600F'], ['#8E44AD', '#5E2A75'],
        ['#C2272D', '#8A1519'], ['#D4A017', '#8C6D1F'], ['#16A085', '#0E6B59'], ['#34495E', '#1F2D3A'],
    ];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
}

export const soldierImage = (path: string | null | undefined) => (path ? `${getSiteOrigin()}${path}` : null);

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
