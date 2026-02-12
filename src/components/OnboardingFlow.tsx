import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    withSequence,
    withRepeat,
    Easing,
    cancelAnimation,
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

// Step type with enhanced properties
interface OnboardingStep {
    id: string;
    icon: string;
    titleKey: string;
    descriptionKey: string;
    animation: 'bounce' | 'pulse' | 'wiggle' | 'float' | 'sparkle' | 'shake' | 'glow';
    secondaryIcons?: string[];
    highlightColor?: string;
    previewType?: 'collection' | 'settings' | 'gestures' | 'timer' | 'none';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 'welcome',
        icon: '🥚',
        titleKey: 'onboardingWelcomeTitle',
        descriptionKey: 'onboardingWelcomeDesc',
        animation: 'bounce',
        secondaryIcons: ['✨', '🎉', '💫'],
        highlightColor: theme.colors.accent,
        previewType: 'none',
    },
    {
        id: 'focus',
        icon: '⏱️',
        titleKey: 'onboardingFocusTitle',
        descriptionKey: 'onboardingFocusDesc',
        animation: 'pulse',
        secondaryIcons: ['🎯', '💪', '🔥'],
        highlightColor: theme.colors.primary,
        previewType: 'timer',
    },
    {
        id: 'gestures',
        icon: '👆',
        titleKey: 'onboardingGesturesTitle',
        descriptionKey: 'onboardingGesturesDesc',
        animation: 'shake',
        secondaryIcons: ['👆', '👆👆', '✋'],
        highlightColor: theme.colors.secondary,
        previewType: 'gestures',
    },
    {
        id: 'collection',
        icon: '🦁',
        titleKey: 'onboardingCollectionTitle',
        descriptionKey: 'onboardingCollectionDesc',
        animation: 'wiggle',
        secondaryIcons: ['🐰', '🦊', '🐼', '🦄'],
        highlightColor: theme.colors.epic,
        previewType: 'collection',
    },
    {
        id: 'streak',
        icon: '🔥',
        titleKey: 'onboardingStreakTitle',
        descriptionKey: 'onboardingStreakDesc',
        animation: 'glow',
        secondaryIcons: ['⭐', '🏆', '👑'],
        highlightColor: theme.colors.legendary,
        previewType: 'settings',
    },
];

