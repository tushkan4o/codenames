import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';

interface Comment {
  id: number;
  userId: string;
  displayName: string;
  content: string;
  createdAt: number;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CommentThreadProps {
  clueId: string;
}

export default function CommentThread({ clueId }: CommentThreadProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getComments(clueId).then(setComments);
  }, [clueId]);

  async function handleSend() {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    try {
      const result = await api.addComment(clueId, user.id, text.trim());
      setComments((prev) => [{
        id: result.id,
        userId: user.id,
        displayName: user.displayName,
        content: text.trim(),
        createdAt: Date.now(),
      }, ...prev]);
      setText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: number) {
    if (!user?.isAdmin) return;
    try {
      await api.deleteComment(commentId, user.id);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  }

  return (
    <div className="space-y-3">
      {user && (
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.results.commentPlaceholder}
            className="flex-1 px-3 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:border-board-blue focus:outline-none"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-3 py-1.5 rounded bg-board-blue hover:brightness-110 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {t.results.commentSend}
          </button>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center">{t.results.noComments}</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="text-sm group">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">{formatDate(c.createdAt)}</span>
                {user?.isAdmin && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-gray-600 hover:text-board-red text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Удалить"
                  >
                    &times;
                  </button>
                )}
              </div>
              <div>
                <span className="text-board-blue font-semibold">{c.displayName}</span>
                <span className="text-gray-300">: {c.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
