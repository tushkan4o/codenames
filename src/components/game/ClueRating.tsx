import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { ExclamationTriangleIcon, ShareIcon } from '@heroicons/react/24/outline';

interface ClueRatingProps {
  clueId: string;
  onRate: (rating: number) => void;
  onReport: (reason: string) => void;
  initialRating?: number | null;
}

export default function ClueRating({ clueId, onRate, onReport, initialRating }: ClueRatingProps) {
  const { t } = useTranslation();
  const [currentRating, setCurrentRating] = useState<number | null>(initialRating ?? null);
  const [justRated, setJustRated] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reported, setReported] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function handleRate(rating: number) {
    setCurrentRating(rating);
    setJustRated(true);
    onRate(rating);
    setTimeout(() => setJustRated(false), 1500);
  }

  function handleReport() {
    if (!reportReason.trim()) return;
    onReport(reportReason.trim());
    setReported(true);
    setShowReportInput(false);
  }

  async function handleShare() {
    const url = `${window.location.origin}/guess/${clueId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 mt-3">
      {justRated ? (
        <p className="text-blue-400 text-sm">{t.rating.thanks}</p>
      ) : (
        <>
          <p className="text-gray-400 text-sm">{t.rating.rateClue}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleRate(n)}
                className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                  currentRating === n
                    ? 'bg-board-blue text-white ring-2 ring-board-blue/50'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

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
        <div className="flex items-center gap-4 mt-1">
          <button
            onClick={() => setShowReportInput(true)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            {t.rating.report}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            {shareCopied ? t.rating.copied : t.rating.share}
          </button>
        </div>
      )}
    </div>
  );
}
