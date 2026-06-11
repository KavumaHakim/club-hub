-- Code Duel Arena backend schema

create or replace function public.is_patron()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.users
    where uid = auth.uid()::text
      and role = 'PATRON'
  );
end;
$$;

create table if not exists public.duel_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'LIVE' check (status in ('UPCOMING', 'LIVE', 'ENDED')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by text references public.users(uid) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duel_profiles (
  user_uid text primary key references public.users(uid) on delete cascade,
  season_id uuid references public.duel_seasons(id) on delete set null,
  rating integer not null default 1200 check (rating >= 0),
  rank_tier text not null default 'BRONZE' check (rank_tier in ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'LEGENDARY')),
  division text not null default 'V' check (division in ('I', 'II', 'III', 'IV', 'V')),
  leaderboard_position integer,
  season_wins integer not null default 0 check (season_wins >= 0),
  season_losses integer not null default 0 check (season_losses >= 0),
  total_duels integer not null default 0 check (total_duels >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  xp integer not null default 0 check (xp >= 0),
  promotion_wins smallint not null default 0 check (promotion_wins >= 0),
  promotion_losses smallint not null default 0 check (promotion_losses >= 0),
  trust_score numeric(5,2) not null default 100.00 check (trust_score >= 0 and trust_score <= 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duel_problems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  difficulty text not null default 'MEDIUM' check (difficulty in ('EASY', 'MEDIUM', 'HARD', 'ELITE')),
  statement_markdown text not null,
  sections_json jsonb not null default '[]'::jsonb,
  constraints_json jsonb not null default '[]'::jsonb,
  examples_json jsonb not null default '[]'::jsonb,
  hidden_hints_json jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}'::text[],
  solve_rate numeric(5,2) not null default 0 check (solve_rate >= 0 and solve_rate <= 100),
  average_completion_seconds integer not null default 0 check (average_completion_seconds >= 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  is_ranked_pool boolean not null default true,
  is_active boolean not null default true,
  created_by text references public.users(uid) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duel_tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.duel_seasons(id) on delete set null,
  name text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'OPEN', 'LIVE', 'FINISHED', 'CANCELLED')),
  format text not null default 'SINGLE_ELIMINATION' check (format in ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN')),
  prize_pool_text text,
  current_round text,
  elimination_note text,
  next_opponent_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text references public.users(uid) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duel_tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.duel_tournaments(id) on delete cascade,
  user_uid text not null references public.users(uid) on delete cascade,
  seed integer,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ELIMINATED', 'WITHDRAWN', 'CHAMPION')),
  final_position integer,
  eliminated_at timestamptz,
  joined_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (tournament_id, user_uid)
);

create table if not exists public.duel_matches (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.duel_problems(id) on delete restrict,
  tournament_id uuid references public.duel_tournaments(id) on delete set null,
  created_by text not null references public.users(uid) on delete cascade,
  match_type text not null default 'RANKED' check (match_type in ('RANKED', 'CASUAL', 'TOURNAMENT')),
  status text not null default 'QUEUED' check (status in ('QUEUED', 'COUNTDOWN', 'LIVE', 'OVERTIME', 'SUDDEN_DEATH', 'FINISHED', 'CANCELLED')),
  visibility text not null default 'SPECTATABLE' check (visibility in ('PRIVATE', 'SPECTATABLE', 'FEATURED')),
  room_code text unique,
  countdown_seconds integer not null default 15 check (countdown_seconds >= 0),
  total_duration_seconds integer not null default 1020 check (total_duration_seconds > 0),
  started_at timestamptz,
  ended_at timestamptz,
  winner_uid text references public.users(uid) on delete set null,
  spectator_count_cached integer not null default 0 check (spectator_count_cached >= 0),
  ranked_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duel_match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.duel_matches(id) on delete cascade,
  user_uid text not null references public.users(uid) on delete cascade,
  slot_number smallint not null check (slot_number in (1, 2)),
  role text not null default 'PLAYER' check (role in ('PLAYER', 'BOT')),
  is_winner boolean,
  rating_before integer,
  rating_after integer,
  rank_before text check (rank_before in ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'LEGENDARY')),
  rank_after text check (rank_after in ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'LEGENDARY')),
  division_before text check (division_before in ('I', 'II', 'III', 'IV', 'V')),
  division_after text check (division_after in ('I', 'II', 'III', 'IV', 'V')),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  test_cases_passed integer not null default 0 check (test_cases_passed >= 0),
  compile_attempts integer not null default 0 check (compile_attempts >= 0),
  accuracy numeric(5,2) not null default 0 check (accuracy >= 0 and accuracy <= 100),
  typing_wpm integer not null default 0 check (typing_wpm >= 0),
  runtime_ms integer,
  memory_kb integer,
  streak_before integer not null default 0,
  streak_after integer not null default 0,
  xp_earned integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (match_id, user_uid),
  unique (match_id, slot_number)
);

