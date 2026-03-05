import type { User } from '../types/user';

export function canPlayRanked(user: User | null): boolean {
  if (!user) return false;
  return !!user.hasOAuth && (user.casualCluesGiven ?? 0) >= 1 && (user.casualCluesSolved ?? 0) >= 5;
}

export function buildRankedLockMessage(user: User | null): string {
  if (!user) return '';
  const hasOAuth = !!user.hasOAuth;
  const hasGames = (user.casualCluesGiven ?? 0) >= 1 && (user.casualCluesSolved ?? 0) >= 5;
  if (hasOAuth && hasGames) return '';

  if (!hasOAuth && hasGames) {
    return 'Для игры в рейтинговом режиме необходима привязка профиля к Google или Discord';
  }

  const needClues = Math.max(0, 1 - (user.casualCluesGiven ?? 0));
  const needSolves = Math.max(0, 5 - (user.casualCluesSolved ?? 0));
  const parts: string[] = [];
  if (needClues > 0) parts.push(`${needClues} за капитана`);
  if (needSolves > 0) parts.push(`${needSolves} за разведчика`);
  const remaining = parts.length > 0 ? ` (осталось ${parts.join(' и ')})` : '';

  if (!hasOAuth) {
    return `Для игры в рейтинговом режиме необходима привязка профиля к Google или Discord, а также 1 игра за капитана и 5 за разведчика в обычном режиме${remaining}`;
  }
  return `Для игры в рейтинговом режиме необходима 1 игра за капитана и 5 за разведчика в обычном режиме${remaining}`;
}
