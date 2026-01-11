import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';

interface TimerDisplayProps {
    formattedTime: string;
    isRunning: boolean;
    progress: number;
    sessionState: SessionState;
}

export function TimerDisplay({
    formattedTime,
    isRunning,
    progress,
    sessionState,
}: TimerDisplayProps) {
    // Glow animation for timer
    const timerGlow = useSharedValue(0);

    useEffect(() => {
        if (isRunning) {
            timerGlow.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            timerGlow.value = withTiming(0, { duration: 300 });
        }
    }, [isRunning]);

    const timerGlowStyle = useAnimatedStyle(() => ({
        textShadowColor: theme.colors.accent,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: timerGlow.value * 20,
    }));

    return (
        <>
            {/* Timer */}
            <Animated.Text style={[styles.timer, timerGlowStyle]}>
                {formattedTime}
            </Animated.Text>

            {/* Progress bar */}
            {sessionState === 'active' && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${progress * 100}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    timer: {
        fontSize: theme.fontSize.timer,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        fontVariant: ['tabular-nums'],
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.md,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        marginBottom: theme.spacing.lg,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: theme.spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 4,
    },
    progressText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.semibold,
        width: 40,
        textAlign: 'right',
    },
});
