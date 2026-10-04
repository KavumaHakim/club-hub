import { supabase } from './supabaseClient';

// Duel rules: what a duel is made of. The challenger picks them for each challenge
// (remembered as their default on this device), within limits the patrons set for
// the whole club. The rules travel with the invite, so the opponent sees them
// before accepting, and are applied again (clamped to the current limits) when the
// duel is built.

export type DuelLanguage = 'python' | 'javascript';
export type DuelMix = 'MIXED' | 'QUIZ' | 'CODING';
export type DuelDifficulty = 'AUTO' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type DuelMatchKind = 'RANKED' | 'CASUAL';

export interface DuelRules {
  language: DuelLanguage;
  questionCount: number;
  mix: DuelMix;
  /** AUTO: matched to both players' skill levels. */
  difficulty: DuelDifficulty;
  quizSeconds: number;
  codingSeconds: number;
  matchType: DuelMatchKind;
}

export interface DuelRuleLimits {
  minQuestions: number;
  maxQuestions: number;
  languages: DuelLanguage[];
  mixes: DuelMix[];
  difficulties: DuelDifficulty[];
  quizSeconds: { min: number; max: number };
  codingSeconds: { min: number; max: number };
  rankedAllowed: boolean;
}

/** The choices the rules page offers (limits narrow these further). */
export const QUIZ_SECOND_CHOICES = [10, 15, 20, 30, 45, 60];
export const CODING_SECOND_CHOICES = [30, 45, 60, 90, 120, 180, 300];
/** One AI request builds the whole set; past this it gets unreliable. */
export const HARD_MAX_QUESTIONS = 16;

/** Today's duels, before rules existed. */
export const DEFAULT_RULES: DuelRules = {
  language: 'python',
  questionCount: 12,
  mix: 'MIXED',
  difficulty: 'AUTO',
  quizSeconds: 20,
  codingSeconds: 60,
  matchType: 'RANKED',
};

