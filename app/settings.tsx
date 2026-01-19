import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, SafeAreaView, Pressable, Dimensions } from 'react-native';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { theme } from '../src/styles/theme';
import { useGame } from '../src/context/GameContext';
import { PixelButton } from '../src/components/PixelButton';
import { clearAllData } from '../src/utils/storage';
import { requestNotificationPermissions } from '../src/services/notifications';
import { audioManager } from '../src/services/audioManager';
import { StreakFreezeIndicator } from '../src/components/StreakFreezeIndicator';
import {
    getStreakFreezeData,
    useStreakFreeze,
    canUseFreeze,
    STREAK_FREEZE_CONSTANTS,
    StreakFreezeData,
} from '../src/utils/streakFreeze';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Calculate button width based on screen size (3 per row with gaps)
const BUTTON_GAP = theme.spacing.sm;
const CONTAINER_PADDING = theme.spacing.lg * 2;
const BUTTONS_PER_ROW = 3;
const BUTTON_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING - (BUTTON_GAP * (BUTTONS_PER_ROW - 1))) / BUTTONS_PER_ROW;

// Section Header Component with Icon
interface SectionHeaderProps {
    icon: string;
    title: string;
    color?: string;
}

function SectionHeader({ icon, title, color }: SectionHeaderProps) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={[styles.sectionTitle, color ? { color } : null]}>{title}</Text>
        </View>
    );
}

// Stat Item Component for better statistics display
interface StatItemProps {
    icon: string;
    label: string;
    value: string | number;
    valueColor?: string;
    isLast?: boolean;
}

function StatItem({ icon, label, value, valueColor, isLast }: StatItemProps) {
    return (
        <View style={[styles.statRow, isLast && styles.statRowLast]}>
            <View style={styles.statLabelContainer}>
                <Text style={styles.statIcon}>{icon}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
            <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
                {value}
            </Text>
        </View>
    );
}

