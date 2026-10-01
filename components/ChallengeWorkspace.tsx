import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Challenge, ChallengeLanguage, ChallengeSubmission, User } from '../types';
import * as api from '../services/apiService';
import { runChallengeTests, hasTestCases, STARTER_CODE } from '../services/challengeRunner';
import {
    runChallengeTestReport,
    submitChallengeSolution,
    evaluateChallengeSubmission,
    ChallengeEvaluationError,
    type ChallengeEvaluation,
    type ChallengeTestReport,
} from '../services/challengeJudge';
import { runSandboxedJavaScript, runSandboxedPython } from '../services/sandboxRunner';
import { defineSplitThemes, splitEditorTheme } from '../lib/monacoThemes';
import { useMediaQuery } from '../lib/useMediaQuery';
import { FormattedMessage } from './FormattedMessage';
import ChallengeTestResults from './ChallengeTestResults';
import { SHELL_META_EVENT } from './ShellHeader';

// LeetCode-style solving view for one challenge: statement and history on the
// left, editor and a Testcase / Result panel on the right. Judging is the same
// in-browser judge Submit has always used (services/challengeJudge.ts).

interface ChallengeWorkspaceProps {
    challenge: Challenge;
    currentUser: User;
    theme: 'light' | 'dark';
    onBack: () => void;
    /** Called after a submission is recorded, so the page can refresh badges and lists. */
    onSubmitted: () => void;
}

type Verdict = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded';

type PanelResult =
    | { kind: 'idle' }
    | { kind: 'busy'; label: string }
    | { kind: 'run'; report: ChallengeTestReport }
    | { kind: 'custom'; output?: string; error?: string; runtimeMs: number; timedOut: boolean }
    | { kind: 'free'; lines: Array<{ type: 'log' | 'error'; content: string }>; timedOut: boolean }
    | { kind: 'submit'; evaluation: ChallengeEvaluation; recorded: boolean }
    | { kind: 'error'; message: string };

const verdictOf = (report: ChallengeTestReport): Verdict =>
    report.passed === report.total ? 'Accepted'
    : report.timedOut ? 'Time Limit Exceeded'
    : report.cases.some(c => !c.passed && c.error) ? 'Runtime Error'
    : 'Wrong Answer';

const AI_TEMPLATE: Record<ChallengeLanguage, string> = {
    python: '# Write your solution here.\n# The whole program is reviewed against the challenge requirements.\n\n',
    javascript: '// Write your solution here.\n// The whole program is reviewed against the challenge requirements.\n\n',
};

const langName = (lang: ChallengeLanguage) => (lang === 'python' ? 'Python' : 'JavaScript');

const codeKey = (challengeId: string, lang: ChallengeLanguage) => `challenge_code_${challengeId}_${lang}`;

const readSaved = (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
};

const Pre: React.FC<{ label: string; text?: string; tone?: 'error' }> = ({ label, text, tone }) => (
    <div className="min-w-0">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">{label}</p>
        <pre className={`ch-scroll max-h-40 overflow-auto whitespace-pre-wrap break-words border px-3 py-2 font-mono text-[12.5px] leading-[1.55] ${
            tone === 'error' ? 'border-ch-accent text-ch-accent' : 'border-ch-divider bg-ch-surface text-ch-text'
        }`}>
            {text === undefined || text === '' ? <span className="opacity-50">(empty)</span> : text}
        </pre>
    </div>
);

