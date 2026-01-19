import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface DailyProgress {
    completedSessions: number;
    goalAchieved: boolean;
}

interface SessionStatsBarProps {
    completedSessions: number;
    collectionCount: number;
    dailyProgress: DailyProgress;
    dailyGoal: number;
    labels: {
        session: string;
        animals: string;
        dailyGoalProgress: string;
    };
}

export function SessionStatsBar({
    completedSessions,
    collectionCount,
    dailyProgress,
    dailyGoal,
    labels,
}: SessionStatsBarProps) {
    return (
        <View style={styles.statsBar}>
            <View style={styles.statItem}>
                <Text style={styles.statValue}>{completedSessions}</Text>
                <Text style={styles.statLabel}>{labels.session}</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statValue}>{collectionCount}</Text>
                <Text style={styles.statLabel}>{labels.animals}</Text>
            </View>
            <View style={styles.statItem}>
                <View style={styles.dailyGoalContainer}>
                    <Text style={[
                        styles.dailyGoalValue,
                        dailyProgress.goalAchieved && styles.dailyGoalAchieved
                    ]}>
                        {dailyProgress.goalAchieved ? '✓' : `${dailyProgress.completedSessions}/${dailyGoal}`}
                    </Text>
                </View>
                <Text style={styles.statLabel}>{labels.dailyGoalProgress}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: theme.spacing.lg,
        marginHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    dailyGoalContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    dailyGoalValue: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    dailyGoalAchieved: {
        color: theme.colors.success,
        fontSize: theme.fontSize.lg,
    },
});
