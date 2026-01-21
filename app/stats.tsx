// Statistics Dashboard Screen - Displays detailed focus statistics and visualizations
// Modal screen similar to collection.tsx and settings.tsx

import React, { useMemo, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from 'expo-router';
import { Theme } from '../src/styles/theme';
import { useGame } from '../src/context/GameContext';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { FloatingParticles } from '../src/components/FloatingParticles';
import { EmptyState } from '../src/components/EmptyState';

// Stats components
import { StatsSummaryComponent } from '../src/components/stats/StatsSummary';
import { BarChart, CompletionRing, TrendChart } from '../src/components/stats/StatsChart';

// Stats calculation utilities
import {
    calculateStatsSummary,
    calculateWeeklyData,
    calculateMonthlyTrend,
    calculateCompletionRate,
} from '../src/utils/statsCalculations';

// Create dynamic styles based on current theme
const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: theme.zIndex.background,
        elevation: theme.zIndex.background,
    },
    foregroundLayer: {
        flex: 1,
        zIndex: theme.zIndex.base,
        elevation: theme.zIndex.base,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    additionalStats: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceLight,
    },
    statLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    statValue: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
});

export default function StatsScreen() {
    const navigation = useNavigation();
    const { state, i18n } = useGame();
    const { theme } = useTheme();

    // Create dynamic styles based on current theme
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Set dynamic navigation title based on current language
    useLayoutEffect(() => {
        navigation.setOptions({
            title: i18n('statsTitle'),
        });
    }, [navigation, i18n]);

    // Calculate average session duration from actual stats, fallback to 25 minutes
    const avgDuration = useMemo(() =>
        state.stats.completedSessions > 0
            ? Math.round(state.stats.totalFocusMinutes / state.stats.completedSessions)
            : 25,
        [state.stats.completedSessions, state.stats.totalFocusMinutes]
    );

    // Calculate all stats data
    const statsSummary = useMemo(() =>
        calculateStatsSummary(state.stats, state.collection, state.settings.language),
        [state.stats, state.collection, state.settings.language]
    );

    const weeklyData = useMemo(() =>
        calculateWeeklyData(state.collection, state.settings.language, avgDuration),
        [state.collection, state.settings.language, avgDuration]
    );

    const monthlyTrend = useMemo(() =>
        calculateMonthlyTrend(state.collection, state.settings.language, avgDuration),
        [state.collection, state.settings.language, avgDuration]
    );

    const completionRate = useMemo(() =>
        calculateCompletionRate(state.stats),
        [state.stats]
    );

    // Check if user has any data
    const hasData = state.stats.totalSessions > 0;

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Layer */}
            <View style={styles.backgroundLayer} pointerEvents="none">
                <AnimatedBackground sessionState="idle" variant="collection" />
                <FloatingParticles count={10} isActive={false} variant="collection" />
            </View>

            {/* Foreground Content Layer */}
            <ScrollView
                style={styles.foregroundLayer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {hasData ? (
                    <>
                        {/* Summary Cards Section */}
                        <StatsSummaryComponent
                            summary={statsSummary}
                            language={state.settings.language}
                        />

                        {/* Weekly Sessions Bar Chart */}
                        <BarChart
                            data={weeklyData}
                            title={i18n('weeklySessionsChart')}
                            language={state.settings.language}
                        />

                        {/* Completion Rate Ring */}
                        <CompletionRing
                            data={completionRate}
                            title={i18n('completionRateChart')}
                            language={state.settings.language}
                        />

                        {/* Monthly Trend Chart */}
                        <TrendChart
                            data={monthlyTrend}
                            title={i18n('monthlyTrendChart')}
                            language={state.settings.language}
                        />

                        {/* Additional Stats */}
                        <View style={styles.additionalStats}>
                            <Text style={styles.sectionTitle}>{i18n('detailedStats')}</Text>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('totalFocusTime')}</Text>
                                <Text style={styles.statValue}>
                                    {Math.floor(state.stats.totalFocusMinutes / 60)}h {state.stats.totalFocusMinutes % 60}m
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('totalSessions')}</Text>
                                <Text style={styles.statValue}>{state.stats.totalSessions}</Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('completedSessions')}</Text>
                                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                                    {state.stats.completedSessions}
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('failedSessions')}</Text>
                                <Text style={[styles.statValue, { color: theme.colors.error }]}>
                                    {state.stats.failedSessions}
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('completionRate')}</Text>
                                <Text style={styles.statValue}>{completionRate.rate}%</Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('currentStreak')}</Text>
                                <Text style={styles.statValue}>
                                    {state.stats.currentStreak} {i18n('days')}
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('bestStreak')}</Text>
                                <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                                    {state.stats.bestStreak} {i18n('days')}
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>{i18n('animalsCollectedTotal')}</Text>
                                <Text style={styles.statValue}>{state.collection.length}</Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <EmptyState
                        type="empty"
                        title={i18n('noStatsYet')}
                        message={i18n('completeSessionsForStats')}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