export default function SettingsScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { state, updateUserSettings, i18n } = useGame();
    const [isAudioAvailable, setIsAudioAvailable] = useState(false);
    const [freezeData, setFreezeData] = useState<StreakFreezeData>({
        freezeCount: 0,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
    });
    const [canUseFreezeNow, setCanUseFreezeNow] = useState(false);

    // Check if audio system is functional
    useEffect(() => {
        setIsAudioAvailable(audioManager.isAudioSystemFunctional());
    }, []);

    // Load streak freeze data when screen is focused
    useFocusEffect(
        useCallback(() => {
            const loadFreezeData = async () => {
                const data = await getStreakFreezeData();
                setFreezeData(data);

                // Check if user has completed a session today
                const today = new Date().toISOString().split('T')[0];
                const lastSessionDate = state.stats.lastSessionDate?.split('T')[0];
                const hasCompletedToday = lastSessionDate === today;

                const canUse = await canUseFreeze(hasCompletedToday);
                setCanUseFreezeNow(canUse);
            };
            loadFreezeData();
        }, [state.stats.lastSessionDate])
    );

    // Set dynamic navigation title based on current language
    useLayoutEffect(() => {
        navigation.setOptions({
            title: i18n('settings'),
        });
    }, [navigation, i18n]);

    const handleClearData = () => {
        Alert.alert(
            i18n('deleteConfirmTitle'),
            i18n('deleteConfirmMessage'),
            [
                { text: i18n('cancel'), style: 'cancel' },
                {
                    text: i18n('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllData();
                        Alert.alert(i18n('done'), i18n('restartApp'));
                    },
                },
            ]
        );
    };

    const handleNotificationToggle = async (value: boolean) => {
        if (value) {
            const granted = await requestNotificationPermissions();
            if (granted) {
                updateUserSettings({ notificationsEnabled: true });
            }
        } else {
            updateUserSettings({ notificationsEnabled: false });
        }
    };

    const handleUseFreeze = async () => {
        const success = await useStreakFreeze();
        if (success) {
            Alert.alert(i18n('freezeUsed'), i18n('freezeProtectsStreak'));
            // Refresh freeze data
            const data = await getStreakFreezeData();
            setFreezeData(data);
            setCanUseFreezeNow(false);
        }
    };

    const durations = [15, 20, 25, 30, 45, 60];
    const tolerances = [10, 15, 20, 30, 45, 60];
    const dailyGoals = [1, 2, 3, 4, 5, 6];

    // Calculate success rate
    const successRate = state.stats.totalSessions > 0
        ? Math.round((state.stats.completedSessions / state.stats.totalSessions) * 100)
        : 0;

    // Format total focus time
    const formatFocusTime = (minutes: number) => {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        }
        return `${minutes}m`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* ===== DISPLAY SETTINGS ===== */}
                <View style={styles.section}>
                    <SectionHeader icon="🎨" title={i18n('language')} />
                    <View style={styles.languageGrid}>
                        <Pressable
                            style={[
                                styles.languageOption,
                                state.settings.language === 'en' && styles.languageOptionActive,
                            ]}
                            onPress={() => updateUserSettings({ language: 'en' })}
                        >
                            <Text style={styles.languageFlag}>🇬🇧</Text>
                            <Text style={[
                                styles.languageText,
                                state.settings.language === 'en' && styles.languageTextActive,
                            ]}>English</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.languageOption,
                                state.settings.language === 'tr' && styles.languageOptionActive,
                            ]}
                            onPress={() => updateUserSettings({ language: 'tr' })}
                        >
                            <Text style={styles.languageFlag}>🇹🇷</Text>
                            <Text style={[
                                styles.languageText,
                                state.settings.language === 'tr' && styles.languageTextActive,
                            ]}>Türkçe</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ===== TIMER SETTINGS ===== */}
                <View style={styles.section}>
                    <SectionHeader icon="⏱️" title={i18n('focusDuration')} />
                    <View style={styles.buttonGrid}>
                        {durations.map(duration => (
                            <View key={duration} style={styles.buttonWrapper}>
                                <PixelButton
                                    title={`${duration} ${state.settings.language === 'tr' ? 'dk' : 'min'}`}
                                    onPress={() => updateUserSettings({ focusDuration: duration })}
                                    variant={state.settings.focusDuration === duration ? 'primary' : 'ghost'}
                                    size="small"
                                />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <SectionHeader icon="🛡️" title={i18n('tolerance')} />
                    <Text style={styles.settingDescription}>{i18n('toleranceDesc')}</Text>
                    <View style={styles.buttonGrid}>
                        {tolerances.map(secs => (
                            <View key={secs} style={styles.buttonWrapper}>
                                <PixelButton
                                    title={`${secs} ${i18n('seconds')}`}
                                    onPress={() => updateUserSettings({ toleranceSeconds: secs })}
                                    variant={state.settings.toleranceSeconds === secs ? 'primary' : 'ghost'}
                                    size="small"
                                />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <SectionHeader icon="🎯" title={i18n('dailyGoalSetting')} />
                    <View style={styles.buttonGrid}>
                        {dailyGoals.map(goal => (
                            <View key={goal} style={styles.buttonWrapper}>
                                <PixelButton
                                    title={`${goal}`}
                                    onPress={() => updateUserSettings({ dailyGoal: goal })}
                                    variant={state.settings.dailyGoal === goal ? 'primary' : 'ghost'}
                                    size="small"
                                />
                            </View>
                        ))}
                    </View>
                </View>

                {/* ===== STREAK FREEZE ===== */}
                <View style={styles.section}>
                    <SectionHeader icon="❄️" title={i18n('streakFreezes')} />
                    <View style={styles.freezeCard}>
                        <View style={styles.freezeHeader}>
                            <StreakFreezeIndicator freezeCount={freezeData.freezeCount} />
                            <Text style={styles.freezeCountText}>
                                {freezeData.freezeCount} / {STREAK_FREEZE_CONSTANTS.MAX_FREEZES} {i18n('freezesAvailable')}
                            </Text>
                        </View>
                        <Text style={styles.freezeDescription}>
                            {i18n('nextFreezeAt')} {freezeData.lastMilestoneStreak + STREAK_FREEZE_CONSTANTS.STREAK_MILESTONE_DAYS} {i18n('dayStreak')}
                        </Text>
                        {canUseFreezeNow ? (
                            <View style={styles.freezeButtonContainer}>
                                <PixelButton
                                    title={i18n('useFreeze')}
                                    onPress={handleUseFreeze}
                                    variant="secondary"
                                    icon="*"
                                />
                            </View>
                        ) : (
                            <Text style={styles.freezeStatusText}>
                                {freezeData.freezeCount === 0
                                    ? i18n('noFreezesAvailable')
                                    : freezeData.lastFreezeUsedDate === new Date().toISOString().split('T')[0]
                                    ? i18n('alreadyUsedFreeze')
                                    : i18n('sessionCompletedToday')}
                            </Text>
                        )}
                    </View>
                </View>

                {/* ===== SOUND & HAPTICS ===== */}
                <View style={styles.section}>
                    <SectionHeader icon="🔔" title={i18n('notifications')} />

                    {isAudioAvailable && (
                        <View style={styles.settingRow}>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingRowIcon}>🔊</Text>
                                <Text style={styles.settingLabel}>{i18n('soundEffects')}</Text>
                            </View>
                            <Switch
                                value={state.settings.soundEnabled}
                                onValueChange={value => updateUserSettings({ soundEnabled: value })}
                                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                                thumbColor={theme.colors.text}
                            />
                        </View>
                    )}

                    <View style={styles.settingRow}>
                        <View style={styles.settingLabelContainer}>
                            <Text style={styles.settingRowIcon}>📳</Text>
                            <Text style={styles.settingLabel}>{i18n('vibration')}</Text>
                        </View>
                        <Switch
                            value={state.settings.hapticsEnabled}
                            onValueChange={value => updateUserSettings({ hapticsEnabled: value })}
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor={theme.colors.text}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingLabelContainer}>
                            <Text style={styles.settingRowIcon}>📱</Text>
                            <Text style={styles.settingLabel}>{i18n('pushNotifications')}</Text>
                        </View>
                        <Switch
                            value={state.settings.notificationsEnabled}
                            onValueChange={handleNotificationToggle}
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor={theme.colors.text}
                        />
                    </View>
                </View>

                {/* ===== STATISTICS ===== */}
                <View style={styles.section}>
                    <SectionHeader icon="📊" title={i18n('statistics')} />
                    <View style={styles.statsCard}>
                        {/* Summary Row */}
                        <View style={styles.statsSummary}>
                            <View style={styles.statsSummaryItem}>
                                <Text style={styles.statsSummaryValue}>{state.stats.totalSessions}</Text>
                                <Text style={styles.statsSummaryLabel}>{i18n('totalSessions')}</Text>
                            </View>
                            <View style={styles.statsSummaryDivider} />
                            <View style={styles.statsSummaryItem}>
                                <Text style={[styles.statsSummaryValue, { color: theme.colors.accent }]}>
                                    {successRate}%
                                </Text>
                                <Text style={styles.statsSummaryLabel}>{i18n('completed')}</Text>
                            </View>
                            <View style={styles.statsSummaryDivider} />
                            <View style={styles.statsSummaryItem}>
                                <Text style={[styles.statsSummaryValue, { color: theme.colors.primary }]}>
                                    {state.stats.bestStreak}
                                </Text>
                                <Text style={styles.statsSummaryLabel}>{i18n('bestStreak')}</Text>
                            </View>
                        </View>

                        {/* Detailed Stats */}
                        <View style={styles.statsDetails}>
                            <StatItem
                                icon="✅"
                                label={i18n('completed')}
                                value={state.stats.completedSessions}
                                valueColor={theme.colors.success}
                            />
                            <StatItem
                                icon="❌"
                                label={i18n('failed')}
                                value={state.stats.failedSessions}
                                valueColor={theme.colors.error}
                            />
                            <StatItem
                                icon="⏰"
                                label={i18n('totalFocus')}
                                value={formatFocusTime(state.stats.totalFocusMinutes)}
                                isLast
                            />
                        </View>
                    </View>
                </View>

                {/* ===== DEVELOPER ===== */}
                <View style={styles.section}>
                    <SectionHeader icon="🛠️" title={i18n('developer')} />

                    <View style={styles.settingRow}>
                        <View style={styles.settingLabelContainerWithDesc}>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingRowIcon}>🐛</Text>
                                <Text style={styles.settingLabel}>{i18n('debugMode')}</Text>
                            </View>
                            <Text style={styles.settingDescriptionSmall}>
                                {i18n('debugModeDesc')}
                            </Text>
                        </View>
                        <Switch
                            value={state.settings.debugMode}
                            onValueChange={value => updateUserSettings({ debugMode: value })}
                            trackColor={{ false: theme.colors.surface, true: theme.colors.warning }}
                            thumbColor={theme.colors.text}
                        />
                    </View>
                </View>

                {/* ===== DATA & PRIVACY ===== */}
                <View style={styles.section}>
                    <SectionHeader icon="⚠️" title={i18n('dangerZone')} color={theme.colors.error} />
                    <PixelButton
                        title={i18n('deleteAllData')}
                        onPress={handleClearData}
                        variant="danger"
                        icon="🗑️"
                    />
                </View>

                {/* ===== APP INFO ===== */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>🥚 Ovo Focus</Text>
                    <Text style={styles.appVersion}>v1.0.0</Text>
                    <Text style={styles.appTagline}>{i18n('tagline')}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    // Section Header styles
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    sectionIcon: {
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    // Language styles
    languageGrid: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    languageOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: theme.spacing.sm,
    },
    languageOptionActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surfaceLight,
    },
    languageFlag: {
        fontSize: 24,
    },
    languageText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    languageTextActive: {
        color: theme.colors.text,
        fontWeight: theme.fontWeight.bold,
    },
    // Responsive button grid
    buttonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: BUTTON_GAP,
    },
    buttonWrapper: {
        width: BUTTON_WIDTH,
    },
    // Setting description
    settingDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    settingDescriptionSmall: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // Setting row styles
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    settingLabelContainerWithDesc: {
        flex: 1,
    },
    settingRowIcon: {
        fontSize: 18,
    },
    settingLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    // Statistics styles
    statsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    statsSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surfaceLight,
    },
    statsSummaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    statsSummaryValue: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statsSummaryLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
    },
    statsSummaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.semantic.border,
    },
    statsDetails: {
        padding: theme.spacing.md,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceLight,
    },
    statRowLast: {
        borderBottomWidth: 0,
    },
    statLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    statIcon: {
        fontSize: 16,
    },
    statLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    statValue: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    // App info styles
    appInfo: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        marginTop: theme.spacing.lg,
    },
    appName: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    appVersion: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    appTagline: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.accent,
        marginTop: theme.spacing.sm,
        fontStyle: 'italic',
    },
    // Streak Freeze styles
    freezeCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    freezeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    freezeCountText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    freezeDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    freezeButtonContainer: {
        marginTop: theme.spacing.sm,
    },
    freezeStatusText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: theme.spacing.sm,
    },
});
