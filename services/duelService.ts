import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { notifyUsers } from './apiService';
import { User } from '../types';
import {
  DuelGeneratedProblem,
  DuelGeneratedTestCase,
  DuelSkillLevel,
  generateDuelProblem,
} from './geminiService';
import { DuelRank } from '../components/duel-arena/types';

// --- Shared shapes ---

export interface DuelProfileRecord {
  userUid: string;
  rating: number;
  rankTier: DuelRank;
  division: string;
  seasonWins: number;
  seasonLosses: number;
  totalDuels: number;
  currentStreak: number;
  bestStreak: number;
  xp: number;
}

export interface DuelInviteRecord {
  id: string;
  senderUid: string;
  recipientUid: string;
  senderName: string;
  senderAvatarUrl?: string;
  recipientName: string;
  recipientAvatarUrl?: string;
  matchType: 'RANKED' | 'CASUAL' | 'TOURNAMENT';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  matchId: string | null;
  message: string | null;
  createdAt: string;
}

export interface DuelParticipantRecord {
  id: string;
  matchId: string;
  userUid: string;
  slotNumber: 1 | 2;
  name: string;
  username: string;
  avatarUrl?: string;
  skillLevel?: DuelSkillLevel;
  ratingBefore: number;
  progressPercent: number;
  testCasesPassed: number;
  compileAttempts: number;
  isWinner: boolean | null;
}

export interface DuelProblemRecord {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE';
  statementMarkdown: string;
  constraints: string[];
  tags: string[];
  starterCode: string;
  publicTestCount: number;
  testCases: DuelGeneratedTestCase[];
  xpReward: number;
  averageCompletionSeconds: number;
}

export interface DuelMatchRecord {
  id: string;
  problemId: string;
  createdBy: string;
  matchType: 'RANKED' | 'CASUAL' | 'TOURNAMENT';
  status: 'QUEUED' | 'COUNTDOWN' | 'LIVE' | 'OVERTIME' | 'SUDDEN_DEATH' | 'FINISHED' | 'CANCELLED';
  startedAt: string | null;
  endedAt: string | null;
  countdownSeconds: number;
  totalDurationSeconds: number;
  winnerUid: string | null;
  rankedDelta: number;
}

export interface DuelMatchBundle {
  match: DuelMatchRecord;
  problem: DuelProblemRecord;
  participants: DuelParticipantRecord[];
  chat: DuelChatRecord[];
}

export interface DuelChatRecord {
  id: string;
  matchId: string;
  senderUid: string | null;
  senderName: string;
  body: string;
  kind: 'CHAT' | 'TAUNT' | 'SYSTEM' | 'COMMENTARY';
  createdAt: string;
}

export interface LiveMatchSummary {
  id: string;
  status: string;
  matchType: string;
  problemTitle: string;
  spectatorCount: number;
  startedAt: string | null;
  players: Array<{ uid: string; name: string; avatarUrl?: string; rating: number }>;
}

// --- Rating helpers (Elo, K=32) ---

export const computeRatingDelta = (rating: number, opponentRating: number, won: boolean): number => {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  return Math.round(32 * ((won ? 1 : 0) - expected));
};

const RANK_BANDS: Array<[number, DuelRank]> = [
  [2600, 'Legendary'],
  [2400, 'Grandmaster'],
  [2200, 'Master'],
  [2000, 'Diamond'],
  [1800, 'Platinum'],
  [1600, 'Gold'],
  [1400, 'Silver'],
  [0, 'Bronze'],
];

export const rankForRating = (rating: number): DuelRank => {
  for (const [min, rank] of RANK_BANDS) {
    if (rating >= min) return rank;
  }
  return 'Bronze';
};

export const divisionForRating = (rating: number): string => {
  const bandFloor = RANK_BANDS.find(([min]) => rating >= min)?.[0] ?? 0;
  const within = Math.max(0, Math.min(199, rating - bandFloor));
  const divisions = ['V', 'IV', 'III', 'II', 'I'];
  return divisions[Math.min(4, Math.floor(within / 40))];
};

