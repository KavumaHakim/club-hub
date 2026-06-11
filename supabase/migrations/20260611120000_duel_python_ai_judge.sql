-- Code Duel Arena: real Python duels with AI judging
-- Adds test case storage, player-updatable duel profiles, and realtime support.

-- 1. Test cases live on the problem. Each entry: { id, input, expectedOutput, explanation?, hidden }
alter table public.duel_problems
  add column if not exists test_cases_json jsonb not null default '[]'::jsonb,
  add column if not exists public_test_count integer not null default 5 check (public_test_count >= 0),
  add column if not exists starter_code text,
  add column if not exists target_level text check (target_level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'));

-- Members create AI-generated problems when accepting a duel, so problem inserts
-- must be allowed for the creating member (previously patron-only).
drop policy if exists "Duel problems manage" on public.duel_problems;
create policy "Duel problems manage"
  on public.duel_problems for all
  using (public.is_patron() or created_by = auth.uid()::text)
  with check (public.is_patron() or created_by = auth.uid()::text);

-- 2. Players maintain their own duel profile (rating/wins are applied client-side
-- by each player for their own row; patrons can correct any row).
drop policy if exists "Duel profiles update" on public.duel_profiles;
create policy "Duel profiles update"
  on public.duel_profiles for update
  using (auth.uid()::text = user_uid or public.is_patron())
  with check (auth.uid()::text = user_uid or public.is_patron());

-- 3. Realtime: matches, participants, invites and chat stream to clients.
do $$
declare
  t text;
begin
  foreach t in array array[
    'duel_matches',
    'duel_match_participants',
    'duel_friend_invites',
    'duel_chat_messages'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- Realtime UPDATE payloads need full row data for filters on non-PK columns.
alter table public.duel_friend_invites replica identity full;
alter table public.duel_matches replica identity full;
