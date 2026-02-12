import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    SharedValue,
} from 'react-native-reanimated';

// ============================================================================
// PULSE RINGS
// ============================================================================
// Expanding warm energy rings radiating outward from the egg center, like
// ripples in water. Each ring expands from 30% to 100% of maxSize with an
// elliptical shape (height = 45% of width for perspective). Rings fade in
// sharply at the start and fade out quadratically.
//
// The effect evokes a gentle heartbeat of magical energy.
// ============================================================================

interface PulseRingProps {
    /** Shared value 0-1 driving the expansion cycle */
    driver: SharedValue<number>;
    /** Phase offset (0-1) for staggering */
    phase: number;
    /** Maximum ring width */
    maxSize: number;
    /** Ring color */
    color: string;
    /** Overall visibility multiplier */
    opacityDriver: SharedValue<number>;
}

function PulseRing({ driver, phase, maxSize, color, opacityDriver }: PulseRingProps) {
    // Ring border style (the visible expanding edge)
    const borderStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;

        // Expand from 30% to 100% of maxSize
        const ringWidth = maxSize * (0.3 + t * 0.7);
        // Elliptical: height is 45% of width for perspective
        const ringHeight = ringWidth * 0.45;

        // Sharp fade-in at start (first 5%), quadratic fade-out
        const fadeIn = t < 0.05 ? t / 0.05 : 1;
        const fadeOut = (1 - t) * (1 - t); // quadratic
        const fade = fadeIn * fadeOut;

        // Border thins as ring expands
        const borderWidth = 1.5 * (1 - t * 0.7);

        return {
            width: ringWidth,
            height: ringHeight,
            borderRadius: ringWidth / 2,
            borderWidth,
            borderColor: color,
            opacity: opacityDriver.value * fade * 0.7,
        };
    });

    // Inner fill (faint wash inside the ring)
    const fillStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;

        const ringWidth = maxSize * (0.3 + t * 0.7);
        const ringHeight = ringWidth * 0.45;

        // Cubic fade for the fill
        const cubicFade = (1 - t) * (1 - t) * (1 - t);

        return {
            width: ringWidth * 0.92,
            height: ringHeight * 0.92,
            borderRadius: ringWidth / 2,
            opacity: opacityDriver.value * cubicFade * 0.08,
        };
    });

    return (
        <View style={styles.ringWrapper} pointerEvents="none">
            {/* Inner fill at 8% opacity with cubic fade */}
            <Animated.View
                style={[
                    styles.ring,
                    { backgroundColor: color },
                    fillStyle,
                ]}
                pointerEvents="none"
            />
            {/* Ring border that thins as it expands */}
            <Animated.View
                style={[
                    styles.ring,
                    { backgroundColor: 'transparent' },
                    borderStyle,
                ]}
                pointerEvents="none"
            />
        </View>
    );
}

// ============================================================================
// PUBLIC COMPONENT
// ============================================================================

interface PulseRingsProps {
    /** Shared value 0-1 driving the expansion cycle */
    driver: SharedValue<number>;
    /** Opacity shared value for fade in/out */
    opacityDriver: SharedValue<number>;
    /** Maximum ring width at full expansion */
    maxSize: number;
    /** Ring color */
    color: string;
    /** Number of staggered rings (default 3) */
    count?: number;
}

export const PulseRings = React.memo(function PulseRings({
    driver,
    opacityDriver,
    maxSize,
    color,
    count = 3,
}: PulseRingsProps) {
    // Phase-offset each ring by 1/count
    const rings = useMemo(() => {
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            result.push(i / count);
        }
        return result;
    }, [count]);

    return (
        <View style={styles.container} pointerEvents="none">
            {rings.map((phase, i) => (
                <PulseRing
                    key={`pulse-ring-${i}`}
                    driver={driver}
                    phase={phase}
                    maxSize={maxSize}
                    color={color}
                    opacityDriver={opacityDriver}
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
    ringWrapper: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
    },
});