const mapProfile = (row: any): DuelProfileRecord => ({
  userUid: row.user_uid,
  rating: row.rating,
  rankTier: rankForRating(row.rating),
  division: divisionForRating(row.rating),
  seasonWins: row.season_wins,
  seasonLosses: row.season_losses,
  totalDuels: row.total_duels,
  currentStreak: row.current_streak,
  bestStreak: row.best_streak,
  xp: row.xp,
});

// --- Profiles ---

export const ensureDuelProfile = async (userUid: string): Promise<DuelProfileRecord> => {
  const { data, error } = await supabase
    .from('duel_profiles')
    .select('*')
    .eq('user_uid', userUid)
    .maybeSingle();
  if (error) throw error;
  if (data) return mapProfile(data);

  const { data: created, error: insertError } = await supabase
    .from('duel_profiles')
    .insert({ user_uid: userUid })
    .select('*')
    .single();
  if (insertError) {
    // Concurrent creation: fall back to re-select.
    const { data: again } = await supabase.from('duel_profiles').select('*').eq('user_uid', userUid).maybeSingle();
    if (again) return mapProfile(again);
    throw insertError;
  }
  return mapProfile(created);
};

export const fetchDuelProfiles = async (uids: string[]): Promise<Record<string, DuelProfileRecord>> => {
  if (uids.length === 0) return {};
  const { data, error } = await supabase.from('duel_profiles').select('*').in('user_uid', uids);
  if (error) throw error;
  const map: Record<string, DuelProfileRecord> = {};
  (data || []).forEach((row) => {
    map[row.user_uid] = mapProfile(row);
  });
  return map;
};

export const fetchDuelLadder = async (limit: number = 8): Promise<Array<DuelProfileRecord & { name: string; username: string }>> => {
  const { data, error } = await supabase
    .from('duel_profiles')
    .select('*, users:user_uid(name, username, avatar_url)')
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...mapProfile(row),
    name: row.users?.name || 'Member',
    username: row.users?.username || 'member',
  }));
};

export const applyOwnRatingUpdate = async (
  profile: DuelProfileRecord,
  delta: number,
  won: boolean,
  xpEarned: number
): Promise<void> => {
  const nextStreak = won ? profile.currentStreak + 1 : 0;
  const { error } = await supabase
    .from('duel_profiles')
    .update({
      rating: Math.max(0, profile.rating + delta),
      season_wins: profile.seasonWins + (won ? 1 : 0),
      season_losses: profile.seasonLosses + (won ? 0 : 1),
      total_duels: profile.totalDuels + 1,
      current_streak: nextStreak,
      best_streak: Math.max(profile.bestStreak, nextStreak),
      xp: profile.xp + xpEarned,
      rank_tier: rankForRating(Math.max(0, profile.rating + delta)).toUpperCase(),
      division: divisionForRating(Math.max(0, profile.rating + delta)),
      updated_at: new Date().toISOString(),
    })
    .eq('user_uid', profile.userUid);
  if (error) console.warn('Failed to update duel profile', error);
};

// --- Invites (pending challenges) ---

const inviteSelect = `
  *,
  sender:sender_uid(name, username, avatar_url),
  recipient:recipient_uid(name, username, avatar_url)
`;

const mapInvite = (row: any): DuelInviteRecord => ({
  id: row.id,
  senderUid: row.sender_uid,
  recipientUid: row.recipient_uid,
  senderName: row.sender?.name || 'Member',
  senderAvatarUrl: row.sender?.avatar_url || undefined,
  recipientName: row.recipient?.name || 'Member',
  recipientAvatarUrl: row.recipient?.avatar_url || undefined,
  matchType: row.match_type,
  status: row.status,
  matchId: row.match_id,
  message: row.message,
  createdAt: row.created_at,
});

