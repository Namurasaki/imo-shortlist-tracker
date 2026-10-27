export type GenreCode = 'A' | 'C' | 'G' | 'N';
export type GenreName = 'Algebra' | 'Combinatorics' | 'Geometry' | 'Number Theory';

export interface Problem {
  id: string;
  code: string;
  year: number;
  genre: GenreName;
  genre_code: GenreCode;
  position: number;
  pos_code: string;
  is_imo: boolean;
  is_scrapped: boolean;
  url: string;
  booklet_url: string;
  aops_collection_url: string;
  statement: string;
  is_revealed: boolean;
}

export interface SolutionLink {
  label: string;
  url: string;
}

export interface ProblemProgress {
  problem_id: string;
  completed: boolean;
  completed_at: string | null; // YYYY-MM-DD
  solution_url: string; // Primary solution link
  extra_links?: SolutionLink[]; // Optional additional links
  bookmarked: boolean; // "To Review Later"
  notes: string; // Personal notes / key lemma / reflection
  personal_difficulty?: number; // Optional 1-5 rating
  updated_at: string; // ISO string
}

export type ProgressMap = Record<string, ProblemProgress>;

export interface FilterState {
  search: string;
  genres: GenreCode[];
  minPos: number;
  maxPos: number;
  yearMin: number;
  yearMax: number;
  status: 'all' | 'completed' | 'unsolved' | 'bookmarked' | 'with_solution';
  imoOnly: boolean;
  hideUnrevealed: boolean;
  sortBy: 'year_desc' | 'year_asc' | 'pos_asc' | 'pos_desc' | 'completed_recent';
}

export interface BadgeStatus {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'milestone' | 'genre' | 'difficulty' | 'imo' | 'streak';
  unlocked: boolean;
  current: number;
  target: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export interface GamificationStats {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  totalSolved: number;
  totalBookmarked: number;
  totalWithSolutions: number;
  totalImoSolved: number;
  solvedByGenre: Record<GenreCode, number>;
  totalByGenre: Record<GenreCode, number>;
  solvedByPosition: Record<number, number>;
  totalByPosition: Record<number, number>;
  solvedByYear: Record<number, number>;
  totalByYear: Record<number, number>;
  activityByDate: Record<string, number>; // YYYY-MM-DD -> count
  badges: BadgeStatus[];
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
