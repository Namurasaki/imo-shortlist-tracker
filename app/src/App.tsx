import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import Fuse from 'fuse.js';
import { User } from '@supabase/supabase-js';
import {
  Search,
  Dices,
  BarChart3,
  BookOpen,
  Bookmark,
  Sun,
  Moon,
  Cloud,
  Flame,
  Sparkles,
  RotateCcw,
  Award,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import rawProblems from './data/problems.json';
import {
  FilterState,
  GenreCode,
  Problem,
  ProblemProgress,
  ProgressMap,
} from './types';
import { calculateGamificationStats } from './utils/gamification';
import {
  getCurrentUser,
  getSupabaseClient,
  loadLocalProgress,
  loadThemePreference,
  pushSingleProgressToSupabase,
  saveLocalProgress,
  saveThemePreference,
  syncWithSupabase,
} from './utils/supabaseSync';
import { ProblemCard } from './components/ProblemCard';
import { ProblemModal } from './components/ProblemModal';
import { RandomPickerModal } from './components/RandomPickerModal';
import { DashboardView } from './components/DashboardView';
import { CloudSettingsModal } from './components/CloudSettingsModal';

const problemsData = rawProblems as Problem[];

type ActiveTab = 'problems' | 'bookmarks' | 'dashboard';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  genres: [],
  minPos: 1,
  maxPos: 10,
  yearMin: 2006,
  yearMax: 2025,
  status: 'all',
  imoOnly: false,
  hideUnrevealed: true,
  sortBy: 'year_desc',
};

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());
  const [activeTab, setActiveTab] = useState<ActiveTab>('problems');
  const [progressMap, setProgressMap] = useState<ProgressMap>(() => loadLocalProgress());
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState<number>(25);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Modals state
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [isRandomOpen, setIsRandomOpen] = useState<boolean>(false);
  const [isCloudOpen, setIsCloudOpen] = useState<boolean>(false);

  // Supabase Auth & Sync state
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Apply Dark Mode class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  // Initialize Supabase session listener if configured
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    getCurrentUser().then((u) => {
      setUser(u);
      if (u) {
        setSyncStatus('Syncing...');
        syncWithSupabase(loadLocalProgress()).then((res) => {
          if (!res.error) {
            setProgressMap(res.merged);
            setSyncStatus('Synced with Cloud ✓');
          } else {
            setSyncStatus(`Sync notice: ${res.error}`);
          }
        });
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        syncWithSupabase(loadLocalProgress()).then((res) => {
          if (!res.error) {
            setProgressMap(res.merged);
            setSyncStatus('Synced with Cloud ✓');
          }
        });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore if canvas fails
    }
  }, []);

  const updateProblemProgress = useCallback(
    (
      problemId: string,
      changes: Partial<ProblemProgress>,
      celebrateIfCompleted = false
    ) => {
      setProgressMap((prev) => {
        const existing: ProblemProgress = prev[problemId] || {
          problem_id: problemId,
          completed: false,
          completed_at: null,
          solution_url: '',
          extra_links: [],
          bookmarked: false,
          notes: '',
          updated_at: new Date().toISOString(),
        };

        const updatedItem: ProblemProgress = {
          ...existing,
          ...changes,
          problem_id: problemId,
          updated_at: new Date().toISOString(),
        };

        const nextMap = {
          ...prev,
          [problemId]: updatedItem,
        };

        saveLocalProgress(nextMap);
        pushSingleProgressToSupabase(updatedItem).catch(() => {});
        return nextMap;
      });

      if (celebrateIfCompleted) {
        triggerConfetti();
      }
    },
    [triggerConfetti]
  );

  const handleQuickToggleComplete = useCallback(
    (problem: Problem) => {
      const existing = progressMap[problem.id];
      const nextCompleted = !existing?.completed;
      updateProblemProgress(
        problem.id,
        {
          completed: nextCompleted,
          completed_at: nextCompleted
            ? existing?.completed_at || getTodayISO()
            : null,
        },
        nextCompleted
      );
    },
    [progressMap, updateProblemProgress]
  );

  const handleQuickToggleBookmark = useCallback(
    (problem: Problem) => {
      const existing = progressMap[problem.id];
      updateProblemProgress(problem.id, {
        bookmarked: !existing?.bookmarked,
      });
    },
    [progressMap, updateProblemProgress]
  );

  const handleManualSync = async () => {
    setSyncStatus('Syncing...');
    const res = await syncWithSupabase(progressMap);
    if (!res.error) {
      setProgressMap(res.merged);
      setSyncStatus(`Synced (${res.syncedCount} records) ✓`);
    } else {
      setSyncStatus(`Error: ${res.error}`);
    }
  };

  const handleImportProgress = (imported: ProgressMap) => {
    const merged = { ...progressMap, ...imported };
    setProgressMap(merged);
    saveLocalProgress(merged);
  };

  // Gamification & Progress Dashboard stats
  const stats = useMemo(
    () => calculateGamificationStats(problemsData, progressMap),
    [progressMap]
  );

  // Full-text search index with Fuse.js (includes problem code, statement, genre, and user notes)
  const fuse = useMemo(() => {
    const searchable = problemsData.map((p) => ({
      ...p,
      userNotes: progressMap[p.id]?.notes || '',
    }));
    return new Fuse(searchable, {
      keys: [
        { name: 'code', weight: 3 },
        { name: 'pos_code', weight: 2 },
        { name: 'statement', weight: 1 },
        { name: 'userNotes', weight: 1.5 },
      ],
      threshold: 0.28,
      ignoreLocation: true,
    });
  }, [progressMap]);

  // Filtered and sorted problems
  const filteredProblems = useMemo(() => {
    let baseList: Problem[] = problemsData;

    if (filters.search.trim().length > 0) {
      const query = filters.search.trim();
      // Also support exact substring match or Fuse fuzzy match
      const qLower = query.toLowerCase();
      const exactMatches = new Set(
        problemsData
          .filter(
            (p) =>
              p.code.toLowerCase().includes(qLower) ||
              p.statement.toLowerCase().includes(qLower) ||
              (progressMap[p.id]?.notes || '').toLowerCase().includes(qLower)
          )
          .map((p) => p.id)
      );
      const fuseResults = fuse.search(query).map((r) => r.item.id);
      const combinedIds = new Set([...exactMatches, ...fuseResults]);
      baseList = problemsData.filter((p) => combinedIds.has(p.id));
    }

    const result = baseList.filter((p) => {
      if (filters.hideUnrevealed && !p.is_revealed) return false;

      // Active tab override: if on 'bookmarks' tab, show only bookmarked problems
      if (activeTab === 'bookmarks' && !progressMap[p.id]?.bookmarked) {
        return false;
      }

      if (filters.genres.length > 0 && !filters.genres.includes(p.genre_code)) {
        return false;
      }

      if (p.position < filters.minPos || p.position > filters.maxPos) {
        return false;
      }

      if (p.year < filters.yearMin || p.year > filters.yearMax) {
        return false;
      }

      if (filters.imoOnly && !p.is_imo) {
        return false;
      }

      const prog = progressMap[p.id];
      if (filters.status === 'completed' && !prog?.completed) return false;
      if (filters.status === 'unsolved' && prog?.completed) return false;
      if (filters.status === 'bookmarked' && !prog?.bookmarked) return false;
      if (
        filters.status === 'with_solution' &&
        !prog?.solution_url?.trim() &&
        !(prog?.extra_links && prog.extra_links.length > 0)
      ) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (filters.sortBy === 'year_desc') {
        if (b.year !== a.year) return b.year - a.year;
        if (a.genre_code !== b.genre_code) return a.genre_code.localeCompare(b.genre_code);
        return a.position - b.position;
      }
      if (filters.sortBy === 'year_asc') {
        if (a.year !== b.year) return a.year - b.year;
        if (a.genre_code !== b.genre_code) return a.genre_code.localeCompare(b.genre_code);
        return a.position - b.position;
      }
      if (filters.sortBy === 'pos_asc') {
        if (a.position !== b.position) return a.position - b.position;
        return b.year - a.year;
      }
      if (filters.sortBy === 'pos_desc') {
        if (b.position !== a.position) return b.position - a.position;
        return b.year - a.year;
      }
      if (filters.sortBy === 'completed_recent') {
        const da = progressMap[a.id]?.completed_at || '';
        const db = progressMap[b.id]?.completed_at || '';
        if (db !== da) return db.localeCompare(da);
        return b.year - a.year;
      }
      return 0;
    });

    return result;
  }, [filters, activeTab, progressMap, fuse]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(25);
  }, [filters, activeTab]);

  const toggleGenreFilter = (g: GenreCode) => {
    setFilters((prev) => {
      const exists = prev.genres.includes(g);
      return {
        ...prev,
        genres: exists ? prev.genres.filter((x) => x !== g) : [...prev.genres, g],
      };
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const filteredSolvedCount = useMemo(
    () => filteredProblems.filter((p) => progressMap[p.id]?.completed).length,
    [filteredProblems, progressMap]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 sm:pb-8">
      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-base shadow-sm">
              ISL
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-none text-slate-900 dark:text-white">
                IMO Shortlist Tracker
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
                2006–2026 Database • {stats.totalSolved} Solved • Level {stats.level} (
                {stats.levelTitle})
              </p>
            </div>
          </div>

          {/* Desktop Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('problems')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'problems'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Problems ({problemsData.filter((p) => p.is_revealed).length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bookmarks')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bookmarks'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Review Later ({stats.totalBookmarked})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard & Badges
            </button>
          </nav>

          {/* Right Quick Actions: Gamification Pill, Random Pick, Cloud Sync, Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Streak & XP Mini Badge */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="hidden sm:inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold hover:border-indigo-500/40 transition-colors"
              title="View Progress Dashboard & Badges"
            >
              <span className="inline-flex items-center gap-1 text-orange-500">
                <Flame className={`w-4 h-4 ${stats.activeToday ? 'fill-orange-500' : ''}`} />
                {stats.currentStreak}d
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                {stats.totalXP} XP
              </span>
            </button>

            {/* Random Picker Trigger Button */}
            <button
              type="button"
              onClick={() => setIsRandomOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all active:scale-95"
              title="Pick a random ISL problem by genre and shortlist position"
            >
              <Dices className="w-4 h-4" />
              <span className="hidden sm:inline">Random Pick</span>
            </button>

            {/* Cloud Sync & Backup Button */}
            <button
              type="button"
              onClick={() => setIsCloudOpen(true)}
              className={`relative p-2 rounded-xl border transition-colors ${
                user
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-500'
              }`}
              title={
                user
                  ? `Cloud Sync Active (${user.email || 'GitHub'})`
                  : 'Cloud Sync (GitHub/Supabase) & JSON Backup'
              }
            >
              <Cloud className="w-4 h-4" />
              {user && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 flex-1">
        {activeTab === 'dashboard' ? (
          <DashboardView
            problems={problemsData}
            progressMap={progressMap}
            stats={stats}
            onSelectProblem={(p) => setEditingProblem(p)}
            onFilterByGenre={(g) => {
              setFilters((prev) => ({ ...prev, genres: [g] }));
              setActiveTab('problems');
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Search & Filter Control Panel */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-4">
              {/* Top Row: Full-Text Search Input & Mobile Filter Toggle */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search problem code (e.g. 2024 A1, G5), keywords (polynomial, circumcircle, prime), or your notes..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {filters.search && (
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, search: '' })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort Dropdown */}
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        sortBy: e.target.value as FilterState['sortBy'],
                      })
                    }
                    className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="year_desc">Newest Year First</option>
                    <option value="year_asc">Oldest Year First</option>
                    <option value="pos_asc">Position: Easy → Hard (1→9)</option>
                    <option value="pos_desc">Position: Hard → Easy (9→1)</option>
                    <option value="completed_recent">Recently Completed</option>
                  </select>

                  {/* Mobile Filter Expand Button */}
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        showMobileFilters ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Genre & Position Filter Controls (Always visible on desktop, collapsible on mobile) */}
              <div
                className={`${
                  showMobileFilters ? 'block' : 'hidden sm:block'
                } space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80`}
              >
                {/* Row 1: Subject Genre Multi-Select & Status Filter */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 mr-1">Genre:</span>
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, genres: [] })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        filters.genres.length === 0
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
                      }`}
                    >
                      All Genres
                    </button>

                    {(
                      [
                        {
                          code: 'A',
                          label: 'Algebra',
                          activeClass: 'bg-rose-500 text-white border-rose-500',
                        },
                        {
                          code: 'C',
                          label: 'Combinatorics',
                          activeClass: 'bg-amber-500 text-white border-amber-500',
                        },
                        {
                          code: 'G',
                          label: 'Geometry',
                          activeClass: 'bg-emerald-500 text-white border-emerald-500',
                        },
                        {
                          code: 'N',
                          label: 'Number Theory',
                          activeClass: 'bg-sky-500 text-white border-sky-500',
                        },
                      ] as const
                    ).map((g) => {
                      const isSelected = filters.genres.includes(g.code);
                      return (
                        <button
                          key={g.code}
                          type="button"
                          onClick={() => toggleGenreFilter(g.code)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? g.activeClass
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {g.code} • {g.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'unsolved', label: 'Unsolved' },
                        { id: 'completed', label: 'Solved' },
                        { id: 'bookmarked', label: 'Bookmarked' },
                        { id: 'with_solution', label: 'Has Link' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFilters({ ...filters, status: st.id })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          filters.status === st.id
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 2: Shortlist Position (Difficulty) Range, Year Range & IMO Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Shortlist Position Range */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      Shortlist Position:
                    </span>
                    <select
                      value={filters.minPos}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFilters((prev) => ({
                          ...prev,
                          minPos: v,
                          maxPos: Math.max(v, prev.maxPos),
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>
                          Min: {n}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-400">–</span>
                    <select
                      value={filters.maxPos}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFilters((prev) => ({
                          ...prev,
                          maxPos: v,
                          minPos: Math.min(v, prev.minPos),
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>
                          Max: {n}
                        </option>
                      ))}
                    </select>

                    {/* Quick Position Tier Presets */}
                    <div className="flex items-center gap-1 ml-1">
                      {[
                        { label: '1–2', min: 1, max: 2 },
                        { label: '3–4', min: 3, max: 4 },
                        { label: '5–6', min: 5, max: 6 },
                        { label: '7+', min: 7, max: 10 },
                        { label: 'All', min: 1, max: 10 },
                      ].map((tier) => {
                        const active =
                          filters.minPos === tier.min && filters.maxPos === tier.max;
                        return (
                          <button
                            key={tier.label}
                            type="button"
                            onClick={() =>
                              setFilters({ ...filters, minPos: tier.min, maxPos: tier.max })
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                              active
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {tier.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year Range & IMO Toggle & Reset */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-400">Year:</span>
                      <select
                        value={filters.yearMin}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setFilters((prev) => ({
                            ...prev,
                            yearMin: v,
                            yearMax: Math.max(v, prev.yearMax),
                          }));
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                      >
                        {Array.from({ length: 21 }, (_, i) => 2006 + i).map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-400">–</span>
                      <select
                        value={filters.yearMax}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setFilters((prev) => ({
                            ...prev,
                            yearMax: v,
                            yearMin: Math.min(v, prev.yearMin),
                          }));
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                      >
                        {Array.from({ length: 21 }, (_, i) => 2006 + i).map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, imoOnly: !filters.imoOnly })}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        filters.imoOnly
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      IMO Only
                    </button>

                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Summary Bar */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-200">{filteredProblems.length}</strong>{' '}
                  problems
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {filteredSolvedCount} solved in current view (
                  {filteredProblems.length > 0
                    ? Math.round((filteredSolvedCount / filteredProblems.length) * 100)
                    : 0}
                  %)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsRandomOpen(true)}
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Dices className="w-3.5 h-3.5" />
                Random pick from current range
              </button>
            </div>

            {/* Problem List */}
            {filteredProblems.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                  {activeTab === 'bookmarks'
                    ? 'Your Review Later bookmark list is empty'
                    : 'No shortlist problems match your current filters'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeTab === 'bookmarks'
                    ? 'Click the bookmark icon on any problem to save it here for upcoming study sessions.'
                    : 'Try clearing your search query or expanding the genre and shortlist position range.'}
                </p>
                {activeTab !== 'bookmarks' && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredProblems.slice(0, visibleCount).map((problem) => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    progress={progressMap[problem.id]}
                    onQuickToggleComplete={handleQuickToggleComplete}
                    onQuickToggleBookmark={handleQuickToggleBookmark}
                    onOpenModal={(p) => setEditingProblem(p)}
                  />
                ))}

                {visibleCount < filteredProblems.length && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 30)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-all shadow-xs"
                    >
                      Load More Problems ({filteredProblems.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-2">
        <button
          type="button"
          onClick={() => setActiveTab('problems')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            activeTab === 'problems'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Problems</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookmarks')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            activeTab === 'bookmarks'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span>Saved ({stats.totalBookmarked})</span>
        </button>

        <button
          type="button"
          onClick={() => setIsRandomOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
        >
          <Dices className="w-5 h-5" />
          <span>Random</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            activeTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Stats ({stats.totalSolved})</span>
        </button>
      </nav>

      {/* Problem Edit / Log Solution Modal */}
      <ProblemModal
        problem={editingProblem}
        progress={editingProblem ? progressMap[editingProblem.id] : undefined}
        onClose={() => setEditingProblem(null)}
        onSave={updateProblemProgress}
      />

      {/* Random ISL Picker Modal */}
      <RandomPickerModal
        isOpen={isRandomOpen}
        problems={problemsData}
        progressMap={progressMap}
        initialGenres={filters.genres}
        initialMinPos={filters.minPos}
        initialMaxPos={filters.maxPos}
        onClose={() => setIsRandomOpen(false)}
        onToggleComplete={handleQuickToggleComplete}
        onToggleBookmark={handleQuickToggleBookmark}
        onOpenDetailModal={(p) => setEditingProblem(p)}
      />

      {/* Cloud Sync (Supabase + GitHub) & Local JSON Backup Modal */}
      <CloudSettingsModal
        isOpen={isCloudOpen}
        onClose={() => setIsCloudOpen(false)}
        progressMap={progressMap}
        onImportProgress={handleImportProgress}
        user={user}
        onUserChange={setUser}
        onManualSync={handleManualSync}
        syncStatus={syncStatus}
      />
    </div>
  );
};

export default App;
