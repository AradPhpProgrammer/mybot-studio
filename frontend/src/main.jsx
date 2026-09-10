import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { I18nProvider } from './locales/i18n.jsx'
import { FontProvider } from './fonts/FontContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <FontProvider>
        <App />
      </FontProvider>
    </I18nProvider>
  </React.StrictMode>,
)
