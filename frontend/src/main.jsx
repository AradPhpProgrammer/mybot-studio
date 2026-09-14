import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { I18nProvider } from './locales/i18n.jsx'
import { FontProvider } from './fonts/FontContext.jsx'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <FontProvider>
          <App />
        </FontProvider>
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)