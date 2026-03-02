import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import type { BoardSize } from '../types/game';

type Tab = 'spymasters' | 'guessers' | 'clues';
type SizeFilter = 'all' | BoardSize;
type SortDir = 'asc' | 'desc';

interface SpymasterEntry {
  userId: string;
  cluesGiven: number;
  avgWordsPerClue: number;
  avgScoreOnClues: number;
}

interface GuesserEntry {
  userId: string;
  cluesSolved: number;
  avgWordsPicked: number;
  avgScore: number;
}

interface ClueStatEntry {
  id: string;
  word: string;
  number: number;
  userId: string;
  attempts: number;
  avgScore: number;
}

const PAGE_SIZE = 10;

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-4">
      <button onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-xs sm:text-sm font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors">&lsaquo;</button>
      <span className="text-gray-500 text-xs sm:text-sm py-1">{page + 1} / {pageCount}</span>
      <button onClick={() => onChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-xs sm:text-sm font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors">&rsaquo;</button>
    </div>
  );
}

function SortArrow({ field, activeField, dir }: { field: string; activeField: string; dir: SortDir }) {
  if (field !== activeField) return <span className="ml-0.5 invisible text-[0.5em]">{'\u25BC'}</span>;
  return <span className="ml-0.5 text-gray-400 text-[0.5em]">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('spymasters');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [spymasters, setSpymasters] = useState<SpymasterEntry[]>([]);
  const [guessers, setGuessers] = useState<GuesserEntry[]>([]);
  const [clueStats, setClueStats] = useState<ClueStatEntry[]>([]);
  const [page, setPage] = useState(0);
  const [mySolvedClueIds, setMySolvedClueIds] = useState<Set<string>>(new Set());
  const [confirmTryClueId, setConfirmTryClueId] = useState<string | null>(null);

  const [spySort, setSpySort] = useState<'avgScoreOnClues' | 'cluesGiven' | 'avgWordsPerClue'>('avgScoreOnClues');
  const [spyDir, setSpyDir] = useState<SortDir>('desc');
  const [guesserSort, setGuesserSort] = useState<'avgScore' | 'cluesSolved' | 'avgWordsPicked'>('avgScore');
  const [guesserDir, setGuesserDir] = useState<SortDir>('desc');
  const [clueSort, setClueSort] = useState<'attempts' | 'avgScore'>('avgScore');
  const [clueDir, setClueDir] = useState<SortDir>('desc');

  const loadData = useCallback(async (size: SizeFilter) => {
    const boardSize = size === 'all' ? undefined : size;
    const data = await api.getLeaderboard(boardSize);
    setSpymasters(data.spymasters);
    setGuessers(data.guessers);
    setClueStats((data as { clueStats?: ClueStatEntry[] }).clueStats || []);
  }, []);

  useEffect(() => {
    loadData(sizeFilter);
  }, [sizeFilter, loadData]);

  useEffect(() => {
    if (user) {
      api.getResultsByUser(user.id).then((results) => {
        setMySolvedClueIds(new Set(results.map((r) => r.clueId)));
      });
    }
  }, [user]);

  const sortedSpymasters = useMemo(() =>
    [...spymasters].sort((a, b) => {
      const diff = (b[spySort] as number) - (a[spySort] as number);
      return spyDir === 'desc' ? diff : -diff;
    }),
    [spymasters, spySort, spyDir]);

  const sortedGuessers = useMemo(() =>
    [...guessers].sort((a, b) => {
      const diff = (b[guesserSort] as number) - (a[guesserSort] as number);
      return guesserDir === 'desc' ? diff : -diff;
    }),
    [guessers, guesserSort, guesserDir]);

  const sortedClues = useMemo(() =>
    [...clueStats].sort((a, b) => {
      const diff = (b[clueSort] as number) - (a[clueSort] as number);
      return clueDir === 'desc' ? diff : -diff;
    }),
    [clueStats, clueSort, clueDir]);

  const getPage = <T,>(items: T[]) => {
    const pageCount = Math.ceil(items.length / PAGE_SIZE);
    const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    return { paged, pageCount };
  };

  function toggleSpySort(field: typeof spySort) {
    if (spySort === field) setSpyDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSpySort(field); setSpyDir('desc'); }
    setPage(0);
  }

  function toggleGuesserSort(field: typeof guesserSort) {
    if (guesserSort === field) setGuesserDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setGuesserSort(field); setGuesserDir('desc'); }
    setPage(0);
  }

  function toggleClueSort(field: typeof clueSort) {
    if (clueSort === field) setClueDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setClueSort(field); setClueDir('desc'); }
    setPage(0);
  }

  const tabBtnClass = (active: boolean, color: string) =>
    `px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${active ? `${color} text-white` : 'bg-gray-800 text-gray-400 hover:text-white'}`;

  const thClass = 'py-2 text-xs sm:text-sm';
  const tdClass = 'py-2 text-xs sm:text-sm';

  const thSortClass = `${thClass} text-right cursor-pointer hover:text-white transition-colors select-none`;

  return (
    <div className="min-h-screen">
      <NavBar showBack />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-extrabold text-white mb-6 text-center">{t.leaderboard.title}</h1>

        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => { setTab('spymasters'); setPage(0); }} className={tabBtnClass(tab === 'spymasters', 'bg-board-blue')}>{t.leaderboard.spymasters}</button>
          <button onClick={() => { setTab('guessers'); setPage(0); }} className={tabBtnClass(tab === 'guessers', 'bg-gray-600')}>{t.leaderboard.guessers}</button>
          <button onClick={() => { setTab('clues'); setPage(0); }} className={tabBtnClass(tab === 'clues', 'bg-board-red')}>{t.leaderboard.clues}</button>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {(['all', '4x4', '5x5'] as SizeFilter[]).map((size) => (
            <button
              key={size}
              onClick={() => { setSizeFilter(size); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${sizeFilter === size ? 'bg-board-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {size === 'all' ? t.leaderboard.allSizes : size.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === 'spymasters' && (() => {
          const { paged, pageCount } = getPage(sortedSpymasters);
          return paged.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <>
              <table className="w-full table-fixed">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className={`${thClass} text-left w-[6%]`}>{t.leaderboard.rank}</th>
                    <th className={`${thClass} text-left w-[32%]`}>{t.leaderboard.player}</th>
                    <th className={`${thSortClass} w-[20%]`} onClick={() => toggleSpySort('cluesGiven')}>{t.leaderboard.cluesGiven}<SortArrow field="cluesGiven" activeField={spySort} dir={spyDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleSpySort('avgWordsPerClue')}>{t.leaderboard.avgWordsPerClue}<SortArrow field="avgWordsPerClue" activeField={spySort} dir={spyDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleSpySort('avgScoreOnClues')}>{t.leaderboard.avgScoreOnClues}<SortArrow field="avgScoreOnClues" activeField={spySort} dir={spyDir} /></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((s, i) => (
                    <tr key={s.userId} className="border-b border-gray-800/50 text-gray-300">
                      <td className={tdClass}>{page * PAGE_SIZE + i + 1}</td>
                      <td className={`${tdClass} font-semibold truncate`}>
                        <button onClick={() => navigate(`/profile/${s.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{s.userId}</button>
                      </td>
                      <td className={`${tdClass} text-right`}>{s.cluesGiven}</td>
                      <td className={`${tdClass} text-right`}>{s.avgWordsPerClue.toFixed(1)}</td>
                      <td className={`${tdClass} text-right`}>{s.avgScoreOnClues.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </>
          );
        })()}

        {tab === 'guessers' && (() => {
          const { paged, pageCount } = getPage(sortedGuessers);
          return paged.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <>
              <table className="w-full table-fixed">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className={`${thClass} text-left w-[6%]`}>{t.leaderboard.rank}</th>
                    <th className={`${thClass} text-left w-[32%]`}>{t.leaderboard.player}</th>
                    <th className={`${thSortClass} w-[20%]`} onClick={() => toggleGuesserSort('cluesSolved')}>{t.leaderboard.cluesSolved}<SortArrow field="cluesSolved" activeField={guesserSort} dir={guesserDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleGuesserSort('avgWordsPicked')}>{t.leaderboard.avgWordsPicked}<SortArrow field="avgWordsPicked" activeField={guesserSort} dir={guesserDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleGuesserSort('avgScore')}>{t.leaderboard.avgScore}<SortArrow field="avgScore" activeField={guesserSort} dir={guesserDir} /></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((g, i) => (
                    <tr key={g.userId} className="border-b border-gray-800/50 text-gray-300">
                      <td className={tdClass}>{page * PAGE_SIZE + i + 1}</td>
                      <td className={`${tdClass} font-semibold truncate`}>
                        <button onClick={() => navigate(`/profile/${g.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{g.userId}</button>
                      </td>
                      <td className={`${tdClass} text-right`}>{g.cluesSolved}</td>
                      <td className={`${tdClass} text-right`}>{g.avgWordsPicked.toFixed(1)}</td>
                      <td className={`${tdClass} text-right`}>{g.avgScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </>
          );
        })()}

        {tab === 'clues' && (() => {
          const { paged, pageCount } = getPage(sortedClues);
          return paged.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <>
              <table className="w-full table-fixed">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className={`${thClass} text-left w-[6%]`}>{t.leaderboard.rank}</th>
                    <th className={`${thClass} text-left w-[18%]`}>{t.leaderboard.author}</th>
                    <th className={`${thClass} text-left w-[28%]`}>{t.leaderboard.clueWord}</th>
                    <th className={`${thSortClass} w-[17%]`} onClick={() => toggleClueSort('attempts')}>{t.leaderboard.attempts}<SortArrow field="attempts" activeField={clueSort} dir={clueDir} /></th>
                    <th className={`${thSortClass} w-[17%]`} onClick={() => toggleClueSort('avgScore')}>{t.leaderboard.avgScore}<SortArrow field="avgScore" activeField={clueSort} dir={clueDir} /></th>
                    <th className={`${thClass} text-center w-[14%]`}></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c, i) => {
                    const isOwn = c.userId === user?.id;
                    const solved = mySolvedClueIds.has(c.id);
                    return (
                      <tr key={`${c.id}-${i}`} className="border-b border-gray-800/50 text-gray-300">
                        <td className={tdClass}>{page * PAGE_SIZE + i + 1}</td>
                        <td className={`${tdClass} truncate`}>
                          <button onClick={() => navigate(`/profile/${c.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{c.userId}</button>
                        </td>
                        <td className={`${tdClass} font-bold uppercase truncate`}>
                          {c.word} <span className="text-gray-500 font-semibold">{c.number}</span>
                        </td>
                        <td className={`${tdClass} text-right`}>{c.attempts}</td>
                        <td className={`${tdClass} text-right`}>{c.avgScore.toFixed(1)}</td>
                        <td className={`${tdClass} text-center`}>
                          {!isOwn && user && (
                            solved ? (
                              <span className="text-board-blue text-sm" title={t.profile.solved}>✓</span>
                            ) : confirmTryClueId === c.id ? (
                              <span className="inline-flex items-center gap-1">
                                <button onClick={() => navigate(`/guess/${c.id}`)} className="text-xs font-bold text-green-400 hover:text-green-300">✓</button>
                                <button onClick={() => setConfirmTryClueId(null)} className="text-xs font-bold text-gray-500 hover:text-gray-300">✗</button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmTryClueId(c.id)}
                                className="text-board-red text-sm hover:text-red-300 transition-colors"
                                title={t.profile.tryIt}
                              >
                                ?
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </>
          );
        })()}
      </div>
    </div>
  );
}
