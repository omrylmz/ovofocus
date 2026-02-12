// Stats Summary Component - Key metrics cards for the statistics dashboard
// Displays at-a-glance focus statistics with animated entrance

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    FadeInUp,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { StatsSummary as StatsSummaryType, formatDuration, getTimePeriodIcon, getDayIcon } from '../../utils/statsCalculations';
import { t } from '../../i18n/translations';

type Language = 'en' | 'tr' | 'es';

// ============================================================================
// Stat Card Component - Individual metric display
// ============================================================================

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    subtitle?: string;
    highlight?: boolean;
    index?: number;
}

function StatCard({ icon, label, value, subtitle, highlight = false, index = 0 }: StatCardProps) {
    const accessibilityLabel = `${label}: ${value}${subtitle ? '. ' + subtitle : ''}`;

    return (
        <Animated.View
            entering={FadeInUp.delay(index * 50).springify().damping(12)}
            style={[cardStyles.card, highlight && cardStyles.cardHighlight]}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <Text style={cardStyles.icon} importantForAccessibility="no">
                {icon}
            </Text>
            <Text style={cardStyles.value} importantForAccessibility="no">
                {value}
            </Text>
            <Text style={cardStyles.label} importantForAccessibility="no">
                {label}
            </Text>
            {subtitle && (
                <Text style={cardStyles.subtitle} importantForAccessibility="no">
                    {subtitle}
                </Text>
            )}
        </Animated.View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        flex: 1,
        minHeight: 100,
    },
    cardHighlight: {
        borderWidth: 1,
        borderColor: theme.colors.accent,
    },
    icon: {
        fontSize: theme.fontSize.xl,
        marginBottom: theme.spacing.xs,
    },
    value: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    label: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xxs,
    },
    subtitle: {
        fontSize: theme.typography.micro,
        color: theme.colors.secondary,
        textAlign: 'center',
        marginTop: theme.spacing.xxs,
    },
});

// ============================================================================
// Focus Time Section - Today, This Week, All Time
// ============================================================================

interface FocusTimeSectionProps {
    todayMinutes: number;
    weekMinutes: number;
    allTimeMinutes: number;
    language: Language;
}

export function FocusTimeSection({ todayMinutes, weekMinutes, allTimeMinutes, language }: FocusTimeSectionProps) {
    const labels = {
        en: { today: 'Today', thisWeek: 'This Week', allTime: 'All Time' },
        tr: { today: 'Bugun', thisWeek: 'Bu Hafta', allTime: 'Toplam' },
        es: { today: 'Hoy', thisWeek: 'Esta Semana', allTime: 'Total' },
    };

    const sectionTitle = language === 'tr' ? 'Odaklanma Suresi' : language === 'es' ? 'Tiempo de Enfoque' : 'Focus Time';
    const accessibilityLabel = language === 'tr'
        ? `${sectionTitle}. Bugun: ${formatDuration(todayMinutes, language)}. Bu hafta: ${formatDuration(weekMinutes, language)}. Toplam: ${formatDuration(allTimeMinutes, language)}`
        : `${sectionTitle}. Today: ${formatDuration(todayMinutes, language)}. This week: ${formatDuration(weekMinutes, language)}. All time: ${formatDuration(allTimeMinutes, language)}`;

    return (
        <View
            style={sectionStyles.container}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <Text style={sectionStyles.sectionTitle} importantForAccessibility="no">
                {sectionTitle}
            </Text>
            <View style={sectionStyles.cardsRow}>
                <StatCard
                    icon="🎯"
                    label={labels[language].today}
                    value={formatDuration(todayMinutes, language)}
                    index={0}
                />
                <StatCard
                    icon="📅"
                    label={labels[language].thisWeek}
                    value={formatDuration(weekMinutes, language)}
                    index={1}
                />
                <StatCard
                    icon="🏆"
                    label={labels[language].allTime}
                    value={formatDuration(allTimeMinutes, language)}
                    index={2}
                />
            </View>
        </View>
    );
}

// ============================================================================
// Session Counts Section
// ============================================================================

interface SessionCountsSectionProps {
    todaySessions: number;
    weekSessions: number;
    allTimeSessions: number;
    averageDuration: number;
    language: Language;
}

