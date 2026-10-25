import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { useThemeContext } from '../lib/themeContext';

/**
 * Trame de points du site (.wk-dotgrid : point de 1 px tous les 18 px,
 * encre à 12 %) posée en fond absolu. Un seul motif SVG répété : pas de
 * coût par point, même sur un grand en-tête.
 */
const PaperDots = memo(function PaperDots({ style }: { style?: StyleProp<ViewStyle> }) {
    const { isDark } = useThemeContext();
    const dot = isDark ? 'rgba(253,250,244,0.10)' : 'rgba(26,21,18,0.12)';
    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
            <Svg width="100%" height="100%">
                <Defs>
                    <Pattern id="wkdots" width={18} height={18} patternUnits="userSpaceOnUse">
                        <Circle cx={1} cy={1} r={1} fill={dot} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#wkdots)" />
            </Svg>
        </View>
    );
});

export default PaperDots;
