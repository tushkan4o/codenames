import { useState } from 'react';
import { validateClue } from '../../lib/clueValidator';
import type { CardState } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface ClueInputProps {
  boardCards: CardState[];
  targetCount: number;
  onSubmit: (word: string, number: number) => void;
  submitting?: boolean;
  submitDelay?: number;
  onCancel?: () => void;
  externalError?: string;
}

export default function ClueInput({ boardCards, targetCount, onSubmit, submitting, submitDelay, onCancel, externalError }: ClueInputProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) {
      onCancel?.();
      return;
    }
    const validation = validateClue(word, targetCount, boardCards);
    if (!validation.valid) {
      setError(validation.errorKey ? t.clue[validation.errorKey] : '');
      return;
    }
    setError('');
    onSubmit(word.trim().toUpperCase(), targetCount);
  }

  const displayError = error || externalError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 items-center">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={word}
          onChange={(e) => {
            const filtered = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁ\-]/g, '');
            setWord(filtered);
            setError('');
          }}
          onFocus={() => { setWord(''); setError(''); }}
          placeholder={t.clue.placeholder}
          disabled={submitting}
          className="px-3 h-11 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-board-blue w-44 sm:w-48 placeholder:text-gray-500 focus:placeholder:text-transparent disabled:opacity-50"
        />
        <div className="h-11 px-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg font-bold min-w-[2.5rem] flex items-center justify-center">
          {targetCount}
        </div>
        <button
          type="submit"
          className={`h-11 px-4 sm:px-5 rounded-lg font-bold transition-colors ${
            submitting
              ? 'bg-gray-600 hover:bg-gray-500 text-white btn-submit-reveal'
              : 'bg-board-red hover:brightness-110 text-white'
          }`}
          style={submitting && submitDelay ? { '--submit-duration': `${submitDelay}ms` } as React.CSSProperties : undefined}
        >
          {submitting ? t.rating.cancel : t.clue.submit}
        </button>
      </div>
      {displayError && <p className="text-board-red text-sm">{displayError}</p>}
    </form>
  );
}
