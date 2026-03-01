import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import type { AdminClue, Report } from '../lib/api';
import NavBar from '../components/layout/NavBar';

interface ClueStats {
  attempts: number;
  avgScore: number;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [clues, setClues] = useState<AdminClue[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, ClueStats>>({});
  const [reports, setReports] = useState<Record<string, Report[]>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    api.adminGetAllClues(user.id).then(setClues);
  }, [user, navigate]);

  if (!user?.isAdmin) return null;

  async function toggleExpand(clueId: string) {
    if (expandedId === clueId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(clueId);

    if (!stats[clueId]) {
      const clueStats = await api.getClueStats(clueId);
      setStats((prev) => ({ ...prev, [clueId]: clueStats }));
    }
    if (!reports[clueId]) {
      const clueReports = await api.adminGetReports(user!.id, clueId);
      setReports((prev) => ({ ...prev, [clueId]: clueReports }));
    }
  }

  async function handleDelete(clueId: string) {
    await api.adminDeleteClue(user!.id, clueId);
    setClues((prev) => prev.filter((c) => c.id !== clueId));
    setConfirmDeleteId(null);
    setExpandedId(null);
    setDeletedMessage(clueId);
    setTimeout(() => setDeletedMessage(null), 2000);
  }

  const filtered = clues.filter((c) =>
    c.userId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <NavBar showBack />
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-extrabold text-white mb-6 text-center">
          {t.admin.title}
        </h1>

        {deletedMessage && (
          <div className="mb-4 text-center text-green-400 text-sm font-semibold">
            {t.admin.deleted}
          </div>
        )}

        <div className="mb-4">
          <input
            type="text"
            placeholder={t.admin.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="text-sm text-gray-400 mb-2">
          {t.admin.allClues} ({filtered.length})
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-6 gap-2 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
          <span>{t.admin.clueWord}</span>
          <span>{t.admin.clueNumber}</span>
          <span>{t.admin.clueAuthor}</span>
          <span>{t.admin.clueSize}</span>
          <span>{t.admin.clueDate}</span>
          <span>{t.admin.reportsCount}</span>
        </div>

        <div className="space-y-2">
          {filtered.map((clue) => (
            <div key={clue.id}>
              {/* Row */}
              <div
                onClick={() => toggleExpand(clue.id)}
                className={`bg-gray-800/60 border rounded-lg px-4 py-3 cursor-pointer transition-colors hover:border-gray-600 ${
                  expandedId === clue.id
                    ? 'border-gray-500'
                    : 'border-gray-700/30'
                }`}
              >
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
                  <span className="font-bold text-white uppercase">
                    {clue.word}
                  </span>
                  <span className="text-white font-bold">{clue.number}</span>
                  <span className="text-gray-400 text-sm truncate">
                    {clue.userId}
                  </span>
                  <span className="text-gray-400 text-sm">{clue.boardSize}</span>
                  <span className="text-gray-400 text-sm">
                    {new Date(clue.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        clue.reportCount > 0 ? 'text-board-red' : 'text-gray-500'
                      }`}
                    >
                      {clue.reportCount}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(clue.id);
                      }}
                      className="bg-board-red hover:bg-board-red/80 text-white text-xs font-bold px-3 py-1 rounded transition-colors"
                    >
                      {t.admin.deleteClue}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === clue.id && (
                <div className="mt-1 ml-4 mr-2 bg-gray-800/60 border border-gray-700/30 rounded-lg p-4 space-y-4">
                  {/* Stats */}
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">
                      {t.admin.stats}
                    </h3>
                    {stats[clue.id] ? (
                      <div className="flex gap-6">
                        <div>
                          <span className="text-xs text-gray-400">
                            {t.admin.attempts}
                          </span>
                          <p className="text-white font-bold">
                            {stats[clue.id].attempts}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">
                            {t.admin.avgScore}
                          </span>
                          <p className="text-white font-bold">
                            {stats[clue.id].avgScore}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    )}
                  </div>

                  {/* Reports */}
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">
                      {t.admin.reports}
                    </h3>
                    {reports[clue.id] ? (
                      reports[clue.id].length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          {t.admin.noReports}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {reports[clue.id].map((report) => (
                            <div
                              key={report.id}
                              className="bg-gray-900/50 rounded p-3 text-sm"
                            >
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>
                                  {t.admin.reportBy}: {report.userId}
                                </span>
                                <span>
                                  {t.admin.reportDate}:{' '}
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-gray-300">
                                {t.admin.reportReason}: {report.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    )}
                  </div>

                  {/* Delete from expanded view */}
                  <button
                    onClick={() => setConfirmDeleteId(clue.id)}
                    className="bg-board-red hover:bg-board-red/80 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
                  >
                    {t.admin.deleteClue}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700/30 rounded-lg p-6 max-w-sm mx-4">
            <p className="text-white font-bold mb-4">
              {t.admin.confirmDeleteClue}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
              >
                {t.admin.cancel}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="bg-board-red hover:bg-board-red/80 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
              >
                {t.admin.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
