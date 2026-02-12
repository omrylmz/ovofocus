/**
 * Offline Queue for Failed Storage Operations
 *
 * This utility handles failed storage operations by queueing them for retry.
 * It persists the queue to AsyncStorage and processes pending operations
 * with exponential backoff.
 *
 * Features:
 * - Queue failed storage operations for retry
 * - Persist queue to AsyncStorage
 * - Automatic retry with exponential backoff
 * - Maximum retry attempts (configurable, default: 5)
 * - Queue processing on demand (app resume/network restore)
 *
 * Usage:
 * import { offlineQueue } from '@/utils/offlineQueue';
 *
 * // Enqueue a failed save operation
 * await offlineQueue.enqueue({
 *     operation: 'save',
 *     key: '@ovofocus/collection',
 *     data: collectionData,
 * });
 *
 * // Process queue (e.g., on app resume)
 * await offlineQueue.processQueue();
 *
 * // Get queue status
 * const status = await offlineQueue.getQueueStatus();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// Constants
const QUEUE_STORAGE_KEY = '@ovofocus/offline_queue';
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_RETRY_INTERVAL_MS = 1000; // 1 second base interval
const MAX_RETRY_INTERVAL_MS = 60000; // Max 60 seconds between retries

/** Supported queue operations */
export type QueueOperation = 'save' | 'delete';

/** Structure of a queued item */
export interface QueueItem {
    /** Unique identifier for this queue item */
    id: string;
    /** Type of storage operation */
    operation: QueueOperation;
    /** AsyncStorage key for the operation */
    key: string;
    /** Data to store (only for save operations) */
    data?: unknown;
    /** ISO timestamp when operation was queued */
    timestamp: string;
    /** Number of retry attempts made */
    retryCount: number;
}

/** Queue status information */
export interface QueueStatus {
    /** Number of items in the queue */
    length: number;
    /** Oldest item in the queue (null if queue is empty) */
    oldestItem: QueueItem | null;
    /** Whether queue processing is currently in progress */
    isProcessing: boolean;
}

/** Configuration options for the offline queue */
export interface OfflineQueueConfig {
    /** Maximum number of retry attempts (default: 5) */
    maxRetries: number;
    /** Base interval for exponential backoff in milliseconds (default: 1000) */
    baseRetryIntervalMs: number;
}

/** Result of processing a single queue item */
interface ProcessResult {
    success: boolean;
    item: QueueItem;
    error?: string;
}

// Create a category-specific logger for offline queue
const queueLogger = logger.createCategoryLogger('OFFLINE_QUEUE');

/**
 * Generates a unique identifier for queue items
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calculates retry interval using exponential backoff
 * @param retryCount - Number of retries already attempted
 * @param baseInterval - Base interval in milliseconds
 * @returns Delay in milliseconds before next retry
 */
function calculateBackoffDelay(retryCount: number, baseInterval: number): number {
    // Exponential backoff: baseInterval * 2^retryCount
    // With jitter to avoid thundering herd
    const exponentialDelay = baseInterval * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.3 * exponentialDelay; // Up to 30% jitter
    const delay = Math.min(exponentialDelay + jitter, MAX_RETRY_INTERVAL_MS);
    return Math.floor(delay);
}

/**
 * Delays execution for a specified duration
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates an offline queue instance
 */
