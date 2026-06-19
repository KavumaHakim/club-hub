import { useEffect } from 'react';
import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { User } from '../../types';
import { QUICK_TAUNTS, createDuelFiles, DEFAULT_EDITOR_SETTINGS } from './mockData';
import {
  DuelGeneratedTestCase,
  DuelJudgeResult,
  DuelQuizQuestion,
} from '../../services/geminiService';
import { judgeDuelTestsLocally } from '../../services/duelRunner';
import {
  DuelInviteRecord,
  DuelMatchBundle,
  DuelParticipantRecord,
  DuelProfileRecord,
  LiveMatchSummary,
  acceptInviteAndCreateMatch,
  applyOwnRatingUpdate,
  broadcastToDuel,
  computeRatingDelta,
  divisionForRating,
  ensureDuelProfile,
  fetchDuelLadder,
  fetchDuelProfiles,
  fetchInvitesForUser,
  fetchLatestSubmissionCode,
  fetchLiveMatches,
  fetchMatchBundle,
  finishMatchRecord,
  insertDuelChatMessage,
  insertDuelSubmission,
  joinDuelChannel,
  leaveDuelChannel,
  markParticipantResult,
  rankForRating,
  registerSpectator,
  sendDuelChallenge,
  setInviteStatus,
  subscribeToInviteEvents,
  unregisterSpectator,
  updateParticipantTelemetry,
} from '../../services/duelService';
import {
  ArenaEditorFile,
  ArenaEditorSettings,
  ArenaEdgeCaseResult,
  ArenaLadderEntry,
  ArenaParticipant,
  ArenaQuizFeedback,
  ArenaResultSummary,
  ArenaSession,
  ArenaSubmissionFeedback,
  DuelLanguage,
  DuelPhase,
  DuelStatus,
  IntegrityLevel,
  MobileArenaPanel,
} from './types';

type AutoSaveState = 'saved' | 'saving' | 'dirty';

interface DuelArenaStoreState {
  // lifecycle
  hasHydrated: boolean;
  initializedUserId: string | null;
  currentUser: User | null;
  phase: DuelPhase;

  // lobby
  profile: DuelProfileRecord | null;
  invitesIncoming: DuelInviteRecord[];
  invitesOutgoing: DuelInviteRecord[];
  liveMatches: LiveMatchSummary[];
  ladder: ArenaLadderEntry[];
  lobbyLoading: boolean;
  lobbyError: string | null;
  lobbyNotice: string | null;
  busyInviteId: string | null;
  challengeBusyUid: string | null;
  preparingLabel: string;

  // match
  matchId: string | null;
  role: 'player' | 'spectator';
  selfParticipantId: string | null;
  opponentUid: string | null;
  opponentPresent: boolean;
  matchStartAtMs: number;
  matchDurationSec: number;
  testCases: DuelGeneratedTestCase[];
  session: ArenaSession | null;
  /** Live solution source per participant uid — populated for spectators. */
  liveCode: Record<string, string>;

  // editor
  activeLanguage: DuelLanguage;
  files: ArenaEditorFile[];
  activeFileId: string;
  customInput: string;
  terminalOutput: string[];
  activeSubmission: ArenaSubmissionFeedback | null;
  editorSettings: ArenaEditorSettings;
  autoSaveState: AutoSaveState;
  lastSavedLabel: string;
  editorFullscreen: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  activeMobilePanel: MobileArenaPanel;
  resultModalOpen: boolean;
  liveBanner: string;
  lastUserEditAt: number;

  // quiz duel
  isQuiz: boolean;
  questions: DuelQuizQuestion[];
  quizIndex: number;
  selfCorrect: number;
  answeredCount: number;
  questionDeadlineMs: number;
  advanceAtMs: number;
  answerLocked: boolean;
  gradingAnswer: boolean;
  answerFeedback: ArenaQuizFeedback | null;
  codingDraft: string;
  selfFinished: boolean;
  selfFinishedAtMs: number;
  opponentFinished: boolean;
  opponentFinishedAtMs: number;

  // actions
  hydrate: (user: User) => void;
  refreshLobby: () => Promise<void>;
  challengeMember: (recipientUid: string) => Promise<void>;
  acceptInvite: (invite: DuelInviteRecord) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  enterMatch: (matchId: string, role: 'player' | 'spectator') => Promise<void>;
  spectateMatch: (matchId: string) => Promise<void>;
  leaveMatch: () => Promise<void>;
  dismissLobbyNotice: () => void;

  setActiveLanguage: (language: DuelLanguage) => void;
  setActiveFile: (fileId: string) => void;
  updateActiveFile: (content: string) => void;
  setCustomInput: (value: string) => void;
  setEditorTheme: (themePreset: ArenaEditorSettings['themePreset']) => void;
  adjustFontSize: (direction: 'up' | 'down') => void;
  toggleVimMode: () => void;
  toggleMinimap: () => void;
  toggleFullscreen: () => void;
  togglePanel: (panel: 'left' | 'right') => void;
  setMobilePanel: (panel: MobileArenaPanel) => void;
  runCode: () => void;
  submitCode: () => void;
  submitAnswer: (answer: string) => void;
  setCodingDraft: (content: string) => void;
  sendChatMessage: (message: string, kind?: 'chat' | 'taunt') => void;
  sendQuickTaunt: () => void;
  dismissIntegrityOverlay: () => void;
  recordClipboardWarning: () => void;
  recordFocusLoss: () => void;
  restoreFocus: () => void;
  closeResultModal: () => void;
  rematch: () => Promise<void>;
  tick: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getNowLabel = () =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());

// Non-reactive runtime refs (channel handles, unsub fns, fallback timers).
let matchChannel: RealtimeChannel | null = null;
let inviteUnsubscribe: (() => void) | null = null;
let finishFallbackTimer: number | null = null;
let lastTypingBroadcastAt = 0;

const DB_STATUS_TO_UI: Record<string, DuelStatus> = {
  QUEUED: 'countdown',
  COUNTDOWN: 'countdown',
  LIVE: 'live',
  OVERTIME: 'overtime',
  SUDDEN_DEATH: 'sudden-death',
  FINISHED: 'finished',
  CANCELLED: 'finished',
};

const DB_DIFFICULTY_TO_UI: Record<string, 'Easy' | 'Medium' | 'Hard' | 'Elite'> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  ELITE: 'Elite',
};

const buildArenaParticipant = (
  participant: DuelParticipantRecord,
  profile: DuelProfileRecord | undefined
): ArenaParticipant => ({
  id: participant.userUid,
  name: participant.name,
  handle: `@${participant.username}`,
  avatarUrl: participant.avatarUrl,
  rating: profile?.rating ?? participant.ratingBefore,
  rank: rankForRating(profile?.rating ?? participant.ratingBefore),
  division: divisionForRating(profile?.rating ?? participant.ratingBefore),
  typingSpeed: 0,
  accuracy: 100,
  progress: participant.progressPercent,
  momentum: 50,
  compileAttempts: participant.compileAttempts,
  testCasesPassed: participant.testCasesPassed,
  currentStreak: profile?.currentStreak ?? 0,
  estimatedStatus: 'Reading the problem',
  liveTyping: false,
  runtimeMs: 0,
  memoryMb: 0,
});

