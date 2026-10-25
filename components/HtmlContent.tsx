import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useColors } from '../lib/useColors';
import { getSiteOrigin } from '../lib/siteOrigin';

interface HtmlContentProps {
    html: string;
    /** Si true, `html` est traité comme du Markdown (converti + maths KaTeX). */
    markdown?: boolean;
    /** Marge intérieure horizontale du contenu (par défaut 0, géré par le parent). */
    padding?: number;
}

function escapeForTextarea(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Rend le HTML riche des leçons/exercices Workyt (TipTap) dans une WebView :
 * - blocs personnalisés (définition, propriété, théorème, remarque, attention, exemple)
 * - maths LaTeX via KaTeX (auto-render)
 * - tableaux, images (URLs relatives résolues vers le site), code
 * Styles alignés sur la charte « papier ».
 */
export default function HtmlContent({ html, markdown = false, padding = 0 }: HtmlContentProps) {
    const colors = useColors();
    const [height, setHeight] = useState(120);

    const document = useMemo(() => buildDocument(html, colors, padding, markdown), [html, colors, padding, markdown]);

    if (Platform.OS === 'web') return <WebPreview document={document} />;

    return (
        <WebView
            originWhitelist={['*']}
            source={{ html: document, baseUrl: getSiteOrigin() }}
            style={{ height, backgroundColor: 'transparent', opacity: 0.99 }}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            javaScriptEnabled
            domStorageEnabled
            androidLayerType="hardware"
            onMessage={(e) => {
                const h = Number(e.nativeEvent.data);
                if (!Number.isNaN(h) && h > 0) setHeight(h + 4);
            }}
        />
    );
}

/**
 * Aperçu web (expo start --web) : la WebView n'existe que sur mobile, on
 * rend le même document dans une iframe, avec le même canal de hauteur.
 */
function WebPreview({ document: doc }: { document: string }) {
    const [height, setHeight] = useState(120);
    const ref = useRef<any>(null);
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.source === ref.current?.contentWindow && typeof e.data?.wkh === 'number') setHeight(e.data.wkh + 4);
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, []);
    const bridge = '<script>window.ReactNativeWebView={postMessage:function(h){parent.postMessage({wkh:Number(h)},"*")}};</script>';
    return createElement('iframe', {
        ref,
        srcDoc: doc.replace('<head>', '<head>' + bridge),
        style: { width: '100%', height, border: 0, background: 'transparent' },
    });
}

