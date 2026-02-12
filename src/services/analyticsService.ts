// Analytics Service for Ovo Focus
// Privacy-first analytics tracking - no personally identifiable information (PII) collected
// This service provides event tracking, session analytics, and performance metrics
// with an extensible architecture for future analytics provider integration.

import { Rarity } from '../data/animals';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported analytics event names
 * Add new event types here as the app grows
 */
export type AnalyticsEventName =
    | 'session_started'
    | 'session_completed'
    | 'session_failed'
    | 'session_paused'
    | 'session_resumed'
    | 'animal_hatched'
    | 'collection_viewed'
    | 'settings_changed'
    | 'app_opened'
    | 'streak_achieved'
    | 'daily_goal_achieved'
    | 'favorite_toggled'
    | 'onboarding_completed';

/**
 * Event-specific property types for type-safe event tracking
 */
export interface SessionStartedProperties {
    duration_minutes: number;
    is_debug_mode: boolean;
}

export interface SessionCompletedProperties {
    duration_minutes: number;
    pause_count: number;
    total_pause_time_seconds: number;
}

export interface SessionFailedProperties {
    duration_minutes: number;
    elapsed_seconds: number;
    reason: 'gave_up' | 'background_timeout' | 'app_killed';
}

export interface SessionPausedProperties {
    elapsed_seconds: number;
    pause_number: number;
}

export interface SessionResumedProperties {
    pause_duration_seconds: number;
    pause_number: number;
}

export interface AnimalHatchedProperties {
    animal_id: string;
    rarity: Rarity;
    is_new_to_collection: boolean;
    total_collection_count: number;
}

export interface CollectionViewedProperties {
    total_animals: number;
    unique_animals: number;
    filter_applied?: string;
}

export interface SettingsChangedProperties {
    setting_name: string;
    // Value intentionally omitted for privacy - we only track what was changed, not to what
}

export interface AppOpenedProperties {
    is_first_launch: boolean;
    app_version?: string;
    has_restored_session: boolean;
}

export interface StreakAchievedProperties {
    streak_count: number;
    is_new_best: boolean;
}

export interface DailyGoalAchievedProperties {
    goal_count: number;
    sessions_completed_today: number;
}

export interface FavoriteToggledProperties {
    animal_id: string;
    is_favorited: boolean;
}

export interface OnboardingCompletedProperties {
    steps_completed: number;
}

/**
 * Union type for all event properties
 */
export type AnalyticsEventProperties =
    | SessionStartedProperties
    | SessionCompletedProperties
    | SessionFailedProperties
    | SessionPausedProperties
    | SessionResumedProperties
    | AnimalHatchedProperties
    | CollectionViewedProperties
    | SettingsChangedProperties
    | AppOpenedProperties
    | StreakAchievedProperties
    | DailyGoalAchievedProperties
    | FavoriteToggledProperties
    | OnboardingCompletedProperties
    | Record<string, unknown>;

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
    name: AnalyticsEventName;
    properties: AnalyticsEventProperties;
    timestamp: string; // ISO 8601 format
    sessionId: string;
}

/**
 * Session metadata for analytics (privacy-preserving)
 */
export interface AnalyticsSession {
    sessionId: string;
    startTime: string;
    endTime?: string;
    eventCount: number;
}

/**
 * Performance metric types
 */
export interface PerformanceMetric {
    name: string;
    value: number;
    unit: 'ms' | 'seconds' | 'count' | 'bytes';
    timestamp: string;
}

/**
 * Analytics provider interface for extensibility
 * Implement this interface to add new analytics providers (e.g., Firebase, Amplitude)
 */
export interface AnalyticsProvider {
    name: string;
    initialize(): Promise<void>;
    trackEvent(event: AnalyticsEvent): Promise<void>;
    trackPerformance(metric: PerformanceMetric): Promise<void>;
    flush(): Promise<void>;
    isEnabled(): boolean;
}

// ============================================================================
// Analytics Service Implementation
// ============================================================================

/**
 * AnalyticsService - Privacy-first analytics tracking
 *
 * Features:
 * - No PII collection (no user IDs, emails, names, etc.)
 * - In-memory event queue with configurable size
 * - Session tracking with anonymous session IDs
 * - Performance metrics collection
 * - Enable/disable toggle for user privacy control
 * - Extensible provider architecture
 *
 * Usage:
 * ```typescript
 * import { analyticsService } from './analyticsService';
 *
 * // Track an event
 * analyticsService.trackSessionStarted({ duration_minutes: 25, is_debug_mode: false });
 *
 * // Track performance
 * analyticsService.trackPerformance('animation_render', 16, 'ms');
 *
 * // Disable analytics
 * analyticsService.setEnabled(false);
 * ```
 */
class AnalyticsService {
    private enabled: boolean = true;
    private eventQueue: AnalyticsEvent[] = [];
    private performanceQueue: PerformanceMetric[] = [];
    private currentSession: AnalyticsSession | null = null;
    private providers: AnalyticsProvider[] = [];
    private providerFailures: Map<string, number> = new Map();
    private disabledProviders: Set<string> = new Set();

