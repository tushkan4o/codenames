import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a username');
      return;
    }
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    if (trimmed.length > 20) {
      setError('Username must be 20 characters or less');
      return;
    }
    login(trimmed);
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">CODENAMES</h1>
      <p className="text-gray-400 mb-8">Enter your username to start</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder="Username"
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-purple-500 mb-3"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg transition-colors"
        >
          Enter
        </button>
      </form>

      <p className="text-gray-600 text-xs mt-6">
        Discord & Google login coming soon
      </p>
    </div>
  );
}
