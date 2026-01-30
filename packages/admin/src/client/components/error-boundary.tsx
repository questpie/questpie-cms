"use client";

import * as React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 *
 * Prevents entire UI from crashing when a component throws an error.
 * Use around widgets, sections, or any component that might fail.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<WidgetError />}>
 *   <ChartWidget config={config} />
 * </ErrorBoundary>
 *
 * // With error callback
 * <ErrorBoundary
 *   fallback={(error) => <p>Error: {error.message}</p>}
 *   onError={(error) => logToService(error)}
 * >
 *   <DashboardWidget config={config} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === "function") {
        return fallback(this.state.error);
      }

      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Something went wrong
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * WidgetErrorBoundary - Specialized error boundary for dashboard widgets
 */
export function WidgetErrorBoundary({
  children,
  widgetType,
}: {
  children: React.ReactNode;
  widgetType?: string;
}) {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Widget Error</p>
          {widgetType && (
            <p className="text-xs text-muted-foreground">Type: {widgetType}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
