/**
 * Dessins de la Guerre des Clans en react-native-svg : le blason du clan et
 * son château. Portage du site (workyt-next : components/clan/ClanBanner.tsx,
 * ClanCastle.tsx, castleGeometry.ts) — même tirage, même géométrie, même
 * charte (formes plates, contours épais à l'encre).
 *
 * Simplifications assumées par rapport au site : pas d'animations CSS (halo
 * qui défile, fumée qui monte) ni d'ornements de saison (castleDecor) ; le
 * ciel, les collines, le sol et la flamme du thème sont bien repris.
 */
import { memo, useId, type ReactNode } from 'react';
import Svg, {
    Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop,
} from 'react-native-svg';
import type { CastleTheme, Gate } from '../lib/clan';

/* ═══════════════════════════ Blason ═══════════════════════════ */

const METAUX = ['#D4AF37', '#E8E8E8']; // or, argent
const COULEURS = ['#C8102E', '#0B4EA2', '#1E7A46', '#1C1C1C', '#6B2D5B']; // gueules, azur, sinople, sable, pourpre
const BANNER_INK = '#3A2E2E';

function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Chaque composante utilise un décalage distinct pour ne pas se corréler. */
function pick<T>(arr: T[], seed: number, offset: number): T {
    const x = Math.sin(seed * 0.0001 + offset * 12.9898) * 43758.5453;
    const frac = x - Math.floor(x);
    return arr[Math.min(arr.length - 1, Math.floor(frac * arr.length))];
}

/* Formes d'écu, dans un viewBox 100×115 */
const FORMES: string[] = [
    'M10,4 H90 V66 Q90,98 50,112 Q10,98 10,66 Z',
    'M10,4 H90 V96 Q90,111 76,111 H24 Q10,111 10,96 Z',
    'M9,4 H91 V111 H9 Z',
    'M10,4 H62 A9,9 0 0,0 80,4 H90 V66 Q90,98 50,112 Q10,98 10,66 Z',
    'M50,3 C84,3 93,30 93,58 C93,90 74,112 50,112 C26,112 7,90 7,58 C7,30 16,3 50,3 Z',
    'M50,3 L94,58 L50,112 L6,58 Z',
];

/* Partitions du champ : des rectangles qui débordent, rognés par l'écu */
const PARTITIONS: ((b: string) => ReactNode)[] = [
    () => null,
    (b) => <Rect x="50" y="-5" width="55" height="125" fill={b} />,
    (b) => <Rect x="-5" y="57" width="110" height="63" fill={b} />,
    (b) => <Polygon points="-5,-5 105,-5 -5,120" fill={b} />,
    (b) => <Polygon points="105,-5 105,120 -5,120" fill={b} />,
    (b) => (
        <G fill={b}>
            <Rect x="-5" y="-5" width="55" height="62" />
            <Rect x="50" y="57" width="55" height="63" />
        </G>
    ),
    (b) => (
        <G fill={b}>
            <Polygon points="50,10 105,58 105,40 50,-8" />
            <Polygon points="50,45 105,93 105,75 50,27" />
            <Polygon points="50,10 -5,58 -5,40 50,-8" />
            <Polygon points="50,45 -5,93 -5,75 50,27" />
        </G>
    ),
    (b) => (
        <G fill={b}>
            <Polygon points="50,57 105,-5 105,30" />
            <Polygon points="50,57 105,85 105,120" />
            <Polygon points="50,57 -5,-5 -5,30" />
            <Polygon points="50,57 -5,85 -5,120" />
        </G>
    ),
];

/* Pièces honorables */
const PIECES: ((c: string) => ReactNode)[] = [
    () => null,
    (c) => <Rect x="-5" y="45" width="110" height="24" fill={c} />,
    (c) => <Rect x="38" y="-5" width="24" height="125" fill={c} />,
    (c) => <Polygon points="-5,20 20,-5 105,80 80,105" fill={c} />,
    (c) => (
        <G fill={c}>
            <Rect x="-5" y="45" width="110" height="22" />
            <Rect x="39" y="-5" width="22" height="125" />
        </G>
    ),
    (c) => (
        <G fill={c}>
            <Polygon points="-5,12 8,-5 105,92 92,109" />
            <Polygon points="105,12 92,-5 -5,92 8,109" />
        </G>
    ),
    (c) => <Polygon points="50,25 105,80 105,102 50,47 -5,102 -5,80" fill={c} />,
];