    // Configuration
    private readonly MAX_QUEUE_SIZE = 100;
    private readonly MAX_PROVIDER_FAILURES = 5;
    private readonly MAX_PERFORMANCE_QUEUE_SIZE = 50;

    constructor() {
        this.startNewSession();
    }

    // ========================================================================
    // Session Management
    // ========================================================================

    /**
     * Start a new analytics session
     * Sessions are anonymous and used only for grouping events
     */
    private startNewSession(): void {
        const sessionId = this.generateSessionId();
        this.currentSession = {
            sessionId,
            startTime: new Date().toISOString(),
            eventCount: 0,
        };
    }

    /**
     * Generate an anonymous session ID
     * Uses timestamp + random string for uniqueness without identifying the user
     */
    private generateSessionId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `${timestamp}-${random}`;
    }

    /**
     * Get current session ID
     */
    public getSessionId(): string {
        return this.currentSession?.sessionId ?? this.generateSessionId();
    }

    /**
     * End current session and start a new one
     */
    public endSession(): void {
        if (this.currentSession) {
            this.currentSession.endTime = new Date().toISOString();
        }
        this.startNewSession();
    }

    // ========================================================================
    // Configuration
    // ========================================================================

    /**
     * Enable or disable analytics tracking
     * When disabled, no events are recorded
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            // Clear queues when disabled for privacy
            this.clearQueues();
        }
    }

    /**
     * Check if analytics is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Clear all event and performance queues
     */
    public clearQueues(): void {
        this.eventQueue = [];
        this.performanceQueue = [];
    }

    // ========================================================================
    // Provider Management
    // ========================================================================

    /**
     * Register an analytics provider
     * Providers receive events and can send them to external services
     */
    public registerProvider(provider: AnalyticsProvider): void {
        this.providers.push(provider);
    }

    /**
     * Remove a registered provider
     */
    public removeProvider(providerName: string): void {
        this.providers = this.providers.filter(p => p.name !== providerName);
        this.providerFailures.delete(providerName);
        this.disabledProviders.delete(providerName);
    }

    /**
     * Get list of registered provider names
     */
    public getProviders(): string[] {
        return this.providers.map(p => p.name);
    }

    // ========================================================================
    // Core Event Tracking
    // ========================================================================

    /**
     * Track a generic analytics event
     * @param name - Event name
     * @param properties - Event-specific properties (no PII)
     */
    public track(name: AnalyticsEventName, properties: AnalyticsEventProperties = {}): void {
        if (!this.enabled) return;

        const event: AnalyticsEvent = {
            name,
            properties,
            timestamp: new Date().toISOString(),
            sessionId: this.getSessionId(),
        };

        // Add to queue
        this.eventQueue.push(event);
        if (this.currentSession) {
            this.currentSession.eventCount++;
        }

        // Trim queue if needed
        if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
            this.eventQueue = this.eventQueue.slice(-this.MAX_QUEUE_SIZE);
        }

        // Send to providers
        this.sendToProviders(event);
    }

    /**
     * Send event to all registered providers
     */
    private async sendToProviders(event: AnalyticsEvent): Promise<void> {
        for (const provider of this.providers) {
            if (provider.isEnabled() && !this.disabledProviders.has(provider.name)) {
                try {
                    await provider.trackEvent(event);
                    this.providerFailures.set(provider.name, 0);
                } catch (error) {
                    const failures = (this.providerFailures.get(provider.name) || 0) + 1;
                    this.providerFailures.set(provider.name, failures);
                    console.warn(`[Analytics] Failed to send event to ${provider.name} (${failures}/${this.MAX_PROVIDER_FAILURES}):`, error);
                    if (failures >= this.MAX_PROVIDER_FAILURES) {
                        console.warn(`[Analytics] Provider ${provider.name} disabled after ${this.MAX_PROVIDER_FAILURES} consecutive failures`);
                        this.disabledProviders.add(provider.name);
                    }
                }
            }
        }
    }

    // ========================================================================
    // Typed Event Tracking Methods
    // ========================================================================

    /**
     * Track when a focus session starts
     */
    public trackSessionStarted(properties: SessionStartedProperties): void {
        this.track('session_started', properties);
    }

    /**
     * Track when a focus session is completed successfully
     */
    public trackSessionCompleted(properties: SessionCompletedProperties): void {
        this.track('session_completed', properties);
    }

    /**
     * Track when a focus session fails (give up or background timeout)
     */
    public trackSessionFailed(properties: SessionFailedProperties): void {
        this.track('session_failed', properties);
    }

    /**
     * Track when a session is paused
     */
    public trackSessionPaused(properties: SessionPausedProperties): void {
        this.track('session_paused', properties);
    }

    /**
     * Track when a session is resumed
     */
    public trackSessionResumed(properties: SessionResumedProperties): void {
        this.track('session_resumed', properties);
    }

    /**
     * Track when a new animal is hatched
     */
    public trackAnimalHatched(properties: AnimalHatchedProperties): void {
        this.track('animal_hatched', properties);
    }

    /**
     * Track when collection screen is viewed
     */
    public trackCollectionViewed(properties: CollectionViewedProperties): void {
        this.track('collection_viewed', properties);
    }

    /**
     * Track when settings are changed
     */
    public trackSettingsChanged(properties: SettingsChangedProperties): void {
        this.track('settings_changed', properties);
    }

    /**
     * Track app launch
     */
    public trackAppOpened(properties: AppOpenedProperties): void {
        this.track('app_opened', properties);
    }

    /**
     * Track streak milestones
     */
    public trackStreakAchieved(properties: StreakAchievedProperties): void {
        this.track('streak_achieved', properties);
    }

    /**
     * Track daily goal completion
     */
    public trackDailyGoalAchieved(properties: DailyGoalAchievedProperties): void {
        this.track('daily_goal_achieved', properties);
    }

    /**
     * Track favorite toggle
     */
    public trackFavoriteToggled(properties: FavoriteToggledProperties): void {
        this.track('favorite_toggled', properties);
    }

    /**
     * Track onboarding completion
     */
    public trackOnboardingCompleted(properties: OnboardingCompletedProperties): void {
        this.track('onboarding_completed', properties);
    }

    // ========================================================================
    // Performance Metrics
    // ========================================================================

    /**
     * Track a performance metric
     * @param name - Metric name (e.g., 'animation_render', 'storage_load')
     * @param value - Numeric value
     * @param unit - Unit of measurement
     */
    public trackPerformance(
        name: string,
        value: number,
        unit: 'ms' | 'seconds' | 'count' | 'bytes'
    ): void {
        if (!this.enabled) return;

        const metric: PerformanceMetric = {
            name,
            value,
            unit,
            timestamp: new Date().toISOString(),
        };

        this.performanceQueue.push(metric);

        // Trim queue if needed
        if (this.performanceQueue.length > this.MAX_PERFORMANCE_QUEUE_SIZE) {
            this.performanceQueue = this.performanceQueue.slice(-this.MAX_PERFORMANCE_QUEUE_SIZE);
        }

        // Send to providers
        this.sendPerformanceToProviders(metric);
    }

    /**
     * Send performance metric to all registered providers
     */
    private async sendPerformanceToProviders(metric: PerformanceMetric): Promise<void> {
        for (const provider of this.providers) {
            if (provider.isEnabled() && !this.disabledProviders.has(provider.name)) {
                try {
                    await provider.trackPerformance(metric);
                    this.providerFailures.set(provider.name, 0);
                } catch (error) {
                    const failures = (this.providerFailures.get(provider.name) || 0) + 1;
                    this.providerFailures.set(provider.name, failures);
                    console.warn(`[Analytics] Failed to send metric to ${provider.name} (${failures}/${this.MAX_PROVIDER_FAILURES}):`, error);
                    if (failures >= this.MAX_PROVIDER_FAILURES) {
                        console.warn(`[Analytics] Provider ${provider.name} disabled after ${this.MAX_PROVIDER_FAILURES} consecutive failures`);
                        this.disabledProviders.add(provider.name);
                    }
                }
            }
        }
    }

    /**
     * Measure execution time of an async function
     * @param name - Metric name
     * @param fn - Async function to measure
     * @returns The result of the function
     */
    public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const startTime = Date.now();
        try {
            return await fn();
        } finally {
            const duration = Date.now() - startTime;
            this.trackPerformance(name, duration, 'ms');
        }
    }

    /**
     * Measure execution time of a sync function
     * @param name - Metric name
     * @param fn - Sync function to measure
     * @returns The result of the function
     */
    public measureSync<T>(name: string, fn: () => T): T {
        const startTime = Date.now();
        try {
            return fn();
        } finally {
            const duration = Date.now() - startTime;
            this.trackPerformance(name, duration, 'ms');
        }
    }

    // ========================================================================
    // Queue Access (for debugging/testing)
    // ========================================================================

    /**
     * Get all queued events (for debugging or batch processing)
     */
    public getEventQueue(): AnalyticsEvent[] {
        return [...this.eventQueue];
    }

    /**
     * Get all queued performance metrics
     */
    public getPerformanceQueue(): PerformanceMetric[] {
        return [...this.performanceQueue];
    }

    /**
     * Get current session info
     */
    public getCurrentSession(): AnalyticsSession | null {
        return this.currentSession ? { ...this.currentSession } : null;
    }

    /**
     * Get event count for current session
     */
    public getSessionEventCount(): number {
        return this.currentSession?.eventCount ?? 0;
    }

    // ========================================================================
    // Batch Operations
    // ========================================================================

    /**
     * Flush all queued events to providers
     * Useful for ensuring events are sent before app closes
     */
    public async flush(): Promise<void> {
        for (const provider of this.providers) {
            if (provider.isEnabled()) {
                try {
                    await provider.flush();
                } catch (error) {
                    console.warn(`[Analytics] Failed to flush ${provider.name}:`, error);
                }
            }
        }
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton analytics service instance
 * Use this throughout the app for consistent event tracking
 */
export const analyticsService = new AnalyticsService();

// Default export for convenience
export default analyticsService;
