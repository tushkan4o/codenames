import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n/I18nContext'

// One-time migration: clear old clues from previous word pack
const MIGRATION_KEY = 'codenames_migration_v2_wordpack';
if (!localStorage.getItem(MIGRATION_KEY)) {
  localStorage.removeItem('codenames_clues');
  localStorage.removeItem('codenames_results');
  localStorage.removeItem('codenames_ratings');
  localStorage.setItem(MIGRATION_KEY, '1');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
