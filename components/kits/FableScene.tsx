/**
 * Scène « Corvy et Foxy » — portage de workyt-next :
 * components/pomodoro/FableScene.tsx. La scène est composée sur une toile
 * fixe de 720 × 320 puis mise à l'échelle de l'écran ; sur téléphone les
 * bulles passent sous la scène (mode « compact » du site).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { CrowArt, FoxArt, TreeArt, type CrowMood, type FoxMood } from './FableArt';
import { CROW_LINES, FOX_FLATTERIES, FOX_LINES } from '../../lib/kits/fable';
import type { Outcome, Phase, Status } from '../../lib/kits/usePomodoro';
import { typography } from '../../lib/theme';

/** Une nouvelle flatterie de Foxy toutes les 90 secondes de focus. */
const FLATTERY_EVERY_MS = 90_000;
const STAGE_W = 720;
const STAGE_H = 320;
const INK = '#3A2E2E';

const SPEAKERS = {
    corvy: { name: 'Corvy', bg: '#EFEBFA', color: '#3B3553' },
    foxy: { name: 'Foxy', bg: '#FFEBDD', color: '#D9500C' },
} as const;

interface FableSceneProps {
    phase: Phase;
    status: Status;
    outcome: Outcome;
    remainingMs: number;
    totalMs: number;
}

interface Cast {
    crow: CrowMood;
    fox: FoxMood;
    crowLine: string;
    foxLine: string;
    cheese: 'crow' | 'fox';
}

/** Distribution des rôles — identique au site. */
function cast({ phase, status, outcome, remainingMs, totalMs }: FableSceneProps): Cast {
    if (phase === 'focus') {
        if (status === 'running') {
            const i = Math.floor((totalMs - remainingMs) / FLATTERY_EVERY_MS) % FOX_FLATTERIES.length;
            return { crow: 'concentre', fox: i % 2 ? 'charmeur' : 'ruse', crowLine: CROW_LINES.focus, foxLine: FOX_FLATTERIES[i], cheese: 'crow' };
        }
        if (status === 'paused') {
            return { crow: 'inquiet', fox: 'charmeur', crowLine: CROW_LINES.paused, foxLine: FOX_LINES.paused, cheese: 'crow' };
        }
        if (outcome === 'stolen') {
            return { crow: 'triste', fox: 'content', crowLine: CROW_LINES.stolen, foxLine: FOX_LINES.stolen, cheese: 'fox' };
        }
        return { crow: 'calme', fox: 'ruse', crowLine: CROW_LINES.idle, foxLine: FOX_LINES.idle, cheese: 'crow' };
    }
    if (status === 'idle' && outcome === 'kept') {
        return { crow: 'fier', fox: 'decu', crowLine: CROW_LINES.kept, foxLine: FOX_LINES.kept, cheese: 'crow' };
    }
    return {
        crow: phase === 'long' ? 'dort' : 'fier',
        fox: 'decu',
        crowLine: phase === 'long' ? CROW_LINES.longBreak : CROW_LINES.shortBreak,
        foxLine: FOX_LINES.break,
        cheese: 'crow',
    };
}

function useLoop(active: boolean, duration: number) {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!active) {
            v.stopAnimation();
            v.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        );
        loop.start();
        return () => loop.stop();
    }, [active, duration, v]);
    return v;
}