// Animated icon component with multiple animation types
function AnimatedIcon({ icon, animation, highlightColor }: { icon: string; animation: string; highlightColor?: string }) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        // Reset all values first
        scale.value = 1;
        rotation.value = 0;
        translateY.value = 0;
        opacity.value = 1;
        glowOpacity.value = 0;

        switch (animation) {
            case 'bounce':
                scale.value = withRepeat(
                    withSequence(
                        withSpring(1.12, { damping: 10, stiffness: 100 }),
                        withSpring(1, { damping: 10, stiffness: 100 })
                    ),
                    -1,
                    true
                );
                break;
            case 'pulse':
                scale.value = withRepeat(
                    withSequence(
                        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                break;
            case 'wiggle':
                rotation.value = withRepeat(
                    withSequence(
                        withTiming(-8, { duration: 200, easing: Easing.inOut(Easing.ease) }),
                        withTiming(8, { duration: 200, easing: Easing.inOut(Easing.ease) }),
                        withTiming(-4, { duration: 200, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
                        withDelay(600, withTiming(0, { duration: 0 }))
                    ),
                    -1,
                    false
                );
                break;
            case 'float':
                translateY.value = withRepeat(
                    withSequence(
                        withTiming(-12, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                break;
            case 'sparkle':
                opacity.value = withRepeat(
                    withSequence(
                        withTiming(0.6, { duration: 300 }),
                        withTiming(1, { duration: 300 })
                    ),
                    -1,
                    true
                );
                scale.value = withRepeat(
                    withSequence(
                        withTiming(1.08, { duration: 600 }),
                        withTiming(1, { duration: 600 })
                    ),
                    -1,
                    true
                );
                break;
            case 'shake':
                translateY.value = withRepeat(
                    withSequence(
                        withTiming(-5, { duration: 150, easing: Easing.inOut(Easing.ease) }),
                        withTiming(5, { duration: 150, easing: Easing.inOut(Easing.ease) }),
                        withTiming(-3, { duration: 150, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) }),
                        withDelay(1000, withTiming(0, { duration: 0 }))
                    ),
                    -1,
                    false
                );
                break;
            case 'glow':
                glowOpacity.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                scale.value = withRepeat(
                    withSequence(
                        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
                break;
        }

        return () => {
            cancelAnimation(scale);
            cancelAnimation(rotation);
            cancelAnimation(translateY);
            cancelAnimation(opacity);
            cancelAnimation(glowOpacity);
        };
    }, [animation, scale, rotation, translateY, opacity, glowOpacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
            { translateY: translateY.value },
        ],
        opacity: opacity.value,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <View style={styles.iconWrapper}>
            {animation === 'glow' && highlightColor && (
                <Animated.View
                    style={[
                        styles.glowEffect,
                        { backgroundColor: highlightColor },
                        glowStyle,
                    ]}
                />
            )}
            <Animated.Text style={[styles.stepIcon, animatedStyle]}>
                {icon}
            </Animated.Text>
        </View>
    );
}

// Secondary floating icons around the main icon
function FloatingSecondaryIcons({ icons, isActive }: { icons: string[]; isActive: boolean }) {
    const positions = [
        { x: -60, y: -40, delay: 0 },
        { x: 60, y: -30, delay: 100 },
        { x: -50, y: 50, delay: 200 },
        { x: 55, y: 45, delay: 300 },
    ];

    return (
        <>
            {icons.slice(0, 4).map((icon, index) => (
                <FloatingIcon
                    key={index}
                    icon={icon}
                    position={positions[index]}
                    isActive={isActive}
                />
            ))}
        </>
    );
}

function FloatingIcon({ icon, position, isActive }: { icon: string; position: { x: number; y: number; delay: number }; isActive: boolean }) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(0.5);

    useEffect(() => {
        if (isActive) {
            opacity.value = withDelay(position.delay + 300, withTiming(0.7, { duration: 400 }));
            scale.value = withDelay(position.delay + 300, withSpring(1, { damping: 12 }));
            translateY.value = withDelay(
                position.delay + 300,
                withRepeat(
                    withSequence(
                        withTiming(-8, { duration: 1500 + Math.random() * 500, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 1500 + Math.random() * 500, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                )
            );
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(0.5, { duration: 200 });
        }
    }, [isActive, opacity, translateY, scale, position.delay]);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <Animated.Text
            style={[
                styles.floatingIcon,
                { left: SCREEN_WIDTH / 2 + position.x - 15, top: position.y + 60 },
                style,
            ]}
        >
            {icon}
        </Animated.Text>
    );
}

// Progress dots component with animations
function ProgressDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <View style={styles.dotsContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
                <AnimatedDot
                    key={index}
                    index={index}
                    currentStep={currentStep}
                    isActive={index === currentStep}
                    isCompleted={index < currentStep}
                />
            ))}
        </View>
    );
}

function AnimatedDot({ isActive, isCompleted }: { index: number; currentStep: number; isActive: boolean; isCompleted: boolean }) {
    const width = useSharedValue(10);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (isActive) {
            width.value = withSpring(28, { damping: 15 });
            scale.value = withSequence(
                withSpring(1.2, { damping: 10 }),
                withSpring(1, { damping: 15 })
            );
        } else if (isCompleted) {
            width.value = withSpring(10, { damping: 15 });
        } else {
            width.value = withSpring(10, { damping: 15 });
        }
    }, [isActive, isCompleted, width, scale]);

    const style = useAnimatedStyle(() => ({
        width: width.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            style={[
                styles.dot,
                isActive && styles.activeDot,
                isCompleted && styles.completedDot,
                style,
            ]}
        />
    );
}

// Timer preview component
function TimerPreview({ isActive }: { isActive: boolean }) {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const timerValue = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
            scale.value = withDelay(400, withSpring(1, { damping: 12 }));
            // Animate timer counting up
            timerValue.value = withDelay(600, withTiming(25, { duration: 2000 }));
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(0.8, { duration: 200 });
            timerValue.value = 0;
        }
    }, [isActive, opacity, scale, timerValue]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.previewContainer, containerStyle]}>
            <View style={styles.timerPreview}>
                <Text style={styles.timerPreviewText}>25:00</Text>
                <View style={styles.timerProgressBar}>
                    <View style={[styles.timerProgressFill, { width: '40%' }]} />
                </View>
            </View>
        </Animated.View>
    );
}

