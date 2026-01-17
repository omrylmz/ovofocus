import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { PixelButton } from '../PixelButton';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';

interface SessionControlsProps {
    sessionState: SessionState;
    isPaused: boolean;
    pauseCount: number;
    maxPauses: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onGiveUp: () => void;
    onReset: () => void;
    labels: {
        startFocus: string;
        pause: string;
        giveUp: string;
        paused: string;
        pausesRemaining: string;
        resume: string;
        tryAgain: string;
    };
}

export function SessionControls({
    sessionState,
    isPaused,
    pauseCount,
    maxPauses,
    onStart,
    onPause,
    onResume,
    onGiveUp,
    onReset,
    labels,
}: SessionControlsProps) {
    return (
        <View style={styles.buttonContainer}>
            {sessionState === 'idle' && (
                <PixelButton
                    title={labels.startFocus}
                    onPress={onStart}
                    variant="primary"
                    size="large"
                    icon="🥚"
                />
            )}

            {sessionState === 'active' && !isPaused && (
                <View style={styles.activeButtonsRow}>
                    <PixelButton
                        title={labels.pause}
                        onPress={onPause}
                        variant="secondary"
                        size="medium"
                        icon="⏸️"
                        disabled={pauseCount >= maxPauses}
                    />
                    <View style={styles.buttonSpacer} />
                    <PixelButton
                        title={labels.giveUp}
                        onPress={onGiveUp}
                        variant="ghost"
                        size="medium"
                    />
                </View>
            )}

            {sessionState === 'active' && isPaused && (
                <View style={styles.pausedContainer}>
                    <Text style={styles.pausedText}>{labels.paused}</Text>
                    <Text style={styles.pauseCountText}>
                        {maxPauses - pauseCount} {labels.pausesRemaining}
                    </Text>
                    <View style={styles.pausedButtonsRow}>
                        <PixelButton
                            title={labels.resume}
                            onPress={onResume}
                            variant="primary"
                            size="large"
                            icon="▶️"
                        />
                    </View>
                    <View style={styles.buttonSpacer} />
                    <PixelButton
                        title={labels.giveUp}
                        onPress={onGiveUp}
                        variant="ghost"
                        size="small"
                    />
                </View>
            )}

            {/* Only show "Try Again" on failed state - completed state is handled by HatchModal */}
            {sessionState === 'failed' && (
                <PixelButton
                    title={labels.tryAgain}
                    onPress={onReset}
                    variant="secondary"
                    size="large"
                    icon="🔄"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
        // Fixed height to prevent layout shift when buttons change
        minHeight: 120,
        justifyContent: 'flex-start',
    },
    activeButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonSpacer: {
        width: theme.spacing.md,
    },
    pausedContainer: {
        alignItems: 'center',
    },
    pausedText: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.warning,
        marginBottom: theme.spacing.xs,
    },
    pauseCountText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    pausedButtonsRow: {
        marginBottom: theme.spacing.md,
    },
});
