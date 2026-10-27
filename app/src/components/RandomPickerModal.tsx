import React, { useState, useEffect, useMemo } from 'react';
import {
  Dices,
  X,
  CheckCircle2,
  Bookmark,
  ExternalLink,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  Award,
  SlidersHorizontal,
  Edit3,
} from 'lucide-react';
import { GenreCode, Problem, ProgressMap } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { getDifficultyTier, getProblemXP } from '../utils/gamification';

interface RandomPickerModalProps {
  isOpen: boolean;
  problems: Problem[];
  progressMap: ProgressMap;
  initialGenres: GenreCode[];
  initialMinPos: number;
  initialMaxPos: number;
  onClose: () => void;
  onToggleComplete: (problem: Problem) => void;
  onToggleBookmark: (problem: Problem) => void;
  onOpenDetailModal: (problem: Problem) => void;
}

const GENRE_META: { code: GenreCode; label: string; badgeClass: string }[] = [
  {
    code: 'A',
    label: 'Algebra',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  {
    code: 'C',
    label: 'Combinatorics',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    code: 'G',
    label: 'Geometry',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    code: 'N',
    label: 'Number Theory',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
];

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({
  isOpen,
  problems,
  progressMap,
  initialGenres,
  initialMinPos,
  initialMaxPos,
  onClose,
  onToggleComplete,
  onToggleBookmark,
  onOpenDetailModal,
}) => {
  const [selectedGenres, setSelectedGenres] = useState<GenreCode[]>(
    initialGenres.length > 0 ? initialGenres : ['A', 'C', 'G', 'N']
  );
  const [minPos, setMinPos] = useState<number>(initialMinPos || 1);
  const [maxPos, setMaxPos] = useState<number>(initialMaxPos || 8);
  const [unsolvedOnly, setUnsolvedOnly] = useState<boolean>(true);
  const [imoOnly, setImoOnly] = useState<boolean>(false);
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [pickedProblem, setPickedProblem] = useState<Problem | null>(null);

  // Practice stopwatch state
  const [seconds, setSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const candidatePool = useMemo(() => {
    return problems.filter((p) => {
      if (!p.is_revealed) return false;
      if (selectedGenres.length > 0 && !selectedGenres.includes(p.genre_code)) return false;
      if (p.position < minPos || p.position > maxPos) return false;
      if (imoOnly && !p.is_imo) return false;
      if (unsolvedOnly && progressMap[p.id]?.completed) return false;
      return true;
    });
  }, [problems, selectedGenres, minPos, maxPos, imoOnly, unsolvedOnly, progressMap]);

  const rollRandomProblem = (pool = candidatePool) => {
    if (pool.length === 0) {
      setPickedProblem(null);
      return;
    }
    if (pool.length === 1) {
      setPickedProblem(pool[0]);
      return;
    }
    // Avoid picking the exact same problem twice in a row if pool > 1
    const filtered = pickedProblem ? pool.filter((p) => p.id !== pickedProblem.id) : pool;
    const targetPool = filtered.length > 0 ? filtered : pool;
    const randomIndex = Math.floor(Math.random() * targetPool.length);
    setPickedProblem(targetPool[randomIndex]);
    setSeconds(0);
    setTimerRunning(false);
  };

  useEffect(() => {
    if (isOpen) {
      rollRandomProblem(candidatePool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleGenre = (g: GenreCode) => {
    if (selectedGenres.includes(g)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((x) => x !== g));
      }
    } else {
      setSelectedGenres([...selectedGenres, g]);
    }
  };

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const prog = pickedProblem ? progressMap[pickedProblem.id] : undefined;
  const isCompleted = Boolean(prog?.completed);
  const isBookmarked = Boolean(prog?.bookmarked);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Random Shortlist Picker
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {candidatePool.length} matching problems in your range
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Practice Timer */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
              <span>{formatTime(seconds)}</span>
              <button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400"
                title={timerRunning ? 'Pause timer' : 'Start practice timer'}
              >
                {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              {seconds > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setSeconds(0);
                  }}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Range Configuration Controls */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Genre & Shortlist Position Range
              </span>

              <div className="flex items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={unsolvedOnly}
                    onChange={(e) => setUnsolvedOnly(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Unsolved only
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={imoOnly}
                    onChange={(e) => setImoOnly(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  IMO Selected only
                </label>
                <button
                  type="button"
                  onClick={() => setBlindMode(!blindMode)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border transition-colors ${
                    blindMode
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                  title="Hide problem code & difficulty so you can solve blind"
                >
                  {blindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  Blind Mode
                </button>
              </div>
            </div>

            {/* Genre Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {GENRE_META.map((g) => {
                const active = selectedGenres.includes(g.code);
                return (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => toggleGenre(g.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? g.badgeClass + ' ring-1 ring-current'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {g.code} • {g.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedGenres(['A', 'C', 'G', 'N'])}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
              >
                Select All
              </button>
            </div>

            {/* Position Range & Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Position:
                </span>
                <select
                  value={minPos}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMinPos(v);
                    if (v > maxPos) setMaxPos(v);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      Min: Pos {n}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">to</span>
                <select
                  value={maxPos}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMaxPos(v);
                    if (v < minPos) setMinPos(v);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      Max: Pos {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Difficulty Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: 'Easy (1–2)', min: 1, max: 2 },
                  { label: 'Med (3–4)', min: 3, max: 4 },
                  { label: 'Hard (5–6)', min: 5, max: 6 },
                  { label: 'Boss (7+)', min: 7, max: 10 },
                  { label: 'All (1–10)', min: 1, max: 10 },
                ].map((preset) => {
                  const isCurrent = minPos === preset.min && maxPos === preset.max;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinPos(preset.min);
                        setMaxPos(preset.max);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Picked Problem Card */}
          {pickedProblem ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/20 dark:border-indigo-500/30 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {blindMode ? 'Mystery Shortlist Problem' : pickedProblem.code}
                  </span>
                  {!blindMode && (
                    <>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                          getDifficultyTier(pickedProblem.position).colorClass
                        }`}
                      >
                        {pickedProblem.genre} • Pos {pickedProblem.position}
                      </span>
                      {pickedProblem.is_imo && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Award className="w-3.5 h-3.5" />
                          IMO Selected
                        </span>
                      )}
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        +{getProblemXP(pickedProblem)} XP
                      </span>
                    </>
                  )}
                </div>

                {!blindMode && pickedProblem.url && (
                  <a
                    href={pickedProblem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    AoPS Discussion <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="py-2 text-slate-800 dark:text-slate-100 text-base">
                <LatexRenderer content={pickedProblem.statement} />
              </div>

              {/* Action Bar for Picked Problem */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(pickedProblem)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isCompleted ? 'Completed' : 'Quick Mark Done'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDetailModal(pickedProblem);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Log Date & Solution Link
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(pickedProblem)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isBookmarked
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => rollRandomProblem(candidatePool)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95"
                >
                  <Dices className="w-4 h-4" />
                  Roll Another Problem
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
              No problems match your current genre and difficulty range. Try widening the position
              range or unchecking "Unsolved only".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