// Gesture preview component
function GesturePreview({ isActive }: { isActive: boolean }) {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const tapScale = useSharedValue(1);
    const tapOpacity = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
            scale.value = withDelay(400, withSpring(1, { damping: 12 }));
            // Animate tap indicator
            tapOpacity.value = withDelay(
                800,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 200 }),
                        withTiming(0, { duration: 200 }),
                        withDelay(1000, withTiming(0, { duration: 0 }))
                    ),
                    -1,
                    false
                )
            );
            tapScale.value = withDelay(
                800,
                withRepeat(
                    withSequence(
                        withSpring(0.9, { damping: 15 }),
                        withSpring(1, { damping: 15 }),
                        withDelay(1000, withTiming(1, { duration: 0 }))
                    ),
                    -1,
                    false
                )
            );
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(0.8, { duration: 200 });
            tapOpacity.value = 0;
            tapScale.value = 1;
        }
    }, [isActive, opacity, scale, tapScale, tapOpacity]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    const eggStyle = useAnimatedStyle(() => ({
        transform: [{ scale: tapScale.value }],
    }));

    const tapIndicatorStyle = useAnimatedStyle(() => ({
        opacity: tapOpacity.value,
    }));

    return (
        <Animated.View style={[styles.previewContainer, containerStyle]}>
            <View style={styles.gesturePreview}>
                <View style={styles.gestureRow}>
                    <View style={styles.gestureItem}>
                        <Text style={styles.gestureEmoji}>👆</Text>
                        <Text style={styles.gestureLabel}>Tap</Text>
                    </View>
                    <View style={styles.gestureItem}>
                        <Text style={styles.gestureEmoji}>👆👆</Text>
                        <Text style={styles.gestureLabel}>Double</Text>
                    </View>
                    <View style={styles.gestureItem}>
                        <Text style={styles.gestureEmoji}>✋</Text>
                        <Text style={styles.gestureLabel}>Hold</Text>
                    </View>
                </View>
                <View style={styles.gestureEggContainer}>
                    <Animated.Text style={[styles.gestureEgg, eggStyle]}>🥚</Animated.Text>
                    <Animated.View style={[styles.tapIndicator, tapIndicatorStyle]} />
                </View>
            </View>
        </Animated.View>
    );
}

// Collection preview component
function CollectionPreview({ isActive }: { isActive: boolean }) {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    const animals = [
        { emoji: '🐰', rarity: 'common', color: theme.colors.common },
        { emoji: '🦊', rarity: 'rare', color: theme.colors.rare },
        { emoji: '🦁', rarity: 'epic', color: theme.colors.epic },
        { emoji: '🦄', rarity: 'legendary', color: theme.colors.legendary },
    ];

    useEffect(() => {
        if (isActive) {
            opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
            scale.value = withDelay(400, withSpring(1, { damping: 12 }));
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(0.8, { duration: 200 });
        }
    }, [isActive, opacity, scale]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.previewContainer, containerStyle]}>
            <View style={styles.collectionPreview}>
                {animals.map((animal, index) => (
                    <CollectionAnimalCard
                        key={`emoji-${animal.emoji}-${animal.rarity}`}
                        emoji={animal.emoji}
                        color={animal.color}
                        delay={index * 100}
                        isActive={isActive}
                    />
                ))}
            </View>
        </Animated.View>
    );
}

