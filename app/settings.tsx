import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, SafeAreaView, Pressable } from 'react-native';
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Language */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('language')}</Text>
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

                {/* Focus Duration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('focusDuration')}</Text>
                    <View style={styles.durationGrid}>
                        {durations.map(duration => (
                            <PixelButton
                                key={duration}
                                title={`${duration} ${state.settings.language === 'tr' ? 'dk' : 'min'}`}
                                onPress={() => updateUserSettings({ focusDuration: duration })}
                                variant={state.settings.focusDuration === duration ? 'primary' : 'ghost'}
                                size="small"
                            />
                        ))}
                    </View>
                </View>

                {/* Background Tolerance */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('tolerance')}</Text>
                    <Text style={styles.toleranceDesc}>{i18n('toleranceDesc')}</Text>
                    <View style={styles.durationGrid}>
                        {[10, 15, 20, 30, 45, 60].map(secs => (
                            <PixelButton
                                key={secs}
                                title={`${secs} ${i18n('seconds')}`}
                                onPress={() => updateUserSettings({ toleranceSeconds: secs })}
                                variant={state.settings.toleranceSeconds === secs ? 'primary' : 'ghost'}
                                size="small"
                            />
                        ))}
                    </View>
                </View>

                {/* Daily Goal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('dailyGoalSetting')}</Text>
                    <View style={styles.durationGrid}>
                        {[1, 2, 3, 4, 5, 6].map(goal => (
                            <PixelButton
                                key={goal}
                                title={`${goal}`}
                                onPress={() => updateUserSettings({ dailyGoal: goal })}
                                variant={state.settings.dailyGoal === goal ? 'primary' : 'ghost'}
                                size="small"
                            />
                        ))}
                    </View>
                </View>

                {/* Streak Freeze */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('streakFreezes')}</Text>
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

                {/* Sound & Haptics */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('notifications')}</Text>

                    {isAudioAvailable && (
                        <View style={styles.settingRow}>
                            <Text style={styles.settingLabel}>{i18n('soundEffects')}</Text>
                            <Switch
                                value={state.settings.soundEnabled}
                                onValueChange={value => updateUserSettings({ soundEnabled: value })}
                                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                                thumbColor={theme.colors.text}
                            />
                        </View>
                    )}

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>{i18n('vibration')}</Text>
                        <Switch
                            value={state.settings.hapticsEnabled}
                            onValueChange={value => updateUserSettings({ hapticsEnabled: value })}
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor={theme.colors.text}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>{i18n('pushNotifications')}</Text>
                        <Switch
                            value={state.settings.notificationsEnabled}
                            onValueChange={handleNotificationToggle}
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor={theme.colors.text}
                        />
                    </View>
                </View>

                {/* Debug Mode */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('developer')}</Text>

                    <View style={styles.settingRow}>
                        <View>
                            <Text style={styles.settingLabel}>{i18n('debugMode')}</Text>
                            <Text style={styles.settingDescription}>
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

                {/* Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('statistics')}</Text>
                    <View style={styles.statsCard}>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>{i18n('totalSessions')}</Text>
                            <Text style={styles.statValue}>{state.stats.totalSessions}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>{i18n('completed')}</Text>
                            <Text style={[styles.statValue, { color: theme.colors.success }]}>
                                {state.stats.completedSessions}
                            </Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>{i18n('failed')}</Text>
                            <Text style={[styles.statValue, { color: theme.colors.error }]}>
                                {state.stats.failedSessions}
                            </Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>{i18n('totalFocus')}</Text>
                            <Text style={styles.statValue}>
                                {state.stats.totalFocusMinutes} {i18n('minutes').toLowerCase()}
                            </Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>{i18n('bestStreak')}</Text>
                            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                                🔥 {state.stats.bestStreak}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
                        {i18n('dangerZone')}
                    </Text>
                    <PixelButton
                        title={i18n('deleteAllData')}
                        onPress={handleClearData}
                        variant="danger"
                        icon="🗑️"
                    />
                </View>

                {/* App Info */}
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
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
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
    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    toleranceDesc: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    settingLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    settingDescription: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    statsCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceLight,
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
