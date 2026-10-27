import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { ProblemProgress, ProgressMap, SupabaseConfig } from '../types';

const PROGRESS_STORAGE_KEY = 'isl_tracker_progress_v1';
const SUPABASE_CONFIG_KEY = 'isl_tracker_supabase_config_v1';
const THEME_STORAGE_KEY = 'isl_tracker_theme_v1';

let supabaseInstance: SupabaseClient | null = null;
let cachedConfigKey = '';

export function loadLocalProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch (e) {
    console.error('Failed to load progress from localStorage:', e);
    return {};
  }
}

export function saveLocalProgress(progress: ProgressMap): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress to localStorage:', e);
  }
}

function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export function loadSupabaseConfig(): SupabaseConfig {
  const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  try {
    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SupabaseConfig;
      return {
        url: normalizeSupabaseUrl(parsed.url || '') || envUrl,
        anonKey: (parsed.anonKey || '').trim() || envKey,
      };
    }
  } catch {
    // ignore
  }
  return { url: envUrl, anonKey: envKey };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  const cleaned: SupabaseConfig = {
    url: normalizeSupabaseUrl(config.url),
    anonKey: config.anonKey.trim(),
  };
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(cleaned));
  // Reset cached client
  supabaseInstance = null;
  cachedConfigKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = loadSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  const key = `${config.url}::${config.anonKey}`;
  if (supabaseInstance && cachedConfigKey === key) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey);
    cachedConfigKey = key;
    return supabaseInstance;
  } catch (e) {
    console.error('Invalid Supabase configuration:', e);
    return null;
  }
}

export async function signInWithGitHub(): Promise<{ error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Please configure your Supabase Project URL and Anon Key first.' };
  }
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
    },
  });
  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

/**
 * Fetches remote user_progress rows and merges with local progress using updated_at timestamps.
 */
export async function syncWithSupabase(localMap: ProgressMap): Promise<{
  merged: ProgressMap;
  syncedCount: number;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { merged: localMap, syncedCount: 0, error: 'Supabase not configured' };
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { merged: localMap, syncedCount: 0, error: 'Not signed in' };
  }

  const { data: remoteRows, error: fetchError } = await client
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id);

  if (fetchError) {
    return { merged: localMap, syncedCount: 0, error: fetchError.message };
  }

  const merged: ProgressMap = { ...localMap };
  const toUpsert: Record<string, unknown>[] = [];

  const remoteMap: ProgressMap = {};
  for (const row of remoteRows || []) {
    remoteMap[row.problem_id] = {
      problem_id: row.problem_id,
      completed: Boolean(row.is_completed),
      completed_at: row.completed_at || null,
      solution_url: row.solution_url || '',
      extra_links: row.extra_links || [],
      bookmarked: Boolean(row.is_bookmarked),
      notes: row.notes || '',
      personal_difficulty: row.personal_difficulty || undefined,
      updated_at: row.updated_at || new Date(0).toISOString(),
    };
  }

  const allProblemIds = new Set([...Object.keys(localMap), ...Object.keys(remoteMap)]);

  for (const pid of allProblemIds) {
    const loc = localMap[pid];
    const rem = remoteMap[pid];

    if (loc && !rem) {
      merged[pid] = loc;
      toUpsert.push(formatRowForSupabase(user.id, loc));
    } else if (!loc && rem) {
      merged[pid] = rem;
    } else if (loc && rem) {
      const locTime = new Date(loc.updated_at || 0).getTime();
      const remTime = new Date(rem.updated_at || 0).getTime();
      if (locTime > remTime) {
        merged[pid] = loc;
        toUpsert.push(formatRowForSupabase(user.id, loc));
      } else {
        merged[pid] = rem;
      }
    }
  }

  if (toUpsert.length > 0) {
    const { error: upsertError } = await client
      .from('user_progress')
      .upsert(toUpsert, { onConflict: 'user_id,problem_id' });

    if (upsertError) {
      return { merged, syncedCount: 0, error: upsertError.message };
    }
  }

  saveLocalProgress(merged);
  return { merged, syncedCount: allProblemIds.size };
}

export async function pushSingleProgressToSupabase(item: ProblemProgress): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  await client
    .from('user_progress')
    .upsert(formatRowForSupabase(user.id, item), { onConflict: 'user_id,problem_id' });
}

function formatRowForSupabase(userId: string, item: ProblemProgress) {
  return {
    user_id: userId,
    problem_id: item.problem_id,
    is_completed: item.completed,
    completed_at: item.completed_at,
    solution_url: item.solution_url,
    extra_links: item.extra_links || [],
    is_bookmarked: item.bookmarked,
    notes: item.notes,
    personal_difficulty: item.personal_difficulty || null,
    updated_at: item.updated_at,
  };
}

export function loadThemePreference(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // ignore
  }
  return 'dark';
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export const SUPABASE_SETUP_SQL = `-- Run this in your Supabase SQL Editor to set up the IMO Shortlist Tracker table:

create table if not exists public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  problem_id text not null,
  is_completed boolean default false,
  completed_at text,
  solution_url text default '',
  extra_links jsonb default '[]'::jsonb,
  is_bookmarked boolean default false,
  notes text default '',
  personal_difficulty integer,
  updated_at timestamptz default now(),
  unique(user_id, problem_id)
);

alter table public.user_progress enable row level security;

create policy "Users can manage their own shortlist progress"
  on public.user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;