export const sendDuelChallenge = async (
  sender: User,
  recipientUid: string,
  matchType: 'RANKED' | 'CASUAL' = 'RANKED',
  message?: string
): Promise<DuelInviteRecord> => {
  const { data, error } = await supabase
    .from('duel_friend_invites')
    .insert({
      sender_uid: sender.uid,
      recipient_uid: recipientUid,
      match_type: matchType,
      message: message || null,
    })
    .select(inviteSelect)
    .single();
  if (error) throw error;

  try {
    await notifyUsers([recipientUid], `${sender.name} challenged you to a Code Duel! Open the Duel Arena to accept.`, 'arena', sender.uid);
  } catch (notifyError) {
    console.warn('Duel invite notification failed', notifyError);
  }
  return mapInvite(data);
};

export const fetchInvitesForUser = async (uid: string): Promise<{ incoming: DuelInviteRecord[]; outgoing: DuelInviteRecord[] }> => {
  const [incomingRes, outgoingRes] = await Promise.all([
    supabase
      .from('duel_friend_invites')
      .select(inviteSelect)
      .eq('recipient_uid', uid)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('duel_friend_invites')
      .select(inviteSelect)
      .eq('sender_uid', uid)
      .in('status', ['PENDING', 'ACCEPTED'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (incomingRes.error) throw incomingRes.error;
  if (outgoingRes.error) throw outgoingRes.error;
  return {
    incoming: (incomingRes.data || []).map(mapInvite),
    outgoing: (outgoingRes.data || []).map(mapInvite),
  };
};

export const setInviteStatus = async (
  inviteId: string,
  status: 'DECLINED' | 'CANCELLED'
): Promise<void> => {
  const { error } = await supabase
    .from('duel_friend_invites')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('status', 'PENDING');
  if (error) throw error;
};

/**
 * Watches duel invites for the signed-in user:
 * - new PENDING invites addressed to them (pending challenge received)
 * - their own outgoing invites flipping to ACCEPTED (time to join the match)
 */
export const subscribeToInviteEvents = (
  uid: string,
  handlers: {
    onIncomingInvite?: (invite: { id: string; senderUid: string }) => void;
    onInviteAccepted?: (invite: { id: string; matchId: string | null }) => void;
  }
): (() => void) => {
  const channel = supabase
    .channel(`duel-invites-${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'duel_friend_invites', filter: `recipient_uid=eq.${uid}` },
      (payload) => {
        const row: any = payload.new;
        if (row?.status === 'PENDING') {
          handlers.onIncomingInvite?.({ id: row.id, senderUid: row.sender_uid });
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'duel_friend_invites', filter: `sender_uid=eq.${uid}` },
      (payload) => {
        const row: any = payload.new;
        if (row?.status === 'ACCEPTED' && row.match_id) {
          handlers.onInviteAccepted?.({ id: row.id, matchId: row.match_id });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// --- Match creation (invite acceptance generates the AI problem) ---

const DIFFICULTY_TO_DB: Record<DuelGeneratedProblem['difficulty'], 'EASY' | 'MEDIUM' | 'HARD'> = {
  Easy: 'EASY',
  Medium: 'MEDIUM',
  Hard: 'HARD',
};

export const acceptInviteAndCreateMatch = async (
  invite: DuelInviteRecord,
  accepter: User,
  onStage?: (label: string) => void
): Promise<string> => {
  onStage?.('Looking up both duelists...');
  const { data: senderRow, error: senderError } = await supabase
    .from('users')
    .select('uid, name, skill_level')
    .eq('uid', invite.senderUid)
    .single();
  if (senderError) throw senderError;

  onStage?.('Crafting a fresh Python problem...');
  const problem = await generateDuelProblem([
    (senderRow?.skill_level as DuelSkillLevel) || 'BEGINNER',
    accepter.skillLevel || 'BEGINNER',
  ]);

  onStage?.('Setting up the duel chamber...');
  const publicCases = problem.testCases.filter((tc) => !tc.hidden);
  const { data: problemRow, error: problemError } = await supabase
    .from('duel_problems')
    .insert({
      slug: `duel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: problem.title,
      difficulty: DIFFICULTY_TO_DB[problem.difficulty],
      statement_markdown: problem.statementMarkdown,
      constraints_json: problem.constraints,
      examples_json: publicCases,
      test_cases_json: problem.testCases,
      public_test_count: publicCases.length,
      starter_code: problem.starterCode,
      target_level: problem.targetLevel,
      tags: problem.tags,
      xp_reward: problem.difficulty === 'Hard' ? 420 : problem.difficulty === 'Medium' ? 300 : 180,
      average_completion_seconds: problem.estimatedMinutes * 60,
      is_ranked_pool: false,
      created_by: accepter.uid,
    })
    .select('id')
    .single();
  if (problemError) throw problemError;

  const countdownSeconds = 10;
  const durationSeconds = Math.max(600, Math.min(1800, problem.estimatedMinutes * 60 + 300));
  const startedAt = new Date(Date.now() + countdownSeconds * 1000).toISOString();

  const { data: matchRow, error: matchError } = await supabase
    .from('duel_matches')
    .insert({
      problem_id: problemRow.id,
      created_by: accepter.uid,
      match_type: invite.matchType === 'TOURNAMENT' ? 'RANKED' : invite.matchType,
      status: 'COUNTDOWN',
      visibility: 'SPECTATABLE',
      countdown_seconds: countdownSeconds,
      total_duration_seconds: durationSeconds,
      started_at: startedAt,
    })
    .select('id')
    .single();
  if (matchError) throw matchError;

  const profiles = await fetchDuelProfiles([invite.senderUid, accepter.uid]);
  const senderRating = profiles[invite.senderUid]?.rating ?? 1200;
  const accepterRating = profiles[accepter.uid]?.rating ?? 1200;

  const { error: participantsError } = await supabase.from('duel_match_participants').insert([
    { match_id: matchRow.id, user_uid: invite.senderUid, slot_number: 1, rating_before: senderRating },
    { match_id: matchRow.id, user_uid: accepter.uid, slot_number: 2, rating_before: accepterRating },
  ]);
  if (participantsError) throw participantsError;

  const { error: inviteError } = await supabase
    .from('duel_friend_invites')
    .update({ status: 'ACCEPTED', match_id: matchRow.id, responded_at: new Date().toISOString() })
    .eq('id', invite.id);
  if (inviteError) throw inviteError;

  try {
    await notifyUsers([invite.senderUid], `${accepter.name} accepted your Code Duel! The match is starting now — open the Duel Arena.`, 'arena', accepter.uid);
  } catch (notifyError) {
    console.warn('Duel acceptance notification failed', notifyError);
  }

  return matchRow.id;
};

// --- Match loading ---

const mapProblem = (row: any): DuelProblemRecord => ({
  id: row.id,
  title: row.title,
  difficulty: row.difficulty,
  statementMarkdown: row.statement_markdown,
  constraints: Array.isArray(row.constraints_json) ? row.constraints_json : [],
  tags: Array.isArray(row.tags) ? row.tags : [],
  starterCode: row.starter_code || 'def solve(input_text: str) -> str:\n    return ""\n',
  publicTestCount: row.public_test_count ?? 5,
  testCases: Array.isArray(row.test_cases_json) ? row.test_cases_json : [],
  xpReward: row.xp_reward ?? 0,
  averageCompletionSeconds: row.average_completion_seconds ?? 0,
});

const mapParticipant = (row: any): DuelParticipantRecord => ({
  id: row.id,
  matchId: row.match_id,
  userUid: row.user_uid,
  slotNumber: row.slot_number,
  name: row.users?.name || 'Member',
  username: row.users?.username || 'member',
  avatarUrl: row.users?.avatar_url || undefined,
  skillLevel: row.users?.skill_level || undefined,
  ratingBefore: row.rating_before ?? 1200,
  progressPercent: Number(row.progress_percent) || 0,
  testCasesPassed: row.test_cases_passed ?? 0,
  compileAttempts: row.compile_attempts ?? 0,
  isWinner: row.is_winner,
});

const mapMatch = (row: any): DuelMatchRecord => ({
  id: row.id,
  problemId: row.problem_id,
  createdBy: row.created_by,
  matchType: row.match_type,
  status: row.status,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  countdownSeconds: row.countdown_seconds ?? 10,
  totalDurationSeconds: row.total_duration_seconds ?? 1020,
  winnerUid: row.winner_uid,
  rankedDelta: row.ranked_delta ?? 0,
});

export const fetchMatchBundle = async (matchId: string): Promise<DuelMatchBundle> => {
  const [matchRes, participantsRes, chatRes] = await Promise.all([
    supabase.from('duel_matches').select('*, duel_problems:problem_id(*)').eq('id', matchId).single(),
    supabase
      .from('duel_match_participants')
      .select('*, users:user_uid(name, username, avatar_url, skill_level)')
      .eq('match_id', matchId)
      .order('slot_number'),
    supabase
      .from('duel_chat_messages')
      .select('*, users:sender_uid(name)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (matchRes.error) throw matchRes.error;
  if (participantsRes.error) throw participantsRes.error;

  return {
    match: mapMatch(matchRes.data),
    problem: mapProblem(matchRes.data.duel_problems),
    participants: (participantsRes.data || []).map(mapParticipant),
    chat: (chatRes.data || []).map((row: any) => ({
      id: String(row.id),
      matchId: row.match_id,
      senderUid: row.sender_uid,
      senderName: row.users?.name || 'System',
      body: row.body,
      kind: row.kind,
      createdAt: row.created_at,
    })),
  };
};

export const fetchLiveMatches = async (): Promise<LiveMatchSummary[]> => {
  const { data, error } = await supabase
    .from('duel_matches')
    .select(`
      id, status, match_type, started_at, spectator_count_cached,
      duel_problems:problem_id(title),
      duel_match_participants(user_uid, rating_before, slot_number, users:user_uid(name, avatar_url))
    `)
    .in('status', ['COUNTDOWN', 'LIVE', 'OVERTIME', 'SUDDEN_DEATH'])
    .in('visibility', ['SPECTATABLE', 'FEATURED'])
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    status: row.status,
    matchType: row.match_type,
    problemTitle: row.duel_problems?.title || 'Duel in progress',
    spectatorCount: row.spectator_count_cached ?? 0,
    startedAt: row.started_at,
    players: (row.duel_match_participants || [])
      .sort((a: any, b: any) => a.slot_number - b.slot_number)
      .map((p: any) => ({
        uid: p.user_uid,
        name: p.users?.name || 'Member',
        avatarUrl: p.users?.avatar_url || undefined,
        rating: p.rating_before ?? 1200,
      })),
  }));
};

// --- Live telemetry, submissions, results ---

export const updateParticipantTelemetry = async (
  participantId: string,
  fields: { progress_percent?: number; test_cases_passed?: number; compile_attempts?: number; runtime_ms?: number; accuracy?: number }
): Promise<void> => {
  const { error } = await supabase
    .from('duel_match_participants')
    .update({ ...fields, last_seen_at: new Date().toISOString() })
    .eq('id', participantId);
  if (error) console.warn('Failed to update duel telemetry', error);
};

export const insertDuelSubmission = async (submission: {
  matchId: string;
  participantId: string;
  kind: 'RUN' | 'SUBMIT';
  sourceCode: string;
  verdict: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';
  publicPassed: number;
  hiddenPassed: number;
  totalTests: number;
  runtimeMs: number;
  hiddenFailureReason?: string;
  edgeCases?: unknown;
}): Promise<void> => {
  const { error } = await supabase.from('duel_submissions').insert({
    match_id: submission.matchId,
    participant_id: submission.participantId,
    language: 'PYTHON',
    submission_kind: submission.kind,
    judge_stage: 'FINISHED',
    verdict: submission.verdict,
    source_code: submission.sourceCode,
    public_tests_passed: submission.publicPassed,
    hidden_tests_passed: submission.hiddenPassed,
    total_tests: submission.totalTests,
    runtime_ms: submission.runtimeMs,
    hidden_failure_reason: submission.hiddenFailureReason || null,
    edge_case_breakdown: submission.edgeCases || [],
  });
  if (error) console.warn('Failed to record duel submission', error);
};

export const finishMatchRecord = async (
  matchId: string,
  winnerUid: string | null,
  rankedDelta: number
): Promise<boolean> => {
  // Conditional update: only the first finisher wins the write.
  const { data, error } = await supabase
    .from('duel_matches')
    .update({
      status: 'FINISHED',
      winner_uid: winnerUid,
      ranked_delta: rankedDelta,
      ended_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .neq('status', 'FINISHED')
    .select('id');
  if (error) {
    console.warn('Failed to finish duel match', error);
    return false;
  }
  return (data || []).length > 0;
};

export const markParticipantResult = async (participantId: string, isWinner: boolean, ratingAfter: number, xpEarned: number): Promise<void> => {
  const { error } = await supabase
    .from('duel_match_participants')
    .update({ is_winner: isWinner, rating_after: ratingAfter, xp_earned: xpEarned })
    .eq('id', participantId);
  if (error) console.warn('Failed to mark duel result', error);
};

export const insertDuelChatMessage = async (matchId: string, senderUid: string, body: string, kind: 'CHAT' | 'TAUNT' | 'SYSTEM'): Promise<void> => {
  const { error } = await supabase.from('duel_chat_messages').insert({
    match_id: matchId,
    sender_uid: senderUid,
    body,
    kind,
  });
  if (error) console.warn('Failed to store duel chat message', error);
};

export const registerSpectator = async (matchId: string, userUid: string): Promise<void> => {
  const { error } = await supabase
    .from('duel_spectators')
    .upsert({ match_id: matchId, user_uid: userUid, last_active_at: new Date().toISOString() }, { onConflict: 'match_id,user_uid', ignoreDuplicates: false });
  if (error) console.warn('Failed to register spectator', error);
};

export const unregisterSpectator = async (matchId: string, userUid: string): Promise<void> => {
  const { error } = await supabase.from('duel_spectators').delete().eq('match_id', matchId).eq('user_uid', userUid);
  if (error) console.warn('Failed to unregister spectator', error);
};

// --- Realtime match channel (broadcast + presence) ---

export interface DuelProgressPayload {
  userUid: string;
  progressPercent: number;
  testCasesPassed: number;
  compileAttempts: number;
  statusLabel: string;
  liveTyping: boolean;
  runtimeMs?: number;
  verdict?: string;
}

export interface DuelChatPayload {
  userUid: string;
  authorName: string;
  handle: string;
  body: string;
  kind: 'chat' | 'taunt' | 'system';
}

export interface DuelFinishPayload {
  winnerUid: string | null;
  reason: 'accepted' | 'timeout' | 'forfeit';
  ratingDelta: number;
}

export interface DuelChannelHandlers {
  onProgress?: (payload: DuelProgressPayload) => void;
  onChat?: (payload: DuelChatPayload) => void;
  onFinish?: (payload: DuelFinishPayload) => void;
  onPresenceChange?: (presentUids: string[]) => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

export const joinDuelChannel = (
  matchId: string,
  selfUid: string,
  role: 'player' | 'spectator',
  handlers: DuelChannelHandlers
): RealtimeChannel => {
  const channel = supabase.channel(`duel-match-${matchId}`, {
    config: { presence: { key: selfUid }, broadcast: { self: false } },
  });

  channel
    .on('broadcast', { event: 'progress' }, ({ payload }) => handlers.onProgress?.(payload as DuelProgressPayload))
    .on('broadcast', { event: 'chat' }, ({ payload }) => handlers.onChat?.(payload as DuelChatPayload))
    .on('broadcast', { event: 'finish' }, ({ payload }) => handlers.onFinish?.(payload as DuelFinishPayload))
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      handlers.onPresenceChange?.(Object.keys(state));
    })
    .subscribe(async (status) => {
      handlers.onStatusChange?.(status as any);
      if (status === 'SUBSCRIBED') {
        await channel.track({ role, joinedAt: Date.now() });
      }
    });

  return channel;
};

export const leaveDuelChannel = (channel: RealtimeChannel | null): void => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

export const broadcastToDuel = (channel: RealtimeChannel | null, event: 'progress' | 'chat' | 'finish', payload: unknown): void => {
  if (!channel) return;
  void channel.send({ type: 'broadcast', event, payload });
};
