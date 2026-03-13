import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { useProfileModal } from '../context/ProfileModalContext';
import { api } from '../lib/api';
import { canPlayRanked, buildRankedLockMessage } from '../lib/rankedAccess';
import NavBar from '../components/layout/NavBar';
import BoardReviewModal from '../components/game/BoardReviewModal';
import type { BoardSize, Clue, GuessResult } from '../types/game';

const ACTIVE_GUESS_KEY = 'codenames_active_guess';

type Tab = 'overall' | 'spymasters' | 'guessers' | 'clues';
type SizeFilter = 'all' | BoardSize;
type SortDir = 'asc' | 'desc';
type RankedFilter = 'all' | 'ranked' | 'casual';
type SolvedFilter = 'all' | 'solved' | 'unsolved';

interface SpymasterEntry {
  userId: string;
  displayName: string;
  cluesGiven: number;
  avgWordsPerClue: number;
  avgScoreOnClues: number;
  captainRating: number;
  rankedAvgWords: number;
  rankedZeroPct: number;
}

interface GuesserEntry {
  userId: string;
  displayName: string;
  cluesSolved: number;
  avgWordsPicked: number;
  avgScore: number;
  scoutRating: number;
  rankedAvgPicked: number;
  rankedBlackPct: number;
}

interface ClueStatEntry {
  id: string;
  word: string;
  number: number;
  userId: string;
  displayName: string;
  ranked: boolean;
  attempts: number;
  avgScore: number;
  createdAt: number;
  ratingsCount: number;
  avgRating: number;
  clueRating: number;
  disabled: boolean;
}

interface OverallEntry {
  userId: string;
  displayName: string;
  rankedCluesGiven: number;
  rankedCluesSolved: number;
  rating: number;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SortArrow({ field, activeField, dir }: { field: string; activeField: string | null; dir: SortDir }) {
  if (field !== activeField) return <span className="ml-0.5 invisible text-[0.5em]">{'\u25BC'}</span>;
  return <span className="ml-0.5 text-gray-400 text-[0.5em]">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openProfile, closeProfile } = useProfileModal();
  const [tab, setTab] = useState<Tab>('overall');
  const sizeFilter: SizeFilter = 'all';
  const [spymasters, setSpymasters] = useState<SpymasterEntry[]>([]);
  const [guessers, setGuessers] = useState<GuesserEntry[]>([]);
  const [clueStats, setClueStats] = useState<ClueStatEntry[]>([]);
  const [overall, setOverall] = useState<OverallEntry[]>([]);
  const [mySolvedClueIds, setMySolvedClueIds] = useState<Set<string>>(new Set());
  const [myResults, setMyResults] = useState<Map<string, GuessResult>>(new Map());
  const [modalClue, setModalClue] = useState<Clue | null>(null);
  const [modalResult, setModalResult] = useState<GuessResult | undefined>(undefined);
  const [confirmDeleteClue, setConfirmDeleteClue] = useState<string | null>(null);
  const [rankedFilter, setRankedFilter] = useState<RankedFilter>('all');
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>('all');
  const [unfinishedModal, setUnfinishedModal] = useState<{ savedClueId: string; targetClueId: string } | null>(null);

  const [spySort, setSpySort] = useState<'captainRating' | 'cluesGiven' | 'rankedAvgWords' | 'rankedZeroPct' | null>('captainRating');
  const [spyDir, setSpyDir] = useState<SortDir>('desc');
  const [guesserSort, setGuesserSort] = useState<'scoutRating' | 'cluesSolved' | 'rankedAvgPicked' | 'rankedBlackPct' | null>('scoutRating');
  const [guesserDir, setGuesserDir] = useState<SortDir>('desc');
  const [overallSort, setOverallSort] = useState<'rating' | 'rankedCluesGiven' | 'rankedCluesSolved' | null>('rating');
  const [overallDir, setOverallDir] = useState<SortDir>('desc');
  const [clueSort, setClueSort] = useState<'number' | 'attempts' | 'clueRating' | 'date' | null>('clueRating');
  const [clueDir, setClueDir] = useState<SortDir>('desc');

