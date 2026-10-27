import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  Link as LinkIcon,
  Bookmark,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Award,
  Sparkles,
} from 'lucide-react';
import { Problem, ProblemProgress, SolutionLink } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { getProblemXP } from '../utils/gamification';

interface ProblemModalProps {
  problem: Problem | null;
  progress?: ProblemProgress;
  onClose: () => void;
  onSave: (problemId: string, updated: Partial<ProblemProgress>, justCompleted: boolean) => void;
}

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const ProblemModal: React.FC<ProblemModalProps> = ({
  problem,
  progress,
  onClose,
  onSave,
}) => {
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState(getTodayISO());
  const [solutionUrl, setSolutionUrl] = useState('');
  const [extraLinks, setExtraLinks] = useState<SolutionLink[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [notes, setNotes] = useState('');
  const [previewNotes, setPreviewNotes] = useState(false);

  useEffect(() => {
    if (problem) {
      setCompleted(Boolean(progress?.completed));
      setCompletedAt(progress?.completed_at || getTodayISO());
      setSolutionUrl(progress?.solution_url || '');
      setExtraLinks(progress?.extra_links || []);
      setBookmarked(Boolean(progress?.bookmarked));
      setNotes(progress?.notes || '');
      setPreviewNotes(false);
    }
  }, [problem, progress]);

  if (!problem) return null;

  const hasSolLink = Boolean(
    solutionUrl.trim() || extraLinks.some((l) => l.url.trim().length > 0)
  );
  const xpValue = getProblemXP(problem, hasSolLink);

  const handleAddExtraLink = () => {
    setExtraLinks([...extraLinks, { label: '', url: '' }]);
  };

  const handleUpdateExtraLink = (idx: number, field: 'label' | 'url', value: string) => {
    const next = [...extraLinks];
    next[idx] = { ...next[idx], [field]: value };
    setExtraLinks(next);
  };

  const handleRemoveExtraLink = (idx: number) => {
    setExtraLinks(extraLinks.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedExtra = extraLinks.filter((l) => l.url.trim().length > 0);
    const wasCompleted = Boolean(progress?.completed);
    const justCompleted = completed && !wasCompleted;

    onSave(
      problem.id,
      {
        completed,
        completed_at: completed ? completedAt || getTodayISO() : null,
        solution_url: solutionUrl.trim(),
        extra_links: cleanedExtra,
        bookmarked,
        notes: notes.trim(),
      },
      justCompleted
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {problem.code}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {problem.genre} • Pos {problem.position}
            </span>
            {problem.is_imo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Award className="w-3.5 h-3.5" />
                IMO Problem
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />+{xpValue} XP
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Problem Statement Preview Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              <span>Problem Statement</span>
              <div className="flex items-center gap-3">
                {problem.url && (
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline normal-case"
                  >
                    AoPS Thread <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {problem.booklet_url && (
                  <a
                    href={problem.booklet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:underline normal-case"
                  >
                    Official PDF <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <LatexRenderer content={problem.statement} />
          </div>

          {/* Status Toggles: Solved & Bookmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCompleted(!completed)}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                completed
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className={`w-5 h-5 ${
                    completed ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-semibold text-sm">
                    {completed ? 'Completed / Solved' : 'Mark as Completed'}
                  </div>
                  <div className="text-xs opacity-75">
                    {completed ? `Earns +${xpValue} XP` : 'Click to mark done'}
                  </div>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400'
                }`}
              >
                {completed && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBookmarked(!bookmarked)}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                bookmarked
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bookmark
                  className={`w-5 h-5 ${
                    bookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-semibold text-sm">
                    {bookmarked ? 'Bookmarked for Review' : 'Review Later'}
                  </div>
                  <div className="text-xs opacity-75">Save to your study queue</div>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  bookmarked ? 'border-amber-500 bg-amber-500' : 'border-slate-400'
                }`}
              >
                {bookmarked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          </div>

          {/* Date Completed */}
          {completed && (
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Date Completed
                </span>
                <button
                  type="button"
                  onClick={() => setCompletedAt(getTodayISO())}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline normal-case font-medium"
                >
                  Set to Today
                </button>
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Solution Links Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <LinkIcon className="w-4 h-4 text-indigo-500" />
                My Solution Link(s)
              </label>
              <button
                type="button"
                onClick={handleAddExtraLink}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Link
              </button>
            </div>
            <div className="relative">
              <input
                type="url"
                value={solutionUrl}
                onChange={(e) => setSolutionUrl(e.target.value)}
                placeholder="https://... (Overleaf, AoPS post, GitHub, Google Drive, Notion)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {extraLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => handleUpdateExtraLink(idx, 'label', e.target.value)}
                  placeholder="Label (e.g. Approach 2)"
                  className="w-1/3 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => handleUpdateExtraLink(idx, 'url', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExtraLink(idx)}
                  className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Remove link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Personal Notes / Key Idea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <FileText className="w-4 h-4 text-indigo-500" />
                Solution Notes / Key Lemma (Supports LaTeX $...$)
              </label>
              {notes.trim() && (
                <button
                  type="button"
                  onClick={() => setPreviewNotes(!previewNotes)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {previewNotes ? 'Edit Notes' : 'Preview LaTeX'}
                </button>
              )}
            </div>
            {previewNotes ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm min-h-[90px]">
                <LatexRenderer content={notes} />
              </div>
            ) : (
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write a brief sketch, key substitution, or why you found it tricky..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              Save Progress
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
