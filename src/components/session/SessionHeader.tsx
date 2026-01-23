import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../styles/theme';
import { StreakBadge } from '../StreakBadge';
import { DailyProgressRing } from '../DailyProgressRing';

type Language = 'en' | 'tr' | 'es';

interface SessionHeaderProps {
    currentStreak: number;
    dailyCompletedSessions: number;
    dailyGoal: number;
    collectionLabel: string;
    onCollectionPress: () => void;
    onSettingsPress: () => void;
    onStatsPress: () => void;
    language?: Language;
}

export function SessionHeader({
    currentStreak,
    dailyCompletedSessions,
    dailyGoal,
    collectionLabel,
    onCollectionPress,
    onSettingsPress,
    onStatsPress,
    language = 'en',
}: SessionHeaderProps) {
    // Accessibility labels
    const a11y = {
        collectionHint: language === 'tr' ? 'Hayvan koleksiyonunuzu görüntüleyin' : 'View your animal collection',
        settingsLabel: language === 'tr' ? 'Ayarları aç' : 'Open settings',
        settingsHint: language === 'tr' ? 'Uygulama tercihlerini düzenleyin' : 'Adjust app preferences',
        statsLabel: language === 'tr' ? 'İstatistikleri aç' : 'Open statistics',
        statsHint: language === 'tr' ? 'Odaklanma istatistiklerini görüntüleyin' : 'View your focus statistics',
        streakLabel: language === 'tr'
            ? `Mevcut seri: ${currentStreak} gün`
            : `Current streak: ${currentStreak} days`,
        dailyProgressLabel: language === 'tr'
            ? `Günlük ilerleme: ${dailyGoal} seanstan ${dailyCompletedSessions} tamamlandı`
            : `Daily progress: ${dailyCompletedSessions} of ${dailyGoal} sessions completed`,
    };

    return (
        <View style={styles.header} accessibilityRole="toolbar">
            <Pressable
                onPress={onCollectionPress}
                style={styles.headerButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={collectionLabel}
                accessibilityHint={a11y.collectionHint}
            >
                <Text style={styles.headerButtonText}>{collectionLabel}</Text>
            </Pressable>

            {/* Center: Streak Badge */}
            <View accessible={true} accessibilityLabel={a11y.streakLabel}>
                <StreakBadge streak={currentStreak} size="small" />
            </View>

            <View style={styles.headerRight}>
                {/* Daily Progress */}
                <View accessible={true} accessibilityLabel={a11y.dailyProgressLabel}>
                    <DailyProgressRing
                        current={dailyCompletedSessions}
                        goal={dailyGoal}
                        size={36}
                    />
                </View>
                {/* Stats Button */}
                <Pressable
                    onPress={onStatsPress}
                    style={styles.headerButton}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={a11y.statsLabel}
                    accessibilityHint={a11y.statsHint}
                >
                    <Text style={styles.headerButtonText}>📊</Text>
                </Pressable>
                {/* Settings Button */}
                <Pressable
                    onPress={onSettingsPress}
                    style={styles.headerButton}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={a11y.settingsLabel}
                    accessibilityHint={a11y.settingsHint}
                >
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
