/**
 * Inventaire des cosmétiques — équivalent mobile de l'onglet inventaire de
 * GemManager (src/app/gems du site) : solde de gemmes, objets possédés
 * groupés par type, équiper / retirer d'un tap, historique des gemmes.
 *
 * Résolution des cosmeticId identique au site :
 *  - profile_image  : nom de fichier → /profile/<fichier>
 *  - profile_border : id boutique → /profile/contour/<fichier> (lib/profileFrames),
 *                     ou contour animé SVG (non dessiné ici : pastille de repli)
 *  - username_color : type de couleur (rainbow, neon…) → teinte représentative
 *  - avatar_accessory : id de lib/avatarLook → Blobatar avec l'accessoire
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Icon from '../components/Icon';
import RemoteImage from '../components/RemoteImage';
import { SkeletonList, Eyebrow, EmptyState, ChipTabs } from '../components/wk';
import { GameScreen, UnavailableState, ErrorBanner, PaperCard, openOnSite } from '../components/gameKit';
import { useColors } from '../lib/useColors';
import { useAuth } from '../lib/auth';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import { getSiteOrigin } from '../lib/siteOrigin';
import { renderAvatarSvg, getAccessory, sanitizeLook, ACCESSORY_SLOTS, type AvatarLook } from '../lib/avatarLook';
import { success, error as hapticError, tapLight } from '../lib/haptics';
import {
    getInventory, setEquipped, getGemsBalance, getGemsHistory, isUnavailable,
    type Inventory, type InventoryItem, type CosmeticType, type GemsBalance, type GemTransaction,
} from '../lib/gamification';

// ---- Catalogue (copié de workyt-next : lib/profileFrames.ts, GemManager.tsx) ----

const IMAGE_FRAME_FILES: Record<string, string> = {
    gold: 'gold.svg', silver: 'silver.svg', eclair_green: 'eclair_green.apng', fumee: 'fumee.png',
    poison_orange: 'poison_orange.png', halloween_pumpkins_apng: 'halloween_pumpkins_apng.png',
};
const FRAME_LABEL: Record<string, string> = {
    gold: 'Contour doré', silver: 'Contour argenté', eclair_green: 'Éclair vert', fumee: 'Fumée',
    poison_orange: 'Poison orange', halloween_pumpkins_apng: 'Citrouilles',
    bubblegum: 'Bulle de chewing-gum', yumego_manga: 'Sakura Yumego', aura_ki: 'Aura de combat',
    flamme_dragon: 'Flammes du dragon', chapeau_paille: 'Chapeau de paille', ninja_spirale: 'Ninja de la spirale',
    couronne_or: "Couronne d'or", couronne_jade: 'Couronne de jade', glitch: 'Glitch', feux_follets: 'Feux follets',
    nuage: 'Nuage', halloween_2026: 'Crânes affamés', erable_canada: 'Érable du Canada', tempete_sable: 'Tempête de sable',
};
const LEGACY_TO_ANIMATED: Record<string, string> = { 'yumego_manga.apng': 'yumego_manga' };

/** Identifiant boutique d'un contour à partir du fichier stocké (borderIdFromFilename du site) */
function borderIdFromFilename(filename: string | null | undefined): string | null {
    if (!filename) return null;
    if (filename.startsWith('anim:')) return filename.slice(5);
    if (LEGACY_TO_ANIMATED[filename]) return LEGACY_TO_ANIMATED[filename];
    const hit = Object.entries(IMAGE_FRAME_FILES).find(([, f]) => f === filename);
    return hit ? hit[0] : filename;
}

const NAME_COLORS: Record<string, { label: string; color: string }> = {
    solid: { label: 'Simple', color: '#3B82F6' }, gradient: { label: 'Dégradé', color: '#8B5CF6' },
    rainbow: { label: 'Arc-en-ciel', color: '#FF4500' }, neon: { label: 'Néon', color: '#00C8C8' },
    automne: { label: 'Automne', color: '#D2691E' }, galaxy: { label: 'Galaxie', color: '#7C3AED' },
    fire: { label: 'Feu', color: '#DC2626' }, ice: { label: 'Glace', color: '#0369A1' },
    lightning: { label: 'Éclair', color: '#F59E0B' }, cosmic: { label: 'Cosmique', color: '#9370DB' },
    diamond: { label: 'Diamant', color: '#10B981' }, legendary: { label: 'Légendaire', color: '#F97316' },
    typewriter: { label: 'Machine à écrire', color: '#22C55E' }, glitch: { label: 'Glitch', color: '#FF0080' },
    stardust: { label: "Poussière d'étoiles", color: '#9932CC' }, nitro: { label: 'Nitro', color: '#5865F2' },
    custom: { label: 'Personnalisée', color: '#FF6B6B' },
};

