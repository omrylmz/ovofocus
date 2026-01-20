import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { PixelButton } from '../PixelButton';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';

type Language = 'en' | 'tr';

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
    language?: Language;
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
    language = 'en',
}: SessionControlsProps) {
    // Accessibility hints based on language
    const a11yHints = {
        start: language === 'tr' ? 'Yeni bir odaklanma seansı başlatır' : 'Starts a new focus session',
        pause: language === 'tr' ? 'Mevcut seansı duraklatır' : 'Pauses the current session',
        resume: language === 'tr' ? 'Duraklatılmış seansa devam eder' : 'Resumes the paused session',
        giveUp: language === 'tr' ? 'Mevcut seansı iptal eder' : 'Abandons the current session',
        tryAgain: language === 'tr' ? 'Başarısızlıktan sonra yeni seans başlatır' : 'Starts a new session after failure',
    };
    return (
        <View style={styles.buttonContainer} accessibilityRole="toolbar">
            {sessionState === 'idle' && (
                <PixelButton
                    title={labels.startFocus}
                    onPress={onStart}
                    variant="primary"
                    size="large"
                    icon="🥚"
                    accessibilityHint={a11yHints.start}
                />
            )}

            {sessionState === 'active' && !isPaused && (
                <View style={styles.activeButtonsRow} accessibilityRole="toolbar">
                    <PixelButton
                        title={labels.pause}
                        onPress={onPause}
                        variant="secondary"
                        size="medium"
                        icon="⏸️"
                        disabled={pauseCount >= maxPauses}
                        accessibilityHint={a11yHints.pause}
                    />
                    <View style={styles.buttonSpacer} />
                    <PixelButton
                        title={labels.giveUp}
                        onPress={onGiveUp}
                        variant="ghost"
                        size="medium"
                        accessibilityHint={a11yHints.giveUp}
                    />
                </View>
            )}

            {sessionState === 'active' && isPaused && (
                <View style={styles.pausedContainer}>
                    <Text
                        style={styles.pausedText}
                        accessible={true}
                        accessibilityRole="header"
                        accessibilityLiveRegion="polite"
                    >
                        {labels.paused}
                    </Text>
                    <Text
                        style={styles.pauseCountText}
                        accessible={true}
                        accessibilityLabel={`${maxPauses - pauseCount} ${labels.pausesRemaining}`}
                    >
                        {maxPauses - pauseCount} {labels.pausesRemaining}
                    </Text>
                    <View style={styles.pausedButtonsRow}>
                        <PixelButton
                            title={labels.resume}
                            onPress={onResume}
                            variant="primary"
                            size="large"
                            icon="▶️"
                            accessibilityHint={a11yHints.resume}
                        />
                    </View>
                    <View style={styles.buttonSpacer} />
                    <PixelButton
                        title={labels.giveUp}
                        onPress={onGiveUp}
                        variant="ghost"
                        size="small"
                        accessibilityHint={a11yHints.giveUp}
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
                    accessibilityHint={a11yHints.tryAgain}
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
