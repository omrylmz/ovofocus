// Quick Actions Service for Ovo Focus
// Provides app shortcuts for quick actions on iOS and Android
// This service gracefully handles cases when quick actions are not available
// (e.g., running in Expo Go or unsupported platforms)

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Language, t } from '../i18n/translations';

// ============================================================================
// Types
// ============================================================================

/**
 * Quick action identifiers for available shortcuts
 */
export type QuickActionId = 'start_session' | 'view_collection' | 'check_stats';

/**
 * Quick action structure for app shortcuts
 */
export interface QuickAction {
    id: QuickActionId;
    title: string;
    subtitle?: string;
    icon?: string;
    params?: Record<string, unknown>;
}

/**
 * Quick action event data received when an action is triggered
 */
export interface QuickActionEvent {
    id: QuickActionId;
    title: string;
    params?: Record<string, unknown>;
}

/**
 * Handler function type for quick action callbacks
 */
export type QuickActionHandler = (actionId: QuickActionId, params?: Record<string, unknown>) => void;

/**
 * Platform support status
 */
export interface QuickActionsSupportStatus {
    isSupported: boolean;
    reason?: string;
    platform: string;
}

// ============================================================================
// Module Detection
// ============================================================================

// Check if we're running in Expo Go (quick actions not supported)
const isExpoGo = Constants.appOwnership === 'expo';

// Dynamic import for expo-quick-actions when available
 
let QuickActions: any = null;

/**
 * Attempt to load the expo-quick-actions module dynamically
 * Returns null if not available (Expo Go, not installed, etc.)
 */
 
async function getQuickActionsModule(): Promise<any | null> {
    if (isExpoGo) {
        console.log('[QuickActions] Not available in Expo Go');
        return null;
    }

    if (QuickActions) {
        return QuickActions;
    }

    try {
        // eslint-disable-next-line import/no-unresolved -- Optional dependency, handled gracefully
        QuickActions = await import('expo-quick-actions');
        return QuickActions;
    } catch (error) {
        console.log('[QuickActions] Module not available:', error);
        return null;
    }
}

// ============================================================================
// Quick Actions Service Implementation
// ============================================================================

/**
 * QuickActionsService - App shortcuts for quick actions
 *
 * Features:
 * - Cross-platform quick action definitions (iOS 3D Touch / Android App Shortcuts)
 * - Graceful fallback when not supported
 * - Localized action titles and subtitles
 * - Action handler registration for routing
 * - Platform support detection
 *
 * Usage:
 * ```typescript
 * import { quickActionsService } from './quickActionsService';
 *
 * // Register actions on app start
 * await quickActionsService.registerQuickActions('en');
 *
 * // Set up handler for when actions are triggered
 * quickActionsService.setActionHandler((actionId) => {
 *     switch (actionId) {
 *         case 'start_session':
 *             // Navigate to home and start session
 *             break;
 *         case 'view_collection':
 *             // Navigate to collection screen
 *             break;
 *         case 'check_stats':
 *             // Navigate to stats screen
 *             break;
 *     }
 * });
 * ```
 */
class QuickActionsService {
    private actionHandler: QuickActionHandler | null = null;
    private registeredActions: QuickAction[] = [];
    private initialized: boolean = false;
    private subscriptionCleanup: (() => void) | null = null;

    // ========================================================================
    // Action Definitions
    // ========================================================================

    /**
     * Get quick action definitions with localized strings
     * @param language - Current app language for localization
     */
    private getActionDefinitions(language: Language): QuickAction[] {
        return [
            {
                id: 'start_session',
                title: t('startFocus', language),
                subtitle: language === 'tr' ? 'Yeni bir odaklanma seansina basla' : 'Begin a new focus session',
                icon: Platform.select({
                    ios: 'symbol:play.circle.fill',
                    android: 'shortcut_start',
                    default: undefined,
                }),
                params: { action: 'start' },
            },
            {
                id: 'view_collection',
                title: t('myCollection', language),
                subtitle: language === 'tr' ? 'Hayvan koleksiyonunu gor' : 'View your animal collection',
                icon: Platform.select({
                    ios: 'symbol:square.grid.2x2.fill',
                    android: 'shortcut_collection',
                    default: undefined,
                }),
                params: { screen: 'collection' },
            },
            {
                id: 'check_stats',
                title: t('statsTitle', language),
                subtitle: language === 'tr' ? 'Istatistiklerini incele' : 'Check your statistics',
                icon: Platform.select({
                    ios: 'symbol:chart.bar.fill',
                    android: 'shortcut_stats',
                    default: undefined,
                }),
                params: { screen: 'stats' },
            },
        ];
    }

    // ========================================================================
    // Platform Support
    // ========================================================================

    /**
     * Check if quick actions are supported on the current platform
     * @returns Support status with details
     */
    public async isQuickActionsSupported(): Promise<QuickActionsSupportStatus> {
        const platform = Platform.OS;

        // Check for Expo Go
        if (isExpoGo) {
            return {
                isSupported: false,
                reason: 'Quick actions are not available in Expo Go. Use a development build.',
                platform,
            };
        }

        // Check for web platform
        if (platform === 'web') {
            return {
                isSupported: false,
                reason: 'Quick actions are not supported on web platform.',
                platform,
            };
        }

        // Try to load the module
        const module = await getQuickActionsModule();
        if (!module) {
            return {
                isSupported: false,
                reason: 'expo-quick-actions module is not installed or failed to load.',
                platform,
            };
        }

        return {
            isSupported: true,
            platform,
        };
    }

