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
type RankedFilter = 'all' | 'ranked' | 'casual';

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
  ranked: boolean;
  attempts: number;
  avgScore: number;
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
  const [mySolvedClueIds, setMySolvedClueIds] = useState<Set<string>>(new Set());
  const [myResults, setMyResults] = useState<Map<string, GuessResult>>(new Map());
  const [confirmTryId, setConfirmTryId] = useState<string | null>(null);
  const [modalClue, setModalClue] = useState<Clue | null>(null);
  const [modalResult, setModalResult] = useState<GuessResult | undefined>(undefined);
  const [rankedFilter, setRankedFilter] = useState<RankedFilter>('all');

  const [spySort, setSpySort] = useState<'avgScoreOnClues' | 'cluesGiven' | 'avgWordsPerClue'>('avgScoreOnClues');
  const [spyDir, setSpyDir] = useState<SortDir>('desc');
  const [guesserSort, setGuesserSort] = useState<'avgScore' | 'cluesSolved' | 'avgWordsPicked'>('avgScore');
  const [guesserDir, setGuesserDir] = useState<SortDir>('desc');
  const [clueSort, setClueSort] = useState<'number' | 'attempts' | 'avgScore'>('avgScore');
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

  function cycleRankedFilter() {
    setRankedFilter((f) => f === 'all' ? 'ranked' : f === 'ranked' ? 'casual' : 'all');
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

  const filteredClues = useMemo(() => {
    let filtered = clueStats;
    if (rankedFilter === 'ranked') filtered = filtered.filter((c) => c.ranked);
    else if (rankedFilter === 'casual') filtered = filtered.filter((c) => !c.ranked);
    return filtered;
  }, [clueStats, rankedFilter]);

  const sortedClues = useMemo(() =>
    [...filteredClues].sort((a, b) => {
      const diff = (b[clueSort] as number) - (a[clueSort] as number);
      return clueDir === 'desc' ? diff : -diff;
    }),
    [filteredClues, clueSort, clueDir]);

  function toggleSpySort(field: typeof spySort) {
    if (spySort === field) setSpyDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSpySort(field); setSpyDir('desc'); }
  }

  function toggleGuesserSort(field: typeof guesserSort) {
    if (guesserSort === field) setGuesserDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setGuesserSort(field); setGuesserDir('desc'); }
  }

  function toggleClueSort(field: typeof clueSort) {
    if (clueSort === field) setClueDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setClueSort(field); setClueDir('desc'); }
  }

  const tabBtnClass = (active: boolean, color: string) =>
    `px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${active ? `${color} text-white` : 'bg-gray-800 text-gray-400 hover:text-white'}`;

  const [expandedClueId, setExpandedClueId] = useState<string | null>(null);

  const thClass = 'py-2 text-xs sm:text-sm';
  const tdClass = 'py-2 text-xs sm:text-sm';

  const thSortClass = `${thClass} text-center cursor-pointer hover:text-white transition-colors select-none`;
  const thAccordion = 'py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar showBack />
      <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col flex-1 min-h-0 w-full">
        <h1 className="text-2xl font-extrabold text-white mb-4 text-center">{t.leaderboard.title}</h1>

        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => setTab('spymasters')} className={tabBtnClass(tab === 'spymasters', 'bg-board-blue')}>{t.leaderboard.spymasters}</button>
          <button onClick={() => setTab('guessers')} className={tabBtnClass(tab === 'guessers', 'bg-gray-600')}>{t.leaderboard.guessers}</button>
          <button onClick={() => setTab('clues')} className={tabBtnClass(tab === 'clues', 'bg-board-red')}>{t.leaderboard.clues}</button>
        </div>

        {tab === 'spymasters' && (
          sortedSpymasters.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 bg-board-bg z-10">
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className={`${thClass} text-center w-[6%]`}>{t.leaderboard.rank}</th>
                    <th className={`${thClass} text-left w-[32%]`}>{t.leaderboard.player}</th>
                    <th className={`${thSortClass} w-[20%]`} onClick={() => toggleSpySort('cluesGiven')}>{t.leaderboard.cluesGiven}<SortArrow field="cluesGiven" activeField={spySort} dir={spyDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleSpySort('avgWordsPerClue')}>{t.leaderboard.avgWordsPerClue}<SortArrow field="avgWordsPerClue" activeField={spySort} dir={spyDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleSpySort('avgScoreOnClues')}>{t.leaderboard.avgScoreOnClues}<SortArrow field="avgScoreOnClues" activeField={spySort} dir={spyDir} /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSpymasters.map((s, i) => (
                    <tr key={s.userId} className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/40 transition-colors">
                      <td className={`${tdClass} text-center`}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold truncate`}>
                        <button onClick={() => navigate(`/profile/${s.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{s.userId}</button>
                      </td>
                      <td className={`${tdClass} text-center`}>{s.cluesGiven}</td>
                      <td className={`${tdClass} text-center`}>{s.avgWordsPerClue.toFixed(1)}</td>
                      <td className={`${tdClass} text-center`}>{s.avgScoreOnClues.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'guessers' && (
          sortedGuessers.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 bg-board-bg z-10">
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className={`${thClass} text-center w-[6%]`}>{t.leaderboard.rank}</th>
                    <th className={`${thClass} text-left w-[32%]`}>{t.leaderboard.player}</th>
                    <th className={`${thSortClass} w-[20%]`} onClick={() => toggleGuesserSort('cluesSolved')}>{t.leaderboard.cluesSolved}<SortArrow field="cluesSolved" activeField={guesserSort} dir={guesserDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleGuesserSort('avgWordsPicked')}>{t.leaderboard.avgWordsPicked}<SortArrow field="avgWordsPicked" activeField={guesserSort} dir={guesserDir} /></th>
                    <th className={`${thSortClass} w-[21%]`} onClick={() => toggleGuesserSort('avgScore')}>{t.leaderboard.avgScore}<SortArrow field="avgScore" activeField={guesserSort} dir={guesserDir} /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGuessers.map((g, i) => (
                    <tr key={g.userId} className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/40 transition-colors">
                      <td className={`${tdClass} text-center`}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold truncate`}>
                        <button onClick={() => navigate(`/profile/${g.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{g.userId}</button>
                      </td>
                      <td className={`${tdClass} text-center`}>{g.cluesSolved}</td>
                      <td className={`${tdClass} text-center`}>{g.avgWordsPicked.toFixed(1)}</td>
                      <td className={`${tdClass} text-center`}>{g.avgScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'clues' && (
          sortedClues.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (<>
            <div className="hidden sm:grid grid-cols-[1fr_2rem_2rem] gap-2 px-4 py-1 items-center">
              <span className={thAccordion} onClick={() => toggleClueSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={clueSort} dir={clueDir} /></span>
              <span className={`${thAccordion} text-center`} onClick={cycleRankedFilter} title={rankedFilter === 'all' ? 'Все' : rankedFilter === 'ranked' ? 'Рейтинговые' : 'Обычные'}>
                {rankedFilter === 'all' ? '★' : rankedFilter === 'ranked' ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
              </span>
              <span></span>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
              {sortedClues.map((c, i) => {
                const isOwn = c.userId === user?.id;
                const solved = mySolvedClueIds.has(c.id);
                const isExpanded = expandedClueId === c.id;
                return (
                  <div key={`${c.id}-${i}`}>
                    <div
                      onClick={() => setExpandedClueId(isExpanded ? null : c.id)}
                      className={`bg-gray-800/60 border rounded-lg px-4 py-2 cursor-pointer transition-colors hover:border-gray-600 ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {c.word} <span className="text-gray-500 font-semibold">{c.number}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{c.ranked ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                          {user && (
                            (solved || isOwn) ? (
                              <span className="text-board-blue text-sm">✓</span>
                            ) : (
                              <span className="text-gray-500 text-sm">–</span>
                            )
                          )}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg p-4">
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-400">{t.leaderboard.author}: </span>
                            <button
                              onClick={() => navigate(`/profile/${c.userId}`)}
                              className="text-board-blue hover:text-blue-300 transition-colors font-semibold"
                            >
                              {c.userId}
                            </button>
                          </div>
                          <div>
                            <span className="text-gray-400">{t.leaderboard.attempts}: </span>
                            <span className="text-white font-semibold">{c.attempts}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t.leaderboard.avgScore}: </span>
                            <span className="text-white font-semibold">{c.avgScore.toFixed(1)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => user && handleClueRowClick(c.id, solved, isOwn)}
                          className="px-4 py-1.5 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                        >
                          {t.profile.viewBoard}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>)
        )}
      </div>

      {confirmTryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmTryId(null)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-xs text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirmTryId(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
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
