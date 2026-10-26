import { useEffect, useMemo, useState } from 'react';
import HtmlContent from './HtmlContent';
import { extractMentionIds, fetchUsersBatch, getCachedUsername, primeUsers, resolveMentions } from '../lib/mentions';

interface RichMarkdownProps {
    content?: string | null;
    /** Utilisateurs déjà connus (auteurs) pour résoudre les mentions sans fetch. */
    knownUsers?: Array<{ _id?: string; id?: string; username?: string }>;
    /** Taille du texte en px. */
    fontSize?: number;
}

/**
 * Rendu unique des contenus Markdown du site (questions / réponses du forum,
 * fiches) : Markdown GFM + LaTeX KaTeX + mentions `@[user:id]` résolues en
 * pastilles `@pseudo` qui ouvrent le profil DANS l'app.
 * S'appuie sur HtmlContent (WebView auto-dimensionnée, thème clair/sombre).
 */
export default function RichMarkdown({ content, knownUsers, fontSize = 15 }: RichMarkdownProps) {
    const [version, setVersion] = useState(0);
    const text = (content ?? '').trim();

    // Amorce le cache avec les auteurs connus (résolution immédiate au 1er rendu)
    useMemo(() => primeUsers(knownUsers), [knownUsers]);

    const ids = useMemo(() => extractMentionIds(text), [text]);

    // Résout les IDs encore inconnus via le backend, puis re-render
    useEffect(() => {
        const unknown = ids.filter((id) => !getCachedUsername(id));
        if (unknown.length === 0) return;
        let active = true;
        fetchUsersBatch(unknown).then(() => { if (active) setVersion((v) => v + 1); });
        return () => { active = false; };
    }, [ids]);

    // `version` / `knownUsers` forcent le recalcul quand le cache se remplit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const resolved = useMemo(() => resolveMentions(text), [text, version, knownUsers]);

    if (!resolved) return null;
    return <HtmlContent html={resolved} markdown fontSize={fontSize} />;
}
