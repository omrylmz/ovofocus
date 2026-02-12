import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    withDelay,
    Easing,
    cancelAnimation,
    SharedValue,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { SessionState } from '../context/GameContext';
import { Language, t } from '../i18n/translations';
import { WarningLevel } from '../hooks/useToleranceSystem';
import { EggStyle, getDefaultEggStyle, getEggStyleById } from '../data/eggStyles';
import { StyledEgg } from './StyledEgg';
import { useAppStateAnimation } from '../hooks/useAppStateAnimation';
import { useResponsive } from '../hooks/useResponsive';
import { FireflyParticles } from './egg/FireflyParticles';
import { GroundShadow } from './egg/GroundShadow';
import { PulseRings } from './egg/PulseRings';
import { EmberParticles } from './egg/EmberParticles';

interface EggProps {
    sessionState: SessionState;
    progress?: number; // 0 to 1
    language?: Language;
    warningLevel?: WarningLevel; // 0=none, 1=50%, 2=75%, 3=100%
    eggStyleId?: string; // ID of the selected egg style
}

const WARNING_COLORS = {
    0: theme.colors.accent,
    1: theme.colors.accent,   // Yellow warning
    2: theme.colors.warning,  // Orange warning
    3: theme.colors.error,    // Red warning
};

// ==========================================================================
// ORBITING PARTICLE
// ==========================================================================
// A single luminous orb that orbits around the egg in an elliptical path.
// Each particle has its own phase offset, speed, and size for variety.
// ==========================================================================

interface OrbitParticleProps {
    /** Reanimated shared value driving the orbit angle (0-360, repeating) */
    driver: SharedValue<number>;
    /** Phase offset in degrees so particles don't bunch together */
    phaseOffset: number;
    /** Horizontal radius of the orbit ellipse */
    orbitRx: number;
    /** Vertical radius of the orbit ellipse */
    orbitRy: number;
    /** Size of the particle dot */
    size: number;
    /** Particle color */
    color: string;
    /** Opacity shared value from parent (controls fade in/out) */
    opacityDriver: SharedValue<number>;
    /** Center X of the orbit */
    cx: number;
    /** Center Y of the orbit */
    cy: number;
}

function OrbitParticle({
    driver,
    phaseOffset,
    orbitRx,
    orbitRy,
    size,
    color,
    opacityDriver,
    cx,
    cy,
}: OrbitParticleProps) {
    const haloSize = size * 3;
    const animatedStyle = useAnimatedStyle(() => {
        const angle = ((driver.value + phaseOffset) % 360) * (Math.PI / 180);
        const x = cx + Math.cos(angle) * orbitRx - haloSize / 2;
        const y = cy + Math.sin(angle) * orbitRy - haloSize / 2;
        // Particles behind the egg (sin > 0 = bottom half) are dimmer
        const depthFade = Math.sin(angle) > 0 ? 0.25 : 1.0;
        // Subtle size pulse based on depth
        const depthScale = 0.8 + Math.cos(angle) * 0.2;
        return {
            transform: [
                { translateX: x },
                { translateY: y },
                { scale: depthScale },
            ],
            opacity: opacityDriver.value * depthFade,
        };
    });

    return (
        <Animated.View
            style={[
                styles.orbitParticle,
                { width: haloSize, height: haloSize },
                animatedStyle,
            ]}
            pointerEvents="none"
        >
            {/* Soft outer glow halo */}
            <View style={[
                styles.particleHalo,
                {
                    width: haloSize,
                    height: haloSize,
                    borderRadius: haloSize / 2,
                    backgroundColor: color,
                    opacity: 0.2,
                },
            ]} />
            {/* Bright core */}
            <View style={[
                styles.particleCore,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                },
            ]} />
        </Animated.View>
    );
}

// ==========================================================================
// RISING PARTICLE
// ==========================================================================
// A luminous mote that rises upward from the egg surface, drifting slightly
// sideways, then fading out. Creates a "magical energy" emanation effect.
// ==========================================================================

interface RisingParticleProps {
    /** Shared value 0→1 driving the rise cycle */
    driver: SharedValue<number>;
    /** Delay phase (0-1) so particles stagger */
    phase: number;
    /** Starting X offset from center */
    startX: number;
    /** Starting Y position (bottom of egg area) */
    startY: number;
    /** How far up the particle travels */
    riseHeight: number;
    /** Horizontal drift during rise */
    drift: number;
    /** Particle size */
    size: number;
    /** Color */
    color: string;
    /** Overall opacity multiplier */
    opacityDriver: SharedValue<number>;
}

