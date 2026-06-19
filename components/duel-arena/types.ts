export type DuelRank =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster'
  | 'Legendary';

export type MatchType = 'Ranked' | 'Casual' | 'Tournament';
export type DuelViewMode = 'duel' | 'spectator';
export type DuelStatus = 'countdown' | 'live' | 'overtime' | 'sudden-death' | 'finished';
export type DuelDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Elite';
export type DuelLanguage = 'typescript' | 'javascript' | 'python' | 'cpp';
export type ArenaEditorLanguage = DuelLanguage | 'markdown' | 'plaintext' | 'json';
export type IntegrityLevel = 'Stable' | 'Warning' | 'Critical';
export type ConnectionStatus = 'Stable' | 'Degraded' | 'Reconnecting';
export type JudgeVerdict = 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error';
export type JudgeStage = 'Idle' | 'Compiling' | 'Running' | 'Evaluating' | 'Finished';
export type ArenaThemePreset = 'arena-pulse' | 'midnight-circuit' | 'terminal-ice';
export type MobileArenaPanel = 'problem' | 'editor' | 'intel';

export interface ArenaProblemExample {
  id: string;
  input: string;
  output: string;
  explanation: string;
}

export interface ArenaProblemSection {
  id: string;
  title: string;
  markdown: string;
  defaultOpen?: boolean;
}

export interface ArenaProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: DuelDifficulty;
  solveRate: number;
  averageCompletionMins: number;
  xpReward: number;
  statementMarkdown: string;
  sections: ArenaProblemSection[];
  constraints: string[];
  examples: ArenaProblemExample[];
  hiddenHints: string[];
  tags: string[];
  /** Number of revealed sample test cases (the `examples`). */
  publicTestCount: number;
  /** Hidden cases run only on submit; their inputs are never shown. */
  hiddenTestCount: number;
  totalTestCount: number;
}

export type DuelPhase = 'loading' | 'lobby' | 'preparing' | 'arena';

export interface ArenaParticipant {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  rating: number;
  rank: DuelRank;
  division: string;
  typingSpeed: number;
  accuracy: number;
  progress: number;
  momentum: number;
  compileAttempts: number;
  testCasesPassed: number;
  currentStreak: number;
  estimatedStatus: string;
  liveTyping: boolean;
  runtimeMs: number;
  memoryMb: number;
}

export interface ArenaLadderEntry {
  id: string;
  name: string;
  handle: string;
  rating: number;
  rank: DuelRank;
  trend: 'up' | 'down' | 'steady';
  winRate: number;
}

export interface ArenaTournamentRound {
  id: string;
  label: string;
  status: 'done' | 'live' | 'upcoming';
  players: [string, string];
}

export interface ArenaTournamentState {
  name: string;
  currentRound: string;
  prizePool: string;
  eliminationStatus: string;
  nextOpponent: string;
  rounds: ArenaTournamentRound[];
}

export interface ArenaReaction {
  id: string;
  label: string;
  intensity: number;
  accent: 'cyan' | 'violet' | 'rose' | 'amber' | 'emerald';
  source: string;
}

export interface ArenaChatMessage {
  id: string;
  author: string;
  handle: string;
  body: string;
  kind: 'chat' | 'taunt' | 'system';
  createdAtLabel: string;
}

export interface ArenaReplayMoment {
  id: string;
  timeLabel: string;
  event: string;
  intensity: number;
}

export interface ArenaAntiCheatState {
  trustScore: number;
  focusWarnings: number;
  inactivityWarnings: number;
  clipboardWarnings: number;
  aiAssistRisk: number;
  integrity: IntegrityLevel;
  overlayVisible: boolean;
  overlayMessage: string | null;
}

export interface ArenaEditorFile {
  id: string;
  name: string;
  language: ArenaEditorLanguage;
  content: string;
  readOnly?: boolean;
}

export interface ArenaEdgeCaseResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

export interface ArenaSubmissionFeedback {
  id: string;
  kind: 'run' | 'submit';
  verdict: JudgeVerdict | null;
  verdictLabel: string;
  stage: JudgeStage;
  progress: number;
  passed: number;
  total: number;
  runtimeMs: number;
  memoryMb: number;
  percentile: number;
  efficiencyScore: number;
  hiddenFailureReason?: string;
  edgeCases: ArenaEdgeCaseResult[];
  timeline: string[];
}

export interface ArenaSubmissionHistoryItem {
  id: string;
  verdict: JudgeVerdict;
  passed: number;
  total: number;
  runtimeMs: number;
  createdAtLabel: string;
}

export interface ArenaResultSummary {
  outcome: 'victory' | 'defeat' | 'draw';
  ratingDelta: number;
  xpEarned: number;
  streakDelta: number;
  accuracy: number;
  runtimeMs: number;
  typingSpeed: number;
  achievements: string[];
  /** Quiz duel scores. */
  selfCorrect?: number;
  opponentCorrect?: number;
  totalQuestions?: number;
}

export interface ArenaQuizFeedback {
  correct: boolean;
  message: string;
  /** Shown when wrong: the expected answer (quiz) or pass summary (coding). */
  expected?: string;
}

export interface ArenaEditorSettings {
  themePreset: ArenaThemePreset;
  fontSize: number;
  vimMode: boolean;
  minimap: boolean;
}

export interface ArenaSession {
  id: string;
  mode: DuelViewMode;
  matchType: MatchType;
  status: DuelStatus;
  countdown: number;
  timeRemaining: number;
  totalTime: number;
  ping: number;
  spectators: number;
  connection: ConnectionStatus;
  ratingDeltaProjection: number;
  activeStreak: number;
  xpCurrent: number;
  xpTarget: number;
  divisionProgress: number;
  leaderboardPosition: number;
  seasonEndsIn: string;
  promotionStatus: string;
  badgeTrack: string[];
  player: ArenaParticipant;
  opponent: ArenaParticipant;
  problem: ArenaProblem;
  antiCheat: ArenaAntiCheatState;
  ladder: ArenaLadderEntry[];
  tournament: ArenaTournamentState;
  reactions: ArenaReaction[];
  chat: ArenaChatMessage[];
  replay: ArenaReplayMoment[];
  submissionHistory: ArenaSubmissionHistoryItem[];
  miniLeaderboard: ArenaLadderEntry[];
  commentary: string[];
  result: ArenaResultSummary | null;
  hasTriggeredOvertime: boolean;
  hasTriggeredSuddenDeath: boolean;
}
