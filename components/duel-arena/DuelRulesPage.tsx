import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { useDuelArenaStore } from './useDuelArenaStore';
import {
  CODING_SECOND_CHOICES,
  DEFAULT_LIMITS,
  DEFAULT_RULES,
  DIFFICULTY_LABEL,
  HARD_MAX_QUESTIONS,
  LANGUAGE_LABEL,
  MIX_LABEL,
  QUIZ_SECOND_CHOICES,
  estimateSeconds,
  formatDuration,
  normalizeLimits,
  questionSplit,
  type DuelDifficulty,
  type DuelLanguage,
  type DuelMix,
  type DuelRuleLimits,
} from '../../services/duelRules';

const LANGUAGES: DuelLanguage[] = ['python', 'javascript'];
const MIXES: DuelMix[] = ['MIXED', 'QUIZ', 'CODING'];
const DIFFICULTIES: DuelDifficulty[] = ['AUTO', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const seconds = (s: number) => (s < 60 ? `${s}s` : s % 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s / 60} min`);

const Label: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="mb-2 flex items-baseline justify-between gap-3">
    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">{title}</p>
    {hint && <span className="text-[11px] text-ch-muted">{hint}</span>}
  </div>
);

/** A row of mutually exclusive options, Split style. Disabled options show why. */
function Segmented<T extends string | number>({ options, value, onChange, label, allowed, disabledReason }: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
  allowed?: (v: T) => boolean;
  disabledReason?: string;
}) {
  return (
    <div className="flex flex-wrap border border-ch-rule">
      {options.map((opt, i) => {
        const ok = allowed ? allowed(opt) : true;
        const active = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            disabled={!ok}
            title={!ok ? disabledReason : undefined}
            onClick={() => onChange(opt)}
            className={`min-w-[64px] flex-1 px-3 py-2 text-[12px] font-bold transition-colors ${i > 0 ? 'border-l border-ch-divider' : ''} ${
              active ? 'bg-ch-accent text-ch-on-accent' : ok ? 'text-ch-text hover:bg-ch-surface' : 'cursor-not-allowed text-ch-muted line-through opacity-60'
            }`}
          >
            {label(opt)}
          </button>
        );
      })}
    </div>
  );
}

const Stepper: React.FC<{ value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string }> = ({ value, min, max, onChange, suffix }) => (
  <div className="inline-flex items-stretch border border-ch-rule">
    <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="w-10 text-[16px] font-bold hover:bg-ch-surface disabled:opacity-40">−</button>
    <span className="flex min-w-[88px] items-center justify-center border-x border-ch-divider px-3 text-[14px] font-extrabold tabular-nums">
      {value}{suffix ? ` ${suffix}` : ''}
    </span>
    <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="w-10 text-[16px] font-bold hover:bg-ch-surface disabled:opacity-40">+</button>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({ checked, onChange, label, disabled }) => (
  <label className={`flex items-center gap-2 text-[12.5px] ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--ch-accent)]" />
    {label}
  </label>
);

