/**
 * Gamification et progression — mêmes routes que le site (workyt-next),
 * qui acceptent le jeton Bearer de l'app via currentUserEmail()/currentUserId()
 * (src/lib/bearerUser.ts). Contrats décrits dans docs/API_GAMIFICATION.md.
 *
 * Attention : certaines routes renvoient leurs erreurs métier en 400/500
 * avec { error } — apiFetch lève alors une Error portant ce message, qu'on
 * affiche tel quel.
 */
import { apiFetch as rawFetch, cachedGet, type ApiOptions } from './api';

// Un 401 sur ces routes = patch Bearer pas encore déployé : jamais de déconnexion
const apiFetch = <T,>(endpoint: string, options: ApiOptions = {}) => rawFetch<T>(endpoint, { ...options, softAuth: true });

/** Vrai si l'erreur signifie « route pas encore ouverte à l'app » */
export function isUnavailable(e: unknown): boolean {
    const status = (e as { status?: number })?.status;
    return status === 401 || status === 403 || status === 404;
}

// ============================================
// SÉRIE (streak)
// ============================================

export interface StreakMilestone {
    days: number;
    name: string;
    rewards: { points: number; gems: number; mushrooms: number };
    badge: string | null;
    reached: boolean;
    claimed: boolean;
}
export interface Streak {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    milestones: StreakMilestone[];
}

export async function getStreak(): Promise<Streak> {
    const res = await apiFetch<{ success: boolean; data: Streak }>('/streak');
    return res.data;
}

export async function claimStreakMilestone(milestoneDays: number) {
    return apiFetch<{ success: true; rewards: { points: number; gems: number; mushrooms: number }; badge: string | null }>(
        '/streak/claim',
        { method: 'POST', body: JSON.stringify({ milestoneDays }) },
    );
}

// ============================================
// QUÊTES
// ============================================

export type ChestType = 'common' | 'rare' | 'epic' | 'legendary';
export type QuestType = 'daily' | 'weekly' | 'monthly';
export interface QuestReward {
    type: 'chest' | 'points' | 'gems' | 'mushrooms';
    amount?: number;
    chestType?: ChestType;
}
export interface Quest {
    id: string;
    slug: string;
    name: string;
    description: string;
    type: QuestType;
    progress: number;
    target: number;
    status: 'in_progress' | 'completed' | 'claimed';
    rewards: QuestReward[];
    periodStart: string;
    periodEnd: string;
}
export type ClaimedReward =
    | { type: 'points' | 'gems' | 'mushrooms'; amount: number }
    | { type: 'chest'; chestType: ChestType; reward: { rewardType: string; amount?: number; cosmeticType?: string; cosmeticId?: string } };

export async function getQuests(type?: QuestType): Promise<Quest[]> {
    const res = await apiFetch<{ quests: Quest[] }>(`/quests${type ? `?type=${type}` : ''}`);
    return res.quests ?? [];
}

export async function claimQuest(id: string) {
    return apiFetch<{ success: true; rewards: ClaimedReward[] }>(`/quests/${id}/claim`, { method: 'POST' });
}

// ============================================
// COFFRES (catalogue, lecture seule — 5 req/min côté serveur : mis en cache)
// ============================================

export interface ChestInfo {
    _id: string;
    type: ChestType;
    name: string;
    description: string;
    possibleRewards: { type: 'points' | 'gems' | 'cosmetic' | 'mushrooms'; amount?: number; cosmeticType?: string; cosmeticId?: string; probability: number }[];
}

export async function getChests(): Promise<ChestInfo[]> {
    const res = await cachedGet<{ chests: ChestInfo[] }>('/chests', 30 * 60_000, false, true);
    return res.chests ?? [];
}

// ============================================
// CALENDRIER
// ============================================

