import {
    logger,
    createLogger,
    LogLevel,
    LogContext,
    LoggerConfig,
} from '../logger';

describe('Logger Utility', () => {
    // Store original console methods
    const originalConsoleDebug = console.debug;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    // Mock console methods
    let mockConsoleDebug: jest.Mock;
    let mockConsoleInfo: jest.Mock;
    let mockConsoleWarn: jest.Mock;
    let mockConsoleError: jest.Mock;

    beforeEach(() => {
        // Create fresh mocks for each test
        mockConsoleDebug = jest.fn();
        mockConsoleInfo = jest.fn();
        mockConsoleWarn = jest.fn();
        mockConsoleError = jest.fn();

        console.debug = mockConsoleDebug;
        console.info = mockConsoleInfo;
        console.warn = mockConsoleWarn;
        console.error = mockConsoleError;
    });

    afterEach(() => {
        // Restore original console methods
        console.debug = originalConsoleDebug;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;

        jest.clearAllMocks();
    });

    describe('createLogger', () => {
        it('should create a logger instance with default configuration', () => {
            const testLogger = createLogger();
            const config = testLogger.getConfig();

            expect(config.enabled).toBeDefined();
            expect(config.minLevel).toBeDefined();
            expect(config.includeTimestamp).toBe(true);
            expect(config.includeLevel).toBe(true);
            expect(config.includeCategory).toBe(true);
        });

        it('should create a logger with custom configuration', () => {
            const customConfig: Partial<LoggerConfig> = {
                enabled: true,
                minLevel: 'warn',
                includeTimestamp: false,
            };

            const testLogger = createLogger(customConfig);
            const config = testLogger.getConfig();

            expect(config.enabled).toBe(true);
            expect(config.minLevel).toBe('warn');
            expect(config.includeTimestamp).toBe(false);
        });
    });

    describe('log levels', () => {
        let testLogger: ReturnType<typeof createLogger>;

        beforeEach(() => {
            testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });
        });

        it('should log debug messages using console.debug', () => {
            testLogger.debug('TEST', 'Debug message');

            expect(mockConsoleDebug).toHaveBeenCalled();
            expect(mockConsoleDebug.mock.calls[0][0]).toContain('[DEBUG]');
            expect(mockConsoleDebug.mock.calls[0][0]).toContain('[TEST]');
            expect(mockConsoleDebug.mock.calls[0][0]).toContain('Debug message');
        });

        it('should log info messages using console.info', () => {
            testLogger.info('TEST', 'Info message');

            expect(mockConsoleInfo).toHaveBeenCalled();
            expect(mockConsoleInfo.mock.calls[0][0]).toContain('[INFO]');
            expect(mockConsoleInfo.mock.calls[0][0]).toContain('[TEST]');
            expect(mockConsoleInfo.mock.calls[0][0]).toContain('Info message');
        });

        it('should log warn messages using console.warn', () => {
            testLogger.warn('TEST', 'Warning message');

            expect(mockConsoleWarn).toHaveBeenCalled();
            expect(mockConsoleWarn.mock.calls[0][0]).toContain('[WARN]');
            expect(mockConsoleWarn.mock.calls[0][0]).toContain('[TEST]');
            expect(mockConsoleWarn.mock.calls[0][0]).toContain('Warning message');
        });

        it('should log error messages using console.error', () => {
            testLogger.error('TEST', 'Error message');

            expect(mockConsoleError).toHaveBeenCalled();
            expect(mockConsoleError.mock.calls[0][0]).toContain('[ERROR]');
            expect(mockConsoleError.mock.calls[0][0]).toContain('[TEST]');
            expect(mockConsoleError.mock.calls[0][0]).toContain('Error message');
        });
    });

    describe('log level filtering', () => {
        it('should filter out logs below minimum level', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'warn',
            });

            testLogger.debug('TEST', 'Debug message');
            testLogger.info('TEST', 'Info message');
            testLogger.warn('TEST', 'Warning message');
            testLogger.error('TEST', 'Error message');

            expect(mockConsoleDebug).not.toHaveBeenCalled();
            expect(mockConsoleInfo).not.toHaveBeenCalled();
            expect(mockConsoleWarn).toHaveBeenCalled();
            expect(mockConsoleError).toHaveBeenCalled();
        });

        it('should allow changing minimum level at runtime', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            testLogger.debug('TEST', 'Should appear');
            expect(mockConsoleDebug).toHaveBeenCalledTimes(1);

            testLogger.setMinLevel('error');
            testLogger.debug('TEST', 'Should not appear');
            testLogger.info('TEST', 'Should not appear');
            testLogger.warn('TEST', 'Should not appear');
            testLogger.error('TEST', 'Should appear');

            expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
            expect(mockConsoleInfo).not.toHaveBeenCalled();
            expect(mockConsoleWarn).not.toHaveBeenCalled();
            expect(mockConsoleError).toHaveBeenCalled();
        });
    });

    describe('enable/disable', () => {
        it('should not log when disabled', () => {
            const testLogger = createLogger({
                enabled: false,
                minLevel: 'debug',
            });

            testLogger.debug('TEST', 'Debug message');
            testLogger.info('TEST', 'Info message');
            testLogger.warn('TEST', 'Warning message');
            testLogger.error('TEST', 'Error message');

            expect(mockConsoleDebug).not.toHaveBeenCalled();
            expect(mockConsoleInfo).not.toHaveBeenCalled();
            expect(mockConsoleWarn).not.toHaveBeenCalled();
            expect(mockConsoleError).not.toHaveBeenCalled();
        });

        it('should enable/disable logging at runtime', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            testLogger.info('TEST', 'Should appear');
            expect(mockConsoleInfo).toHaveBeenCalledTimes(1);

            testLogger.disable();
            testLogger.info('TEST', 'Should not appear');
            expect(mockConsoleInfo).toHaveBeenCalledTimes(1);

            testLogger.enable();
            testLogger.info('TEST', 'Should appear again');
            expect(mockConsoleInfo).toHaveBeenCalledTimes(2);
        });
    });

    describe('timestamps', () => {
        it('should include timestamp when configured', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeTimestamp: true,
            });

            testLogger.info('TEST', 'Message with timestamp');

            const logOutput = mockConsoleInfo.mock.calls[0][0];
            // Check for ISO timestamp pattern (brackets around timestamp)
            expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should exclude timestamp when configured', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeTimestamp: false,
            });

            testLogger.info('TEST', 'Message without timestamp');

            const logOutput = mockConsoleInfo.mock.calls[0][0];
            // Should not contain ISO timestamp pattern at the start
            expect(logOutput).not.toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('structured context', () => {
        it('should include context data in log output', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            const context: LogContext = {
                duration: 25,
                mode: 'focus',
                userId: 123,
            };

            testLogger.info('SESSION', 'Session started', context);

            expect(mockConsoleInfo).toHaveBeenCalled();
            // Context should be passed as second argument (formatted JSON)
            const contextOutput = mockConsoleInfo.mock.calls[0][1];
            expect(contextOutput).toContain('duration');
            expect(contextOutput).toContain('25');
            expect(contextOutput).toContain('focus');
        });

        it('should handle nested context objects', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            const context: LogContext = {
                session: {
                    id: 'abc123',
                    settings: {
                        duration: 25,
                        breaks: true,
                    },
                },
            };

            testLogger.info('SESSION', 'Complex context', context);

            expect(mockConsoleInfo).toHaveBeenCalled();
            const contextOutput = mockConsoleInfo.mock.calls[0][1];
            expect(contextOutput).toContain('abc123');
            expect(contextOutput).toContain('duration');
        });

        it('should handle context with arrays', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            const context: LogContext = {
                tags: ['important', 'session', 'timer'],
                values: [1, 2, 3],
            };

            testLogger.info('TEST', 'Array context', context);

            expect(mockConsoleInfo).toHaveBeenCalled();
            const contextOutput = mockConsoleInfo.mock.calls[0][1];
            expect(contextOutput).toContain('important');
            expect(contextOutput).toContain('timer');
        });

        it('should log without context when not provided', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            testLogger.info('TEST', 'No context');

            expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
            // Should only have one argument (the formatted message)
            expect(mockConsoleInfo.mock.calls[0]).toHaveLength(1);
        });
    });

    describe('categories', () => {
        it('should include category in log output', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeCategory: true,
            });

            testLogger.info('SESSION', 'Test message');
            testLogger.warn('STORAGE', 'Another message');

            expect(mockConsoleInfo.mock.calls[0][0]).toContain('[SESSION]');
            expect(mockConsoleWarn.mock.calls[0][0]).toContain('[STORAGE]');
        });

        it('should exclude category when configured', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeCategory: false,
            });

            testLogger.info('SESSION', 'Test message');

            const logOutput = mockConsoleInfo.mock.calls[0][0];
            expect(logOutput).not.toContain('[SESSION]');
        });

        it('should support custom category strings', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            testLogger.info('MY_CUSTOM_CATEGORY', 'Custom category message');

            expect(mockConsoleInfo.mock.calls[0][0]).toContain('[MY_CUSTOM_CATEGORY]');
        });
    });

    describe('createCategoryLogger', () => {
        it('should create a logger with a fixed category', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            const sessionLogger = testLogger.createCategoryLogger('SESSION');

            sessionLogger.debug('Debug from session');
            sessionLogger.info('Info from session');
            sessionLogger.warn('Warn from session');
            sessionLogger.error('Error from session');

            expect(mockConsoleDebug.mock.calls[0][0]).toContain('[SESSION]');
            expect(mockConsoleInfo.mock.calls[0][0]).toContain('[SESSION]');
            expect(mockConsoleWarn.mock.calls[0][0]).toContain('[SESSION]');
            expect(mockConsoleError.mock.calls[0][0]).toContain('[SESSION]');
        });

        it('should support context in category logger', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            const storageLogger = testLogger.createCategoryLogger('STORAGE');

            storageLogger.error('Failed to save', { error: 'Disk full' });

            expect(mockConsoleError.mock.calls[0][0]).toContain('[STORAGE]');
            expect(mockConsoleError.mock.calls[0][1]).toContain('Disk full');
        });
    });

    describe('configure', () => {
        it('should update configuration at runtime', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeTimestamp: true,
            });

            let config = testLogger.getConfig();
            expect(config.includeTimestamp).toBe(true);

            testLogger.configure({
                includeTimestamp: false,
                minLevel: 'warn',
            });

            config = testLogger.getConfig();
            expect(config.includeTimestamp).toBe(false);
            expect(config.minLevel).toBe('warn');
        });

        it('should preserve unmodified config values', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeTimestamp: true,
                includeLevel: true,
                includeCategory: true,
            });

            testLogger.configure({
                minLevel: 'info',
            });

            const config = testLogger.getConfig();
            expect(config.enabled).toBe(true);
            expect(config.includeTimestamp).toBe(true);
            expect(config.includeLevel).toBe(true);
            expect(config.includeCategory).toBe(true);
        });
    });

    describe('singleton logger', () => {
        it('should export a singleton logger instance', () => {
            expect(logger).toBeDefined();
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.configure).toBe('function');
            expect(typeof logger.enable).toBe('function');
            expect(typeof logger.disable).toBe('function');
            expect(typeof logger.setMinLevel).toBe('function');
            expect(typeof logger.getConfig).toBe('function');
            expect(typeof logger.createCategoryLogger).toBe('function');
        });
    });

    describe('format options', () => {
        it('should format output with all options enabled', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeTimestamp: true,
                includeLevel: true,
                includeCategory: true,
            });

            testLogger.info('TEST', 'Full format message');

            const logOutput = mockConsoleInfo.mock.calls[0][0];
            // Should contain timestamp, level, category, and message
            expect(logOutput).toMatch(/\[.*\] \[INFO\] \[TEST\] Full format message/);
        });

        it('should format output with all options disabled', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
                includeTimestamp: false,
                includeLevel: false,
                includeCategory: false,
            });

            testLogger.info('TEST', 'Minimal format message');

            const logOutput = mockConsoleInfo.mock.calls[0][0];
            // Should only contain the message
            expect(logOutput).toBe('Minimal format message');
        });
    });

    describe('edge cases', () => {
        it('should handle empty message', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            testLogger.info('TEST', '');

            expect(mockConsoleInfo).toHaveBeenCalled();
        });

        it('should handle empty category', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            testLogger.info('', 'Message with empty category');

            expect(mockConsoleInfo).toHaveBeenCalled();
            expect(mockConsoleInfo.mock.calls[0][0]).toContain('[]');
        });

        it('should handle undefined context gracefully', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            testLogger.info('TEST', 'Message', undefined);

            expect(mockConsoleInfo).toHaveBeenCalled();
            // Should not have a second argument for context
            expect(mockConsoleInfo.mock.calls[0]).toHaveLength(1);
        });

        it('should handle context with null values', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            const context: LogContext = {
                value: null,
                nested: { inner: null },
            };

            testLogger.info('TEST', 'Null context values', context);

            expect(mockConsoleInfo).toHaveBeenCalled();
            const contextOutput = mockConsoleInfo.mock.calls[0][1];
            expect(contextOutput).toContain('null');
        });

        it('should handle special characters in message', () => {
            const testLogger = createLogger({
                enabled: true,
                minLevel: 'debug',
            });

            const specialMessage = 'Test with "quotes" and \'apostrophes\' and <tags>';
            testLogger.info('TEST', specialMessage);

            expect(mockConsoleInfo).toHaveBeenCalled();
            expect(mockConsoleInfo.mock.calls[0][0]).toContain(specialMessage);
        });
    });
});
