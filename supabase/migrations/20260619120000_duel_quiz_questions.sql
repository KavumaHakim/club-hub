-- Code Duel Arena: convert a duel from a single coding problem into a 15-question
-- mixed quiz (multiple-choice / true-false / short-answer + a few short coding).
-- A match still references exactly one duel_problems row; that row now doubles as the
-- question-set container via questions_json. format distinguishes the two layouts.

alter table public.duel_problems
  add column if not exists questions_json jsonb not null default '[]'::jsonb,
  add column if not exists format text not null default 'CODING'
    check (format in ('CODING', 'QUIZ'));
