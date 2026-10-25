// Copie conforme de workyt-next/src/lib/avatarLook.ts — NE PAS diverger :
// même graine + même look → même avatar que sur le site. blobatar est figé en 2.7.0
// (l'API interne _layout utilisée ici peut changer entre versions).
import { blobatar, _layout } from "blobatar";

/**
 * Accessoires de l'avatar Blobatar (boutique de gemmes).
 *
 * Chaque accessoire est un calque SVG posé par-dessus le blobatar, placé à
 * partir de la géométrie de la forme (`_layout` : corps, yeux). `_layout` est
 * une API interne de blobatar : la version est figée dans package.json, et
 * toute montée de version doit être revérifiée sur les 10 silhouettes.
 */

export type AccessorySlot = "color" | "hair" | "hat" | "glasses" | "face" | "mark";

/** Accessoire équipé par emplacement (id du catalogue, ou vide). */
export type AvatarLook = Partial<Record<AccessorySlot, string>>;

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface AvatarAccessory {
    id: string;
    slot: AccessorySlot;
    label: string;
    price: number;
    rarity: Rarity;
    /** Couleurs : teinte imposée au blobatar (degrés). */
    hue?: number;
}

export const ACCESSORY_SLOTS: { slot: AccessorySlot; label: string }[] = [
    { slot: "color", label: "Couleur" },
    { slot: "hair", label: "Coiffure" },
    { slot: "hat", label: "Chapeau" },
    { slot: "glasses", label: "Lunettes" },
    { slot: "face", label: "Barbe & moustache" },
    { slot: "mark", label: "Tatouage & piercing" },
];

export const AVATAR_ACCESSORIES: AvatarAccessory[] = [
    { id: "color-orange", slot: "color", label: "Orange Workyt", price: 3, rarity: "common", hue: 50 },
    { id: "color-miel", slot: "color", label: "Miel", price: 3, rarity: "common", hue: 75 },
    { id: "color-menthe", slot: "color", label: "Menthe", price: 3, rarity: "common", hue: 160 },
    { id: "color-ciel", slot: "color", label: "Ciel", price: 3, rarity: "common", hue: 250 },
    { id: "color-lilas", slot: "color", label: "Lilas", price: 3, rarity: "common", hue: 320 },
    { id: "color-bonbon", slot: "color", label: "Bonbon", price: 3, rarity: "common", hue: 345 },

    { id: "hair-meche", slot: "hair", label: "Mèche rebelle", price: 5, rarity: "common" },
    { id: "hair-pics", slot: "hair", label: "Coupe en pics", price: 8, rarity: "rare" },
    { id: "hair-chignon", slot: "hair", label: "Chignon", price: 8, rarity: "rare" },

    { id: "hat-casquette", slot: "hat", label: "Casquette Workyt", price: 10, rarity: "rare" },
    { id: "hat-bonnet", slot: "hat", label: "Bonnet à pompon", price: 8, rarity: "common" },
    { id: "hat-toque", slot: "hat", label: "Toque de diplômé", price: 20, rarity: "epic" },
    { id: "hat-couronne", slot: "hat", label: "Couronne", price: 40, rarity: "legendary" },

    { id: "glasses-rondes", slot: "glasses", label: "Lunettes rondes", price: 5, rarity: "common" },
    { id: "glasses-carrees", slot: "glasses", label: "Lunettes carrées", price: 5, rarity: "common" },
    { id: "glasses-soleil", slot: "glasses", label: "Lunettes de soleil", price: 12, rarity: "rare" },

    { id: "face-moustache", slot: "face", label: "Moustache", price: 6, rarity: "common" },
    { id: "face-bouc", slot: "face", label: "Bouc", price: 6, rarity: "common" },
    { id: "face-barbe", slot: "face", label: "Barbe", price: 10, rarity: "rare" },

    { id: "mark-anneau", slot: "mark", label: "Piercing anneau", price: 6, rarity: "common" },
    { id: "mark-sourcil", slot: "mark", label: "Piercing sourcil", price: 6, rarity: "common" },
    { id: "mark-etoile", slot: "mark", label: "Tatouage étoile", price: 8, rarity: "rare" },
    { id: "mark-eclair", slot: "mark", label: "Tatouage éclair", price: 12, rarity: "epic" },
];

const BY_ID = new Map(AVATAR_ACCESSORIES.map((a) => [a.id, a]));