function CollectionAnimalCard({ emoji, color, delay, isActive }: { emoji: string; color: string; delay: number; isActive: boolean }) {
    const cardScale = useSharedValue(0);
    const cardRotation = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            cardScale.value = withDelay(500 + delay, withSpring(1, { damping: 10 }));
            cardRotation.value = withDelay(
                500 + delay,
                withSequence(
                    withTiming(-5, { duration: 100 }),
                    withTiming(5, { duration: 100 }),
                    withTiming(0, { duration: 100 })
                )
            );
        } else {
            cardScale.value = withTiming(0, { duration: 200 });
            cardRotation.value = 0;
        }
    }, [isActive, cardScale, cardRotation, delay]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { scale: cardScale.value },
            { rotate: `${cardRotation.value}deg` },
        ],
    }));

    return (
        <Animated.View style={[styles.animalCard, { borderColor: color }, style]}>
            <Text style={styles.animalCardEmoji}>{emoji}</Text>
            <View style={[styles.rarityIndicator, { backgroundColor: color }]} />
        </Animated.View>
    );
}

// Settings preview component
function SettingsPreview({ isActive }: { isActive: boolean }) {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    useEffect(() => {
        if (isActive) {
            opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
            scale.value = withDelay(400, withSpring(1, { damping: 12 }));
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(0.8, { duration: 200 });
        }
    }, [isActive, opacity, scale]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.previewContainer, containerStyle]}>
            <View style={styles.settingsPreview}>
                <View style={styles.streakDisplay}>
                    <Text style={styles.streakNumber}>7</Text>
                    <Text style={styles.streakLabel}>Day Streak</Text>
                </View>
                <View style={styles.rewardIcons}>
                    <Text style={styles.rewardIcon}>⭐</Text>
                    <Text style={styles.rewardIcon}>🏆</Text>
                    <Text style={styles.rewardIcon}>👑</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// Render preview based on step type
