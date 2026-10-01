-- Members record the judged result on their own challenge submission.
--
-- The judge runs in the member's browser (services/challengeJudge.ts), which then
-- sets the submission's status and tests_passed / tests_total. Only patrons could
-- update challenge_submissions, so that write matched zero rows and was silently
-- dropped: a member who passed every test kept the badge (their own users row is
-- writable) but the submission stayed PENDING in the patrons' review list.
--
-- This grants the same trust the badge write already has. Making the server the
-- judge is Gate 0 of docs/duel-ledger.html; until then a submission's result is
-- the member's own browser's verdict.

drop policy if exists "Members record own submission result" on public.challenge_submissions;
create policy "Members record own submission result"
  on public.challenge_submissions for update
  using ((auth.uid())::text = user_uid)
  with check ((auth.uid())::text = user_uid);

-- Verify
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'challenge_submissions'
      and policyname = 'Members record own submission result'
  ) then
    raise exception 'Policy "Members record own submission result" was not created';
  end if;
end $$;
