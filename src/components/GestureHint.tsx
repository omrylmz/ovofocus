import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withDelay,
    withRepeat,
    withSpring,
    Easing,
    FadeIn,
    FadeOut,
    SlideInDown,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { Language, t, TranslationKey } from '../i18n/translations';

interface GestureHintProps {
    visible: boolean;
    onDismiss: () => void;
    language: Language;
    variant?: 'full' | 'compact'; // full = modal overlay, compact = inline hint
}

interface AnimatedHintItemProps {
    icon: string;
    text: string;
    delay: number;
    animationType: 'tap' | 'double' | 'hold';
}

// Static hint data moved to module scope for stable reference
const GESTURE_HINTS = [
    {
        icon: '👆',
        textKey: 'gestureHintTap' as TranslationKey,
        animationType: 'tap' as const,
    },
    {
        icon: '👆👆',
        textKey: 'gestureHintDoubleTap' as TranslationKey,
        animationType: 'double' as const,
    },
    {
        icon: '👇',
        textKey: 'gestureHintLongPress' as TranslationKey,
        animationType: 'hold' as const,
    },
] as const;

const AnimatedHintItem = React.memo(function AnimatedHintItem({ icon, text, delay, animationType }: AnimatedHintItemProps) {
    const iconScale = useSharedValue(1);
    const iconRotation = useSharedValue(0);
    const glowOpacity = useSharedValue(0);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- Shared values are stable refs
    useEffect(() => {
        // Different animations based on gesture type
        if (animationType === 'tap') {
            // Single pulse animation
            iconScale.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withSpring(1.2, { damping: 8 }),
                        withSpring(1, { damping: 12 })
                    ),
                    -1,
                    false
                )
            );
        } else if (animationType === 'double') {
            // Double pulse animation
            iconScale.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withSpring(1.15, { damping: 10 }),
                        withSpring(1, { damping: 15 }),
                        withDelay(100, withSpring(1.15, { damping: 10 })),
                        withSpring(1, { damping: 15 }),
                        withDelay(800, withTiming(1))
                    ),
                    -1,
                    false
                )
            );
        } else if (animationType === 'hold') {
            // Press and hold animation
            iconScale.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(0.85, { duration: 400, easing: Easing.out(Easing.ease) }),
                        withDelay(600, withSpring(1, { damping: 8 })),
                        withDelay(400, withTiming(1))
                    ),
                    -1,
                    false
                )
            );
            // Glow effect for hold
            glowOpacity.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(0, { duration: 400 }),
                        withTiming(0.6, { duration: 600 }),
                        withTiming(0, { duration: 400 }),
                        withDelay(400, withTiming(0))
                    ),
                    -1,
                    false
                )
            );
        }
    }, [delay, animationType]);

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value },
            { rotate: `${iconRotation.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <Animated.View
            entering={SlideInDown.delay(delay).springify().damping(15)}
            style={styles.hintItem}
        >
            <View style={styles.iconContainer}>
                <Animated.View style={[styles.iconGlow, glowStyle]} />
                <Animated.Text style={[styles.hintIcon, iconAnimatedStyle]}>
                    {icon}
                </Animated.Text>
            </View>
            <Text style={styles.hintText}>{text}</Text>
        </Animated.View>
    );
});

function GestureHintComponent({ visible, onDismiss, language, variant = 'full' }: GestureHintProps) {
    const titleScale = useSharedValue(0.8);
    const titleOpacity = useSharedValue(0);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- Shared values are stable refs
    useEffect(() => {
        if (visible) {
            titleScale.value = withSpring(1, { damping: 12, stiffness: 200 });
            titleOpacity.value = withTiming(1, { duration: 300 });
        }
    }, [visible]);

    const titleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: titleScale.value }],
        opacity: titleOpacity.value,
    }));

    // Use module-scoped GESTURE_HINTS for stable reference

    if (!visible) return null;

    if (variant === 'compact') {
        return (
            <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                style={styles.compactContainer}
            >
                <Text style={styles.compactText}>
                    {language === 'tr' ? 'Yumurtaya dokunarak etkileşime geç!' :
                     language === 'es' ? 'Toca el huevo para interactuar!' :
                     'Tap the egg to interact!'}
                </Text>
                <Text style={styles.compactHintText}>
                    👆 {t('gestureHintTap', language)}
                </Text>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.overlay}
        >
            <Pressable style={styles.backdropPressable} onPress={onDismiss}>
                <Animated.View style={styles.contentContainer}>
                    <Animated.View style={[styles.titleContainer, titleStyle]}>
                        <Text style={styles.titleIcon}>💡</Text>
                        <Text style={styles.title}>
                            {language === 'tr' ? 'Yumurta İpuçları' :
                             language === 'es' ? 'Consejos del Huevo' :
                             'Egg Tips'}
                        </Text>
                    </Animated.View>

                    <View style={styles.hintsContainer}>
                        {GESTURE_HINTS.map((hint, index) => (
                            <AnimatedHintItem
                                key={hint.textKey}
                                icon={hint.icon}
                                text={t(hint.textKey, language)}
                                delay={index * 150}
                                animationType={hint.animationType}
                            />
                        ))}
                    </View>

                    <Animated.View
                        entering={FadeIn.delay(500).duration(300)}
                        style={styles.dismissHint}
                    >
                        <Text style={styles.dismissText}>
                            {language === 'tr' ? 'Kapatmak için dokun' :
                             language === 'es' ? 'Toca para cerrar' :
                             'Tap anywhere to close'}
                        </Text>
                    </Animated.View>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

// Inline hint bubble that can appear near the egg
interface InlineHintProps {
    visible: boolean;
    message: string;
    position?: 'top' | 'bottom';
}

function InlineHintComponent({ visible, message, position = 'bottom' }: InlineHintProps) {
    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeIn.duration(200).springify()}
            exiting={FadeOut.duration(150)}
            style={[
                styles.inlineHint,
                position === 'top' ? styles.inlineHintTop : styles.inlineHintBottom,
            ]}
        >
            <View style={styles.inlineHintBubble}>
                <Text style={styles.inlineHintText}>{message}</Text>
            </View>
            <View style={[
                styles.inlineHintArrow,
                position === 'top' ? styles.arrowBottom : styles.arrowTop,
            ]} />
        </Animated.View>
    );
}

// Export memoized components to prevent unnecessary re-renders
GestureHintComponent.displayName = 'GestureHint';
InlineHintComponent.displayName = 'InlineHint';
export const GestureHint = React.memo(GestureHintComponent);
export const InlineHint = React.memo(InlineHintComponent);

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: theme.zIndex.modal,
    },
    backdropPressable: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        marginHorizontal: theme.spacing.xl,
        alignItems: 'center',
        maxWidth: 340,
        ...theme.shadows.large,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    titleIcon: {
        fontSize: 28,
        marginRight: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    hintsContainer: {
        width: '100%',
    },
    hintItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    iconGlow: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.accent,
    },
    hintIcon: {
        fontSize: 24,
    },
    hintText: {
        flex: 1,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        lineHeight: 22,
    },
    dismissHint: {
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.surfaceLight,
    },
    dismissText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Compact variant styles
    compactContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.lg,
        ...theme.shadows.medium,
    },
    compactText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    compactHintText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Inline hint styles
    inlineHint: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: theme.zIndex.tooltip,
    },
    inlineHintTop: {
        bottom: '100%',
        marginBottom: theme.spacing.sm,
    },
    inlineHintBottom: {
        top: '100%',
        marginTop: theme.spacing.sm,
    },
    inlineHintBubble: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.small,
    },
    inlineHintText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.background,
    },
    inlineHintArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    arrowTop: {
        borderBottomWidth: 8,
        borderBottomColor: theme.colors.accent,
    },
    arrowBottom: {
        borderTopWidth: 8,
        borderTopColor: theme.colors.accent,
    },
});
