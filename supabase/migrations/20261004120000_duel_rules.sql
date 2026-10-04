-- Duel rules.
--
-- A challenger picks rules for each duel (question count, quiz/coding mix,
-- difficulty, time per question, language, ranked or casual); they're stored on
-- the invite so the opponent sees them before accepting. Patrons set club-wide
-- limits those choices must fit in (services/duelRules.ts). Invites without rules
-- (sent before this) get the defaults, which match the old fixed duels.
ALTER TABLE public.duel_friend_invites ADD COLUMN IF NOT EXISTS rules JSONB;

CREATE TABLE IF NOT EXISTS public.duel_rule_limits (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.duel_rule_limits (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.duel_rule_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Duel rule limits read" ON public.duel_rule_limits;
CREATE POLICY "Duel rule limits read" ON public.duel_rule_limits
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Duel rule limits insert" ON public.duel_rule_limits;
CREATE POLICY "Duel rule limits insert" ON public.duel_rule_limits
  FOR INSERT WITH CHECK (public.is_patron());

DROP POLICY IF EXISTS "Duel rule limits update" ON public.duel_rule_limits;
CREATE POLICY "Duel rule limits update" ON public.duel_rule_limits
  FOR UPDATE USING (public.is_patron()) WITH CHECK (public.is_patron());
