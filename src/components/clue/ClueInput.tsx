import { useState } from 'react';
import { validateClue } from '../../lib/clueValidator';
import type { CardState } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface ClueInputProps {
  boardCards: CardState[];
  targetCount: number;
  onSubmit: (word: string, number: number) => void;
}

export default function ClueInput({ boardCards, targetCount, onSubmit }: ClueInputProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateClue(word, targetCount, boardCards);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }
    setError('');
    onSubmit(word.trim().toUpperCase(), targetCount);
  }

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
            placeholder="..."
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-board-blue w-44 sm:w-48"
          />
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg font-bold min-w-[2.5rem] text-center">
          {targetCount}
        </div>
        <button
          type="submit"
          className="px-4 sm:px-5 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold transition-colors"
        >
          {t.clue.submit}
        </button>
      </div>
      {error && <p className="text-board-red text-sm">{error}</p>}
    </form>
  );
}
