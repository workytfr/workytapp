import { MarkdownIt } from 'react-native-markdown-display';

/**
 * Conversion Markdown → HTML pour le rendu WebView (HtmlContent), au plus près
 * du site (react-markdown + remark-gfm + remark-math + rehype-katex) :
 *   - Markdown GFM (tableaux, barré, liens auto), HTML brut autorisé
 *     (assaini ensuite dans la WebView, comme rehype-sanitize sur le site)
 *   - maths : `$…$`, `$$…$$`, et aussi `\(…\)` / `\[…\]`, protégées avant le
 *     passage Markdown (sinon `_` et `*` cassent les formules) puis rendues
 *     par KaTeX dans la WebView. Les blocs de code ne sont jamais touchés.
 *
 * La conversion se fait côté app (markdown-it embarqué) : le texte reste
 * lisible même hors ligne, seul KaTeX vient du CDN.
 */

let md: any = null;
function parser(): any {
    if (!md) md = MarkdownIt({ html: true, linkify: true, breaks: true, typographer: false });
    return md;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Segments de code (blocs ``` / ~~~ et code inline) à laisser intacts
const CODE_RE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;

// Ordre important : display avant inline
// (groupe 1 = préfixe conservé, groupe 2 = formule ; pas de lookbehind pour Hermes)
const MATH_RULES: { re: RegExp; display: boolean }[] = [
    { re: /()\$\$([\s\S]+?)\$\$/g, display: true },
    { re: /()\\\[([\s\S]+?)\\\]/g, display: true },
    { re: /()\\\(([\s\S]+?)\\\)/g, display: false },
    // `$…$` sur une seule ligne, `\$` = dollar littéral
    { re: /(^|[^\\])\$((?:\\\$|[^$\n])+?)\$/g, display: false },
];

const TOKEN = (i: number) => `WKMATH${i}XQ`;

export function markdownToHtml(source: string): string {
    const text = (source || '').replace(/\r\n?/g, '\n');
    const math: { tex: string; display: boolean }[] = [];

    const protectedText = text
        .split(CODE_RE)
        .map((seg, i) => {
            // split() avec groupe capturant : indices impairs = segments de code
            if (i % 2 === 1) return seg;
            let out = seg;
            for (const { re, display } of MATH_RULES) {
                out = out.replace(re, (_m, prefix: string, tex: string) => {
                    math.push({ tex: tex.trim(), display });
                    return prefix + TOKEN(math.length - 1);
                });
            }
            return out;
        })
        .join('');

    let html: string = parser().render(protectedText);

    if (math.length) {
        const span = (i: number, display: boolean) => {
            const m = math[i];
            if (!m) return '';
            return `<span class="wk-math" data-display="${display ? 1 : 0}">${escapeHtml(m.tex)}</span>`;
        };
        // Formule seule dans son paragraphe → bloc centré (défilable) ;
        // `$$…$$` au milieu d'une phrase reste en ligne, comme remark-math
        html = html
            .replace(/<p>\s*WKMATH(\d+)XQ\s*<\/p>/g, (_m, i) => {
                const m = math[Number(i)];
                return m?.display ? `<div class="wk-math-block">${span(Number(i), true)}</div>` : `<p>${span(Number(i), false)}</p>`;
            })
            .replace(/WKMATH(\d+)XQ/g, (_m, i) => span(Number(i), false));
    }
    return html;
}
