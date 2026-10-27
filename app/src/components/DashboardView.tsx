import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Link as LinkIcon,
  Award,
  Medal,
  Compass,
  ShieldCheck,
  Swords,
  Zap,
  Crown,
  CalendarCheck,
  Grid,
  Triangle,
  Hash,
  FunctionSquare,
  ExternalLink,
} from 'lucide-react';
import {
  BadgeStatus,
  GamificationStats,
  GenreCode,
  Problem,
  ProgressMap,
} from '../types';

interface DashboardViewProps {
  problems: Problem[];
  progressMap: ProgressMap;
  stats: GamificationStats;
  onSelectProblem: (problem: Problem) => void;
  onFilterByGenre: (genre: GenreCode) => void;
}

const BADGE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  Flame,
  Award,
  Crown,
  Compass,
  FunctionSquare,
  Grid,
  Triangle,
  Hash,
  ShieldCheck,
  Swords,
  Zap,
  Trophy,
  Medal,
  Link: LinkIcon,
  CalendarCheck,
};

const GENRE_INFO: {
  code: GenreCode;
  name: string;
  barColor: string;
  badgeBg: string;
  textColor: string;
}[] = [
  {
    code: 'A',
    name: 'Algebra',
    barColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/10 border-rose-500/25',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    code: 'C',
    name: 'Combinatorics',
    barColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/10 border-amber-500/25',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    code: 'G',
    name: 'Geometry',
    barColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/25',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    code: 'N',
    name: 'Number Theory',
    barColor: 'bg-sky-500',
    badgeBg: 'bg-sky-500/10 border-sky-500/25',
    textColor: 'text-sky-600 dark:text-sky-400',
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  problems,
  progressMap,
  stats,
  onSelectProblem,
  onFilterByGenre,
}) => {
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const totalRevealed = problems.filter((p) => p.is_revealed).length;
  const overallPercent =
    totalRevealed > 0 ? ((stats.totalSolved / totalRevealed) * 100).toFixed(1) : '0.0';
  const xpProgressPercent = Math.min(
    100,
    Math.round((stats.currentLevelXP / stats.nextLevelXP) * 100)
  );

  // Group problems by year for the Yearly Shortlist Matrix
  const years = Array.from(new Set(problems.filter((p) => p.is_revealed).map((p) => p.year))).sort(
    (a, b) => b - a
  );

  const filteredBadges = stats.badges.filter((b) => {
    if (badgeFilter === 'unlocked') return b.unlocked;
    if (badgeFilter === 'locked') return !b.unlocked;
    return true;
  });

  const unlockedCount = stats.badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Gamification & Rank Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Player Level & XP Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Level {stats.level} Olympiad Rank
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {stats.levelTitle}
              </h2>
              <p className="text-indigo-100/80 text-xs sm:text-sm">
                Earn XP by solving problems, tackling high shortlist positions, and linking your
                proofs.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-3xl font-black text-amber-300">
                  {stats.totalXP.toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">
                  Total XP
                </div>
              </div>
            </div>
          </div>

          {/* XP Level Progress Bar */}
          <div className="relative z-10 mt-5 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-indigo-100">
              <span>Level {stats.level} Progress</span>
              <span>
                {stats.currentLevelXP} / {stats.nextLevelXP} XP ({xpProgressPercent}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950/40 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-500"
                style={{ width: `${xpProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Streak & Consistency Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Study Streak
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {stats.currentStreak}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  {stats.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
            <div
              className={`p-3 rounded-2xl ${
                stats.activeToday
                  ? 'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <Flame className={`w-7 h-7 ${stats.activeToday ? 'fill-orange-500' : ''}`} />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Best Streak: </span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {stats.longestStreak} days
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                stats.activeToday
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {stats.activeToday ? 'Solved Today ✓' : 'No solve logged today'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>Total Solved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalSolved}
            </span>
            <span className="text-xs text-slate-500">
              / {totalRevealed} ({overallPercent}%)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>IMO Selected Solved</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalImoSolved}
            </span>
            <span className="text-xs text-slate-500">/ 126 official IMO</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>Solutions Linked</span>
            <LinkIcon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalWithSolutions}
            </span>
            <span className="text-xs text-slate-500">proofs archived</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>Review Queue</span>
            <Bookmark className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalBookmarked}
            </span>
            <span className="text-xs text-slate-500">bookmarked</span>
          </div>
        </div>
      </div>

      {/* Genre Breakdown & Shortlist Position Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Mastery */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Mastery by Subject Genre
            </h3>
            <span className="text-xs text-slate-400">Click a genre to filter</span>
          </div>

          <div className="space-y-3.5">
            {GENRE_INFO.map((g) => {
              const solved = stats.solvedByGenre[g.code] || 0;
              const total = stats.totalByGenre[g.code] || 1;
              const pct = Math.round((solved / total) * 100);
              return (
                <button
                  key={g.code}
                  type="button"
                  onClick={() => onFilterByGenre(g.code)}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-extrabold border ${g.badgeBg} ${g.textColor}`}
                      >
                        {g.code}
                      </span>
                      {g.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {solved} / {total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${g.barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortlist Position (Difficulty) Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Progress by Shortlist Position (Difficulty)
            </h3>
            <span className="text-xs text-slate-400">Pos 1 (Easy) → Pos 8+ (Boss)</span>
          </div>

          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => {
              const solved =
                pos === 8
                  ? (stats.solvedByPosition[8] || 0) +
                    (stats.solvedByPosition[9] || 0) +
                    (stats.solvedByPosition[10] || 0)
                  : stats.solvedByPosition[pos] || 0;
              const total =
                pos === 8
                  ? (stats.totalByPosition[8] || 0) +
                    (stats.totalByPosition[9] || 0) +
                    (stats.totalByPosition[10] || 0)
                  : stats.totalByPosition[pos] || 1;
              const pct = Math.round((solved / total) * 100);

              let barColor = 'bg-emerald-500';
              if (pos >= 3 && pos <= 4) barColor = 'bg-amber-500';
              if (pos >= 5 && pos <= 6) barColor = 'bg-orange-500';
              if (pos >= 7) barColor = 'bg-rose-500';

              return (
                <div key={pos} className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                    Pos {pos === 8 ? '8+' : pos}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-mono text-slate-500 dark:text-slate-400 shrink-0">
                    {solved}/{total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievements & Badges Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Olympiad Badges & Milestones ({unlockedCount} / {stats.badges.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unlock badges as you solve across genres, difficulty tiers, and IMO selections.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start">
            {(['all', 'unlocked', 'locked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBadgeFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  badgeFilter === tab
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredBadges.map((badge: BadgeStatus) => {
            const IconComponent = BADGE_ICONS[badge.icon] || Award;
            const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  badge.unlocked
                    ? 'bg-gradient-to-br from-amber-500/10 via-transparent to-indigo-500/5 border-amber-500/40 dark:border-amber-500/30'
                    : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800/70 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`p-2 rounded-xl ${
                        badge.unlocked
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        badge.unlocked
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {badge.unlocked ? 'Unlocked' : `${badge.current}/${badge.target}`}
                    </span>
                  </div>
                  <h4 className="mt-2.5 font-bold text-sm text-slate-900 dark:text-white">
                    {badge.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-3 pt-2">
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        badge.unlocked ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yearly Shortlist Completion Matrix (2025 down to 2006) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Yearly Shortlist Matrix (2006 – 2025)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any cell to view the problem statement, mark solved, or attach your solution
              link.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Solved
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500 inline-block" />{' '}
              Bookmarked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-indigo-500 inline-block" /> Official
              IMO
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <th className="py-2.5 pr-3">Year</th>
                <th className="py-2.5 px-2">Progress</th>
                <th className="py-2.5 px-2">Problems (A • C • G • N)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {years.map((yr) => {
                const yrProblems = problems
                  .filter((p) => p.year === yr && p.is_revealed)
                  .sort((a, b) => {
                    if (a.genre_code !== b.genre_code) {
                      return a.genre_code.localeCompare(b.genre_code);
                    }
                    return a.position - b.position;
                  });

                const solvedCount = stats.solvedByYear[yr] || 0;
                const totalCount = yrProblems.length;
                const pct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;
                const bookletUrl = yrProblems[0]?.booklet_url;

                return (
                  <tr key={yr} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white whitespace-nowrap align-top">
                      <div className="flex items-center gap-1.5">
                        <span>{yr}</span>
                        {bookletUrl && (
                          <a
                            href={bookletUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-indigo-500"
                            title={`Official ${yr} Shortlist Booklet PDF`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap align-top w-28">
                      <div className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {solvedCount}/{totalCount} ({pct}%)
                      </div>
                      <div className="w-20 h-1.5 mt-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {yrProblems.map((p) => {
                          const prog = progressMap[p.id];
                          const isDone = Boolean(prog?.completed);
                          const isBookmarked = Boolean(prog?.bookmarked);

                          let cellClass =
                            'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400';
                          if (isDone) {
                            cellClass =
                              'bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs';
                          } else if (isBookmarked) {
                            cellClass =
                              'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/60 font-semibold';
                          }

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => onSelectProblem(p)}
                              title={`${p.code}${p.is_imo ? ' (IMO Problem)' : ''}${
                                isDone ? ` • Solved ${prog?.completed_at || ''}` : ''
                              }`}
                              className={`px-1.5 py-0.5 rounded text-[11px] border transition-transform hover:scale-105 ${cellClass} ${
                                p.is_imo && !isDone
                                  ? 'ring-1 ring-indigo-500/60 dark:ring-indigo-400/70'
                                  : ''
                              }`}
                            >
                              {p.pos_code}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
