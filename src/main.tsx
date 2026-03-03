import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ProfileModalProvider } from './context/ProfileModalContext'
import { I18nProvider } from './i18n/I18nContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <ProfileModalProvider>
          <App />
        </ProfileModalProvider>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
