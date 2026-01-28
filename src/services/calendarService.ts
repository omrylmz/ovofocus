/**
 * Calendar Service for Ovo Focus
 *
 * This service provides calendar integration using expo-calendar.
 * It handles requesting calendar permissions, fetching events from the device,
 * and creating focus block events.
 *
 * Note: Calendar access is not available in Expo Go. This service gracefully
 * handles the case when calendar is unavailable.
 */

import Constants from 'expo-constants';

import { AvailabilityResult } from '../types/results';

// Check if we're running in Expo Go (calendar not fully supported)
const isExpoGo = Constants.appOwnership === 'expo';

// Dynamically import calendar only when not in Expo Go
let Calendar: typeof import('expo-calendar') | null = null;

/**
 * Get the expo-calendar module, loading it dynamically if needed
 */
async function getCalendarModule(): Promise<typeof import('expo-calendar') | null> {
    if (isExpoGo) {
        console.log('[CalendarService] Calendar not available in Expo Go');
        return null;
    }
    if (!Calendar) {
        try {
            Calendar = await import('expo-calendar');
        } catch (error) {
            console.log('[CalendarService] Failed to load calendar module:', error);
            return null;
        }
    }
    return Calendar;
}

/**
 * Permission status for calendar access
 */
export type CalendarPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/**
 * Represents a calendar event from the device
 */
export interface CalendarEvent {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    calendarId: string;
    notes?: string;
    location?: string;
}

/**
 * Represents a time slot available for focus sessions
 */
export interface TimeSlot {
    startTime: Date;
    endTime: Date;
    duration: number; // in minutes
}

/**
 * Represents a calendar source (device calendar)
 */
export interface CalendarSource {
    id: string;
    title: string;
    color?: string;
    isPrimary: boolean;
    allowsModifications: boolean;
}

/**
 * Options for creating a focus block event
 */
export interface FocusBlockOptions {
    title?: string;
    notes?: string;
    startDate: Date;
    duration: number; // in minutes
    calendarId?: string;
}

/**
 * Result of creating a focus block
 */
export interface CreateFocusBlockResult {
    success: boolean;
    eventId?: string;
    error?: string;
}

/**
 * Check if calendar functionality is available
 */
export async function isCalendarAvailable(): Promise<boolean> {
    const cal = await getCalendarModule();
    return cal !== null;
}

/**
 * Request calendar permissions from the user
 * @returns The permission status after requesting
 */
export async function requestCalendarPermissions(): Promise<CalendarPermissionStatus> {
    const cal = await getCalendarModule();
    if (!cal) return 'unavailable';

    try {
        const { status: existingStatus } = await cal.getCalendarPermissionsAsync();

        if (existingStatus === 'granted') {
            return 'granted';
        }

        const { status } = await cal.requestCalendarPermissionsAsync();

        if (status === 'granted') {
            return 'granted';
        } else if (status === 'denied') {
            return 'denied';
        }

        return 'undetermined';
    } catch (error) {
        console.log('[CalendarService] Error requesting permissions:', error);
        return 'unavailable';
    }
}

/**
 * Get the current calendar permission status
 */
export async function getCalendarPermissionStatus(): Promise<CalendarPermissionStatus> {
    const cal = await getCalendarModule();
    if (!cal) return 'unavailable';

    try {
        const { status } = await cal.getCalendarPermissionsAsync();
        if (status === 'granted') return 'granted';
        if (status === 'denied') return 'denied';
        return 'undetermined';
    } catch (error) {
        console.log('[CalendarService] Error getting permission status:', error);
        return 'unavailable';
    }
}

/**
 * Get all available calendars from the device
 */
export async function getCalendars(): Promise<CalendarSource[]> {
    const cal = await getCalendarModule();
    if (!cal) return [];

    try {
        const hasPermission = await requestCalendarPermissions();
        if (hasPermission !== 'granted') return [];

        const calendars = await cal.getCalendarsAsync(cal.EntityTypes.EVENT);

        return calendars.map(calendar => ({
            id: calendar.id,
            title: calendar.title,
            color: calendar.color,
            isPrimary: calendar.isPrimary || false,
            allowsModifications: calendar.allowsModifications,
        }));
    } catch (error) {
        console.log('[CalendarService] Error getting calendars:', error);
        return [];
    }
}