    // ========================================================================
    // Registration
    // ========================================================================

    /**
     * Register quick actions with the system
     * Sets up available shortcuts that appear on app icon long-press
     * @param language - Current app language for localized titles
     */
    public async registerQuickActions(language: Language = 'en'): Promise<boolean> {
        const support = await this.isQuickActionsSupported();

        if (!support.isSupported) {
            console.log(`[QuickActions] Not supported: ${support.reason}`);
            return false;
        }

        const module = await getQuickActionsModule();
        if (!module) {
            return false;
        }

        try {
            const actions = this.getActionDefinitions(language);

            // Convert to expo-quick-actions format
            const quickActionsData = actions.map(action => ({
                id: action.id,
                title: action.title,
                subtitle: action.subtitle,
                icon: action.icon,
                params: action.params,
            }));

            // Set the quick actions
            module.setItems(quickActionsData);

            this.registeredActions = actions;
            this.initialized = true;

            console.log(`[QuickActions] Registered ${actions.length} actions`);
            return true;
        } catch (error) {
            console.error('[QuickActions] Failed to register actions:', error);
            return false;
        }
    }

    /**
     * Set up listener for quick action events
     * Should be called early in app lifecycle to catch cold start actions
     */
    public async setupActionListener(): Promise<void> {
        const module = await getQuickActionsModule();
        if (!module) {
            return;
        }

        try {
            // Clean up any existing subscription
            if (this.subscriptionCleanup) {
                this.subscriptionCleanup();
                this.subscriptionCleanup = null;
            }

            // Check for initial action (cold start)
            const initialAction = await module.getInitialAction();
            if (initialAction) {
                console.log('[QuickActions] Initial action detected:', initialAction.id);
                this.dispatchAction(initialAction.id as QuickActionId, initialAction.params);
            }

            // Subscribe to action events (warm start)
            const subscription = module.addListener((action) => {
                if (action) {
                    console.log('[QuickActions] Action received:', action.id);
                    this.dispatchAction(action.id as QuickActionId, action.params);
                }
            });

            // Store cleanup function
            this.subscriptionCleanup = () => {
                subscription.remove();
            };
        } catch (error) {
            console.error('[QuickActions] Failed to setup listener:', error);
        }
    }

    // ========================================================================
    // Action Handling
    // ========================================================================

    /**
     * Set the handler function for quick action events
     * @param handler - Callback function to handle action triggers
     */
    public setActionHandler(handler: QuickActionHandler): void {
        this.actionHandler = handler;
    }

    /**
     * Remove the current action handler
     */
    public removeActionHandler(): void {
        this.actionHandler = null;
    }

    /**
     * Dispatch an action to the registered handler
     * @param actionId - The action identifier
     * @param params - Optional parameters from the action
     */
    private dispatchAction(actionId: QuickActionId, params?: Record<string, unknown>): void {
        if (this.actionHandler) {
            try {
                this.actionHandler(actionId, params);
            } catch (error) {
                console.error('[QuickActions] Error in action handler:', error);
            }
        } else {
            console.warn('[QuickActions] No handler registered for action:', actionId);
        }
    }

    /**
     * Handle a quick action programmatically
     * Useful for testing or manual action triggering
     * @param actionId - The action to handle
     */
    public handleQuickAction(actionId: QuickActionId): void {
        const action = this.registeredActions.find(a => a.id === actionId);
        if (action) {
            this.dispatchAction(actionId, action.params);
        } else {
            // Fallback to dispatching without params if action not found
            this.dispatchAction(actionId);
        }
    }

    // ========================================================================
    // Getters
    // ========================================================================

    /**
     * Get list of all registered quick actions
     */
    public getAvailableActions(): QuickAction[] {
        return [...this.registeredActions];
    }

    /**
     * Check if service has been initialized
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get a specific action by ID
     * @param actionId - The action identifier
     */
    public getAction(actionId: QuickActionId): QuickAction | undefined {
        return this.registeredActions.find(a => a.id === actionId);
    }

    // ========================================================================
    // Cleanup
    // ========================================================================

    /**
     * Clean up resources and listeners
     * Should be called when the service is no longer needed
     */
    public cleanup(): void {
        if (this.subscriptionCleanup) {
            this.subscriptionCleanup();
            this.subscriptionCleanup = null;
        }
        this.actionHandler = null;
        this.registeredActions = [];
        this.initialized = false;
    }

    /**
     * Clear all registered quick actions
     */
    public async clearQuickActions(): Promise<void> {
        const module = await getQuickActionsModule();
        if (module) {
            try {
                module.setItems([]);
                this.registeredActions = [];
                console.log('[QuickActions] Actions cleared');
            } catch (error) {
                console.error('[QuickActions] Failed to clear actions:', error);
            }
        }
    }

    // ========================================================================
    // Language Update
    // ========================================================================

    /**
     * Update quick action titles when language changes
     * @param language - New language setting
     */
    public async updateLanguage(language: Language): Promise<boolean> {
        if (!this.initialized) {
            return false;
        }
        return this.registerQuickActions(language);
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton quick actions service instance
 * Use this throughout the app for consistent quick action management
 */
export const quickActionsService = new QuickActionsService();

// Default export for convenience
export default quickActionsService;
