-- Code test cases for challenges.
--
-- A challenge with a non-empty test_cases array is judged deterministically in the
-- browser sandbox (Pyodide / JS worker) against the contract
-- `solve(input_text) -> str`, instead of by AI review. Each case is
-- { id, input, expectedOutput, hidden, explanation? }.
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'python';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS starter_code TEXT;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS test_cases JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_language_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_language_check CHECK (language IN ('python', 'javascript'));

-- Test outcome recorded on each submission so patrons can see it while reviewing.
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS tests_passed INTEGER;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS tests_total INTEGER;
