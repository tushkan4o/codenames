import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<{ file: File; preview: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = files.slice(0, 3 - screenshots.length);
    const newItems = allowed.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setScreenshots((prev) => [...prev, ...newItems]);
    e.target.value = '';
  }

  function removeScreenshot(idx: number) {
    setScreenshots((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSubmit() {
    if (!message.trim()) { setError('Опишите проблему'); return; }
    if (!user) return;
    setError('');
    setSending(true);

    try {
      const urls = await Promise.all(
        screenshots.map(async (s) => {
          const { url } = await api.uploadFeedbackScreenshot(user.id, s.file);
          return url;
        }),
      );
      await api.submitFeedback(user.id, message.trim(), urls);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-white font-extrabold text-lg">Обратная связь</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <p className="text-green-400 font-bold text-lg mb-2">Спасибо!</p>
            <p className="text-gray-300 text-sm">Ваш отзыв получен.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-300 space-y-2 mb-5">
              <p><span className="font-bold text-white">Сайт находится в стадии разработки.</span></p>
              <p>Обратная связь очень важна для поиска и исправления ошибок.</p>
              <p>Если вы заметили баг или проблему, пожалуйста, сообщите об этом:</p>
              <ul className="list-none space-y-1 pl-2">
                <li>— через форму обратной связи ниже, или</li>
                <li>— в Discord: <span className="font-bold text-white">@tushkan4o</span></li>
              </ul>
              <p>Опишите проблему в свободной форме. По возможности добавьте <span className="font-bold text-white">скриншоты</span> — это поможет быстрее разобраться и исправить ошибку.</p>
              <p>Также будем рады <span className="font-bold text-white">идеям и предложениям по улучшению сайта</span>.</p>
              <p><span className="font-bold text-white">Спасибо за помощь!</span> 🙌</p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите проблему или предложение..."
              className="w-full bg-gray-900/60 border border-gray-700/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none h-32 mb-3 text-sm"
              maxLength={2000}
            />

            {screenshots.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {screenshots.map((s, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-700">
                    <img src={s.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeScreenshot(i)}
                      className="absolute top-0.5 right-0.5 bg-black/70 rounded-full w-5 h-5 text-white text-xs leading-5 text-center hover:bg-black"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-2">
              {screenshots.length < 3 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    Скриншот
                  </button>
                </>
              )}
              <button
                onClick={handleSubmit}
                disabled={sending}
                className="flex-1 py-2.5 rounded-xl bg-board-blue hover:brightness-110 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {sending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