const buildSession = (
  bundle: DuelMatchBundle,
  selfUid: string,
  role: 'player' | 'spectator',
  profiles: Record<string, DuelProfileRecord>,
  ladder: ArenaLadderEntry[]
): { session: ArenaSession; selfParticipant: DuelParticipantRecord | null; opponentParticipant: DuelParticipantRecord | null } => {
  const { match, problem, participants, chat } = bundle;

  const slot1 = participants.find((p) => p.slotNumber === 1) || participants[0];
  const slot2 = participants.find((p) => p.slotNumber === 2) || participants[1];

  const selfParticipant = role === 'player' ? participants.find((p) => p.userUid === selfUid) || null : null;
  const playerRecord = role === 'player' ? (selfParticipant as DuelParticipantRecord) : slot1;
  const opponentRecord = role === 'player' ? participants.find((p) => p.userUid !== selfUid) || slot2 : slot2;

  const player = buildArenaParticipant(playerRecord, profiles[playerRecord?.userUid]);
  const opponent = buildArenaParticipant(opponentRecord, profiles[opponentRecord?.userUid]);

  const publicCases = problem.testCases.filter((tc) => !tc.hidden);
  const hiddenCount = problem.testCases.length - publicCases.length;
  const playerProfile = profiles[playerRecord?.userUid];
  const ratingProjection = Math.abs(computeRatingDelta(player.rating, opponent.rating, true));

  const session: ArenaSession = {
    id: match.id,
    mode: role === 'player' ? 'duel' : 'spectator',
    matchType: match.matchType === 'CASUAL' ? 'Casual' : match.matchType === 'TOURNAMENT' ? 'Tournament' : 'Ranked',
    status: DB_STATUS_TO_UI[match.status] || 'live',
    countdown: match.countdownSeconds,
    timeRemaining: match.totalDurationSeconds,
    totalTime: match.totalDurationSeconds,
    ping: 0,
    spectators: 0,
    connection: 'Stable',
    ratingDeltaProjection: match.matchType === 'CASUAL' ? 0 : ratingProjection,
    activeStreak: playerProfile?.currentStreak ?? 0,
    xpCurrent: playerProfile?.xp ?? 0,
    xpTarget: ((Math.floor((playerProfile?.xp ?? 0) / 500) + 1) * 500),
    divisionProgress: clamp(Math.round(((player.rating % 200) / 200) * 100), 0, 100),
    leaderboardPosition: Math.max(1, ladder.findIndex((entry) => entry.id === playerRecord?.userUid) + 1),
    seasonEndsIn: 'Open season',
    promotionStatus: `${Math.max(1, 200 - (player.rating % 200))} pts to next division`,
    badgeTrack: ['First Blood', 'Streak Keeper', 'Edge Case Hunter'],
    player,
    opponent,
    problem: {
      id: problem.id,
      title: problem.title,
      slug: problem.id,
      difficulty: DB_DIFFICULTY_TO_UI[problem.difficulty] || 'Medium',
      solveRate: 0,
      averageCompletionMins: Math.max(1, Math.round(problem.averageCompletionSeconds / 60)),
      xpReward: problem.xpReward,
      statementMarkdown: problem.statementMarkdown,
      sections: [
        {
          id: 'judging',
          title: 'How judging works',
          markdown: `Write a function \`solve(input_text: str) -> str\`. It is called once per test case and the returned string is compared exactly (trailing whitespace ignored).

- **${publicCases.length} sample tests are revealed** below — Run checks your code against these.
- **${hiddenCount} hidden tests** run only on Submit. Their inputs stay secret.
- The arena judge returns a verdict moments after you submit.`,
          defaultOpen: false,
        },
      ],
      constraints: problem.constraints,
      examples: publicCases.map((tc, index) => ({
        id: tc.id || `sample-${index + 1}`,
        input: tc.input,
        output: tc.expectedOutput,
        explanation: tc.explanation || '',
      })),
      hiddenHints: [],
      tags: problem.tags,
      publicTestCount: publicCases.length,
      hiddenTestCount: hiddenCount,
      totalTestCount: problem.testCases.length,
    },
    antiCheat: {
      trustScore: 100,
      focusWarnings: 0,
      inactivityWarnings: 0,
      clipboardWarnings: 0,
      aiAssistRisk: 0,
      integrity: 'Stable',
      overlayVisible: false,
      overlayMessage: null,
    },
    ladder,
    tournament: {
      name: 'No tournament live',
      currentRound: '—',
      prizePool: '—',
      eliminationStatus: 'Friendly and ranked duels only right now.',
      nextOpponent: '—',
      rounds: [],
    },
    reactions: [],
    chat: chat
      .slice()
      .reverse()
      .map((msg) => ({
        id: msg.id,
        author: msg.senderName,
        handle: msg.senderUid ? `@${msg.senderName.toLowerCase().replace(/\s+/g, '')}` : '@system',
        body: msg.body,
        kind: msg.kind === 'TAUNT' ? 'taunt' : msg.kind === 'CHAT' ? 'chat' : 'system',
        createdAtLabel: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(msg.createdAt)),
      })),
    replay: [],
    submissionHistory: [],
    miniLeaderboard: ladder.slice(0, 3),
    commentary: [],
    result: null,
    hasTriggeredOvertime: false,
    hasTriggeredSuddenDeath: false,
  };

  return { session, selfParticipant, opponentParticipant: role === 'player' ? opponentRecord || null : null };
};

const buildResult = (
  victory: boolean,
  ratingDelta: number,
  xpEarned: number,
  session: ArenaSession
): ArenaResultSummary => ({
  outcome: victory ? 'victory' : 'defeat',
  ratingDelta,
  xpEarned,
  streakDelta: victory ? 1 : -1,
  accuracy: session.player.accuracy,
  runtimeMs: session.player.runtimeMs || 0,
  typingSpeed: session.player.typingSpeed,
  achievements: victory ? ['Duel Victor', 'Clean Verdict'] : ['Battle Tested', 'Review Unlocked'],
});

