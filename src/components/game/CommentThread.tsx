import { useEffect, useState, useRef, useCallback } from 'react';
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

interface MentionSuggestion {
  id: string;
  displayName: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderContent(content: string, onMentionClick?: (name: string) => void) {
  // Match @mentions — nickname chars without trailing spaces
  const parts = content.split(/(@[\wа-яА-ЯёЁ\-()[\]]+(?:\s[\wа-яА-ЯёЁ\-()[\]]+)*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span
          key={i}
          className="text-amber-400 font-semibold cursor-pointer hover:text-amber-300 transition-colors"
          onClick={(e) => { e.stopPropagation(); onMentionClick?.(part); }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Mention autocomplete state
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.getComments(clueId).then(setComments);
  }, [clueId]);

  const checkMention = useCallback((value: string, cursorPos: number) => {
    // Find @ before cursor
    const before = value.slice(0, cursorPos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1 || (atIdx > 0 && before[atIdx - 1] !== ' ' && before[atIdx - 1] !== '\n')) {
      setShowSuggestions(false);
      return;
    }
    const query = before.slice(atIdx + 1);
    if (query.length < 2) {
      setShowSuggestions(false);
      return;
    }
    setSelectedSuggestion(0);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await api.searchPlayers(query);
        setSuggestions(results.filter((r) => r.id !== user?.id));
        setShowSuggestions(results.length > 0);
      } catch {
        setShowSuggestions(false);
      }
    }, 200);
  }, [user?.id]);

  function insertMention(displayName: string) {
    const input = inputRef.current;
    if (!input) return;
    const cursorPos = input.selectionStart || text.length;
    const before = text.slice(0, cursorPos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1) return;
    const newText = text.slice(0, atIdx) + '@' + displayName + ' ' + text.slice(cursorPos);
    setText(newText);
    setShowSuggestions(false);
    setTimeout(() => {
      const newPos = atIdx + displayName.length + 2;
      input.setSelectionRange(newPos, newPos);
      input.focus();
    }, 0);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setText(value);
    checkMention(value, e.target.selectionStart || value.length);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion((s) => Math.min(s + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion((s) => Math.max(s - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[selectedSuggestion].displayName);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    if (e.key === 'Enter') handleSend();
  }

  function handleNicknameClick(name: string) {
    // Add @nickname to input when clicking on a comment author
    const mention = `@${name} `;
    if (text.endsWith(' ') || text === '') {
      setText(text + mention);
    } else {
      setText(text + ' ' + mention);
    }
    inputRef.current?.focus();
  }

  function handleMentionInContent(mention: string) {
    // When clicking @mention in content, add it to input
    const withSpace = mention + ' ';
    if (text.endsWith(' ') || text === '') {
      setText(text + withSpace);
    } else {
      setText(text + ' ' + withSpace);
    }
    inputRef.current?.focus();
  }

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
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
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
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg max-h-[150px] overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => insertMention(s.displayName)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    i === selectedSuggestion ? 'bg-board-blue/30 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="text-amber-400">@</span>{s.displayName}
                </button>
              ))}
            </div>
          )}
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
                <button
                  onClick={() => user && handleNicknameClick(c.displayName)}
                  className="text-board-blue font-semibold hover:text-blue-300 transition-colors"
                >
                  {c.displayName}
                </button>
                <span className="text-gray-300">: {renderContent(c.content, user ? handleMentionInContent : undefined)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
