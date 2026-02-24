import { useState } from 'react';
import { validateClue } from '../../lib/clueValidator';
import type { CardState } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface ClueInputProps {
  boardCards: CardState[];
  maxNumber: number;
  onSubmit: (word: string, number: number) => void;
}

export default function ClueInput({ boardCards, maxNumber, onSubmit }: ClueInputProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState('');
  const [number, setNumber] = useState(1);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateClue(word, number, boardCards);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }
    setError('');
    onSubmit(word.trim().toUpperCase(), number);
  }

  const numberOptions = Array.from({ length: maxNumber + 1 }, (_, i) => i);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 items-center">
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t.clue.word}</label>
          <input
            type="text"
            value={word}
            onChange={(e) => {
              setWord(e.target.value);
              setError('');
            }}
            placeholder="Enter clue..."
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-blue-500 w-48"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t.clue.number}</label>
          <select
            value={number}
            onChange={(e) => setNumber(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-blue-500"
          >
            {numberOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition-colors"
        >
          {t.clue.submit}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
