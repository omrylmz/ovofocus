import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { Language } from '../i18n/translations';

interface ErrorBoundaryProps {
    children: ReactNode;
    language?: Language;
    /**
     * Optional callback when an error is caught.
     * Can be used for error reporting/analytics.
     */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /**
     * Optional custom fallback component.
     * If not provided, the default ErrorFallback will be used.
     */
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary - React Error Boundary for catching JavaScript errors in child component tree
 *
 * This class component implements React's error boundary pattern to:
 * - Catch JavaScript errors anywhere in the child component tree
 * - Log error information for debugging
 * - Display a user-friendly fallback UI instead of crashing the entire app
 * - Provide a way to recover by resetting the error state
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary language="en" onError={(error, info) => logToService(error, info)}>
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 *
 * Note: Error boundaries do NOT catch errors in:
 * - Event handlers (use regular try/catch)
 * - Asynchronous code (setTimeout, requestAnimationFrame, etc.)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    /**
     * Static lifecycle method called when an error is thrown in a descendant component.
     * Updates state so the next render shows the fallback UI.
     */
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    /**
     * Lifecycle method called after an error has been thrown by a descendant component.
     * Used for logging error information.
     */
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error details for debugging
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Error info:', errorInfo.componentStack);

        // Call optional error callback for external logging/analytics
        this.props.onError?.(error, errorInfo);
    }

    /**
     * Resets the error state, allowing the component tree to attempt re-rendering.
     */
    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { children, language = 'en', fallback } = this.props;

        if (hasError && error) {
            // If a custom fallback is provided, use it
            if (fallback) {
                return fallback;
            }

            // Otherwise, use the default ErrorFallback component
            return (
                <ErrorFallback
                    error={error}
                    onReset={this.handleReset}
                    language={language}
                />
            );
        }

        return children;
    }
}

export default ErrorBoundary;
