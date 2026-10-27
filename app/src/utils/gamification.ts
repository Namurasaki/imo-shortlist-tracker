import {
  BadgeStatus,
  GamificationStats,
  GenreCode,
  Problem,
  ProgressMap,
} from '../types';

export function getProblemXP(problem: Problem, hasSolutionLink = false): number {
  const posXPMap: Record<number, number> = {
    1: 15,
    2: 20,
    3: 30,
    4: 40,
    5: 55,
    6: 70,
    7: 90,
    8: 110,
    9: 125,
    10: 140,
  };
  let xp = posXPMap[problem.position] || 50;
  if (problem.is_imo) xp += 15;
  if (hasSolutionLink) xp += 5;
  return xp;
}

export function getDifficultyTier(position: number): {
  label: string;
  shortLabel: string;
  colorClass: string;
} {
  if (position <= 2) {
    return {
      label: 'Easy (Pos 1–2)',
      shortLabel: 'Easy',
      colorClass:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    };
  }
  if (position <= 4) {
    return {
      label: 'Medium (Pos 3–4)',
      shortLabel: 'Medium',
      colorClass:
        'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    };
  }
  if (position <= 6) {
    return {
      label: 'Hard (Pos 5–6)',
      shortLabel: 'Hard',
      colorClass:
        'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
    };
  }
  return {
    label: 'Boss (Pos 7+)',
    shortLabel: 'Boss',
    colorClass:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  };
}

const LEVEL_TITLES = [
  'Novice Problem Solver',
  'Olympiad Apprentice',
  'Shortlist Explorer',
  'National Finalist',
  'TST Contender',
  'Honorable Mention',
  'IMO Bronze Tier',
  'IMO Silver Tier',
  'IMO Gold Tier',
  '42/42 Grandmaster',
];

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeStreaks(activityByDate: Record<string, number>): {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
} {
  const dates = Object.keys(activityByDate)
    .filter((d) => activityByDate[d] > 0 && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeToday: false };
  }

  const dateSet = new Set(dates);
  const todayStr = getTodayDateString();
  const activeToday = dateSet.has(todayStr);

  // Longest streak calculation
  let longestStreak = 1;
  let running = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T00:00:00Z');
    const curr = new Date(dates[i] + 'T00:00:00Z');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else if (diffDays > 1) {
      running = 1;
    }
  }

  // Current streak: check backwards from today (or yesterday if not solved today yet)
  let currentStreak = 0;
  const cursor = new Date(todayStr + 'T00:00:00Z');
  if (!activeToday) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (dateSet.has(iso)) {
      currentStreak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak, activeToday };
}