export function SessionCountsSection({
    todaySessions,
    weekSessions,
    allTimeSessions,
    averageDuration,
    language,
}: SessionCountsSectionProps) {
    const labels = {
        en: { today: 'Today', thisWeek: 'This Week', total: 'Total', avgDuration: 'Avg Duration' },
        tr: { today: 'Bugun', thisWeek: 'Bu Hafta', total: 'Toplam', avgDuration: 'Ort Sure' },
        es: { today: 'Hoy', thisWeek: 'Esta Semana', total: 'Total', avgDuration: 'Duración Prom' },
    };

    const sectionTitle = language === 'tr' ? 'Seans Sayilari' : language === 'es' ? 'Conteo de Sesiones' : 'Session Counts';
    const accessibilityLabel = language === 'tr'
        ? `${sectionTitle}. Bugun: ${todaySessions} seans. Bu hafta: ${weekSessions} seans. Toplam: ${allTimeSessions} seans. Ortalama sure: ${formatDuration(averageDuration, language)}`
        : `${sectionTitle}. Today: ${todaySessions} sessions. This week: ${weekSessions} sessions. Total: ${allTimeSessions} sessions. Average duration: ${formatDuration(averageDuration, language)}`;

    return (
        <View
            style={sectionStyles.container}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <Text style={sectionStyles.sectionTitle} importantForAccessibility="no">
                {sectionTitle}
            </Text>
            <View style={sectionStyles.cardsRow}>
                <StatCard
                    icon="✅"
                    label={labels[language].today}
                    value={todaySessions}
                    index={0}
                />
                <StatCard
                    icon="📊"
                    label={labels[language].thisWeek}
                    value={weekSessions}
                    index={1}
                />
                <StatCard
                    icon="🎉"
                    label={labels[language].total}
                    value={allTimeSessions}
                    index={2}
                />
            </View>
            <View style={[sectionStyles.cardsRow, { marginTop: theme.spacing.sm }]}>
                <StatCard
                    icon="⏱️"
                    label={labels[language].avgDuration}
                    value={formatDuration(averageDuration, language)}
                    subtitle={language === 'tr' ? 'seans basina' : 'per session'}
                    index={3}
                />
            </View>
        </View>
    );
}

// ============================================================================
// Streak Section
// ============================================================================

interface StreakSectionProps {
    currentStreak: number;
    bestStreak: number;
    language: Language;
}

export function StreakSection({ currentStreak, bestStreak, language }: StreakSectionProps) {
    const labels = {
        en: { current: 'Current Streak', best: 'Best Streak', days: 'days' },
        tr: { current: 'Mevcut Seri', best: 'En Iyi Seri', days: 'gun' },
        es: { current: 'Racha Actual', best: 'Mejor Racha', days: 'días' },
    };

    const isAtBest = currentStreak > 0 && currentStreak >= bestStreak;
    const bestBadge = t('bestBadge', language);

    const sectionTitle = language === 'tr' ? 'Seri' : language === 'es' ? 'Racha' : 'Streak';
    const accessibilityLabel = language === 'tr'
        ? `${sectionTitle}. Mevcut seri: ${currentStreak} gun${isAtBest ? ', en iyi seri' : ''}. En iyi seri: ${bestStreak} gun`
        : `${sectionTitle}. Current streak: ${currentStreak} days${isAtBest ? ', personal best' : ''}. Best streak: ${bestStreak} days`;

    return (
        <View
            style={sectionStyles.container}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <Text style={sectionStyles.sectionTitle} importantForAccessibility="no">
                {sectionTitle}
            </Text>
            <View style={sectionStyles.cardsRow}>
                <StatCard
                    icon="🔥"
                    label={labels[language].current}
                    value={currentStreak}
                    subtitle={`${labels[language].days}${isAtBest ? ` (${bestBadge})` : ''}`}
                    highlight={isAtBest}
                    index={0}
                />
                <StatCard
                    icon="⭐"
                    label={labels[language].best}
                    value={bestStreak}
                    subtitle={labels[language].days}
                    index={1}
                />
            </View>
        </View>
    );
}

// ============================================================================
// Productivity Insights Section
// ============================================================================

