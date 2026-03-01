import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

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
    await login(trimmed);
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">CODENAMES</h1>
      <p className="text-gray-400 mb-8">{t.login.prompt}</p>

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
          className="w-full py-3 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors"
        >
          {t.login.enter}
        </button>
      </form>

      <p className="text-gray-600 text-xs mt-6">
        {t.login.oauthSoon}
      </p>
    </div>
  );
}
