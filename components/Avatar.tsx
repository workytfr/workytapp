import { memo, useMemo, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { getSiteOrigin } from "../lib/siteOrigin";
import { useCustomization } from "../lib/avatarCustomization";
import { renderAvatarSvg } from "../lib/avatarLook";
import RemoteImage from "./RemoteImage";

interface AvatarProps {
    name: string;
    userId?: string;
    /** Image de repli (ex. photo du compte) si le membre n'a rien personnalisé */
    imageUri?: string | null;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    showBorder?: boolean;
    borderColor?: string;
}

const SIZE_MAP = {
    xs: 24,
    sm: 32,
    md: 44,
    lg: 56,
    xl: 80,
};

function absolute(uri: string): string {
    if (/^(https?:|data:)/.test(uri)) return uri;
    return `${getSiteOrigin()}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

// Le SVG d'un Blobatar ne dépend que de (graine, accessoires) : on le garde en
// mémoire pour ne pas le recalculer à chaque rendu de liste.
const svgCache = new Map<string, string>();
function blobatarSvg(seed: string, lookKey: string, look: Parameters<typeof renderAvatarSvg>[1]): string {
    const key = `${seed}|${lookKey}`;
    let svg = svgCache.get(key);
    if (!svg) {
        svg = renderAvatarSvg(seed, look);
        if (svgCache.size > 500) svgCache.clear();
        svgCache.set(key, svg);
    }
    return svg;
}

/**
 * Avatar identique à AvatarDisplay du site :
 *   1. photo envoyée par le membre (active) ;
 *   2. image de profil équipée (boutique) ;
 *   3. image de repli fournie ;
 *   4. Blobatar génératif + accessoires achetés, calculé localement
 *      (même graine → même avatar que sur workyt.fr, sans requête réseau).
 * Le contour personnalisé se pose par-dessus.
 */
function Avatar({
    name,
    userId,
    imageUri,
    size = "md",
    showBorder = false,
    borderColor = "#FF6A1A",
}: AvatarProps) {
    const [imageError, setImageError] = useState(false);
    const px = SIZE_MAP[size];
    const seed = userId || name || "?";

    const custom = useCustomization(userId);

    const photo = custom.profileImageUrl ?? (imageUri ? absolute(imageUri) : null);
    const lookKey = JSON.stringify(custom.look);
    const svg = useMemo(
        () => (photo && !imageError ? null : blobatarSvg(seed, lookKey, custom.look)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [photo, imageError, seed, lookKey],
    );

    return (
        <View
            style={{
                width: px,
                height: px,
                borderRadius: px / 2,
                borderWidth: showBorder ? 3 : 0,
                borderColor,
            }}
        >
            <View style={[styles.round, { width: px, height: px, borderRadius: px / 2 }]}>
                {photo && !imageError ? (
                    <Image
                        source={{ uri: photo }}
                        style={{ width: px, height: px }}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
                    />
                ) : svg ? (
                    <SvgXml xml={svg} width={px} height={px} />
                ) : null}
            </View>

            {/* Contour de profil personnalisé (cosmétique de la boutique) */}
            {custom.profileBorderUrl ? (
                <View style={[styles.border, { width: px, height: px }]} pointerEvents="none">
                    <RemoteImage uri={custom.profileBorderUrl} width={px} height={px} />
                </View>
            ) : null}
        </View>
    );
}

export default memo(Avatar);

const styles = StyleSheet.create({
    round: {
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    border: {
        position: "absolute",
        top: 0,
        left: 0,
    },
});
