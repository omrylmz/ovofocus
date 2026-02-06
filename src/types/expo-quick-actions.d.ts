// Type declaration for optional dependency 'expo-quick-actions'
// This package may not be installed (e.g. in Expo Go) and is loaded dynamically.
declare module 'expo-quick-actions' {
    export function setItems(items: Array<Record<string, unknown>>): void;
    export function getInitialAction(): Promise<{
        id: string;
        params?: Record<string, unknown>;
    } | null>;
    export function addListener(
        callback: (action: { id: string; params?: Record<string, unknown> } | null) => void
    ): { remove: () => void };
}