function StepPreview({ previewType, isActive }: { previewType?: string; isActive: boolean }) {
    switch (previewType) {
        case 'timer':
            return <TimerPreview isActive={isActive} />;
        case 'gestures':
            return <GesturePreview isActive={isActive} />;
        case 'collection':
            return <CollectionPreview isActive={isActive} />;
        case 'settings':
            return <SettingsPreview isActive={isActive} />;
        default:
            return null;
    }
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
    const stepFade = useSharedValue(1);

    // Title and description animations
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(20);
    const descOpacity = useSharedValue(0);
    const descTranslateY = useSharedValue(15);

    const animateStepContent = useCallback(() => {
        titleOpacity.value = 0;
        titleTranslateY.value = 20;
        descOpacity.value = 0;
        descTranslateY.value = 15;

        titleOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
        titleTranslateY.value = withDelay(200, withSpring(0, { damping: 12 }));
        descOpacity.value = withDelay(350, withTiming(1, { duration: 300 }));
        descTranslateY.value = withDelay(350, withSpring(0, { damping: 12 }));
    }, [titleOpacity, titleTranslateY, descOpacity, descTranslateY]);

    useEffect(() => {
        if (visible && !isExiting) {
            backgroundOpacity.value = withTiming(1, { duration: 400 });
            contentOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
            contentTranslateY.value = withDelay(200, withSpring(0, { damping: 12 }));
            animateStepContent();
        } else if (!visible) {
            backgroundOpacity.value = 0;
            contentOpacity.value = 0;
            contentTranslateY.value = 50;
            setCurrentStep(0);
            setIsExiting(false);
            slideOffset.value = 0;
            stepFade.value = 1;
        }
    }, [visible, isExiting, backgroundOpacity, contentOpacity, contentTranslateY, slideOffset, stepFade, animateStepContent]);

    const exitOnboarding = useCallback(() => {
        if (isExiting) return;
        setIsExiting(true);

        backgroundOpacity.value = withTiming(0, { duration: 250 });
        contentOpacity.value = withTiming(0, { duration: 200 });

        setTimeout(() => {
            onComplete();
        }, 260);
    }, [isExiting, backgroundOpacity, contentOpacity, onComplete]);

    const handleNext = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (currentStep < ONBOARDING_STEPS.length - 1) {
            // Fade out current content
            stepFade.value = withTiming(0, { duration: 150 });
            slideOffset.value = withTiming(-SCREEN_WIDTH * 0.3, { duration: 200 });

            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
                slideOffset.value = SCREEN_WIDTH * 0.3;
                stepFade.value = 0;

                // Animate in new content
                slideOffset.value = withSpring(0, { damping: 15, stiffness: 100 });
                stepFade.value = withTiming(1, { duration: 200 });
                animateStepContent();
            }, 200);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            exitOnboarding();
        }
    }, [currentStep, slideOffset, stepFade, animateStepContent, exitOnboarding]);

    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            stepFade.value = withTiming(0, { duration: 150 });
            slideOffset.value = withTiming(SCREEN_WIDTH * 0.3, { duration: 200 });

            setTimeout(() => {
                setCurrentStep(prev => prev - 1);
                slideOffset.value = -SCREEN_WIDTH * 0.3;
                stepFade.value = 0;

                slideOffset.value = withSpring(0, { damping: 15, stiffness: 100 });
                stepFade.value = withTiming(1, { duration: 200 });
                animateStepContent();
            }, 200);
        }
    }, [currentStep, slideOffset, stepFade, animateStepContent]);

    const handleSkip = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        exitOnboarding();
    }, [exitOnboarding]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [
            { translateY: contentTranslateY.value },
        ],
    }));

    const stepContentStyle = useAnimatedStyle(() => ({
        opacity: stepFade.value,
        transform: [
            { translateX: slideOffset.value },
        ],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const descStyle = useAnimatedStyle(() => ({
        opacity: descOpacity.value,
        transform: [{ translateY: descTranslateY.value }],
    }));

    if (!visible && !isExiting) return null;

    const step = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    return (
        <Animated.View style={[styles.overlay, backgroundStyle]} pointerEvents="auto">
            <Animated.View style={[styles.content, contentStyle]}>
                {/* Header with skip button */}
                <View style={styles.header}>
                    {!isLastStep ? (
                        <Pressable onPress={handleSkip} style={styles.skipButton}>
                            <Text style={styles.skipText}>{t('skip', language)}</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.skipButton} />
                    )}
                    <Text style={styles.stepCounter}>
                        {currentStep + 1} / {ONBOARDING_STEPS.length}
                    </Text>
                </View>

                {/* Animated step content */}
                <Animated.View style={[styles.stepContent, stepContentStyle]}>
                    {/* Secondary floating icons */}
                    {step.secondaryIcons && (
                        <FloatingSecondaryIcons
                            icons={step.secondaryIcons}
                            isActive={true}
                        />
                    )}

                    {/* Main icon */}
                    <View style={styles.iconContainer}>
                        <AnimatedIcon
                            icon={step.icon}
                            animation={step.animation}
                            highlightColor={step.highlightColor}
                        />
                    </View>

                    {/* Title */}
                    <Animated.Text style={[styles.title, titleStyle]}>
                        {t(step.titleKey as any, language)}
                    </Animated.Text>

                    {/* Description */}
                    <Animated.Text style={[styles.description, descStyle]}>
                        {t(step.descriptionKey as any, language)}
                    </Animated.Text>

                    {/* Preview section */}
                    <StepPreview previewType={step.previewType} isActive={true} />
                </Animated.View>

                {/* Progress dots */}
                <ProgressDots currentStep={currentStep} totalSteps={ONBOARDING_STEPS.length} />

                {/* Navigation buttons */}
                <View style={styles.buttonRow}>
                    {!isFirstStep && (
                        <Pressable onPress={handleBack} style={styles.backButton}>
                            <Text style={styles.backButtonText}>{'←'}</Text>
                        </Pressable>
                    )}
                    <View style={[styles.mainButtonContainer, isFirstStep && styles.mainButtonContainerCentered]}>
                        <PixelButton
                            title={isLastStep ? t('letsStart', language) : t('next', language)}
                            onPress={handleNext}
                            variant="primary"
                            size="large"
                            icon={isLastStep ? '🚀' : '➡️'}
                        />
                    </View>
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
        zIndex: theme.zIndex.modal,
        elevation: theme.zIndex.modal,
    },
    content: {
        flex: 1,
        width: '100%',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    skipButton: {
        minWidth: 60,
        padding: theme.spacing.sm,
    },
    skipText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    stepCounter: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    stepContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.md,
    },
    iconWrapper: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowEffect: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: theme.borderRadius.round,
        opacity: theme.opacity.medium,
    },
    iconContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    stepIcon: {
        fontSize: 80, // Intentionally larger than display (72px) for onboarding hero
    },
    floatingIcon: {
        position: 'absolute',
        fontSize: theme.typography.h1, // ~32px, closest to 30px
        opacity: theme.opacity.hint,
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
        marginBottom: theme.spacing.lg,
        maxWidth: 320,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.xl,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: theme.borderRadius.xs,
        backgroundColor: theme.colors.surfaceLight,
        marginHorizontal: 6,
    },
    activeDot: {
        backgroundColor: theme.colors.primary,
    },
    completedDot: {
        backgroundColor: theme.colors.secondary,
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
    },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: theme.typography.h2,
        color: theme.colors.text,
    },
    mainButtonContainer: {
        flex: 1,
        maxWidth: 220,
    },
    mainButtonContainerCentered: {
        maxWidth: 250,
    },

    // Preview styles
    previewContainer: {
        width: '100%',
        maxWidth: 300,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    timerPreview: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
    },
    timerPreviewText: {
        fontSize: 40, // Intentionally between h1 (32px) and display (72px) for timer preview
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        fontVariant: ['tabular-nums'],
    },
    timerProgressBar: {
        width: '80%',
        height: 6,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.xxs,
        marginTop: theme.spacing.md,
        overflow: 'hidden',
    },
    timerProgressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.xxs,
    },
    gesturePreview: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    gestureRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: theme.spacing.md,
    },
    gestureItem: {
        alignItems: 'center',
    },
    gestureEmoji: {
        fontSize: theme.typography.h2,
        marginBottom: theme.spacing.xs,
    },
    gestureLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    gestureEggContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gestureEgg: {
        fontSize: 50, // Intentionally between h1 (32px) and display (72px) for gesture preview egg
    },
    tapIndicator: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.round,
        borderWidth: 2,
        borderColor: theme.colors.secondary,
    },
    collectionPreview: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.sm,
    },
    animalCard: {
        width: 60,
        height: 72,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xs,
    },
    animalCardEmoji: {
        fontSize: theme.typography.h1, // ~32px, closest to 28px
    },
    rarityIndicator: {
        width: '60%',
        height: 4,
        borderRadius: theme.borderRadius.xxs,
        marginTop: theme.spacing.xs,
    },
    settingsPreview: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
    },
    streakDisplay: {
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    streakNumber: {
        fontSize: 48, // Intentionally between h1 (32px) and display (72px) for streak hero number
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.legendary,
    },
    streakLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    rewardIcons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    rewardIcon: {
        fontSize: theme.typography.h1, // ~32px, closest to 28px
    },
});