export function calculateGamificationStats(
  problems: Problem[],
  progressMap: ProgressMap
): GamificationStats {
  const solvedByGenre: Record<GenreCode, number> = { A: 0, C: 0, G: 0, N: 0 };
  const totalByGenre: Record<GenreCode, number> = { A: 0, C: 0, G: 0, N: 0 };
  const solvedByPosition: Record<number, number> = {};
  const totalByPosition: Record<number, number> = {};
  const solvedByYear: Record<number, number> = {};
  const totalByYear: Record<number, number> = {};
  const activityByDate: Record<string, number> = {};

  let totalXP = 0;
  let totalSolved = 0;
  let totalBookmarked = 0;
  let totalWithSolutions = 0;
  let totalImoSolved = 0;
  let solvedPos12 = 0;
  let solvedPos35 = 0;
  let solvedPos6Plus = 0;
  let solvedPos7Plus = 0;

  for (const p of problems) {
    if (!p.is_revealed) continue;
    totalByGenre[p.genre_code] = (totalByGenre[p.genre_code] || 0) + 1;
    totalByPosition[p.position] = (totalByPosition[p.position] || 0) + 1;
    totalByYear[p.year] = (totalByYear[p.year] || 0) + 1;

    const prog = progressMap[p.id];
    if (!prog) continue;

    if (prog.bookmarked) {
      totalBookmarked += 1;
    }

    const hasSol = Boolean(
      (prog.solution_url && prog.solution_url.trim()) ||
        (prog.extra_links && prog.extra_links.length > 0)
    );
    if (hasSol) {
      totalWithSolutions += 1;
    }

    if (prog.completed) {
      totalSolved += 1;
      solvedByGenre[p.genre_code] = (solvedByGenre[p.genre_code] || 0) + 1;
      solvedByPosition[p.position] = (solvedByPosition[p.position] || 0) + 1;
      solvedByYear[p.year] = (solvedByYear[p.year] || 0) + 1;

      if (p.is_imo) totalImoSolved += 1;
      if (p.position <= 2) solvedPos12 += 1;
      else if (p.position <= 5) solvedPos35 += 1;
      if (p.position >= 6) solvedPos6Plus += 1;
      if (p.position >= 7) solvedPos7Plus += 1;

      totalXP += getProblemXP(p, hasSol);

      if (prog.completed_at) {
        const dateKey = prog.completed_at.slice(0, 10);
        activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
      }
    }
  }

  const { currentStreak, longestStreak, activeToday } = computeStreaks(activityByDate);

  // Level calculation: progressive curve (each level needs 150 * level XP)
  let level = 1;
  let xpCursor = totalXP;
  let neededForNext = 120;
  while (xpCursor >= neededForNext) {
    xpCursor -= neededForNext;
    level += 1;
    neededForNext = Math.round(120 * Math.pow(1.22, level - 1));
  }

  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const minAllGenres = Math.min(
    solvedByGenre.A,
    solvedByGenre.C,
    solvedByGenre.G,
    solvedByGenre.N
  );

  const badges: BadgeStatus[] = [
    {
      id: 'first-solve',
      title: 'First Q.E.D.',
      description: 'Mark your very first IMO Shortlist problem as solved.',
      icon: 'Sparkles',
      category: 'milestone',
      unlocked: totalSolved >= 1,
      current: Math.min(totalSolved, 1),
      target: 1,
      tier: 'bronze',
    },
    {
      id: 'ten-solves',
      title: 'Momentum Builder',
      description: 'Complete 10 IMO Shortlist problems.',
      icon: 'Flame',
      category: 'milestone',
      unlocked: totalSolved >= 10,
      current: Math.min(totalSolved, 10),
      target: 10,
      tier: 'bronze',
    },
    {
      id: 'fifty-solves',
      title: 'Half-Century Scholar',
      description: 'Complete 50 IMO Shortlist problems.',
      icon: 'Award',
      category: 'milestone',
      unlocked: totalSolved >= 50,
      current: Math.min(totalSolved, 50),
      target: 50,
      tier: 'silver',
    },
    {
      id: 'hundred-solves',
      title: 'Shortlist Centurion',
      description: 'Complete 100 IMO Shortlist problems.',
      icon: 'Crown',
      category: 'milestone',
      unlocked: totalSolved >= 100,
      current: Math.min(totalSolved, 100),
      target: 100,
      tier: 'gold',
    },
    {
      id: 'polymath',
      title: 'Balanced Polymath',
      description: 'Solve at least 5 problems in every genre (A, C, G, N).',
      icon: 'Compass',
      category: 'genre',
      unlocked: minAllGenres >= 5,
      current: Math.min(minAllGenres, 5),
      target: 5,
      tier: 'silver',
    },
    {
      id: 'algebra-master',
      title: 'Algebraic Virtuoso',
      description: 'Solve 15 Algebra (A) shortlist problems.',
      icon: 'FunctionSquare',
      category: 'genre',
      unlocked: solvedByGenre.A >= 15,
      current: Math.min(solvedByGenre.A, 15),
      target: 15,
      tier: 'gold',
    },
    {
      id: 'combo-master',
      title: 'Combinatorics Tactician',
      description: 'Solve 15 Combinatorics (C) shortlist problems.',
      icon: 'Grid',
      category: 'genre',
      unlocked: solvedByGenre.C >= 15,
      current: Math.min(solvedByGenre.C, 15),
      target: 15,
      tier: 'gold',
    },
    {
      id: 'geo-master',
      title: 'Synthetic Geometer',
      description: 'Solve 15 Geometry (G) shortlist problems.',
      icon: 'Triangle',
      category: 'genre',
      unlocked: solvedByGenre.G >= 15,
      current: Math.min(solvedByGenre.G, 15),
      target: 15,
      tier: 'gold',
    },
    {
      id: 'nt-master',
      title: 'Prime Architect',
      description: 'Solve 15 Number Theory (N) shortlist problems.',
      icon: 'Hash',
      category: 'genre',
      unlocked: solvedByGenre.N >= 15,
      current: Math.min(solvedByGenre.N, 15),
      target: 15,
      tier: 'gold',
    },
    {
      id: 'foundation-builder',
      title: 'Foundation Pillar',
      description: 'Solve 20 problems in Shortlist Positions 1–2.',
      icon: 'ShieldCheck',
      category: 'difficulty',
      unlocked: solvedPos12 >= 20,
      current: Math.min(solvedPos12, 20),
      target: 20,
      tier: 'silver',
    },
    {
      id: 'mid-slayer',
      title: 'Day-Two Contender',
      description: 'Solve 15 problems in Shortlist Positions 3–5.',
      icon: 'Swords',
      category: 'difficulty',
      unlocked: solvedPos35 >= 15,
      current: Math.min(solvedPos35, 15),
      target: 15,
      tier: 'gold',
    },
    {
      id: 'boss-slayer',
      title: 'Boss Slayer (P3/P6)',
      description: 'Conquer a problem at Shortlist Position 6 or higher.',
      icon: 'Zap',
      category: 'difficulty',
      unlocked: solvedPos6Plus >= 1,
      current: Math.min(solvedPos6Plus, 1),
      target: 1,
      tier: 'gold',
    },
    {
      id: 'grandmaster-slayer',
      title: 'Endgame Legend',
      description: 'Conquer 5 problems at Shortlist Position 7 or higher.',
      icon: 'Trophy',
      category: 'difficulty',
      unlocked: solvedPos7Plus >= 5,
      current: Math.min(solvedPos7Plus, 5),
      target: 5,
      tier: 'diamond',
    },
    {
      id: 'imo-paper',
      title: 'Full IMO Simulation',
      description: 'Solve 6 problems that were selected for the actual IMO.',
      icon: 'Medal',
      category: 'imo',
      unlocked: totalImoSolved >= 6,
      current: Math.min(totalImoSolved, 6),
      target: 6,
      tier: 'gold',
    },
    {
      id: 'proof-scribe',
      title: 'Archivist of Proofs',
      description: 'Attach solution links to 10 problems.',
      icon: 'Link',
      category: 'milestone',
      unlocked: totalWithSolutions >= 10,
      current: Math.min(totalWithSolutions, 10),
      target: 10,
      tier: 'silver',
    },
    {
      id: 'streak-7',
      title: '7-Day Olympiad Grind',
      description: 'Achieve a 7-day problem solving streak.',
      icon: 'CalendarCheck',
      category: 'streak',
      unlocked: longestStreak >= 7,
      current: Math.min(longestStreak, 7),
      target: 7,
      tier: 'gold',
    },
  ];

  return {
    totalXP,
    level,
    currentLevelXP: xpCursor,
    nextLevelXP: neededForNext,
    levelTitle,
    currentStreak,
    longestStreak,
    activeToday,
    totalSolved,
    totalBookmarked,
    totalWithSolutions,
    totalImoSolved,
    solvedByGenre,
    totalByGenre,
    solvedByPosition,
    totalByPosition,
    solvedByYear,
    totalByYear,
    activityByDate,
    badges,
  };
}