function RisingParticle({
    driver,
    phase,
    startX,
    startY,
    riseHeight,
    drift,
    size,
    color,
    opacityDriver,
}: RisingParticleProps) {
    const haloSize = size * 3.5;
    const animatedStyle = useAnimatedStyle(() => {
        // Each particle loops through its own lifecycle offset by phase
        const t = (driver.value + phase) % 1;
        const y = startY - t * riseHeight;
        const x = startX + Math.sin(t * Math.PI * 2) * drift;
        // Fade in quickly, hold, fade out at the end
        const fade = t < 0.1 ? t / 0.1 : t > 0.7 ? (1 - t) / 0.3 : 1;
        const particleScale = 0.5 + fade * 0.5;
        return {
            transform: [
                { translateX: x - haloSize / 2 },
                { translateY: y - haloSize / 2 },
                { scale: particleScale },
            ],
            opacity: opacityDriver.value * fade * 0.8,
        };
    });

    // Trail: a secondary particle that lags slightly behind
    const trailStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;
        const tTrail = Math.max(0, t - 0.08); // Slight lag
        const y = startY - tTrail * riseHeight;
        const x = startX + Math.sin(tTrail * Math.PI * 2) * drift;
        const fade = t < 0.15 ? 0 : t > 0.7 ? (1 - t) / 0.3 : 0.5;
        return {
            transform: [
                { translateX: x - size / 2 },
                { translateY: y - size / 2 },
            ],
            opacity: opacityDriver.value * fade * 0.3,
        };
    });

    return (
        <>
            {/* Luminous trail */}
            <Animated.View
                style={[
                    styles.risingParticle,
                    {
                        width: size * 1.5,
                        height: size * 1.5,
                        borderRadius: size,
                        backgroundColor: color,
                    },
                    trailStyle,
                ]}
                pointerEvents="none"
            />
            {/* Main particle with halo */}
            <Animated.View
                style={[
                    styles.risingParticle,
                    { width: haloSize, height: haloSize },
                    animatedStyle,
                ]}
                pointerEvents="none"
            >
                {/* Glow halo */}
                <View style={[
                    styles.particleHalo,
                    {
                        width: haloSize,
                        height: haloSize,
                        borderRadius: haloSize / 2,
                        backgroundColor: color,
                        opacity: 0.15,
                    },
                ]} />
                {/* Core */}
                <View style={[
                    styles.particleCore,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                    },
                ]} />
            </Animated.View>
        </>
    );
}

// ==========================================================================
// AURA RING
// ==========================================================================
// An expanding, fading ring that pulses outward from the egg center.
// Multiple rings at different phases create a "heartbeat" energy effect.
// ==========================================================================

interface AuraRingProps {
    /** Shared value 0→1 driving expansion */
    driver: SharedValue<number>;
    /** Phase offset (0-1) for staggering */
    phase: number;
    /** Maximum ring size */
    maxSize: number;
    /** Ring color */
    color: string;
    /** Overall visibility */
    opacityDriver: SharedValue<number>;
    /** Ring thickness */
    thickness: number;
}

function AuraRing({
    driver,
    phase,
    maxSize,
    color,
    opacityDriver,
    thickness,
}: AuraRingProps) {
    // Outer soft halo ring
    const outerStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;
        const ringSize = maxSize * (0.4 + t * 0.6);
        const fade = 1 - t;
        return {
            width: ringSize,
            height: ringSize * 0.85,
            borderRadius: ringSize / 2,
            opacity: opacityDriver.value * fade * fade * 0.2,
        };
    });

    // Bright core ring (the visible edge)
    const coreStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;
        const ringSize = maxSize * (0.4 + t * 0.6);
        const fade = 1 - t;
        return {
            width: ringSize,
            height: ringSize * 0.85,
            borderRadius: ringSize / 2,
            borderWidth: thickness * (1 - t * 0.5),
            borderColor: color,
            opacity: opacityDriver.value * fade * fade * 0.6,
        };
    });

    // Inner glow that fills the ring with a faint wash
    const innerStyle = useAnimatedStyle(() => {
        const t = (driver.value + phase) % 1;
        const ringSize = maxSize * (0.4 + t * 0.6) * 0.85;
        const fade = 1 - t;
        return {
            width: ringSize,
            height: ringSize * 0.85,
            borderRadius: ringSize / 2,
            opacity: opacityDriver.value * fade * fade * fade * 0.1,
        };
    });

    return (
        <View style={styles.auraRingWrapper} pointerEvents="none">
            {/* Outer soft halo (wide, dim) */}
            <Animated.View
                style={[styles.auraRing, { backgroundColor: color }, outerStyle]}
                pointerEvents="none"
            />
            {/* Core ring edge (bright border) */}
            <Animated.View
                style={[styles.auraRing, { backgroundColor: 'transparent' }, coreStyle]}
                pointerEvents="none"
            />
            {/* Inner faint fill */}
            <Animated.View
                style={[styles.auraRing, { backgroundColor: color }, innerStyle]}
                pointerEvents="none"
            />
        </View>
    );
}

// ==========================================================================
// SHIMMER SWEEP
// ==========================================================================
// A diagonal light sweep that travels across the egg surface periodically.
// Creates a "shine" effect like light glancing off a polished surface.
// ==========================================================================

interface ShimmerSweepProps {
    driver: SharedValue<number>;
    eggWidth: number;
    eggHeight: number;
    color: string;
}