export interface CalendarDay {
    date: string;
    reward: { type: 'points' | 'gems' | 'chest'; amount?: number; chestType?: 'common' | 'rare' };
    theme: string;
    isSpecial: boolean;
    specialName?: string;
    description?: string;
    claimed: boolean;
}
export interface CalendarData {
    days: CalendarDay[];
    collection: { cards: { week: number; theme: string; earnedAt: string }[]; totalWeeks: number; setCompleted: boolean };
    wars: { season: number; monday: string; status: 'war' | 'planned' | 'truce'; theme: string }[];
}
export interface CalendarClaim {
    success: true;
    rewardType: string;
    amount: number;
    chestType?: string;
    chestReward?: { rewardType: string; amount?: number; cosmeticType?: string; cosmeticId?: string } | null;
    cardEarned?: { week: number; theme: string };
    setCompleted?: boolean;
    currentStreak?: number;
    bossLoot?: { id: string; name: string; emoji: string; rarity: string; slot: string; stat: number; flavor: string; autoEquipped: boolean };
}

/** Date locale au format YYYY-MM-DD (le serveur compare « le jour même » ainsi) */
export function localDay(d = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function getCalendarMonth(year: number, month0: number): Promise<CalendarData> {
    const start = localDay(new Date(year, month0, 1));
    const end = localDay(new Date(year, month0 + 1, 0));
    return apiFetch<CalendarData>(`/calendar/data?startDate=${start}&endDate=${end}`);
}

export async function claimCalendarDay(date = localDay()) {
    return apiFetch<CalendarClaim>('/calendar/claim', { method: 'POST', body: JSON.stringify({ date }) });
}

// ============================================
// GEMMES · INVENTAIRE · POINTS
// ============================================

export interface GemsBalance {
    user: { id: string; username: string; points: number };
    gems: { balance: number; totalEarned: number; totalSpent: number };
}
export async function getGemsBalance(): Promise<GemsBalance> {
    const res = await apiFetch<{ success: boolean; data: GemsBalance }>('/gems/balance');
    return res.data;
}

export interface GemTransaction {
    id: string;
    type: string;
    gems: number;
    description: string;
    status: string;
    createdAt: string;
}
export async function getGemsHistory(limit = 20, skip = 0) {
    const res = await apiFetch<{ success: boolean; data: { transactions: GemTransaction[]; pagination: { total: number; hasMore: boolean } } }>(
        `/gems/history?limit=${limit}&skip=${skip}`,
    );
    return res.data;
}

export type CosmeticType = 'profile_image' | 'profile_border' | 'username_color' | 'avatar_accessory';
export interface InventoryItem {
    _id: string;
    cosmeticType: CosmeticType;
    cosmeticId: string;
    source: 'purchase' | 'chest' | 'reward' | 'gift';
    acquiredAt: string;
}
export interface Inventory {
    inventory: InventoryItem[];
    equipped: {
        profileImage: string | null;
        profileBorder: string | null;
        usernameColor: { type: string; value: string } | null;
        avatarLook: Record<string, string | undefined>;
    };
}
export async function getInventory(): Promise<Inventory> {
    return apiFetch<Inventory & { success: boolean }>('/inventory');
}
export async function setEquipped(cosmeticType: CosmeticType, cosmeticId: string, action: 'equip' | 'unequip') {
    return apiFetch<{ success: true }>('/inventory', { method: 'POST', body: JSON.stringify({ cosmeticType, cosmeticId, action }) });
}

export async function getMyPoints(): Promise<number> {
    const res = await apiFetch<{ success: boolean; data: { points: number } }>('/user/me/points');
    return res.data.points;
}

// ============================================
// CHAMPIGNONS (boosts) · HÉROS · QUIZ DU JOUR
// ============================================

export type BoostType = 'double_points' | 'quest_extra' | 'lucky_chest';
export interface ActiveBoost { boostType: BoostType; name: string; description: string; multiplier: number; expiresAt: string; durationMs: number }
export interface BoostOffer { type: BoostType; name: string; description: string; cost: number; durationMs: number; multiplier: number; canAfford: boolean; isActive: boolean }

export async function getBoosts() {
    const res = await apiFetch<{ success: boolean; data: { balance: number; boosts: BoostOffer[]; activeBoosts: ActiveBoost[] } }>('/mushrooms/boosts');
    return res.data;
}
export async function activateBoost(boostType: BoostType) {
    return apiFetch<{ success: true; boost: { name: string; expiresAt: string | null } }>('/mushrooms/use', {
        method: 'POST',
        body: JSON.stringify({ boostType }),
    });
}

export interface Equipment { id: string; name: string; emoji: string; slot: string; rarity: string; stat: number; flavor: string }
export interface HeroState {
    hero: {
        level: number; xp: number; xpForNext: number; xpProgress: number;
        hp: number; hpMax: number; attack: number; defense: number; dungeonKills: number; fainted: boolean;
        equipped: { weapon: Equipment | null; armor: Equipment | null; amulet: Equipment | null };
        ownedEquipment: string[];
    };
    monster: {
        id: string; name: string; emoji: string; taunts: string[]; defeatQuotes: string[];
        hp: number; attack: number; isBoss: boolean; sleeping: boolean; power: 'poison' | 'brutal' | null; powerLabel: string;
    };
    mushrooms: number;
}
export async function getHero(): Promise<HeroState> {
    return apiFetch<HeroState>('/hero');
}
export async function healHero() {
    return apiFetch<{ success: true; hp: number; mushroomsLeft: number }>('/hero/heal', { method: 'POST' });
}

export type DailyQuiz =
    | { available: false }
    | {
        available: true; started: boolean; id: string; date: string; question: string; answers: string[];
        solved: boolean; attemptCount: number; lastAnswerIndex: number | null; correctAnswer?: number; explanation?: string | null;
    };
export type Battle =
    | null
    | { outcome: 'victory'; xpGained: number; critical: boolean; leveledUp: boolean; levelsGained: number; newLevel: number; levelRewards?: { points: number; gems: number; mushrooms: number } }
    | { outcome: 'defeat'; damage: number; hp: number; fainted: boolean; critical: boolean; poisoned: boolean };

export async function getDailyQuiz(): Promise<DailyQuiz> {
    return apiFetch<DailyQuiz>('/daily-quiz/play');
}
export async function startDailyQuiz() {
    return apiFetch<{ success: true }>('/daily-quiz/start', { method: 'POST' });
}
export async function answerDailyQuiz(answerIndex: number) {
    return apiFetch<{
        success: true; isCorrect: boolean; alreadySolved: boolean; attemptCount: number;
        correctAnswer?: number; explanation?: string | null; battle: Battle;
    }>('/daily-quiz/play', { method: 'POST', body: JSON.stringify({ answerIndex }) });
}

// ============================================
// COMPÉTENCES
// ============================================

export interface Competency {
    skillId: string;
    description: string;
    difficulty?: number | string;
    theme?: string;
    chapter?: string;
    status: string;
    bestScore?: number;
    nextReview?: string | null;
}
export async function getCourseCompetencies(courseId: string): Promise<Competency[]> {
    const res = await apiFetch<{ competencies: Competency[] }>(`/competencies/by-course?courseId=${encodeURIComponent(courseId)}`);
    return res.competencies ?? [];
}

// ============================================
// LIBELLÉS COMMUNS
// ============================================

export const CHEST_LABEL: Record<ChestType, string> = {
    common: 'Coffre commun',
    rare: 'Coffre rare',
    epic: 'Coffre épique',
    legendary: 'Coffre légendaire',
};

/** « 15 points », « 2 gemmes », « Coffre rare »… */
export function rewardLabel(r: { type: string; amount?: number; chestType?: string }): string {
    const n = r.amount ?? 0;
    switch (r.type) {
        case 'points': return `${n} point${n > 1 ? 's' : ''}`;
        case 'gems': return `${n} gemme${n > 1 ? 's' : ''}`;
        case 'mushrooms': return `${n} champignon${n > 1 ? 's' : ''}`;
        case 'chest': return CHEST_LABEL[(r.chestType as ChestType) ?? 'common'] ?? 'Coffre';
        default: return r.type;
    }
}
