import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// URL du backend (site Next.js).
// Prod par défaut : on tape directement sur le site live, aucun serveur local requis.
// Pour développer contre un backend local, remets: __DEV__ ? 'http://192.168.1.11:3000/api' : ...
const API_URL = 'https://workyt.fr/api';

/** Origine du backend (sans /api) — utilisée par le temps réel Socket.IO. */
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const TOKEN_KEY = 'auth_token';

// SecureStore n'existe pas sur le web → on retombe sur localStorage.
const isWeb = Platform.OS === 'web';

// Le token est lu une fois puis gardé en mémoire : SecureStore est un appel
// natif asynchrone, inutile de le payer à chaque requête.
let tokenCache: string | null | undefined;

/**
 * Stocke le token JWT
 */
export async function setToken(token: string): Promise<void> {
    tokenCache = token;
    clearApiCache();
    if (isWeb) {
        try { localStorage.setItem(TOKEN_KEY, token); } catch {}
        return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Récupère le token JWT
 */
export async function getToken(): Promise<string | null> {
    if (tokenCache !== undefined) return tokenCache;
    if (isWeb) {
        try { tokenCache = localStorage.getItem(TOKEN_KEY); } catch { tokenCache = null; }
        return tokenCache;
    }
    tokenCache = await SecureStore.getItemAsync(TOKEN_KEY);
    return tokenCache;
}

/**
 * Supprime le token JWT
 */
export async function removeToken(): Promise<void> {
    tokenCache = null;
    clearApiCache();
    if (isWeb) {
        try { localStorage.removeItem(TOKEN_KEY); } catch {}
        return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Fonction utilitaire pour faire des requêtes API
 */
/** Erreur d'API portant le code HTTP (0 = réseau / délai dépassé) */
export class ApiError extends Error {
    constructor(message: string, public status: number) {
        super(message);
    }
}

export type ApiOptions = RequestInit & {
    /**
     * Un 401 ne déconnecte pas : pour les routes dont l'accès Bearer peut ne
     * pas être encore déployé côté site (gamification). Sans ça, ouvrir un
     * écran non pris en charge ferait perdre la session.
     */
    softAuth?: boolean;
};

export async function apiFetch<T = any>(
    endpoint: string,
    apiOptions: ApiOptions = {}
): Promise<T> {
    const { softAuth, ...options } = apiOptions;
    const token = await getToken();

    const url = `${API_URL}${endpoint}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
    };

    // Un réseau mobile peut pendre indéfiniment : on coupe au-delà du délai
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
        res = await fetch(url, { ...options, headers, signal: options.signal ?? controller.signal });
    } catch (e: any) {
        throw new ApiError(e?.name === 'AbortError' ? 'Le serveur met trop de temps à répondre.' : 'Connexion impossible. Vérifie ton réseau.', 0);
    } finally {
        clearTimeout(timer);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Si le token est expiré/invalide, on déconnecte l'utilisateur
        if (res.status === 401 && !softAuth) {
            await removeToken();
        }
        throw new ApiError(data.error || data.message || `Erreur ${res.status}`, res.status);
    }

    // Toute écriture peut rendre des listes obsolètes
    if (options.method && options.method !== 'GET') clearApiCache();

    return data;
}

// ============================================
// CACHE DES LECTURES
// ============================================

type CacheEntry = { at: number; data: any };
const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<any>>();
const MAX_CACHE_ENTRIES = 80;

/** Vide le cache (écriture, connexion, déconnexion). */
export function clearApiCache(prefix?: string): void {
    if (!prefix) { responseCache.clear(); return; }
    for (const key of responseCache.keys()) if (key.startsWith(prefix)) responseCache.delete(key);
}

/** Donnée en cache pour un endpoint, même périmée (affichage instantané). */
export function peekApiCache<T = any>(endpoint: string): T | undefined {
    return responseCache.get(endpoint)?.data;
}

/**
 * GET mis en cache `ttlMs` millisecondes, avec déduplication des requêtes
 * simultanées : deux écrans qui demandent la même ressource ne font qu'un appel.
 */
export async function cachedGet<T = any>(endpoint: string, ttlMs = 60_000, force = false, softAuth = false): Promise<T> {
    const hit = responseCache.get(endpoint);
    if (!force && hit && Date.now() - hit.at < ttlMs) return hit.data;

    const pending = inFlight.get(endpoint);
    if (pending) return pending;

    const p = apiFetch<T>(endpoint, { softAuth })
        .then((data) => {
            if (responseCache.size >= MAX_CACHE_ENTRIES) {
                const oldest = responseCache.keys().next().value;
                if (oldest) responseCache.delete(oldest);
            }
            responseCache.set(endpoint, { at: Date.now(), data });
            return data;
        })
        .finally(() => inFlight.delete(endpoint));
    inFlight.set(endpoint, p);
    return p;
}

// ============================================
// AUTHENTIFICATION
// ============================================

/**
 * Connexion utilisateur
 * POST /api/auth/login
 */
export async function login(email: string, password: string) {
    const data = await apiFetch<{
        accessToken: string;
        user: {
            id: string;
            username: string;
            name: string;
            email: string;
            role: string;
            points: number;
            badges: string[];
            selectedBadge: string | null;
            bio: string;
            image: string | null;
            verified: boolean;
            createdAt: string;
        };
    }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    // Stocker le token
    await setToken(data.accessToken);
    
    return data;
}

/**
 * Récupérer le profil utilisateur connecté
 * GET /api/auth/me
 */
export async function getMe() {
    return apiFetch<{
        user: {
            id: string;
            username: string;
            name: string;
            email: string;
            role: string;
            points: number;
            badges: string[];
            selectedBadge: string | null;
            bio: string;
            image: string | null;
            verified: boolean;
            createdAt: string;
        };
        stats: {
            questions: number;
            answers: number;
            revisions: number;
        };
    }>('/auth/me');
}

/**
 * Déconnexion
 */
export async function logout(): Promise<void> {
    // Oublier le téléphone côté site avant de perdre le jeton de session
    const { unregisterPush } = await import('./push');
    await unregisterPush();
    const { cancelComeback } = await import('./comeback');
    await cancelComeback();
    await removeToken();
}

/**
 * Sélectionne le badge affiché sur le profil (null = aucun).
 * POST /api/auth/badge
 */
export async function selectBadge(badgeSlug: string | null) {
    return apiFetch<{ success: boolean; selectedBadge: string | null }>('/auth/badge', {
        method: 'POST',
        body: JSON.stringify({ badgeSlug }),
    });
}

// ============================================
// COURS
// ============================================

export interface CourseAuthor { _id: string; username: string; image?: string | null }
export interface CourseListItem {
    _id: string;
    title: string;
    description?: string;
    niveau?: string;
    matiere?: string;
    image?: string | null;
    status?: string;
    sections?: { _id: string; title: string }[];
    authors?: CourseAuthor[];
}

export interface LessonRef { _id: string; title: string; order?: number }
export interface ExerciseRef { _id: string; title: string; difficulty?: string }
export interface QuizRef { _id: string; title: string }
export interface SectionTree {
    _id: string;
    title: string;
    order?: number;
    lessons?: LessonRef[];
    exercises?: ExerciseRef[];
    quizzes?: QuizRef[];
}
export interface CourseFull extends CourseListItem {
    sections?: SectionTree[];
}

/** Liste des cours publiés. GET /api/cours */
export async function getCourses(params: { search?: string; niveau?: string; matiere?: string; page?: number; limit?: number; force?: boolean } = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.niveau) qs.set('niveau', params.niveau);
    if (params.matiere) qs.set('matiere', params.matiere);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return cachedGet<{ total: number; page: number; limit: number; courses: CourseListItem[] }>(`/cours?${qs.toString()}`, 5 * 60_000, params.force);
}

/** Arbre complet d'un cours (sections + titres leçons/exos/quiz). GET /api/cours/[id]/full */
export async function getCourseFull(courseId: string) {
    return cachedGet<{ cours: CourseFull }>(`/cours/${courseId}/full`, 5 * 60_000);
}

/** Section détaillée avec contenu complet des leçons, exercices, quiz. GET /api/cours/[id]/sections/[sectionId] */
export async function getSectionDetail(courseId: string, sectionId: string) {
    return cachedGet<{ section: any }>(`/cours/${courseId}/sections/${sectionId}`, 5 * 60_000);
}

export interface CourseProgress {
    lessonsRead: string[];
    totalLessons: number;
    percentage: number;
    sectionsCompleted: string[];
    totalSections: number;
    lastLessonId: string | null;
    lastSectionId: string | null;
}

/** Progression de l'utilisateur sur un cours. GET /api/cours/[id]/progress */
export async function getCourseProgress(courseId: string): Promise<CourseProgress | null> {
    const res = await apiFetch<{ progress: CourseProgress | null }>(`/cours/${courseId}/progress`);
    return res.progress;
}

/** Marque une leçon comme lue (auto-complète la section si toutes lues). POST /api/cours/[id]/progress */
export async function markLessonRead(courseId: string, lessonId: string, sectionId?: string): Promise<void> {
    await apiFetch(`/cours/${courseId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ lessonId, sectionId }),
    });
}

/** Exercice complet (public). GET /api/exercises/[id] */
export async function getExercise(id: string) {
    return cachedGet<any>(`/exercises/${id}`, 5 * 60_000);
}

/** Quiz complet (public). GET /api/quizzes/[id] */
export async function getQuiz(id: string) {
    return cachedGet<{ quiz: any }>(`/quizzes/${id}`, 5 * 60_000);
}

/** Infos évaluations d'un cours. GET /api/courses/[id]/evaluations */
export async function getCourseEvaluations(courseId: string) {
    return apiFetch<any>(`/courses/${courseId}/evaluations`);
}

// ============================================
// FICHES DE RÉVISION
// ============================================

export interface FicheAuthor { _id: string; username: string; points?: number; role?: string }
export interface FicheListItem {
    id: string;
    title: string;
    authors?: FicheAuthor | null;
    content?: string;
    likes: number;
    comments: number;
    status: string;
    level?: string;
    subject?: string;
    course?: { title: string; slug?: string } | null;
    createdAt: string;
    /** Première image jointe (vignette) — absent tant que le site n'est pas à jour */
    cover?: string | null;
    fileCount?: number;
    hasPdf?: boolean;
}

/** Liste/recherche des fiches. GET /api/fiches/search */
export async function getFiches(params: { query?: string; level?: string; subject?: string; page?: number; limit?: number; force?: boolean; sort?: 'recent' | 'popular' } = {}) {
    const qs = new URLSearchParams();
    if (params.sort === 'popular') qs.set('sort', 'popular');
    if (params.query) qs.set('query', params.query);
    if (params.level) qs.set('level', params.level);
    if (params.subject) qs.set('subject', params.subject);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return cachedGet<{ success: boolean; data: FicheListItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/fiches/search?${qs.toString()}`, 60_000, params.force);
}

/** Détail d'une fiche (contenu HTML + fichiers). GET /api/fiches/[id] */
export async function getFiche(id: string) {
    return cachedGet<{ success: boolean; data: any }>(`/fiches/${id}`, 2 * 60_000);
}

export interface FicheComment {
    id: string;
    content: string;
    username: string;
    userId: string | null;
    createdAt: string;
}

export interface FicheCommentsResponse {
    comments: FicheComment[];
    pagination: { currentPage: number; totalPages: number; totalComments: number; limit: number };
}

/** Liste paginée des commentaires d'une fiche. GET /api/comment?revisionId=… */
export async function getFicheComments(revisionId: string, page = 1, limit = 20): Promise<FicheCommentsResponse> {
    return apiFetch<FicheCommentsResponse>(`/comment?revisionId=${revisionId}&page=${page}&limit=${limit}`);
}

/** Publie un commentaire sur une fiche. POST /api/comment */
export async function postFicheComment(revisionId: string, content: string): Promise<any> {
    return apiFetch('/comment', {
        method: 'POST',
        body: JSON.stringify({ revisionId, content }),
    });
}

/** Statut du like de la fiche pour l'utilisateur courant. GET /api/likes?revisionId=… */
export async function getFicheLikeStatus(revisionId: string): Promise<{ success: boolean; hasLiked: boolean; totalLikes: number }> {
    return apiFetch(`/likes?revisionId=${revisionId}`);
}

/**
 * Ajoute un like à une fiche. POST /api/likes
 * Le serveur n'autorise pas le retrait : une fois liké, c'est définitif.
 * Renvoie 409 si déjà liké, 403 pour sa propre fiche.
 */
export async function likeFiche(revisionId: string): Promise<{ success: boolean; message: string; likes: number; hasLiked: boolean }> {
    return apiFetch('/likes', {
        method: 'POST',
        body: JSON.stringify({ revisionId }),
    });
}

// ============================================
// ÉVALUATIONS (tirage, chrono, soumission)
// ============================================

export interface EvalQuestion {
    questionText: string;
    questionType: 'text' | 'multiple_choice' | 'number' | 'file_link';
    options?: string[];
    points?: number;
    order?: number;
}

export interface DrawnEvaluation {
    _id: string;
    title: string;
    description?: string;
    type: 'form' | 'pdf';
    duration: number;
    depositMinutes?: number;
    questions?: EvalQuestion[];
    pdfUrl?: string;
    pdfExercises?: { enonce: string; points: number; difficulty?: string }[];
}

export interface EvalDraw {
    _id: string;
    status: string;
    drawnAt?: string;
    mustSubmitBefore: string;
    remainingMs?: number;
    isExpired?: boolean;
}

export interface EvalStatus {
    canDraw: boolean;
    reason?: 'vacation_period' | 'course_not_completed' | 'already_drawn' | 'no_evaluations';
    message?: string;
    currentTrimester?: { number: number; name: string; schoolYear: string };
    evaluationCount?: number;
    existingDraw?: {
        _id: string;
        status: string;
        drawnAt?: string;
        mustSubmitBefore?: string;
        remainingMs?: number;
        grade?: number;
        feedback?: string;
        submissionStatus?: string;
    };
    nextAvailable?: { trimester: number; name: string; startsAt: string };
}

/** Statut d'évaluation pour un cours (peut-on tirer, tirage en cours, note…). GET /api/evaluations/status */
export async function getEvaluationStatus(courseId: string): Promise<EvalStatus> {
    return apiFetch(`/evaluations/status?courseId=${courseId}`);
}

/** Tire (ou reprend) une évaluation. POST /api/evaluations/draw */
export async function drawEvaluation(courseId: string): Promise<{
    success: boolean; existing: boolean; message?: string; draw: EvalDraw; evaluation: DrawnEvaluation;
}> {
    return apiFetch('/evaluations/draw', { method: 'POST', body: JSON.stringify({ courseId }) });
}

/** Détails d'un tirage (sujet + temps restant). GET /api/evaluations/draws/[drawId] */
export async function getEvaluationDraw(drawId: string): Promise<{ draw: EvalDraw; evaluation: DrawnEvaluation }> {
    return apiFetch(`/evaluations/draws/${drawId}`);
}

/** Soumet l'évaluation (réponses en ligne et/ou photos de copie). POST /api/evaluations/draws/[drawId]/submit */
export async function submitEvaluationDraw(
    drawId: string,
    payload: { answers?: { order?: number; questionText?: string; answer: string }[]; submittedFiles?: string[] },
): Promise<any> {
    return apiFetch(`/evaluations/draws/${drawId}/submit`, { method: 'POST', body: JSON.stringify(payload) });
}

/** Upload de photos de copie (multipart). POST /api/evaluations/upload → { urls } */
export async function uploadEvaluationFiles(
    files: { uri: string; name: string; mimeType: string }[],
    context: 'submission' | 'subject' = 'submission',
): Promise<{ urls: string[] }> {
    const token = await getToken();
    const form = new FormData();
    files.forEach((f) => {
        form.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as any);
    });
    const res = await fetch(`${API_URL}/evaluations/upload?context=${context}`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 401) await removeToken();
        throw new Error(data.error || data.message || `Erreur ${res.status}`);
    }
    return data;
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType =
    | 'forum_answer' | 'fiche_comment' | 'answer_liked' | 'comment_liked'
    | 'answer_validated' | 'quest_completed' | 'evaluation_submitted'
    | 'evaluation_graded' | 'evaluation_timeout' | 'kanban_assigned' | 'kanban_comment'
    | 'mentorship_request' | 'mentorship_matched' | 'mentorship_message' | 'mentorship_resource'
    | 'mentorship_checkin' | 'mentorship_update' | 'mentorship_alert';

export interface AppNotification {
    _id: string;
    type: NotificationType;
    sender?: { _id: string; username: string } | null;
    title: string;
    message: string;
    isRead: boolean;
    relatedEntity?: { type: string; id: string } | null;
    createdAt: string;
}

export interface NotificationsResponse {
    notifications: AppNotification[];
    totalCount: number;
    unreadCount: number;
}

/** Notifications de l'utilisateur connecté. GET /api/notifications */
export async function getNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
    const res = await apiFetch<{ success: boolean; data: NotificationsResponse }>(`/notifications?page=${page}&limit=${limit}`);
    return res.data;
}

/** Marque une notification comme lue. PUT /api/notifications/[id] */
export async function markNotificationRead(id: string): Promise<void> {
    await apiFetch(`/notifications/${id}`, { method: 'PUT' });
}

/** Marque toutes les notifications comme lues. PUT /api/notifications */
export async function markAllNotificationsRead(): Promise<void> {
    await apiFetch('/notifications', { method: 'PUT' });
}

/** Supprime une notification. DELETE /api/notifications/[id] */
export async function deleteNotification(id: string): Promise<void> {
    await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
}

export interface FicheAttachment { uri: string; name: string; mimeType: string }

/**
 * Publie une fiche de révision (multipart). POST /api/fiches
 * Requiert le token Bearer. +10 points côté serveur.
 */
export async function createFiche(input: {
    title: string;
    content: string;
    subject: string;
    level: string;
    files: FicheAttachment[];
}): Promise<any> {
    const token = await getToken();
    const form = new FormData();
    form.append('title', input.title);
    form.append('content', input.content);
    form.append('subject', input.subject);
    form.append('level', input.level);
    input.files.forEach((f) => {
        // React Native FormData accepte { uri, name, type }
        form.append('file', { uri: f.uri, name: f.name, type: f.mimeType } as any);
    });

    const res = await fetch(`${API_URL}/fiches`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Pas de Content-Type manuel : laisser RN définir la boundary multipart.
        },
        body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 401) await removeToken();
        throw new Error(data.error || data.message || `Erreur ${res.status}`);
    }
    return data;
}

// ============================================
// FAVORIS (bookmarks) — Bearer
// ============================================

export type BookmarkType = 'fiche' | 'forum' | 'cours' | 'exercise';

export interface BookmarkItem {
    bookmarkId: string;
    contentType: BookmarkType;
    refId: string;
    collection: string;
    bookmarkedAt: string;
    title: string;
    content?: string;
    subject?: string;
    level?: string;
    classLevel?: string;
    status?: string;
    likes?: number;
    comments?: number;
    createdAt?: string;
    authors?: { _id?: string; username?: string } | null;
    /** Chemin web du contenu (ex. /cours/<id> pour un exercice) */
    href?: string;
}

/** Clé de paramètre attendue par /api/bookmarks selon le type de contenu. */
const BOOKMARK_PARAM: Record<BookmarkType, string> = {
    fiche: 'revisionId',
    forum: 'questionId',
    cours: 'courseId',
    exercise: 'exerciseId',
};

/** Ajoute ou retire un favori. POST /api/bookmarks */
export async function toggleBookmark(type: BookmarkType, id: string): Promise<{ bookmarked: boolean; message: string }> {
    const res = await apiFetch<{ bookmarked: boolean; message: string }>('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ [BOOKMARK_PARAM[type]]: id }),
    });
    return res;
}

/** Le contenu est-il en favori ? GET /api/bookmarks/check */
export async function isBookmarked(type: BookmarkType, id: string): Promise<boolean> {
    const res = await apiFetch<{ bookmarked: boolean }>(`/bookmarks/check?${BOOKMARK_PARAM[type]}=${id}`);
    return !!res.bookmarked;
}

/** Favoris paginés, filtrables par type. GET /api/bookmarks */
export async function getBookmarks(params: { contentType?: BookmarkType | ''; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.contentType) qs.set('contentType', params.contentType);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return apiFetch<{ success: boolean; data: BookmarkItem[]; pagination?: { total: number; page: number; totalPages: number } }>(`/bookmarks?${qs.toString()}`);
}

// ============================================
// RECHERCHE GLOBALE — public
// ============================================

export type SearchCategory = 'all' | 'forum' | 'fiches' | 'cours' | 'blog';

export interface SearchResult {
    type: 'forum' | 'fiches' | 'cours' | 'blog';
    id: string;
    title: string;
    subtitle?: string;
    url: string;
    badge?: string;
    external?: boolean;
    date?: string;
}

/** Recherche dans le forum, les fiches, les cours et le blog. GET /api/search */
export async function searchAll(q: string, category: SearchCategory = 'all', limit = 8) {
    const qs = new URLSearchParams({ q, category, limit: String(limit) });
    return cachedGet<{ results: SearchResult[]; total: number }>(`/search?${qs.toString()}`, 60_000);
}

// ============================================
// PROFIL PUBLIC — public
// ============================================

export interface PublicProfile {
    user: {
        _id: string;
        name?: string;
        username: string;
        role?: string;
        points: number;
        badges?: string[];
        bio?: string;
        createdAt: string;
    };
    revisions: { _id: string; title: string; subject?: string; level?: string; status?: string; likes?: number; comments?: number; createdAt: string }[];
    questions: { _id: string; title: string; subject?: string; classLevel?: string; status?: string; answersCount?: number; createdAt: string }[];
    answers: { _id: string; content: string; question?: { _id: string; title: string } | null; createdAt: string; likes?: number; status?: string }[];
    pagination: { totalRevisions: number; totalQuestions: number; totalAnswers: number };
}

/** Profil public d'un membre (fiches, questions, réponses). GET /api/user/[id] */
export async function getPublicProfile(userId: string, limit = 10) {
    const res = await cachedGet<{ data: PublicProfile }>(`/user/${userId}?page=1&limit=${limit}`, 2 * 60_000);
    return res.data;
}

// ============================================
// RÉCOMPENSES (concours) — public, rang perso via Bearer
// ============================================

export type RewardStatus = 'active' | 'upcoming' | 'ended';
export type RewardMethod = 'highestPoints' | 'mostRevisions' | 'mostRevisionsInCategory';

export interface Reward {
    _id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    startDate: string;
    endDate: string;
    method: RewardMethod;
    category?: string;
    prize: string;
}

export interface RewardLeaderboard {
    top10: { userId: string; username: string; total: number }[];
    me: { total: number; rank: number } | null;
}

/** Concours par statut. GET /api/recompenses?status= */
export async function getRewards(status: RewardStatus, force = false) {
    return cachedGet<Reward[]>(`/recompenses?status=${status}`, 5 * 60_000, force);
}

/** Un concours. GET /api/recompenses?id= */
export async function getReward(id: string) {
    return cachedGet<Reward>(`/recompenses?id=${id}`, 5 * 60_000);
}

/** Classement d'un concours (top 10 + mon rang). GET /api/recompenses/[id]?id= */
export async function getRewardLeaderboard(id: string, force = false) {
    // La route lit l'identifiant dans la query string, pas dans le chemin
    return cachedGet<RewardLeaderboard>(`/recompenses/${id}?id=${id}`, 60_000, force);
}

// ============================================
// LIVE YOUTUBE — public
// ============================================

export interface LiveStatus {
    status: 'live' | 'upcoming' | 'none';
    videoId?: string;
    title?: string;
    thumbnail?: string;
    scheduledAt?: string;
    platforms?: { type: string; url: string }[];
}

/** Live en cours ou programmé sous 10 jours. GET /api/youtube-live */
export async function getLiveStatus() {
    return cachedGet<LiveStatus>('/youtube-live', 10 * 60_000);
}
