import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    SharedValue,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';

// ============================================================================
// FIREFLY PARTICLES
// ============================================================================
// 10 tiny warm golden motes drifting lazily around the egg in figure-8 paths.
// Each firefly has an independent twinkle and a 3-layer visual:
//   - outer glow halo (15% opacity)
//   - color ring (35% opacity)
//   - bright warm-white core
//
// Inspired by Studio Ghibli forest spirits and Calcifer's ember glow.
// ============================================================================

interface FireflyConfig {
    /** Phase offset in degrees for unique drift path */
    phase: number;
    /** Horizontal radius of the figure-8 drift */
    rx: number;
    /** Vertical radius of the figure-8 drift */
    ry: number;
    /** Firefly diameter */
    size: number;
    /** Firefly tint color */
    color: string;
    /** Unique twinkle frequency multiplier */
    twinkleFreq: number;
    /** Drift speed multiplier */
    driftSpeed: number;
    /** Center X offset */
    cx: number;
    /** Center Y offset */
    cy: number;
}

interface FireflyProps {
    driver: SharedValue<number>;
    opacityDriver: SharedValue<number>;
    config: FireflyConfig;
    fallDriver?: SharedValue<number>;
}

function Firefly({ driver, opacityDriver, config, fallDriver }: FireflyProps) {
    const { phase, rx, ry, size, color, twinkleFreq, driftSpeed, cx, cy } = config;
    const haloSize = size * 4;
    const ringSize = size * 2.2;

    const animatedStyle = useAnimatedStyle(() => {
        // Convert driver (0-360 degrees) to radians with phase offset and speed
        const angle = ((driver.value * driftSpeed + phase) % 360) * (Math.PI / 180);

        // Figure-8 drift path using sine combinations
        const x = cx + Math.cos(angle) * rx + Math.sin(angle * 2) * rx * 0.3;
        const y = cy + Math.sin(angle) * ry + Math.cos(angle * 1.5) * ry * 0.2;

        // Optional fall offset for failed state
        const fallOffset = fallDriver ? fallDriver.value * 60 : 0;

        // Independent twinkle using sine with quadratic smoothing
        const rawTwinkle = Math.sin(angle * twinkleFreq);
        const twinkle = 0.4 + rawTwinkle * rawTwinkle * 0.6; // quadratic-smoothed

        return {
            transform: [
                { translateX: x - haloSize / 2 },
                { translateY: y - haloSize / 2 + fallOffset },
            ],
            opacity: opacityDriver.value * twinkle,
        };
    });

    return (
        <Animated.View
            style={[
                styles.firefly,
                { width: haloSize, height: haloSize },
                animatedStyle,
            ]}
            pointerEvents="none"
        >
            {/* Layer 1: Outer glow halo */}
            <View
                style={[
                    styles.fireflyLayer,
                    {
                        width: haloSize,
                        height: haloSize,
                        borderRadius: haloSize / 2,
                        backgroundColor: color,
                        opacity: 0.15,
                    },
                ]}
            />
            {/* Layer 2: Color ring */}
            <View
                style={[
                    styles.fireflyLayer,
                    {
                        width: ringSize,
                        height: ringSize,
                        borderRadius: ringSize / 2,
                        backgroundColor: color,
                        opacity: 0.35,
                    },
                ]}
            />
            {/* Layer 3: Bright warm-white core */}
            <View
                style={[
                    styles.fireflyLayer,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: theme.colors.accent,
                    },
                ]}
            />
        </Animated.View>
    );
}

// ============================================================================
// PUBLIC COMPONENT
// ============================================================================

interface FireflyParticlesProps {
    /** Shared value 0-360 driving the orbit angle */
    driver: SharedValue<number>;
    /** Opacity shared value for fade in/out */
    opacityDriver: SharedValue<number>;
    /** Egg size used to scale drift radii */
    eggSize: number;
    /** Primary firefly color */
    color: string;
    /** Secondary alternating color */
    secondaryColor: string;
    /** Optional shared value for failed-state falling */
    fallDriver?: SharedValue<number>;
}

export const FireflyParticles = React.memo(function FireflyParticles({
    driver,
    opacityDriver,
    eggSize,
    color,
    secondaryColor,
    fallDriver,
}: FireflyParticlesProps) {
    const fireflies = useMemo<FireflyConfig[]>(() => {
        const baseRx = eggSize * 0.5;
        const baseRy = eggSize * 0.4;

        // 8 fireflies at ~45° intervals for even coverage with varied radii
        return [
            { phase: 0,   rx: baseRx * 0.85, ry: baseRy * 0.90, size: 3.5, color, twinkleFreq: 2.3, driftSpeed: 0.7, cx: 0,  cy: -eggSize * 0.05 },
            { phase: 45,  rx: baseRx * 1.10, ry: baseRy * 0.75, size: 2.5, color: secondaryColor, twinkleFreq: 3.1, driftSpeed: 0.55, cx: eggSize * 0.08, cy: eggSize * 0.03 },
            { phase: 90,  rx: baseRx * 0.70, ry: baseRy * 1.05, size: 4.0, color, twinkleFreq: 1.8, driftSpeed: 0.8, cx: -eggSize * 0.06, cy: -eggSize * 0.10 },
            { phase: 135, rx: baseRx * 1.00, ry: baseRy * 0.85, size: 3.0, color: secondaryColor, twinkleFreq: 2.7, driftSpeed: 0.65, cx: eggSize * 0.04, cy: eggSize * 0.07 },
            { phase: 180, rx: baseRx * 1.15, ry: baseRy * 0.80, size: 3.5, color: secondaryColor, twinkleFreq: 2.0, driftSpeed: 0.6, cx: 0, cy: -eggSize * 0.08 },
            { phase: 225, rx: baseRx * 0.80, ry: baseRy * 0.95, size: 2.5, color, twinkleFreq: 2.9, driftSpeed: 0.75, cx: eggSize * 0.07, cy: eggSize * 0.05 },
            { phase: 270, rx: baseRx * 0.90, ry: baseRy * 0.70, size: 3.5, color, twinkleFreq: 3.3, driftSpeed: 0.85, cx: eggSize * 0.05, cy: eggSize * 0.02 },
            { phase: 315, rx: baseRx * 0.75, ry: baseRy * 1.15, size: 2.5, color: secondaryColor, twinkleFreq: 2.5, driftSpeed: 0.7, cx: -eggSize * 0.08, cy: eggSize * 0.06 },
        ];
    }, [eggSize, color, secondaryColor]);

    return (
        <View style={styles.container} pointerEvents="none">
            {fireflies.map((config, i) => (
                <Firefly
                    key={`firefly-${i}`}
                    driver={driver}
                    opacityDriver={opacityDriver}
                    config={config}
                    fallDriver={fallDriver}
                />
            ))}
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
    firefly: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fireflyLayer: {
        position: 'absolute',
    },
});
