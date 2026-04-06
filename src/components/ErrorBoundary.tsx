// ---------------------------------------------------------------------------
// Error Boundary
// Catches unhandled errors in the React component tree and displays a
// user-friendly fallback instead of a blank screen.
// ---------------------------------------------------------------------------

import React, { Component, ErrorInfo } from 'react';
import Button from './ui/Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Ladle] Uncaught error:', error.message);
    console.error('[Ladle] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>Something went wrong</h1>
            <p>
              An unexpected error occurred. Please try refreshing the page
              or return to the home page.
            </p>
            {this.state.error && (
              <pre className="error-boundary-detail">
                {this.state.error.message}
              </pre>
            )}
            <Button variant="primary" size="lg" onClick={this.handleReset}>
              Return to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
