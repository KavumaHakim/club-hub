-- How a challenge's tests are written.
--
-- 'function': each input is handed to solve(input_text) and the expected output is
-- what it returns (the original contract). 'stdio': each input is what the program
-- reads line by line and the expected output is what it prints. The judge accepts
-- either style of code for both; this only picks the starter code and instructions.
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS io_style TEXT NOT NULL DEFAULT 'function';

ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_io_style_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_io_style_check CHECK (io_style IN ('function', 'stdio'));
