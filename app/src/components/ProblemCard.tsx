import React from 'react';
import {
  CheckCircle2,
  Bookmark,
  Calendar,
  Link as LinkIcon,
  ExternalLink,
  Award,
  FileText,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { GenreCode, Problem, ProblemProgress } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { getDifficultyTier, getProblemXP } from '../utils/gamification';

interface ProblemCardProps {
  problem: Problem;
  progress?: ProblemProgress;
  onQuickToggleComplete: (problem: Problem) => void;
  onQuickToggleBookmark: (problem: Problem) => void;
  onOpenModal: (problem: Problem) => void;
}

const GENRE_STYLES: Record<GenreCode, string> = {
  A: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  C: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  G: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  N: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
};

export const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  progress,
  onQuickToggleComplete,
  onQuickToggleBookmark,
  onOpenModal,
}) => {
  const isCompleted = Boolean(progress?.completed);
  const isBookmarked = Boolean(progress?.bookmarked);
  const hasSolution = Boolean(
    (progress?.solution_url && progress.solution_url.trim()) ||
      (progress?.extra_links && progress.extra_links.length > 0)
  );
  const hasNotes = Boolean(progress?.notes && progress.notes.trim());
  const diffTier = getDifficultyTier(problem.position);
  const xp = getProblemXP(problem, hasSolution);

  return (
    <div
      className={`group rounded-2xl border transition-all duration-200 p-4 sm:p-5 ${
        isCompleted
          ? 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04] border-emerald-500/35 dark:border-emerald-500/30'
          : isBookmarked
          ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.03] border-amber-500/35 dark:border-amber-500/30'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
      } shadow-xs`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Mark/Unmark Button */}
          <button
            type="button"
            onClick={() => onQuickToggleComplete(problem)}
            title={isCompleted ? 'Click to unmark solved' : 'Click to mark solved today'}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl border transition-all ${
              isCompleted
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs scale-105'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          {/* Problem Code */}
          <button
            type="button"
            onClick={() => onOpenModal(problem)}
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {problem.code}
          </button>

          {/* Genre Badge */}
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              GENRE_STYLES[problem.genre_code]
            }`}
          >
            {problem.genre}
          </span>

          {/* Shortlist Position / Difficulty Badge */}
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${diffTier.colorClass}`}
          >
            Pos {problem.position} ({diffTier.shortLabel})
          </span>

          {/* Official IMO Selection Badge */}
          {problem.is_imo && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <Award className="w-3.5 h-3.5" />
              IMO
            </span>
          )}

          {/* XP Value */}
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />+{xp} XP
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Completed Date Pill */}
          {isCompleted && progress?.completed_at && (
            <button
              type="button"
              onClick={() => onOpenModal(problem)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              title="Click to edit completion date"
            >
              <Calendar className="w-3.5 h-3.5" />
              {progress.completed_at}
            </button>
          )}

          {/* Bookmark Toggle */}
          <button
            type="button"
            onClick={() => onQuickToggleBookmark(problem)}
            title={isBookmarked ? 'Remove from Review Later' : 'Bookmark to Review Later'}
            className={`p-2 rounded-xl border transition-colors ${
              isBookmarked
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Edit Details / Attach Solution Link Button */}
          <button
            type="button"
            onClick={() => onOpenModal(problem)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {hasSolution ? 'Edit Solution / Date' : 'Log Solution / Date'}
            </span>
          </button>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="mt-3.5 text-sm sm:text-[15px] text-slate-800 dark:text-slate-100">
        <LatexRenderer content={problem.statement} />
      </div>

      {/* Attached Solution Links & Notes Bar */}
      {(hasSolution || hasNotes || problem.url) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
          {hasNotes && progress?.notes && (
            <div className="p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                <FileText className="w-3.5 h-3.5" />
                My Notes / Key Idea:
              </div>
              <LatexRenderer content={progress.notes} />
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center flex-wrap gap-2">
              {progress?.solution_url && (
                <a
                  href={progress.solution_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-2xs transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  My Solution
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {progress?.extra_links?.map((lk, idx) => (
                <a
                  key={idx}
                  href={lk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
                >
                  <LinkIcon className="w-3 h-3" />
                  {lk.label || `Solution ${idx + 2}`}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3 ml-auto text-slate-500 dark:text-slate-400">
              {problem.url && (
                <a
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                >
                  AoPS Thread <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {problem.booklet_url && (
                <a
                  href={problem.booklet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                >
                  Booklet PDF <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
