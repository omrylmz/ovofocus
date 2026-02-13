/**
 * Structured logging utility for Ovo Focus
 *
 * Features:
 * - Log levels: debug, info, warn, error
 * - Timestamps for each log entry
 * - Structured data (JSON-serializable context)
 * - Automatic disabling in production builds
 * - Category/tag support for filtering
 *
 * Usage:
 * import { logger } from '@/utils/logger';
 * logger.info('SESSION', 'Session started', { duration: 25, mode: 'focus' });
 * logger.error('STORAGE', 'Failed to save', { error: err.message });
 */

/** Supported log levels */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Common log categories used throughout the app */
export type LogCategory =
    | 'SESSION'
    | 'STORAGE'
    | 'NAVIGATION'
    | 'TIMER'
    | 'ANIMATION'
    | 'NOTIFICATION'
    | 'SETTINGS'
    | 'COLLECTION'
    | 'AUDIO'
    | 'GENERAL';

/** JSON-serializable context data for structured logging */
export type LogContext = Record<string, unknown>;

/** Log level priority for filtering */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/** Configuration options for the logger */
export interface LoggerConfig {
    /** Minimum log level to output (default: 'debug' in dev, 'warn' in production) */
    minLevel: LogLevel;
    /** Whether logging is enabled (default: true in dev, false in production) */
    enabled: boolean;
    /** Whether to include timestamps (default: true) */
    includeTimestamp: boolean;
    /** Whether to include log level in output (default: true) */
    includeLevel: boolean;
    /** Whether to include category in output (default: true) */
    includeCategory: boolean;
}

/** Structure of a log entry */
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    context?: LogContext;
}

/**
 * Formats a log entry for console output
 */
function formatLogEntry(entry: LogEntry, config: LoggerConfig): string {
    const parts: string[] = [];

    if (config.includeTimestamp) {
        parts.push(`[${entry.timestamp}]`);
    }

    if (config.includeLevel) {
        parts.push(`[${entry.level.toUpperCase()}]`);
    }

    if (config.includeCategory) {
        parts.push(`[${entry.category}]`);
    }

    parts.push(entry.message);

    return parts.join(' ');
}

/**
 * Formats context data for console output
 */
function formatContext(context: LogContext): string {
    try {
        return JSON.stringify(context, null, 2);
    } catch {
        return '[Unable to serialize context]';
    }
}

/**
 * Gets the current timestamp in ISO format
 */
function getTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Creates a new logger instance
 */
function createLogger(initialConfig?: Partial<LoggerConfig>) {
    // Default configuration based on environment
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
    const defaultConfig: LoggerConfig = {
        minLevel: isDev ? 'debug' : 'warn',
        enabled: isDev,
        includeTimestamp: true,
        includeLevel: true,
        includeCategory: true,
    };

    let config: LoggerConfig = { ...defaultConfig, ...initialConfig };

    /**
     * Core logging function
     */
    function log(
        level: LogLevel,
        category: string,
        message: string,
        context?: LogContext
    ): void {
        // Skip if logging is disabled
        if (!config.enabled) {
            return;
        }

        // Skip if log level is below minimum
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[config.minLevel]) {
            return;
        }

        const entry: LogEntry = {
            timestamp: getTimestamp(),
            level,
            category,
            message,
            context,
        };

        const formattedMessage = formatLogEntry(entry, config);

        // Use appropriate console method based on level
        switch (level) {
            case 'debug':
                if (context) {
                    console.debug(formattedMessage, '\n' + formatContext(context));
                } else {
                    console.debug(formattedMessage);
                }
                break;
            case 'info':
                if (context) {
                    console.info(formattedMessage, '\n' + formatContext(context));
                } else {
                    console.info(formattedMessage);
                }
                break;
            case 'warn':
                if (context) {
                    console.warn(formattedMessage, '\n' + formatContext(context));
                } else {
                    console.warn(formattedMessage);
                }
                break;
            case 'error':
                if (context) {
                    console.error(formattedMessage, '\n' + formatContext(context));
                } else {
                    console.error(formattedMessage);
                }
                break;
        }
    }

    return {
        /**
         * Log a debug message
         * @param category - Log category/tag
         * @param message - Log message
         * @param context - Optional structured context data
         */
        debug(category: string, message: string, context?: LogContext): void {
            log('debug', category, message, context);
        },

        /**
         * Log an info message
         * @param category - Log category/tag
         * @param message - Log message
         * @param context - Optional structured context data
         */
        info(category: string, message: string, context?: LogContext): void {
            log('info', category, message, context);
        },

        /**
         * Log a warning message
         * @param category - Log category/tag
         * @param message - Log message
         * @param context - Optional structured context data
         */
        warn(category: string, message: string, context?: LogContext): void {
            log('warn', category, message, context);
        },

        /**
         * Log an error message
         * @param category - Log category/tag
         * @param message - Log message
         * @param context - Optional structured context data
         */
        error(category: string, message: string, context?: LogContext): void {
            log('error', category, message, context);
        },

        /**
         * Update logger configuration
         * @param updates - Partial configuration updates
         */
        configure(updates: Partial<LoggerConfig>): void {
            config = { ...config, ...updates };
        },

        /**
         * Get current logger configuration
         */
        getConfig(): Readonly<LoggerConfig> {
            return { ...config };
        },

        /**
         * Enable logging
         */
        enable(): void {
            config.enabled = true;
        },

        /**
         * Disable logging
         */
        disable(): void {
            config.enabled = false;
        },

        /**
         * Set minimum log level
         * @param level - Minimum log level to output
         */
        setMinLevel(level: LogLevel): void {
            config.minLevel = level;
        },

        /**
         * Create a child logger with a fixed category
         * @param category - Fixed category for the child logger
         */
        createCategoryLogger(category: string) {
            return {
                debug: (message: string, context?: LogContext) =>
                    log('debug', category, message, context),
                info: (message: string, context?: LogContext) =>
                    log('info', category, message, context),
                warn: (message: string, context?: LogContext) =>
                    log('warn', category, message, context),
                error: (message: string, context?: LogContext) =>
                    log('error', category, message, context),
            };
        },
    };
}

/** Singleton logger instance */
export const logger = createLogger();

/** Export createLogger for testing or custom instances */
export { createLogger };

/** Type for the logger instance */
export type Logger = ReturnType<typeof createLogger>;

/** Type for category-specific logger */
export type CategoryLogger = ReturnType<Logger['createCategoryLogger']>;
