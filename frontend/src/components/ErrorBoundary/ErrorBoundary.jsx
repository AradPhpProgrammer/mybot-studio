import React from 'react';
import { translate as t } from '../../locales/translate.js';

/**
 * Prevents a render error (e.g. a transient data shape issue in a node/user flow)
 * from blanking the whole app. Shows a recovery card instead with a reload button,
 * and logs the error for debugging.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: String(error?.message || error || t('common.unknown_error')) };
  }

  componentDidCatch(error, info) {
    console.error('[MyBot] Render error caught by boundary:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'var(--background, #0b0f19)',
            color: 'var(--foreground, #e5e7eb)',
            fontFamily: 'var(--font-sans, sans-serif)',
          }}
        >
          <div
            style={{
              maxWidth: 460,
              padding: 28,
              borderRadius: 16,
              border: '1px solid var(--border, #222)',
              background: 'var(--surface, #111827)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('common.unexpected_error')}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, wordBreak: 'break-word' }}>
              {this.state.message}
            </div>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: 'var(--accent, #3b82f6)',
                color: 'var(--accent-foreground, #fff)',
                fontWeight: 600,
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}