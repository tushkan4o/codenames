import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';

interface ClueRatingProps {
  onRate: (rating: number) => void;
  onReport: (reason: string) => void;
}

export default function ClueRating({ onRate, onReport }: ClueRatingProps) {
  const { t } = useTranslation();
  const [rated, setRated] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reported, setReported] = useState(false);

  function handleRate(rating: number) {
    setRated(true);
    onRate(rating);
  }

  function handleReport() {
    if (!reportReason.trim()) return;
    onReport(reportReason.trim());
    setReported(true);
    setShowReportInput(false);
  }

  if (rated) {
    return <p className="text-blue-400 text-sm text-center">{t.rating.thanks}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2 mt-3">
      <p className="text-gray-400 text-sm">{t.rating.rateClue}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => handleRate(n)}
            className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition-colors"
          >
            {n}
          </button>
        ))}
      </div>

      {reported ? (
        <p className="text-red-400 text-xs mt-1">{t.rating.reportSent}</p>
      ) : showReportInput ? (
        <div className="flex flex-col items-center gap-2 mt-1 w-full max-w-xs">
          <input
            type="text"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t.rating.reportPlaceholder}
            className="w-full px-3 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:border-red-400 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleReport()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleReport}
              disabled={!reportReason.trim()}
              className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {t.rating.send}
            </button>
            <button
              onClick={() => setShowReportInput(false)}
              className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs transition-colors"
            >
              {t.rating.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowReportInput(true)}
          className="text-xs text-red-400 hover:text-red-300 mt-1"
        >
          {t.rating.report}
        </button>
      )}
    </div>
  );
}
