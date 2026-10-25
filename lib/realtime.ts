import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken, API_ORIGIN } from './api';
import { useAuth } from './auth';

/**
 * Temps réel du forum / des fiches (Socket.IO), reproduit le protocole du site :
 *   - même serveur (getSiteOrigin(), path "/socket.io")
 *   - auth par le JWT de l'app (handshake auth { token })
 *   - rooms opaques : "question:<id>" (forum) ou "fiche:<id>" (commentaires)
 *
 * Le serveur inscrit chaque socket dans "forum:global" (compteurs live liste).
 */

export interface TypingUser {
    userId: string;
    username: string;
    wordCount?: number;
}

let socket: Socket | null = null;
let tokenRequested = false;

/** Singleton : une seule connexion partagée pour toute l'app. */
export function getForumSocket(): Socket {
    if (socket) return socket;

    socket = io(API_ORIGIN, {
        path: '/socket.io',
        autoConnect: false, // on connecte après avoir chargé le token (handshake authentifié)
        // Polling d'abord (comme le site) : nginx ne transmet pas toujours l'en-tête
        // Upgrade, donc le WebSocket peut échouer → on démarre en long-polling fiable
        // puis on tente l'upgrade websocket.
        transports: ['polling', 'websocket'],
        auth: {},
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });

    if (__DEV__) {
        socket.on('connect', () => console.log('[realtime] connecté', socket?.id));
        socket.on('connect_error', (e) => console.log('[realtime] connect_error', e?.message));
        socket.on('disconnect', (r) => console.log('[realtime] déconnecté', r));
    }

    if (!tokenRequested) {
        tokenRequested = true;
        getToken()
            .then((t) => {
                if (!socket) return;
                if (t) socket.auth = { token: t };
                socket.connect();
            })
            .catch(() => socket?.connect());
    }

    return socket;
}

/**
 * Temps réel d'un fil (« thread ») : forum (`question:<id>`) ou fiche (`fiche:<id>`).
 * - recharge via `onItemChanged` quand un item est ajouté ;
 * - expose la frappe (`typingUsers` + émetteurs) et la présence (`presentMembers`).
 */
export function useThreadRealtime(room: string | undefined, onItemChanged: () => void) {
    const { user } = useAuth();
    const currentUserId = user?.id;
    const currentUsername = user?.username || '';

    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [presentMembers, setPresentMembers] = useState<TypingUser[]>([]);

    const onItemChangedRef = useRef(onItemChanged);
    onItemChangedRef.current = onItemChanged;

    useEffect(() => {
        if (!room) return;
        const s = getForumSocket();

        const join = () => s.emit('thread:join', { room, username: currentUsername });
        if (s.connected) join();
        s.on('connect', join);

        const handleItem = (p: { room?: string }) => {
            if (p?.room === room) onItemChangedRef.current();
        };
        const handleTyping = (p: { room?: string; users?: TypingUser[] }) => {
            if (p?.room === room) setTypingUsers(p.users ?? []);
        };
        const handlePresence = (p: { room?: string; users?: TypingUser[] }) => {
            if (p?.room === room) setPresentMembers(p.users ?? []);
        };

        s.on('thread:item-new', handleItem);
        s.on('thread:typing:update', handleTyping);
        s.on('thread:presence:update', handlePresence);

        return () => {
            s.emit('thread:leave', { room });
            s.off('connect', join);
            s.off('thread:item-new', handleItem);
            s.off('thread:typing:update', handleTyping);
            s.off('thread:presence:update', handlePresence);
            setTypingUsers([]);
            setPresentMembers([]);
        };
    }, [room, currentUsername]);

    const startTyping = useCallback(
        (wordCount?: number) => {
            if (!room) return;
            getForumSocket().emit('thread:typing:start', {
                room,
                username: currentUsername,
                wordCount: typeof wordCount === 'number' ? wordCount : 0,
            });
        },
        [room, currentUsername],
    );

    const stopTyping = useCallback(() => {
        if (!room) return;
        getForumSocket().emit('thread:typing:stop', { room });
    }, [room]);

    const othersTyping = typingUsers.filter((u) => u.userId !== currentUserId);

    return { typingUsers: othersTyping, startTyping, stopTyping, presentMembers };
}

/**
 * Temps réel de la liste du forum : compte les nouvelles questions postées
 * pendant la consultation (room "forum:global", inscription automatique).
 */
export function useForumListRealtime() {
    const [newCount, setNewCount] = useState(0);

    useEffect(() => {
        const s = getForumSocket();
        const handleNewQuestion = () => setNewCount((c) => c + 1);
        s.on('question:new', handleNewQuestion);
        return () => {
            s.off('question:new', handleNewQuestion);
        };
    }, []);

    return { newCount, reset: useCallback(() => setNewCount(0), []) };
}
