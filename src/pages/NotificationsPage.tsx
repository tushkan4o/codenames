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

const GROUP_ORDER = ['new_solve', 'new_comment', 'reply', 'new_clue', 'profile_comment', 'mention'] as const;

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month} ${hours}:${mins}`;
}

function groupLabel(type: string, t: ReturnType<typeof import('../i18n/useTranslation').useTranslation>['t']): string {
  switch (type) {
    case 'new_solve': return t.notifications.typeSolve;
    case 'new_comment': return t.notifications.typeComment;
    case 'new_clue': return t.notifications.typeNewClue;
    case 'profile_comment': return t.notifications.typeProfileComment;
    case 'mention': return t.notifications.typeMention;
    case 'reply': return t.notifications.typeReply;
    case '__all__': return t.notifications.groupAll;
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const data = await api.getAllNotifications(user.id, {
        offset: currentOffset,
        limit: PAGE_SIZE,
      });
      setNotifications(data.notifications);
      if (reset) setOffset(0);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, offset]);

  useEffect(() => {
    fetchNotifications(true);
  }, [user]);

  useEffect(() => {
    if (offset > 0) fetchNotifications();
  }, [offset]);

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of notifications) {
      const arr = map.get(n.type);
      if (arr) arr.push(n);
      else map.set(n.type, [n]);
    }
    const result: { key: string; items: NotificationItem[] }[] = [];
    for (const type of GROUP_ORDER) {
      const items = map.get(type);
      if (items && items.length > 0) result.push({ key: type, items });
    }
    // Add any unknown types
    for (const [type, items] of map) {
      if (!GROUP_ORDER.includes(type as typeof GROUP_ORDER[number])) {
        result.push({ key: type, items });
      }
    }
    // "Все" group at the bottom
    if (notifications.length > 0) {
      result.push({ key: '__all__', items: notifications });
    }
    return result;
  }, [notifications]);

  function getGroupItems(): NotificationItem[] {
    if (!expandedGroup) return [];
    const g = groups.find((g) => g.key === expandedGroup);
    return g ? g.items : [];
  }

  const expandedItems = getGroupItems();

  const clueColWidth = useMemo(() => {
    let max = 6;
    for (const n of expandedItems) {
      const len = (n.clueWord || '').length + (n.clueNumber != null ? String(n.clueNumber).length + 1 : 0);
      if (len > max) max = len;
    }
    return `${max + 2}ch`;
  }, [expandedItems]);

  function handleLoadMore() {
    setOffset((prev) => prev + PAGE_SIZE);
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
    const ids = expandedItems.map((n) => n.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
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
    if ((n.type === 'new_comment' || n.type === 'mention' || n.type === 'profile_comment' || n.type === 'reply') && n.message) {
      return <span className="text-gray-400">{n.message}</span>;
    }
    return null;
  }

  const hasMore = offset + PAGE_SIZE < total;
  const allGroupSelected = expandedItems.length > 0 && expandedItems.every((n) => selectedIds.has(n.id));

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

        {/* Delete button */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {t.notifications.deleteSelected} ({selectedIds.size})
            </button>
          </div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">...</div>
        ) : notifications.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">{t.notifications.noNotifications}</div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const isExpanded = expandedGroup === group.key;
              return (
                <div key={group.key} className={`bg-gray-800/60 border rounded-xl overflow-hidden transition-colors ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}>
                  {/* Group header */}
                  <button
                    onClick={() => {
                      setExpandedGroup(isExpanded ? null : group.key);
                      setSelectedIds(new Set());
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/30 transition-colors"
                  >
                    <span className="text-sm font-semibold text-white">
                      {groupLabel(group.key, t)}
                      <span className="text-gray-500 font-normal ml-2">{group.items.length}</span>
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div>
                      {/* Table header */}
                      <div
                        className="grid gap-x-1 px-2 py-1.5 border-t border-gray-700/50 text-[0.65rem] font-semibold text-gray-500 uppercase"
                        style={{ gridTemplateColumns: `2rem 5.5rem 7rem ${clueColWidth} 1fr` }}
                      >
                        <label className="flex items-center justify-center cursor-pointer" onClick={toggleSelectAll}>
                          <div className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center ${allGroupSelected ? 'bg-board-blue/80 border-board-blue' : 'border-gray-600 bg-gray-700/50'}`}>
                            {allGroupSelected && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                          </div>
                        </label>
                        <span>{t.notifications.columnDate}</span>
                        <span>{t.notifications.columnUser}</span>
                        <span>{t.notifications.columnClue}</span>
                        <span>{t.notifications.columnResult}</span>
                      </div>

                      {/* Rows */}
                      {expandedItems.map((n) => (
                        <div
                          key={n.id}
                          style={{ gridTemplateColumns: `2rem 5.5rem 7rem ${clueColWidth} 1fr` }}
                          className={`grid gap-x-1 px-2 py-1.5 border-t border-gray-700/20 hover:bg-gray-700/30 transition-colors items-center text-xs ${!n.read ? 'bg-gray-700/10' : ''}`}
                        >
                          <label className="flex items-center justify-center cursor-pointer" onClick={() => toggleSelect(n.id)}>
                            <div className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center ${selectedIds.has(n.id) ? 'bg-board-blue/80 border-board-blue' : 'border-gray-600 bg-gray-700/50'}`}>
                              {selectedIds.has(n.id) && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                            </div>
                          </label>
                          <span className="text-gray-400 text-[0.65rem]">{formatDate(n.createdAt)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); openProfile(n.actorId); }}
                            className="text-board-blue hover:underline truncate text-left"
                          >
                            {n.actorName}
                          </button>
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