function ShimmerSweep({ driver, eggWidth, eggHeight, color }: ShimmerSweepProps) {
    const shimmerWidth = eggWidth * 0.22;

    // Bright core band
    const coreStyle = useAnimatedStyle(() => {
        const totalTravel = eggWidth + shimmerWidth * 2;
        const x = -shimmerWidth + driver.value * totalTravel;
        const normalizedPos = driver.value;
        const fade = normalizedPos < 0.3
            ? normalizedPos / 0.3
            : normalizedPos > 0.7
            ? (1 - normalizedPos) / 0.3
            : 1;

        return {
            transform: [
                { translateX: x },
                { rotate: '-20deg' },
            ],
            opacity: fade * 0.35,
        };
    });

    // Soft outer halo (wider, dimmer, offset slightly)
    const haloStyle = useAnimatedStyle(() => {
        const totalTravel = eggWidth + shimmerWidth * 2;
        const x = -shimmerWidth * 1.5 + driver.value * totalTravel;
        const normalizedPos = driver.value;
        const fade = normalizedPos < 0.3
            ? normalizedPos / 0.3
            : normalizedPos > 0.7
            ? (1 - normalizedPos) / 0.3
            : 1;

        return {
            transform: [
                { translateX: x },
                { rotate: '-20deg' },
            ],
            opacity: fade * 0.12,
        };
    });

    return (
        <>
            {/* Soft wide halo sweep */}
            <Animated.View
                style={[
                    styles.shimmerSweep,
                    {
                        width: shimmerWidth * 2.5,
                        height: eggHeight * 1.2,
                        backgroundColor: color,
                    },
                    haloStyle,
                ]}
                pointerEvents="none"
            />
            {/* Bright core band */}
            <Animated.View
                style={[
                    styles.shimmerSweep,
                    {
                        width: shimmerWidth,
                        height: eggHeight * 1.2,
                        backgroundColor: color,
                    },
                    coreStyle,
                ]}
                pointerEvents="none"
            />
        </>
    );
}

// ==========================================================================
// DUST MOTE
// ==========================================================================
// A tiny, barely-visible particle that drifts lazily in the idle state.
// Creates a dreamy, magical atmosphere even when nothing is happening.
// Reuses the orbit driver to avoid extra animation timers.
// ==========================================================================

interface DustMoteProps {
    driver: SharedValue<number>;
    opacityDriver: SharedValue<number>;
    /** Unique phase offset in degrees */
    phase: number;
    /** Orbit radii — larger than regular orbit for ambient feel */
    rx: number;
    ry: number;
    /** Mote size (very small) */
    size: number;
    color: string;
    cx: number;
    cy: number;
}

function DustMote({ driver, opacityDriver, phase, rx, ry, size, color, cx, cy }: DustMoteProps) {
    const animatedStyle = useAnimatedStyle(() => {
        // Slower movement — divide driver by a factor for lazy drift
        const angle = ((driver.value * 0.6 + phase) % 360) * (Math.PI / 180);
        // Figure-8-ish drift path
        const x = cx + Math.cos(angle) * rx + Math.sin(angle * 2) * rx * 0.15;
        const y = cy + Math.sin(angle) * ry + Math.cos(angle * 1.5) * ry * 0.1;
        // Gentle twinkle
        const twinkle = 0.6 + Math.sin(angle * 3) * 0.4;
        return {
            transform: [
                { translateX: x - size / 2 },
                { translateY: y - size / 2 },
            ],
            opacity: opacityDriver.value * twinkle,
        };
    });

    return (
        <Animated.View
            style={[
                styles.dustMote,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                },
                animatedStyle,
            ]}
            pointerEvents="none"
        />
    );
}

// ==========================================================================
// MAIN EGG COMPONENT
// ==========================================================================