/** Until patrons change them: everything allowed. */
export const DEFAULT_LIMITS: DuelRuleLimits = {
  minQuestions: 3,
  maxQuestions: HARD_MAX_QUESTIONS,
  languages: ['python', 'javascript'],
  mixes: ['MIXED', 'QUIZ', 'CODING'],
  difficulties: ['AUTO', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  quizSeconds: { min: 10, max: 60 },
  codingSeconds: { min: 30, max: 300 },
  rankedAllowed: true,
};

export const LANGUAGE_LABEL: Record<DuelLanguage, string> = { python: 'Python', javascript: 'JavaScript' };
export const MIX_LABEL: Record<DuelMix, string> = { MIXED: 'Quiz and coding', QUIZ: 'Quiz only', CODING: 'Coding only' };
export const DIFFICULTY_LABEL: Record<DuelDifficulty, string> = {
  AUTO: 'Matched to both players',
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const clampNum = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

const pick = <T>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : allowed.includes(fallback) ? fallback : allowed[0];

/** Make any stored or received limits safe and self-consistent. */
export const normalizeLimits = (raw: any): DuelRuleLimits => {
  const d = DEFAULT_LIMITS;
  const list = <T>(v: unknown, all: T[]): T[] => {
    const kept = Array.isArray(v) ? all.filter((x) => (v as unknown[]).includes(x)) : all;
    return kept.length ? kept : all;
  };
  const maxQuestions = clampNum(raw?.maxQuestions, 1, HARD_MAX_QUESTIONS, d.maxQuestions);
  const minQuestions = clampNum(raw?.minQuestions, 1, maxQuestions, Math.min(d.minQuestions, maxQuestions));
  const range = (v: any, dr: { min: number; max: number }) => {
    const min = clampNum(v?.min, dr.min, dr.max, dr.min);
    return { min, max: clampNum(v?.max, min, dr.max, dr.max) };
  };
  return {
    minQuestions,
    maxQuestions,
    languages: list(raw?.languages, d.languages),
    mixes: list(raw?.mixes, d.mixes),
    difficulties: list(raw?.difficulties, d.difficulties),
    quizSeconds: range(raw?.quizSeconds, d.quizSeconds),
    codingSeconds: range(raw?.codingSeconds, d.codingSeconds),
    rankedAllowed: raw?.rankedAllowed !== false,
  };
};

/** Fit rules inside the limits, keeping as much of the choice as possible. */
export const clampRules = (raw: any, limits: DuelRuleLimits = DEFAULT_LIMITS): DuelRules => {
  const r = { ...DEFAULT_RULES, ...(raw || {}) };
  return {
    language: pick(r.language, limits.languages, DEFAULT_RULES.language),
    questionCount: clampNum(r.questionCount, limits.minQuestions, limits.maxQuestions, DEFAULT_RULES.questionCount),
    mix: pick(r.mix, limits.mixes, DEFAULT_RULES.mix),
    difficulty: pick(r.difficulty, limits.difficulties, DEFAULT_RULES.difficulty),
    quizSeconds: clampNum(r.quizSeconds, limits.quizSeconds.min, limits.quizSeconds.max, DEFAULT_RULES.quizSeconds),
    codingSeconds: clampNum(r.codingSeconds, limits.codingSeconds.min, limits.codingSeconds.max, DEFAULT_RULES.codingSeconds),
    matchType: limits.rankedAllowed && r.matchType !== 'CASUAL' ? 'RANKED' : 'CASUAL',
  };
};

/** How many of each kind. Mixed keeps today's balance: about two coding to one quiz. */
export const questionSplit = (rules: DuelRules): { quiz: number; coding: number } => {
  if (rules.mix === 'QUIZ') return { quiz: rules.questionCount, coding: 0 };
  if (rules.mix === 'CODING') return { quiz: 0, coding: rules.questionCount };
  const coding = Math.max(1, Math.round((rules.questionCount * 2) / 3));
  return { quiz: Math.max(1, rules.questionCount - coding), coding: Math.min(coding, rules.questionCount - 1) };
};

/** Longest the duel can take if every question runs to its timer. */
export const estimateSeconds = (rules: DuelRules) => {
  const { quiz, coding } = questionSplit(rules);
  return quiz * rules.quizSeconds + coding * rules.codingSeconds;
};

export const formatDuration = (seconds: number) => {
  const m = Math.round(seconds / 60);
  return m < 1 ? `${seconds} s` : `about ${m} min`;
};

/** One line for invites and the lobby: "12 questions · Python · quiz and coding · auto · ranked". */
export const summarizeRules = (rules: DuelRules) => {
  const { quiz, coding } = questionSplit(rules);
  const kinds = rules.mix === 'QUIZ' ? 'quiz only' : rules.mix === 'CODING' ? 'coding only' : `${coding} coding, ${quiz} quiz`;
  const level = rules.difficulty === 'AUTO' ? 'matched level' : DIFFICULTY_LABEL[rules.difficulty].toLowerCase();
  return `${rules.questionCount} questions · ${LANGUAGE_LABEL[rules.language]} · ${kinds} · ${level} · ${formatDuration(estimateSeconds(rules))}`;
};

// --- A member's own default rules (this device) ---

const rulesKey = (uid: string) => `duel_rules_${uid}`;

export const loadMyRules = (uid: string, limits: DuelRuleLimits = DEFAULT_LIMITS): DuelRules => {
  try {
    const raw = localStorage.getItem(rulesKey(uid));
    return clampRules(raw ? JSON.parse(raw) : DEFAULT_RULES, limits);
  } catch {
    return clampRules(DEFAULT_RULES, limits);
  }
};

export const saveMyRules = (uid: string, rules: DuelRules) => {
  try {
    localStorage.setItem(rulesKey(uid), JSON.stringify(rules));
  } catch {
    // storage blocked; the rules still apply for this session
  }
};

// --- The club's limits (patrons) ---

export const fetchRuleLimits = async (): Promise<DuelRuleLimits> => {
  try {
    const { data, error } = await supabase.from('duel_rule_limits').select('limits').eq('id', 1).maybeSingle();
    if (error || !data) return DEFAULT_LIMITS; // table not created yet, or no row: everything allowed
    return normalizeLimits(data.limits);
  } catch {
    return DEFAULT_LIMITS;
  }
};

export const saveRuleLimits = async (limits: DuelRuleLimits, patronUid: string): Promise<DuelRuleLimits> => {
  const clean = normalizeLimits(limits);
  const { error } = await supabase
    .from('duel_rule_limits')
    .upsert({ id: 1, limits: clean, updated_by: patronUid, updated_at: new Date().toISOString() });
  if (error) throw error;
  return clean;
};