interface ProductivityInsightsProps {
    mostProductiveDay: { day: string; dayIndex: number; sessions: number } | null;
    mostProductiveTime: { label: string; sessions: number } | null;
    language: Language;
}

export function ProductivityInsights({
    mostProductiveDay,
    mostProductiveTime,
    language,
}: ProductivityInsightsProps) {
    const labels = {
        en: { bestDay: 'Best Day', bestTime: 'Best Time', sessions: 'sessions', noData: 'No data yet' },
        tr: { bestDay: 'En Iyi Gun', bestTime: 'En Iyi Zaman', sessions: 'seans', noData: 'Henuz veri yok' },
        es: { bestDay: 'Mejor Día', bestTime: 'Mejor Hora', sessions: 'sesiones', noData: 'Sin datos aún' },
    };

    if (!mostProductiveDay && !mostProductiveTime) {
        return null;
    }

    const sectionTitle = language === 'tr' ? 'Verimlilik Bilgileri' : language === 'es' ? 'Estadísticas de Productividad' : 'Productivity Insights';

    // Build accessibility label dynamically based on available data
    let accessibilityParts: string[] = [sectionTitle];
    if (mostProductiveDay) {
        accessibilityParts.push(
            language === 'tr'
                ? `En iyi gun: ${mostProductiveDay.day}, ${mostProductiveDay.sessions} seans`
                : `Best day: ${mostProductiveDay.day}, ${mostProductiveDay.sessions} sessions`
        );
    }
    if (mostProductiveTime) {
        accessibilityParts.push(
            language === 'tr'
                ? `En iyi zaman: ${mostProductiveTime.label}, ${mostProductiveTime.sessions} seans`
                : `Best time: ${mostProductiveTime.label}, ${mostProductiveTime.sessions} sessions`
        );
    }
    const accessibilityLabel = accessibilityParts.join('. ');

    return (
        <View
            style={sectionStyles.container}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <Text style={sectionStyles.sectionTitle} importantForAccessibility="no">
                {sectionTitle}
            </Text>
            <View style={sectionStyles.cardsRow}>
                {mostProductiveDay && (
                    <StatCard
                        icon={getDayIcon(mostProductiveDay.dayIndex)}
                        label={labels[language].bestDay}
                        value={mostProductiveDay.day}
                        subtitle={`${mostProductiveDay.sessions} ${labels[language].sessions}`}
                        index={0}
                    />
                )}
                {mostProductiveTime && (
                    <StatCard
                        icon={getTimePeriodIcon(mostProductiveTime.label)}
                        label={labels[language].bestTime}
                        value={mostProductiveTime.label}
                        subtitle={`${mostProductiveTime.sessions} ${labels[language].sessions}`}
                        index={1}
                    />
                )}
            </View>
        </View>
    );
}

// ============================================================================
// Main Stats Summary Component - Combines all sections
// ============================================================================

interface StatsSummaryComponentProps {
    summary: StatsSummaryType;
    language: Language;
}

export function StatsSummaryComponent({ summary, language }: StatsSummaryComponentProps) {
    return (
        <View style={mainStyles.container}>
            <FocusTimeSection
                todayMinutes={summary.totalFocusTimeToday}
                weekMinutes={summary.totalFocusTimeWeek}
                allTimeMinutes={summary.totalFocusTimeAllTime}
                language={language}
            />

            <SessionCountsSection
                todaySessions={summary.sessionCountToday}
                weekSessions={summary.sessionCountWeek}
                allTimeSessions={summary.sessionCountAllTime}
                averageDuration={summary.averageSessionDuration}
                language={language}
            />

            <StreakSection
                currentStreak={summary.currentStreak}
                bestStreak={summary.bestStreak}
                language={language}
            />

            <ProductivityInsights
                mostProductiveDay={summary.mostProductiveDay}
                mostProductiveTime={summary.mostProductiveTime}
                language={language}
            />
        </View>
    );
}

// ============================================================================
// Styles
// ============================================================================

const sectionStyles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    cardsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
});

const mainStyles = StyleSheet.create({
    container: {
        gap: theme.spacing.sm,
    },
});

export default StatsSummaryComponent;