export function Egg({ sessionState, progress = 0, language = 'en', warningLevel = 0, eggStyleId }: EggProps) {
    const isAppActive = useAppStateAnimation();
    const { eggSize } = useResponsive();

    // Size calculations
    const styledEggSize = Math.round(eggSize * 0.85);
    const glowSize = Math.round(styledEggSize * 1.4);
    const innerGlowSize = Math.round(styledEggSize * 1.0);
    const warningGlowSize = Math.round(styledEggSize * 1.5);
    const auraMaxSize = Math.round(styledEggSize * 1.8);
    const containerHeight = Math.round(styledEggSize * 1.25);
    const pulseRingMaxSize = Math.round(styledEggSize * 2.2);
    const shadowWidth = Math.round(styledEggSize * 0.7);
    const shadowOffsetY = Math.round(styledEggSize * 0.55);

    // Get the current egg style
    const currentEggStyle = useMemo(() => {
        if (eggStyleId) {
            const foundStyle = getEggStyleById(eggStyleId);
            if (!foundStyle) {
                console.warn(`[Egg] Invalid egg style ID: "${eggStyleId}". Falling back to default style.`);
                return getDefaultEggStyle();
            }
            return foundStyle;
        }
        return getDefaultEggStyle();
    }, [eggStyleId]);

    // ======================================================================
    // SHARED VALUES — Core egg animations
    // ======================================================================
    const wobble = useSharedValue(0);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const crackLevel = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const glowScale = useSharedValue(1);
    const pulseValue = useSharedValue(0);
    const colorProgress = useSharedValue(0);
    const warningPulse = useSharedValue(0);
    const anxiousShake = useSharedValue(0);

    // ======================================================================
    // SHARED VALUES — Particle & effect animations
    // ======================================================================
    const orbitAngle = useSharedValue(0);          // Drives orbiting particles
    const orbitOpacity = useSharedValue(0);         // Fade in/out orbit particles
    const risingCycle = useSharedValue(0);          // Drives rising particles
    const risingOpacity = useSharedValue(0);        // Fade in/out rising particles
    const auraCycle = useSharedValue(0);            // Drives aura ring expansion
    const auraOpacity = useSharedValue(0);          // Fade in/out aura rings
    const shimmerCycle = useSharedValue(0);         // Drives shimmer sweep
    const idleShimmer = useSharedValue(0);          // Idle state shimmer
    const idleParticleOpacity = useSharedValue(0);  // Idle floating particles

    // ======================================================================
    // SHARED VALUES — Enchanted effects
    // ======================================================================
    const levitation = useSharedValue(0);
    const heartbeatScale = useSharedValue(0);
    const fireflyOpacity = useSharedValue(0);
    const fireflyFall = useSharedValue(0);
    const pulseRingCycle = useSharedValue(0);
    const pulseRingOpacity = useSharedValue(0);
    const emberCycle = useSharedValue(0);
    const emberOpacity = useSharedValue(0);

    // ======================================================================
    // IDLE STATE — Gentle breathing + subtle shimmer
    // ======================================================================
    useEffect(() => {
        if (sessionState === 'idle') {
            opacity.value = withTiming(1, { duration: 300 });

            if (isAppActive) {
                // Gentle wobble
                wobble.value = withRepeat(
                    withSequence(
                        withTiming(-3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                        withTiming(3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                // Asymmetric breathing scale
                scale.value = withSequence(
                    withTiming(1, { duration: 200 }),
                    withRepeat(
                        withSequence(
                            withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                            withTiming(0.97, { duration: 1800, easing: Easing.inOut(Easing.ease) })
                        ),
                        -1,
                        true
                    )
                );

                // Levitation float
                levitation.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );

                // Firefly activation
                fireflyOpacity.value = withTiming(0.6, { duration: 1000 });
                fireflyFall.value = 0;

                // Subtle idle shimmer — slow sweep every 4 seconds
                idleShimmer.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                        withDelay(2500, withTiming(0, { duration: 0 }))
                    ),
                    -1,
                    false
                );

                // Faint ambient particles in idle
                idleParticleOpacity.value = withTiming(0.25, { duration: 800 });
                orbitAngle.value = withRepeat(
                    withTiming(360, { duration: 12000, easing: Easing.linear }),
                    -1,
                    false
                );
            } else {
                scale.value = withTiming(1, { duration: 200 });
                cancelAnimation(wobble);
                idleShimmer.value = 0;
                idleParticleOpacity.value = withTiming(0, { duration: 300 });
                cancelAnimation(levitation);
                levitation.value = 0;
                fireflyOpacity.value = withTiming(0, { duration: 300 });
            }

            // Ambient warm glow that breathes in sync with the egg
            if (isAppActive) {
                glowOpacity.value = withRepeat(
                    withSequence(
                        withTiming(0.12, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.04, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                glowScale.value = withRepeat(
                    withSequence(
                        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.95, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
            } else {
                glowOpacity.value = withTiming(0, { duration: 300 });
                glowScale.value = withTiming(1, { duration: 300 });
            }

            // Reset active-session effects
            crackLevel.value = withTiming(0, { duration: 300 });
            colorProgress.value = withTiming(0, { duration: 300 });
            orbitOpacity.value = withTiming(0, { duration: 400 });
            risingOpacity.value = withTiming(0, { duration: 400 });
            auraOpacity.value = withTiming(0, { duration: 400 });
            pulseRingOpacity.value = withTiming(0, { duration: 400 });
            emberOpacity.value = withTiming(0, { duration: 400 });
            heartbeatScale.value = withTiming(0, { duration: 300 });

            return () => {
                cancelAnimation(wobble);
                cancelAnimation(scale);
                cancelAnimation(idleShimmer);
                cancelAnimation(orbitAngle);
                cancelAnimation(glowOpacity);
                cancelAnimation(glowScale);
                cancelAnimation(levitation);
                cancelAnimation(fireflyOpacity);
            };
        }
    }, [sessionState, isAppActive]);

    // ======================================================================
    // ACTIVE SESSION — Full spectacle
    // ======================================================================
    useEffect(() => {
        if (sessionState === 'active') {
            const intensity = 2 + progress * 10;
            const speed = Math.max(200, 800 - progress * 600);

            // Intensifying wobble
            wobble.value = withRepeat(
                withSequence(
                    withTiming(-intensity, { duration: speed, easing: Easing.inOut(Easing.ease) }),
                    withTiming(intensity, { duration: speed, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Heartbeat pulse
            const pulseSpeed = Math.max(400, 1000 - progress * 600);
            pulseValue.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: pulseSpeed * 0.3, easing: Easing.out(Easing.ease) }),
                    withTiming(0, { duration: pulseSpeed * 0.7, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );

            // Multi-layer glow
            glowOpacity.value = withTiming(progress * 0.85, { duration: 500 });
            glowScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Color warming
            colorProgress.value = withTiming(progress, { duration: 500 });
            crackLevel.value = withTiming(Math.floor(progress * 4), { duration: 300 });

            // === PARTICLE EFFECTS ===

            // Orbiting particles — speed increases with progress
            const orbitSpeed = Math.max(3000, 8000 - progress * 5000);
            orbitAngle.value = withRepeat(
                withTiming(360, { duration: orbitSpeed, easing: Easing.linear }),
                -1,
                false
            );
            orbitOpacity.value = withTiming(
                progress > 0.15 ? Math.min(1, progress * 1.2) : 0,
                { duration: 600 }
            );

            // Rising particles — appear after 20% progress
            if (progress > 0.2) {
                risingCycle.value = withRepeat(
                    withTiming(1, { duration: Math.max(2000, 4000 - progress * 2500), easing: Easing.linear }),
                    -1,
                    false
                );
                risingOpacity.value = withTiming(Math.min(1, (progress - 0.2) * 2), { duration: 500 });
            } else {
                risingOpacity.value = withTiming(0, { duration: 300 });
            }

            // Aura rings — appear after 40% progress
            if (progress > 0.4) {
                auraCycle.value = withRepeat(
                    withTiming(1, { duration: Math.max(1500, 3000 - progress * 1500), easing: Easing.linear }),
                    -1,
                    false
                );
                auraOpacity.value = withTiming(Math.min(0.8, (progress - 0.4) * 2), { duration: 500 });
            } else {
                auraOpacity.value = withTiming(0, { duration: 300 });
            }

            // Shimmer sweep — periodic shimmer during active session
            shimmerCycle.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
                    withDelay(2000 - progress * 1200, withTiming(0, { duration: 0 }))
                ),
                -1,
                false
            );

            // Kill idle effects
            idleShimmer.value = 0;
            idleParticleOpacity.value = withTiming(0, { duration: 200 });

            // === ENCHANTED EFFECTS ===

            // Heartbeat — realistic lub-dub pattern, BPM increases with progress
            const heartbeatBPM = 40 + progress * 60;
            const heartbeatDuration = 60000 / heartbeatBPM;
            heartbeatScale.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: heartbeatDuration * 0.15, easing: Easing.out(Easing.ease) }),
                    withTiming(0.5, { duration: heartbeatDuration * 0.1 }),
                    withTiming(0.8, { duration: heartbeatDuration * 0.1, easing: Easing.out(Easing.ease) }),
                    withTiming(0, { duration: heartbeatDuration * 0.65, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );

            // Firefly brightening
            fireflyOpacity.value = withTiming(0.3 + progress * 0.7, { duration: 500 });

            // Pulse rings at 25%+
            if (progress > 0.25) {
                const pulseSpeed = Math.max(1500, 3500 - progress * 2500);
                pulseRingCycle.value = withRepeat(
                    withTiming(1, { duration: pulseSpeed, easing: Easing.linear }),
                    -1,
                    false
                );
                pulseRingOpacity.value = withTiming(
                    Math.min(0.8, (progress - 0.25) * 1.5),
                    { duration: 600 }
                );
            } else {
                pulseRingOpacity.value = withTiming(0, { duration: 300 });
            }

            // Embers at 50%+
            if (progress > 0.5) {
                const emberSpeed = Math.max(2000, 4000 - progress * 3000);
                emberCycle.value = withRepeat(
                    withTiming(1, { duration: emberSpeed, easing: Easing.linear }),
                    -1,
                    false
                );
                emberOpacity.value = withTiming(
                    Math.min(1, (progress - 0.5) * 2.5),
                    { duration: 500 }
                );
            } else {
                emberOpacity.value = withTiming(0, { duration: 300 });
            }

            // Levitation dampens during active
            levitation.value = withRepeat(
                withSequence(
                    withTiming(Math.max(0.3, 1 - progress * 0.7), { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            return () => {
                cancelAnimation(wobble);
                cancelAnimation(pulseValue);
                cancelAnimation(glowScale);
                cancelAnimation(orbitAngle);
                cancelAnimation(risingCycle);
                cancelAnimation(auraCycle);
                cancelAnimation(shimmerCycle);
                cancelAnimation(heartbeatScale);
                cancelAnimation(pulseRingCycle);
                cancelAnimation(emberCycle);
                cancelAnimation(levitation);
            };
        }
    }, [sessionState, progress]);

    // ======================================================================
    // WARNING ANIMATIONS
    // ======================================================================
    useEffect(() => {
        if (warningLevel > 0 && sessionState === 'active') {
            const shakeIntensity = warningLevel * 4;
            const shakeSpeed = 150 - warningLevel * 30;

            anxiousShake.value = withRepeat(
                withSequence(
                    withTiming(shakeIntensity, { duration: shakeSpeed }),
                    withTiming(-shakeIntensity, { duration: shakeSpeed })
                ),
                -1,
                true
            );

            const wPulseSpeed = 500 - warningLevel * 100;
            warningPulse.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: wPulseSpeed }),
                    withTiming(0.3, { duration: wPulseSpeed })
                ),
                -1,
                true
            );
        } else {
            cancelAnimation(anxiousShake);
            cancelAnimation(warningPulse);
            anxiousShake.value = withTiming(0, { duration: 200 });
            warningPulse.value = withTiming(0, { duration: 200 });
        }
    }, [warningLevel, sessionState]);

    // ======================================================================
    // HATCHING — Dramatic burst with particle explosion
    // ======================================================================
    useEffect(() => {
        if (sessionState === 'completed') {
            cancelAnimation(wobble);
            cancelAnimation(scale);
            cancelAnimation(pulseValue);
            cancelAnimation(shimmerCycle);

            // Intense shaking
            wobble.value = withRepeat(
                withSequence(
                    withTiming(-20, { duration: 40 }),
                    withTiming(20, { duration: 40 })
                ),
                8,
                true
            );

            // Dramatic burst scale
            scale.value = withSequence(
                withTiming(1.1, { duration: 100 }),
                withTiming(1.4, { duration: 200 }),
                withSpring(0, { damping: 15 })
            );

            // Fade out
            opacity.value = withDelay(300, withTiming(0, { duration: 400 }));

            // Full glow burst
            glowOpacity.value = withSequence(
                withTiming(1, { duration: 150 }),
                withDelay(200, withTiming(0, { duration: 300 }))
            );
            glowScale.value = withSequence(
                withTiming(1.5, { duration: 300 }),
                withTiming(2.2, { duration: 200 })
            );

            // Explode particles outward
            orbitOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withDelay(300, withTiming(0, { duration: 400 }))
            );
            risingOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withDelay(200, withTiming(0, { duration: 300 }))
            );

            // Aura burst
            auraOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withTiming(0, { duration: 500 })
            );
            auraCycle.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });

            // === Enchanted effects: cinematic hatch ===

            // Kill levitation — egg should feel planted before explosion
            cancelAnimation(levitation);
            levitation.value = withTiming(0, { duration: 100 });

            // Fireflies flash bright then vanish
            fireflyOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(400, withTiming(0, { duration: 300 }))
            );

            // Pulse rings — one massive burst outward
            pulseRingOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withDelay(200, withTiming(0, { duration: 500 }))
            );
            pulseRingCycle.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

            // Embers — explosive upward burst
            emberOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withDelay(400, withTiming(0, { duration: 400 }))
            );

            // One final massive heartbeat then stop
            heartbeatScale.value = withSequence(
                withTiming(1, { duration: 100 }),
                withTiming(0, { duration: 200 })
            );
        }
    }, [sessionState]);

    // ======================================================================
    // FAILED SESSION — Collapse with particle dissipation
    // ======================================================================
    useEffect(() => {
        if (sessionState === 'failed') {
            cancelAnimation(wobble);
            cancelAnimation(scale);
            cancelAnimation(pulseValue);

            // Sad shake
            wobble.value = withSequence(
                withTiming(-25, { duration: 80 }),
                withTiming(25, { duration: 80 }),
                withTiming(-15, { duration: 80 }),
                withTiming(15, { duration: 80 }),
                withTiming(-5, { duration: 80 }),
                withTiming(0, { duration: 80 })
            );

            // Shrink and drop
            scale.value = withSequence(
                withTiming(1.15, { duration: 150 }),
                withTiming(0.75, { duration: 400, easing: Easing.in(Easing.bounce) })
            );

            opacity.value = withTiming(0.3, { duration: 600 });
            crackLevel.value = withTiming(4, { duration: 150 });
            colorProgress.value = withTiming(-1, { duration: 300 });

            // Kill all particle effects
            orbitOpacity.value = withTiming(0, { duration: 300 });
            risingOpacity.value = withTiming(0, { duration: 300 });
            auraOpacity.value = withTiming(0, { duration: 300 });
            idleParticleOpacity.value = withTiming(0, { duration: 200 });

            // === Enchanted effects: warmth draining sorrow ===

            // Kill levitation — egg becomes heavy
            cancelAnimation(levitation);
            levitation.value = withTiming(0, { duration: 200 });

            // Fireflies extinguish and fall downward (staggered emotional effect)
            fireflyFall.value = withTiming(1, { duration: 1200, easing: Easing.in(Easing.quad) });
            fireflyOpacity.value = withTiming(0, { duration: 1500 });

            // Kill all warm effects immediately
            pulseRingOpacity.value = withTiming(0, { duration: 200 });
            emberOpacity.value = withTiming(0, { duration: 200 });
            heartbeatScale.value = withTiming(0, { duration: 200 });
        }
    }, [sessionState]);

    // ======================================================================
    // ANIMATED STYLES
    // ======================================================================

    const heartbeatEggStyle = useAnimatedStyle(() => {
        const safeOpacity = Math.max(0.01, opacity.value);
        const heartbeat = 1 + heartbeatScale.value * 0.04;
        const safeScale = Math.max(0.1, scale.value * (1 + pulseValue.value * 0.05) * heartbeat);
        return {
            transform: [
                { rotate: `${wobble.value + anxiousShake.value}deg` },
                { scale: safeScale },
            ],
            opacity: safeOpacity,
        };
    });

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: glowScale.value }],
    }));

    const innerGlowStyle = useAnimatedStyle(() => ({
        opacity: pulseValue.value * 0.4 + colorProgress.value * 0.25,
    }));

    const warningGlowStyle = useAnimatedStyle(() => ({
        opacity: warningPulse.value * 0.8,
    }));

    const levitationStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: -levitation.value * 8 },
        ],
    }));

    // ======================================================================
    // HELPER FUNCTIONS
    // ======================================================================

    const getStatusText = () => {
        if (sessionState === 'failed') return t('eggBroken', language);
        if (sessionState === 'active') {
            if (progress < 0.25) return t('focus', language);
            if (progress < 0.5) return t('keepGoing', language);
            if (progress < 0.75) return t('doingGreat', language);
            return t('almostThere', language);
        }
        return '';
    };

    // ======================================================================
    // PARTICLE CONFIGURATION
    // ======================================================================
    // Orbit particles — positioned around the egg in an elliptical ring
    const eggColor = currentEggStyle.primaryColor;
    const eggSecondary = currentEggStyle.secondaryColor || '#FFFFFF';
    const centerX = 0;
    const centerY = 0;
    const orbitRx = styledEggSize * 0.55;
    const orbitRy = styledEggSize * 0.45;

    const orbitParticles = useMemo(() => [
        { phase: 0, size: 6, color: eggColor },
        { phase: 60, size: 4, color: eggSecondary },
        { phase: 120, size: 5, color: eggColor },
        { phase: 180, size: 4, color: eggSecondary },
        { phase: 240, size: 6, color: eggColor },
        { phase: 300, size: 3, color: eggSecondary },
    ], [eggColor, eggSecondary]);

    // Rising particles — emanate from the egg surface
    const risingParticles = useMemo(() => [
        { phase: 0.0, startX: -styledEggSize * 0.15, drift: 8, size: 4, color: eggColor },
        { phase: 0.2, startX: styledEggSize * 0.10, drift: -6, size: 3, color: eggSecondary },
        { phase: 0.4, startX: -styledEggSize * 0.05, drift: 10, size: 5, color: eggColor },
        { phase: 0.55, startX: styledEggSize * 0.20, drift: -8, size: 3, color: eggSecondary },
        { phase: 0.7, startX: -styledEggSize * 0.22, drift: 5, size: 4, color: eggColor },
        { phase: 0.85, startX: styledEggSize * 0.08, drift: -12, size: 3, color: eggSecondary },
    ], [styledEggSize, eggColor, eggSecondary]);

    // Ambient dust motes — lazy drifters for idle state atmosphere
    const dustMotes = useMemo(() => [
        { phase: 30, rx: styledEggSize * 0.65, ry: styledEggSize * 0.55, size: 3, color: eggColor },
        { phase: 140, rx: styledEggSize * 0.50, ry: styledEggSize * 0.60, size: 2.5, color: eggSecondary },
        { phase: 220, rx: styledEggSize * 0.72, ry: styledEggSize * 0.48, size: 2, color: eggColor },
        { phase: 310, rx: styledEggSize * 0.58, ry: styledEggSize * 0.52, size: 3, color: eggSecondary },
    ], [styledEggSize, eggColor, eggSecondary]);

    // ======================================================================
    // RENDER
    // ======================================================================

    return (
        <View
            style={[styles.container, { height: containerHeight }]}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={
                sessionState === 'failed'
                    ? (language === 'tr' ? 'Kırık yumurta' : language === 'es' ? 'Huevo roto' : 'Broken egg')
                    : sessionState === 'completed'
                    ? (language === 'tr' ? 'Çatlayan yumurta' : language === 'es' ? 'Huevo eclosionando' : 'Hatching egg')
                    : (language === 'tr' ? 'Odaklanma yumurtası' : language === 'es' ? 'Huevo de enfoque' : 'Focus egg')
            }
            accessibilityState={{ busy: sessionState === 'active' }}
        >
            {/* === LAYER 0: Ground shadow (sells levitation) === */}
            {sessionState !== 'completed' && (
                <GroundShadow
                    levitationDriver={levitation}
                    baseWidth={shadowWidth}
                    offsetY={shadowOffsetY}
                />
            )}

            {/* === LAYER 1: Aura rings (behind everything) === */}
            {(sessionState === 'active' || sessionState === 'completed') && (
                <View style={styles.auraContainer} pointerEvents="none">
                    <AuraRing
                        driver={auraCycle}
                        phase={0}
                        maxSize={auraMaxSize}
                        color={eggColor}
                        opacityDriver={auraOpacity}
                        thickness={2}
                    />
                    <AuraRing
                        driver={auraCycle}
                        phase={0.33}
                        maxSize={auraMaxSize}
                        color={eggSecondary}
                        opacityDriver={auraOpacity}
                        thickness={1.5}
                    />
                    <AuraRing
                        driver={auraCycle}
                        phase={0.66}
                        maxSize={auraMaxSize}
                        color={eggColor}
                        opacityDriver={auraOpacity}
                        thickness={1}
                    />
                </View>
            )}

            {/* === LAYER 1b: Pulse rings (warm energy waves) === */}
            {(sessionState === 'active' || sessionState === 'completed') && (
                <PulseRings
                    driver={pulseRingCycle}
                    opacityDriver={pulseRingOpacity}
                    maxSize={pulseRingMaxSize}
                    color={eggColor}
                    count={3}
                />
            )}

            {/* === LAYER 2: Outer glow (active: bright, idle: soft ambient) === */}
            {(sessionState === 'idle' || sessionState === 'active' || sessionState === 'completed') && (
                <Animated.View
                    style={[
                        styles.glow,
                        glowStyle,
                        {
                            width: glowSize,
                            height: glowSize,
                            borderRadius: glowSize / 2,
                            backgroundColor: eggColor,
                        }
                    ]}
                    pointerEvents="none"
                />
            )}

            {/* === LAYER 3: Inner glow === */}
            {sessionState === 'active' && (
                <Animated.View
                    style={[
                        styles.innerGlow,
                        innerGlowStyle,
                        {
                            width: innerGlowSize,
                            height: innerGlowSize,
                            borderRadius: innerGlowSize / 2,
                            backgroundColor: eggColor,
                        }
                    ]}
                    pointerEvents="none"
                />
            )}

            {/* === LAYER 4: Warning glow === */}
            {warningLevel > 0 && (
                <Animated.View
                    style={[
                        styles.warningGlow,
                        warningGlowStyle,
                        {
                            width: warningGlowSize,
                            height: warningGlowSize,
                            borderRadius: warningGlowSize / 2,
                            backgroundColor: WARNING_COLORS[warningLevel],
                        }
                    ]}
                    pointerEvents="none"
                />
            )}

            {/* === LAYER 4b: Firefly particles (Ghibli magic) === */}
            {sessionState !== 'completed' && (
                <FireflyParticles
                    driver={orbitAngle}
                    opacityDriver={fireflyOpacity}
                    eggSize={styledEggSize}
                    color={eggColor}
                    secondaryColor={eggSecondary}
                    fallDriver={sessionState === 'failed' ? fireflyFall : undefined}
                />
            )}

            {/* === LAYER 5: Orbiting particles === */}
            <View style={styles.particleLayer} pointerEvents="none">
                {orbitParticles.map((p, i) => (
                    <OrbitParticle
                        key={`orbit-${i}`}
                        driver={orbitAngle}
                        phaseOffset={p.phase}
                        orbitRx={orbitRx}
                        orbitRy={orbitRy}
                        size={p.size}
                        color={p.color}
                        opacityDriver={
                            sessionState === 'active' || sessionState === 'completed'
                                ? orbitOpacity
                                : idleParticleOpacity
                        }
                        cx={centerX}
                        cy={centerY}
                    />
                ))}
            </View>

            {/* === LAYER 5b: Ambient dust motes (idle state) === */}
            {sessionState === 'idle' && (
                <View style={styles.particleLayer} pointerEvents="none">
                    {dustMotes.map((m, i) => (
                        <DustMote
                            key={`dust-${i}`}
                            driver={orbitAngle}
                            opacityDriver={idleParticleOpacity}
                            phase={m.phase}
                            rx={m.rx}
                            ry={m.ry}
                            size={m.size}
                            color={m.color}
                            cx={centerX}
                            cy={centerY}
                        />
                    ))}
                </View>
            )}

            {/* === LAYER 6: Rising particles === */}
            {(sessionState === 'active' || sessionState === 'completed') && (
                <View style={styles.particleLayer} pointerEvents="none">
                    {risingParticles.map((p, i) => (
                        <RisingParticle
                            key={`rise-${i}`}
                            driver={risingCycle}
                            phase={p.phase}
                            startX={p.startX}
                            startY={styledEggSize * 0.2}
                            riseHeight={styledEggSize * 0.9}
                            drift={p.drift}
                            size={p.size}
                            color={p.color}
                            opacityDriver={risingOpacity}
                        />
                    ))}
                </View>
            )}

            {/* === LAYER 6b: Ember particles (campfire sparks) === */}
            {sessionState === 'active' && (
                <EmberParticles
                    driver={emberCycle}
                    opacityDriver={emberOpacity}
                    eggSize={styledEggSize}
                    color={eggColor}
                    secondaryColor={eggSecondary}
                />
            )}

            {/* === LAYER 7: The Egg itself === */}
            <Animated.View style={levitationStyle}>
                <Animated.View style={[styles.eggContainer, heartbeatEggStyle]}>
                    <View style={styles.eggSvgContainer}>
                        <StyledEgg
                            eggStyle={currentEggStyle}
                            size={styledEggSize}
                            showPattern={true}
                            glowColor={eggColor}
                            glowIntensity={
                                sessionState === 'completed' ? 0.8
                                : sessionState === 'failed' ? 0
                                : progress * 0.5
                            }
                            crackProgress={
                                sessionState === 'completed' ? 1.0
                                : sessionState === 'failed' ? 0.85
                                : sessionState === 'active' ? progress
                                : 0
                            }
                        />
                        {/* Shimmer sweep overlay (clipped to egg bounds) */}
                        {sessionState !== 'failed' && (
                            <View style={[
                                styles.shimmerClip,
                                {
                                    width: styledEggSize,
                                    height: styledEggSize * 1.2,
                                }
                            ]}>
                                <ShimmerSweep
                                    driver={sessionState === 'active' ? shimmerCycle : idleShimmer}
                                    eggWidth={styledEggSize}
                                    eggHeight={styledEggSize * 1.2}
                                    color="#FFFFFF"
                                />
                            </View>
                        )}
                        {/* Dim overlay for failed state */}
                        {sessionState === 'failed' && (
                            <View style={[
                                styles.failedOverlay,
                                {
                                    width: styledEggSize,
                                    height: styledEggSize * 1.2,
                                    borderRadius: styledEggSize / 2,
                                },
                            ]} />
                        )}
                    </View>
                </Animated.View>
            </Animated.View>

            {/* === LAYER 8: Status text === */}
            {sessionState === 'failed' && (
                <Animated.Text
                    style={styles.failedText}
                    accessible={true}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                >
                    {t('eggBroken', language)}
                </Animated.Text>
            )}
        </View>
    );
}

// ==========================================================================
// STYLES
// ==========================================================================

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
    },
    innerGlow: {
        position: 'absolute',
    },
    warningGlow: {
        position: 'absolute',
    },
    auraContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    auraRingWrapper: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    auraRing: {
        position: 'absolute',
    },
    particleLayer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitParticle: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    risingParticle: {
        position: 'absolute',
    },
    dustMote: {
        position: 'absolute',
    },
    particleHalo: {
        position: 'absolute',
    },
    particleCore: {
        position: 'absolute',
    },
    eggContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    eggSvgContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shimmerClip: {
        position: 'absolute',
        overflow: 'hidden',
        borderRadius: theme.borderRadius.round,
    },
    shimmerSweep: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    failedOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    failedText: {
        marginTop: theme.spacing.sm,
        fontSize: theme.fontSize.lg,
        color: theme.colors.error,
        fontWeight: theme.fontWeight.bold,
    },
});