create table if not exists public.duel_matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null references public.users(uid) on delete cascade,
  queue_type text not null default 'RANKED' check (queue_type in ('RANKED', 'CASUAL', 'TOURNAMENT')),
  preferred_languages text[] not null default '{}'::text[],
  status text not null default 'QUEUED' check (status in ('QUEUED', 'MATCHED', 'CANCELLED', 'EXPIRED')),
  matched_match_id uuid references public.duel_matches(id) on delete set null,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.duel_friend_invites (
  id uuid primary key default gen_random_uuid(),
  sender_uid text not null references public.users(uid) on delete cascade,
  recipient_uid text not null references public.users(uid) on delete cascade,
  match_type text not null default 'CASUAL' check (match_type in ('RANKED', 'CASUAL', 'TOURNAMENT')),
  preferred_problem_id uuid references public.duel_problems(id) on delete set null,
  match_id uuid references public.duel_matches(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED')),
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.duel_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.duel_matches(id) on delete cascade,
  participant_id uuid not null references public.duel_match_participants(id) on delete cascade,
  language text not null check (language in ('TYPESCRIPT', 'JAVASCRIPT', 'PYTHON', 'CPP')),
  submission_kind text not null default 'SUBMIT' check (submission_kind in ('RUN', 'SUBMIT')),
  judge_stage text not null default 'QUEUED' check (judge_stage in ('QUEUED', 'COMPILING', 'RUNNING', 'EVALUATING', 'FINISHED')),
  verdict text check (verdict in ('ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR')),
  source_code text not null,
  custom_input text,
  public_tests_passed integer not null default 0 check (public_tests_passed >= 0),
  hidden_tests_passed integer not null default 0 check (hidden_tests_passed >= 0),
  total_tests integer not null default 0 check (total_tests >= 0),
  runtime_ms integer,
  memory_kb integer,
  percentile integer check (percentile >= 0 and percentile <= 100),
  efficiency_score integer check (efficiency_score >= 0 and efficiency_score <= 100),
  hidden_failure_reason text,
  edge_case_breakdown jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.duel_match_events (
  id bigserial primary key,
  match_id uuid not null references public.duel_matches(id) on delete cascade,
  participant_id uuid references public.duel_match_participants(id) on delete set null,
  event_type text not null check (event_type in ('MATCH_STATUS', 'COUNTDOWN', 'PROGRESS', 'TYPING', 'SUBMISSION', 'REACTION', 'CHAT', 'SPECTATOR', 'ANTI_CHEAT', 'SYSTEM')),
  visibility text not null default 'PUBLIC' check (visibility in ('PUBLIC', 'PRIVATE', 'SYSTEM')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.duel_spectators (
  id bigserial primary key,
  match_id uuid not null references public.duel_matches(id) on delete cascade,
  user_uid text not null references public.users(uid) on delete cascade,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  reaction_count integer not null default 0 check (reaction_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  unique (match_id, user_uid)
);

create table if not exists public.duel_chat_messages (
  id bigserial primary key,
  match_id uuid not null references public.duel_matches(id) on delete cascade,
  sender_uid text references public.users(uid) on delete set null,
  kind text not null default 'CHAT' check (kind in ('CHAT', 'TAUNT', 'SYSTEM', 'COMMENTARY')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.duel_anti_cheat_events (
  id bigserial primary key,
  match_id uuid not null references public.duel_matches(id) on delete cascade,
  participant_id uuid not null references public.duel_match_participants(id) on delete cascade,
  event_type text not null check (event_type in ('FOCUS_LOST', 'TAB_SWITCH', 'INACTIVITY', 'CLIPBOARD', 'AI_ASSIST_RISK', 'TRUST_SCORE_CHANGE')),
  severity text not null default 'INFO' check (severity in ('INFO', 'WARNING', 'CRITICAL')),
  trust_score_after numeric(5,2) check (trust_score_after >= 0 and trust_score_after <= 100),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.duel_user_badges (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null references public.users(uid) on delete cascade,
  badge_code text not null,
  badge_name text not null,
  description text,
  source_match_id uuid references public.duel_matches(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  earned_at timestamptz not null default now(),
  unique (user_uid, badge_code)
);

create index if not exists idx_duel_seasons_status on public.duel_seasons(status, starts_at desc);
create index if not exists idx_duel_profiles_rating on public.duel_profiles(rating desc, season_wins desc);
create index if not exists idx_duel_profiles_season_id on public.duel_profiles(season_id);
create index if not exists idx_duel_problems_pool on public.duel_problems(is_active, is_ranked_pool, difficulty);
create index if not exists idx_duel_problems_tags on public.duel_problems using gin(tags);
create index if not exists idx_duel_tournaments_status on public.duel_tournaments(status, starts_at desc);
create index if not exists idx_duel_tournament_entries_tournament on public.duel_tournament_entries(tournament_id, status);
create index if not exists idx_duel_matches_status_visibility on public.duel_matches(status, visibility, match_type);
create index if not exists idx_duel_matches_problem_id on public.duel_matches(problem_id);
create index if not exists idx_duel_matches_tournament_id on public.duel_matches(tournament_id);
create index if not exists idx_duel_matches_created_by on public.duel_matches(created_by);
create index if not exists idx_duel_participants_match_id on public.duel_match_participants(match_id);
create index if not exists idx_duel_participants_user_uid on public.duel_match_participants(user_uid);
create unique index if not exists idx_duel_matchmaking_one_active_queue on public.duel_matchmaking_queue(user_uid) where status = 'QUEUED';
create index if not exists idx_duel_matchmaking_status on public.duel_matchmaking_queue(status, queue_type, requested_at);
create index if not exists idx_duel_friend_invites_recipient on public.duel_friend_invites(recipient_uid, status, created_at desc);
create index if not exists idx_duel_friend_invites_sender on public.duel_friend_invites(sender_uid, status, created_at desc);
create index if not exists idx_duel_submissions_match_id on public.duel_submissions(match_id, created_at desc);
create index if not exists idx_duel_submissions_participant_id on public.duel_submissions(participant_id, created_at desc);
create index if not exists idx_duel_match_events_match_id on public.duel_match_events(match_id, created_at desc);
create index if not exists idx_duel_spectators_match_id on public.duel_spectators(match_id);
create index if not exists idx_duel_chat_match_id on public.duel_chat_messages(match_id, created_at desc);
create index if not exists idx_duel_anti_cheat_match_id on public.duel_anti_cheat_events(match_id, created_at desc);
create index if not exists idx_duel_badges_user_uid on public.duel_user_badges(user_uid, earned_at desc);

create or replace function public.is_duel_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.duel_match_participants p
    where p.match_id = p_match_id
      and p.user_uid = auth.uid()::text
  );
$$;

create or replace function public.can_view_duel_match(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.duel_matches m
    where m.id = p_match_id
      and (
        m.visibility in ('SPECTATABLE', 'FEATURED')
        or m.created_by = auth.uid()::text
        or public.is_duel_participant(p_match_id)
        or public.is_patron()
      )
  );
$$;

create or replace function public.can_manage_duel_match(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.duel_matches m
    where m.id = p_match_id
      and (
        m.created_by = auth.uid()::text
        or public.is_duel_participant(p_match_id)
        or public.is_patron()
      )
  );
$$;

create or replace function public.refresh_duel_spectator_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
begin
  v_match_id := coalesce(new.match_id, old.match_id);

  update public.duel_matches
  set spectator_count_cached = (
      select count(*)::integer
      from public.duel_spectators s
      where s.match_id = v_match_id
    ),
    updated_at = now()
  where id = v_match_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_duel_spectators_refresh_count on public.duel_spectators;
create trigger trg_duel_spectators_refresh_count
after insert or update of match_id or delete on public.duel_spectators
for each row
execute function public.refresh_duel_spectator_count();

alter table public.duel_seasons enable row level security;
alter table public.duel_profiles enable row level security;
alter table public.duel_problems enable row level security;
alter table public.duel_tournaments enable row level security;
alter table public.duel_tournament_entries enable row level security;
alter table public.duel_matches enable row level security;
alter table public.duel_match_participants enable row level security;
alter table public.duel_matchmaking_queue enable row level security;
alter table public.duel_friend_invites enable row level security;
alter table public.duel_submissions enable row level security;
alter table public.duel_match_events enable row level security;
alter table public.duel_spectators enable row level security;
alter table public.duel_chat_messages enable row level security;
alter table public.duel_anti_cheat_events enable row level security;
alter table public.duel_user_badges enable row level security;

drop policy if exists "Duel seasons select" on public.duel_seasons;
drop policy if exists "Duel seasons manage" on public.duel_seasons;
create policy "Duel seasons select"
  on public.duel_seasons for select
  using (auth.role() = 'authenticated');
create policy "Duel seasons manage"
  on public.duel_seasons for all
  using (public.is_patron())
  with check (public.is_patron());

drop policy if exists "Duel profiles select" on public.duel_profiles;
drop policy if exists "Duel profiles insert" on public.duel_profiles;
drop policy if exists "Duel profiles update" on public.duel_profiles;
drop policy if exists "Duel profiles delete" on public.duel_profiles;
create policy "Duel profiles select"
  on public.duel_profiles for select
  using (auth.role() = 'authenticated');
create policy "Duel profiles insert"
  on public.duel_profiles for insert
  with check (auth.uid()::text = user_uid or public.is_patron());
create policy "Duel profiles update"
  on public.duel_profiles for update
  using (public.is_patron());
create policy "Duel profiles delete"
  on public.duel_profiles for delete
  using (public.is_patron());

drop policy if exists "Duel problems select" on public.duel_problems;
drop policy if exists "Duel problems manage" on public.duel_problems;
create policy "Duel problems select"
  on public.duel_problems for select
  using ((auth.role() = 'authenticated' and is_active = true) or public.is_patron());
create policy "Duel problems manage"
  on public.duel_problems for all
  using (public.is_patron())
  with check (public.is_patron());

drop policy if exists "Duel tournaments select" on public.duel_tournaments;
drop policy if exists "Duel tournaments manage" on public.duel_tournaments;
create policy "Duel tournaments select"
  on public.duel_tournaments for select
  using (auth.role() = 'authenticated');
create policy "Duel tournaments manage"
  on public.duel_tournaments for all
  using (public.is_patron())
  with check (public.is_patron());

drop policy if exists "Duel tournament entries select" on public.duel_tournament_entries;
drop policy if exists "Duel tournament entries insert" on public.duel_tournament_entries;
drop policy if exists "Duel tournament entries update" on public.duel_tournament_entries;
drop policy if exists "Duel tournament entries delete" on public.duel_tournament_entries;
create policy "Duel tournament entries select"
  on public.duel_tournament_entries for select
  using (auth.role() = 'authenticated');
create policy "Duel tournament entries insert"
  on public.duel_tournament_entries for insert
  with check (auth.uid()::text = user_uid or public.is_patron());
create policy "Duel tournament entries update"
  on public.duel_tournament_entries for update
  using (auth.uid()::text = user_uid or public.is_patron());
create policy "Duel tournament entries delete"
  on public.duel_tournament_entries for delete
  using (auth.uid()::text = user_uid or public.is_patron());

drop policy if exists "Duel matches select" on public.duel_matches;
drop policy if exists "Duel matches insert" on public.duel_matches;
drop policy if exists "Duel matches update" on public.duel_matches;
drop policy if exists "Duel matches delete" on public.duel_matches;
create policy "Duel matches select"
  on public.duel_matches for select
  using (public.can_view_duel_match(id));
create policy "Duel matches insert"
  on public.duel_matches for insert
  with check (auth.uid()::text = created_by or public.is_patron());
create policy "Duel matches update"
  on public.duel_matches for update
  using (public.can_manage_duel_match(id));
create policy "Duel matches delete"
  on public.duel_matches for delete
  using (created_by = auth.uid()::text or public.is_patron());

drop policy if exists "Duel participants select" on public.duel_match_participants;
drop policy if exists "Duel participants insert" on public.duel_match_participants;
drop policy if exists "Duel participants update" on public.duel_match_participants;
drop policy if exists "Duel participants delete" on public.duel_match_participants;
create policy "Duel participants select"
  on public.duel_match_participants for select
  using (public.can_view_duel_match(match_id));
create policy "Duel participants insert"
  on public.duel_match_participants for insert
  with check (auth.uid()::text = user_uid or public.can_manage_duel_match(match_id) or public.is_patron());
create policy "Duel participants update"
  on public.duel_match_participants for update
  using (auth.uid()::text = user_uid or public.can_manage_duel_match(match_id) or public.is_patron());
create policy "Duel participants delete"
  on public.duel_match_participants for delete
  using (auth.uid()::text = user_uid or public.can_manage_duel_match(match_id) or public.is_patron());

drop policy if exists "Duel matchmaking select" on public.duel_matchmaking_queue;
drop policy if exists "Duel matchmaking insert" on public.duel_matchmaking_queue;
drop policy if exists "Duel matchmaking update" on public.duel_matchmaking_queue;
drop policy if exists "Duel matchmaking delete" on public.duel_matchmaking_queue;
create policy "Duel matchmaking select"
  on public.duel_matchmaking_queue for select
  using (auth.uid()::text = user_uid or public.is_patron());
create policy "Duel matchmaking insert"
  on public.duel_matchmaking_queue for insert
  with check (auth.uid()::text = user_uid or public.is_patron());
create policy "Duel matchmaking update"
  on public.duel_matchmaking_queue for update
  using (auth.uid()::text = user_uid or public.is_patron());
create policy "Duel matchmaking delete"
  on public.duel_matchmaking_queue for delete
  using (auth.uid()::text = user_uid or public.is_patron());

drop policy if exists "Duel invites select" on public.duel_friend_invites;
drop policy if exists "Duel invites insert" on public.duel_friend_invites;
drop policy if exists "Duel invites update" on public.duel_friend_invites;
drop policy if exists "Duel invites delete" on public.duel_friend_invites;
create policy "Duel invites select"
  on public.duel_friend_invites for select
  using (sender_uid = auth.uid()::text or recipient_uid = auth.uid()::text or public.is_patron());
create policy "Duel invites insert"
  on public.duel_friend_invites for insert
  with check (sender_uid = auth.uid()::text or public.is_patron());
create policy "Duel invites update"
  on public.duel_friend_invites for update
  using (sender_uid = auth.uid()::text or recipient_uid = auth.uid()::text or public.is_patron());
create policy "Duel invites delete"
  on public.duel_friend_invites for delete
  using (sender_uid = auth.uid()::text or recipient_uid = auth.uid()::text or public.is_patron());

drop policy if exists "Duel submissions select" on public.duel_submissions;
drop policy if exists "Duel submissions insert" on public.duel_submissions;
drop policy if exists "Duel submissions update" on public.duel_submissions;
drop policy if exists "Duel submissions delete" on public.duel_submissions;
create policy "Duel submissions select"
  on public.duel_submissions for select
  using (
    public.is_patron()
    or exists (
      select 1
      from public.duel_match_participants p
      where p.id = duel_submissions.participant_id
        and p.user_uid = auth.uid()::text
    )
  );
create policy "Duel submissions insert"
  on public.duel_submissions for insert
  with check (
    public.is_patron()
    or exists (
      select 1
      from public.duel_match_participants p
      where p.id = duel_submissions.participant_id
        and p.user_uid = auth.uid()::text
        and p.match_id = duel_submissions.match_id
    )
  );
create policy "Duel submissions update"
  on public.duel_submissions for update
  using (
    public.is_patron()
    or exists (
      select 1
      from public.duel_match_participants p
      where p.id = duel_submissions.participant_id
        and p.user_uid = auth.uid()::text
    )
  );
create policy "Duel submissions delete"
  on public.duel_submissions for delete
  using (
    public.is_patron()
    or exists (
      select 1
      from public.duel_match_participants p
      where p.id = duel_submissions.participant_id
        and p.user_uid = auth.uid()::text
    )
  );

drop policy if exists "Duel events select" on public.duel_match_events;
drop policy if exists "Duel events insert" on public.duel_match_events;
drop policy if exists "Duel events update" on public.duel_match_events;
drop policy if exists "Duel events delete" on public.duel_match_events;
create policy "Duel events select"
  on public.duel_match_events for select
  using (public.can_view_duel_match(match_id));
create policy "Duel events insert"
  on public.duel_match_events for insert
  with check (public.can_manage_duel_match(match_id) or public.is_patron());
create policy "Duel events update"
  on public.duel_match_events for update
  using (public.can_manage_duel_match(match_id) or public.is_patron());
create policy "Duel events delete"
  on public.duel_match_events for delete
  using (public.can_manage_duel_match(match_id) or public.is_patron());

drop policy if exists "Duel spectators select" on public.duel_spectators;
drop policy if exists "Duel spectators insert" on public.duel_spectators;
drop policy if exists "Duel spectators update" on public.duel_spectators;
drop policy if exists "Duel spectators delete" on public.duel_spectators;
create policy "Duel spectators select"
  on public.duel_spectators for select
  using (public.can_view_duel_match(match_id) or public.is_patron());
create policy "Duel spectators insert"
  on public.duel_spectators for insert
  with check ((auth.uid()::text = user_uid and public.can_view_duel_match(match_id)) or public.is_patron());
create policy "Duel spectators update"
  on public.duel_spectators for update
  using (auth.uid()::text = user_uid or public.is_patron());
create policy "Duel spectators delete"
  on public.duel_spectators for delete
  using (auth.uid()::text = user_uid or public.is_patron());

drop policy if exists "Duel chat select" on public.duel_chat_messages;
drop policy if exists "Duel chat insert" on public.duel_chat_messages;
drop policy if exists "Duel chat update" on public.duel_chat_messages;
drop policy if exists "Duel chat delete" on public.duel_chat_messages;
create policy "Duel chat select"
  on public.duel_chat_messages for select
  using (public.can_view_duel_match(match_id));
create policy "Duel chat insert"
  on public.duel_chat_messages for insert
  with check ((sender_uid = auth.uid()::text and public.can_view_duel_match(match_id)) or public.is_patron());
create policy "Duel chat update"
  on public.duel_chat_messages for update
  using (sender_uid = auth.uid()::text or public.is_patron());
create policy "Duel chat delete"
  on public.duel_chat_messages for delete
  using (sender_uid = auth.uid()::text or public.is_patron());

drop policy if exists "Duel anti cheat select" on public.duel_anti_cheat_events;
drop policy if exists "Duel anti cheat insert" on public.duel_anti_cheat_events;
drop policy if exists "Duel anti cheat update" on public.duel_anti_cheat_events;
drop policy if exists "Duel anti cheat delete" on public.duel_anti_cheat_events;
create policy "Duel anti cheat select"
  on public.duel_anti_cheat_events for select
  using (public.can_manage_duel_match(match_id) or public.is_patron());
create policy "Duel anti cheat insert"
  on public.duel_anti_cheat_events for insert
  with check (public.can_manage_duel_match(match_id) or public.is_patron());
create policy "Duel anti cheat update"
  on public.duel_anti_cheat_events for update
  using (public.is_patron());
create policy "Duel anti cheat delete"
  on public.duel_anti_cheat_events for delete
  using (public.is_patron());

drop policy if exists "Duel badges select" on public.duel_user_badges;
drop policy if exists "Duel badges insert" on public.duel_user_badges;
drop policy if exists "Duel badges update" on public.duel_user_badges;
drop policy if exists "Duel badges delete" on public.duel_user_badges;
create policy "Duel badges select"
  on public.duel_user_badges for select
  using (auth.role() = 'authenticated');
create policy "Duel badges insert"
  on public.duel_user_badges for insert
  with check (public.is_patron());
create policy "Duel badges update"
  on public.duel_user_badges for update
  using (public.is_patron());
create policy "Duel badges delete"
  on public.duel_user_badges for delete
  using (public.is_patron());
