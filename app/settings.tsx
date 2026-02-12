import React, { useLayoutEffect, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, SafeAreaView, Pressable, useWindowDimensions, Modal, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { theme as darkTheme, ThemeMode, Theme } from '../src/styles/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useGame } from '../src/context/GameContext';
import { PixelButton } from '../src/components/PixelButton';
import { clearAllData } from '../src/utils/storage';
import { requestNotificationPermissions } from '../src/services/notifications';
import { audioManager } from '../src/services/audioManager';
import { ambientSoundService, AMBIENT_SOUNDS, AmbientSoundType } from '../src/services/ambientSoundService';
import { StreakFreezeIndicator } from '../src/components/StreakFreezeIndicator';
import {
    getStreakFreezeData,
    consumeStreakFreeze,
    canUseFreeze,
    STREAK_FREEZE_CONSTANTS,
    StreakFreezeData,
} from '../src/utils/streakFreeze';
import { ExportModal } from '../src/components/ExportModal';
import { EggStylePicker } from '../src/components/EggStylePicker';
import { getEggStyleById, getDefaultEggStyle, UnlockCheckParams } from '../src/data/eggStyles';
import { StyledEgg } from '../src/components/StyledEgg';
import { CalendarView } from '../src/components/CalendarView';

// Button grid constants (spacing doesn't change between themes)
const BUTTON_GAP = darkTheme.spacing.sm;
const CONTAINER_PADDING = darkTheme.spacing.lg * 2;
const BUTTONS_PER_ROW = 3;

// Create dynamic styles based on current theme and screen width
const createStyles = (theme: Theme, screenWidth: number) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    // Main Section Container with visual separation
    sectionContainer: {
        marginBottom: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
    },
    // Section Header styles - more prominent
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surfaceLight,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.semantic.border,
        gap: theme.spacing.sm,
    },
    sectionIcon: {
        fontSize: theme.typography.h2,
        width: 28,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        flex: 1,
    },
    // Section content padding
    sectionContent: {
        padding: theme.spacing.md,
    },
    // Subsection styles (within a main section)
    subsection: {
        marginBottom: theme.spacing.md,
    },
    subsectionLast: {
        marginBottom: 0,
    },
    subsectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    subsectionIcon: {
        fontSize: theme.typography.body,
    },
    subsectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
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
        backgroundColor: theme.colors.background,
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
        fontSize: theme.typography.h2,
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
    // Theme styles
    themeGrid: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    themeOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: theme.spacing.xs,
    },
    themeOptionActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surfaceLight,
    },
    themeIcon: {
        fontSize: theme.typography.h2,
    },
    themeText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    themeTextActive: {
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
        width: (screenWidth - CONTAINER_PADDING - (BUTTON_GAP * (BUTTONS_PER_ROW - 1))) / BUTTONS_PER_ROW,
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
        marginTop: theme.spacing.xxs,
    },
    // Setting row styles
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    settingRowLast: {
        marginBottom: 0,
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
        fontSize: theme.typography.h3,
    },
    settingLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    // Slider styles
    sliderContainer: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sliderLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    sliderLabelText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    sliderValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderMarks: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.xs,
    },
    sliderMark: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    // Statistics styles
    statsCard: {
        backgroundColor: theme.colors.background,
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
        fontSize: theme.typography.body,
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
        backgroundColor: theme.colors.background,
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
    // Ambient Sound styles
    settingSubLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    ambientSoundGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    ambientSoundOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: theme.spacing.xs,
    },
    ambientSoundOptionActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surfaceLight,
    },
    ambientSoundIcon: {
        fontSize: theme.typography.h3,
    },
    ambientSoundText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    ambientSoundTextActive: {
        color: theme.colors.text,
        fontWeight: theme.fontWeight.bold,
    },
    // Egg Customization styles
    eggCustomizeCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    eggCustomizeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    eggCustomizeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    eggCustomizePreview: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    eggCustomizeInfo: {
        flex: 1,
    },
    eggCustomizeLabel: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.text,
    },
    eggCustomizeStyleName: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    // Danger Zone styles
    dangerZoneContainer: {
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        borderWidth: 2,
        borderColor: theme.colors.error,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    dangerZoneWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    dangerZoneWarningIcon: {
        fontSize: theme.typography.h2,
    },
    dangerZoneWarningText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.error,
        fontWeight: theme.fontWeight.medium,
        flex: 1,
    },
    // Delete confirmation modal styles
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: theme.colors.semantic.overlayDark,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    deleteModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        width: '100%',
        maxWidth: 400,
        borderWidth: 2,
        borderColor: theme.colors.error,
    },
    deleteModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    deleteModalIcon: {
        fontSize: theme.typography.h1,
    },
    deleteModalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.error,
    },
    deleteModalWarning: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        lineHeight: 22,
    },
    deleteModalInputLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    deleteModalInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 2,
        borderColor: theme.colors.semantic.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
    },
    deleteModalInputError: {
        borderColor: theme.colors.error,
    },
    deleteModalFinalWarning: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.error,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    deleteModalButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    deleteModalButtonWrapper: {
        flex: 1,
    },
    // Divider between subsections
    divider: {
        height: 1,
        backgroundColor: theme.colors.semantic.border,
        marginVertical: theme.spacing.md,
    },
});

