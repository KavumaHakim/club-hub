-- Migration to replace streak_grace_used boolean with streak_graces count
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_graces INTEGER DEFAULT 1 NOT NULL;

-- Migrate data: if streak_grace_used was true (grace used), available graces = 0, else 1
UPDATE public.users SET streak_graces = CASE WHEN streak_grace_used = true THEN 0 ELSE 1 END;

-- Drop the old boolean column
ALTER TABLE public.users DROP COLUMN IF EXISTS streak_grace_used;