function createOfflineQueue(initialConfig?: Partial<OfflineQueueConfig>) {
    // Configuration with defaults
    let config: OfflineQueueConfig = {
        maxRetries: DEFAULT_MAX_RETRIES,
        baseRetryIntervalMs: DEFAULT_BASE_RETRY_INTERVAL_MS,
        ...initialConfig,
    };

    // Processing state
    let isProcessing = false;

    /**
     * Loads the queue from AsyncStorage
     * Note: This directly uses AsyncStorage to avoid circular dependency with storage.ts
     */
    async function loadQueue(): Promise<QueueItem[]> {
        try {
            const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
            if (!data) {
                return [];
            }
            const parsed = JSON.parse(data);
            // Validate that we got an array
            if (!Array.isArray(parsed)) {
                queueLogger.warn('Invalid queue data format, resetting queue');
                return [];
            }
            return parsed;
        } catch (error) {
            queueLogger.error('Failed to load queue from storage', {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }

    /**
     * Saves the queue to AsyncStorage
     * Note: This directly uses AsyncStorage to avoid circular dependency with storage.ts
     */
    async function saveQueue(queue: QueueItem[]): Promise<boolean> {
        try {
            await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
            return true;
        } catch (error) {
            queueLogger.error('Failed to save queue to storage', {
                error: error instanceof Error ? error.message : String(error),
                queueLength: queue.length,
            });
            return false;
        }
    }

    /**
     * Executes a single storage operation
     */
    async function executeOperation(item: QueueItem): Promise<boolean> {
        try {
            if (item.operation === 'save') {
                if (item.data === undefined) {
                    queueLogger.warn('Save operation missing data', { itemId: item.id, key: item.key });
                    return false;
                }
                await AsyncStorage.setItem(item.key, JSON.stringify(item.data));
                queueLogger.debug('Successfully executed save operation', {
                    key: item.key,
                    itemId: item.id,
                });
            } else if (item.operation === 'delete') {
                await AsyncStorage.removeItem(item.key);
                queueLogger.debug('Successfully executed delete operation', {
                    key: item.key,
                    itemId: item.id,
                });
            } else {
                queueLogger.warn('Unknown operation type', {
                    operation: item.operation,
                    itemId: item.id,
                });
                return false;
            }
            return true;
        } catch (error) {
            queueLogger.error('Failed to execute storage operation', {
                operation: item.operation,
                key: item.key,
                itemId: item.id,
                retryCount: item.retryCount,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * Processes a single queue item with retry logic
     */
    async function processItem(item: QueueItem): Promise<ProcessResult> {
        // Check max retries before attempting execution to avoid head-of-line blocking
        if (item.retryCount >= config.maxRetries) {
            queueLogger.warn('Max retries exceeded, dropping item', {
                itemId: item.id,
                key: item.key,
                operation: item.operation,
                retryCount: item.retryCount,
                maxRetries: config.maxRetries,
            });
            return {
                success: false,
                item,
                error: `Max retries (${config.maxRetries}) exceeded`,
            };
        }

        const success = await executeOperation(item);

        if (success) {
            return { success: true, item };
        }

        return {
            success: false,
            item,
            error: 'Operation failed, will retry',
        };
    }

    return {
        /**
         * Add a failed operation to the queue
         * @param operation - Operation details (type, key, and optionally data)
         * @returns The created queue item
         */
        async enqueue(operation: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<QueueItem> {
            const item: QueueItem = {
                id: generateId(),
                operation: operation.operation,
                key: operation.key,
                data: operation.data,
                timestamp: new Date().toISOString(),
                retryCount: 0,
            };

            const queue = await loadQueue();
            queue.push(item);
            const saved = await saveQueue(queue);

            if (saved) {
                queueLogger.info('Enqueued operation', {
                    itemId: item.id,
                    operation: item.operation,
                    key: item.key,
                    queueLength: queue.length,
                });
            } else {
                queueLogger.error('Failed to persist queue after enqueue', {
                    itemId: item.id,
                });
            }

            return item;
        },

        /**
         * Process all pending operations in the queue
         * Operations are processed sequentially with exponential backoff on failure
         * @returns Number of successfully processed items
         */
        async processQueue(): Promise<number> {
            if (isProcessing) {
                queueLogger.debug('Queue processing already in progress, skipping');
                return 0;
            }

            isProcessing = true;
            let successCount = 0;

            try {
                let queue = await loadQueue();

                if (queue.length === 0) {
                    queueLogger.debug('Queue is empty, nothing to process');
                    return 0;
                }

                queueLogger.info('Starting queue processing', {
                    queueLength: queue.length,
                });

                const remainingItems: QueueItem[] = [];

                for (const item of queue) {
                    const result = await processItem(item);

                    if (result.success) {
                        successCount++;
                    } else if (item.retryCount < config.maxRetries) {
                        // Increment retry count and keep in queue
                        const updatedItem: QueueItem = {
                            ...item,
                            retryCount: item.retryCount + 1,
                        };
                        remainingItems.push(updatedItem);

                        // Apply backoff delay before processing next item
                        const backoffDelay = calculateBackoffDelay(
                            item.retryCount,
                            config.baseRetryIntervalMs
                        );
                        queueLogger.debug('Applying backoff delay', {
                            itemId: item.id,
                            delayMs: backoffDelay,
                            retryCount: item.retryCount + 1,
                        });
                        await delay(backoffDelay);
                    }
                    // If max retries exceeded, item is dropped (not added to remainingItems)
                }

                // Update the queue with remaining items
                await saveQueue(remainingItems);

                queueLogger.info('Queue processing completed', {
                    successCount,
                    remainingItems: remainingItems.length,
                    droppedItems: queue.length - successCount - remainingItems.length,
                });

                return successCount;
            } catch (error) {
                queueLogger.error('Queue processing failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                return successCount;
            } finally {
                isProcessing = false;
            }
        },

        /**
         * Get the current status of the queue
         * @returns Queue status including length and oldest item
         */
        async getQueueStatus(): Promise<QueueStatus> {
            const queue = await loadQueue();

            // Find oldest item by timestamp
            let oldestItem: QueueItem | null = null;
            if (queue.length > 0) {
                oldestItem = queue.reduce((oldest, current) => {
                    return new Date(current.timestamp) < new Date(oldest.timestamp)
                        ? current
                        : oldest;
                });
            }

            return {
                length: queue.length,
                oldestItem,
                isProcessing,
            };
        },

        /**
         * Clear all pending operations from the queue
         * Use with caution - this will permanently remove all queued operations
         */
        async clearQueue(): Promise<void> {
            try {
                await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
                queueLogger.info('Queue cleared');
            } catch (error) {
                queueLogger.error('Failed to clear queue', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        },

        /**
         * Get all items currently in the queue (for debugging/testing)
         * @returns Array of all queue items
         */
        async getQueueItems(): Promise<QueueItem[]> {
            return loadQueue();
        },

        /**
         * Remove a specific item from the queue by ID
         * @param itemId - The ID of the item to remove
         * @returns True if item was found and removed
         */
        async removeItem(itemId: string): Promise<boolean> {
            const queue = await loadQueue();
            const initialLength = queue.length;
            const filteredQueue = queue.filter(item => item.id !== itemId);

            if (filteredQueue.length === initialLength) {
                queueLogger.debug('Item not found in queue', { itemId });
                return false;
            }

            const saved = await saveQueue(filteredQueue);
            if (saved) {
                queueLogger.info('Removed item from queue', { itemId });
            }
            return saved;
        },

        /**
         * Update queue configuration
         * @param updates - Partial configuration updates
         */
        configure(updates: Partial<OfflineQueueConfig>): void {
            config = { ...config, ...updates };
            queueLogger.debug('Queue configuration updated', {
                maxRetries: config.maxRetries,
                baseRetryIntervalMs: config.baseRetryIntervalMs,
            });
        },

        /**
         * Get current queue configuration
         */
        getConfig(): Readonly<OfflineQueueConfig> {
            return { ...config };
        },

        /**
         * Check if queue processing is currently in progress
         */
        isProcessingQueue(): boolean {
            return isProcessing;
        },
    };
}

/** Singleton offline queue instance */
export const offlineQueue = createOfflineQueue();

/** Export createOfflineQueue for testing or custom instances */
export { createOfflineQueue };

/** Type for the offline queue instance */
export type OfflineQueue = ReturnType<typeof createOfflineQueue>;
