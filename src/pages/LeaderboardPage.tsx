import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import type { BoardSize } from '../types/game';

type Tab = 'spymasters' | 'guessers' | 'clues';
type SizeFilter = 'all' | BoardSize;

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
      <button onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-sm font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors">&lsaquo;</button>
      <span className="text-gray-500 text-sm py-1">{page + 1} / {pageCount}</span>
      <button onClick={() => onChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-sm font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors">&rsaquo;</button>
    </div>
  );
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('spymasters');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [spymasters, setSpymasters] = useState<SpymasterEntry[]>([]);
  const [guessers, setGuessers] = useState<GuesserEntry[]>([]);
  const [clueStats, setClueStats] = useState<ClueStatEntry[]>([]);
  const [page, setPage] = useState(0);

  const [spySort, setSpySort] = useState<'avgScoreOnClues' | 'cluesGiven' | 'avgWordsPerClue'>('avgScoreOnClues');
  const [guesserSort, setGuesserSort] = useState<'avgScore' | 'cluesSolved' | 'avgWordsPicked'>('avgScore');
  const [clueSort, setClueSort] = useState<'attempts' | 'avgScore'>('attempts');

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

  const sortedSpymasters = useMemo(() =>
    [...spymasters].sort((a, b) => (b[spySort] as number) - (a[spySort] as number)),
    [spymasters, spySort]);

  const sortedGuessers = useMemo(() =>
    [...guessers].sort((a, b) => (b[guesserSort] as number) - (a[guesserSort] as number)),
    [guessers, guesserSort]);

  const sortedClues = useMemo(() =>
    [...clueStats].sort((a, b) => (b[clueSort] as number) - (a[clueSort] as number)),
    [clueStats, clueSort]);

  const getPage = <T,>(items: T[]) => {
    const pageCount = Math.ceil(items.length / PAGE_SIZE);
    const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    return { paged, pageCount };
  };

  const tabBtnClass = (active: boolean, color: string) =>
    `px-4 py-2 rounded-lg font-bold text-sm transition-colors ${active ? `${color} text-white` : 'bg-gray-800 text-gray-400 hover:text-white'}`;

  const thSortClass = (active: boolean) =>
    `py-2 text-right cursor-pointer hover:text-white transition-colors ${active ? 'text-board-blue' : ''}`;

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
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className="py-2 text-left w-[8%]">{t.leaderboard.rank}</th>
                    <th className="py-2 text-left w-[30%]">{t.leaderboard.player}</th>
                    <th className={`${thSortClass(spySort === 'cluesGiven')} w-[18%]`} onClick={() => { setSpySort('cluesGiven'); setPage(0); }}>{t.leaderboard.cluesGiven}</th>
                    <th className={`${thSortClass(spySort === 'avgWordsPerClue')} w-[22%]`} onClick={() => { setSpySort('avgWordsPerClue'); setPage(0); }}>{t.leaderboard.avgWordsPerClue}</th>
                    <th className={`${thSortClass(spySort === 'avgScoreOnClues')} w-[22%]`} onClick={() => { setSpySort('avgScoreOnClues'); setPage(0); }}>{t.leaderboard.avgScoreOnClues}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((s, i) => (
                    <tr key={s.userId} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-2">{page * PAGE_SIZE + i + 1}</td>
                      <td className="py-2 font-semibold truncate">
                        <button onClick={() => navigate(`/profile/${s.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{s.userId}</button>
                      </td>
                      <td className="py-2 text-right">{s.cluesGiven}</td>
                      <td className="py-2 text-right">{s.avgWordsPerClue.toFixed(1)}</td>
                      <td className="py-2 text-right">{s.avgScoreOnClues.toFixed(1)}</td>
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
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className="py-2 text-left w-[8%]">{t.leaderboard.rank}</th>
                    <th className="py-2 text-left w-[30%]">{t.leaderboard.player}</th>
                    <th className={`${thSortClass(guesserSort === 'cluesSolved')} w-[18%]`} onClick={() => { setGuesserSort('cluesSolved'); setPage(0); }}>{t.leaderboard.cluesSolved}</th>
                    <th className={`${thSortClass(guesserSort === 'avgWordsPicked')} w-[22%]`} onClick={() => { setGuesserSort('avgWordsPicked'); setPage(0); }}>{t.leaderboard.avgWordsPicked}</th>
                    <th className={`${thSortClass(guesserSort === 'avgScore')} w-[22%]`} onClick={() => { setGuesserSort('avgScore'); setPage(0); }}>{t.leaderboard.avgScore}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((g, i) => (
                    <tr key={g.userId} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-2">{page * PAGE_SIZE + i + 1}</td>
                      <td className="py-2 font-semibold truncate">
                        <button onClick={() => navigate(`/profile/${g.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{g.userId}</button>
                      </td>
                      <td className="py-2 text-right">{g.cluesSolved}</td>
                      <td className="py-2 text-right">{g.avgWordsPicked.toFixed(1)}</td>
                      <td className="py-2 text-right">{g.avgScore.toFixed(1)}</td>
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
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className="py-2 text-left w-[35%]">{t.leaderboard.clueWord}</th>
                    <th className="py-2 text-left w-[27%]">{t.leaderboard.author}</th>
                    <th className={`${thSortClass(clueSort === 'attempts')} w-[19%]`} onClick={() => { setClueSort('attempts'); setPage(0); }}>{t.leaderboard.attempts}</th>
                    <th className={`${thSortClass(clueSort === 'avgScore')} w-[19%]`} onClick={() => { setClueSort('avgScore'); setPage(0); }}>{t.leaderboard.avgScore}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c, i) => (
                    <tr key={`${c.word}-${i}`} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-2 font-bold uppercase">
                        {c.word} <span className="text-gray-500 font-normal">{c.number}</span>
                      </td>
                      <td className="py-2 truncate">
                        <button onClick={() => navigate(`/profile/${c.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{c.userId}</button>
                      </td>
                      <td className="py-2 text-right">{c.attempts}</td>
                      <td className="py-2 text-right">{c.avgScore.toFixed(1)}</td>
                    </tr>
                  ))}
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
