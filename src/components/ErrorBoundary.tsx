import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
}

/**
 * Top-level error boundary. Catches render/commit-phase errors (incl. React
 * #185 "Maximum update depth") so a thrown error inside any descendant does
 * NOT silently blank the entire page. The component stack is logged for
 * diagnostics; the fallback gives the user a way out.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Loud console log so production reports include the offending component
    // path. Replace with a real reporter (Sentry, etc.) when one exists.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught render error:', error, '\nComponent stack:', info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private handleReload = () => {
    // Hard reload bypasses any in-memory caches (KeepAlive) and re-runs auth.
    window.location.reload();
  };

  // Production has no console for the person who hit the error, so the details
  // are shown (collapsed) and copyable — that is how a crash report reaches us.
  private getReport = () => {
    const { error, componentStack } = this.state;
    return [
      `Page: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `Browser: ${navigator.userAgent}`,
      '',
      String(error?.stack ?? error),
      componentStack ? `\nComponent stack:${componentStack}` : '',
    ].join('\n');
  };

  private handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.getReport());
      this.setState({ copied: true });
    } catch {
      // Clipboard can be blocked; the details stay selectable below.
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { copied } = this.state;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fafafa',
          color: '#111',
        }}
      >
        <div style={{ maxWidth: 640, width: '100%' }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ marginBottom: 16, color: '#555' }}>
            The page hit an unexpected error and couldn't render. Reloading usually fixes it.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 16px', border: '1px solid #111', background: '#111', color: '#fff',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Reload page
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '8px 16px', border: '1px solid #ccc', background: '#fff', color: '#111',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Go to home
            </button>
          </div>
          <details style={{ background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Technical details</summary>
            <p style={{ fontSize: 13, color: '#555', margin: '8px 0' }}>
              If this keeps happening, copy these details and send them to the site admin.
            </p>
            <button
              onClick={this.handleCopy}
              style={{
                padding: '6px 12px', border: '1px solid #ccc', background: '#fff', color: '#111',
                borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}
            >
              {copied ? 'Copied' : 'Copy details'}
            </button>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, marginTop: 8, userSelect: 'text' }}>
              {this.getReport()}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