/* Meubles, centrés sur (0,0) dans un carré d'environ 44×44 */
const MEUBLES: ((c: string) => ReactNode)[] = [
    // fleur de lys
    (c) => <Path fill={c} d="M0,-22 C4,-14 7,-9 7,-4 C11,-9 17,-11 19,-6 C21,-1 16,4 9,4 L9,8 L-9,8 L-9,4 C-16,4 -21,-1 -19,-6 C-17,-11 -11,-9 -7,-4 C-7,-9 -4,-14 0,-22 Z M-13,12 H13 V17 H-13 Z" />,
    // lion
    (c) => (
        <G fill={c}>
            <Circle cx="0" cy="-8" r="12" />
            <Path d="M-14,2 C-14,14 -7,20 0,20 C7,20 14,14 14,2 C8,8 -8,8 -14,2 Z" />
            <Path d="M-18,-14 L-11,-9 M18,-14 L11,-9" stroke={c} strokeWidth="4" strokeLinecap="round" />
        </G>
    ),
    // aigle
    (c) => (
        <G fill={c}>
            <Path d="M0,-16 L-22,-4 L-9,0 L-18,14 L0,6 L18,14 L9,0 L22,-4 Z" />
            <Circle cx="0" cy="-17" r="5" />
        </G>
    ),
    // tour
    (c) => <Path fill={c} d="M-13,-16 H-8 V-11 H-3 V-16 H3 V-11 H8 V-16 H13 V-6 H10 V18 H-10 V-6 H-13 Z" />,
    // étoile
    (c) => <Path fill={c} d="M0,-21 L6,-7 L21,-6 L10,4 L13,19 L0,11 L-13,19 L-10,4 L-21,-6 L-6,-7 Z" />,
    // croissant
    (c) => <Path fill={c} d="M2,-19 A19,19 0 1,0 2,19 A15,15 0 1,1 2,-19 Z" />,
    // épée
    (c) => (
        <G fill={c}>
            <Polygon points="0,-22 4,-14 4,8 -4,8 -4,-14" />
            <Rect x="-12" y="8" width="24" height="4" />
            <Rect x="-3" y="12" width="6" height="10" />
        </G>
    ),
    // chêne
    (c) => (
        <G fill={c}>
            <Circle cx="0" cy="-8" r="14" />
            <Circle cx="-11" cy="0" r="9" />
            <Circle cx="11" cy="0" r="9" />
            <Rect x="-3" y="4" width="6" height="17" />
        </G>
    ),
    // rose
    (c) => (
        <G fill={c}>
            <Circle cx="0" cy="0" r="7" />
            {[0, 72, 144, 216, 288].map((a) => (
                <Ellipse key={a} cx="0" cy="-13" rx="6" ry="8" rotation={a} originX={0} originY={0} />
            ))}
        </G>
    ),
    // soleil
    (c) => (
        <G fill={c}>
            <Circle cx="0" cy="0" r="10" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <Polygon key={a} points="-3,-13 3,-13 0,-22" rotation={a} originX={0} originY={0} />
            ))}
        </G>
    ),
    // losange
    (c) => <Polygon fill={c} points="0,-20 14,0 0,20 -14,0" />,
    // ancre
    (c) => (
        <G fill="none" stroke={c} strokeWidth="4" strokeLinecap="round">
            <Line x1="0" y1="-16" x2="0" y2="16" />
            <Line x1="-10" y1="-10" x2="10" y2="-10" />
            <Path d="M-14,6 A14,14 0 0,0 14,6" />
        </G>
    ),
    // faucon
    (c) => (
        <G fill={c}>
            <Path d="M0,-14 C10,-14 18,-4 18,8 L0,18 L-18,8 C-18,-4 -10,-14 0,-14 Z" />
            <Polygon points="0,-14 -5,-22 5,-22" />
        </G>
    ),
    // serpent
    (c) => <Path fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" d="M-16,16 C-16,4 -4,4 -4,-4 C-4,-12 8,-12 8,-4 C8,4 16,4 16,-14" />,
    // sanglier
    (c) => (
        <G fill={c}>
            <Ellipse cx="0" cy="2" rx="18" ry="11" />
            <Polygon points="-18,-2 -22,-14 -10,-8" />
            <Polygon points="18,-2 22,-14 10,-8" />
            <Rect x="-12" y="11" width="4" height="8" />
            <Rect x="8" y="11" width="4" height="8" />
        </G>
    ),
    // cerf
    (c) => (
        <G fill={c}>
            <Ellipse cx="0" cy="6" rx="9" ry="12" />
            <Path d="M-9,-8 L-14,-20 M-9,-8 L-4,-18 M9,-8 L14,-20 M9,-8 L4,-18" stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </G>
    ),
    // corbeau
    (c) => (
        <G fill={c}>
            <Ellipse cx="2" cy="4" rx="15" ry="9" rotation={-12} originX={0} originY={0} />
            <Circle cx="-12" cy="-8" r="6" />
            <Polygon points="-17,-8 -25,-6 -17,-4" />
        </G>
    ),
    // clé
    (c) => (
        <G fill={c}>
            <Circle cx="0" cy="-12" r="8" />
            <Rect x="-2.5" y="-5" width="5" height="24" />
            <Rect x="2" y="8" width="8" height="4" />
            <Rect x="2" y="15" width="6" height="4" />
        </G>
    ),
    // couronne
    (c) => (
        <G fill={c}>
            <Polygon points="-18,8 -18,-10 -9,-1 0,-14 9,-1 18,-10 18,8" />
            <Rect x="-18" y="10" width="36" height="6" />
        </G>
    ),
    // coquille
    (c) => (
        <G fill={c}>
            <Path d="M-18,8 A18,18 0 0,1 18,8 Z" />
            <Path d="M-9,8 L-6,-8 M0,8 L0,-10 M9,8 L6,-8" stroke="#000000" strokeOpacity={0.2} strokeWidth="2" fill="none" />
            <Rect x="-4" y="8" width="8" height="5" rx="2" />
        </G>
    ),
];

