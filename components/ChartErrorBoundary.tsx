import React from 'react';

interface ChartErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    // Avoid crashing the whole page if a chart blows up
    console.error('Chart render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full text-sm text-ch-muted">
          Chart unavailable.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChartErrorBoundary;
