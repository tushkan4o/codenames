import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import BoardReviewModal from '../components/game/BoardReviewModal';
import type { BoardSize, Clue, GuessResult } from '../types/game';

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
  const sizeFilter: SizeFilter = 'all';
  const [spymasters, setSpymasters] = useState<SpymasterEntry[]>([]);
  const [guessers, setGuessers] = useState<GuesserEntry[]>([]);
  const [clueStats, setClueStats] = useState<ClueStatEntry[]>([]);
  const [page, setPage] = useState(0);
  const [mySolvedClueIds, setMySolvedClueIds] = useState<Set<string>>(new Set());
  const [myResults, setMyResults] = useState<Map<string, GuessResult>>(new Map());
  const [confirmTryId, setConfirmTryId] = useState<string | null>(null);
  const [modalClue, setModalClue] = useState<Clue | null>(null);
  const [modalResult, setModalResult] = useState<GuessResult | undefined>(undefined);

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
        setMyResults(new Map(results.map((r) => [r.clueId, r])));
      });
    }
  }, [user]);

  async function handleClueRowClick(clueId: string, solved: boolean, isOwn: boolean) {
    if (solved || isOwn) {
      const clue = await api.getClueById(clueId, true);
      if (!clue) return;
      setModalClue(clue);
      setModalResult(myResults.get(clueId));
    } else {
      setConfirmTryId(clueId);
    }
  }

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
                    <tr key={s.userId} className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/40 transition-colors">
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
                    <tr key={g.userId} className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/40 transition-colors">
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
                    <th className={`${thSortClass} w-[20%]`} onClick={() => toggleClueSort('attempts')}>{t.leaderboard.attempts}<SortArrow field="attempts" activeField={clueSort} dir={clueDir} /></th>
                    <th className={`${thSortClass} w-[20%]`} onClick={() => toggleClueSort('avgScore')}>{t.leaderboard.avgScore}<SortArrow field="avgScore" activeField={clueSort} dir={clueDir} /></th>
                    <th className={`${thClass} text-center w-[8%]`}></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c, i) => {
                    const isOwn = c.userId === user?.id;
                    const solved = mySolvedClueIds.has(c.id);
                    return (
                      <tr
                        key={`${c.id}-${i}`}
                        onClick={() => user && handleClueRowClick(c.id, solved, isOwn)}
                        className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/40 cursor-pointer transition-colors"
                      >
                        <td className={tdClass}>{page * PAGE_SIZE + i + 1}</td>
                        <td className={`${tdClass} truncate`}>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/profile/${c.userId}`); }} className="text-board-blue hover:text-blue-300 transition-colors">{c.userId}</button>
                        </td>
                        <td className={`${tdClass} font-bold uppercase truncate`}>
                          {c.word} <span className="text-gray-500 font-semibold">{c.number}</span>
                        </td>
                        <td className={`${tdClass} text-right`}>{c.attempts}</td>
                        <td className={`${tdClass} text-right`}>{c.avgScore.toFixed(1)}</td>
                        <td className={`${tdClass} text-center`}>
                          {user && (
                            (solved || isOwn) ? (
                              <span className="text-board-blue text-sm">✓</span>
                            ) : (
                              <span className="text-gray-500 text-sm">–</span>
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

      {confirmTryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 rounded-xl p-6 max-w-xs text-center">
            <p className="text-white mb-4">{t.profile.tryIt}?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { navigate(`/guess/${confirmTryId}`); setConfirmTryId(null); }} className="px-4 py-2 text-sm font-bold text-white bg-board-blue hover:bg-blue-600 rounded-lg transition-colors">✓</button>
              <button onClick={() => setConfirmTryId(null)} className="px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">✗</button>
            </div>
          </div>
        </div>
      )}

      {modalClue && (
        <BoardReviewModal clue={modalClue} result={modalResult} onClose={() => { setModalClue(null); setModalResult(undefined); }} />
      )}
    </div>
  );
}