/**
 * Get the default calendar for creating events
 */
export async function getDefaultCalendar(): Promise<CalendarSource | null> {
    const calendars = await getCalendars();

    // Try to find the primary calendar first
    const primaryCalendar = calendars.find(c => c.isPrimary && c.allowsModifications);
    if (primaryCalendar) return primaryCalendar;

    // Otherwise, find any calendar that allows modifications
    const modifiableCalendar = calendars.find(c => c.allowsModifications);
    return modifiableCalendar || null;
}

/**
 * Fetch calendar events for a specific date range
 * @param startDate Start of the date range
 * @param endDate End of the date range
 * @param calendarIds Optional array of calendar IDs to fetch from (fetches all if not provided)
 */
export async function getEvents(
    startDate: Date,
    endDate: Date,
    calendarIds?: string[]
): Promise<CalendarEvent[]> {
    const cal = await getCalendarModule();
    if (!cal) return [];

    try {
        const hasPermission = await requestCalendarPermissions();
        if (hasPermission !== 'granted') return [];

        // Get calendar IDs if not provided
        let ids = calendarIds;
        if (!ids) {
            const calendars = await cal.getCalendarsAsync(cal.EntityTypes.EVENT);
            ids = calendars.map(c => c.id);
        }

        if (ids.length === 0) return [];

        const events = await cal.getEventsAsync(ids, startDate, endDate);

        return events.map(event => ({
            id: event.id,
            title: event.title || 'Untitled',
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            allDay: event.allDay || false,
            calendarId: event.calendarId,
            notes: event.notes,
            location: event.location ?? undefined,
        }));
    } catch (error) {
        console.log('[CalendarService] Error getting events:', error);
        return [];
    }
}

/**
 * Get today's calendar events
 */
export async function getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return getEvents(startOfDay, endOfDay);
}

/**
 * Find available time slots for focus sessions on a given date
 * @param date The date to find available slots for
 * @param minDuration Minimum duration for a slot in minutes (default 15)
 * @param workHoursStart Start of work hours (default 9)
 * @param workHoursEnd End of work hours (default 18)
 */
export async function getAvailableSlots(
    date: Date,
    minDuration: number = 15,
    workHoursStart: number = 9,
    workHoursEnd: number = 18
): Promise<TimeSlot[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workHoursStart, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workHoursEnd, 0, 0);

    // Get events for the day
    const events = await getEvents(startOfDay, endOfDay);

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const availableSlots: TimeSlot[] = [];
    let currentTime = startOfDay;

    for (const event of sortedEvents) {
        // Skip all-day events for slot calculation
        if (event.allDay) continue;

        const eventStart = event.startDate;
        const eventEnd = event.endDate;

        // If there's a gap before this event, add it as an available slot
        if (currentTime < eventStart) {
            const duration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
            if (duration >= minDuration) {
                availableSlots.push({
                    startTime: new Date(currentTime),
                    endTime: new Date(eventStart),
                    duration: Math.floor(duration),
                });
            }
        }

        // Move current time to the end of this event
        if (eventEnd > currentTime) {
            currentTime = new Date(eventEnd);
        }
    }

    // Add remaining time at the end of the day if available
    if (currentTime < endOfDay) {
        const duration = (endOfDay.getTime() - currentTime.getTime()) / (1000 * 60);
        if (duration >= minDuration) {
            availableSlots.push({
                startTime: new Date(currentTime),
                endTime: new Date(endOfDay),
                duration: Math.floor(duration),
            });
        }
    }

    return availableSlots;
}

/**
 * Create a focus block event in the calendar
 * @param options Options for the focus block
 */
export async function createFocusBlock(options: FocusBlockOptions): Promise<CreateFocusBlockResult> {
    const cal = await getCalendarModule();
    if (!cal) {
        return { success: false, error: 'Calendar not available' };
    }

    try {
        const hasPermission = await requestCalendarPermissions();
        if (hasPermission !== 'granted') {
            return { success: false, error: 'Calendar permission not granted' };
        }

        // Get calendar ID
        let calendarId = options.calendarId;
        if (!calendarId) {
            const defaultCalendar = await getDefaultCalendar();
            if (!defaultCalendar) {
                return { success: false, error: 'No writable calendar found' };
            }
            calendarId = defaultCalendar.id;
        }

        // Calculate end date
        const endDate = new Date(options.startDate.getTime() + options.duration * 60 * 1000);

        // Create the event
        const eventId = await cal.createEventAsync(calendarId, {
            title: options.title || 'Ovo Focus Session',
            startDate: options.startDate,
            endDate: endDate,
            notes: options.notes || 'Focus session scheduled via Ovo Focus app',
            alarms: [{ relativeOffset: -5 }], // 5 minute reminder
        });

        return { success: true, eventId };
    } catch (error) {
        console.log('[CalendarService] Error creating focus block:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create event',
        };
    }
}

