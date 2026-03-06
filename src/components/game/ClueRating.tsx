import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';

interface ClueRatingProps {
  clueId: string;
  onRate: (rating: number) => void;
  onReport: (reason: string) => void;
  initialRating?: number | null;
  shareOnly?: boolean;
  disabled?: boolean;
}

export default function ClueRating({ clueId, onRate, onReport, initialRating, shareOnly, disabled }: ClueRatingProps) {
  const { t } = useTranslation();
  const [currentRating, setCurrentRating] = useState<number | null>(initialRating ?? null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [justRated, setJustRated] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reported, setReported] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function handleRate(rating: number) {
    if (disabled) return;
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

  const displayRating = hoverRating ?? currentRating ?? 0;

  return (
    <div className="mt-2">
      {/* Main row: stars on left, buttons on right */}
      <div className="flex items-center justify-between bg-gray-800/40 rounded-lg px-4 py-2.5 border border-gray-700/30">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => !disabled && setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              disabled={disabled}
              className={`text-lg transition-colors ${
                star <= displayRating
                  ? 'text-yellow-400'
                  : 'text-gray-600'
              } ${disabled ? 'cursor-default' : 'cursor-pointer hover:text-yellow-300'}`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {!shareOnly && !disabled && (
            <button
              onClick={() => setShowReportInput(!showReportInput)}
              className="text-gray-500 text-xs hover:text-gray-400 transition-colors"
            >
              {t.rating.report}
            </button>
          )}
          {!disabled && (
            <button
              onClick={handleShare}
              className="text-gray-500 text-xs hover:text-gray-400 transition-colors"
            >
              {shareCopied ? t.rating.copied : t.rating.share}
            </button>
          )}
        </div>
      </div>

      {/* Feedback messages */}
      {justRated && (
        <p className="text-blue-400 text-xs text-center mt-1">{t.rating.thanks}</p>
      )}

      {/* Report input */}
      {showReportInput && !reported && (
        <div className="flex flex-col items-center gap-2 mt-2 w-full">
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
      )}
      {reported && (
        <p className="text-red-400 text-xs text-center mt-1">{t.rating.reportSent}</p>
      )}
    </div>
  );
}
