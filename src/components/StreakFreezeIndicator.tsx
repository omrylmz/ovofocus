import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { STREAK_FREEZE_CONSTANTS } from '../utils/streakFreeze';

interface StreakFreezeIndicatorProps {
    freezeCount: number;
    compact?: boolean;
}

/**
 * Displays the number of available streak freezes
 * Shows snowflake icons to represent freezes
 */
export function StreakFreezeIndicator({ freezeCount, compact = false }: StreakFreezeIndicatorProps) {
    if (compact) {
        // Compact view: just show icon + count
        return (
            <View style={styles.compactContainer}>
                <Text style={styles.compactIcon}>*</Text>
                <Text style={styles.compactCount}>{freezeCount}</Text>
            </View>
        );
    }

    // Full view: show all freeze slots
    return (
        <View style={styles.container}>
            <View style={styles.freezeSlots}>
                {Array.from({ length: STREAK_FREEZE_CONSTANTS.MAX_FREEZES }).map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.freezeSlot,
                            index < freezeCount ? styles.freezeSlotActive : styles.freezeSlotEmpty,
                        ]}
                    >
                        <Text style={[
                            styles.freezeIcon,
                            index < freezeCount ? styles.freezeIconActive : styles.freezeIconEmpty,
                        ]}>
                            *
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    freezeSlots: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    freezeSlot: {
        width: 28,
        height: 28,
        borderRadius: theme.borderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    freezeSlotActive: {
        backgroundColor: theme.colors.secondary + '30',
        borderColor: theme.colors.secondary,
    },
    freezeSlotEmpty: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.surfaceLight,
    },
    freezeIcon: {
        fontSize: 16,
        fontWeight: theme.fontWeight.bold,
    },
    freezeIconActive: {
        color: theme.colors.secondary,
    },
    freezeIconEmpty: {
        color: theme.colors.textSecondary,
        opacity: 0.3,
    },
    // Compact styles
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary + '20',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
        gap: theme.spacing.xs,
    },
    compactIcon: {
        fontSize: 14,
        color: theme.colors.secondary,
    },
    compactCount: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.secondary,
    },
});