  const loadData = useCallback(async (size: SizeFilter) => {
    const boardSize = size === 'all' ? undefined : size;
    const data = await api.getLeaderboard(boardSize);
    setSpymasters(data.spymasters as SpymasterEntry[]);
    setGuessers(data.guessers as GuesserEntry[]);
    setClueStats((data as { clueStats?: ClueStatEntry[] }).clueStats || []);
    setOverall((data as { overall?: OverallEntry[] }).overall || []);
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

  async function handleClueAction(clueId: string, solved: boolean, isOwn: boolean) {
    if (solved || isOwn) {
      const clue = await api.getClueById(clueId, true);
      if (!clue) return;
      setModalClue(clue);
      setModalResult(myResults.get(clueId));
    } else {
      // Check for unfinished game
      try {
        const saved = localStorage.getItem(ACTIVE_GUESS_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (state.clueId && state.pickedIndices?.length > 0 && state.clueId !== clueId) {
            setUnfinishedModal({ savedClueId: state.clueId, targetClueId: clueId });
            return;
          }
        }
      } catch { /* ignore */ }
      closeProfile();
      navigate(`/guess/${clueId}`);
    }
  }

  async function handleAdminDeleteClue(clueId: string) {
    if (!user?.isAdmin) return;
    await api.adminDeleteClue(user.id, clueId);
    setClueStats((prev) => prev.filter((c) => c.id !== clueId));
    setConfirmDeleteClue(null);
  }

  function cycleRankedFilter() {
    setRankedFilter((f) => f === 'all' ? 'ranked' : f === 'ranked' ? 'casual' : 'all');
  }

  function cycleSolvedFilter() {
    setSolvedFilter((f) => f === 'all' ? 'solved' : f === 'solved' ? 'unsolved' : 'all');
  }

  const sortedSpymasters = useMemo(() => {
    const sorted = [...spymasters];
    const key = spySort || 'captainRating';
    sorted.sort((a, b) => {
      // Qualified (>=3) first, then unqualified
      const aQ = a.cluesGiven >= 3 ? 1 : 0;
      const bQ = b.cluesGiven >= 3 ? 1 : 0;
      if (aQ !== bQ) return bQ - aQ;
      const diff = (b[key] as number) - (a[key] as number);
      return spyDir === 'desc' ? diff : -diff;
    });
    return sorted;
  }, [spymasters, spySort, spyDir]);

  const sortedGuessers = useMemo(() => {
    const sorted = [...guessers];
    const key = guesserSort || 'scoutRating';
    sorted.sort((a, b) => {
      const aQ = a.cluesSolved >= 3 ? 1 : 0;
      const bQ = b.cluesSolved >= 3 ? 1 : 0;
      if (aQ !== bQ) return bQ - aQ;
      const diff = (b[key] as number) - (a[key] as number);
      return guesserDir === 'desc' ? diff : -diff;
    });
    return sorted;
  }, [guessers, guesserSort, guesserDir]);

  const filteredClues = useMemo(() => {
    let filtered = clueStats;
    if (rankedFilter === 'ranked') filtered = filtered.filter((c) => c.ranked);
    else if (rankedFilter === 'casual') filtered = filtered.filter((c) => !c.ranked);
    if (solvedFilter === 'solved') filtered = filtered.filter((c) => mySolvedClueIds.has(c.id) || c.userId === user?.id);
    else if (solvedFilter === 'unsolved') filtered = filtered.filter((c) => !mySolvedClueIds.has(c.id) && c.userId !== user?.id);
    return filtered;
  }, [clueStats, rankedFilter, solvedFilter, mySolvedClueIds, user]);

  const sortedClues = useMemo(() => {
    if (!clueSort) return [...filteredClues];
    return [...filteredClues].sort((a, b) => {
      const diff = clueSort === 'date' ? b.createdAt - a.createdAt : (b[clueSort] as number) - (a[clueSort] as number);
      return clueDir === 'desc' ? diff : -diff;
    });
  }, [filteredClues, clueSort, clueDir]);

  function toggleSpySort(field: NonNullable<typeof spySort>) {
    if (spySort === field) {
      if (spyDir === 'desc') setSpyDir('asc');
      else { setSpySort(null); setSpyDir('desc'); }
    } else { setSpySort(field); setSpyDir('desc'); }
  }

  function toggleGuesserSort(field: NonNullable<typeof guesserSort>) {
    if (guesserSort === field) {
      if (guesserDir === 'desc') setGuesserDir('asc');
      else { setGuesserSort(null); setGuesserDir('desc'); }
    } else { setGuesserSort(field); setGuesserDir('desc'); }
  }

  function toggleOverallSort(field: NonNullable<typeof overallSort>) {
    if (overallSort === field) {
      if (overallDir === 'desc') setOverallDir('asc');
      else { setOverallSort(null); setOverallDir('desc'); }
    } else { setOverallSort(field); setOverallDir('desc'); }
  }

  const sortedOverall = useMemo(() => {
    const sorted = [...overall];
    const key = overallSort || 'rating';
    sorted.sort((a, b) => {
      const aQ = (a.rankedCluesGiven + a.rankedCluesSolved) >= 3 ? 1 : 0;
      const bQ = (b.rankedCluesGiven + b.rankedCluesSolved) >= 3 ? 1 : 0;
      if (aQ !== bQ) return bQ - aQ;
      const diff = (b[key] as number) - (a[key] as number);
      return overallDir === 'desc' ? diff : -diff;
    });
    return sorted;
  }, [overall, overallSort, overallDir]);

  function toggleClueSort(field: NonNullable<typeof clueSort>) {
    if (clueSort === field) {
      if (clueDir === 'desc') setClueDir('asc');
      else { setClueSort(null); setClueDir('desc'); }
    } else { setClueSort(field); setClueDir('desc'); }
  }

  const tabBtnClass = (active: boolean) =>
    `px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-[0.65rem] sm:text-sm transition-colors ${active ? 'bg-board-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`;

  const [expandedClueId, setExpandedClueId] = useState<string | null>(null);

  const thAccordion = 'py-1 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap';
  const ratingGrid = 'grid grid-cols-[1.5rem_1fr_5.5rem_5.5rem] sm:grid-cols-[1.5rem_1fr_5rem_5rem_5rem_5rem] gap-x-1';

  const starIcon = rankedFilter === 'all' ? '★' : rankedFilter === 'ranked' ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>;
  const checkIcon = solvedFilter === 'all' ? '✓' : solvedFilter === 'solved' ? <span className="text-board-blue">✓</span> : <span className="text-gray-600">✓</span>;
  const starTitle = rankedFilter === 'all' ? 'Все подсказки (рейтинговые и обычные)' : rankedFilter === 'ranked' ? 'Рейтинговые' : 'Обычные';
  const checkTitle = solvedFilter === 'all' ? 'Все подсказки (решённые и не решённые)' : solvedFilter === 'solved' ? 'Решённые' : 'Нерешённые';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col flex-1 min-h-0 w-full relative overflow-x-hidden">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-6 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-2xl font-extrabold text-white mb-4 text-center">{t.leaderboard.title}</h1>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <button onClick={() => setTab('overall')} className={tabBtnClass(tab === 'overall')}>{t.leaderboard.overall}</button>
          <button onClick={() => setTab('spymasters')} className={tabBtnClass(tab === 'spymasters')}>{t.leaderboard.spymasters}</button>
          <button onClick={() => setTab('guessers')} className={tabBtnClass(tab === 'guessers')}>{t.leaderboard.guessers}</button>
          <button onClick={() => setTab('clues')} className={tabBtnClass(tab === 'clues')}>{t.leaderboard.clues}</button>
        </div>

        {tab === 'overall' && (
          sortedOverall.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <>
              <div className="overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
                <div className="grid grid-cols-[1.5rem_1fr_5.5rem_5.5rem] sm:grid-cols-[1.5rem_1fr_5.5rem_6.5rem_5.5rem] gap-x-1 pl-2 py-1 items-center">
                  <span className={`${thAccordion} text-center`}>{t.leaderboard.rank}</span>
                  <span className={thAccordion}>{t.leaderboard.player}</span>
                  <span className={`${thAccordion} text-center sm:hidden`}>{t.leaderboard.gamesPlayed}</span>
                  <span className={`${thAccordion} text-center hidden sm:block`} onClick={() => toggleOverallSort('rankedCluesGiven')}>{t.leaderboard.cluesGiven}<SortArrow field="rankedCluesGiven" activeField={overallSort} dir={overallDir} /></span>
                  <span className={`${thAccordion} text-center hidden sm:block`} onClick={() => toggleOverallSort('rankedCluesSolved')}>{t.leaderboard.cluesSolved}<SortArrow field="rankedCluesSolved" activeField={overallSort} dir={overallDir} /></span>
                  <span className={`${thAccordion} text-center`} onClick={() => toggleOverallSort('rating')}>{t.leaderboard.overallRating}<SortArrow field="rating" activeField={overallSort} dir={overallDir} /></span>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
                <div className="space-y-1">
                  {sortedOverall.map((o, i) => (
                    <div
                      key={o.userId}
                      onClick={() => openProfile(o.userId)}
                      className="bg-gray-800/60 border border-gray-700/30 rounded-lg pl-2 pr-0 py-1.5 cursor-pointer transition-colors hover:border-gray-600"
                    >
                      <div className="grid grid-cols-[1.5rem_1fr_5.5rem_5.5rem] sm:grid-cols-[1.5rem_1fr_5.5rem_6.5rem_5.5rem] gap-x-1 items-center">
                        <span className="text-gray-500 text-sm text-center">{(o.rankedCluesGiven + o.rankedCluesSolved) >= 3 ? (i + 1) : '—'}</span>
                        <span className="font-semibold text-sm text-white truncate">{o.displayName}</span>
                        <span className="text-sm text-gray-400 text-center sm:hidden">{o.rankedCluesGiven + o.rankedCluesSolved}</span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{o.rankedCluesGiven}</span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{o.rankedCluesSolved}</span>
                        <span className={`text-sm font-bold text-center ${(o.rankedCluesGiven + o.rankedCluesSolved) >= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {(o.rankedCluesGiven + o.rankedCluesSolved) >= 3 ? o.rating : o.rating ? `${o.rating}?` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        )}

        {tab === 'spymasters' && (
          sortedSpymasters.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <>
              <div className="overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
                <div className={`${ratingGrid} pl-2 py-1 items-center`}>
                  <span className={`${thAccordion} text-center`}>{t.leaderboard.rank}</span>
                  <span className={thAccordion}>{t.leaderboard.player}</span>
                  <span className={`${thAccordion} text-center`} onClick={() => toggleSpySort('cluesGiven')}>{t.leaderboard.cluesGiven}<SortArrow field="cluesGiven" activeField={spySort} dir={spyDir} /></span>
                  <span className={`${thAccordion} text-center hidden sm:block`} onClick={() => toggleSpySort('rankedAvgWords')}>{t.leaderboard.avgWordsPerClue}<SortArrow field="rankedAvgWords" activeField={spySort} dir={spyDir} /></span>
                  <span className={`${thAccordion} text-center hidden sm:block`} onClick={() => toggleSpySort('rankedZeroPct')}>{t.leaderboard.zeroPct}<SortArrow field="rankedZeroPct" activeField={spySort} dir={spyDir} /></span>
                  <span className={`${thAccordion} text-center`} onClick={() => toggleSpySort('captainRating')}>{t.leaderboard.overallRating}<SortArrow field="captainRating" activeField={spySort} dir={spyDir} /></span>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
                <div className="space-y-1">
                  {sortedSpymasters.map((s, i) => (
                    <div
                      key={s.userId}
                      onClick={() => openProfile(s.userId)}
                      className="bg-gray-800/60 border border-gray-700/30 rounded-lg pl-2 pr-0 py-1.5 cursor-pointer transition-colors hover:border-gray-600"
                    >
                      <div className={`${ratingGrid} items-center`}>
                        <span className="text-gray-500 text-sm text-center">{s.cluesGiven >= 3 ? (i + 1) : '—'}</span>
                        <span className="font-semibold text-sm text-white truncate">{s.displayName}</span>
                        <span className="text-sm text-gray-400 text-center">{s.cluesGiven}</span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{s.rankedAvgWords > 0 ? s.rankedAvgWords.toFixed(1) : '—'}</span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{s.rankedZeroPct > 0 ? `${s.rankedZeroPct.toFixed(0)}%` : '—'}</span>
                        <span className={`text-sm font-bold text-center ${s.cluesGiven >= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {s.cluesGiven >= 3 ? (s.captainRating || '—') : s.captainRating ? `${s.captainRating}?` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        )}

        {tab === 'guessers' && (
          sortedGuessers.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <>
              <div className="overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
                <div className={`${ratingGrid} pl-2 py-1 items-center`}>
                  <span className={`${thAccordion} text-center`}>{t.leaderboard.rank}</span>
                  <span className={thAccordion}>{t.leaderboard.player}</span>
                  <span className={`${thAccordion} text-center`} onClick={() => toggleGuesserSort('cluesSolved')}>{t.leaderboard.cluesSolved}<SortArrow field="cluesSolved" activeField={guesserSort} dir={guesserDir} /></span>
                  <span className={`${thAccordion} text-center hidden sm:block`} onClick={() => toggleGuesserSort('rankedAvgPicked')}>{t.leaderboard.avgWordsPicked}<SortArrow field="rankedAvgPicked" activeField={guesserSort} dir={guesserDir} /></span>
                  <span className={`${thAccordion} text-center hidden sm:block`} onClick={() => toggleGuesserSort('rankedBlackPct')}>{t.leaderboard.blackPct}<SortArrow field="rankedBlackPct" activeField={guesserSort} dir={guesserDir} /></span>
                  <span className={`${thAccordion} text-center`} onClick={() => toggleGuesserSort('scoutRating')}>{t.leaderboard.overallRating}<SortArrow field="scoutRating" activeField={guesserSort} dir={guesserDir} /></span>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
                <div className="space-y-1">
                  {sortedGuessers.map((g, i) => (
                    <div
                      key={g.userId}
                      onClick={() => openProfile(g.userId)}
                      className="bg-gray-800/60 border border-gray-700/30 rounded-lg pl-2 pr-0 py-1.5 cursor-pointer transition-colors hover:border-gray-600"
                    >
                      <div className={`${ratingGrid} items-center`}>
                        <span className="text-gray-500 text-sm text-center">{g.cluesSolved >= 3 ? (i + 1) : '—'}</span>
                        <span className="font-semibold text-sm text-white truncate">{g.displayName}</span>
                        <span className="text-sm text-gray-400 text-center">{g.cluesSolved}</span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{g.rankedAvgPicked > 0 ? g.rankedAvgPicked.toFixed(1) : '—'}</span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{g.rankedBlackPct > 0 ? `${g.rankedBlackPct.toFixed(0)}%` : '—'}</span>
                        <span className={`text-sm font-bold text-center ${g.cluesSolved >= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {g.cluesSolved >= 3 ? g.scoutRating : g.scoutRating ? `${g.scoutRating}?` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        )}

        {tab === 'clues' && (
          sortedClues.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <>
              <div className="overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
                <div className="grid grid-cols-[1fr_3.5rem_2rem_2rem] sm:grid-cols-[1fr_5rem_9rem_3.5rem_2rem_2rem] gap-x-2 px-4 py-1 items-center">
                  <span className={thAccordion} onClick={() => toggleClueSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={clueSort} dir={clueDir} /></span>
                  <span className={`${thAccordion} text-left hidden sm:block`}>{t.leaderboard.author}</span>
                  <span className={`${thAccordion} text-center hidden sm:block`} onClick={() => toggleClueSort('date')}>{t.profile.sortDate}<SortArrow field="date" activeField={clueSort} dir={clueDir} /></span>
                  <span className={`${thAccordion} text-center`} onClick={() => toggleClueSort('clueRating')}>{t.profile.rating}<SortArrow field="clueRating" activeField={clueSort} dir={clueDir} /></span>
                  <span className={`${thAccordion} text-center`} onClick={cycleRankedFilter} title={starTitle}>{starIcon}</span>
                  <span className={`${thAccordion} text-center`} onClick={cycleSolvedFilter} title={checkTitle}>{checkIcon}</span>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
                <div className="space-y-1">
              {sortedClues.map((c, i) => {
                const isOwn = c.userId === user?.id;
                const solved = mySolvedClueIds.has(c.id);
                const isExpanded = expandedClueId === c.id;
                const canView = solved || isOwn;
                return (
                  <div key={`${c.id}-${i}`}>
                    <div
                      onClick={() => setExpandedClueId(isExpanded ? null : c.id)}
                      className={`bg-gray-800/60 border rounded-lg px-4 py-1.5 cursor-pointer transition-colors hover:border-gray-600 ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}
                    >
                      <div className="grid grid-cols-[1fr_3.5rem_2rem_2rem] sm:grid-cols-[1fr_5rem_9rem_3.5rem_2rem_2rem] gap-x-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {c.word} <span className="text-amber-400 font-semibold">{c.number}</span>
                          {c.disabled && <span className="ml-1 text-[0.6rem] text-board-red font-bold">OFF</span>}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); openProfile(c.userId); }} className="text-sm text-board-blue hover:text-blue-300 transition-colors font-semibold truncate text-left hidden sm:block">{c.displayName}</button>
                        <span className="text-xs text-gray-500 text-center hidden sm:block">{c.createdAt > 0 ? formatDate(c.createdAt) : '—'}</span>
                        <span className="text-sm text-center">{c.attempts > 0
                          ? c.attempts >= 3
                            ? <span className={c.ranked ? 'text-amber-400 font-bold' : 'text-gray-400'}>{c.clueRating}</span>
                            : <span className="text-gray-500">{c.clueRating}?</span>
                          : <span className="text-gray-400">—</span>}</span>
                        <span className="text-sm text-center">{c.ranked ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                        <span className="text-sm text-center">
                          {user && (
                            canView ? (
                              <span className="text-board-blue">✓</span>
                            ) : (
                              <span className="text-gray-500">–</span>
                            )
                          )}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {c.createdAt > 0 && <span className="text-gray-500">{formatDate(c.createdAt)}</span>}
                          {!c.createdAt && <span />}
                          <span>
                            <span className="text-gray-400">{t.leaderboard.author}: </span>
                            <button onClick={() => openProfile(c.userId)} className="text-board-blue hover:text-blue-300 transition-colors font-semibold">{c.displayName}</button>
                          </span>
                          <span><span className="text-gray-400">{t.profile.solveCount}:</span> <span className="text-white font-semibold">{c.attempts}</span></span>
                          <span><span className="text-gray-400">{t.results.avgScoreLabel}:</span> <span className="text-white font-semibold">{c.attempts > 0 ? c.avgScore.toFixed(1) : '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.ratingsCount}:</span> <span className="text-white font-semibold">{c.ratingsCount ?? 0}</span></span>
                          <span><span className="text-gray-400">{t.admin.avgRating}:</span> <span className="text-white font-semibold">{c.ratingsCount > 0 ? c.avgRating.toFixed(1) : '—'}</span></span>
                          <div className="col-span-2 flex items-center gap-2 justify-end mt-1">
                            {canView ? (
                              <button
                                onClick={() => user && handleClueAction(c.id, solved, isOwn)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {t.profile.viewBoard}
                              </button>
                            ) : c.ranked !== false && !canPlayRanked(user) ? (
                              <span className="text-gray-500 text-xs italic">{buildRankedLockMessage(user)}</span>
                            ) : (
                              <button
                                onClick={() => user && handleClueAction(c.id, solved, isOwn)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {t.profile.solve}
                              </button>
                            )}
                            {user?.isAdmin && confirmDeleteClue !== c.id && (
                              <button
                                onClick={() => setConfirmDeleteClue(c.id)}
                                className="px-2 py-1 rounded bg-board-red/60 hover:bg-board-red text-white text-sm font-bold transition-colors"
                                title={t.admin.deleteClue}
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>
                        {user?.isAdmin && confirmDeleteClue === c.id && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-700/30">
                            <span className="text-sm text-board-red">{t.admin.confirmDeleteClue}</span>
                            <button onClick={() => handleAdminDeleteClue(c.id)} className="px-2 py-1 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                            <button onClick={() => setConfirmDeleteClue(null)} className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
              </div>
            </>
          )
        )}
      </div>

      {unfinishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setUnfinishedModal(null)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-sm mb-4">У вас есть незавершённая игра</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setUnfinishedModal(null)}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => { const id = unfinishedModal.savedClueId; setUnfinishedModal(null); closeProfile(); navigate(`/guess/${id}`); }}
                className="px-5 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-semibold transition-colors"
              >
                Дорешать
              </button>
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