/**
 * Delete a focus block event from the calendar
 * @param eventId The ID of the event to delete
 */
export async function deleteFocusBlock(eventId: string): Promise<boolean> {
    const cal = await getCalendarModule();
    if (!cal) return false;

    try {
        await cal.deleteEventAsync(eventId);
        return true;
    } catch (error) {
        console.log('[CalendarService] Error deleting event:', error);
        return false;
    }
}

/**
 * Format a time for display
 */
export function formatTime(date: Date, use24Hour: boolean = false): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (use24Hour) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a duration in minutes for display
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get events with explicit success/failure reporting
 */
export async function getEventsSafe(
    startDate: Date,
    endDate: Date,
    calendarIds?: string[]
): Promise<AvailabilityResult<CalendarEvent[]>> {
    const cal = await getCalendarModule();
    if (!cal) {
        return { available: false, reason: 'Calendar not available in Expo Go' };
    }

    try {
        const hasPermission = await requestCalendarPermissions();
        if (hasPermission !== 'granted') {
            return {
                available: true,
                success: false,
                error: 'Calendar permission not granted',
                fallback: []
            };
        }

        let ids = calendarIds;
        if (!ids) {
            const calendars = await cal.getCalendarsAsync(cal.EntityTypes.EVENT);
            ids = calendars.map(c => c.id);
        }

        if (ids.length === 0) {
            return { available: true, success: true, data: [] };
        }

        const events = await cal.getEventsAsync(ids, startDate, endDate);

        const mappedEvents: CalendarEvent[] = events.map(event => ({
            id: event.id,
            title: event.title || 'Untitled',
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            allDay: event.allDay || false,
            calendarId: event.calendarId,
            notes: event.notes,
            location: event.location ?? undefined,
        }));

        return { available: true, success: true, data: mappedEvents };
    } catch (error) {
        console.error('[CalendarService] Error getting events:', error);
        return {
            available: true,
            success: false,
            error: `Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallback: [],
        };
    }
}

/**
 * Get available slots with explicit success/failure reporting
 */
export async function getAvailableSlotsSafe(
    date: Date,
    minDuration: number = 15,
    workHoursStart: number = 9,
    workHoursEnd: number = 18
): Promise<AvailabilityResult<TimeSlot[]>> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workHoursStart, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workHoursEnd, 0, 0);

    const eventsResult = await getEventsSafe(startOfDay, endOfDay);

    if (!eventsResult.available) {
        return eventsResult as AvailabilityResult<TimeSlot[]>;
    }

    if (!eventsResult.success) {
        return {
            available: true,
            success: false,
            error: eventsResult.error,
            fallback: [],
        };
    }

    const events = eventsResult.data;
    const sortedEvents = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const availableSlots: TimeSlot[] = [];
    let currentTime = startOfDay;

    for (const event of sortedEvents) {
        if (event.allDay) continue;

        const eventStart = event.startDate;
        const eventEnd = event.endDate;

        if (currentTime < eventStart) {
            const duration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
            if (duration >= minDuration) {
                availableSlots.push({
                    startTime: new Date(currentTime),
                    endTime: new Date(eventStart),
                    duration: Math.floor(duration),
                });
            }
        }

        if (eventEnd > currentTime) {
            currentTime = new Date(eventEnd);
        }
    }

    if (currentTime < endOfDay) {
        const duration = (endOfDay.getTime() - currentTime.getTime()) / (1000 * 60);
        if (duration >= minDuration) {
            availableSlots.push({
                startTime: new Date(currentTime),
                endTime: new Date(endOfDay),
                duration: Math.floor(duration),
            });
        }
    }

    return { available: true, success: true, data: availableSlots };
}
