import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../styles/theme';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';
type Language = 'en' | 'tr' | 'es';

interface PowerUpControlsProps {
    sessionState: SessionState;
    isPaused: boolean;
    emergencyPauseUsed: boolean;
    activeShieldBonus: number;
    shieldCount: number;
    onEmergencyPause: () => void;
    onOpenShieldSelector: () => void;
    labels: {
        emergencyPause: string;
        activateShield: string;
        shieldActive: string;
    };
    language?: Language;
}

export function PowerUpControls({
    sessionState,
    isPaused,
    emergencyPauseUsed,
    activeShieldBonus,
    shieldCount,
    onEmergencyPause,
    onOpenShieldSelector,
    labels,
    language = 'en',
}: PowerUpControlsProps) {
    const isVisible = sessionState === 'active' && !isPaused;

    // Accessibility labels
    const a11y = {
        emergencyPauseHint: language === 'tr'
            ? 'Otomatik devam eden tek seferlik acil duraklatma'
            : 'One-time emergency pause that auto-resumes',
        shieldHint: language === 'tr'
            ? 'Arka plan toleransını uzatmak için kalkan etkinleştir'
            : 'Activate a shield to extend background tolerance',
        shieldActiveLabel: language === 'tr'
            ? `Kalkan aktif, ${activeShieldBonus} saniye tolerans ekliyor`
            : `Shield active, adding ${activeShieldBonus} seconds tolerance`,
    };

    // Always render container to maintain layout stability
    return (
        <View style={styles.container}>
            {isVisible && (
                <>
                    {/* Emergency Pause & Shield buttons */}
                    <View style={styles.powerUpRow} accessibilityRole="toolbar">
                        <Pressable
                            style={[styles.emergencyButton, emergencyPauseUsed && styles.buttonDisabled]}
                            onPress={onEmergencyPause}
                            disabled={emergencyPauseUsed}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={labels.emergencyPause}
                            accessibilityHint={a11y.emergencyPauseHint}
                            accessibilityState={{ disabled: emergencyPauseUsed }}
                        >
                            <Text style={styles.emergencyButtonText}>🛡️ {labels.emergencyPause}</Text>
                        </Pressable>
                        <View style={styles.buttonSpacer} />
                        <Pressable
                            style={[styles.shieldButton, shieldCount === 0 && styles.buttonDisabled]}
                            onPress={onOpenShieldSelector}
                            disabled={shieldCount === 0}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`${labels.activateShield}, ${shieldCount} available`}
                            accessibilityHint={a11y.shieldHint}
                            accessibilityState={{ disabled: shieldCount === 0 }}
                        >
                            <Text style={styles.shieldButtonText}>⚔️ {labels.activateShield} ({shieldCount})</Text>
                        </Pressable>
                    </View>

                    {/* Active Shield Indicator */}
                    {activeShieldBonus > 0 && (
                        <View
                            style={styles.shieldActiveIndicator}
                            accessible={true}
                            accessibilityRole="alert"
                            accessibilityLabel={a11y.shieldActiveLabel}
                            accessibilityLiveRegion="polite"
                        >
                            <Text style={styles.shieldActiveText}>🛡️ {labels.shieldActive}: +{activeShieldBonus}s</Text>
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Fixed height to prevent layout shift
        minHeight: 70,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    powerUpRow: {
        flexDirection: 'row',
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    buttonSpacer: {
        width: theme.spacing.md,
    },
    emergencyButton: {
        backgroundColor: theme.colors.warning,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    emergencyButtonText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.background,
    },
    shieldButton: {
        backgroundColor: theme.colors.epic,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    shieldButtonText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: '#fff',
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    shieldActiveIndicator: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
        marginTop: theme.spacing.sm,
    },
    shieldActiveText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: '#fff',
    },
});
