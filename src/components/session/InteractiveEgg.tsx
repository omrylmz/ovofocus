import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { Egg } from '../Egg';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';
type Language = 'en' | 'tr';
type WarningLevel = 0 | 1 | 2 | 3;

interface InteractiveEggProps {
    sessionState: SessionState;
    progress: number;
    duration: number;
    warningLevel: WarningLevel;
    language: Language;
    hapticsEnabled: boolean;
    hasSeenGestureHints: boolean;
    onStart: () => void;
    onShowGestureHints: () => void;
}

export function InteractiveEgg({
    sessionState,
    progress,
    duration,
    warningLevel,
    language,
    hapticsEnabled,
    hasSeenGestureHints,
    onStart,
    onShowGestureHints,
}: InteractiveEggProps) {
    const [encouragementText, setEncouragementText] = useState<string | null>(null);

    // Egg interaction animations
    const eggScale = useSharedValue(1);
    const eggRotation = useSharedValue(0);
    const sparkleOpacity = useSharedValue(0);

    // Egg interaction handlers
    const showEncouragement = useCallback(() => {
        const messages = language === 'tr'
            ? ['Harika! 💪', 'Devam et! ✨', 'Başarıyorsun! 🌟', 'Odaklan! 🎯', 'Süpersin! 💫']
            : ['Great! 💪', 'Keep going! ✨', "You're doing it! 🌟", 'Stay focused! 🎯', 'Amazing! 💫'];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setEncouragementText(randomMessage);
        setTimeout(() => setEncouragementText(null), 1500);
    }, [language]);

    const handleEggTap = useCallback(() => {
        if (sessionState === 'active') {
            if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            showEncouragement();
        }
    }, [sessionState, hapticsEnabled, showEncouragement]);

    const handleEggDoubleTap = useCallback(() => {
        if (sessionState === 'active') {
            if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            // Show remaining time in a nice format
            const remaining = Math.ceil((1 - progress) * duration);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timeText = language === 'tr'
                ? `${mins}dk ${secs}sn kaldı!`
                : `${mins}m ${secs}s left!`;
            setEncouragementText(timeText);
            setTimeout(() => setEncouragementText(null), 2000);
        }
    }, [sessionState, hapticsEnabled, progress, duration, language]);

    const handleEggLongPress = useCallback(() => {
        if (sessionState === 'idle') {
            // Long press to start on idle
            onStart();
            // Show gesture hints on first session
            if (!hasSeenGestureHints) {
                setTimeout(() => onShowGestureHints(), 1000);
            }
        } else if (sessionState === 'active') {
            if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            const motivationalMessages = language === 'tr'
                ? ['Yumurtan büyüyor! 🥚✨', 'İçeride bir şey kıpırdıyor...', 'Neredeyse çatlayacak! 🐣']
                : ['Your egg is growing! 🥚✨', 'Something is stirring inside...', 'Almost ready to hatch! 🐣'];
            const msg = motivationalMessages[Math.floor(progress * motivationalMessages.length)];
            setEncouragementText(msg);
            setTimeout(() => setEncouragementText(null), 2500);
        }
    }, [sessionState, hapticsEnabled, progress, language, onStart, hasSeenGestureHints, onShowGestureHints]);

    // Gesture configuration
    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.05, { damping: 10 }),
                withSpring(1, { damping: 12 })
            );
            runOnJS(handleEggTap)();
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.1, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
            sparkleOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0, { duration: 500 })
            );
            runOnJS(handleEggDoubleTap)();
        });

    const longPressGesture = Gesture.LongPress()
        .minDuration(500)
        .onStart(() => {
            'worklet';
            eggScale.value = withSpring(0.95, { damping: 15 });
        })
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.15, { damping: 6 }),
                withSpring(1, { damping: 10 })
            );
            eggRotation.value = withSequence(
                withTiming(-5, { duration: 50 }),
                withTiming(5, { duration: 50 }),
                withTiming(0, { duration: 50 })
            );
            runOnJS(handleEggLongPress)();
        });

    // Combine gestures (double tap takes priority over single tap)
    const composedGesture = Gesture.Exclusive(doubleTapGesture, tapGesture, longPressGesture);

    const eggContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: eggScale.value },
            { rotate: `${eggRotation.value}deg` },
        ],
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        opacity: sparkleOpacity.value,
    }));

    return (
        <>
            {/* Interactive Egg with Gestures */}
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.eggWrapper, eggContainerStyle]}>
                    {/* Sparkle overlay for double tap */}
                    <Animated.View style={[styles.sparkleOverlay, sparkleStyle]}>
                        <Text style={styles.sparkleText}>✨ 💫 ⭐ 💫 ✨</Text>
                    </Animated.View>

                    <Egg
                        sessionState={sessionState}
                        progress={progress}
                        language={language}
                        warningLevel={warningLevel}
                    />
                </Animated.View>
            </GestureDetector>

            {/* Encouragement text */}
            {encouragementText && (
                <Animated.View style={styles.encouragementContainer}>
                    <Text style={styles.encouragementText}>{encouragementText}</Text>
                </Animated.View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    eggWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        // Explicit dimensions to ensure proper rendering on Android
        minWidth: 200,
        minHeight: 280,
    },
    sparkleOverlay: {
        position: 'absolute',
        top: -30,
        zIndex: 10,
    },
    sparkleText: {
        fontSize: 24,
    },
    encouragementContainer: {
        position: 'absolute',
        bottom: 180,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.round,
        ...theme.shadows.medium,
    },
    encouragementText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.bold,
    },
});