export const useDuelArenaStore = create<DuelArenaStoreState>((set, get) => {
  // --- internal helpers ---

  const cleanupChannel = () => {
    leaveDuelChannel(matchChannel);
    matchChannel = null;
    if (finishFallbackTimer) {
      window.clearTimeout(finishFallbackTimer);
      finishFallbackTimer = null;
    }
  };

  const applyFinish = async (winnerUid: string | null, reason: 'accepted' | 'timeout' | 'forfeit', broadcastDelta: number) => {
    const state = get();
    if (!state.session || state.session.status === 'finished') return;

    const isPlayer = state.role === 'player';
    const selfUid = state.currentUser?.uid;
    const victory = isPlayer && winnerUid === selfUid;
    const isDraw = winnerUid === null;

    let ratingDelta = 0;
    let xpEarned = 0;
    if (isPlayer && state.profile && state.session.matchType !== 'Casual' && !isDraw) {
      ratingDelta = victory ? Math.abs(broadcastDelta) : computeRatingDelta(state.session.player.rating, state.session.opponent.rating, false);
      xpEarned = victory ? state.session.problem.xpReward : 40;
      await applyOwnRatingUpdate(state.profile, ratingDelta, victory, xpEarned);
    } else if (isPlayer && state.profile && state.session.matchType === 'Casual') {
      xpEarned = victory ? 80 : 30;
      await applyOwnRatingUpdate(state.profile, 0, victory, xpEarned);
    }

    set((current) => {
      if (!current.session) return current;
      const result = current.role === 'player' ? buildResult(victory, ratingDelta, xpEarned, current.session) : null;
      if (result && current.isQuiz) {
        result.outcome = isDraw ? 'draw' : victory ? 'victory' : 'defeat';
        result.selfCorrect = current.session.player.testCasesPassed;
        result.opponentCorrect = current.session.opponent.testCasesPassed;
        result.totalQuestions = current.questions.length;
      }
      return {
        ...current,
        session: {
          ...current.session,
          status: 'finished',
          result,
        },
        resultModalOpen: current.role === 'player',
        liveBanner:
          current.role === 'spectator'
            ? winnerUid
              ? `Match over — ${winnerUid === current.session.player.id ? current.session.player.name : current.session.opponent.name} wins!`
              : 'Match over — draw.'
            : current.isQuiz
              ? victory
                ? 'You answered the most correctly — you win!'
                : isDraw
                  ? 'Dead heat — the duel ends in a draw.'
                  : 'Your opponent answered more correctly.'
              : victory
                ? reason === 'accepted'
                  ? 'Accepted! You won the duel.'
                  : 'Time! You held the lead and won.'
                : isDraw
                  ? 'Time! The duel ends in a draw.'
                  : reason === 'accepted'
                    ? 'Your opponent got Accepted first.'
                    : 'Time! Your opponent held the lead.',
      };
    });
  };

  const handleTimeout = async () => {
    const state = get();
    if (!state.session || !state.matchId || state.session.status === 'finished') return;

    const playerProgress = state.session.player.progress;
    const opponentProgress = state.session.opponent.progress;

    if (state.role === 'player') {
      // Both players attempt the write; the conditional update in finishMatchRecord
      // (status <> FINISHED) guarantees only the first one lands.
      const winnerUid =
        playerProgress === opponentProgress ? null : playerProgress > opponentProgress ? state.session.player.id : state.session.opponent.id;
      const delta = winnerUid ? Math.abs(computeRatingDelta(state.session.player.rating, state.session.opponent.rating, true)) : 0;
      const wrote = await finishMatchRecord(state.matchId, winnerUid, delta);
      if (wrote) {
        broadcastToDuel(matchChannel, 'finish', { winnerUid, reason: 'timeout', ratingDelta: delta });
        await applyFinish(winnerUid, 'timeout', delta);
        return;
      }
    }

    // Everyone else: wait briefly for the authoritative finish broadcast, then resolve locally.
    if (!finishFallbackTimer) {
      finishFallbackTimer = window.setTimeout(() => {
        finishFallbackTimer = null;
        const current = get();
        if (current.session && current.session.status !== 'finished') {
          const winnerUid =
            playerProgress === opponentProgress ? null : playerProgress > opponentProgress ? current.session.player.id : current.session.opponent.id;
          void applyFinish(winnerUid, 'timeout', 0);
        }
      }, 4000);
    }
  };

  const connectToMatch = (matchId: string, selfUid: string, role: 'player' | 'spectator') => {
    cleanupChannel();
    matchChannel = joinDuelChannel(matchId, selfUid, role, {
      onProgress: (payload) => {
        set((current) => {
          if (!current.session || payload.userUid === selfUid) return current;
          const isOpponentUpdate = payload.userUid === current.session.opponent.id;
          const isPlayerUpdate = payload.userUid === current.session.player.id;
          if (!isOpponentUpdate && !isPlayerUpdate) return current;
          const key = isOpponentUpdate ? 'opponent' : 'player';
          const target = current.session[key];
          // Track the opponent finishing a quiz duel (for the finish handshake / tie-break).
          const opponentFinishedUpdate =
            isOpponentUpdate && payload.finished
              ? { opponentFinished: true, opponentFinishedAtMs: payload.finishedAtMs || Date.now() }
              : {};

          return {
            ...current,
            ...opponentFinishedUpdate,
            liveCode: payload.code != null ? { ...current.liveCode, [payload.userUid]: payload.code } : current.liveCode,
            session: {
              ...current.session,
              [key]: {
                ...target,
                progress: payload.progressPercent,
                testCasesPassed: payload.testCasesPassed,
                compileAttempts: payload.compileAttempts,
                estimatedStatus: payload.statusLabel,
                liveTyping: payload.liveTyping,
                runtimeMs: payload.runtimeMs ?? target.runtimeMs,
                momentum: clamp(target.momentum + (payload.verdict === 'Accepted' ? 20 : 4), 0, 100),
              },
            },
          };
        });
        // Both players done → resolve (the first finisher's write wins the race).
        const after = get();
        if (after.isQuiz && after.role === 'player' && after.selfFinished && after.opponentFinished) {
          void resolveQuiz();
        }
      },
      onChat: (payload) => {
        set((current) => {
          if (!current.session) return current;
          return {
            ...current,
            session: {
              ...current.session,
              chat: [
                {
                  id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  author: payload.authorName,
                  handle: payload.handle,
                  body: payload.body,
                  kind: payload.kind,
                  createdAtLabel: getNowLabel(),
                },
                ...current.session.chat,
              ].slice(0, 30),
            },
          };
        });
      },
      onFinish: (payload) => {
        void applyFinish(payload.winnerUid, payload.reason, payload.ratingDelta);
      },
      onPresenceChange: (presentUids) => {
        set((current) => {
          if (!current.session) return current;
          const playerIds = [current.session.player.id, current.session.opponent.id];
          const spectatorCount = presentUids.filter((uid) => !playerIds.includes(uid)).length;
          const opponentUid = current.opponentUid;
          const opponentPresent = opponentUid ? presentUids.includes(opponentUid) : false;
          return {
            ...current,
            opponentPresent,
            session: {
              ...current.session,
              spectators: spectatorCount,
              opponent:
                current.role === 'player'
                  ? {
                      ...current.session.opponent,
                      estimatedStatus: opponentPresent ? current.session.opponent.estimatedStatus : 'Waiting for opponent to connect...',
                    }
                  : current.session.opponent,
            },
          };
        });
      },
      onStatusChange: (status) => {
        set((current) => ({
          ...current,
          session: current.session
            ? {
                ...current.session,
                connection: status === 'SUBSCRIBED' ? 'Stable' : status === 'CHANNEL_ERROR' ? 'Degraded' : 'Reconnecting',
              }
            : current.session,
        }));
      },
    });
  };

  const broadcastOwnProgress = (statusLabel: string, extra?: { runtimeMs?: number; verdict?: string; liveTyping?: boolean }) => {
    const state = get();
    if (!state.session || state.role !== 'player' || !state.currentUser) return;
    broadcastToDuel(matchChannel, 'progress', {
      userUid: state.currentUser.uid,
      progressPercent: state.session.player.progress,
      testCasesPassed: state.session.player.testCasesPassed,
      compileAttempts: state.session.player.compileAttempts,
      statusLabel,
      liveTyping: extra?.liveTyping ?? false,
      runtimeMs: extra?.runtimeMs,
      verdict: extra?.verdict,
      code: state.files.find((file) => file.id === 'solver')?.content ?? '',
    });
  };

  const executeJudging = async (kind: 'run' | 'submit') => {
    const state = get();
    if (!state.session || !state.matchId || state.activeSubmission || state.role !== 'player') return;
    if (!['live', 'overtime', 'sudden-death'].includes(state.session.status)) {
      set({ liveBanner: state.session.status === 'countdown' ? 'Hold on — the duel has not started yet.' : 'The duel is over.' });
      return;
    }

    const solverFile = state.files.find((file) => file.id === 'solver');
    if (!solverFile || !solverFile.content.trim()) {
      set({ liveBanner: 'Write your solve() function first.' });
      return;
    }

    const cases = kind === 'run' ? state.testCases.filter((tc) => !tc.hidden) : state.testCases;
    const submissionId = `${kind}-${Date.now()}`;

    const base: ArenaSubmissionFeedback = {
      id: submissionId,
      kind,
      verdict: null,
      verdictLabel: kind === 'run' ? `Checking ${cases.length} sample tests` : `Running all ${cases.length} tests`,
      stage: 'Compiling',
      progress: 18,
      passed: 0,
      total: cases.length,
      runtimeMs: 0,
      memoryMb: 0,
      percentile: 0,
      efficiencyScore: 0,
      edgeCases: [],
      timeline: ['Submission received', 'Judge warming up'],
    };

    set((current) => ({
      ...current,
      activeSubmission: base,
      liveBanner: kind === 'run' ? 'Running sample tests...' : 'Submitting your solution...',
      terminalOutput: [
        ...current.terminalOutput.slice(-12),
        `$ ${kind === 'run' ? 'run samples' : 'submit solution'}`,
        kind === 'run'
          ? 'Executing your code against the sample tests...'
          : 'Executing your code against the full test suite...',
      ],
    }));

    const stageTimer = window.setTimeout(() => {
      set((current) => ({
        ...current,
        activeSubmission:
          current.activeSubmission?.id === submissionId
            ? { ...current.activeSubmission, stage: 'Evaluating', progress: 62, timeline: [...current.activeSubmission.timeline, 'Tests executing'] }
            : current.activeSubmission,
      }));
    }, 1800);

    let judge: DuelJudgeResult;
    try {
      // Both Run (public samples) and Submit (full suite incl. hidden) are judged
      // deterministically in-browser via Pyodide — instant, free, and free of AI
      // variance or prompt-injection. Hidden test inputs are already shipped to the
      // client in the match bundle, so running them locally leaks nothing new.
      judge = await judgeDuelTestsLocally(solverFile.content, cases);
    } catch (error) {
      window.clearTimeout(stageTimer);
      console.error('Duel judging failed', error);
      set((current) => ({
        ...current,
        activeSubmission: null,
        liveBanner: 'The judge is busy right now. Try again in a moment.',
        terminalOutput: [...current.terminalOutput.slice(-12), 'Judge error: could not evaluate submission.'],
      }));
      return;
    }
    window.clearTimeout(stageTimer);

    const current = get();
    if (!current.session || current.activeSubmission?.id !== submissionId) return;

    const publicResults = judge.caseResults.filter((r) => {
      const tc = cases.find((c) => c.id === r.id);
      return tc && !tc.hidden;
    });
    const hiddenResults = judge.caseResults.filter((r) => {
      const tc = cases.find((c) => c.id === r.id);
      return tc && tc.hidden;
    });

    const edgeCases: ArenaEdgeCaseResult[] = publicResults.map((r, index) => ({
      id: r.id,
      name: `Sample ${index + 1}`,
      status: r.passed ? 'pass' : 'fail',
      detail: r.passed ? 'Output matched.' : r.note || (r.actualOutput != null ? `Returned ${JSON.stringify(r.actualOutput)}` : 'Output mismatch.'),
    }));
    if (kind === 'submit' && hiddenResults.length > 0) {
      const hiddenPassed = hiddenResults.filter((r) => r.passed).length;
      edgeCases.push({
        id: 'hidden-suite',
        name: 'Hidden suite',
        status: hiddenPassed === hiddenResults.length ? 'pass' : hiddenPassed > hiddenResults.length / 2 ? 'warn' : 'fail',
        detail: `${hiddenPassed}/${hiddenResults.length} hidden tests passed.${judge.hiddenFailureReason ? ` ${judge.hiddenFailureReason}` : ''}`,
      });
    }

    const accepted = kind === 'submit' && judge.verdict === 'Accepted';
    const progressPercent =
      kind === 'submit'
        ? clamp(Math.round((judge.passed / judge.total) * 100), 0, 100)
        : clamp(Math.max(current.session.player.progress, Math.round((judge.passed / current.testCases.length) * 100)), 0, 100);

    const verdictToDb: Record<DuelJudgeResult['verdict'], 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR'> = {
      Accepted: 'ACCEPTED',
      'Wrong Answer': 'WRONG_ANSWER',
      'Time Limit Exceeded': 'TIME_LIMIT_EXCEEDED',
      'Runtime Error': 'RUNTIME_ERROR',
    };

    set((prev) => {
      if (!prev.session) return prev;
      const updatedPlayer = {
        ...prev.session.player,
        progress: progressPercent,
        compileAttempts: prev.session.player.compileAttempts + 1,
        testCasesPassed: kind === 'submit' ? judge.passed : Math.max(prev.session.player.testCasesPassed, judge.passed),
        runtimeMs: judge.estimatedRuntimeMs,
        estimatedStatus: accepted ? 'Solution accepted!' : kind === 'run' ? 'Iterating on samples' : 'Patching failed cases',
      };
      return {
        ...prev,
        session: {
          ...prev.session,
          player: updatedPlayer,
          submissionHistory: [
            {
              id: submissionId,
              verdict: kind === 'run' && judge.verdict === 'Accepted' ? 'Accepted' : judge.verdict,
              passed: judge.passed,
              total: judge.total,
              runtimeMs: judge.estimatedRuntimeMs,
              createdAtLabel: getNowLabel(),
            },
            ...prev.session.submissionHistory,
          ].slice(0, 8),
        },
        activeSubmission: {
          ...prev.activeSubmission!,
          verdict: judge.verdict,
          verdictLabel: judge.summary,
          stage: 'Finished',
          progress: 100,
          passed: judge.passed,
          total: judge.total,
          runtimeMs: judge.estimatedRuntimeMs,
          memoryMb: 0,
          percentile: judge.efficiencyScore,
          efficiencyScore: judge.efficiencyScore,
          hiddenFailureReason: judge.hiddenFailureReason,
          edgeCases,
          timeline: [...prev.activeSubmission!.timeline, judge.verdict],
        },
        terminalOutput: [
          ...prev.terminalOutput.slice(-10),
          `${judge.verdict}: ${judge.passed}/${judge.total} tests passed`,
          ...publicResults.filter((r) => !r.passed).slice(0, 3).map((r) => `  ${r.id} failed${r.actualOutput != null ? ` -> got ${JSON.stringify(r.actualOutput)}` : ''}`),
          judge.summary,
        ],
        liveBanner: accepted
          ? 'Accepted! Finishing the duel...'
          : kind === 'run'
            ? `Samples: ${judge.passed}/${judge.total} passed.`
            : `${judge.verdict} — ${judge.passed}/${judge.total} tests passed.`,
      };
    });

    // Persist + broadcast (fire and forget — UI already updated).
    const after = get();
    if (after.selfParticipantId) {
      void insertDuelSubmission({
        matchId: state.matchId,
        participantId: after.selfParticipantId,
        kind: kind === 'run' ? 'RUN' : 'SUBMIT',
        sourceCode: solverFile.content,
        verdict: verdictToDb[judge.verdict],
        publicPassed: publicResults.filter((r) => r.passed).length,
        hiddenPassed: hiddenResults.filter((r) => r.passed).length,
        totalTests: judge.total,
        runtimeMs: judge.estimatedRuntimeMs,
        hiddenFailureReason: judge.hiddenFailureReason,
        edgeCases,
      });
      void updateParticipantTelemetry(after.selfParticipantId, {
        progress_percent: progressPercent,
        test_cases_passed: after.session?.player.testCasesPassed ?? judge.passed,
        compile_attempts: after.session?.player.compileAttempts ?? 0,
        runtime_ms: judge.estimatedRuntimeMs,
      });
    }
    broadcastOwnProgress(
      accepted ? 'Solution accepted!' : kind === 'run' ? 'Iterating on samples' : 'Patching failed cases',
      { runtimeMs: judge.estimatedRuntimeMs, verdict: judge.verdict }
    );

    if (accepted && after.matchId && after.currentUser) {
      const delta =
        after.session && after.session.matchType !== 'Casual'
          ? Math.abs(computeRatingDelta(after.session.player.rating, after.session.opponent.rating, true))
          : 0;
      const wrote = await finishMatchRecord(after.matchId, after.currentUser.uid, delta);
      if (wrote) {
        if (after.selfParticipantId) {
          void markParticipantResult(after.selfParticipantId, true, after.session!.player.rating + delta, after.session!.problem.xpReward);
        }
        broadcastToDuel(matchChannel, 'finish', { winnerUid: after.currentUser.uid, reason: 'accepted', ratingDelta: delta });
        await applyFinish(after.currentUser.uid, 'accepted', delta);
      }
    }
  };

  // --- Quiz duel helpers ---

  const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

  const gradeQuizCard = (card: Extract<DuelQuizQuestion, { kind: 'quiz' }>, answer: string): boolean => {
    if (card.type === 'SHORT_ANSWER') {
      const candidates = [card.correctAnswer, ...(card.acceptedAnswers || [])].map(normalizeAnswer);
      return candidates.includes(normalizeAnswer(answer));
    }
    return normalizeAnswer(answer) === normalizeAnswer(card.correctAnswer);
  };

  const broadcastQuizProgress = (finished = false) => {
    const state = get();
    if (!state.session || state.role !== 'player' || !state.currentUser) return;
    broadcastToDuel(matchChannel, 'progress', {
      userUid: state.currentUser.uid,
      progressPercent: state.session.player.progress,
      testCasesPassed: state.session.player.testCasesPassed,
      compileAttempts: 0,
      statusLabel: finished ? 'Finished all questions' : `Answered ${state.answeredCount}/${state.questions.length}`,
      liveTyping: false,
      questionIndex: state.quizIndex,
      finished,
      finishedAtMs: finished ? state.selfFinishedAtMs : undefined,
    });
  };

  // Fresh per-question UI state (resets the timer and any locked answer).
  const questionStartState = (index: number) => {
    const q = get().questions[index];
    const seconds = q?.seconds ?? 25;
    return {
      quizIndex: index,
      questionDeadlineMs: Date.now() + seconds * 1000,
      advanceAtMs: 0,
      answerLocked: false,
      gradingAnswer: false,
      answerFeedback: null as ArenaQuizFeedback | null,
      codingDraft: q && q.kind === 'coding' ? q.starterCode || 'def solve(input_text: str) -> str:\n    return ""\n' : '',
    };
  };

  const recordAnswer = (correct: boolean, feedback: ArenaQuizFeedback, advanceDelayMs: number) => {
    set((current) => {
      if (!current.session) return current;
      const selfCorrect = current.selfCorrect + (correct ? 1 : 0);
      const answeredCount = current.answeredCount + 1;
      const total = Math.max(1, current.questions.length);
      return {
        ...current,
        selfCorrect,
        answeredCount,
        answerLocked: true,
        gradingAnswer: false,
        answerFeedback: feedback,
        advanceAtMs: Date.now() + advanceDelayMs,
        session: {
          ...current.session,
          player: {
            ...current.session.player,
            testCasesPassed: selfCorrect,
            progress: clamp(Math.round((answeredCount / total) * 100), 0, 100),
            estimatedStatus: `Answered ${answeredCount}/${current.questions.length}`,
          },
        },
      };
    });
    broadcastQuizProgress();
  };

  const handleQuestionTimeout = () => {
    const state = get();
    const q = state.questions[state.quizIndex];
    if (!q) return;
    recordAnswer(false, { correct: false, message: "Time's up — no answer locked in.", expected: q.kind === 'quiz' ? q.correctAnswer : undefined }, 1200);
  };

  const resolveQuiz = async () => {
    const state = get();
    if (!state.session || !state.matchId || state.session.status === 'finished' || state.role !== 'player') return;
    const selfScore = state.session.player.testCasesPassed;
    const oppScore = state.session.opponent.testCasesPassed;
    let winnerUid: string | null;
    if (selfScore !== oppScore) {
      winnerUid = selfScore > oppScore ? state.session.player.id : state.session.opponent.id;
    } else {
      // Tie on correct answers → whoever finished sooner; identical → draw.
      const selfAt = state.selfFinishedAtMs || Number.POSITIVE_INFINITY;
      const oppAt = state.opponentFinishedAtMs || Number.POSITIVE_INFINITY;
      winnerUid = selfAt === oppAt ? null : selfAt < oppAt ? state.session.player.id : state.session.opponent.id;
    }
    const delta = winnerUid && state.session.matchType !== 'Casual'
      ? Math.abs(computeRatingDelta(state.session.player.rating, state.session.opponent.rating, true))
      : 0;
    // Conditional DB update guarantees only the first finisher's write lands.
    const wrote = await finishMatchRecord(state.matchId, winnerUid, delta);
    if (wrote) {
      if (state.selfParticipantId) {
        const isWinner = winnerUid === state.session.player.id;
        void markParticipantResult(state.selfParticipantId, isWinner, state.session.player.rating + (isWinner ? delta : 0), isWinner ? state.session.problem.xpReward : 0);
      }
      broadcastToDuel(matchChannel, 'finish', { winnerUid, reason: 'timeout', ratingDelta: delta });
      await applyFinish(winnerUid, 'timeout', delta);
    }
    // If we lost the race (wrote === false), the other client's finish broadcast resolves us.
  };

  const finishSelf = () => {
    const state = get();
    if (state.selfFinished) return;
    set({ selfFinished: true, selfFinishedAtMs: Date.now(), answerLocked: true, answerFeedback: null, advanceAtMs: 0 });
    broadcastQuizProgress(true);
    if (get().opponentFinished) void resolveQuiz();
  };

  const advanceQuestion = () => {
    const state = get();
    if (state.quizIndex < state.questions.length - 1) {
      set(questionStartState(state.quizIndex + 1));
    } else {
      finishSelf();
    }
  };

  return {
    hasHydrated: false,
    initializedUserId: null,
    currentUser: null,
    phase: 'loading',

    profile: null,
    invitesIncoming: [],
    invitesOutgoing: [],
    liveMatches: [],
    ladder: [],
    lobbyLoading: false,
    lobbyError: null,
    lobbyNotice: null,
    busyInviteId: null,
    challengeBusyUid: null,
    preparingLabel: '',

    matchId: null,
    role: 'player',
    selfParticipantId: null,
    opponentUid: null,
    opponentPresent: false,
    matchStartAtMs: 0,
    matchDurationSec: 0,
    testCases: [],
    session: null,
    liveCode: {},

    activeLanguage: 'python',
    files: createDuelFiles('def solve(input_text: str) -> str:\n    return ""\n'),
    activeFileId: 'solver',
    customInput: '',
    terminalOutput: ['$ arena ready'],
    activeSubmission: null,
    editorSettings: DEFAULT_EDITOR_SETTINGS,
    autoSaveState: 'saved',
    lastSavedLabel: 'synced',
    editorFullscreen: false,
    leftCollapsed: false,
    rightCollapsed: false,
    activeMobilePanel: 'editor',
    resultModalOpen: false,
    liveBanner: 'Welcome to the Duel Arena',
    lastUserEditAt: Date.now(),

    isQuiz: false,
    questions: [],
    quizIndex: 0,
    selfCorrect: 0,
    answeredCount: 0,
    questionDeadlineMs: 0,
    advanceAtMs: 0,
    answerLocked: false,
    gradingAnswer: false,
    answerFeedback: null,
    codingDraft: '',
    selfFinished: false,
    selfFinishedAtMs: 0,
    opponentFinished: false,
    opponentFinishedAtMs: 0,

    hydrate: (user) => {
      const current = get();
      if (current.initializedUserId === user.uid && current.hasHydrated) return;

      if (inviteUnsubscribe) {
        inviteUnsubscribe();
        inviteUnsubscribe = null;
      }

      set({ hasHydrated: true, initializedUserId: user.uid, currentUser: user, phase: 'lobby' });
      void get().refreshLobby();

      inviteUnsubscribe = subscribeToInviteEvents(user.uid, {
        onIncomingInvite: () => {
          set({ lobbyNotice: 'New duel challenge received!' });
          void get().refreshLobby();
        },
        onInviteAccepted: ({ matchId }) => {
          const state = get();
          if (state.phase !== 'arena' && matchId) {
            set({ lobbyNotice: null });
            void state.enterMatch(matchId, 'player');
          }
        },
      });
    },

    refreshLobby: async () => {
      const user = get().currentUser;
      if (!user) return;
      set({ lobbyLoading: true, lobbyError: null });
      try {
        const [profile, invites, liveMatches, ladderRows] = await Promise.all([
          ensureDuelProfile(user.uid),
          fetchInvitesForUser(user.uid),
          fetchLiveMatches(),
          fetchDuelLadder(8),
        ]);
        set({
          profile,
          invitesIncoming: invites.incoming,
          invitesOutgoing: invites.outgoing,
          liveMatches,
          ladder: ladderRows.map((row) => ({
            id: row.userUid,
            name: row.name,
            handle: `@${row.username}`,
            rating: row.rating,
            rank: row.rankTier,
            trend: 'steady' as const,
            winRate: row.seasonWins + row.seasonLosses > 0 ? Math.round((row.seasonWins / (row.seasonWins + row.seasonLosses)) * 100) : 0,
          })),
          lobbyLoading: false,
        });
      } catch (error: any) {
        console.error('Failed to load duel lobby', error);
        set({ lobbyLoading: false, lobbyError: error?.message || 'Failed to load the arena lobby.' });
      }
    },

    challengeMember: async (recipientUid) => {
      const user = get().currentUser;
      if (!user || get().challengeBusyUid) return;
      set({ challengeBusyUid: recipientUid });
      try {
        await sendDuelChallenge(user, recipientUid, 'RANKED');
        await get().refreshLobby();
        set({ lobbyNotice: 'Challenge sent! They will be notified.' });
      } catch (error: any) {
        console.error('Failed to send duel challenge', error);
        set({ lobbyNotice: error?.message?.includes('duplicate') ? 'You already have a pending challenge with this member.' : 'Failed to send challenge. Try again.' });
      } finally {
        set({ challengeBusyUid: null });
      }
    },

    acceptInvite: async (invite) => {
      const user = get().currentUser;
      if (!user || get().busyInviteId) return;
      set({ busyInviteId: invite.id, phase: 'preparing', preparingLabel: 'Accepting the challenge...' });
      try {
        const matchId = await acceptInviteAndCreateMatch(invite, user, (label) => set({ preparingLabel: label }));
        await get().enterMatch(matchId, 'player');
      } catch (error: any) {
        console.error('Failed to accept duel invite', error);
        set({
          phase: 'lobby',
          lobbyNotice: 'Could not start the duel. Please try again.',
        });
        void get().refreshLobby();
      } finally {
        set({ busyInviteId: null });
      }
    },

    declineInvite: async (inviteId) => {
      set({ busyInviteId: inviteId });
      try {
        await setInviteStatus(inviteId, 'DECLINED');
        await get().refreshLobby();
      } catch (error) {
        console.error('Failed to decline invite', error);
      } finally {
        set({ busyInviteId: null });
      }
    },

    cancelInvite: async (inviteId) => {
      set({ busyInviteId: inviteId });
      try {
        await setInviteStatus(inviteId, 'CANCELLED');
        await get().refreshLobby();
      } catch (error) {
        console.error('Failed to cancel invite', error);
      } finally {
        set({ busyInviteId: null });
      }
    },

    enterMatch: async (matchId, role) => {
      const user = get().currentUser;
      if (!user) return;
      set({ phase: 'preparing', preparingLabel: role === 'spectator' ? 'Joining as spectator...' : 'Entering the duel chamber...' });

      try {
        const bundle = await fetchMatchBundle(matchId);
        const uids = bundle.participants.map((p) => p.userUid);
        const [profiles, ladderRows] = await Promise.all([fetchDuelProfiles(uids), fetchDuelLadder(8)]);
        const ladder: ArenaLadderEntry[] = ladderRows.map((row) => ({
          id: row.userUid,
          name: row.name,
          handle: `@${row.username}`,
          rating: row.rating,
          rank: row.rankTier,
          trend: 'steady' as const,
          winRate: row.seasonWins + row.seasonLosses > 0 ? Math.round((row.seasonWins / (row.seasonWins + row.seasonLosses)) * 100) : 0,
        }));

        const actualRole: 'player' | 'spectator' = bundle.participants.some((p) => p.userUid === user.uid) ? role : 'spectator';
        const { session, selfParticipant, opponentParticipant } = buildSession(bundle, user.uid, actualRole, profiles, ladder);

        const startedAtMs = bundle.match.startedAt ? new Date(bundle.match.startedAt).getTime() : Date.now();

        let seededCode: Record<string, string> = {};
        if (actualRole === 'spectator') {
          void registerSpectator(matchId, user.uid);
          seededCode = await fetchLatestSubmissionCode(matchId).catch(() => ({}));
        }

        set({
          phase: 'arena',
          matchId,
          role: actualRole,
          selfParticipantId: selfParticipant?.id || null,
          opponentUid: actualRole === 'player' ? opponentParticipant?.userUid || null : null,
          opponentPresent: false,
          matchStartAtMs: startedAtMs,
          matchDurationSec: bundle.match.totalDurationSeconds,
          testCases: bundle.problem.testCases,
          liveCode: seededCode,
          session,
          files: createDuelFiles(bundle.problem.starterCode),
          activeFileId: 'solver',
          activeLanguage: 'python',
          customInput: '',
          terminalOutput: actualRole === 'spectator' ? ['$ spectator feed connected', 'Watching both screens live.'] : ['$ duel chamber ready', 'Implement solve(input_text) and Run the samples.'],
          activeSubmission: null,
          autoSaveState: 'saved',
          lastSavedLabel: 'synced',
          resultModalOpen: false,
          activeMobilePanel: actualRole === 'spectator' ? 'intel' : 'editor',
          liveBanner:
            session.status === 'countdown'
              ? 'Duel starting soon...'
              : actualRole === 'spectator'
                ? 'Spectating live — the score updates in real time.'
                : 'Duel live. Answer fast — most correct wins.',
          lastUserEditAt: Date.now(),

          // quiz duel state
          isQuiz: bundle.problem.format === 'QUIZ',
          questions: bundle.problem.questions || [],
          quizIndex: 0,
          selfCorrect: 0,
          answeredCount: 0,
          questionDeadlineMs: 0,
          advanceAtMs: 0,
          answerLocked: false,
          gradingAnswer: false,
          answerFeedback: null,
          codingDraft:
            bundle.problem.questions?.[0]?.kind === 'coding'
              ? (bundle.problem.questions[0] as Extract<DuelQuizQuestion, { kind: 'coding' }>).starterCode
              : '',
          selfFinished: false,
          selfFinishedAtMs: 0,
          opponentFinished: false,
          opponentFinishedAtMs: 0,
        });

        connectToMatch(matchId, user.uid, actualRole);
      } catch (error: any) {
        console.error('Failed to enter duel match', error);
        set({ phase: 'lobby', lobbyNotice: 'Could not open that match. It may have ended.' });
        void get().refreshLobby();
      }
    },

    spectateMatch: async (matchId) => {
      await get().enterMatch(matchId, 'spectator');
    },

    leaveMatch: async () => {
      const state = get();
      cleanupChannel();
      if (state.role === 'spectator' && state.matchId && state.currentUser) {
        void unregisterSpectator(state.matchId, state.currentUser.uid);
      }
      set({
        phase: 'lobby',
        matchId: null,
        session: null,
        selfParticipantId: null,
        opponentUid: null,
        opponentPresent: false,
        testCases: [],
        liveCode: {},
        activeSubmission: null,
        resultModalOpen: false,
        liveBanner: 'Welcome back to the lobby',
        isQuiz: false,
        questions: [],
        quizIndex: 0,
        selfCorrect: 0,
        answeredCount: 0,
        questionDeadlineMs: 0,
        advanceAtMs: 0,
        answerLocked: false,
        gradingAnswer: false,
        answerFeedback: null,
        codingDraft: '',
        selfFinished: false,
        selfFinishedAtMs: 0,
        opponentFinished: false,
        opponentFinishedAtMs: 0,
      });
      void get().refreshLobby();
    },

    dismissLobbyNotice: () => set({ lobbyNotice: null }),

    setActiveLanguage: () => {
      // Duels are Python-only: problems and the judge are built around solve(input_text).
      set({ activeLanguage: 'python' });
    },

    setActiveFile: (fileId) => set({ activeFileId: fileId }),

    updateActiveFile: (content) => {
      const current = get();
      if (current.role === 'spectator') return;
      const files = current.files.map((file) => (file.id === current.activeFileId ? { ...file, content } : file));
      set({
        files,
        autoSaveState: 'dirty',
        lastUserEditAt: Date.now(),
        session: current.session
          ? {
              ...current.session,
              player: { ...current.session.player, liveTyping: true },
            }
          : current.session,
      });

      // Typing signal + live code for the opponent/spectators (throttled).
      const now = Date.now();
      if (now - lastTypingBroadcastAt > 2000 && current.session && current.currentUser) {
        lastTypingBroadcastAt = now;
        const solverContent = files.find((file) => file.id === 'solver')?.content ?? content;
        broadcastToDuel(matchChannel, 'progress', {
          userUid: current.currentUser.uid,
          progressPercent: current.session.player.progress,
          testCasesPassed: current.session.player.testCasesPassed,
          compileAttempts: current.session.player.compileAttempts,
          statusLabel: 'Typing...',
          liveTyping: true,
          code: solverContent,
        });
      }
    },

    setCustomInput: (value) => set({ customInput: value }),
    setEditorTheme: (themePreset) => set({ editorSettings: { ...get().editorSettings, themePreset } }),
    adjustFontSize: (direction) =>
      set({
        editorSettings: {
          ...get().editorSettings,
          fontSize: clamp(get().editorSettings.fontSize + (direction === 'up' ? 1 : -1), 12, 22),
        },
      }),
    toggleVimMode: () =>
      set({
        editorSettings: { ...get().editorSettings, vimMode: !get().editorSettings.vimMode },
      }),
    toggleMinimap: () =>
      set({
        editorSettings: { ...get().editorSettings, minimap: !get().editorSettings.minimap },
      }),
    toggleFullscreen: () => set({ editorFullscreen: !get().editorFullscreen }),
    togglePanel: (panel) => set(panel === 'left' ? { leftCollapsed: !get().leftCollapsed } : { rightCollapsed: !get().rightCollapsed }),
    setMobilePanel: (panel) => set({ activeMobilePanel: panel }),

    runCode: () => {
      void executeJudging('run');
    },
    submitCode: () => {
      void executeJudging('submit');
    },

    setCodingDraft: (content) => set({ codingDraft: content }),

    submitAnswer: (answer) => {
      const state = get();
      if (!state.isQuiz || state.role !== 'player' || !state.session) return;
      if (state.answerLocked || state.selfFinished) return;
      if (!['live', 'overtime', 'sudden-death'].includes(state.session.status)) return;
      const q = state.questions[state.quizIndex];
      if (!q) return;

      if (q.kind === 'coding') {
        const code = state.codingDraft;
        if (!code.trim()) {
          set({ answerFeedback: { correct: false, message: 'Write your solve() function first.' } });
          return;
        }
        // Lock immediately (pauses the per-question timer) while Pyodide judges.
        set({ answerLocked: true, gradingAnswer: true, answerFeedback: { correct: false, message: 'Running your code against the tests…' } });
        void (async () => {
          let correct = false;
          let message = '';
          try {
            const judge = await judgeDuelTestsLocally(code, q.testCases);
            correct = judge.verdict === 'Accepted';
            message = correct
              ? `Accepted — ${judge.passed}/${judge.total} tests passed.`
              : `${judge.verdict} — ${judge.passed}/${judge.total} tests passed.`;
          } catch {
            correct = false;
            message = 'Could not run your code in time.';
          }
          recordAnswer(correct, { correct, message }, 1900);
        })();
        return;
      }

      const correct = gradeQuizCard(q, answer);
      recordAnswer(
        correct,
        { correct, message: correct ? 'Correct!' : 'Not quite.', expected: correct ? undefined : q.correctAnswer },
        1400,
      );
    },

    sendChatMessage: (message, kind = 'chat') => {
      const current = get();
      const trimmed = message.trim();
      if (!current.session || !current.currentUser || !current.matchId || !trimmed) return;

      const self = current.role === 'player' ? current.session.player : null;
      const authorName = self?.name || current.currentUser.name;
      const handle = self?.handle || `@${current.currentUser.username}`;

      set({
        session: {
          ...current.session,
          chat: [
            {
              id: `chat-${Date.now()}`,
              author: authorName,
              handle,
              body: trimmed,
              kind,
              createdAtLabel: 'now',
            },
            ...current.session.chat,
          ].slice(0, 30),
        },
      });

      broadcastToDuel(matchChannel, 'chat', {
        userUid: current.currentUser.uid,
        authorName,
        handle,
        body: trimmed,
        kind,
      });
      void insertDuelChatMessage(current.matchId, current.currentUser.uid, trimmed, kind === 'taunt' ? 'TAUNT' : 'CHAT');
    },

    sendQuickTaunt: () => {
      const taunt = QUICK_TAUNTS[Math.floor(Math.random() * QUICK_TAUNTS.length)];
      get().sendChatMessage(taunt, 'taunt');
    },

    dismissIntegrityOverlay: () => {
      const current = get();
      if (!current.session) return;
      set({
        session: {
          ...current.session,
          antiCheat: { ...current.session.antiCheat, overlayVisible: false, overlayMessage: null },
        },
      });
    },

    recordClipboardWarning: () => {
      const current = get();
      if (!current.session || current.role !== 'player' || current.session.status !== 'live') return;
      const warnings = current.session.antiCheat.clipboardWarnings + 1;
      const trustScore = clamp(current.session.antiCheat.trustScore - 3, 0, 100);
      const integrity: IntegrityLevel = trustScore < 82 ? 'Warning' : current.session.antiCheat.integrity;
      set({
        session: {
          ...current.session,
          antiCheat: {
            ...current.session.antiCheat,
            clipboardWarnings: warnings,
            trustScore,
            integrity,
            overlayVisible: warnings >= 3,
            overlayMessage: warnings >= 3 ? 'Large paste activity detected. Keep the duel fair — write your own solution.' : null,
          },
        },
      });
    },

    recordFocusLoss: () => {
      const current = get();
      if (!current.session || current.role !== 'player' || !['live', 'overtime', 'sudden-death'].includes(current.session.status)) return;
      const warnings = current.session.antiCheat.focusWarnings + 1;
      const trustScore = clamp(current.session.antiCheat.trustScore - 4, 0, 100);
      set({
        session: {
          ...current.session,
          antiCheat: {
            ...current.session.antiCheat,
            focusWarnings: warnings,
            trustScore,
            integrity: trustScore < 75 ? 'Critical' : trustScore < 90 ? 'Warning' : current.session.antiCheat.integrity,
            overlayVisible: warnings >= 3,
            overlayMessage: warnings >= 3 ? 'Repeated tab switches noticed. Stay in the arena to keep the duel fair.' : null,
          },
        },
      });
    },

    restoreFocus: () => {
      const current = get();
      if (!current.session) return;
      set({
        session: {
          ...current.session,
          antiCheat: {
            ...current.session.antiCheat,
            integrity: current.session.antiCheat.trustScore < 80 ? 'Warning' : current.session.antiCheat.integrity,
          },
        },
      });
    },

    closeResultModal: () => set({ resultModalOpen: false }),

    rematch: async () => {
      const current = get();
      const opponentUid = current.opponentUid;
      await get().leaveMatch();
      if (opponentUid) {
        await get().challengeMember(opponentUid);
        set({ lobbyNotice: 'Rematch challenge sent!' });
      }
    },

    tick: () => {
      const current = get();
      if (current.phase !== 'arena' || !current.session || current.session.status === 'finished') return;

      const now = Date.now();
      const elapsedSec = (now - current.matchStartAtMs) / 1000;

      if (elapsedSec < 0) {
        const countdown = Math.ceil(-elapsedSec);
        set({
          session: { ...current.session, status: 'countdown', countdown },
          liveBanner: `Duel starts in ${countdown}s — read the problem!`,
        });
        return;
      }

      const timeRemaining = Math.max(0, Math.round(current.matchDurationSec - elapsedSec));
      const wasCountdown = current.session.status === 'countdown';

      // --- Quiz duel flow (per-question timer, score-based finish) ---
      if (current.isQuiz) {
        set({
          session: { ...current.session, status: wasCountdown ? 'live' : current.session.status, countdown: 0, timeRemaining },
          liveBanner: wasCountdown
            ? current.role === 'spectator'
              ? 'Duel is live — watch the score climb.'
              : 'GO! Answer fast — most correct wins.'
            : current.liveBanner,
        });

        if (current.role === 'player' && !current.selfFinished) {
          const live = ['live', 'overtime', 'sudden-death'].includes(get().session!.status);
          if (live) {
            if (current.questionDeadlineMs === 0) {
              // Round just went live — arm the timer for the first question.
              set(questionStartState(current.quizIndex));
            } else if (current.answerLocked) {
              if (!current.gradingAnswer && current.advanceAtMs && now >= current.advanceAtMs) {
                advanceQuestion();
              }
            } else if (now >= current.questionDeadlineMs) {
              handleQuestionTimeout();
            }
          }
        }

        // Whole-duel backstop: force a finish so nobody hangs on a stalled opponent.
        if (timeRemaining === 0 && current.role === 'player') {
          if (!get().selfFinished) finishSelf();
          void resolveQuiz();
        }
        return;
      }

      // --- Legacy single-problem flow ---
      const liveTyping = now - current.lastUserEditAt < 2000 && current.role === 'player';
      const shouldAutosave = current.autoSaveState === 'dirty' && now - current.lastUserEditAt > 2500;

      set({
        session: {
          ...current.session,
          status: wasCountdown ? 'live' : current.session.status,
          countdown: 0,
          timeRemaining,
          player: current.session.player.liveTyping === liveTyping ? current.session.player : { ...current.session.player, liveTyping },
        },
        autoSaveState: shouldAutosave ? 'saved' : current.autoSaveState,
        lastSavedLabel: shouldAutosave ? 'autosaved just now' : current.lastSavedLabel,
        liveBanner: wasCountdown
          ? current.role === 'spectator'
            ? 'Duel is live. Watching the pressure build.'
            : 'GO! Run the samples early, submit when confident.'
          : timeRemaining <= 60 && timeRemaining > 0 && current.session.timeRemaining > 60
            ? 'Final minute!'
            : current.liveBanner,
      });

      if (timeRemaining === 0) {
        void handleTimeout();
      }
    },
  };
});

/**
 * Drives the arena while mounted: a 1s clock tick plus focus-integrity
 * tracking for live players (visibilitychange only — window blur alone is
 * too noisy and double-fires alongside it).
 */
export function useArenaRuntime() {
  const phase = useDuelArenaStore((state) => state.phase);
  const role = useDuelArenaStore((state) => state.role);
  const tick = useDuelArenaStore((state) => state.tick);
  const recordFocusLoss = useDuelArenaStore((state) => state.recordFocusLoss);
  const restoreFocus = useDuelArenaStore((state) => state.restoreFocus);

  useEffect(() => {
    if (phase !== 'arena') return undefined;
    const interval = window.setInterval(() => {
      tick();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase, tick]);

  useEffect(() => {
    if (phase !== 'arena' || role !== 'player') return undefined;
    const handleVisibility = () => {
      if (document.hidden) {
        recordFocusLoss();
      } else {
        restoreFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase, role, recordFocusLoss, restoreFocus]);
}

// Backwards-compatible alias (previous simulation hook name).
export const useArenaSimulation = useArenaRuntime;