// Section Header Component with Icon (for main sections)
interface SectionHeaderProps {
    icon: string;
    title: string;
    color?: string;
    styles: ReturnType<typeof createStyles>;
}

function SectionHeader({ icon, title, color, styles }: SectionHeaderProps) {
    return (
        <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={[styles.sectionTitle, color ? { color } : null]}>{title}</Text>
        </View>
    );
}

// Subsection Header Component (for items within a main section)
interface SubsectionHeaderProps {
    icon: string;
    title: string;
    styles: ReturnType<typeof createStyles>;
}

function SubsectionHeader({ icon, title, styles }: SubsectionHeaderProps) {
    return (
        <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionIcon}>{icon}</Text>
            <Text style={styles.subsectionTitle}>{title}</Text>
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
    styles: ReturnType<typeof createStyles>;
}

function StatItem({ icon, label, value, valueColor, isLast, styles }: StatItemProps) {
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
    const { theme, isDarkMode } = useTheme();
    const [isAudioAvailable, setIsAudioAvailable] = useState(false);
    const [freezeData, setFreezeData] = useState<StreakFreezeData>({
        freezeCount: 0,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
    });
    const [canUseFreezeNow, setCanUseFreezeNow] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showEggStylePicker, setShowEggStylePicker] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showCalendarView, setShowCalendarView] = useState(false);
    const { width: screenWidth } = useWindowDimensions();

    // Create dynamic styles based on current theme and screen width
    const styles = useMemo(() => createStyles(theme, screenWidth), [theme, screenWidth]);

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

    const handleOpenDeleteModal = () => {
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setDeleteConfirmText('');
        setShowDeleteModal(false);
    };

    const handleConfirmDelete = async () => {
        const confirmWord = i18n('deleteConfirmationWord');
        if (deleteConfirmText.toUpperCase() === confirmWord.toUpperCase()) {
            await clearAllData();
            setShowDeleteModal(false);
            setDeleteConfirmText('');
            Alert.alert(i18n('done'), i18n('restartApp'));
        }
    };

    const isDeleteConfirmValid = () => {
        const confirmWord = i18n('deleteConfirmationWord');
        return deleteConfirmText.toUpperCase() === confirmWord.toUpperCase();
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
        const success = await consumeStreakFreeze();
        if (success) {
            Alert.alert(i18n('freezeUsed'), i18n('freezeProtectsStreak'));
            // Refresh freeze data
            const data = await getStreakFreezeData();
            setFreezeData(data);
            setCanUseFreezeNow(false);
        }
    };

    // Slider duration options
    const durationOptions = [15, 20, 25, 30, 45, 60];
    const tolerances = [10, 15, 20, 30, 45, 60];
    const dailyGoals = [1, 2, 3, 4, 5, 6];

    // Handle slider value change - snap to nearest option
    const handleDurationSliderChange = (value: number) => {
        // Find the closest option
        const closest = durationOptions.reduce((prev, curr) =>
            Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
        );
        if (closest !== state.settings.focusDuration) {
            updateUserSettings({ focusDuration: closest });
        }
    };

    // Get the current egg style
    const currentEggStyle = useMemo(() => {
        return getEggStyleById(state.settings.selectedEggStyle) || getDefaultEggStyle();
    }, [state.settings.selectedEggStyle]);

    // Calculate unlock params for egg styles based on collection
    const eggUnlockParams: UnlockCheckParams = useMemo(() => {
        // Count unique animals and animals by rarity
        const uniqueAnimals = new Set(state.collection.map(a => a.id));
        const rareAnimals = state.collection.filter(a => a.rarity === 'rare');
        const epicAnimals = state.collection.filter(a => a.rarity === 'epic');
        const legendaryAnimals = state.collection.filter(a => a.rarity === 'legendary');

        return {
            currentStreak: state.stats.currentStreak,
            bestStreak: state.stats.bestStreak,
            completedSessions: state.stats.completedSessions,
            uniqueAnimalsCollected: uniqueAnimals.size,
            rareAnimalsCollected: new Set(rareAnimals.map(a => a.id)).size,
            epicAnimalsCollected: new Set(epicAnimals.map(a => a.id)).size,
            legendaryAnimalsCollected: new Set(legendaryAnimals.map(a => a.id)).size,
        };
    }, [state.collection, state.stats]);

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

    const minLabel = state.settings.language === 'tr' ? 'dk' : 'min';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* ===== SESSION SECTION ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="⏱️" title={i18n('sectionSession')} />
                    <View style={styles.sectionContent}>
                        {/* Focus Duration with Slider */}
                        <View style={styles.subsection}>
                            <View style={styles.sliderContainer}>
                                <View style={styles.sliderHeader}>
                                    <View style={styles.sliderLabel}>
                                        <Text style={styles.settingRowIcon}>🎯</Text>
                                        <Text style={styles.sliderLabelText}>{i18n('focusDuration')}</Text>
                                    </View>
                                    <Text style={styles.sliderValue}>{state.settings.focusDuration} {minLabel}</Text>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={15}
                                    maximumValue={60}
                                    step={5}
                                    value={state.settings.focusDuration}
                                    onSlidingComplete={handleDurationSliderChange}
                                    minimumTrackTintColor={theme.colors.primary}
                                    maximumTrackTintColor={theme.colors.surfaceLight}
                                    thumbTintColor={theme.colors.primary}
                                    accessibilityLabel={i18n('focusDuration')}
                                    accessibilityHint={i18n('focusDurationDesc')}
                                />
                                <View style={styles.sliderMarks}>
                                    {durationOptions.map(d => (
                                        <Text key={d} style={styles.sliderMark}>{d}</Text>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Daily Goal */}
                        <View style={styles.subsection}>
                            <SubsectionHeader styles={styles} icon="📈" title={i18n('dailyGoalSetting')} />
                            <View style={styles.buttonGrid}>
                                {dailyGoals.map(goal => (
                                    <View key={goal} style={styles.buttonWrapper}>
                                        <PixelButton
                                            title={`${goal}`}
                                            onPress={() => updateUserSettings({ dailyGoal: goal })}
                                            variant={state.settings.dailyGoal === goal ? 'primary' : 'ghost'}
                                            size="small"
                                            accessibilityLabel={`${goal} ${i18n('sessions')}`}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Background Tolerance */}
                        <View style={styles.subsection}>
                            <SubsectionHeader styles={styles} icon="🛡️" title={i18n('tolerance')} />
                            <Text style={styles.settingDescription}>{i18n('toleranceDesc')}</Text>
                            <View style={styles.buttonGrid}>
                                {tolerances.map(secs => (
                                    <View key={secs} style={styles.buttonWrapper}>
                                        <PixelButton
                                            title={`${secs} ${i18n('seconds')}`}
                                            onPress={() => updateUserSettings({ toleranceSeconds: secs })}
                                            variant={state.settings.toleranceSeconds === secs ? 'primary' : 'ghost'}
                                            size="small"
                                            accessibilityLabel={`${secs} ${i18n('seconds')}`}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Pomodoro Mode */}
                        <View style={[styles.subsection, styles.subsectionLast]}>
                            <SubsectionHeader styles={styles} icon="🍅" title={i18n('pomodoroMode')} />
                            <Text style={styles.settingDescription}>{i18n('pomodoroEnabledDesc')}</Text>

                            <View style={[styles.settingRow, !state.settings.pomodoroEnabled && styles.settingRowLast]}>
                                <View style={styles.settingLabelContainer}>
                                    <Text style={styles.settingRowIcon}>🔄</Text>
                                    <Text style={styles.settingLabel}>{i18n('pomodoroEnabled')}</Text>
                                </View>
                                <Switch
                                    value={state.settings.pomodoroEnabled}
                                    onValueChange={value => updateUserSettings({ pomodoroEnabled: value })}
                                    trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                                    thumbColor={theme.colors.text}
                                    accessibilityLabel={i18n('pomodoroEnabled')}
                                />
                            </View>

                            {state.settings.pomodoroEnabled && (
                                <>
                                    <Text style={styles.settingSubLabel}>{i18n('pomodoroWorkDuration')}</Text>
                                    <View style={styles.buttonGrid}>
                                        {[15, 20, 25, 30, 45].map(mins => (
                                            <View key={mins} style={styles.buttonWrapper}>
                                                <PixelButton
                                                    title={`${mins} ${minLabel}`}
                                                    onPress={() => updateUserSettings({ pomodoroWorkDuration: mins })}
                                                    variant={state.settings.pomodoroWorkDuration === mins ? 'primary' : 'ghost'}
                                                    size="small"
                                                />
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={styles.settingSubLabel}>{i18n('pomodoroBreakDuration')}</Text>
                                    <View style={styles.buttonGrid}>
                                        {[3, 5, 7, 10].map(mins => (
                                            <View key={mins} style={styles.buttonWrapper}>
                                                <PixelButton
                                                    title={`${mins} ${minLabel}`}
                                                    onPress={() => updateUserSettings({ pomodoroBreakDuration: mins })}
                                                    variant={state.settings.pomodoroBreakDuration === mins ? 'primary' : 'ghost'}
                                                    size="small"
                                                />
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={styles.settingSubLabel}>{i18n('pomodoroLongBreakDuration')}</Text>
                                    <View style={styles.buttonGrid}>
                                        {[10, 15, 20, 30].map(mins => (
                                            <View key={mins} style={styles.buttonWrapper}>
                                                <PixelButton
                                                    title={`${mins} ${minLabel}`}
                                                    onPress={() => updateUserSettings({ pomodoroLongBreakDuration: mins })}
                                                    variant={state.settings.pomodoroLongBreakDuration === mins ? 'primary' : 'ghost'}
                                                    size="small"
                                                />
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={styles.settingSubLabel}>{i18n('sessionsBeforeLongBreak')}</Text>
                                    <View style={styles.buttonGrid}>
                                        {[2, 3, 4, 5, 6].map(count => (
                                            <View key={count} style={styles.buttonWrapper}>
                                                <PixelButton
                                                    title={`${count}`}
                                                    onPress={() => updateUserSettings({ sessionsBeforeLongBreak: count })}
                                                    variant={state.settings.sessionsBeforeLongBreak === count ? 'primary' : 'ghost'}
                                                    size="small"
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* ===== SOUNDS & HAPTICS SECTION ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="🔊" title={i18n('sectionSoundsHaptics')} />
                    <View style={styles.sectionContent}>
                        {isAudioAvailable && (
                            <View style={styles.settingRow}>
                                <View style={styles.settingLabelContainer}>
                                    <Text style={styles.settingRowIcon}>🎵</Text>
                                    <Text style={styles.settingLabel}>{i18n('soundEffects')}</Text>
                                </View>
                                <Switch
                                    value={state.settings.soundEnabled}
                                    onValueChange={value => updateUserSettings({ soundEnabled: value })}
                                    trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                                    thumbColor={theme.colors.text}
                                    accessibilityLabel={i18n('soundEffects')}
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
                                trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                                thumbColor={theme.colors.text}
                                accessibilityLabel={i18n('vibration')}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Ambient Sounds */}
                        <View style={[styles.subsection, styles.subsectionLast]}>
                            <SubsectionHeader styles={styles} icon="🎧" title={i18n('ambientSounds')} />
                            <Text style={styles.settingDescription}>{i18n('ambientSoundsDesc')}</Text>

                            <View style={[styles.settingRow, !state.settings.ambientSoundEnabled && styles.settingRowLast]}>
                                <View style={styles.settingLabelContainer}>
                                    <Text style={styles.settingRowIcon}>🔈</Text>
                                    <Text style={styles.settingLabel}>{i18n('ambientSounds')}</Text>
                                </View>
                                <Switch
                                    value={state.settings.ambientSoundEnabled}
                                    onValueChange={value => updateUserSettings({ ambientSoundEnabled: value })}
                                    trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                                    thumbColor={theme.colors.text}
                                    accessibilityLabel={i18n('ambientSounds')}
                                />
                            </View>

                            {state.settings.ambientSoundEnabled && (
                                <>
                                    <Text style={styles.settingSubLabel}>{i18n('selectSound')}</Text>
                                    <View style={styles.ambientSoundGrid} accessibilityRole="radiogroup">
                                        {AMBIENT_SOUNDS.map(sound => {
                                            const soundNameKey = `ambient${sound.id.charAt(0).toUpperCase()}${sound.id.slice(1).replace('_', '')}` as keyof typeof import('../src/i18n/translations').translations.en;
                                            // Handle special case for white_noise -> WhiteNoise
                                            const translationKey = sound.id === 'white_noise' ? 'ambientWhiteNoise' : soundNameKey;
                                            const isSelected = state.settings.selectedAmbientSound === sound.id;
                                            const soundName = i18n(translationKey as any);
                                            return (
                                                <Pressable
                                                    key={sound.id}
                                                    style={[
                                                        styles.ambientSoundOption,
                                                        isSelected && styles.ambientSoundOptionActive,
                                                    ]}
                                                    onPress={() => updateUserSettings({ selectedAmbientSound: sound.id })}
                                                    accessibilityRole="radio"
                                                    accessibilityLabel={soundName}
                                                    accessibilityState={{ selected: isSelected }}
                                                    accessibilityHint={state.settings.language === 'tr'
                                                        ? `${soundName} ortam sesini secmek icin dokunun`
                                                        : `Tap to select ${soundName} ambient sound`}
                                                >
                                                    <Text style={styles.ambientSoundIcon} importantForAccessibility="no">{sound.icon}</Text>
                                                    <Text style={[
                                                        styles.ambientSoundText,
                                                        isSelected && styles.ambientSoundTextActive,
                                                    ]}>{soundName}</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>

                                    <Text style={styles.settingSubLabel}>{i18n('soundVolume')}</Text>
                                    <View style={styles.buttonGrid} accessibilityRole="radiogroup">
                                        {[25, 50, 75, 100].map(vol => {
                                            const isSelected = state.settings.ambientSoundVolume === vol;
                                            return (
                                                <View key={vol} style={styles.buttonWrapper}>
                                                    <PixelButton
                                                        title={`${vol}%`}
                                                        onPress={() => updateUserSettings({ ambientSoundVolume: vol })}
                                                        variant={isSelected ? 'primary' : 'ghost'}
                                                        size="small"
                                                        accessibilityRole="radio"
                                                        accessibilityLabel={`${vol}%`}
                                                        accessibilityState={{ selected: isSelected }}
                                                        accessibilityHint={state.settings.language === 'tr'
                                                            ? `Ses seviyesini ${vol}% olarak ayarla`
                                                            : `Set volume to ${vol}%`}
                                                    />
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* ===== NOTIFICATIONS SECTION ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="🔔" title={i18n('sectionNotifications')} />
                    <View style={styles.sectionContent}>
                        <View style={[styles.settingRow, styles.settingRowLast]}>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingRowIcon}>📱</Text>
                                <Text style={styles.settingLabel}>{i18n('pushNotifications')}</Text>
                            </View>
                            <Switch
                                value={state.settings.notificationsEnabled}
                                onValueChange={handleNotificationToggle}
                                trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                                thumbColor={theme.colors.text}
                                accessibilityLabel={i18n('pushNotifications')}
                            />
                        </View>
                    </View>
                </View>

                {/* ===== APPEARANCE SECTION ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="🎨" title={i18n('sectionAppearance')} />
                    <View style={styles.sectionContent}>
                        {/* Language */}
                        <View style={styles.subsection}>
                            <SubsectionHeader styles={styles} icon="🌍" title={i18n('language')} />
                            <View style={styles.languageGrid}>
                                <Pressable
                                    style={[
                                        styles.languageOption,
                                        state.settings.language === 'en' && styles.languageOptionActive,
                                    ]}
                                    onPress={() => updateUserSettings({ language: 'en' })}
                                    accessibilityLabel="English"
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: state.settings.language === 'en' }}
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
                                    accessibilityLabel="Turkish"
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: state.settings.language === 'tr' }}
                                >
                                    <Text style={styles.languageFlag}>🇹🇷</Text>
                                    <Text style={[
                                        styles.languageText,
                                        state.settings.language === 'tr' && styles.languageTextActive,
                                    ]}>Turkce</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Theme */}
                        <View style={styles.subsection}>
                            <SubsectionHeader styles={styles} icon="🌓" title={i18n('appearance')} />
                            <Text style={styles.settingDescription}>{i18n('themeDesc')}</Text>
                            <View style={styles.themeGrid}>
                                <Pressable
                                    style={[
                                        styles.themeOption,
                                        state.settings.themeMode === 'light' && styles.themeOptionActive,
                                    ]}
                                    onPress={() => updateUserSettings({ themeMode: 'light' })}
                                    accessibilityLabel={i18n('themeLight')}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: state.settings.themeMode === 'light' }}
                                >
                                    <Text style={styles.themeIcon}>☀️</Text>
                                    <Text style={[
                                        styles.themeText,
                                        state.settings.themeMode === 'light' && styles.themeTextActive,
                                    ]}>{i18n('themeLight')}</Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.themeOption,
                                        state.settings.themeMode === 'dark' && styles.themeOptionActive,
                                    ]}
                                    onPress={() => updateUserSettings({ themeMode: 'dark' })}
                                    accessibilityLabel={i18n('themeDark')}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: state.settings.themeMode === 'dark' }}
                                >
                                    <Text style={styles.themeIcon}>🌙</Text>
                                    <Text style={[
                                        styles.themeText,
                                        state.settings.themeMode === 'dark' && styles.themeTextActive,
                                    ]}>{i18n('themeDark')}</Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.themeOption,
                                        state.settings.themeMode === 'system' && styles.themeOptionActive,
                                    ]}
                                    onPress={() => updateUserSettings({ themeMode: 'system' })}
                                    accessibilityLabel={i18n('themeSystem')}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: state.settings.themeMode === 'system' }}
                                >
                                    <Text style={styles.themeIcon}>📱</Text>
                                    <Text style={[
                                        styles.themeText,
                                        state.settings.themeMode === 'system' && styles.themeTextActive,
                                    ]}>{i18n('themeSystem')}</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Egg Customization */}
                        <View style={[styles.subsection, styles.subsectionLast]}>
                            <SubsectionHeader styles={styles} icon="🥚" title={i18n('eggCustomization')} />
                            <Text style={styles.settingDescription}>{i18n('eggCustomizationDesc')}</Text>
                            <Pressable
                                style={styles.eggCustomizeCard}
                                onPress={() => setShowEggStylePicker(true)}
                                accessibilityLabel={i18n('customize')}
                                accessibilityHint={i18n('eggCustomizationDesc')}
                            >
                                <View style={styles.eggCustomizeRow}>
                                    <View style={styles.eggCustomizeLeft}>
                                        <View style={styles.eggCustomizePreview}>
                                            <StyledEgg
                                                eggStyle={currentEggStyle}
                                                size={50}
                                                showPattern={true}
                                            />
                                        </View>
                                        <View style={styles.eggCustomizeInfo}>
                                            <Text style={styles.eggCustomizeLabel}>{i18n('currentEggStyle')}</Text>
                                            <Text style={styles.eggCustomizeStyleName}>
                                                {i18n(currentEggStyle.name as any)}
                                            </Text>
                                        </View>
                                    </View>
                                    <PixelButton
                                        title={i18n('customize')}
                                        onPress={() => setShowEggStylePicker(true)}
                                        variant="secondary"
                                        size="small"
                                    />
                                </View>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* ===== PROGRESS & STATS SECTION ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="📊" title={i18n('sectionProgress')} />
                    <View style={styles.sectionContent}>
                        {/* Calendar */}
                        <View style={styles.subsection}>
                            <SubsectionHeader styles={styles} icon="📅" title={i18n('calendarIntegration')} />
                            <Text style={styles.settingDescription}>{i18n('calendarDesc')}</Text>
                            <PixelButton
                                title={i18n('viewCalendar')}
                                onPress={() => setShowCalendarView(true)}
                                variant="secondary"
                                icon="📅"
                                accessibilityLabel={i18n('viewCalendar')}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Streak Freeze */}
                        <View style={styles.subsection}>
                            <SubsectionHeader styles={styles} icon="❄️" title={i18n('streakFreezes')} />
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
                                            accessibilityLabel={i18n('useFreeze')}
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

                        <View style={styles.divider} />

                        {/* Statistics */}
                        <View style={[styles.subsection, styles.subsectionLast]}>
                            <SubsectionHeader styles={styles} icon="📈" title={i18n('statistics')} />
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
                                        styles={styles}
                                        icon="✅"
                                        label={i18n('completed')}
                                        value={state.stats.completedSessions}
                                        valueColor={theme.colors.success}
                                    />
                                    <StatItem
                                        styles={styles}
                                        icon="❌"
                                        label={i18n('failed')}
                                        value={state.stats.failedSessions}
                                        valueColor={theme.colors.error}
                                    />
                                    <StatItem
                                        styles={styles}
                                        icon="⏰"
                                        label={i18n('totalFocus')}
                                        value={formatFocusTime(state.stats.totalFocusMinutes)}
                                        isLast
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ===== DATA & BACKUP SECTION ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="💾" title={i18n('sectionData')} />
                    <View style={styles.sectionContent}>
                        <Text style={styles.settingDescription}>{i18n('exportDescription')}</Text>
                        <PixelButton
                            title={i18n('dataBackup')}
                            onPress={() => setShowExportModal(true)}
                            variant="secondary"
                            icon="📤"
                            accessibilityLabel={i18n('dataBackup')}
                        />
                    </View>
                </View>

                {/* ===== DEVELOPER SECTION ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="🛠️" title={i18n('sectionDeveloper')} />
                    <View style={styles.sectionContent}>
                        <View style={[styles.settingRow, styles.settingRowLast]}>
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
                                trackColor={{ false: theme.colors.background, true: theme.colors.warning }}
                                thumbColor={theme.colors.text}
                                accessibilityLabel={i18n('debugMode')}
                            />
                        </View>
                    </View>
                </View>

                {/* ===== DANGER ZONE ===== */}
                <View style={styles.sectionContainer}>
                    <SectionHeader styles={styles} icon="⚠️" title={i18n('dangerZone')} color={theme.colors.error} />
                    <View style={styles.sectionContent}>
                        <View style={styles.dangerZoneContainer}>
                            <View style={styles.dangerZoneWarning}>
                                <Text style={styles.dangerZoneWarningIcon}>🚨</Text>
                                <Text style={styles.dangerZoneWarningText}>
                                    {i18n('dangerZoneWarning')}
                                </Text>
                            </View>
                            <PixelButton
                                title={i18n('deleteAllData')}
                                onPress={handleOpenDeleteModal}
                                variant="danger"
                                icon="🗑️"
                                accessibilityLabel={i18n('deleteAllData')}
                            />
                        </View>
                    </View>
                </View>

                {/* ===== APP INFO ===== */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>🥚 Ovo Focus</Text>
                    <Text style={styles.appVersion}>v1.0.0</Text>
                    <Text style={styles.appTagline}>{i18n('tagline')}</Text>
                </View>
            </ScrollView>

            {/* Export Modal */}
            <ExportModal
                visible={showExportModal}
                onClose={() => setShowExportModal(false)}
                language={state.settings.language}
                onDataRestored={() => {
                    // Trigger a reload of the app to reflect restored data
                    Alert.alert(i18n('done'), i18n('importSuccess'));
                }}
            />

            {/* Egg Style Picker Modal */}
            <EggStylePicker
                visible={showEggStylePicker}
                onClose={() => setShowEggStylePicker(false)}
                selectedStyleId={state.settings.selectedEggStyle}
                onSelectStyle={(styleId) => updateUserSettings({ selectedEggStyle: styleId })}
                unlockParams={eggUnlockParams}
                i18n={i18n}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={handleCloseDeleteModal}
            >
                <Pressable
                    style={styles.deleteModalOverlay}
                    onPress={handleCloseDeleteModal}
                >
                    <Pressable
                        style={styles.deleteModalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.deleteModalHeader}>
                            <Text style={styles.deleteModalIcon}>⚠️</Text>
                            <Text style={styles.deleteModalTitle}>{i18n('deleteConfirmTitle')}</Text>
                        </View>

                        <Text style={styles.deleteModalWarning}>
                            {i18n('deleteWarningDetailed')}
                        </Text>

                        <Text style={styles.deleteModalInputLabel}>
                            {i18n('deleteConfirmationType')}
                        </Text>

                        <TextInput
                            style={[
                                styles.deleteModalInput,
                                deleteConfirmText.length > 0 && !isDeleteConfirmValid() && styles.deleteModalInputError,
                            ]}
                            value={deleteConfirmText}
                            onChangeText={setDeleteConfirmText}
                            placeholder={i18n('deleteConfirmationPlaceholder')}
                            placeholderTextColor={theme.colors.textSecondary}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            accessibilityLabel={i18n('deleteConfirmationType')}
                        />

                        {isDeleteConfirmValid() && (
                            <Text style={styles.deleteModalFinalWarning}>
                                {i18n('deleteFinalWarning')}
                            </Text>
                        )}

                        <View style={styles.deleteModalButtons}>
                            <View style={styles.deleteModalButtonWrapper}>
                                <PixelButton
                                    title={i18n('cancel')}
                                    onPress={handleCloseDeleteModal}
                                    variant="secondary"
                                />
                            </View>
                            <View style={styles.deleteModalButtonWrapper}>
                                <PixelButton
                                    title={i18n('delete')}
                                    onPress={handleConfirmDelete}
                                    variant="danger"
                                    disabled={!isDeleteConfirmValid()}
                                />
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Calendar View Modal */}
            <CalendarView
                visible={showCalendarView}
                onClose={() => setShowCalendarView(false)}
                language={state.settings.language}
                focusDuration={state.settings.focusDuration}
            />
        </SafeAreaView>
    );
}
