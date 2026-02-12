import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    SharedValue,
} from 'react-native-reanimated';

// ============================================================================
// GROUND SHADOW
// ============================================================================
// A dynamic elliptical shadow beneath the egg that responds to levitation
// height. When the egg lifts higher, the shadow spreads wider, becomes thinner,
// and grows lighter -- mimicking a real soft shadow cast from above.
//
// levitationDriver: 0 = egg resting on ground, 1 = egg at maximum height
// ============================================================================

interface GroundShadowProps {
    /** Shared value 0-1 representing how high the egg is floating */
    levitationDriver: SharedValue<number>;
    /** Base width of the shadow ellipse at rest */
    baseWidth: number;
    /** Vertical offset from the center of the container */
    offsetY: number;
    /** Shadow color (default: semi-transparent black) */
    color?: string;
}

export const GroundShadow = React.memo(function GroundShadow({
    levitationDriver,
    baseWidth,
    offsetY,
    color = 'rgba(0,0,0,0.25)',
}: GroundShadowProps) {
    // Shadow height is 18% of width for a thin ellipse
    const baseHeight = baseWidth * 0.18;

    const animatedStyle = useAnimatedStyle(() => {
        const lift = levitationDriver.value;

        // When lift = 1 (egg high): shadow spreads wider (+30%), thinner (-30%), lighter
        // When lift = 0 (egg low): shadow at base size, darker
        const scaleX = 1 + lift * 0.3;
        const scaleY = 1 - lift * 0.3;

        // Opacity fades as egg lifts (base opacity from color, extra fade on top)
        const opacityMultiplier = 1 - lift * 0.5;

        // Shadow moves slightly down (+4px) when egg lifts higher
        const translateY = offsetY + lift * 4;

        return {
            transform: [
                { translateY },
                { scaleX },
                { scaleY },
            ],
            opacity: opacityMultiplier,
        };
    });

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View
                style={[
                    styles.shadow,
                    {
                        width: baseWidth,
                        height: baseHeight,
                        borderRadius: baseWidth / 2,
                        backgroundColor: color,
                    },
                    animatedStyle,
                ]}
                pointerEvents="none"
            />
        </View>
    );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shadow: {
        position: 'absolute',
    },
});