const ChallengeWorkspace: React.FC<ChallengeWorkspaceProps> = ({ challenge, currentUser, theme, onBack, onSubmitted }) => {
    const tested = hasTestCases(challenge);
    const isWide = useMediaQuery('(min-width: 1024px)');
    const visibleCases = useMemo(() => (challenge.testCases || []).filter(c => !c.hidden), [challenge.testCases]);
    const hiddenCount = (challenge.testCases?.length || 0) - visibleCases.length;
    // Starter code that ships its own solve() glue (seeded practice sets): members write a named function instead.
    const suppliedSolve = /Judge glue/.test(challenge.starterCode || '');

    // Tested challenges are judged in their own language; AI-reviewed ones let the member pick.
    const [language, setLanguage] = useState<ChallengeLanguage>(challenge.language || 'python');
    const starter = tested ? (challenge.starterCode || STARTER_CODE[language]) : AI_TEMPLATE[language];
    const [code, setCode] = useState<string>(() => readSaved(codeKey(challenge.id, language)) ?? starter);

    const [leftTab, setLeftTab] = useState<'description' | 'submissions'>('description');
    const [bottomTab, setBottomTab] = useState<'testcase' | 'result'>('testcase');
    const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'result'>('problem');
    const [selectedCase, setSelectedCase] = useState<number | 'custom'>(0);
    const [customInput, setCustomInput] = useState(visibleCases[0]?.input || '');
    const [result, setResult] = useState<PanelResult>({ kind: 'idle' });
    const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);

    const now = new Date();
    const deadline = new Date(challenge.deadline);
    const hasBadge = !!currentUser.badges?.includes(challenge.title);
    const isOpen = challenge.status === 'ACTIVE' && deadline >= now;
    const isPatron = currentUser.role === 'PATRON';
    // Only an eligible member's submission is saved and can award the badge. Everyone
    // else still gets the full judge (hidden tests included) as "Check all".
    const canSubmit = isOpen && !hasBadge && !isPatron;
    const submitBlockedReason = isPatron ? 'Patron preview — Check all judges every test without saving'
        : hasBadge ? 'Badge already earned — Check all judges every test without saving'
        : !isOpen ? 'Challenge closed — Check all judges every test without saving'
        : '';
    const busy = result.kind === 'busy';

    // Switching language (AI-reviewed only) swaps to that language's saved draft.
    const switchLanguage = (next: ChallengeLanguage) => {
        if (next === language || tested) return;
        setLanguage(next);
        setCode(readSaved(codeKey(challenge.id, next)) ?? AI_TEMPLATE[next]);
    };

    // Autosave the draft per challenge and language.
    useEffect(() => {
        const id = window.setTimeout(() => {
            try { localStorage.setItem(codeKey(challenge.id, language), code); } catch { /* storage full or blocked */ }
        }, 400);
        return () => window.clearTimeout(id);
    }, [code, challenge.id, language]);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent(SHELL_META_EVENT, { detail: { tab: 'challenges', meta: `Solving · ${challenge.title}` } }));
        return () => {
            window.dispatchEvent(new CustomEvent(SHELL_META_EVENT, { detail: { tab: 'challenges', meta: '' } }));
        };
    }, [challenge.title]);

    const loadSubmissions = useCallback(async () => {
        setLoadingSubs(true);
        try {
            const all = await api.getSubmissions(challenge.id);
            setSubmissions(all
                .filter(s => s.userId === currentUser.uid)
                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        } finally {
            setLoadingSubs(false);
        }
    }, [challenge.id, currentUser.uid]);

    useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

    const showResult = () => {
        setBottomTab('result');
        if (!isWide) setMobileTab('result');
    };

    // ---------- Run ----------
    const runFree = async () => {
        const lines: Array<{ type: 'log' | 'error'; content: string }> = [];
        let timedOut = false;
        const runner = language === 'python' ? runSandboxedPython : runSandboxedJavaScript;
        const controller = runner({
            code,
            timeoutMs: 15000,
            onOutput: line => {
                if (line.type === 'error' && line.content.includes('Execution stopped after')) timedOut = true;
                lines.push(line);
            },
            // Interactive input() can't be answered here; send an empty line so the run finishes.
            onInputRequest: () => controller.provideInput(''),
        });
        await controller.finished;
        setResult({ kind: 'free', lines, timedOut });
    };

    const run = async () => {
        if (busy) return;
        setResult({ kind: 'busy', label: 'Running' });
        showResult();
        try {
            if (!tested) {
                await runFree();
            } else if (selectedCase === 'custom') {
                const run = await runChallengeTests(language, code, [{ id: 'custom', input: customInput, expectedOutput: '', hidden: false }]);
                const only = run.caseResults[0];
                setResult({ kind: 'custom', output: only?.actualOutput, error: only?.error, runtimeMs: only?.runtimeMs || 0, timedOut: run.crashed });
            } else {
                const report = await runChallengeTestReport(challenge, code, true);
                setResult({ kind: 'run', report });
            }
        } catch (error: any) {
            setResult({ kind: 'error', message: error?.message || 'The sandbox could not run your code.' });
        }
    };

    // ---------- Submit ----------
    const submit = async () => {
        if (busy) return;
        setResult({ kind: 'busy', label: tested ? 'Judging against all tests' : 'Reviewing your solution' });
        showResult();
        if (!canSubmit) {
            try {
                setResult({ kind: 'submit', evaluation: await evaluateChallengeSubmission(challenge, code), recorded: false });
            } catch (error: any) {
                setResult({ kind: 'error', message: error?.message || 'Your code could not be judged right now. Try again in a moment.' });
            }
            return;
        }
        try {
            const evaluation = await submitChallengeSolution(challenge, currentUser.uid, code);
            setResult({ kind: 'submit', evaluation, recorded: true });
            onSubmitted();
        } catch (error: any) {
            setResult({
                kind: 'error',
                message: error instanceof ChallengeEvaluationError
                    ? 'Your solution was saved, but it could not be judged right now. A patron can review it, or submit again in a moment.'
                    : `Submission failed: ${error?.message || 'unknown error'}`,
            });
            if (error instanceof ChallengeEvaluationError) onSubmitted();
        } finally {
            void loadSubmissions();
        }
    };

    const runRef = useRef(run);
    const submitRef = useRef(submit);
    runRef.current = run;
    submitRef.current = submit;

    const handleEditorMount = (editor: any, monaco: any) => {
        editor.updateOptions({ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4 });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => submitRef.current());
    };

    // ---------- pieces ----------
    const cellIdle = 'text-ch-muted hover:bg-ch-surface hover:text-ch-text';
    const tabCell = (active: boolean) =>
        `flex items-center gap-2 border-r border-ch-divider px-5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors duration-100 ${
            active ? 'bg-ch-accent-soft text-ch-text' : 'text-ch-muted hover:bg-ch-surface'
        }`;
    const mark = (active: boolean) => <span className="h-1.5 w-1.5 flex-none" style={{ background: active ? 'var(--ch-accent)' : 'transparent' }} />;

    const description = (
        <div className="px-5 pb-10 pt-6 sm:px-7">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">
                {challenge.difficulty ? `${challenge.difficulty.toLowerCase()} · ` : ''}
                {tested ? `${langName(language)} · ${challenge.testCases?.length} tests` : 'AI reviewed'}
            </p>
            <h2 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em]">{challenge.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em]">
                <span className={`border px-2 py-0.5 ${isOpen ? 'border-ch-rule text-ch-text' : 'border-ch-divider text-ch-muted'}`}>
                    {isOpen ? `Due ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Closed'}
                </span>
                {hasBadge && <span className="bg-ch-accent px-2 py-0.5 text-ch-on-accent">Badge earned</span>}
            </div>

            <div className="mt-6 border-t-2 border-ch-rule pt-5 text-[14.5px] leading-relaxed">
                <FormattedMessage text={challenge.description} isUser={false} />
            </div>

            {tested && visibleCases.length > 0 && (
                <div className="mt-8 space-y-5">
                    {visibleCases.map((tc, i) => (
                        <div key={tc.id} className="border-t border-ch-divider pt-4">
                            <p className="mb-2.5 text-[13px] font-extrabold">Example {i + 1}</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Pre label="Input" text={tc.input} />
                                <Pre label="Output" text={tc.expectedOutput} />
                            </div>
                            {tc.explanation && <p className="mt-2 text-[13px] text-ch-muted">{tc.explanation}</p>}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 border-2 border-ch-rule px-4 py-3.5">
                <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">How it's judged</p>
                {tested && suppliedSolve ? (
                    <p className="text-[13px] leading-relaxed text-ch-muted">
                        Write the function named in the starter code and keep its name. Each test calls it with that test's input as its
                        arguments and compares what it <strong className="text-ch-text">returns</strong>, value and type, with the expected answer.
                        Leave the <code className="font-mono text-ch-text">solve</code> glue at the bottom as it is.
                        Run checks the {visibleCases.length} example{visibleCases.length === 1 ? '' : 's'}; Submit runs all {challenge.testCases?.length}
                        {hiddenCount > 0 ? `, including ${hiddenCount} hidden` : ''}. Every test must pass to earn the badge.
                    </p>
                ) : tested ? (
                    <p className="text-[13px] leading-relaxed text-ch-muted">
                        Define <code className="font-mono text-ch-text">solve(input_text)</code>. It receives each test's input as one string and must
                        <strong className="text-ch-text"> return</strong> the answer as a string (trailing whitespace is ignored).
                        Run checks the {visibleCases.length} example{visibleCases.length === 1 ? '' : 's'}; Submit runs all {challenge.testCases?.length}
                        {hiddenCount > 0 ? `, including ${hiddenCount} hidden` : ''}. Every test must pass to earn the badge.
                    </p>
                ) : (
                    <p className="text-[13px] leading-relaxed text-ch-muted">
                        There are no automatic tests for this one. Run executes your program; Submit sends it for review against the requirements above.
                    </p>
                )}
            </div>
        </div>
    );

    const submissionsList = (
        <div className="px-5 pb-8 pt-5 sm:px-7">
            <div className="mb-2.5 flex items-baseline justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Your submissions</p>
                <span className="text-[11px] text-ch-muted">{submissions.length}</span>
            </div>
            {loadingSubs && submissions.length === 0 ? (
                <p className="py-2 text-[13px] text-ch-muted">Loading…</p>
            ) : submissions.length === 0 ? (
                <p className="py-2 text-[13px] text-ch-muted">Nothing submitted yet.</p>
            ) : (
                submissions.map(sub => {
                    const accepted = sub.status === 'APPROVED';
                    return (
                        <button
                            key={sub.id}
                            onClick={() => { setCode(sub.content); if (!isWide) setMobileTab('code'); }}
                            className="flex w-full items-center gap-3 border-t border-ch-divider py-3 text-left transition-opacity duration-100 hover:opacity-65"
                            title="Load this code into the editor"
                        >
                            <span className={`w-28 flex-none text-[13px] font-extrabold ${accepted ? 'text-green-600 dark:text-green-400' : sub.status === 'REJECTED' ? 'text-ch-accent' : 'text-ch-muted'}`}>
                                {accepted ? 'Accepted' : sub.status === 'REJECTED' ? 'Not passed' : 'Pending'}
                            </span>
                            <span className="min-w-0 flex-1 text-[12px] text-ch-muted">
                                {new Date(sub.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {sub.testsTotal != null && (
                                <span className="text-[12px] font-bold">{sub.testsPassed ?? 0}/{sub.testsTotal}</span>
                            )}
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ch-muted">Load</span>
                        </button>
                    );
                })
            )}
        </div>
    );

    const testcasePanel = !tested ? (
        <div className="px-5 py-4 text-[13px] leading-relaxed text-ch-muted">
            This challenge has no automatic tests. <strong className="text-ch-text">Run</strong> executes your whole program and shows its output in Result.
        </div>
    ) : (
        <div className="px-5 py-4">
            <div className="mb-4 flex flex-wrap gap-2">
                {visibleCases.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setSelectedCase(i)}
                        className={`h-8 px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors ${
                            selectedCase === i ? 'bg-ch-accent text-ch-on-accent' : `border border-ch-divider ${cellIdle}`
                        }`}
                    >
                        Case {i + 1}
                    </button>
                ))}
                <button
                    onClick={() => setSelectedCase('custom')}
                    className={`h-8 px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors ${
                        selectedCase === 'custom' ? 'bg-ch-accent text-ch-on-accent' : `border border-ch-divider ${cellIdle}`
                    }`}
                >
                    Custom
                </button>
            </div>
            {selectedCase === 'custom' ? (
                <div>
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">Your input</p>
                    <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        rows={4}
                        spellCheck={false}
                        className="w-full border border-ch-divider px-3 py-2 font-mono text-[12.5px]"
                    />
                    <p className="mt-1.5 text-[11px] text-ch-muted">Run shows what solve() returns for this input — there's no expected answer to compare against.</p>
                </div>
            ) : visibleCases[selectedCase] ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Pre label="Input" text={visibleCases[selectedCase].input} />
                    <Pre label="Expected" text={visibleCases[selectedCase].expectedOutput} />
                </div>
            ) : (
                <p className="text-[13px] text-ch-muted">This challenge only has hidden tests — use Custom to try inputs, then Submit.</p>
            )}
            <p className="mt-4 text-[11px] text-ch-muted">Ctrl/⌘ + Enter runs · Ctrl/⌘ + Shift + Enter submits</p>
        </div>
    );

    const verdictHeader = (verdict: Verdict | string, good: boolean, sub: string) => (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className={`text-[24px] font-extrabold tracking-[-0.02em] ${good ? 'text-green-600 dark:text-green-400' : 'text-ch-accent'}`}>{verdict}</span>
            <span className="text-[12px] text-ch-muted">{sub}</span>
        </div>
    );

    const resultPanel = (() => {
        switch (result.kind) {
            case 'idle':
                return <p className="px-5 py-4 text-[13px] text-ch-muted">Run your code to see results here.</p>;
            case 'busy':
                return (
                    <div className="flex items-center gap-3 px-5 py-6">
                        <div className="h-5 w-5 animate-spin border-2 border-ch-divider border-t-ch-accent" />
                        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ch-muted">{result.label}…</span>
                    </div>
                );
            case 'error':
                return <p className="px-5 py-4 text-[13px] text-ch-accent">{result.message}</p>;
            case 'run': {
                const v = verdictOf(result.report);
                const ms = result.report.cases.reduce((s, c) => s + c.runtimeMs, 0);
                return (
                    <div className="px-5 py-4">
                        {verdictHeader(v, v === 'Accepted', `${result.report.passed}/${result.report.total} examples · ${ms} ms${hiddenCount ? ` · ${hiddenCount} hidden run on submit` : ''}`)}
                        <ChallengeTestResults report={result.report} />
                    </div>
                );
            }
            case 'custom':
                return (
                    <div className="space-y-3 px-5 py-4">
                        {verdictHeader(result.timedOut ? 'Time Limit Exceeded' : result.error ? 'Runtime Error' : 'Finished', !result.error && !result.timedOut, `${result.runtimeMs} ms · custom input`)}
                        <Pre label="Input" text={customInput} />
                        {result.error ? <Pre label="Error" text={result.error} tone="error" /> : <Pre label="solve() returned" text={result.output} />}
                    </div>
                );
            case 'free':
                return (
                    <div className="px-5 py-4">
                        {verdictHeader(result.timedOut ? 'Time Limit Exceeded' : result.lines.some(l => l.type === 'error') ? 'Finished with errors' : 'Finished', !result.timedOut && !result.lines.some(l => l.type === 'error'), 'program output')}
                        <pre className="ch-scroll max-h-72 overflow-auto whitespace-pre-wrap break-words border border-ch-divider bg-ch-surface px-3 py-2 font-mono text-[12.5px] leading-[1.55]">
                            {result.lines.length === 0 ? <span className="opacity-50">(no output)</span> : result.lines.map((l, i) => (
                                <div key={i} className={l.type === 'error' ? 'text-ch-accent' : ''}>{l.content}</div>
                            ))}
                        </pre>
                    </div>
                );
            case 'submit': {
                const ev = result.evaluation;
                const notSaved = !result.recorded && (
                    <p className="mb-4 border-l-2 border-ch-rule bg-ch-surface px-3 py-2 text-[12.5px] text-ch-muted">
                        Checked only — not saved, and no badge. {submitBlockedReason.split(' — ')[0]}.
                    </p>
                );
                if (ev.tests) {
                    const v = verdictOf(ev.tests);
                    return (
                        <div className="px-5 py-4">
                            {verdictHeader(v, v === 'Accepted', `${ev.tests.passed}/${ev.tests.total} tests passed`)}
                            {notSaved}
                            {ev.passed && result.recorded && (
                                <p className="mb-4 border-l-2 border-ch-accent bg-ch-accent-soft px-3 py-2 text-[13px] font-semibold">
                                    Badge earned: {challenge.title}
                                </p>
                            )}
                            <ChallengeTestResults report={ev.tests} />
                            {!ev.passed && ev.improvements && <p className="mt-3 text-[12.5px] text-ch-muted">{ev.improvements}</p>}
                        </div>
                    );
                }
                return (
                    <div className="space-y-4 px-5 py-4">
                        {verdictHeader(ev.passed ? 'Approved' : ev.passed === false ? 'Not yet' : 'Submitted', !!ev.passed, 'AI review')}
                        {notSaved}
                        {ev.passed && result.recorded && (
                            <p className="border-l-2 border-ch-accent bg-ch-accent-soft px-3 py-2 text-[13px] font-semibold">Badge earned: {challenge.title}</p>
                        )}
                        <div className="text-[13.5px] leading-relaxed"><FormattedMessage text={ev.feedback} isUser={false} /></div>
                        {ev.weaknesses && (
                            <div>
                                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-accent">What to fix</p>
                                <div className="text-[13px]"><FormattedMessage text={ev.weaknesses} isUser={false} /></div>
                            </div>
                        )}
                        {ev.improvements && (
                            <div>
                                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">Next steps</p>
                                <div className="text-[13px]"><FormattedMessage text={ev.improvements} isUser={false} /></div>
                            </div>
                        )}
                    </div>
                );
            }
        }
    })();

    const stripBtn = 'flex flex-none items-center gap-2 px-4 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5';

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* ---------- Top strip ---------- */}
            <div className="flex h-[46px] flex-none items-stretch border-b-2 border-ch-rule">
                <button onClick={onBack} className={`${stripBtn} border-r border-ch-divider ${cellIdle}`}>
                    <span aria-hidden>←</span><span className="hidden sm:inline">Problems</span>
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
                    <span className="truncate text-[15px] font-extrabold tracking-[-0.01em]">{challenge.title}</span>
                    {challenge.difficulty && (
                        <span className="hidden flex-none border border-ch-divider px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-ch-muted md:inline">
                            {challenge.difficulty}
                        </span>
                    )}
                </div>
                {!tested && (['python', 'javascript'] as ChallengeLanguage[]).map(lang => (
                    <button
                        key={lang}
                        onClick={() => switchLanguage(lang)}
                        className={`${stripBtn} hidden border-l border-ch-divider md:flex ${language === lang ? 'bg-ch-accent-soft text-ch-text' : cellIdle}`}
                    >
                        {langName(lang)}
                    </button>
                ))}
                {tested && (
                    <span className="hidden flex-none items-center border-l border-ch-divider px-5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ch-muted md:flex">
                        {langName(language)}
                    </span>
                )}
                <button onClick={() => void run()} disabled={busy} className={`${stripBtn} border-l-2 border-ch-rule text-ch-text hover:bg-ch-surface`} title="Run (Ctrl/⌘ + Enter)">
                    Run
                </button>
                <button
                    onClick={() => void submit()}
                    disabled={busy}
                    title={`${canSubmit ? 'Submit' : 'Check all tests without saving'} (Ctrl/⌘ + Shift + Enter)`}
                    className={`${stripBtn} border-l-2 border-ch-rule bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep`}
                >
                    {canSubmit ? 'Submit' : 'Check all'}
                </button>
            </div>

            {/* ---------- Narrow screens: one pane at a time ---------- */}
            {!isWide && (
                <div className="flex h-[42px] flex-none items-stretch border-b-2 border-ch-rule">
                    {([['problem', 'Problem'], ['code', 'Code'], ['result', 'Result']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setMobileTab(id)} className={`${tabCell(mobileTab === id)} flex-1 last:border-r-0`}>
                            {mark(mobileTab === id)}{label}
                        </button>
                    ))}
                </div>
            )}

            {!canSubmit && (
                <div className="flex-none border-b border-ch-divider bg-ch-surface px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted">
                    {submitBlockedReason}
                </div>
            )}

            <div className="flex min-h-0 flex-1 items-stretch">
                {/* ---------- Problem ---------- */}
                {(isWide || mobileTab === 'problem') && (
                    <section className="flex min-h-0 w-full flex-none flex-col lg:w-[44%] lg:max-w-[640px] lg:border-r-2 lg:border-ch-rule">
                        <div className="flex h-[42px] flex-none items-stretch border-b-2 border-ch-rule">
                            <button onClick={() => setLeftTab('description')} className={tabCell(leftTab === 'description')}>{mark(leftTab === 'description')}Description</button>
                            <button onClick={() => setLeftTab('submissions')} className={tabCell(leftTab === 'submissions')}>
                                {mark(leftTab === 'submissions')}Submissions{submissions.length ? ` · ${submissions.length}` : ''}
                            </button>
                        </div>
                        <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
                            {leftTab === 'description' ? description : submissionsList}
                        </div>
                    </section>
                )}

                {/* ---------- Code + panel ---------- */}
                {(isWide || mobileTab !== 'problem') && (
                    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                        {(isWide || mobileTab === 'code') && (
                            <div className="relative min-h-0 flex-1">
                                <div className="absolute inset-0">
                                    <Editor
                                        height="100%"
                                        language={language}
                                        theme={splitEditorTheme(theme)}
                                        value={code}
                                        beforeMount={defineSplitThemes}
                                        onMount={handleEditorMount}
                                        onChange={(value) => setCode(value || '')}
                                        loading={<div className="flex h-full items-center justify-center text-[13px] text-ch-muted">Loading editor…</div>}
                                        options={{ padding: { top: 16, bottom: 16 } }}
                                    />
                                </div>
                            </div>
                        )}

                        {(isWide || mobileTab === 'code') && (
                            <div className="flex h-7 flex-none items-stretch border-t border-ch-divider bg-ch-surface text-[10px] font-bold uppercase tracking-[0.1em] text-ch-muted">
                                <div className="flex items-center border-r border-ch-divider px-[18px]">{langName(language)}</div>
                                <div className="flex items-center border-r border-ch-divider px-[18px]">Spaces · 4</div>
                                <div className="flex-1" />
                                <button
                                    onClick={() => setCode(starter)}
                                    className="flex items-center border-l border-ch-divider px-[18px] transition-colors hover:bg-ch-surface-2 hover:text-ch-text"
                                    title="Replace the editor with the starter code"
                                >
                                    Reset
                                </button>
                                <div className="flex items-center border-l border-ch-divider px-[18px]">Autosaved</div>
                            </div>
                        )}

                        {(isWide || mobileTab === 'result') && (
                            <div className={`flex min-h-0 flex-col border-t-2 border-ch-rule ${isWide ? 'h-[40%] min-h-[220px] flex-none' : 'flex-1'}`}>
                                <div className="flex h-10 flex-none items-stretch border-b border-ch-divider">
                                    <button onClick={() => setBottomTab('testcase')} className={tabCell(bottomTab === 'testcase')}>{mark(bottomTab === 'testcase')}Testcase</button>
                                    <button onClick={() => setBottomTab('result')} className={tabCell(bottomTab === 'result')}>{mark(bottomTab === 'result')}Result</button>
                                </div>
                                <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
                                    {bottomTab === 'testcase' ? testcasePanel : resultPanel}
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};

export default ChallengeWorkspace;