const TYPE_ORDER: { type: CosmeticType; label: string; icon: string }[] = [
    { type: 'avatar_accessory', label: "Accessoires d'avatar", icon: 'shirt' },
    { type: 'profile_image', label: 'Images de profil', icon: 'image' },
    { type: 'profile_border', label: 'Contours', icon: 'ellipse' },
    { type: 'username_color', label: 'Couleurs de pseudo', icon: 'color-palette' },
];

const TX_LABEL: Record<string, string> = {
    conversion: 'Conversion points → gemmes', purchase: 'Achat personnalisation', refund: 'Remboursement', bonus: 'Bonus',
    partner_offer: 'Offre partenaire', reward: 'Récompense', admin_grant: 'Attribution admin', admin_deduct: 'Déduction admin',
};

function itemLabel(it: InventoryItem): string {
    switch (it.cosmeticType) {
        case 'profile_image': return it.cosmeticId.replace(/\.[a-z0-9]+$/i, '').replace(/^Foxy(?=\S)/, 'Foxy ');
        case 'profile_border': return FRAME_LABEL[it.cosmeticId] ?? it.cosmeticId;
        case 'username_color': return NAME_COLORS[it.cosmeticId]?.label ?? it.cosmeticId;
        case 'avatar_accessory': return getAccessory(it.cosmeticId)?.label ?? it.cosmeticId;
        default: return it.cosmeticId;
    }
}

type Filter = 'all' | CosmeticType;