function Bubble({ who, text, tail }: { who: keyof typeof SPEAKERS; text: string; tail: 'up-left' | 'up-right' }) {
    const sp = SPEAKERS[who];
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        fade.setValue(0);
        Animated.spring(fade, { toValue: 1, useNativeDriver: true, stiffness: 280, damping: 24, mass: 1 }).start();
    }, [text, fade]);
    return (
        <Animated.View
            style={[
                st.bubbleShadow,
                tail === 'up-right' && { alignSelf: 'flex-end' },
                { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${sp.name} : ${text}`}
        >
            <View style={[st.bubble, { backgroundColor: sp.bg }]}>
                <Text style={[st.bubbleName, { color: sp.color }]}>{sp.name}</Text>
                <Text style={st.bubbleText}>{text}</Text>
            </View>
            <Svg width={22} height={18} viewBox="0 0 22 18" style={[st.tail, tail === 'up-left' ? { left: 40 } : { right: 40 }]}>
                <Path d="M1 18 L11 2 L21 18" fill={sp.bg} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            </Svg>
        </Animated.View>
    );
}

export default function FableScene(props: FableSceneProps) {
    const c = cast(props);
    const isBreak = props.phase !== 'focus';
    const focusing = props.phase === 'focus' && props.status === 'running';
    const [w, setW] = useState(0);
    const k = Math.min(1, w / STAGE_W);

    const cloud = useLoop(true, 18_000);
    const bob = useLoop(focusing, 2_600);
    const sneak = useLoop(focusing, 7_000);

    const cloudX = cloud.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 18 * k, 0] });
    const crowY = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -2 * k, 0] });
    const foxX = sneak.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -8 * k, 0, 5 * k, 0] });

    const px = useMemo(() => (n: number) => n * k, [k]);

    return (
        <View>
            <View
                style={[st.stage, { height: w ? STAGE_H * k : 0 }]}
                onLayout={(e) => setW(e.nativeEvent.layout.width)}
                accessibilityLabel="Corvy et Foxy"
            >
                <LinearGradient
                    colors={isBreak ? ['#d9eefa', '#f4f9fc'] : ['#ffe9d4', '#fff8ef']}
                    style={StyleSheet.absoluteFill}
                />
                {w > 0 ? (
                    <>
                        {/* Ciel : soleil (focus) ou lune douce (pause) et nuage */}
                        <View
                            style={{
                                position: 'absolute',
                                right: px(64),
                                top: px(32),
                                width: px(64),
                                height: px(64),
                                borderRadius: px(32),
                                borderWidth: Math.max(1.5, px(3)),
                                borderColor: INK,
                                backgroundColor: isBreak ? '#fff4c2' : '#ffb547',
                            }}
                        />
                        <Animated.View style={{ position: 'absolute', left: px(380), top: px(4), transform: [{ translateX: cloudX }] }}>
                            <Svg viewBox="0 0 120 50" width={px(80)} height={px(80 * 50 / 120)}>
                                <Path d="M14 42 C 0 42, 2 24, 18 26 C 20 10, 46 8, 52 22 C 60 12, 84 14, 84 30 C 100 26, 112 42, 96 42 Z" fill="#fff" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
                            </Svg>
                        </Animated.View>

                        {/* Colline */}
                        <Svg viewBox="0 0 720 80" preserveAspectRatio="none" width={w} height={px(80)} style={{ position: 'absolute', bottom: 0, left: 0 }}>
                            <Path d="M0 34 C 160 10, 360 20, 520 18 C 620 16, 690 26, 720 30 L720 80 L0 80 Z" fill="#B9E28C" stroke={INK} strokeWidth={4} />
                        </Svg>

                        {/* Arbre et Corvy */}
                        <View style={{ position: 'absolute', bottom: 0, left: 0, width: px(380), height: px(300) }}>
                            <TreeArt width={px(380)} height={px(300)} />
                            <Animated.View style={{ position: 'absolute', left: px(136), top: px(3), transform: [{ translateY: crowY }] }}>
                                <CrowArt mood={c.crow} holding={c.cheese === 'crow'} width={px(140)} height={px(140 * 150 / 180)} />
                            </Animated.View>
                        </View>

                        {/* Foxy */}
                        <Animated.View style={{ position: 'absolute', bottom: px(14), right: px(40), transform: [{ translateX: foxX }] }}>
                            <FoxArt mood={c.fox} holding={c.cheese === 'fox'} width={px(170)} height={px(170 * 170 / 190)} />
                        </Animated.View>
                    </>
                ) : null}
            </View>

            {/* Bulles sous la scène (trop petites une fois réduites) */}
            <View style={st.bubbles}>
                <Bubble who="corvy" text={c.crowLine} tail="up-left" />
                <Bubble who="foxy" text={c.foxLine} tail="up-right" />
            </View>
        </View>
    );
}

const st = StyleSheet.create({
    stage: {
        overflow: 'hidden',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(26,21,18,0.08)',
    },
    bubbles: { marginTop: 20, gap: 20 },
    bubbleShadow: {
        alignSelf: 'flex-start',
        maxWidth: '86%',
        borderRadius: 16,
        backgroundColor: INK,
        paddingBottom: 3,
    },
    bubble: {
        borderRadius: 16,
        borderWidth: 3,
        borderColor: INK,
        paddingHorizontal: 14,
        paddingTop: 6,
        paddingBottom: 8,
    },
    bubbleName: {
        fontFamily: typography.fontFamily.heading,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    bubbleText: { fontFamily: typography.fontFamily.medium, fontSize: 14, lineHeight: 19, color: INK },
    tail: { position: 'absolute', top: -15 },
});
