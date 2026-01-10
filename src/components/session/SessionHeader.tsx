import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../styles/theme';
import { StreakBadge } from '../StreakBadge';
import { DailyProgressRing } from '../DailyProgressRing';

interface SessionHeaderProps {
    currentStreak: number;
    dailyCompletedSessions: number;
    dailyGoal: number;
    collectionLabel: string;
    onCollectionPress: () => void;
    onSettingsPress: () => void;
}

export function SessionHeader({
    currentStreak,
    dailyCompletedSessions,
    dailyGoal,
    collectionLabel,
    onCollectionPress,
    onSettingsPress,
}: SessionHeaderProps) {
    return (
        <View style={styles.header}>
            <Pressable onPress={onCollectionPress} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>{collectionLabel}</Text>
            </Pressable>

            {/* Center: Streak Badge */}
            <StreakBadge streak={currentStreak} size="small" />

            <View style={styles.headerRight}>
                {/* Daily Progress */}
                <DailyProgressRing
                    current={dailyCompletedSessions}
                    goal={dailyGoal}
                    size={36}
                />
                <Pressable onPress={onSettingsPress} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>⚙️</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
    },
    headerButton: {
        padding: theme.spacing.sm,
    },
    headerButtonText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
});
