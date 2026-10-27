import React, { useState } from 'react';
import {
  X,
  Cloud,
  Github,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Database,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ProgressMap, SupabaseConfig } from '../types';
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  signInWithGitHub,
  signOutSupabase,
  SUPABASE_SETUP_SQL,
} from '../utils/supabaseSync';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressMap: ProgressMap;
  onImportProgress: (imported: ProgressMap) => void;
  user: User | null;
  onUserChange: (u: User | null) => void;
  onManualSync: () => Promise<void>;
  syncStatus: string;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({
  isOpen,
  onClose,
  progressMap,
  onImportProgress,
  user,
  onUserChange,
  onManualSync,
  syncStatus,
}) => {
  const initialConfig = loadSupabaseConfig();
  const [url, setUrl] = useState(initialConfig.url);
  const [anonKey, setAnonKey] = useState(initialConfig.anonKey);
  const [configSaved, setConfigSaved] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [authError, setAuthError] = useState('');
  const [importMessage, setImportMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
    };
    saveSupabaseConfig(cleaned);
    setConfigSaved(true);
    setAuthError('');
    setTimeout(() => setConfigSaved(false), 2500);
  };

  const handleGitHubLogin = async () => {
    setAuthError('');
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    const res = await signInWithGitHub();
    if (res.error) {
      setAuthError(res.error);
    }
  };

  const handleSignOut = async () => {
    await signOutSupabase();
    onUserChange(null);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  const handleExportJson = () => {
    const payload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      progress: progressMap,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `isl-progress-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        const incoming: ProgressMap = parsed.progress || parsed;
        if (typeof incoming === 'object' && incoming !== null) {
          onImportProgress(incoming);
          setImportMessage(
            `Successfully imported ${Object.keys(incoming).length} problem records!`
          );
          setTimeout(() => setImportMessage(''), 4000);
        }
      } catch {
        setAuthError('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Cloud Sync (Supabase + GitHub) & Data Backup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Works offline in Local Mode by default • Connect Supabase for cross-device sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          {/* Status / Error Banner */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {importMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{importMessage}</span>
            </div>
          )}

          {/* Section 1: GitHub Authentication & Real-time Sync */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Github className="w-4 h-4" />
                1. GitHub Cloud Sync Account
              </h3>
              {syncStatus && (
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {syncStatus}
                </span>
              )}
            </div>

            {user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                    Signed in via GitHub
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                    {user.email || user.user_metadata?.user_name || user.id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onManualSync}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync Now
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Sign in with GitHub once your Supabase project URL & key are saved below to sync
                  your progress between your PC and phone.
                </p>
                <button
                  type="button"
                  onClick={handleGitHubLogin}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity shrink-0"
                >
                  <Github className="w-4 h-4" />
                  Sign in with GitHub
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Supabase Project Configuration */}
          <form
            onSubmit={handleSaveConfig}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" />
                2. Supabase Connection Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSql(!showSql)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showSql ? 'Hide Setup SQL' : 'View Setup SQL Schema'}
              </button>
            </div>

            {showSql && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Paste this once into your Supabase SQL Editor:</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  >
                    {sqlCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy SQL
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Supabase Anon Public Key
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {configSaved && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Credentials saved!
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Save Supabase Credentials
              </button>
            </div>
          </form>

          {/* Section 3: Local JSON Export / Import Backup */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Local JSON Backup (Export / Import)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download a full snapshot of your solved problems, completion dates, bookmarks, and
              solution links at any time.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                Export Progress (.json)
              </button>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-500" />
                Import Progress (.json)
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
