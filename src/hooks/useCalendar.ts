/**
 * useCalendar Hook for Ovo Focus
 *
 * A custom hook that provides easy access to calendar data and functionality.
 * Handles loading states, error states, and refreshing calendar data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    isCalendarAvailable,
    requestCalendarPermissions,
    getTodayEvents,
    getAvailableSlots,
    getCalendars,
    getDefaultCalendar,
    createFocusBlock,
    CalendarEvent,
    TimeSlot,
    CalendarSource,
    CalendarPermissionStatus,
    FocusBlockOptions,
    CreateFocusBlockResult,
} from '../services/calendarService';

interface UseCalendarState {
    /** Whether calendar is available on this device */
    isAvailable: boolean;
    /** Current permission status */
    permissionStatus: CalendarPermissionStatus;
    /** Today's calendar events */
    events: CalendarEvent[];
    /** Available time slots for focus sessions */
    availableSlots: TimeSlot[];
    /** Available calendars on the device */
    calendars: CalendarSource[];
    /** Default calendar for creating events */
    defaultCalendar: CalendarSource | null;
    /** Whether data is currently loading */
    isLoading: boolean;
    /** Error message if any operation failed */
    error: string | null;
}

interface UseCalendarActions {
    /** Request calendar permissions */
    requestPermissions: () => Promise<CalendarPermissionStatus>;
    /** Refresh all calendar data */
    refresh: () => Promise<void>;
    /** Create a focus block in the calendar */
    scheduleFocusBlock: (options: FocusBlockOptions) => Promise<CreateFocusBlockResult>;
    /** Refresh available slots with custom parameters */
    refreshAvailableSlots: (
        minDuration?: number,
        workHoursStart?: number,
        workHoursEnd?: number
    ) => Promise<void>;
}

interface UseCalendarReturn extends UseCalendarState, UseCalendarActions {}

interface UseCalendarOptions {
    /** Automatically load data on mount (default: true) */
    autoLoad?: boolean;
    /** Minimum duration for available slots in minutes (default: 15) */
    minSlotDuration?: number;
    /** Start of work hours for slot calculation (default: 9) */
    workHoursStart?: number;
    /** End of work hours for slot calculation (default: 18) */
    workHoursEnd?: number;
}

/**
 * Hook for accessing calendar data and functionality
 *
 * @example
 * ```tsx
 * const {
 *   isAvailable,
 *   permissionStatus,
 *   events,
 *   availableSlots,
 *   isLoading,
 *   error,
 *   requestPermissions,
 *   refresh,
 *   scheduleFocusBlock,
 * } = useCalendar();
 *
 * // Schedule a focus block
 * const result = await scheduleFocusBlock({
 *   startDate: new Date(),
 *   duration: 25,
 *   title: 'Focus Time',
 * });
 * ```
 */
export function useCalendar(options: UseCalendarOptions = {}): UseCalendarReturn {
    const {
        autoLoad = true,
        minSlotDuration = 15,
        workHoursStart = 9,
        workHoursEnd = 18,
    } = options;

    // H2: Use refs for config to avoid infinite loop in loadCalendarData
    const configRef = useRef({ minSlotDuration, workHoursStart, workHoursEnd });
    useEffect(() => {
        configRef.current = { minSlotDuration, workHoursStart, workHoursEnd };
    });

    // State
    const [isAvailable, setIsAvailable] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<CalendarPermissionStatus>('undetermined');
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [calendars, setCalendars] = useState<CalendarSource[]>([]);
    const [defaultCalendar, setDefaultCalendar] = useState<CalendarSource | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Request permissions
    const requestPermissions = useCallback(async (): Promise<CalendarPermissionStatus> => {
        const status = await requestCalendarPermissions();
        setPermissionStatus(status);
        return status;
    }, []);

    // Refresh available slots
    const refreshAvailableSlots = useCallback(async (
        minDuration: number = minSlotDuration,
        hoursStart: number = workHoursStart,
        hoursEnd: number = workHoursEnd
    ): Promise<void> => {
        try {
            const slots = await getAvailableSlots(new Date(), minDuration, hoursStart, hoursEnd);
            setAvailableSlots(slots);
        } catch (err) {
            console.error('[useCalendar] Error refreshing available slots:', err);
        }
    }, [minSlotDuration, workHoursStart, workHoursEnd]);

    // Load all calendar data
    const loadCalendarData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Check availability
            const available = await isCalendarAvailable();
            setIsAvailable(available);

            if (!available) {
                setPermissionStatus('unavailable');
                setIsLoading(false);
                return;
            }

            // Request permissions
            const status = await requestCalendarPermissions();
            setPermissionStatus(status);

            if (status !== 'granted') {
                setIsLoading(false);
                return;
            }

            // Load calendars
            const cals = await getCalendars();
            setCalendars(cals);

            // Get default calendar
            const defaultCal = await getDefaultCalendar();
            setDefaultCalendar(defaultCal);

            // Load today's events
            const todayEvents = await getTodayEvents();
            setEvents(todayEvents);

            // H2: Use configRef to avoid dependency on config values that may change each render
            const { minSlotDuration: minDur, workHoursStart: whStart, workHoursEnd: whEnd } = configRef.current;
            // Load available slots
            const slots = await getAvailableSlots(
                new Date(),
                minDur,
                whStart,
                whEnd
            );
            setAvailableSlots(slots);
        } catch (err) {
            console.error('[useCalendar] Error loading calendar data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load calendar data');
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh data
    const refresh = useCallback(async (): Promise<void> => {
        await loadCalendarData();
    }, [loadCalendarData]);

    // Schedule focus block
    const scheduleFocusBlock = useCallback(async (
        blockOptions: FocusBlockOptions
    ): Promise<CreateFocusBlockResult> => {
        const result = await createFocusBlock(blockOptions);

        // Refresh data if successful
        if (result.success) {
            await refresh();
        }

        return result;
    }, [refresh]);

    // Auto-load on mount if enabled
    const hasAutoLoadedRef = useRef(false);

    // H3: Reset auto-load flag when config changes so data can be reloaded
    useEffect(() => {
        hasAutoLoadedRef.current = false;
    }, [minSlotDuration, workHoursStart, workHoursEnd]);

    useEffect(() => {
        if (autoLoad && !hasAutoLoadedRef.current) {
            hasAutoLoadedRef.current = true;
            loadCalendarData();
        }
    }, [autoLoad, loadCalendarData, minSlotDuration, workHoursStart, workHoursEnd]);

    return {
        // State
        isAvailable,
        permissionStatus,
        events,
        availableSlots,
        calendars,
        defaultCalendar,
        isLoading,
        error,
        // Actions
        requestPermissions,
        refresh,
        scheduleFocusBlock,
        refreshAvailableSlots,
    };
}

export type { UseCalendarReturn, UseCalendarOptions };