/**
 * Le blason lui-même, en éléments SVG (repère 100×115) : réutilisé seul
 * (<ClanBanner>) et sur la bannière du donjon. La règle des émaux (jamais
 * métal sur métal ni couleur sur couleur) est appliquée au tirage.
 */
function BannerShapes({ seed, clipId }: { seed: string; clipId: string }) {
    const s = hash(seed);
    const champEstMetal = s % 2 === 0;
    const paletteChamp = champEstMetal ? METAUX : COULEURS;
    const paletteMeuble = champEstMetal ? COULEURS : METAUX;

    const champ = pick(paletteChamp, s, 1);
    const champ2 = pick(paletteChamp.filter((c) => c !== champ), s, 2) ?? champ;
    const meuble = pick(paletteMeuble, s, 3);
    const piece = pick(paletteMeuble, s, 4);

    const forme = pick(FORMES, s, 5);
    const partition = pick(PARTITIONS, s, 6);
    const pieceDef = pick(PIECES, s, 7);
    const meubleDef = pick(MEUBLES, s, 8);

    return (
        <G>
            <Defs>
                <ClipPath id={clipId}>
                    <Path d={forme} />
                </ClipPath>
            </Defs>
            <G clipPath={`url(#${clipId})`}>
                <Rect x="-5" y="-5" width="110" height="125" fill={champ} />
                {partition(champ2)}
                {pieceDef(piece)}
                <G x={50} y={57}>{meubleDef(meuble)}</G>
            </G>
            {/* Contour tracé par-dessus, jamais rogné */}
            <Path d={forme} fill="none" stroke={BANNER_INK} strokeWidth="4" strokeLinejoin="round" />
        </G>
    );
}

