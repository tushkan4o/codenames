import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [sessionExpired] = useState(() => {
    const flag = localStorage.getItem('codenames_session_expired');
    if (flag) localStorage.removeItem('codenames_session_expired');
    return !!flag;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.login.errorEmpty);
      return;
    }
    if (trimmed.length < 2) {
      setError(t.login.errorShort);
      return;
    }
    if (trimmed.length > 20) {
      setError(t.login.errorLong);
      return;
    }
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) {
      setError(t.login.errorChars);
      return;
    }

    try {
      await login(trimmed, needsPassword ? password : undefined);
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'oauth_required') {
        setError(t.login.oauthRequired);
      } else if (msg === 'password_required') {
        setNeedsPassword(true);
        setError('');
      } else if (msg === 'wrong_password') {
        setError(t.login.errorPassword);
      } else if (msg === 'invalid_chars') {
        setError(t.login.errorChars);
      } else {
        setError(msg || 'Ошибка входа');
      }
    }
  }

  async function handleOAuth(provider: 'google' | 'discord') {
    setOauthLoading(provider);
    try {
      const { url } = await api.getOAuthUrl(provider);
      window.location.href = url;
    } catch {
      setError('OAuth error');
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">CODENAMES</h1>
      <p className="text-gray-400 mb-8">{t.login.prompt}</p>

      {sessionExpired && (
        <p className="text-amber-400 text-sm text-center mb-4">Вы вошли с другого устройства</p>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); setNeedsPassword(false); setPassword(''); }}
          placeholder={t.login.placeholder}
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-board-blue mb-3"
        />
        {needsPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder={t.login.password}
            autoFocus
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-board-blue mb-3"
          />
        )}
        {error && <p className="text-board-red text-sm mb-3">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors"
        >
          {t.login.enter}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6 w-full max-w-xs">
        <div className="flex-1 border-t border-gray-700" />
        <span className="text-gray-500 text-sm">{t.oauth.or}</span>
        <div className="flex-1 border-t border-gray-700" />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => handleOAuth('google')}
          disabled={!!oauthLoading}
          className="w-full py-3 rounded-lg bg-white hover:bg-gray-100 text-gray-800 font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {oauthLoading === 'google' ? '...' : t.oauth.loginGoogle}
        </button>
        <button
          onClick={() => handleOAuth('discord')}
          disabled={!!oauthLoading}
          className="w-full py-3 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          {oauthLoading === 'discord' ? '...' : t.oauth.loginDiscord}
        </button>
      </div>
    </div>
  );
}
