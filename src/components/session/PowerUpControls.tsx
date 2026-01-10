import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../styles/theme';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';

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
}: PowerUpControlsProps) {
    // Only show during active, non-paused sessions
    if (sessionState !== 'active' || isPaused) {
        return null;
    }

    return (
        <>
            {/* Emergency Pause & Shield buttons */}
            <View style={styles.powerUpRow}>
                <Pressable
                    style={[styles.emergencyButton, emergencyPauseUsed && styles.buttonDisabled]}
                    onPress={onEmergencyPause}
                    disabled={emergencyPauseUsed}
                >
                    <Text style={styles.emergencyButtonText}>🛡️ {labels.emergencyPause}</Text>
                </Pressable>
                <View style={styles.buttonSpacer} />
                <Pressable
                    style={[styles.shieldButton, shieldCount === 0 && styles.buttonDisabled]}
                    onPress={onOpenShieldSelector}
                    disabled={shieldCount === 0}
                >
                    <Text style={styles.shieldButtonText}>⚔️ {labels.activateShield} ({shieldCount})</Text>
                </Pressable>
            </View>

            {/* Active Shield Indicator */}
            {activeShieldBonus > 0 && (
                <View style={styles.shieldActiveIndicator}>
                    <Text style={styles.shieldActiveText}>🛡️ {labels.shieldActive}: +{activeShieldBonus}s</Text>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
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
