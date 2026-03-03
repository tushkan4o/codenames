import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';

export default function OAuthRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithOAuth } = useAuth();
  const { t } = useTranslation();

  const token = searchParams.get('token') || '';
  const suggestedName = searchParams.get('name') || '';

  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError(t.login.errorEmpty); return; }
    if (trimmed.length < 2) { setError(t.login.errorShort); return; }
    if (trimmed.length > 20) { setError(t.login.errorLong); return; }
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) { setError(t.login.errorChars); return; }

    setLoading(true);
    try {
      const dbUser = await api.completeOAuthRegistration(token, trimmed);
      loginWithOAuth(dbUser);
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'name_taken') setError(t.oauth.errorNameTaken);
      else if (msg === 'Invalid or expired token') setError(t.oauth.errorExpired);
      else setError(msg || 'Ошибка');
      setLoading(false);
    }
  }

  if (!token) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">CODENAMES</h1>
      <p className="text-gray-400 mb-6">{t.oauth.enterName}</p>
      <p className="text-gray-500 text-xs mb-6">{t.oauth.nameHint}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder={t.login.placeholder}
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-board-blue mb-3"
        />
        {error && <p className="text-board-red text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors disabled:opacity-50"
        >
          {loading ? '...' : t.login.enter}
        </button>
      </form>
    </div>
  );
}
