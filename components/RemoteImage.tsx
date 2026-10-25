import { memo, useEffect, useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';
import { SvgXml } from 'react-native-svg';

/**
 * Image distante qui sait aussi afficher les SVG du site (badges, contours,
 * icônes) — le composant Image de React Native ne lit que les bitmaps.
 *
 * Les SVG sont téléchargés une seule fois puis gardés en mémoire : un même
 * badge affiché vingt fois ne fait qu'une requête.
 */
const svgCache = new Map<string, string | null>();
const svgInflight = new Map<string, Promise<string | null>>();

function loadSvg(uri: string): Promise<string | null> {
    if (svgCache.has(uri)) return Promise.resolve(svgCache.get(uri)!);
    const pending = svgInflight.get(uri);
    if (pending) return pending;
    const p = fetch(uri)
        .then((r) => (r.ok ? r.text() : null))
        .then((t) => (t && t.includes('<svg') ? t : null))
        .catch(() => null)
        .then((xml) => {
            svgCache.set(uri, xml);
            svgInflight.delete(uri);
            return xml;
        });
    svgInflight.set(uri, p);
    return p;
}

export const isSvgUri = (uri: string) => /\.svg($|\?)/i.test(uri) || uri.startsWith('data:image/svg');

function RemoteImage({
    uri, width, height, style, fallback = null, grayscale = false, resizeMode = 'contain',
}: {
    uri: string;
    width: number;
    height: number;
    style?: StyleProp<ImageStyle>;
    fallback?: React.ReactNode;
    /** Badge non obtenu : estompé */
    grayscale?: boolean;
    resizeMode?: 'contain' | 'cover';
}) {
    const svg = isSvgUri(uri);
    const [xml, setXml] = useState<string | null | undefined>(svg ? svgCache.get(uri) : undefined);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!svg || xml !== undefined) return;
        let alive = true;
        loadSvg(uri).then((x) => { if (alive) setXml(x); });
        return () => { alive = false; };
    }, [uri, svg, xml]);

    const opacity = grayscale ? 0.3 : 1;

    if (svg) {
        if (xml === null) return <>{fallback}</>;
        if (xml === undefined) return <View style={[{ width, height }, style as any]} />;
        return (
            <View style={[{ width, height, opacity }, style as any]}>
                <SvgXml xml={xml} width={width} height={height} />
            </View>
        );
    }
    if (failed) return <>{fallback}</>;
    return (
        <Image
            source={{ uri }}
            style={[{ width, height, opacity }, style]}
            resizeMode={resizeMode}
            onError={() => setFailed(true)}
        />
    );
}

export default memo(RemoteImage);