function buildDocument(html: string, colors: ReturnType<typeof useColors>, padding: number, isMarkdown: boolean): string {
    const svg = (paths: string) =>
        `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

    const blocks: Record<string, { bg: string; border: string; label: string; icon: string }> = {
        definition: { bg: '#FFF3E6', border: '#FF6A1A', label: 'Définition', icon: svg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>') },
        propriete: { bg: '#EAF2FF', border: '#2563EB', label: 'Propriété', icon: svg('<circle cx="12" cy="12" r="10"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>') },
        theoreme: { bg: '#E9FBF2', border: '#0F9D63', label: 'Théorème', icon: svg('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.1 14c.2-1 .7-1.7 1.4-2.5A4.6 4.6 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.8 1.2 1.5 1.4 2.5"/>') },
        remarque: { bg: '#F3F1EC', border: '#6B5844', label: 'Remarque', icon: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>') },
        attention: { bg: '#FDECEC', border: '#D93636', label: 'Attention', icon: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>') },
        exemple: { bg: '#F3EEFF', border: '#7C3AED', label: 'Exemple', icon: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>') },
    };

    const blockCss = Object.entries(blocks)
        .map(([type, c]) => `
            .custom-block.${type}, [blocktype="${type}"] { background:${c.bg}; border-color:${c.border}; }
            .custom-block.${type} .cb-title { color:${c.border}; }
            .custom-block.${type} .cb-vlabel { color:${c.border}; border-left-color:${c.border}33; background:${c.border}0D; }
        `)
        .join('\n');

    const blockMap = JSON.stringify(
        Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, { label: v.label, icon: v.icon }]))
    );

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Funnel+Display:wght@700&display=swap" rel="stylesheet">
<style>
  html, body { margin:0; padding:0; background:transparent; }
  body {
    font-family: 'Montserrat', -apple-system, system-ui, sans-serif;
    font-size: 16px; line-height: 1.7; color: ${colors.text};
    padding: 0 ${padding}px; -webkit-text-size-adjust: 100%;
    overflow-wrap: break-word; word-break: break-word;
  }
  h1,h2,h3,h4 { font-family:'Funnel Display', 'Montserrat', sans-serif; font-weight:700; color:${colors.text}; line-height:1.25; margin:1.2em 0 .5em; }
  h1 { font-size:1.6em; } h2 { font-size:1.35em; } h3 { font-size:1.15em; }
  p { margin: .6em 0; }
  a { color:${colors.primary}; text-decoration:none; }
  strong, b { font-weight:700; }
  ul, ol { padding-left: 1.3em; margin: .6em 0; }
  li { margin: .25em 0; }
  img { max-width:100%; height:auto; border-radius:10px; display:block; margin:.8em 0; }
  hr { border:none; border-top:1px solid ${colors.border}; margin:1.2em 0; }
  blockquote { margin:.8em 0; padding:.4em 1em; border-left:4px solid ${colors.primary}; background:${colors.surfaceVariant}; color:${colors.textSecondary}; border-radius:6px; }
  code { font-family: ui-monospace, Menlo, Consolas, monospace; background:${colors.surfaceVariant}; padding:.1em .35em; border-radius:5px; font-size:.9em; }
  pre { background:${colors.surfaceVariant}; padding:12px; border-radius:10px; overflow-x:auto; }
  pre code { background:transparent; padding:0; }
  table { border-collapse:collapse; width:100%; margin:.8em 0; display:block; overflow-x:auto; }
  th, td { border:1px solid ${colors.border}; padding:8px 10px; text-align:left; }
  th { background:${colors.surfaceVariant}; font-weight:600; }
  .custom-block, [blocktype] { position:relative; border:2px solid; padding:16px 52px 16px 18px; border-radius:18px; margin:1.5em 0; box-shadow:0 2px 10px rgba(46,32,22,0.05); overflow:hidden; }
  .cb-body > *:first-child { margin-top:0; }
  .cb-body > *:last-child { margin-bottom:0; }
  .cb-title { font-family:'Funnel Display','Montserrat',sans-serif; font-weight:700; font-size:1.02em; margin-bottom:8px; line-height:1.2; }
  .cb-vlabel { position:absolute; right:0; top:0; bottom:0; width:38px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:12px 0; border-left:1.5px solid; }
  .cb-vlabel .cb-vicon { display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
  .cb-vlabel .cb-vicon svg { display:block; }
  .cb-vlabel .cb-vtext { writing-mode:vertical-rl; transform:rotate(180deg); text-transform:uppercase; font-family:'Funnel Display','Montserrat',sans-serif; font-weight:700; font-size:.7em; letter-spacing:.2em; white-space:nowrap; }
  .katex { font-size:1.05em; }
  .katex-display { overflow-x:auto; overflow-y:hidden; padding:.2em 0; }
  ${blockCss}
</style>
</head>
<body>
${isMarkdown
        ? `<textarea id="md" style="display:none">${escapeForTextarea(html)}</textarea><div id="content"></div>`
        : `<div id="content">${html}</div>`}
${isMarkdown ? `<script defer src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>` : ``}
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
  var BLOCKS = ${blockMap};
  var IS_MD = ${isMarkdown ? 'true' : 'false'};
  function parseMarkdown() {
    if (!IS_MD) return;
    var ta = document.getElementById('md');
    if (!ta || !window.marked) return;
    var raw = ta.value;
    // Protéger les maths avant le markdown (sinon _ et * cassent les formules)
    var math = [];
    raw = raw.replace(/\\$\\$([\\s\\S]*?)\\$\\$/g, function (m) { math.push(m); return '@@M' + (math.length - 1) + '@@'; });
    raw = raw.replace(/\\$([^\\$\\n]+?)\\$/g, function (m) { math.push(m); return '@@M' + (math.length - 1) + '@@'; });
    var out = window.marked.parse(raw, { gfm: true, breaks: true });
    out = out.replace(/@@M(\\d+)@@/g, function (_, i) { return math[i]; });
    document.getElementById('content').innerHTML = out;
  }
  function enhanceBlocks() {
    var nodes = document.querySelectorAll('.custom-block, [blocktype]');
    nodes.forEach(function (el) {
      if (el.querySelector(':scope > .cb-vlabel')) return;
      var type = el.getAttribute('blocktype');
      if (!type) {
        var cls = (el.getAttribute('class') || '');
        var m = cls.match(/custom-block\\s+(\\w+)/) || cls.match(/(\\w+)\\s+custom-block/) || cls.match(/custom-block-(\\w+)/);
        if (m) type = m[1];
      }
      var cfg = type && BLOCKS[type];
      if (!cfg) { type = 'remarque'; cfg = BLOCKS[type]; }
      el.classList.add('custom-block', type);
      // Titre personnalisé éventuel (<p><strong>..</strong></p> ou <strong>..</strong>)
      var title = '';
      var first = el.firstElementChild;
      if (first && first.tagName === 'P' && first.children.length === 1 && first.firstElementChild && first.firstElementChild.tagName === 'STRONG') {
        title = first.textContent.trim(); el.removeChild(first);
      } else if (first && first.tagName === 'STRONG') {
        title = first.textContent.trim(); el.removeChild(first);
      }
      // Envelopper le contenu restant
      var body = document.createElement('div');
      body.className = 'cb-body';
      while (el.firstChild) body.appendChild(el.firstChild);
      el.appendChild(body);
      if (title) {
        var t = document.createElement('div');
        t.className = 'cb-title';
        t.textContent = title;
        el.insertBefore(t, body);
      }
      // Libellé vertical à droite
      var v = document.createElement('div');
      v.className = 'cb-vlabel';
      v.innerHTML = '<span class="cb-vicon">' + cfg.icon + '</span><span class="cb-vtext">' + cfg.label + '</span>';
      el.appendChild(v);
    });
  }
  function reportHeight() {
    var h = document.body.scrollHeight || document.documentElement.scrollHeight;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(h));
  }
  function renderMath() {
    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(document.getElementById('content'), {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
    } catch (e) {}
    reportHeight();
  }
  function bindImages() {
    document.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('load', reportHeight);
      img.addEventListener('error', reportHeight);
    });
  }
  function init() {
    parseMarkdown();
    enhanceBlocks();
    bindImages();
    renderMath();
  }
  if (!IS_MD) init();
  window.addEventListener('load', function () {
    setTimeout(init, IS_MD ? 30 : 0);
    setTimeout(renderMath, 120);
    setTimeout(reportHeight, 400);
    setTimeout(reportHeight, 1000);
  });
</script>
</body>
</html>`;
}
