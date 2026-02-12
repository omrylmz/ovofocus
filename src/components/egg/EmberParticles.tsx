import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    SharedValue,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';

// ============================================================================
// EMBER PARTICLES
// ============================================================================
// 8 rising ember motes like campfire sparks. Each ember rises with quadratic
// acceleration, wobbles sideways with sine (3 cycles), and fades through a
// lifecycle. A trailing afterimage follows behind, 50% dimmer.
//
// 2-layer visual per ember:
//   - warm halo (20% opacity)
//   - hot white-yellow core (#FFF5E0)
//
// Evokes the warmth of a hearth fire or Calcifer's dancing sparks.
// ============================================================================

interface EmberConfig {
    /** Phase offset (0-1) for stagger */
    phase: number;
    /** Starting X offset from center */
    startX: number;
    /** Horizontal wobble amplitude */
    wobbleAmp: number;
    /** Ember dot size */
    size: number;
    /** Ember tint color for the halo */
    color: string;
}

interface EmberProps {
    /** Shared value 0-1 driving the rise cycle */
    driver: SharedValue<number>;
    /** Overall opacity multiplier */
    opacityDriver: SharedValue<number>;
    /** How far up the ember travels */
    riseHeight: number;
    /** Ember configuration */
    config: EmberConfig;
}

function Ember({ driver, opacityDriver, riseHeight, config }: EmberProps) {
    const { phase, startX, wobbleAmp, size, color } = config;
    const haloSize = size * 3.5;

    // Main ember
    const mainStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;

        // Quadratic rise: starts slow, accelerates upward
        const riseProgress = t * t;
        const y = -riseProgress * riseHeight;

        // Sine wobble with 3 cycles across the rise
        const x = startX + Math.sin(t * Math.PI * 2 * 3) * wobbleAmp;

        // Lifecycle fade: quick fade-in (first 10%), hold, fade-out (last 25%)
        let fade: number;
        if (t < 0.1) {
            fade = t / 0.1;
        } else if (t > 0.75) {
            fade = (1 - t) / 0.25;
        } else {
            fade = 1;
        }

        // Scale shrinks slightly as ember rises and burns out
        const particleScale = 0.6 + fade * 0.4;

        return {
            transform: [
                { translateX: x - haloSize / 2 },
                { translateY: y - haloSize / 2 },
                { scale: particleScale },
            ],
            opacity: opacityDriver.value * fade * 0.9,
        };
    });

    // Trailing afterimage (6% lag behind, 50% dimmer)
    const trailStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;
        const tTrail = Math.max(0, t - 0.06);

        const riseProgress = tTrail * tTrail;
        const y = -riseProgress * riseHeight;
        const x = startX + Math.sin(tTrail * Math.PI * 2 * 3) * wobbleAmp;

        // Trail fades in later and is dimmer
        let fade: number;
        if (t < 0.15) {
            fade = 0;
        } else if (t > 0.75) {
            fade = (1 - t) / 0.25;
        } else {
            fade = 0.5;
        }

        return {
            transform: [
                { translateX: x - size },
                { translateY: y - size },
            ],
            opacity: opacityDriver.value * fade * 0.45,
        };
    });

    return (
        <>
            {/* Trailing afterimage */}
            <Animated.View
                style={[
                    styles.ember,
                    {
                        width: size * 2,
                        height: size * 2,
                        borderRadius: size,
                        backgroundColor: color,
                    },
                    trailStyle,
                ]}
                pointerEvents="none"
            />
            {/* Main ember with halo + core */}
            <Animated.View
                style={[
                    styles.ember,
                    { width: haloSize, height: haloSize },
                    mainStyle,
                ]}
                pointerEvents="none"
            >
                {/* Layer 1: Warm halo */}
                <View
                    style={[
                        styles.emberLayer,
                        {
                            width: haloSize,
                            height: haloSize,
                            borderRadius: haloSize / 2,
                            backgroundColor: color,
                            opacity: 0.2,
                        },
                    ]}
                />
                {/* Layer 2: Hot white-yellow core */}
                <View
                    style={[
                        styles.emberLayer,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: theme.colors.accent,
                        },
                    ]}
                />
            </Animated.View>
        </>
    );
}

// ============================================================================
// PUBLIC COMPONENT
// ============================================================================

interface EmberParticlesProps {
    /** Shared value 0-1 driving the rise cycle */
    driver: SharedValue<number>;
    /** Opacity shared value for fade in/out */
    opacityDriver: SharedValue<number>;
    /** Egg size used to calculate rise height and spawn spread */
    eggSize: number;
    /** Primary ember color */
    color: string;
    /** Secondary alternating color */
    secondaryColor: string;
}

export const EmberParticles = React.memo(function EmberParticles({
    driver,
    opacityDriver,
    eggSize,
    color,
    secondaryColor,
}: EmberParticlesProps) {
    // Rise height = 85% of eggSize
    const riseHeight = eggSize * 0.85;

    const embers = useMemo<EmberConfig[]>(() => {
        // 6 embers with even phase spacing for consistent visual density
        const spread = eggSize * 0.25;
        return [
            { phase: 0.00, startX: -spread * 0.6,  wobbleAmp: 6,  size: 3.5, color },
            { phase: 0.17, startX: spread * 0.4,    wobbleAmp: -5, size: 3.0, color: secondaryColor },
            { phase: 0.33, startX: -spread * 0.2,   wobbleAmp: 8,  size: 4.0, color },
            { phase: 0.50, startX: spread * 0.8,    wobbleAmp: -7, size: 3.0, color: secondaryColor },
            { phase: 0.67, startX: -spread * 0.9,   wobbleAmp: 5,  size: 3.5, color },
            { phase: 0.83, startX: spread * 0.3,    wobbleAmp: -9, size: 3.0, color: secondaryColor },
        ];
    }, [eggSize, color, secondaryColor]);

    return (
        <View style={styles.container} pointerEvents="none">
            {embers.map((config, i) => (
                <Ember
                    key={`ember-${i}`}
                    driver={driver}
                    opacityDriver={opacityDriver}
                    riseHeight={riseHeight}
                    config={config}
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
    ember: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emberLayer: {
        position: 'absolute',
    },
});
