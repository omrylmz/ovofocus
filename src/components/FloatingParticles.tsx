import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type ParticleVariant = 'session' | 'collection';

interface FloatingParticlesProps {
    count?: number;
    isActive?: boolean;
    progress?: number;
    variant?: ParticleVariant;
}

// Particle colors by variant
const PARTICLE_COLORS = {
    session: 'rgba(255, 230, 109, 0.6)',    // Golden/accent
    collection: 'rgba(78, 205, 196, 0.5)',   // Teal
};

interface Particle {
    id: number;
    initialX: number;
    initialY: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
}

function FloatingParticle({ particle, isActive, color }: { particle: Particle; isActive: boolean; color: string }) {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(particle.opacity);

    useEffect(() => {
        const floatDuration = particle.duration;

        translateY.value = withDelay(
            particle.delay,
            withRepeat(
                withTiming(-height * 0.3, { duration: floatDuration, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            )
        );

        translateX.value = withDelay(
            particle.delay,
            withRepeat(
                withTiming(20 - Math.random() * 40, { duration: floatDuration * 0.7, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            )
        );

        scale.value = withDelay(
            particle.delay,
            withRepeat(
                withTiming(1.3, { duration: floatDuration * 0.5, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            )
        );

        opacity.value = withTiming(isActive ? particle.opacity * 1.5 : particle.opacity, { duration: 500 });
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    left: particle.initialX,
                    top: particle.initialY,
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                    backgroundColor: color,
                },
                animatedStyle,
            ]}
        />
    );
}

export function FloatingParticles({ count = 15, isActive = false, progress = 0, variant = 'session' }: FloatingParticlesProps) {
    // Get particle color based on variant
    const particleColor = PARTICLE_COLORS[variant];

    // Generate particles with random positions and properties
    const particles = useMemo<Particle[]>(() => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            initialX: Math.random() * width,
            initialY: height * 0.3 + Math.random() * height * 0.6,
            size: 3 + Math.random() * 5,
            duration: 6000 + Math.random() * 4000,
            delay: Math.random() * 2000,
            opacity: 0.1 + Math.random() * 0.2,
        }));
    }, [count]);

    // Show more particles based on progress (collection shows all)
    const visibleCount = variant === 'collection'
        ? count
        : Math.floor(count * 0.4 + count * 0.6 * progress);

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.slice(0, visibleCount).map(particle => (
                <FloatingParticle
                    key={particle.id}
                    particle={particle}
                    isActive={isActive}
                    color={particleColor}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    particle: {
        position: 'absolute',
        // backgroundColor is set dynamically via color prop
    },
});