export const DuelRulesPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const rules = useDuelArenaStore((s) => s.myRules);
  const limits = useDuelArenaStore((s) => s.ruleLimits);
  const setMyRules = useDuelArenaStore((s) => s.setMyRules);
  const saveRuleLimits = useDuelArenaStore((s) => s.saveRuleLimits);
  const isPatron = currentUser.role === 'PATRON';

  const [draft, setDraft] = useState<DuelRuleLimits>(limits);
  const [limitsState, setLimitsState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [limitsError, setLimitsError] = useState('');
  useEffect(() => setDraft(limits), [limits]);

  const update = (patch: Partial<typeof rules>) => setMyRules({ ...rules, ...patch });
  const split = questionSplit(rules);
  const limitsDirty = JSON.stringify(normalizeLimits(draft)) !== JSON.stringify(limits);

  const toggleIn = <T,>(list: T[], item: T, on: boolean) => (on ? [...new Set([...list, item])] : list.filter((x) => x !== item));

  const saveLimits = async () => {
    setLimitsState('saving');
    setLimitsError('');
    try {
      await saveRuleLimits(draft);
      setLimitsState('saved');
      window.setTimeout(() => setLimitsState('idle'), 2000);
    } catch (error: any) {
      setLimitsState('error');
      setLimitsError(/relation|does not exist|schema cache/i.test(error?.message || '')
        ? 'The duel rules database update hasn\'t been run yet (supabase/migrations/20261004120000_duel_rules.sql).'
        : error?.message || 'Could not save the limits.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ---------- Your rules ---------- */}
      <section className="px-4 pb-10 pt-6 sm:px-8 lg:border-r-2 lg:border-ch-rule">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Your duel rules</p>
        <h3 className="mb-1 text-[24px] font-extrabold tracking-[-0.02em]">How your duels are played</h3>
        <p className="mb-6 max-w-[60ch] text-[13.5px] leading-relaxed text-ch-muted">
          These apply to challenges you send. Your opponent sees them before accepting. Changes save as you make them, on this device.
        </p>

        <div className="mb-6 border-2 border-ch-rule bg-ch-surface px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">Each duel you send</p>
          <p className="mt-1 text-[15px] font-extrabold">
            {rules.questionCount} {LANGUAGE_LABEL[rules.language]} questions
            <span className="font-semibold text-ch-muted">
              {' · '}{rules.mix === 'MIXED' ? `${split.coding} coding, ${split.quiz} quiz` : MIX_LABEL[rules.mix].toLowerCase()}
              {' · '}{rules.matchType === 'RANKED' ? 'ranked' : 'casual'}
            </span>
          </p>
          <p className="mt-0.5 text-[12px] text-ch-muted">Up to {formatDuration(estimateSeconds(rules)).replace('about ', '')} if every question runs to its timer.</p>
        </div>

        <div className="space-y-6">
          <div>
            <Label title="Language" hint="Quiz and coding questions" />
            <Segmented options={LANGUAGES} value={rules.language} onChange={(language) => update({ language })} label={(l) => LANGUAGE_LABEL[l]} allowed={(l) => limits.languages.includes(l)} disabledReason="Not allowed by the club's limits" />
          </div>

          <div>
            <Label title="Number of questions" hint={`${limits.minQuestions} to ${limits.maxQuestions}`} />
            <Stepper value={rules.questionCount} min={limits.minQuestions} max={limits.maxQuestions} onChange={(questionCount) => update({ questionCount })} />
          </div>

          <div>
            <Label title="Question types" hint={rules.mix === 'MIXED' ? 'About two coding to one quiz' : undefined} />
            <Segmented options={MIXES} value={rules.mix} onChange={(mix) => update({ mix })} label={(m) => MIX_LABEL[m]} allowed={(m) => limits.mixes.includes(m)} disabledReason="Not allowed by the club's limits" />
          </div>

          <div>
            <Label title="Difficulty" />
            <Segmented options={DIFFICULTIES} value={rules.difficulty} onChange={(difficulty) => update({ difficulty })} label={(d) => (d === 'AUTO' ? 'Auto' : DIFFICULTY_LABEL[d])} allowed={(d) => limits.difficulties.includes(d)} disabledReason="Not allowed by the club's limits" />
            <p className="mt-1.5 text-[11.5px] text-ch-muted">Auto matches the questions to both players' skill levels.</p>
          </div>

          {rules.mix !== 'CODING' && (
            <div>
              <Label title="Time per quiz question" />
              <Segmented
                options={QUIZ_SECOND_CHOICES}
                value={rules.quizSeconds}
                onChange={(quizSeconds) => update({ quizSeconds })}
                label={seconds}
                allowed={(s) => s >= limits.quizSeconds.min && s <= limits.quizSeconds.max}
                disabledReason="Outside the club's limits"
              />
            </div>
          )}

          {rules.mix !== 'QUIZ' && (
            <div>
              <Label title="Time per coding question" />
              <Segmented
                options={CODING_SECOND_CHOICES}
                value={rules.codingSeconds}
                onChange={(codingSeconds) => update({ codingSeconds })}
                label={seconds}
                allowed={(s) => s >= limits.codingSeconds.min && s <= limits.codingSeconds.max}
                disabledReason="Outside the club's limits"
              />
            </div>
          )}

          <div>
            <Label title="Match" />
            <Segmented
              options={['RANKED', 'CASUAL'] as Array<'RANKED' | 'CASUAL'>}
              value={rules.matchType}
              onChange={(matchType) => update({ matchType })}
              label={(m) => (m === 'RANKED' ? 'Ranked (changes rating)' : 'Casual (no rating change)')}
              allowed={(m) => m === 'CASUAL' || limits.rankedAllowed}
              disabledReason="Ranked duels are switched off by the patrons"
            />
          </div>

          <button
            type="button"
            onClick={() => setMyRules(DEFAULT_RULES)}
            className="border-t border-ch-divider pt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted hover:text-ch-text"
          >
            Reset to the standard duel
          </button>
        </div>
      </section>

      {/* ---------- Club limits ---------- */}
      <aside className="border-t-2 border-ch-rule px-4 pb-10 pt-6 sm:px-8 lg:border-t-0 lg:px-6">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-violet">Club limits</p>
        <h3 className="mb-1 text-[18px] font-extrabold tracking-[-0.01em]">{isPatron ? 'What members may choose' : 'Set by the patrons'}</h3>
        <p className="mb-5 text-[12.5px] leading-relaxed text-ch-muted">
          {isPatron
            ? 'Every duel\'s rules must fit inside these. Duels already sent are fitted to them when accepted.'
            : 'Every member\'s duel rules fit inside these.'}
        </p>

        {isPatron ? (
          <div className="space-y-5">
            <div>
              <Label title="Questions" hint={`max ${HARD_MAX_QUESTIONS}`} />
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-ch-muted">
                From <Stepper value={draft.minQuestions} min={1} max={draft.maxQuestions} onChange={(minQuestions) => setDraft({ ...draft, minQuestions })} />
                to <Stepper value={draft.maxQuestions} min={draft.minQuestions} max={HARD_MAX_QUESTIONS} onChange={(maxQuestions) => setDraft({ ...draft, maxQuestions })} />
              </div>
            </div>
            <div>
              <Label title="Languages" />
              <div className="flex flex-wrap gap-4">
                {LANGUAGES.map((l) => (
                  <Toggle key={l} label={LANGUAGE_LABEL[l]} checked={draft.languages.includes(l)} disabled={draft.languages.length === 1 && draft.languages.includes(l)} onChange={(on) => setDraft({ ...draft, languages: toggleIn(draft.languages, l, on) })} />
                ))}
              </div>
            </div>
            <div>
              <Label title="Question types" />
              <div className="flex flex-wrap gap-4">
                {MIXES.map((m) => (
                  <Toggle key={m} label={MIX_LABEL[m]} checked={draft.mixes.includes(m)} disabled={draft.mixes.length === 1 && draft.mixes.includes(m)} onChange={(on) => setDraft({ ...draft, mixes: toggleIn(draft.mixes, m, on) })} />
                ))}
              </div>
            </div>
            <div>
              <Label title="Difficulties" />
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map((d) => (
                  <Toggle key={d} label={d === 'AUTO' ? 'Auto (matched)' : DIFFICULTY_LABEL[d]} checked={draft.difficulties.includes(d)} disabled={draft.difficulties.length === 1 && draft.difficulties.includes(d)} onChange={(on) => setDraft({ ...draft, difficulties: toggleIn(draft.difficulties, d, on) })} />
                ))}
              </div>
            </div>
            {([
              ['quizSeconds', 'Quiz question time', QUIZ_SECOND_CHOICES, DEFAULT_LIMITS.quizSeconds],
              ['codingSeconds', 'Coding question time', CODING_SECOND_CHOICES, DEFAULT_LIMITS.codingSeconds],
            ] as const).map(([key, title, choices]) => (
              <div key={key}>
                <Label title={title} />
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-ch-muted">
                  From
                  <select value={draft[key].min} onChange={(e) => setDraft({ ...draft, [key]: { ...draft[key], min: Number(e.target.value) } })} className="border border-ch-rule bg-ch-bg px-2 py-1.5 text-[12.5px] text-ch-text">
                    {choices.filter((c) => c <= draft[key].max).map((c) => <option key={c} value={c}>{seconds(c)}</option>)}
                  </select>
                  to
                  <select value={draft[key].max} onChange={(e) => setDraft({ ...draft, [key]: { ...draft[key], max: Number(e.target.value) } })} className="border border-ch-rule bg-ch-bg px-2 py-1.5 text-[12.5px] text-ch-text">
                    {choices.filter((c) => c >= draft[key].min).map((c) => <option key={c} value={c}>{seconds(c)}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <div>
              <Label title="Ranked duels" />
              <Toggle label="Allow ranked duels (they change ratings)" checked={draft.rankedAllowed} onChange={(rankedAllowed) => setDraft({ ...draft, rankedAllowed })} />
            </div>

            <div className="flex items-center gap-3 border-t-2 border-ch-rule pt-4">
              <button
                type="button"
                onClick={() => void saveLimits()}
                disabled={!limitsDirty || limitsState === 'saving'}
                className="bg-ch-accent px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ch-on-accent hover:bg-ch-accent-deep disabled:opacity-50"
              >
                {limitsState === 'saving' ? 'Saving…' : 'Save club limits'}
              </button>
              <button type="button" onClick={() => setDraft(DEFAULT_LIMITS)} className="text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted hover:text-ch-text">
                Allow everything
              </button>
              {limitsState === 'saved' && <span className="text-[12px] font-bold text-green-600 dark:text-green-400">Saved</span>}
            </div>
            {limitsState === 'error' && <p className="text-[12px] text-ch-accent">{limitsError}</p>}
          </div>
        ) : (
          <dl className="text-[12.5px]">
            {[
              ['Questions', `${limits.minQuestions} to ${limits.maxQuestions}`],
              ['Languages', limits.languages.map((l) => LANGUAGE_LABEL[l]).join(', ')],
              ['Question types', limits.mixes.map((m) => MIX_LABEL[m]).join(', ')],
              ['Difficulties', limits.difficulties.map((d) => (d === 'AUTO' ? 'Auto' : DIFFICULTY_LABEL[d])).join(', ')],
              ['Quiz question time', `${seconds(limits.quizSeconds.min)} to ${seconds(limits.quizSeconds.max)}`],
              ['Coding question time', `${seconds(limits.codingSeconds.min)} to ${seconds(limits.codingSeconds.max)}`],
              ['Ranked duels', limits.rankedAllowed ? 'Allowed' : 'Off'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-t border-ch-divider py-2">
                <dt className="text-ch-muted">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </aside>
    </div>
  );
};
