import { Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import type { CardFontSize } from '../../types/user';

interface SettingsPanelProps {
  mode: 'clue-giving' | 'guessing';
}

const REVEAL_OPTIONS = [
  { value: 500, labelKey: 'fast' as const },
  { value: 1000, labelKey: 'normal' as const },
  { value: 1500, labelKey: 'slow' as const },
  { value: 2000, labelKey: 'verySlow' as const },
];

const FONT_OPTIONS: { value: CardFontSize; labelKey: 'fontSmall' | 'fontMedium' | 'fontLarge' }[] = [
  { value: 'sm', labelKey: 'fontSmall' },
  { value: 'md', labelKey: 'fontMedium' },
  { value: 'lg', labelKey: 'fontLarge' },
];

export default function SettingsPanel({ mode }: SettingsPanelProps) {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const prefs = user.preferences;

  function updatePref<K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) {
    const newPrefs = { ...prefs, [key]: value };
    updateUser({ preferences: newPrefs });
  }

  const btnBase = 'px-2.5 py-1 rounded text-xs font-semibold transition-colors';
  const btnActive = `${btnBase} bg-board-blue text-white`;
  const btnInactive = `${btnBase} bg-gray-700 text-gray-400 hover:text-white`;

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className={`p-1.5 rounded-lg transition-colors ${open ? 'bg-gray-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        title={t.settings.title}
      >
        <Cog6ToothIcon className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-gray-800 border border-gray-700/50 rounded-xl p-4 shadow-xl min-w-[220px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white text-sm font-bold">{t.settings.title}</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {mode === 'guessing' && (
            <div className="mb-3">
              <label className="text-gray-400 text-xs mb-1.5 block">{t.settings.revealDuration}</label>
              <div className="flex gap-1 flex-wrap">
                {REVEAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref('revealDuration', opt.value)}
                    className={prefs.revealDuration === opt.value ? btnActive : btnInactive}
                  >
                    {t.settings[opt.labelKey]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'clue-giving' && (
            <div className="mb-3">
              <label className="text-gray-400 text-xs mb-1.5 block">{t.settings.cardFontSize}</label>
              <div className="flex gap-1">
                {FONT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref('cardFontSize', opt.value)}
                    className={prefs.cardFontSize === opt.value ? btnActive : btnInactive}
                  >
                    {t.settings[opt.labelKey]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
