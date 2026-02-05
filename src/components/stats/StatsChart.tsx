// Stats Chart Components - Custom charts using React Native Views and Reanimated
// Designed to match the pixel art aesthetic of Ovo Focus

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
    withSpring,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { WeeklyData, CompletionRateData } from '../../utils/statsCalculations';

type Language = 'en' | 'tr' | 'es';

// ============================================================================
// Bar Chart - Shows sessions per day for the last 7 days
// ============================================================================

interface BarChartProps {
    data: WeeklyData[];
    title: string;
    language?: Language;
}

function BarChartBar({ value, maxValue, label, index }: {
    value: number;
    maxValue: number;
    label: string;
    index: number;
}) {
    const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const animatedHeight = useSharedValue(0);

    useEffect(() => {
        animatedHeight.value = withDelay(
            index * 50,
            withSpring(heightPercent, {
                damping: 12,
                stiffness: 100,
            })
        );
    }, [heightPercent, index]);

    const animatedBarStyle = useAnimatedStyle(() => ({
        height: `${animatedHeight.value}%`,
    }));

    const isToday = index === 6;

    return (
        <View
            style={barStyles.barContainer}
            accessible={true}
            accessibilityRole="none"
            accessibilityLabel={`${label}: ${value} ${value === 1 ? 'session' : 'sessions'}${isToday ? ', today' : ''}`}
        >
            <View style={barStyles.barWrapper}>
                <View style={barStyles.barTrack}>
                    <Animated.View
                        style={[
                            barStyles.barFill,
                            isToday && barStyles.barFillToday,
                            animatedBarStyle,
                        ]}
                    />
                </View>
                <Text style={[barStyles.barValue, value === 0 && barStyles.barValueZero]}>
                    {value}
                </Text>
            </View>
            <Text style={[barStyles.barLabel, isToday && barStyles.barLabelToday]}>
                {label}
            </Text>
        </View>
    );
}

export function BarChart({ data, title, language = 'en' }: BarChartProps) {
    const maxValue = useMemo(() => {
        const max = Math.max(...data.map(d => d.sessions));
        return max > 0 ? max : 1;
    }, [data]);

    const totalSessions = useMemo(() => data.reduce((sum, d) => sum + d.sessions, 0), [data]);

    const accessibilityLabel = language === 'tr'
        ? `${title}. Toplam ${totalSessions} seans. Son 7 gun icin seans dagilimi`
        : `${title}. Total ${totalSessions} sessions. Session distribution for last 7 days`;

    return (
        <View
            style={barStyles.container}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <View style={barStyles.header}>
                <Text style={barStyles.title}>{title}</Text>
                <Text style={barStyles.total}>
                    {totalSessions} {language === 'tr' ? 'seans' : 'sessions'}
                </Text>
            </View>
            <View
                style={barStyles.chartArea}
                accessibilityRole="none"
            >
                {data.map((item, index) => (
                    <BarChartBar
                        key={item.date}
                        value={item.sessions}
                        maxValue={maxValue}
                        label={item.day}
                        index={index}
                    />
                ))}
            </View>
        </View>
    );
}

const barStyles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    total: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    chartArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        paddingTop: theme.spacing.md,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    barWrapper: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    barTrack: {
        width: 20,
        height: 80,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.xs,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    barFill: {
        width: '100%',
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.xs,
        minHeight: 2,
    },
    barFillToday: {
        backgroundColor: theme.colors.accent,
    },
    barValue: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.bold,
        marginTop: 4,
    },
    barValueZero: {
        color: theme.colors.textSecondary,
    },
    barLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    barLabelToday: {
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.bold,
    },
});

// ============================================================================
// Completion Rate Donut/Ring Chart
// ============================================================================

interface CompletionRingProps {
    data: CompletionRateData;
    title: string;
    language?: Language;
}

