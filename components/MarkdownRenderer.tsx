import React, { useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { typography } from '../lib/theme';
import { extractMentionIds, fetchUsersBatch, getCachedUsername, primeUsers, resolveMentions } from '../lib/mentions';

interface MarkdownRendererProps {
    content: string;
    /** Utilisateurs déjà connus (auteurs) pour résoudre les mentions sans fetch. */
    knownUsers?: Array<{ _id?: string; id?: string; username?: string }>;
}

// Nettoie le contenu
function cleanContent(content: string): string {
    return content
        .replace(/\r\n/g, '\n')  // Windows -> Unix
        .replace(/\r/g, '\n')    // Old Mac -> Unix
        .trim();
}

// Styles markdown
const markdownStyles = {
    body: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
    },
    heading1: {
        fontFamily: typography.fontFamily.displayBold,
        fontSize: 22,
        fontWeight: 'normal' as const,
        color: '#1A1512',
        marginTop: 16,
        marginBottom: 8,
    },
    heading2: {
        fontFamily: typography.fontFamily.displayBold,
        fontSize: 18,
        fontWeight: 'normal' as const,
        color: '#1A1512',
        marginTop: 14,
        marginBottom: 6,
    },
    heading3: {
        fontFamily: typography.fontFamily.displayBold,
        fontSize: 16,
        fontWeight: 'normal' as const,
        color: '#1A1512',
        marginTop: 12,
        marginBottom: 4,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
        marginBottom: 10,
    },
    link: {
        color: '#3b82f6',
        textDecorationLine: 'underline' as const,
    },
    list_item: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
    },
    bullet_list: {
        marginLeft: 8,
    },
    ordered_list: {
        marginLeft: 8,
    },
    code_inline: {
        fontFamily: 'monospace',
        fontSize: 14,
        backgroundColor: '#eff6ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        color: '#1e40af',
    },
    code_block: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: '#1A1512',
        padding: 12,
        borderRadius: 8,
        color: '#E9E5DE',
        marginVertical: 10,
    },
    fence: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: '#1A1512',
        padding: 12,
        borderRadius: 8,
        color: '#E9E5DE',
        marginVertical: 10,
    },
    blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: '#D9D3C9',
        paddingLeft: 12,
        marginVertical: 10,
        fontStyle: 'italic',
        color: '#635E5A',
    },
    strong: {
        fontWeight: '700' as const,
        color: '#1A1512',
    },
    em: {
        fontStyle: 'italic' as const,
    },
    hr: {
        backgroundColor: '#E9E5DE',
        height: 1,
        marginVertical: 16,
    },
};

// Convertit le LaTeX en texte lisible
function latexToText(latex: string): string {
    return latex
        .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '($1)/($2)')
        .replace(/\\sqrt\{(.*?)\}/g, '√($1)')
        .replace(/\\sqrt/g, '√')
        .replace(/\\pm/g, '±')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈')
        .replace(/\\infty/g, '∞')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\delta/g, 'δ')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\theta/g, 'θ')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\mu/g, 'μ')
        .replace(/\\pi/g, 'π')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\Sigma/g, 'Σ')
        .replace(/\\omega/g, 'ω')
        .replace(/\\cdot/g, '·')
        .replace(/\\left/g, '')
        .replace(/\\right/g, '')
        .replace(/\\,/g, ' ')
        .replace(/\\;/g, ' ')
        .replace(/\\text\{(.*?)\}/g, '$1')
        .replace(/\\mathbf\{(.*?)\}/g, '$1')
        .replace(/\\mathrm\{(.*?)\}/g, '$1')
        .replace(/\\displaystyle/g, '')
        .replace(/\\boxed\{(.*?)\}/g, '[$1]')
        .trim();
}

// Traite le contenu pour remplacer $...$ par du markdown
function processMath(content: string): string {
    // Remplace les blocs $$...$$ par des blocs de code marqués
    let result = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        const text = latexToText(latex);
        return `\n\`\`\`math\n${text}\n\`\`\`\n`;
    });
    
    // Remplace les inline $...$ par du code inline
    result = result.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
        const text = latexToText(latex);
        return `\`${text}\``;
    });
    
    return result;
}

export default function MarkdownRenderer({ content, knownUsers }: MarkdownRendererProps) {
    const [version, setVersion] = useState(0);

    // Amorce le cache avec les auteurs connus (résolution immédiate au 1er rendu)
    useMemo(() => primeUsers(knownUsers), [knownUsers]);

    const ids = useMemo(() => extractMentionIds(content), [content]);

    // Résout les IDs encore inconnus via le backend, puis re-render
    useEffect(() => {
        const unknown = ids.filter((id) => !getCachedUsername(id));
        if (unknown.length === 0) return;
        let active = true;
        fetchUsersBatch(unknown).then(() => { if (active) setVersion((v) => v + 1); });
        return () => { active = false; };
    }, [ids]);

    const processed = useMemo(
        () => processMath(resolveMentions(cleanContent(content))),
        // `version` force le recalcul quand le cache se remplit
        [content, version],
    );

    return (
        <Markdown
            style={markdownStyles}
            onLinkPress={(url: string) => {
                Linking.openURL(url).catch(() => {});
                return true;
            }}
        >
            {processed}
        </Markdown>
    );
}
