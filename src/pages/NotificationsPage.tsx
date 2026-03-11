import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfileModal } from '../context/ProfileModalContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';

interface ScoreInfo { score: number; correctCount: number; totalTargets: number }

interface NotificationItem {
  id: number;
  type: string;
  actorId: string;
  actorName: string;
  clueId: string;
  clueWord: string;
  clueNumber: number | null;
  scoreInfo: ScoreInfo | null;
  message: string | null;
  createdAt: number;
  read: boolean;
}

const PAGE_SIZE = 50;

const TYPE_OPTIONS = [
  { value: '', label: 'allTypes' },
  { value: 'new_solve', label: 'typeSolve' },
  { value: 'new_comment', label: 'typeComment' },
  { value: 'new_clue', label: 'typeNewClue' },
  { value: 'profile_comment', label: 'typeProfileComment' },
  { value: 'mention', label: 'typeMention' },
] as const;

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month} ${hours}:${mins}`;
}

function typeLabel(type: string, t: ReturnType<typeof import('../i18n/useTranslation').useTranslation>['t']): string {
  switch (type) {
    case 'new_solve': return t.notifications.typeSolve;
    case 'new_comment': return t.notifications.typeComment;
    case 'new_clue': return t.notifications.typeNewClue;
    case 'profile_comment': return t.notifications.typeProfileComment;
    case 'mention': return t.notifications.typeMention;
    default: return type;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openProfile } = useProfileModal();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actorInput, setActorInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const data = await api.getAllNotifications(user.id, {
        offset: currentOffset,
        limit: PAGE_SIZE,
        typeFilter: typeFilter || undefined,
        actorFilter: actorFilter || undefined,
      });
      if (reset) {
        setNotifications(data.notifications);
        setOffset(0);
      } else {
        setNotifications(data.notifications);
      }
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, offset, typeFilter, actorFilter]);

  useEffect(() => {
    fetchNotifications(true);
  }, [user, typeFilter, actorFilter]);

  useEffect(() => {
    if (offset > 0) fetchNotifications();
  }, [offset]);

  function handleLoadMore() {
    setOffset((prev) => prev + PAGE_SIZE);
  }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value);
    setSelectedIds(new Set());
    setOffset(0);
  }

  function handleActorSearch() {
    setActorFilter(actorInput.trim());
    setSelectedIds(new Set());
    setOffset(0);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === notifications.length && notifications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  }

  async function handleDeleteSelected() {
    if (!user || selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await api.deleteNotifications(user.id, Array.from(selectedIds));
      setSelectedIds(new Set());
      fetchNotifications(true);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  function handleNotificationClick(n: NotificationItem) {
    if (n.type === 'profile_comment') {
      navigate('/profile');
    } else if (n.clueId) {
      navigate(`/guess/${n.clueId}`);
    }
  }

  function renderResult(n: NotificationItem): React.ReactNode {
    if (n.type === 'new_solve' && n.scoreInfo) {
      return (
        <>
          <span className="text-white font-bold">{n.scoreInfo.score}</span>
          <span className="text-gray-500 font-normal ml-0.5 text-[0.65rem]">({n.scoreInfo.correctCount}/{n.scoreInfo.totalTargets})</span>
        </>
      );
    }
    if ((n.type === 'new_comment' || n.type === 'mention' || n.type === 'profile_comment') && n.message) {
      return <span className="text-gray-400">{n.message}</span>;
    }
    return null;
  }

  const hasMore = offset + PAGE_SIZE < total;
  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  const clueColWidth = useMemo(() => {
    let max = 6; // minimum chars
    for (const n of notifications) {
      const len = (n.clueWord || '').length + (n.clueNumber != null ? String(n.clueNumber).length + 1 : 0);
      if (len > max) max = len;
    }
    return `${max + 1}ch`;
  }, [notifications]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 pt-4 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-6 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h1 className="text-2xl font-extrabold text-white text-center mb-4">{t.notifications.title}</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={typeFilter}
            onChange={(e) => handleTypeFilterChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-board-blue focus:outline-none"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t.notifications[opt.label]}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleActorSearch(); }}
              placeholder={t.notifications.filterByUser}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-board-blue focus:outline-none w-32"
            />
            {actorFilter && (
              <button
                onClick={() => { setActorInput(''); setActorFilter(''); }}
                className="text-gray-500 hover:text-white text-sm"
              >
                &times;
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {t.notifications.deleteSelected} ({selectedIds.size})
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">{total}</span>
        </div>

        {/* Table */}
        <div className="bg-gray-800/60 border border-gray-700/30 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid gap-x-1 px-2 py-1.5 border-b border-gray-700/50 text-[0.65rem] font-semibold text-gray-500 uppercase" style={{ gridTemplateColumns: `2rem 5.5rem 7rem 7rem ${clueColWidth} 1fr` }}>
            <label className="flex items-center justify-center cursor-pointer" onClick={toggleSelectAll}>
              <div className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center ${allSelected ? 'bg-board-blue/80 border-board-blue' : 'border-gray-600 bg-gray-700/50'}`}>
                {allSelected && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
              </div>
            </label>
            <span>{t.notifications.columnDate}</span>
            <span className="hidden sm:block">{t.notifications.columnUser}</span>
            <span>{t.notifications.columnType}</span>
            <span>{t.notifications.columnClue}</span>
            <span>{t.notifications.columnResult}</span>
          </div>

          {/* Rows */}
          {loading && notifications.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">...</div>
          ) : notifications.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">{t.notifications.noNotifications}</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{ gridTemplateColumns: `2rem 5.5rem 7rem 7rem ${clueColWidth} 1fr` }}
                className={`grid gap-x-1 px-2 py-1.5 border-b border-gray-700/20 hover:bg-gray-700/30 transition-colors items-center text-xs ${!n.read ? 'bg-gray-700/10' : ''}`}
              >
                <label className="flex items-center justify-center cursor-pointer" onClick={() => toggleSelect(n.id)}>
                  <div className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center ${selectedIds.has(n.id) ? 'bg-board-blue/80 border-board-blue' : 'border-gray-600 bg-gray-700/50'}`}>
                    {selectedIds.has(n.id) && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                  </div>
                </label>
                <span className="text-gray-400 text-[0.65rem]">{formatDate(n.createdAt)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); openProfile(n.actorId); }}
                  className="text-board-blue hover:underline truncate text-left hidden sm:block"
                >
                  {n.actorName}
                </button>
                <span className="text-gray-400 truncate">{typeLabel(n.type, t)}</span>
                {n.clueId ? (
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className="whitespace-nowrap text-left font-medium hover:opacity-80"
                  >
                    <span className="text-white">{n.clueWord || '—'}</span>
                    {n.clueNumber != null && <span className="text-amber-400 ml-1">{n.clueNumber}</span>}
                  </button>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
                <span className="break-words text-left">{renderResult(n)}</span>
              </div>
            ))
          )}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="text-center mt-3 mb-6">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {t.notifications.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
