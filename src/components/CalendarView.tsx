/**
 * CalendarView - Calendar integration component for scheduling focus sessions
 *
 * Shows today's schedule with existing events and available time slots
 * for focus sessions. Allows users to schedule focus blocks.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../styles/theme';
import { PixelButton } from './PixelButton';
import {
    isCalendarAvailable,
    requestCalendarPermissions,
    getTodayEvents,
    getAvailableSlots,
    createFocusBlock,
    CalendarEvent,
    TimeSlot,
    CalendarPermissionStatus,
    formatTime,
    formatDuration,
} from '../services/calendarService';
import { Language, t, TranslationKey } from '../i18n/translations';

interface CalendarViewProps {
    visible: boolean;
    onClose: () => void;
    language?: Language;
    focusDuration?: number; // Default focus duration in minutes
}

type ViewState = 'loading' | 'permission_required' | 'unavailable' | 'ready' | 'error';

// Create dynamic styles based on current theme
const createStyles = (theme: Theme) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdropPressable: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.large,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceLight,
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textSecondary,
    },
    content: {
        padding: theme.spacing.md,
    },
    scrollContent: {
        paddingBottom: theme.spacing.lg,
    },
    // Loading and state screens
    centerContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stateIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.md,
    },
    stateTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    stateMessage: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    // Date header
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    dateIcon: {
        fontSize: 24,
    },
    dateText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
    },
    // Section styles
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    sectionIcon: {
        fontSize: 18,
    },
    sectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
    },
    sectionSubtitle: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.sm,
    },
    // Event card
    eventCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        alignItems: 'center',
    },
    eventTimeContainer: {
        width: 70,
        marginRight: theme.spacing.sm,
    },
    eventTime: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.text,
    },
    eventEndTime: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    eventDetails: {
        flex: 1,
    },
    eventTitle: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.text,
    },
    eventLocation: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    eventIndicator: {
        width: 4,
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
        marginRight: theme.spacing.sm,
    },
    // Available slot card
    slotCard: {
        backgroundColor: 'rgba(78, 205, 196, 0.15)',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
        borderStyle: 'dashed',
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    slotCardSelected: {
        backgroundColor: 'rgba(78, 205, 196, 0.3)',
        borderStyle: 'solid',
    },
    slotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    slotTime: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.secondary,
    },
    slotDuration: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.surfaceLight,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    slotAction: {
        marginTop: theme.spacing.sm,
    },
    // Empty state
    emptyState: {
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    emptyIcon: {
        fontSize: 32,
        marginBottom: theme.spacing.sm,
    },
    emptyText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Scheduled confirmation
    successContainer: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    successText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.success,
        fontWeight: theme.fontWeight.medium,
    },
    // All day event
    allDayBadge: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.accent,
        backgroundColor: 'rgba(255, 230, 109, 0.2)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
});

export function CalendarView({
    visible,
    onClose,
    language = 'en',
    focusDuration = 25,
}: CalendarViewProps) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [viewState, setViewState] = useState<ViewState>('loading');
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledSuccess, setScheduledSuccess] = useState(false);

    // Animation values
    const backgroundOpacity = useSharedValue(0);
    const modalScale = useSharedValue(0.9);
    const modalOpacity = useSharedValue(0);

    // Helper to get translations
    const i18n = (key: TranslationKey): string => t(key, language);

    // Animate modal on visibility change
    useEffect(() => {
        if (visible) {
            backgroundOpacity.value = withTiming(1, { duration: 200 });
            modalScale.value = withSpring(1, { damping: 15 });
            modalOpacity.value = withTiming(1, { duration: 200 });
            loadCalendarData();
        } else {
            backgroundOpacity.value = withTiming(0, { duration: 150 });
            modalScale.value = withTiming(0.9, { duration: 150 });
            modalOpacity.value = withTiming(0, { duration: 150 });
            // Reset state when closing
            setSelectedSlot(null);
            setScheduledSuccess(false);
        }
    }, [visible]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
        transform: [{ scale: modalScale.value }],
        opacity: modalOpacity.value,
    }));

    // Load calendar data
    const loadCalendarData = useCallback(async () => {
        setViewState('loading');

        // Check if calendar is available
        const available = await isCalendarAvailable();
        if (!available) {
            setViewState('unavailable');
            return;
        }

        // Request permissions
        const permission = await requestCalendarPermissions();
        if (permission !== 'granted') {
            setViewState('permission_required');
            return;
        }

        try {
            // Fetch today's events and available slots
            const todayEvents = await getTodayEvents();
            const slots = await getAvailableSlots(new Date(), focusDuration);

            setEvents(todayEvents);
            setAvailableSlots(slots);
            setViewState('ready');
        } catch (error) {
            console.error('[CalendarView] Error loading calendar data:', error);
            setViewState('error');
        }
    }, [focusDuration]);

    // Handle scheduling a focus block
    const handleScheduleFocusBlock = async (slot: TimeSlot) => {
        setIsScheduling(true);
        setSelectedSlot(slot);

        const result = await createFocusBlock({
            title: language === 'tr' ? 'Ovo Focus Odaklanma' : 'Ovo Focus Session',
            notes: language === 'tr'
                ? 'Ovo Focus uygulamasindan planlanmis odaklanma seansi'
                : 'Focus session scheduled from Ovo Focus app',
            startDate: slot.startTime,
            duration: focusDuration,
        });

        setIsScheduling(false);

        if (result.success) {
            setScheduledSuccess(true);
            setTimeout(() => {
                setScheduledSuccess(false);
                loadCalendarData(); // Refresh to show the new event
            }, 2000);
        } else {
            Alert.alert(
                i18n('errorTitle'),
                result.error || i18n('errorMessage'),
                [{ text: 'OK' }]
            );
        }
    };

    // Format today's date
    const todayFormatted = useMemo(() => {
        const today = new Date();
        return today.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });
    }, [language]);

    // Render permission required state
    const renderPermissionRequired = () => (
        <View style={styles.centerContainer}>
            <Text style={styles.stateIcon}>*</Text>
            <Text style={styles.stateTitle}>
                {language === 'tr' ? 'Takvim Erişimi Gerekli' : 'Calendar Access Required'}
            </Text>
            <Text style={styles.stateMessage}>
                {language === 'tr'
                    ? 'Odaklanma bloklarini planlamak icin takvim erisimi gereklidir.'
                    : 'Calendar access is needed to schedule focus blocks.'}
            </Text>
            <PixelButton
                title={language === 'tr' ? 'Izin Ver' : 'Grant Permission'}
                onPress={loadCalendarData}
                variant="primary"
            />
        </View>
    );

    // Render unavailable state
    const renderUnavailable = () => (
        <View style={styles.centerContainer}>
            <Text style={styles.stateIcon}>*</Text>
            <Text style={styles.stateTitle}>
                {language === 'tr' ? 'Takvim Mevcut Degil' : 'Calendar Not Available'}
            </Text>
            <Text style={styles.stateMessage}>
                {language === 'tr'
                    ? 'Takvim entegrasyonu bu cihazda mevcut degil. Lutfen uygulamayi bir cihazda calistirin.'
                    : 'Calendar integration is not available on this device. Please try running on a physical device.'}
            </Text>
        </View>
    );

    // Render error state
    const renderError = () => (
        <View style={styles.centerContainer}>
            <Text style={styles.stateIcon}>*</Text>
            <Text style={styles.stateTitle}>{i18n('errorTitle')}</Text>
            <Text style={styles.stateMessage}>{i18n('errorMessage')}</Text>
            <PixelButton
                title={i18n('retry')}
                onPress={loadCalendarData}
                variant="primary"
            />
        </View>
    );

    // Render loading state
    const renderLoading = () => (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.stateMessage, { marginTop: theme.spacing.md }]}>
                {i18n('loadingMessage')}
            </Text>
        </View>
    );

    // Render calendar content
    const renderCalendarContent = () => (
        <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Date Header */}
            <View style={styles.dateHeader}>
                <Text style={styles.dateIcon}>*</Text>
                <Text style={styles.dateText}>{todayFormatted}</Text>
            </View>

            {/* Today's Events */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>*</Text>
                    <Text style={styles.sectionTitle}>
                        {language === 'tr' ? 'Bugunku Etkinlikler' : "Today's Events"}
                    </Text>
                    <Text style={styles.sectionSubtitle}>({events.length})</Text>
                </View>

                {events.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>*</Text>
                        <Text style={styles.emptyText}>
                            {language === 'tr'
                                ? 'Bugun planlanmis etkinlik yok'
                                : 'No events scheduled for today'}
                        </Text>
                    </View>
                ) : (
                    events.map(event => (
                        <View key={event.id} style={styles.eventCard}>
                            <View style={styles.eventIndicator} />
                            <View style={styles.eventTimeContainer}>
                                {event.allDay ? (
                                    <Text style={styles.allDayBadge}>
                                        {language === 'tr' ? 'Tum Gun' : 'All Day'}
                                    </Text>
                                ) : (
                                    <>
                                        <Text style={styles.eventTime}>
                                            {formatTime(event.startDate)}
                                        </Text>
                                        <Text style={styles.eventEndTime}>
                                            {formatTime(event.endDate)}
                                        </Text>
                                    </>
                                )}
                            </View>
                            <View style={styles.eventDetails}>
                                <Text style={styles.eventTitle} numberOfLines={1}>
                                    {event.title}
                                </Text>
                                {event.location && (
                                    <Text style={styles.eventLocation} numberOfLines={1}>
                                        * {event.location}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Available Time Slots */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>*</Text>
                    <Text style={styles.sectionTitle}>
                        {language === 'tr' ? 'Uygun Zaman Dilimleri' : 'Available Time Slots'}
                    </Text>
                    <Text style={styles.sectionSubtitle}>({availableSlots.length})</Text>
                </View>

                {availableSlots.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>*</Text>
                        <Text style={styles.emptyText}>
                            {language === 'tr'
                                ? 'Bugun uygun zaman dilimi yok'
                                : 'No available time slots today'}
                        </Text>
                    </View>
                ) : (
                    availableSlots.map((slot, index) => (
                        <Pressable
                            key={index}
                            style={[
                                styles.slotCard,
                                selectedSlot === slot && styles.slotCardSelected,
                            ]}
                            onPress={() => setSelectedSlot(slot)}
                        >
                            <View style={styles.slotHeader}>
                                <Text style={styles.slotTime}>
                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                </Text>
                                <Text style={styles.slotDuration}>
                                    {formatDuration(slot.duration)}
                                </Text>
                            </View>
                            {selectedSlot === slot && (
                                <View style={styles.slotAction}>
                                    <PixelButton
                                        title={
                                            language === 'tr'
                                                ? `${focusDuration} dk Odaklanma Planla`
                                                : `Schedule ${focusDuration}min Focus`
                                        }
                                        onPress={() => handleScheduleFocusBlock(slot)}
                                        variant="primary"
                                        size="small"
                                        disabled={isScheduling}
                                    />
                                </View>
                            )}
                        </Pressable>
                    ))
                )}
            </View>

            {/* Success message */}
            {scheduledSuccess && (
                <View style={styles.successContainer}>
                    <Text style={styles.successText}>
                        * {language === 'tr' ? 'Odaklanma blogu planlandi!' : 'Focus block scheduled!'}
                    </Text>
                </View>
            )}
        </ScrollView>
    );

    // Render content based on state
    const renderContent = () => {
        switch (viewState) {
            case 'loading':
                return renderLoading();
            case 'permission_required':
                return renderPermissionRequired();
            case 'unavailable':
                return renderUnavailable();
            case 'error':
                return renderError();
            case 'ready':
                return renderCalendarContent();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.overlay, backgroundStyle]}>
                <Pressable style={styles.backdropPressable} onPress={onClose} />
                <Animated.View style={[styles.modalContainer, modalStyle]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            * {language === 'tr' ? 'Takvim' : 'Calendar'}
                        </Text>
                        <Pressable
                            onPress={onClose}
                            style={styles.closeButton}
                            accessibilityLabel={language === 'tr' ? 'Kapat' : 'Close'}
                            accessibilityHint={
                                language === 'tr'
                                    ? 'Takvim gorunumunu kapatir'
                                    : 'Closes the calendar view'
                            }
                            accessibilityRole="button"
                        >
                            <Text style={styles.closeButtonText}>X</Text>
                        </Pressable>
                    </View>

                    {renderContent()}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
