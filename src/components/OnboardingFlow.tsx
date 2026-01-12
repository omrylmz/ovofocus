import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    withSequence,
    withRepeat,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { PixelButton } from './PixelButton';
import { Language, t } from '../i18n/translations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingFlowProps {
    visible: boolean;
    onComplete: () => void;
    language?: Language;
}

interface OnboardingStep {
    icon: string;
    titleKey: string;
    descriptionKey: string;
    animation: 'bounce' | 'pulse' | 'wiggle' | 'float' | 'sparkle';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        icon: '🥚',
        titleKey: 'onboardingWelcomeTitle',
        descriptionKey: 'onboardingWelcomeDesc',
        animation: 'bounce',
    },
    {
        icon: '⏱️',
        titleKey: 'onboardingFocusTitle',
        descriptionKey: 'onboardingFocusDesc',
        animation: 'pulse',
    },
    {
        icon: '🦁',
        titleKey: 'onboardingCollectionTitle',
        descriptionKey: 'onboardingCollectionDesc',
        animation: 'wiggle',
    },
    {
        icon: '🔥',
        titleKey: 'onboardingStreakTitle',
        descriptionKey: 'onboardingStreakDesc',
        animation: 'float',
    },
    {
        icon: '👆',
        titleKey: 'onboardingGesturesTitle',
        descriptionKey: 'onboardingGesturesDesc',
        animation: 'sparkle',
    },
];

// Animated icon component
function AnimatedIcon({ icon, animation }: { icon: string; animation: string }) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        switch (animation) {
            case 'bounce':
                // Gentler bounce with higher damping to prevent excessive shaking
                scale.value = withRepeat(
                    withSequence(
                        withSpring(1.08, { damping: 12, stiffness: 100 }),
                        withSpring(1, { damping: 12, stiffness: 100 })
                    ),
                    -1,
                    true
                );
                break;
            case 'pulse':
                // Smoother, slower pulse
                scale.value = withRepeat(
                    withSequence(
                        withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                break;
            case 'wiggle':
                // Much gentler wiggle - reduced rotation and longer duration
                rotation.value = withRepeat(
                    withSequence(
                        withTiming(-5, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                        withTiming(5, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                        withTiming(-3, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                        withDelay(800, withTiming(0, { duration: 0 }))
                    ),
                    -1,
                    false
                );
                break;
            case 'float':
                // Gentler floating motion
                translateY.value = withRepeat(
                    withSequence(
                        withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                break;
            case 'sparkle':
                // Subtler sparkle effect
                opacity.value = withRepeat(
                    withSequence(
                        withTiming(0.7, { duration: 400 }),
                        withTiming(1, { duration: 400 })
                    ),
                    -1,
                    true
                );
                scale.value = withRepeat(
                    withSequence(
                        withTiming(1.05, { duration: 800 }),
                        withTiming(1, { duration: 800 })
                    ),
                    -1,
                    true
                );
                break;
        }
    }, [animation]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
            { translateY: translateY.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.Text style={[styles.stepIcon, animatedStyle]}>
            {icon}
        </Animated.Text>
    );
}

// Progress dots component
function ProgressDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <View style={styles.dotsContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dot,
                        index === currentStep && styles.activeDot,
                        index < currentStep && styles.completedDot,
                    ]}
                />
            ))}
        </View>
    );
}

export function OnboardingFlow({
    visible,
    onComplete,
    language = 'en'
}: OnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    // Animation values
    const backgroundOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(50);
    const slideOffset = useSharedValue(0);

    useEffect(() => {
        if (visible && !isExiting) {
            backgroundOpacity.value = withTiming(1, { duration: 400 });
            contentOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
            contentTranslateY.value = withDelay(200, withSpring(0, { damping: 12 }));
        } else if (!visible) {
            backgroundOpacity.value = 0;
            contentOpacity.value = 0;
            contentTranslateY.value = 50;
            setCurrentStep(0);
            setIsExiting(false);
        }
    }, [visible, isExiting]);

    const exitOnboarding = () => {
        if (isExiting) return; // Prevent double-trigger
        setIsExiting(true);

        // Fade out first
        backgroundOpacity.value = withTiming(0, { duration: 250 });
        contentOpacity.value = withTiming(0, { duration: 200 });

        // Then call onComplete after animation
        setTimeout(() => {
            onComplete();
        }, 260);
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (currentStep < ONBOARDING_STEPS.length - 1) {
            // Animate out current step
            slideOffset.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
                // Reset and animate in next step
                slideOffset.value = SCREEN_WIDTH;
            });

            setTimeout(() => {
                setCurrentStep(currentStep + 1);
                slideOffset.value = withSpring(0, { damping: 15 });
            }, 200);
        } else {
            // Complete onboarding
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            exitOnboarding();
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        exitOnboarding();
    };

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [
            { translateY: contentTranslateY.value },
            { translateX: slideOffset.value },
        ],
    }));

    // Don't return null while exiting (fade animation in progress)
    if (!visible && !isExiting) return null;

    const step = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

    return (
        <Animated.View style={[styles.overlay, backgroundStyle]} pointerEvents="none">
            <Animated.View style={[styles.content, contentStyle]} pointerEvents="auto">
                {/* Skip button */}
                {!isLastStep && (
                    <View style={styles.skipContainer}>
                        <PixelButton
                            title={t('skip', language)}
                            onPress={handleSkip}
                            variant="ghost"
                            size="small"
                        />
                    </View>
                )}

                {/* Icon */}
                <View style={styles.iconContainer}>
                    <AnimatedIcon icon={step.icon} animation={step.animation} />
                </View>

                {/* Title */}
                <Text style={styles.title}>
                    {t(step.titleKey as any, language)}
                </Text>

                {/* Description */}
                <Text style={styles.description}>
                    {t(step.descriptionKey as any, language)}
                </Text>

                {/* Progress dots */}
                <ProgressDots currentStep={currentStep} totalSteps={ONBOARDING_STEPS.length} />

                {/* Next/Start button */}
                <View style={styles.buttonContainer}>
                    <PixelButton
                        title={isLastStep ? t('letsStart', language) : t('next', language)}
                        onPress={handleNext}
                        variant="primary"
                        size="large"
                        icon={isLastStep ? '🚀' : '➡️'}
                    />
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(26, 26, 46, 0.98)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        width: '100%',
    },
    skipContainer: {
        position: 'absolute',
        top: -80,
        right: 0,
    },
    iconContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    stepIcon: {
        fontSize: 80,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    description: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.xl,
        maxWidth: 300,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.xl,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.surfaceLight,
        marginHorizontal: 6,
    },
    activeDot: {
        backgroundColor: theme.colors.primary,
        width: 24,
    },
    completedDot: {
        backgroundColor: theme.colors.secondary,
    },
    buttonContainer: {
        marginTop: theme.spacing.lg,
    },
});