/** Identifiant sûr pour url(#…) : useId contient « : » selon la version de React. */
function useSvgId(prefix: string) {
    return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Blason de clan déterministe : même graine → même blason, partout. */
export const ClanBanner = memo(function ClanBanner({ seed, size = 56, label }: { seed: string; size?: number; label?: string }) {
    const clipId = useSvgId('ecu');
    return (
        <Svg
            width={size}
            height={Math.round(size * 1.15)}
            viewBox="0 0 100 115"
            accessibilityLabel={label}
            accessible={!!label}
        >
            <BannerShapes seed={seed} clipId={clipId} />
        </Svg>
    );
});

/* ═══════════════════════════ Château ═══════════════════════════ */

/* Géométrie (repère du viewBox) — voir castleGeometry.ts du site */
const INK = '#1a1512';
const PAPER = '#fdfaf4';
const W = 320;
/** Haut du cadre : la hampe du donjon dépasse au-dessus de zéro */
const TOP = -36;
/** Le sol, sur lequel tout repose */
const GROUND = 180;
/** Bas du cadre : juste sous les jauges (les noms sont écrits sous le dessin) */
const BOTTOM = GROUND + 26;
const GH = { w: 82, xs: [14, 119, 224], bodyTop: 110, turretTop: 92, turretW: 20 };
const KEEP = { x: 120, w: 80, top: 40 };
const WALL_TOP = 124;
const WALLS = GH.xs.slice(0, -1).map((x, i) => {
    const from = x + GH.w - 4;
    const to = GH.xs[i + 1] + 4;
    return { x: from, w: to - from };
});

/** Rapport hauteur / largeur du dessin */
export const CASTLE_RATIO = (BOTTOM - TOP) / W;

export type GateState = 'intacte' | 'entamee' | 'critique' | 'tombee';

export function gateState(g: Gate): GateState {
    if (g.fallen || g.hp <= 0) return 'tombee';
    const pct = g.hpMax > 0 ? g.hp / g.hpMax : 0;
    if (pct > 0.66) return 'intacte';
    if (pct > 0.2) return 'entamee';
    return 'critique';
}

export const GATE_STATE_LABEL: Record<GateState, string> = {
    intacte: 'intacte',
    entamee: 'entamée',
    critique: 'critique',
    tombee: 'tombée',
};

/** Pierre plus sombre à mesure que la porte encaisse. */
const STONE: Record<GateState, string> = {
    intacte: '#EFE5D2',
    entamee: '#E0D2B9',
    critique: '#CDBB9E',
    tombee: '#AD9C84',
};

/** Jauges : mêmes teintes que les pastilles d'état du site. */
export const GATE_GAUGE: Record<GateState, string> = {
    intacte: '#7ed957',
    entamee: '#ffb547',
    critique: '#ff6a1a',
    tombee: '#e5484d',
};

/** Créneaux tombés sur le corps du châtelet (3 merlons). */
const MISSING: Record<GateState, number[]> = {
    intacte: [],
    entamee: [],
    critique: [1],
    tombee: [0, 2],
};

/** Couleur du camp : toits, fanions, bannière. */
const TEAM = {
    ally: { main: '#6ec1e4', deep: '#2f86b3' },
    enemy: { main: '#e5484d', deep: '#b3262b' },
} as const;

/** Silhouette d'un volume crénelé, en un seul tracé. */
function crenelated(x: number, y: number, w: number, h: number, n: number, crest: number, missing: readonly number[] = []): string {
    const u = w / (n * 2 - 1);
    let d = `M${x},${y + h} L${x},${y}`;
    for (let i = 0; i < n; i++) {
        d += missing.includes(i) ? ` h${u.toFixed(2)}` : ` v${-crest} h${u.toFixed(2)} v${crest}`;
        if (i < n - 1) d += ` h${u.toFixed(2)}`;
    }
    return `${d} L${x + w},${y + h} Z`;
}

/** Rangée de mâchicoulis : petits arcs sous un bandeau saillant. */
function corbels(x: number, y: number, w: number, n: number): string {
    const u = w / n;
    let d = `M${x},${y}`;
    for (let i = 0; i < n; i++) d += ` a${u / 2},${u / 2.4} 0 0,0 ${u},0`;
    return d;
}

/**
 * Assises de pierre : lignes horizontales, joints verticaux décalés. Tracées
 * en UN seul chemin (au lieu d'une ligne par joint) : bien moins de vues
 * natives à créer sur un téléphone modeste.
 */
function Courses({ x, y, w, h, clip, block = 22 }: { x: number; y: number; w: number; h: number; clip: string; block?: number }) {
    const COURSE = 11;
    let d = '';
    for (let r = 0; r * COURSE < h; r++) {
        const cy = y + r * COURSE;
        if (r > 0) d += `M${x},${cy} H${x + w} `;
        const offset = (r % 2) * (block / 2);
        const y2 = Math.min(cy + COURSE, y + h);
        for (let jx = x + offset; jx < x + w; jx += block) d += `M${jx},${cy} V${y2} `;
    }
    return <Path d={d} clipPath={`url(#${clip})`} stroke={INK} strokeWidth="1.1" strokeOpacity={0.12} fill="none" />;
}

/** Toit conique sur un parapet plein. `broken` = charpente effondrée. */
function ConeRoof({ cx, base, half, height, color, broken }: { cx: number; base: number; half: number; height: number; color: string; broken?: boolean }) {
    if (broken) {
        return (
            <G stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none">
                <Path d={`M${cx - half + 3},${base} l${half * 0.55},-${height * 0.45}`} />
                <Path d={`M${cx + half - 3},${base} l-${half * 0.35},-${height * 0.3}`} />
            </G>
        );
    }
    return (
        <G>
            <Path d={`M${cx - half},${base} L${cx},${base - height} L${cx + half},${base} Z`} fill={color} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <Path d={`M${cx},${base - height} L${cx + half},${base} L${cx},${base} Z`} fill={INK} fillOpacity={0.13} />
            <Line
                x1={cx - half * 0.5} y1={base - height * 0.45} x2={cx + half * 0.5} y2={base - height * 0.45}
                stroke={INK} strokeWidth="1.8" strokeOpacity={0.25} strokeLinecap="round"
            />
        </G>
    );
}

/** Petit fanion à la pointe d'un toit. */
function Pennant({ x, y, color }: { x: number; y: number; color: string }) {
    return (
        <G>
            <Line x1={x} y1={y} x2={x} y2={y - 12} stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
            <Path d={`M${x},${y - 12} l11,3.5 l-11,3.5 z`} fill={color} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </G>
    );
}

/** Panache de fumée — trois boules. */
function Smoke({ x, y, scale = 1, color }: { x: number; y: number; scale?: number; color: string }) {
    return (
        <G fill={color} stroke={INK} strokeWidth="2" opacity={0.85}>
            <Circle cx={x} cy={y} r={5 * scale} />
            <Circle cx={x + 6 * scale} cy={y - 8 * scale} r={6.5 * scale} />
            <Circle cx={x + 1 * scale} cy={y - 18 * scale} r={8 * scale} />
        </G>
    );
}

/** Flamme : deux gouttes emboîtées (couleurs du thème). */
function Flame({ x, y, colors }: { x: number; y: number; colors: readonly [string, string] }) {
    return (
        <G>
            <Path
                d={`M${x},${y} c-7,0 -9,-7 -5,-12 c1,4 3,4 4,2 c-1,-5 2,-9 5,-11 c-1,5 6,8 5,15 c0,4 -4,6 -9,6 z`}
                fill={colors[0]} stroke={INK} strokeWidth="2" strokeLinejoin="round"
            />
            <Path d={`M${x},${y - 1} c-3,0 -4,-4 -1,-7 c1,2 2,2 3,0 c2,3 2,7 -2,7 z`} fill={colors[1]} />
        </G>
    );
}

export interface CastleArtProps {
    /** Portes dans l'ordre nord, est, sud */
    gates: Gate[];
    keepHp: number;
    keepHpMax: number;
    /** 'ally' = bleu (le tien) · 'enemy' = rouge (l'adversaire) */
    side: 'ally' | 'enemy';
    /** Graine du blason : l'écusson du clan orne la bannière du donjon */
    bannerSeed?: string;
    /** Porte désignée (ordre du jour, ma cible) : halo orange en pointillés */
    target?: string | null;
    /** Porte où l'ennemi masse son assaut (Éclaireur) : halo rouge plein */
    threat?: string | null;
    theme: CastleTheme;
    width: number;
}

/**
 * Le château d'un clan : trois châtelets (une porte entre deux tourelles)
 * reliés par la courtine, et le donjon qui les domine. Les dégâts se lisent
 * sur plusieurs registres qui se cumulent : la pierre fonce, les fissures
 * apparaissent, les créneaux et les toits tombent, la fumée puis le feu
 * montent, et la porte tombée laisse une brèche et des gravats.
 */
export const CastleArt = memo(function CastleArt({
    gates, keepHp, keepHpMax, side, bannerSeed, target, threat, theme, width,
}: CastleArtProps) {
    const uid = useSvgId('castle');
    const team = TEAM[side];
    const keepPct = keepHpMax > 0 ? Math.max(0, Math.min(1, keepHp / keepHpMax)) : 0;
    const keepDown = keepPct <= 0;
    const keepHurt = !keepDown && keepPct < 0.5;

    const keepCx = KEEP.x + KEEP.w / 2;
    const keepBody = `M${KEEP.x},${GROUND} V${KEEP.top} H${KEEP.x + KEEP.w} V${GROUND} Z`;
    const keepParapet = keepDown
        ? crenelated(KEEP.x - 5, KEEP.top - 12, KEEP.w + 10, 12, 5, 8, [1, 3])
        : `M${KEEP.x - 6},${KEEP.top} V${KEEP.top - 12} H${KEEP.x + KEEP.w + 6} V${KEEP.top} Z`;

    const label = `Château ${side === 'ally' ? 'du clan' : 'adverse'} : donjon ${keepDown ? 'abattu' : `${keepHp} sur ${keepHpMax} points`}`;

    return (
        <Svg width={width} height={width * CASTLE_RATIO} viewBox={`0 ${TOP} ${W} ${BOTTOM - TOP}`} accessible accessibilityLabel={label}>
            <Defs>
                <ClipPath id={`${uid}-keep`}><Path d={keepBody} /></ClipPath>
                {WALLS.map((w, i) => (
                    <ClipPath key={i} id={`${uid}-w${i}`}>
                        <Path d={crenelated(w.x, WALL_TOP, w.w, GROUND - WALL_TOP, 2, 7)} />
                    </ClipPath>
                ))}
                {/* Les ClipPath restent enfants directs de Defs (pas de G intermédiaire) */}
                {gates.flatMap((g, i) => {
                    const x = GH.xs[i];
                    return [
                        <ClipPath key={`b${i}`} id={`${uid}-b${i}`}>
                            <Path d={crenelated(x + 14, GH.bodyTop, GH.w - 28, GROUND - GH.bodyTop, 3, 9, MISSING[gateState(g)])} />
                        </ClipPath>,
                        <ClipPath key={`tl${i}`} id={`${uid}-tl${i}`}>
                            <Rect x={x} y={GH.turretTop} width={GH.turretW} height={GROUND - GH.turretTop} />
                        </ClipPath>,
                        <ClipPath key={`tr${i}`} id={`${uid}-tr${i}`}>
                            <Rect x={x + GH.w - GH.turretW} y={GH.turretTop} width={GH.turretW} height={GROUND - GH.turretTop} />
                        </ClipPath>,
                    ];
                })}
                {theme.sky ? (
                    <>
                        <LinearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={theme.sky[0]} />
                            <Stop offset="1" stopColor={theme.sky[1]} />
                        </LinearGradient>
                        <ClipPath id={`${uid}-skyclip`}>
                            <Rect x={-6} y={TOP + 2} width={W + 12} height={GROUND - TOP + 2} rx="18" />
                        </ClipPath>
                    </>
                ) : null}
            </Defs>

            {/* ── Le ciel du thème, en vignette arrondie derrière le château ── */}
            {theme.sky ? (
                <Rect x={-6} y={TOP + 2} width={W + 12} height={GROUND - TOP + 2} rx="18" fill={`url(#${uid}-sky)`} />
            ) : null}

            {/* ── Collines au loin, puis le tertre ── */}
            <G clipPath={theme.sky ? `url(#${uid}-skyclip)` : undefined}>
                <Path d={`M-10,${GROUND - 26} C40,${GROUND - 62} 90,${GROUND - 56} 130,${GROUND - 30} L-10,${GROUND - 30} Z`} fill={theme.hills} />
                <Path d={`M180,${GROUND - 30} C222,${GROUND - 70} 284,${GROUND - 66} 330,${GROUND - 34} L330,${GROUND - 30} Z`} fill={theme.hills} />
            </G>
            <Path
                d={`M2,${GROUND + 5} C40,${GROUND - 8} 280,${GROUND - 8} ${W - 2},${GROUND + 5} C250,${GROUND + 11} 70,${GROUND + 11} 2,${GROUND + 5} Z`}
                fill={theme.ground}
            />
            <Path
                d={[6, 110, 214, 310].map((gx) => `M${gx},${GROUND + 2} l-2,-6 M${gx + 3},${GROUND + 2} v-8 M${gx + 6},${GROUND + 2} l2,-5`).join(' ')}
                stroke={theme.grass} strokeWidth="2" strokeLinecap="round" fill="none"
            />

            {/* ══════════ Le donjon, en retrait ══════════ */}
            {keepDown ? (
                // Hampe brisée : il n'y a plus rien à hisser
                <Path d={`M${keepCx - 8},${KEEP.top - 12} l3,-14 l-6,-6`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
                <G>
                    <ConeRoof cx={keepCx} base={KEEP.top - 12} half={KEEP.w / 2 + 12} height={44} color={team.main} />
                    {/* Hampe et bannière — la bannière s'amenuise avec les PV du donjon */}
                    <Line x1={keepCx} y1={KEEP.top - 56} x2={keepCx} y2={KEEP.top - 72} stroke={INK} strokeWidth="3" strokeLinecap="round" />
                    <Path
                        d={`M${keepCx},${KEEP.top - 72} h${10 + 14 * keepPct} l-5,${Math.max(3, 5 * keepPct + 2)} l5,${Math.max(3, 5 * keepPct + 2)} h-${10 + 14 * keepPct} z`}
                        fill={team.main} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"
                    />
                </G>
            )}

            {/* Corps du donjon : il descend jusqu'au sol, derrière la courtine */}
            <Path d={keepBody} fill={keepDown ? '#AD9C84' : keepHurt ? '#E0D2B9' : '#EAE0CC'} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <Courses x={KEEP.x} y={KEEP.top} w={KEEP.w} h={GROUND - KEEP.top} clip={`${uid}-keep`} />
            <Rect x={KEEP.x + KEEP.w - 20} y={KEEP.top} width="20" height={GROUND - KEEP.top} fill={INK} fillOpacity={0.08} clipPath={`url(#${uid}-keep)`} />

            {/* Parapet plein, sur ses mâchicoulis : le toit repose dessus */}
            <Path d={corbels(KEEP.x, KEEP.top, KEEP.w, 8)} fill="none" stroke={INK} strokeWidth="2" strokeOpacity={0.55} />
            <Path d={keepParapet} fill={keepDown ? '#A08F78' : '#DED2BC'} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />

            {/* Fenêtres : allumées tant que le donjon tient */}
            {[KEEP.x + 14, KEEP.x + KEEP.w - 24].map((wx) => (
                <Path
                    key={wx}
                    d={`M${wx},${KEEP.top + 32} v-12 a5,5 0 0,1 10,0 v12 z`}
                    fill={keepDown ? '#2B211C' : '#ffb547'} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"
                />
            ))}

            {/* Bannière à queue d'aronde, frappée de l'écusson du clan */}
            {!keepDown ? (
                <G>
                    <Path d={`M${keepCx - 13},${KEEP.top + 2} h26 v38 l-13,-7 l-13,7 z`} fill={team.main} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
                    <Path d={`M${keepCx},${KEEP.top + 2} h13 v38 l-13,-7 z`} fill={INK} fillOpacity={0.1} />
                    {bannerSeed ? (
                        <G x={keepCx - 9} y={KEEP.top + 7} scale={0.18}>
                            <BannerShapes seed={bannerSeed} clipId={`${uid}-ecu`} />
                        </G>
                    ) : null}
                </G>
            ) : null}

            {/* Le donjon entamé se fissure ; abattu, il se fend et fume */}
            {keepDown || keepHurt ? (
                <G stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={keepDown ? 0.75 : 0.45} clipPath={`url(#${uid}-keep)`}>
                    <Path d={`M${KEEP.x + 8},${KEEP.top + 4} l7,14 l-5,10 l7,12`} />
                    {keepDown ? <Path d={`M${KEEP.x + 70},${KEEP.top + 8} l-8,12 l5,11`} /> : null}
                </G>
            ) : null}
            {keepDown ? <Smoke x={keepCx + 6} y={KEEP.top - 18} color={theme.smoke} scale={1.2} /> : null}

            {/* ══════════ La courtine, entre les châtelets ══════════ */}
            {WALLS.map((w, i) => (
                <G key={i}>
                    <Path d={crenelated(w.x, WALL_TOP, w.w, GROUND - WALL_TOP, 2, 7)} fill="#E3D7C1" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
                    <Courses x={w.x} y={WALL_TOP} w={w.w} h={GROUND - WALL_TOP} clip={`${uid}-w${i}`} block={16} />
                    <Rect x={w.x} y={WALL_TOP} width={w.w} height="6" fill={INK} fillOpacity={0.08} clipPath={`url(#${uid}-w${i})`} />
                </G>
            ))}

            {/* ══════════ Les trois châtelets ══════════ */}
            {gates.map((g, i) => (
                <Gatehouse key={g.name} gate={g} index={i} uid={uid} team={team} theme={theme} hot={target === g.name} threatened={threat === g.name} />
            ))}
        </Svg>
    );
});

function Gatehouse({ gate: g, index: i, uid, team, theme, hot, threatened }: {
    gate: Gate; index: number; uid: string; team: { main: string }; theme: CastleTheme; hot: boolean; threatened: boolean;
}) {
    const x = GH.xs[i];
    const cx = x + GH.w / 2;
    const st = gateState(g);
    const pct = g.hpMax > 0 ? Math.max(0, Math.min(1, g.hp / g.hpMax)) : 0;
    const damage = 1 - pct;
    const fallen = st === 'tombee';
    const bodyX = x + 14;
    const bodyW = GH.w - 28;
    const body = crenelated(bodyX, GH.bodyTop, bodyW, GROUND - GH.bodyTop, 3, 9, MISSING[st]);
    const stone = STONE[st];
    // Les toits des tourelles tombent avant la porte : l'érosion se voit de loin
    const leftRoofBroken = fallen;
    const rightRoofBroken = fallen || st === 'critique';
    // Le châtelet du centre est coiffé de créneaux : des toits y masqueraient le donjon
    const roofed = i !== 1;

    const turret = (tx: number, sideKey: 'l' | 'r', broken: boolean) => (
        <G>
            <Rect x={tx} y={GH.turretTop} width={GH.turretW} height={GROUND - GH.turretTop} fill={stone} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <Courses x={tx} y={GH.turretTop} w={GH.turretW} h={GROUND - GH.turretTop} clip={`${uid}-t${sideKey}${i}`} block={10} />
            <Rect x={tx + GH.turretW - 7} y={GH.turretTop} width="7" height={GROUND - GH.turretTop} fill={INK} fillOpacity={0.08} />
            {/* Archère */}
            {!fallen ? <Path d={`M${tx + GH.turretW / 2},${GH.turretTop + 16} v10`} stroke={INK} strokeWidth="3" strokeLinecap="round" /> : null}
            {roofed ? (
                <>
                    {/* Parapet plein, un peu plus large que la tourelle */}
                    <Rect x={tx - 3} y={GH.turretTop - 7} width={GH.turretW + 6} height="8" rx="1.5" fill={stone} stroke={INK} strokeWidth="3" />
                    <ConeRoof cx={tx + GH.turretW / 2} base={GH.turretTop - 7} half={GH.turretW / 2 + 5} height={26} color={team.main} broken={broken} />
                    {!broken ? <Pennant x={tx + GH.turretW / 2} y={GH.turretTop - 33} color={team.main} /> : null}
                </>
            ) : (
                <Path d={crenelated(tx - 3, GH.turretTop - 1, GH.turretW + 6, 9, 2, 7, broken ? [1] : [])} fill={stone} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            )}
        </G>
    );

    return (
        <G>
            {/* Halo de menace (Éclaireur) : plus large que celui de désignation
                pour que les deux se lisent sur la même porte */}
            {threatened ? (
                <Rect
                    x={x - 9} y={GH.turretTop - 52} width={GH.w + 18} height={GROUND - GH.turretTop + 58} rx="16"
                    fill="#e5484d" fillOpacity={0.07} stroke="#e5484d" strokeWidth="3.5"
                />
            ) : null}

            {/* Corps central, crénelé, avec ses mâchicoulis */}
            <Path d={body} fill={stone} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <Courses x={bodyX} y={GH.bodyTop} w={bodyW} h={GROUND - GH.bodyTop} clip={`${uid}-b${i}`} />
            <G clipPath={`url(#${uid}-b${i})`}>
                <Rect x={bodyX} y={GH.bodyTop} width={bodyW} height="7" fill={INK} fillOpacity={0.09} />
                <Path d={corbels(bodyX, GH.bodyTop + 7, bodyW, 5)} fill="none" stroke={INK} strokeWidth="2" strokeOpacity={0.5} />
            </G>

            {/* ── La porte ── */}
            {fallen ? (
                <G>
                    {/* Baie éventrée : on voit à travers */}
                    <Path d={`M${cx - 16},${GROUND} v-22 a16,16 0 0,1 32,0 v22 z`} fill="#2B211C" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
                    {/* Vantaux arrachés, en travers de la brèche */}
                    <G fill="#B87A44" stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
                        <Path d={`M${cx - 18},${GROUND - 2} l13,-20 l6,4 l-11,18 z`} />
                        <Path d={`M${cx + 3},${GROUND} l15,-9 l4,6 l-13,5 z`} />
                    </G>
                </G>
            ) : (
                <G>
                    {/* Voussoirs de l'arc */}
                    <Path d={`M${cx - 18},${GROUND} v-24 a18,18 0 0,1 36,0 v24`} fill="#D6C7AD" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
                    {/* Clé de voûte */}
                    <Path d={`M${cx - 3.5},${GROUND - 43} h7 l-1.5,6 h-4 z`} fill="#C8B796" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                    {/* Vantaux de bois, planches et ferrures */}
                    <Path d={`M${cx - 13},${GROUND} v-22 a13,13 0 0,1 26,0 v22 z`} fill="#C98A4B" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                    <G stroke={INK} strokeLinecap="round">
                        <Line x1={cx} y1={GROUND} x2={cx} y2={GROUND - 35} strokeWidth="2.5" />
                        <Line x1={cx - 7} y1={GROUND} x2={cx - 7} y2={GROUND - 31} strokeWidth="1.4" strokeOpacity={0.4} />
                        <Line x1={cx + 7} y1={GROUND} x2={cx + 7} y2={GROUND - 31} strokeWidth="1.4" strokeOpacity={0.4} />
                        <Line x1={cx - 13} y1={GROUND - 9} x2={cx + 13} y2={GROUND - 9} strokeWidth="3" />
                        <Line x1={cx - 13} y1={GROUND - 22} x2={cx + 13} y2={GROUND - 22} strokeWidth="3" />
                    </G>
                    <Circle cx={cx - 3.5} cy={GROUND - 15} r="1.6" fill={INK} />
                    <Circle cx={cx + 3.5} cy={GROUND - 15} r="1.6" fill={INK} />
                </G>
            )}

            {/* Les deux tourelles, par-dessus les bords du corps */}
            {turret(x, 'l', leftRoofBroken)}
            {turret(x + GH.w - GH.turretW, 'r', rightRoofBroken)}

            {/* Fissures : elles s'ajoutent à mesure que la porte encaisse */}
            {damage > 0.05 ? (
                <G
                    stroke={INK} strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round"
                    opacity={Math.min(0.8, damage * 0.85)} clipPath={`url(#${uid}-b${i})`}
                >
                    <Path d={`M${bodyX + 5},${GH.bodyTop + 12} l7,10 l-4,9 l5,8`} />
                    {damage > 0.33 ? <Path d={`M${bodyX + bodyW - 6},${GH.bodyTop + 16} l-7,11 l4,8`} /> : null}
                    {damage > 0.66 ? <Path d={`M${cx + 4},${GH.bodyTop - 4} l-4,9 l6,6`} /> : null}
                </G>
            ) : null}

            {/* Gravats au pied de la brèche */}
            {fallen ? (
                <G fill="#B5A58C" stroke={INK} strokeWidth="2.3" strokeLinejoin="round">
                    <Path d={`M${x + 2},${GROUND + 2} l8,-9 l10,3 l2,6 z`} />
                    <Path d={`M${x + GH.w - 24},${GROUND + 2} l7,-7 l11,2 l4,5 z`} />
                    <Circle cx={cx + 20} cy={GROUND - 3} r="3.2" />
                </G>
            ) : null}

            {/* Fumée dès l'entame, feu quand la porte est à bout */}
            {st === 'entamee' ? <Smoke x={cx + 8} y={GH.bodyTop - 12} color={theme.smoke} scale={0.6} /> : null}
            {st === 'critique' ? (
                <>
                    <Smoke x={cx + 4} y={GH.bodyTop - 20} color={theme.smoke} scale={0.75} />
                    <Flame x={cx + 2} y={GH.bodyTop - 1} colors={theme.flame} />
                </>
            ) : null}
            {fallen ? <Smoke x={cx - 2} y={GH.bodyTop - 4} color={theme.smoke} /> : null}

            {/* Halo de désignation — pointillés : « on y va » */}
            {hot ? (
                <Rect
                    x={x - 4} y={GH.turretTop - 47} width={GH.w + 8} height={GROUND - GH.turretTop + 49} rx="13"
                    fill="none" stroke="#ff6a1a" strokeWidth="3.5" strokeDasharray="8 4" strokeLinecap="round"
                />
            ) : null}

            {/* Jauge de PV */}
            <Rect x={x + 9} y={GROUND + 12} width={GH.w - 18} height="10" rx="5" fill={PAPER} stroke={INK} strokeWidth="2.5" />
            {pct > 0 ? <Rect x={x + 11} y={GROUND + 14} width={Math.max(6, (GH.w - 22) * pct)} height="6" rx="3" fill={GATE_GAUGE[st]} /> : null}
        </G>
    );
}