export function getAccessory(id: string | null | undefined): AvatarAccessory | undefined {
    return id ? BY_ID.get(id) : undefined;
}

/** Ne garde que les accessoires connus, chacun dans son bon emplacement. */
export function sanitizeLook(look: unknown): AvatarLook {
    const out: AvatarLook = {};
    if (!look || typeof look !== "object") return out;
    for (const { slot } of ACCESSORY_SLOTS) {
        const id = (look as Record<string, unknown>)[slot];
        if (typeof id === "string" && BY_ID.get(id)?.slot === slot) out[slot] = id;
    }
    return out;
}

// Palette Workyt (voir globals.css)
const INK = "#1a1512";
const ORANGE = "#ff6a1a";
const AMBER = "#ffb547";
const SKY = "#6ec1e4";
const PAPER = "#fdfaf4";
const HAIR = "#2b1d14";

/** Luminance relative approximative d'une couleur #rrggbb. */
function luminance(hex: string): number {
    const n = Number.parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

type Geometry = {
    cx: number;
    top: number;
    rx: number;
    ry: number;
    cy: number;
    /** Échelle des accessoires dessinés pour une tête de rayon 32. */
    s: number;
    eyes: { cx: number; cy: number; rx: number; ry: number }[];
    mouthX: number;
    mouthY: number;
    /** Contour et poils : encre sur tête claire, papier/châtain sur tête foncée. */
    line: string;
    hair: string;
};

function geometry(seed: string, opts: { hue?: number }): Geometry {
    const { body, eyes: rawEyes, palette } = _layout(seed, opts);
    const dark = luminance(palette.head ?? PAPER) < 0.25;
    const eyes = [...rawEyes].sort((a, b) => a.cx - b.cx);
    const top = body.cy - body.ry;
    const eyeBottom = Math.max(...eyes.map((e) => e.cy + e.ry));
    const mouthX = eyes.reduce((sum, e) => sum + e.cx, 0) / eyes.length;
    const mouthY = Math.min(eyeBottom + 5, body.cy + body.ry * 0.7 - 3);
    return {
        cx: body.cx,
        top,
        rx: body.rx,
        ry: body.ry,
        cy: body.cy,
        s: Math.max(0.7, Math.min(1.25, body.rx / 32)),
        eyes,
        mouthX,
        mouthY,
        line: dark ? PAPER : INK,
        hair: dark ? "#8a5a3c" : HAIR,
    };
}

const stroke = (g: Geometry) =>
    `stroke="${g.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

/** Place un dessin conçu autour de (0,0) au point (x,y), à l'échelle s. */
const at = (x: number, y: number, s: number, inner: string) =>
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(3)})">${inner}</g>`;

const HAIRS: Record<string, (g: Geometry) => string> = {
    "hair-meche": (g) =>
        at(g.cx, g.top + 3, g.s, `<path d="M-6 4C-12-10 2-20 16-15C7-11 4-5 7 4Z" fill="${g.hair}" ${stroke(g)}/>`),
    "hair-pics": (g) =>
        at(g.cx, g.top + 4, g.s, `<path d="M-16 5L-12-11L-5 1L0-16L5 1L12-11L16 5Z" fill="${g.hair}" ${stroke(g)}/>`),
    "hair-chignon": (g) =>
        at(
            g.cx,
            g.top + 2,
            g.s,
            `<circle cx="0" cy="-9" r="10" fill="${g.hair}" ${stroke(g)}/><path d="M-9-1H9" stroke="${ORANGE}" stroke-width="3.5" stroke-linecap="round"/>`,
        ),
};

const HATS: Record<string, (g: Geometry) => string> = {
    "hat-casquette": (g) =>
        at(
            g.cx,
            g.top + 7,
            g.s,
            `<path d="M-27 0C-27-25 27-25 27 0Z" fill="${ORANGE}" ${stroke(g)}/>` +
                `<path d="M18 0H40Q44 0 43 4H16Z" fill="${ORANGE}" ${stroke(g)}/>` +
                `<path d="M-8-13L-4-5L0-11L4-5L8-13" fill="none" stroke="${PAPER}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
        ),
    "hat-bonnet": (g) =>
        at(
            g.cx,
            g.top + 8,
            g.s,
            `<path d="M-27 0C-27-28 27-28 27 0Z" fill="${SKY}" ${stroke(g)}/>` +
                `<rect x="-29" y="-5" width="58" height="9" rx="4.5" fill="${PAPER}" ${stroke(g)}/>` +
                `<circle cx="0" cy="-23" r="6" fill="${ORANGE}" ${stroke(g)}/>`,
        ),
    "hat-toque": (g) =>
        at(
            g.cx,
            g.top + 6,
            g.s,
            `<path d="M-16-12V0H16V-12" fill="${INK}" ${stroke(g)}/>` +
                `<path d="M-32-14L0-25L32-14L0-3Z" fill="${INK}" ${stroke(g)}/>` +
                `<path d="M0-14L22-11V2" fill="none" stroke="${AMBER}" stroke-width="2.2" stroke-linecap="round"/>` +
                `<circle cx="22" cy="4" r="3" fill="${AMBER}"/>`,
        ),
    "hat-couronne": (g) =>
        at(
            g.cx,
            g.top + 5,
            g.s,
            `<path d="M-20 0L-23-20L-11-10L0-25L11-10L23-20L20 0Z" fill="${AMBER}" ${stroke(g)}/>` +
                `<circle cx="0" cy="-8" r="3" fill="${ORANGE}"/><circle cx="-12" cy="-5" r="2.2" fill="${SKY}"/><circle cx="12" cy="-5" r="2.2" fill="${SKY}"/>`,
        ),
};

function lenses(g: Geometry, draw: (x: number, y: number, rx: number, ry: number) => string) {
    const [a, b] = [g.eyes[0], g.eyes[g.eyes.length - 1]];
    const gap = b.cx - a.cx;
    const rx = Math.max(5, Math.min(gap / 2 - 1.5, Math.max(a.rx, b.rx) + 5));
    const ry = Math.min(14, Math.max(Math.max(a.ry, b.ry) + 2.5, rx * 0.85));
    const y = (a.cy + b.cy) / 2;
    const bridge = `<path d="M${(a.cx + rx).toFixed(2)} ${y.toFixed(2)}Q${((a.cx + b.cx) / 2).toFixed(2)} ${(y - 3).toFixed(2)} ${(b.cx - rx).toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${g.line}" stroke-width="2.2"/>`;
    return draw(a.cx, y, rx, ry) + draw(b.cx, y, rx, ry) + bridge;
}

const GLASSES: Record<string, (g: Geometry) => string> = {
    "glasses-rondes": (g) =>
        lenses(
            g,
            (x, y, rx, ry) =>
                `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="${PAPER}" fill-opacity="0.18" stroke="${g.line}" stroke-width="2.4"/>`,
        ),
    "glasses-carrees": (g) =>
        lenses(
            g,
            (x, y, rx, ry) =>
                `<rect x="${(x - rx).toFixed(2)}" y="${(y - ry).toFixed(2)}" width="${(rx * 2).toFixed(2)}" height="${(ry * 2).toFixed(2)}" rx="3" fill="${PAPER}" fill-opacity="0.18" stroke="${ORANGE}" stroke-width="2.6"/>`,
        ),
    "glasses-soleil": (g) =>
        lenses(
            g,
            (x, y, rx, ry) =>
                `<rect x="${(x - rx).toFixed(2)}" y="${(y - ry * 0.8).toFixed(2)}" width="${(rx * 2).toFixed(2)}" height="${(ry * 1.6).toFixed(2)}" rx="${(ry * 0.7).toFixed(2)}" fill="${INK}" stroke="${g.line}" stroke-width="2"/>` +
                `<path d="M${(x - rx * 0.5).toFixed(2)} ${(y - ry * 0.35).toFixed(2)}l${(rx * 0.35).toFixed(2)} -${(ry * 0.2).toFixed(2)}" stroke="${PAPER}" stroke-width="1.8" stroke-linecap="round"/>`,
        ),
};

const FACES: Record<string, (g: Geometry) => string> = {
    "face-moustache": (g) =>
        at(
            g.mouthX,
            g.mouthY,
            g.s,
            `<path d="M0 0C-4-5-12-5-17 2C-12 0-6 3 0 3C6 3 12 0 17 2C12-5 4-5 0 0Z" fill="${g.hair}" ${stroke(g)}/>`,
        ),
    "face-bouc": (g) =>
        at(g.mouthX, g.mouthY + 4, g.s, `<path d="M-5 0H5L0 10Z" fill="${g.hair}" ${stroke(g)}/>`),
    "face-barbe": (g) => {
        const w = g.rx * 0.8;
        const top = (g.eyes[0].cy + g.eyes[g.eyes.length - 1].cy) / 2;
        const chin = Math.max(g.mouthY + 8, g.cy + g.ry * 0.95);
        const x = g.mouthX;
        const f = (n: number) => n.toFixed(2);
        // Favoris → mâchoire → menton, avec l'ouverture de la bouche en haut
        return `<path d="M${f(x - w)} ${f(top)}Q${f(x - w)} ${f(chin)} ${f(x)} ${f(chin)}Q${f(x + w)} ${f(chin)} ${f(x + w)} ${f(top)}L${f(x + w - 4)} ${f(top)}Q${f(x + w - 6)} ${f(g.mouthY - 1)} ${f(x)} ${f(g.mouthY - 1)}Q${f(x - w + 6)} ${f(g.mouthY - 1)} ${f(x - w + 4)} ${f(top)}Z" fill="${g.hair}" ${stroke(g)}/>`;
    },
};

const MARKS: Record<string, (g: Geometry) => string> = {
    "mark-anneau": (g) =>
        at(
            g.cx + g.rx * 0.93,
            g.cy + 2,
            g.s,
            `<circle cx="0" cy="4" r="4" fill="none" stroke="${AMBER}" stroke-width="2.2"/>`,
        ),
    "mark-sourcil": (g) => {
        const e = g.eyes[g.eyes.length - 1];
        const y = e.cy - e.ry - 3;
        return (
            `<circle cx="${(e.cx - 1.5).toFixed(2)}" cy="${y.toFixed(2)}" r="2.2" fill="${AMBER}" stroke="${g.line}" stroke-width="0.9"/>` +
            `<circle cx="${(e.cx + 3).toFixed(2)}" cy="${(y - 1).toFixed(2)}" r="2.2" fill="${AMBER}" stroke="${g.line}" stroke-width="0.9"/>`
        );
    },
    "mark-etoile": (g) => {
        const e = g.eyes[0];
        return at(
            e.cx - 3,
            e.cy + e.ry + 6,
            g.s * 1.3,
            `<path d="M0-5L1.5-1.5L5-1.2L2.3 1.2L3 5L0 3L-3 5L-2.3 1.2L-5-1.2L-1.5-1.5Z" fill="${g.line}" fill-opacity="0.8"/>`,
        );
    },
    "mark-eclair": (g) => {
        const e = g.eyes[0];
        return at(
            e.cx - 4,
            e.cy + e.ry + 6,
            g.s * 1.4,
            `<path d="M1-7L-4 1H0L-2 7L4-2H0Z" fill="${ORANGE}" stroke="${g.line}" stroke-width="1" stroke-linejoin="round"/>`,
        );
    },
};

const RENDERERS: Partial<Record<AccessorySlot, Record<string, (g: Geometry) => string>>> = {
    hair: HAIRS,
    hat: HATS,
    glasses: GLASSES,
    face: FACES,
    mark: MARKS,
};

/** Ordre des calques, du plus bas au plus haut. */
const LAYER_ORDER: AccessorySlot[] = ["face", "mark", "glasses", "hair", "hat"];

/**
 * SVG détouré (fond transparent) : blobatar + accessoires.
 *
 * Avec un accessoire qui dépasse de la tête (coiffure, chapeau), le blobatar
 * est légèrement réduit et descendu pour que rien ne soit coupé.
 */
export function renderAvatarSvg(seed: string, look: AvatarLook = {}, size?: number): string {
    const hue = getAccessory(look.color)?.hue;
    const opts = hue !== undefined ? { hue } : {};
    const svg = blobatar(seed, { ...opts, background: false });
    const inner = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));

    const geo = geometry(seed, opts);
    const layers = LAYER_ORDER.map((slot) => {
        const id = look[slot];
        const draw = id ? RENDERERS[slot]?.[id] : undefined;
        return draw ? draw(geo) : "";
    }).join("");

    const needsRoom = Boolean(look.hat || look.hair);
    const content = needsRoom
        ? `<g transform="translate(50 57) scale(0.8) translate(-50 -50)">${inner}${layers}</g>`
        : inner + layers;
    const dims = size ? ` width="${size}" height="${size}"` : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${dims}>${content}</svg>`;
}

export function renderAvatarUri(seed: string, look: AvatarLook = {}): string {
    return `data:image/svg+xml,${encodeURIComponent(renderAvatarSvg(seed, look))}`;
}