export default function InventaireScreen() {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const { user } = useAuth();
    const seed = user?.id ?? 'workyt';

    const [inv, setInv] = useState<Inventory | null>(null);
    const [balance, setBalance] = useState<GemsBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [pending, setPending] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');

    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState<GemTransaction[] | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    const load = useCallback(async () => {
        const [i, b] = await Promise.allSettled([getInventory(), getGemsBalance()]);
        if (i.status === 'fulfilled') { setInv(i.value); setUnavailable(false); }
        else if (isUnavailable(i.reason)) setUnavailable(true);
        else setMessage((i.reason as Error).message);
        if (b.status === 'fulfilled') setBalance(b.value);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const isEquipped = useCallback((it: InventoryItem) => {
        const eq = inv?.equipped;
        if (!eq) return false;
        switch (it.cosmeticType) {
            case 'profile_image': return eq.profileImage === it.cosmeticId;
            case 'profile_border': return borderIdFromFilename(eq.profileBorder) === it.cosmeticId;
            case 'username_color': return eq.usernameColor?.type === it.cosmeticId;
            case 'avatar_accessory': {
                const a = getAccessory(it.cosmeticId);
                return !!a && eq.avatarLook?.[a.slot] === it.cosmeticId;
            }
            default: return false;
        }
    }, [inv]);

    const toggle = useCallback(async (it: InventoryItem) => {
        if (pending) return;
        tapLight();
        setPending(it._id);
        setMessage(null);
        try {
            await setEquipped(it.cosmeticType, it.cosmeticId, isEquipped(it) ? 'unequip' : 'equip');
            success();
            setInv(await getInventory());
        } catch (e) {
            hapticError();
            setMessage((e as Error).message);
        } finally {
            setPending(null);
        }
    }, [pending, isEquipped]);

    const loadHistory = useCallback(async (more: boolean) => {
        setHistoryLoading(true);
        try {
            const res = await getGemsHistory(20, more ? history?.length ?? 0 : 0);
            setHistory((prev) => more ? [...(prev ?? []), ...res.transactions] : res.transactions);
            setHasMore(res.pagination?.hasMore ?? false);
        } catch (e) {
            setHistory((prev) => prev ?? []);
            if (!isUnavailable(e)) setMessage((e as Error).message);
        } finally {
            setHistoryLoading(false);
        }
    }, [history]);

    const toggleHistory = () => {
        tapLight();
        const open = !historyOpen;
        setHistoryOpen(open);
        if (open && !history) loadHistory(false);
    };

    const look: AvatarLook = useMemo(() => sanitizeLook(inv?.equipped.avatarLook), [inv]);
    const groups = useMemo(() => {
        const items = inv?.inventory ?? [];
        return TYPE_ORDER.map((g) => ({
            ...g,
            items: items
                .filter((i) => i.cosmeticType === g.type)
                .sort((a, b) => {
                    if (g.type !== 'avatar_accessory') return 0;
                    const sa = ACCESSORY_SLOTS.findIndex((x) => x.slot === getAccessory(a.cosmeticId)?.slot);
                    const sb = ACCESSORY_SLOTS.findIndex((x) => x.slot === getAccessory(b.cosmeticId)?.slot);
                    return sa - sb;
                }),
        })).filter((g) => g.items.length > 0);
    }, [inv]);

    const filters = useMemo(() => [
        { value: 'all' as Filter, label: 'Tout' },
        ...groups.map((g) => ({ value: g.type as Filter, label: `${g.label.split(' ')[0]} · ${g.items.length}` })),
    ], [groups]);
    const shown = filter === 'all' ? groups : groups.filter((g) => g.type === filter);

    const eq = inv?.equipped;
    const borderId = borderIdFromFilename(eq?.profileBorder);
    const nameColor = eq?.usernameColor
        ? (eq.usernameColor.type === 'solid' || eq.usernameColor.type === 'custom' ? eq.usernameColor.value : NAME_COLORS[eq.usernameColor.type]?.color)
        : undefined;

    return (
        <GameScreen
            eyebrow="Profil · Cosmétiques"
            title="Inventaire"
            accent="ton style"
            subtitle="Équipe d'un tap les cosmétiques gagnés dans les coffres ou achetés avec tes gemmes."
            refreshing={refreshing}
            onRefresh={unavailable ? undefined : onRefresh}
        >
            {loading ? (
                <SkeletonList count={3} />
            ) : unavailable ? (
                <UnavailableState sitePath="/gems" what="Ton inventaire" />
            ) : (
                <View style={s.body}>
                    <ErrorBanner message={message} onClose={() => setMessage(null)} />

                    {/* Aperçu + solde */}
                    <PaperCard style={s.top}>
                        <View style={s.preview}>
                            <AvatarPreview seed={seed} look={look} imageFile={eq?.profileImage ?? null} borderId={borderId} size={84} s={s} colors={colors} />
                            <View style={s.flex}>
                                <Text style={[s.username, nameColor ? { color: nameColor } : null]} numberOfLines={1}>
                                    {user?.username ?? balance?.user.username ?? 'Toi'}
                                </Text>
                                <Text style={s.previewHint}>Aperçu de ton profil</Text>
                            </View>
                        </View>
                        <View style={s.balanceRow}>
                            <View style={s.balanceMain}>
                                <Icon name="gem" size={22} color={colors.info} />
                                <Text style={s.balance}>{balance?.gems.balance ?? '—'}</Text>
                                <Text style={s.balanceUnit}>gemmes</Text>
                            </View>
                            {balance ? (
                                <View style={s.balanceSide}>
                                    <Text style={s.balanceMeta}>+{balance.gems.totalEarned} gagnées</Text>
                                    <Text style={s.balanceMeta}>−{balance.gems.totalSpent} dépensées</Text>
                                </View>
                            ) : null}
                        </View>
                        <Pressable onPress={() => openOnSite('/gems')} style={({ pressed }) => [s.shopLink, pressed && { opacity: 0.6 }]} accessibilityRole="link">
                            <Text style={s.shopText}>Boutique sur workyt.fr</Text>
                            <Icon name="open" size={14} color={colors.accent} />
                        </Pressable>
                    </PaperCard>

                    {/* Objets */}
                    {groups.length === 0 ? (
                        <EmptyState icon="backpack" title="Inventaire vide" text="Ouvre des coffres (quêtes, calendrier) ou passe par la boutique pour gagner tes premiers cosmétiques." />
                    ) : (
                        <>
                            {groups.length > 1 ? (
                                <View style={s.filters}>
                                    <ChipTabs options={filters} value={filter} onChange={(v) => { tapLight(); setFilter(v); }} />
                                </View>
                            ) : null}
                            {shown.map((g) => (
                                <View key={g.type} style={s.group}>
                                    <View style={s.groupHead}>
                                        <Eyebrow>{g.label}</Eyebrow>
                                        <Text style={s.groupCount}>{g.items.length}</Text>
                                    </View>
                                    <View style={s.grid}>
                                        {g.items.map((it) => {
                                            const on = isEquipped(it);
                                            const acc = it.cosmeticType === 'avatar_accessory' ? getAccessory(it.cosmeticId) : undefined;
                                            const rar = acc ? colors.rarity[({ common: 'commun', rare: 'rare', epic: 'epique', legendary: 'legendaire' } as const)[acc.rarity]] : null;
                                            return (
                                                <Pressable
                                                    key={it._id}
                                                    onPress={() => toggle(it)}
                                                    style={({ pressed }) => [s.tile, on && s.tileOn, pressed && { transform: [{ scale: 0.97 }] }]}
                                                    accessibilityRole="button"
                                                    accessibilityState={{ selected: on }}
                                                    accessibilityLabel={`${itemLabel(it)}, ${on ? 'équipé, toucher pour retirer' : 'toucher pour équiper'}`}
                                                >
                                                    {on ? <View style={s.onBadge}><Icon name="checkmark" size={12} color="#fff" /></View> : null}
                                                    <View style={s.tileArt}>
                                                        <ItemArt it={it} seed={seed} s={s} colors={colors} />
                                                    </View>
                                                    <Text style={s.tileLabel} numberOfLines={2}>{itemLabel(it)}</Text>
                                                    {acc && rar ? (
                                                        <Text style={[s.tileSlot, { color: rar.text }]} numberOfLines={1}>
                                                            {ACCESSORY_SLOTS.find((x) => x.slot === acc.slot)?.label}
                                                        </Text>
                                                    ) : null}
                                                    <View style={[s.tileBtn, on ? s.tileBtnOn : s.tileBtnOff]}>
                                                        {pending === it._id ? (
                                                            <ActivityIndicator size="small" color={on ? colors.text : '#fff'} />
                                                        ) : (
                                                            <Text style={[s.tileBtnText, { color: on ? colors.text : '#fff' }]}>{on ? 'Retirer' : 'Équiper'}</Text>
                                                        )}
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Historique des gemmes */}
                    <View style={s.history}>
                        <Pressable onPress={toggleHistory} style={({ pressed }) => [s.historyHead, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ expanded: historyOpen }}>
                            <View style={s.historyIcon}><Icon name="time" size={18} color={colors.textSecondary} /></View>
                            <Text style={s.historyTitle}>Historique des gemmes</Text>
                            <Icon name={historyOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                        </Pressable>
                        {historyOpen ? (
                            <View style={s.historyBody}>
                                {history?.length === 0 && !historyLoading ? <Text style={s.txEmpty}>Aucune transaction pour l'instant.</Text> : null}
                                {(history ?? []).map((t) => (
                                    <View key={t.id} style={s.tx}>
                                        <View style={s.flex}>
                                            <Text style={s.txType}>{TX_LABEL[t.type] ?? t.type}</Text>
                                            {t.description ? <Text style={s.txDesc} numberOfLines={2}>{t.description}</Text> : null}
                                            <Text style={s.txDate}>{new Date(t.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                                        </View>
                                        <Text style={[s.txGems, { color: t.gems >= 0 ? colors.success : colors.error }]}>
                                            {t.gems >= 0 ? '+' : '−'}{Math.abs(t.gems)}
                                        </Text>
                                    </View>
                                ))}
                                {historyLoading ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} /> : hasMore ? (
                                    <Pressable onPress={() => loadHistory(true)} style={s.more} accessibilityRole="button">
                                        <Text style={s.moreText}>Voir plus</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                </View>
            )}
        </GameScreen>
    );
}

/** Blobatar ou image de profil, avec le contour équipé par-dessus */
function AvatarPreview({ seed, look, imageFile, borderId, size, s, colors }: {
    seed: string; look: AvatarLook; imageFile: string | null; borderId: string | null; size: number;
    s: ReturnType<typeof createStyles>; colors: ThemeColors;
}) {
    const origin = getSiteOrigin();
    const svg = useMemo(() => renderAvatarSvg(seed, look), [seed, look]);
    const borderFile = borderId ? IMAGE_FRAME_FILES[borderId] : undefined;
    return (
        <View style={{ width: size, height: size }}>
            <View style={[s.avatarDisc, { width: size, height: size, borderRadius: size / 2 }]}>
                {imageFile ? (
                    <RemoteImage uri={`${origin}/profile/${imageFile}`} width={size} height={size} resizeMode="cover" />
                ) : (
                    <SvgXml xml={svg} width={size} height={size} />
                )}
            </View>
            {borderFile ? (
                <View style={s.borderOverlay} pointerEvents="none">
                    <RemoteImage uri={`${origin}/profile/contour/${borderFile}`} width={size * 1.16} height={size * 1.16} />
                </View>
            ) : borderId ? (
                <View pointerEvents="none" style={[s.animRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderColor: colors.accent2 }]} />
            ) : null}
        </View>
    );
}

/** Vignette d'un objet possédé */
function ItemArt({ it, seed, s, colors }: { it: InventoryItem; seed: string; s: ReturnType<typeof createStyles>; colors: ThemeColors }) {
    const origin = getSiteOrigin();
    switch (it.cosmeticType) {
        case 'profile_image':
            return (
                <RemoteImage
                    uri={`${origin}/profile/${it.cosmeticId}`}
                    width={64}
                    height={64}
                    style={{ borderRadius: 32 }}
                    resizeMode="cover"
                    fallback={<Icon name="image" size={28} color={colors.textMuted} />}
                />
            );
        case 'profile_border': {
            const file = IMAGE_FRAME_FILES[it.cosmeticId];
            return file ? (
                <RemoteImage uri={`${origin}/profile/contour/${file}`} width={64} height={64} fallback={<Icon name="ellipse" size={28} color={colors.textMuted} />} />
            ) : (
                // Contours animés : dessinés en SVG animé sur le site, pastille ici
                <View style={[s.animTile, { borderColor: colors.accent2 }]}>
                    <Icon name="sparkles" size={22} color={colors.accent} />
                    <Text style={s.animTileText}>Animé</Text>
                </View>
            );
        }
        case 'username_color': {
            const c = NAME_COLORS[it.cosmeticId]?.color ?? colors.text;
            return <Text style={[s.nameSample, { color: c }]}>Aa</Text>;
        }
        case 'avatar_accessory': {
            const a = getAccessory(it.cosmeticId);
            const xml = renderAvatarSvg(seed, a ? { [a.slot]: a.id } : {});
            return <SvgXml xml={xml} width={68} height={68} />;
        }
        default:
            return <Icon name="cube" size={28} color={colors.textMuted} />;
    }
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        flex: { flex: 1, minWidth: 0 },
        body: { paddingBottom: spacing.lg },

        top: { margin: spacing.lg, padding: spacing.xl, gap: spacing.lg },
        preview: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingLeft: 4 },
        avatarDisc: { backgroundColor: c.surfaceVariant, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
        borderOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
        animRing: { position: 'absolute', top: -4, left: -4, borderWidth: 3, borderStyle: 'dashed' },
        username: { fontFamily: typography.fontFamily.display, fontSize: 26, color: c.text },
        previewHint: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
        balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: c.divider },
        balanceMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        balance: { fontFamily: typography.fontFamily.displayBold, fontSize: 38, color: c.text, letterSpacing: -1 },
        balanceUnit: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.textSecondary, marginTop: 8 },
        balanceSide: { alignItems: 'flex-end', gap: 2 },
        balanceMeta: { fontFamily: typography.fontFamily.mono, fontSize: 11, color: c.textSecondary },
        shopLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
        shopText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.accent },

        filters: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
        group: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
        groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
        groupCount: { fontFamily: typography.fontFamily.mono, fontSize: 12, color: c.textMuted },
        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
        tile: {
            width: '47.5%', alignItems: 'center', padding: spacing.md, gap: 6,
            backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border,
        },
        tileOn: { borderColor: c.primary, borderWidth: 2, backgroundColor: c.primary + '08' },
        onBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
        tileArt: { width: 76, height: 76, borderRadius: 38, backgroundColor: c.surfaceVariant, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        tileLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.text, textAlign: 'center', minHeight: 34 },
        tileSlot: { fontFamily: typography.fontFamily.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: -4 },
        tileBtn: { alignSelf: 'stretch', minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
        tileBtnOff: { backgroundColor: c.primary, borderBottomWidth: 3, borderBottomColor: c.primaryDark },
        tileBtnOn: { backgroundColor: c.surfaceVariant, borderWidth: 1, borderColor: c.border },
        tileBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13 },
        animTile: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
        animTileText: { fontFamily: typography.fontFamily.semiBold, fontSize: 9, color: c.accent },
        nameSample: { fontFamily: typography.fontFamily.displayBold, fontSize: 32 },

        history: { marginHorizontal: spacing.lg, marginTop: spacing.xl, backgroundColor: c.surface, borderRadius: radius.xl + 2, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
        historyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 60 },
        historyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
        historyTitle: { flex: 1, fontFamily: typography.fontFamily.display, fontSize: 19, color: c.text },
        historyBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
        txEmpty: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary, paddingBottom: spacing.md },
        tx: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: c.divider },
        txType: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        txDesc: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
        txDate: { fontFamily: typography.fontFamily.mono, fontSize: 11, color: c.textMuted, marginTop: 4 },
        txGems: { fontFamily: typography.fontFamily.displayBold, fontSize: 20 },
        more: { alignItems: 'center', justifyContent: 'center', minHeight: 44, borderTopWidth: 1, borderTopColor: c.divider },
        moreText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.accent },
    });
}