export function CompletionRing({ data, title, language = 'en' }: CompletionRingProps) {
    const animatedProgress = useSharedValue(0);

    useEffect(() => {
        animatedProgress.value = withDelay(
            100,
            withTiming(data.rate, {
                duration: 1000,
                easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
            })
        );
    }, [data.rate]);

    // For visual representation, we'll use a segmented approach
    // since SVG isn't native in React Native without additional deps
    const segments = 20;
    const filledSegments = Math.round((data.rate / 100) * segments);

    const accessibilityLabel = language === 'tr'
        ? `${title}. Tamamlanma orani: yuzde ${data.rate}. ${data.completed} tamamlandi, ${data.failed} basarisiz seans`
        : `${title}. Completion rate: ${data.rate}%. ${data.completed} completed, ${data.failed} failed sessions`;

    return (
        <View
            style={ringStyles.container}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <Text style={ringStyles.title}>{title}</Text>
            <View style={ringStyles.content}>
                <View style={ringStyles.ringContainer}>
                    {/* Ring segments */}
                    <View style={ringStyles.ring}>
                        {Array.from({ length: segments }).map((_, i) => {
                            const rotation = (i / segments) * 360;
                            const isFilled = i < filledSegments;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        ringStyles.segment,
                                        {
                                            transform: [
                                                { rotate: `${rotation}deg` },
                                                { translateY: -35 },
                                            ],
                                            backgroundColor: isFilled
                                                ? theme.colors.success
                                                : theme.colors.surfaceLight,
                                        },
                                    ]}
                                />
                            );
                        })}
                    </View>
                    {/* Center text */}
                    <View style={ringStyles.centerContent}>
                        <Text style={ringStyles.percentage}>{data.rate}%</Text>
                    </View>
                </View>
                {/* Legend */}
                <View style={ringStyles.legend}>
                    <View style={ringStyles.legendItem}>
                        <View style={[ringStyles.legendDot, { backgroundColor: theme.colors.success }]} />
                        <Text style={ringStyles.legendText}>
                            {language === 'tr' ? 'Tamamlanan' : 'Completed'}: {data.completed}
                        </Text>
                    </View>
                    <View style={ringStyles.legendItem}>
                        <View style={[ringStyles.legendDot, { backgroundColor: theme.colors.error }]} />
                        <Text style={ringStyles.legendText}>
                            {language === 'tr' ? 'Basarisiz' : 'Failed'}: {data.failed}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const ringStyles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    title: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ringContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ring: {
        position: 'absolute',
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    segment: {
        position: 'absolute',
        width: 8,
        height: 12,
        borderRadius: theme.borderRadius.xs,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentage: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    legend: {
        flex: 1,
        marginLeft: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: theme.borderRadius.sm,
    },
    legendText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
});

// ============================================================================
// Trend Line Chart - Shows weekly focus time trend
// ============================================================================

interface TrendChartProps {
    data: { weekLabel: string; totalMinutes: number }[];
    title: string;
    language?: Language;
}

export function TrendChart({ data, title, language = 'en' }: TrendChartProps) {
    const maxValue = useMemo(() => {
        const max = Math.max(...data.map(d => d.totalMinutes));
        return max > 0 ? max : 1;
    }, [data]);

    const animatedScale = useSharedValue(0);

    useEffect(() => {
        animatedScale.value = withDelay(
            200,
            withSpring(1, { damping: 12, stiffness: 80 })
        );
    }, []);

    // Calculate points for trend line
    const points = useMemo(() => {
        const chartWidth = 280;
        const chartHeight = 60;
        const padding = 20;

        return data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
            const y = chartHeight - (item.totalMinutes / maxValue) * (chartHeight - 10);
            return { x, y, value: item.totalMinutes, label: item.weekLabel };
        });
    }, [data, maxValue]);

    const formatMinutes = (min: number): string => {
        if (min < 60) return `${min}m`;
        const hours = Math.floor(min / 60);
        const mins = min % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const totalMinutes = data.reduce((sum, d) => sum + d.totalMinutes, 0);
    const accessibilityLabel = language === 'tr'
        ? `${title}. Son 4 haftalik odaklanma suresi trendi. Toplam ${formatMinutes(totalMinutes)}`
        : `${title}. Focus time trend for last 4 weeks. Total ${formatMinutes(totalMinutes)}`;

    return (
        <View
            style={trendStyles.container}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={accessibilityLabel}
        >
            <Text style={trendStyles.title}>{title}</Text>
            <View style={trendStyles.chartArea}>
                {/* Background grid lines */}
                <View style={trendStyles.gridLines}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={trendStyles.gridLine} />
                    ))}
                </View>
                {/* Points and labels */}
                <View style={trendStyles.pointsContainer}>
                    {points.map((point, index) => (
                        <View key={index} style={trendStyles.pointWrapper}>
                            <View style={trendStyles.pointColumn}>
                                <Text style={trendStyles.pointValue}>
                                    {formatMinutes(point.value)}
                                </Text>
                                <View
                                    style={[
                                        trendStyles.pointBar,
                                        {
                                            height: Math.max(4, (point.value / maxValue) * 50),
                                            backgroundColor: index === data.length - 1
                                                ? theme.colors.accent
                                                : theme.colors.secondary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={trendStyles.pointLabel}>{point.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const trendStyles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    title: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    chartArea: {
        height: 100,
        position: 'relative',
    },
    gridLines: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 20,
        justifyContent: 'space-between',
    },
    gridLine: {
        height: 1,
        backgroundColor: theme.colors.surfaceLight,
    },
    pointsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: '100%',
        paddingBottom: 0,
    },
    pointWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    pointColumn: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    pointValue: {
        fontSize: 10,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.bold,
        marginBottom: 4,
    },
    pointBar: {
        width: 40,
        borderRadius: theme.borderRadius.xs,
        minHeight: 4,
    },
    pointLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
});

// ============================================================================
// Export all chart components
// ============================================================================

export { BarChart as WeeklyBarChart };
