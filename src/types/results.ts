/**
 * Generic result types for service operations
 * Provides consistent error handling across all services
 */

// For operations that return data
export type ServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; fallback: T };

// For operations that don't return data (mutations)
export type OperationResult =
    | { success: true }
    | { success: false; error: string };

// For operations that can be unavailable (Expo Go limitations)
export type AvailabilityResult<T> =
    | { available: true; success: true; data: T }
    | { available: true; success: false; error: string; fallback: T }
    | { available: false; reason: string };
