import { runSandboxedPython } from './sandboxRunner';
import { DuelGeneratedTestCase, DuelJudgeCaseResult, DuelJudgeResult } from './geminiService';

// Pyodide-backed deterministic judging for the Code Duel arena.
//
// The arena contract is `solve(input_text: str) -> str`, called once per test
// case, with the returned string compared to the expected output (trailing
// whitespace ignored). We reuse the existing sandbox worker (services/
// sandboxRunner.ts) but drive it with a harness that runs every case inside a
// single Pyodide execution and prints one sentinel-tagged JSON blob we parse
// back out. This removes the non-determinism and prompt-injection risk of LLM
// "mental execution" while reusing the already-warm Pyodide runtime.

export interface DuelRunCaseResult {
  id: string;
  passed: boolean;
  actualOutput?: string;
  error?: string;
  runtimeMs: number;
}

export interface DuelRunResult {
  caseResults: DuelRunCaseResult[];
  passed: number;
  total: number;
  totalRuntimeMs: number;
  hadError: boolean;
  /** True when the worker died / timed out before emitting any results (e.g. an infinite loop). */
  crashed: boolean;
}

const SENTINEL = '__DUEL_RESULT__';
// Time the tests may take once Python is ready (loading it doesn't count; see
// sandboxRunner). Generous because phones run them far slower than laptops.
export const DUEL_TIMEOUT_MS = 30000;

/**
 * How the code under test is driven. `function`: call solve(input) per case and
 * compare what it returns. `program`: run the whole file once per case with the
 * input on stdin (input(), sys.stdin) and compare what it prints, line by line
 * with trailing spaces ignored. Duels always use `function`.
 */
export type RunMode = 'function' | 'program';

// Program mode. Prompts passed to input() aren't printed, so input("Enter n: ") is
// fine, and reading past the end of the input raises EOFError like a terminal would.
// The worker's own stdout is swapped out only while the program runs.
const PROGRAM_RUNNER = [
  'def __norm(text):',
  "    lines = str(text).replace('\\r\\n', '\\n').split('\\n')",
  "    return '\\n'.join(line.rstrip() for line in lines).rstrip('\\n')",
  '',
  'def __run_program(src, cases):',
  '    import io, sys, traceback',
  '    try:',
  "        code = compile(src, '<main>', 'exec')",
  '    except SyntaxError as e:',
  "        msg = 'SyntaxError: ' + str(e.msg) + (' (line ' + str(e.lineno) + ')' if e.lineno else '')",
  "        return [{'id': c['id'], 'passed': False, 'error': msg, 'ms': 0.0} for c in cases]",
  '    results = []',
  '    real_out, real_in = sys.stdout, sys.stdin',
  '    for c in cases:',
  "        text = str(c['input']).replace('\\r\\n', '\\n')",
  // Every newline in a test's input separates two lines, so a last line can be empty.
  "        stdin = io.StringIO(text + '\\n')",
  '        out = io.StringIO()',
  "        def read_line(prompt='', _stdin=stdin):",
  '            line = _stdin.readline()',
  "            if line == '':",
  "                raise EOFError('the program asked for more input than this test has')",
  "            return line[:-1] if line.endswith('\\n') else line",
  "        ns = {'__name__': '__main__', 'input': read_line}",
  '        error = None',
  '        t0 = __time.perf_counter()',
  '        sys.stdout, sys.stdin = out, stdin',
  '        try:',
  '            exec(code, ns)',
  '        except SystemExit:',
  '            pass',
  '        except Exception as e:',
  "            frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == '<main>']",
  "            error = type(e).__name__ + ': ' + str(e) + (' (line ' + str(frames[-1].lineno) + ')' if frames else '')",
  '        finally:',
  '            sys.stdout, sys.stdin = real_out, real_in',
  '        ms = (__time.perf_counter() - t0) * 1000.0',
  '        actual = out.getvalue()',
  '        if error is not None:',
  "            results.append({'id': c['id'], 'passed': False, 'error': error, 'actual': actual, 'ms': ms})",
  '        else:',
  "            results.append({'id': c['id'], 'passed': __norm(actual) == __norm(c['expected']), 'actual': actual, 'ms': ms})",
  '    return results',
];

/** UTF-8-safe base64 so arbitrary source / inputs / outputs inject cleanly into the Python harness. */
const encodeUtf8B64 = (value: string): string => btoa(unescape(encodeURIComponent(value)));

// The player's code is base64-encoded and exec'd into a FRESH dict (`__ns`) every
// run, so nothing they define touches the shared worker's globals or survives to a
// later run — each judging is isolated. Encoding also means the player's source is
// never visible to the worker's async-call rewriter, and syntax/definition errors
// are caught here as a clean verdict instead of crashing the whole execution.
const buildHarness = (playerCode: string, cases: DuelGeneratedTestCase[], mode: RunMode = 'function'): string =>
  [
    'import json as __json, base64 as __b64, time as __time',
    `__src = __b64.b64decode("${encodeUtf8B64(playerCode)}").decode("utf-8")`,
    `__cases = __json.loads(__b64.b64decode("${encodeUtf8B64(JSON.stringify(cases.map((c) => ({ id: c.id, input: c.input, expected: c.expectedOutput }))))}").decode("utf-8"))`,
    '',
    'def __run_duel(src, cases):',
    '    ns = {}',
    '    try:',
    '        exec(src, ns)',
    '    except Exception as e:',
    "        return [{'id': c['id'], 'passed': False, 'error': 'Definition error: ' + repr(e), 'ms': 0.0} for c in cases]",
    "    solve = ns.get('solve')",
    '    if not callable(solve):',
    "        return [{'id': c['id'], 'passed': False, 'error': 'No callable solve(input_text) was defined.', 'ms': 0.0} for c in cases]",
    '    results = []',
    '    for c in cases:',
    '        t0 = __time.perf_counter()',
    '        try:',
    "            out = solve(c['input'])",
    '            ms = (__time.perf_counter() - t0) * 1000.0',
    "            ok = str(out).rstrip() == str(c['expected']).rstrip()",
    "            results.append({'id': c['id'], 'passed': ok, 'actual': str(out), 'ms': ms})",
    '        except Exception as e:',
    '            ms = (__time.perf_counter() - t0) * 1000.0',
    "            results.append({'id': c['id'], 'passed': False, 'error': repr(e), 'ms': ms})",
    '    return results',
    '',
    ...PROGRAM_RUNNER,
    '',
    `print("${SENTINEL}" + __json.dumps(${mode === 'program' ? '__run_program' : '__run_duel'}(__src, __cases)))`,
  ].join('\n');

/**
 * Run a reference solve() over a list of inputs in Pyodide and return the produced
 * outputs, in order. Used at generation time to derive the *true* expected output for
 * each coding question, so AI-authored cases can't mark a correct solution wrong.
 * Returns null for any input where the reference raised (so the caller can drop it).
 */
export const runReference = (
  code: string,
  inputs: string[],
  timeoutMs = DUEL_TIMEOUT_MS,
  mode: RunMode = 'function',
): Promise<(string | null)[]> =>
  new Promise((resolve, reject) => {
    const cases: DuelGeneratedTestCase[] = inputs.map((input, i) => ({
      id: `ref-${i + 1}`,
      input,
      expectedOutput: '',
      hidden: false,
    }));
    const lines: string[] = [];
    let timedOut = false;
    const controller = runSandboxedPython({
      code: buildHarness(code, cases, mode),
      timeoutMs,
      onOutput: (line) => {
        lines.push(line.content);
        if (line.type === 'error' && line.content.includes('Execution stopped after')) timedOut = true;
      },
    });
    controller.finished.then(() => {
      const raw = lines.find((l) => l.includes(SENTINEL));
      if (!raw) {
        if (timedOut) {
          resolve(inputs.map(() => null));
          return;
        }
        reject(new Error('The Python sandbox could not run the reference solution.'));
        return;
      }
      let parsed: any[] = [];
      try {
        parsed = JSON.parse(raw.slice(raw.indexOf(SENTINEL) + SENTINEL.length));
      } catch {
        parsed = [];
      }
      resolve(
        cases.map((c) => {
          const r = parsed.find((x) => x?.id === c.id);
          // The harness records `actual` only when solve() returned without raising.
          return r && r.error == null && typeof r.actual === 'string' ? r.actual : null;
        }),
      );
    });
  });

/** Run the player's solve() against the given cases in Pyodide and return structured pass/fail. */
export const runDuelTests = (
  code: string,
  cases: DuelGeneratedTestCase[],
  timeoutMs = DUEL_TIMEOUT_MS,
  mode: RunMode = 'function',
): Promise<DuelRunResult> =>
  new Promise((resolve, reject) => {
    const lines: string[] = [];
    let timedOut = false;
    const controller = runSandboxedPython({
      code: buildHarness(code, cases, mode),
      timeoutMs,
      onOutput: (line) => {
        lines.push(line.content);
        // The sandbox emits this exact message when it kills a run on the wall-clock timeout.
        if (line.type === 'error' && line.content.includes('Execution stopped after')) {
          timedOut = true;
        }
      },
    });

    controller.finished.then(() => {
      const raw = lines.find((l) => l.includes(SENTINEL));
      if (!raw) {
        if (timedOut) {
          // Genuine TLE: an infinite loop or a too-slow approach ran out the clock.
          resolve({
            caseResults: cases.map((c) => ({ id: c.id, passed: false, runtimeMs: 0 })),
            passed: 0,
            total: cases.length,
            totalRuntimeMs: 0,
            hadError: true,
            crashed: true,
          });
          return;
        }
        // No sentinel and no timeout = the sandbox itself failed to run (e.g. Pyodide
        // could not load). Surface as an error so the player is asked to retry rather
        // than unfairly losing on a verdict we did not actually compute.
        reject(new Error('The Python sandbox could not run your code.'));
        return;
      }

      let parsed: any[] = [];
      try {
        parsed = JSON.parse(raw.slice(raw.indexOf(SENTINEL) + SENTINEL.length));
      } catch {
        parsed = [];
      }

      const caseResults: DuelRunCaseResult[] = cases.map((c) => {
        const r = parsed.find((x) => x?.id === c.id);
        return {
          id: c.id,
          passed: !!r?.passed,
          actualOutput: typeof r?.actual === 'string' ? r.actual : undefined,
          error: typeof r?.error === 'string' ? r.error : undefined,
          runtimeMs: Math.round(Number(r?.ms) || 0),
        };
      });

      resolve({
        caseResults,
        passed: caseResults.filter((r) => r.passed).length,
        total: cases.length,
        totalRuntimeMs: Math.round(caseResults.reduce((s, r) => s + r.runtimeMs, 0)),
        hadError: caseResults.some((r) => r.error),
        crashed: false,
      });
    });
  });

/**
 * Deterministic local judge that mirrors the DuelJudgeResult shape produced by
 * the LLM judge, so it drops into executeJudging with no downstream changes.
 */
export const judgeDuelTestsLocally = async (
  code: string,
  cases: DuelGeneratedTestCase[],
  timeoutMs?: number,
  language: 'python' | 'javascript' = 'python',
): Promise<DuelJudgeResult> => {
  // JavaScript runs in the challenge runner's worker harness (imported here, not at
  // the top, because challengeRunner itself imports this module).
  const run = language === 'javascript'
    ? await (await import('./challengeRunner')).runChallengeTests('javascript', code, cases, timeoutMs)
    : await runDuelTests(code, cases, timeoutMs);

  const verdict: DuelJudgeResult['verdict'] = run.crashed
    ? 'Time Limit Exceeded'
    : run.passed === run.total
      ? 'Accepted'
      : run.hadError
        ? 'Runtime Error'
        : 'Wrong Answer';

  const caseResults: DuelJudgeCaseResult[] = run.caseResults.map((r) => ({
    id: r.id,
    passed: r.passed,
    // Run-path cases are all public samples, so it's safe to surface actual output.
    actualOutput: r.actualOutput,
    note: r.passed ? undefined : r.error ? `Raised ${r.error}` : 'Output did not match.',
  }));

  const firstFailure = run.caseResults.find((r) => !r.passed);
  const summary = run.crashed
    ? 'Execution timed out — likely an infinite loop or a very slow approach.'
    : verdict === 'Accepted'
      ? `All ${run.total} tests passed.`
      : firstFailure?.error
        ? `${run.passed}/${run.total} tests passed. First error: ${firstFailure.error}.`
        : `${run.passed}/${run.total} tests passed.`;

  // Describe how the hidden suite failed WITHOUT revealing any hidden input/output.
  const hiddenIds = new Set(cases.filter((c) => c.hidden).map((c) => c.id));
  const hiddenFailures = run.caseResults.filter((r) => hiddenIds.has(r.id) && !r.passed);
  let hiddenFailureReason: string | undefined;
  if (verdict !== 'Accepted' && !run.crashed && hiddenFailures.length > 0) {
    const count = hiddenFailures.length;
    hiddenFailureReason = hiddenFailures.some((r) => r.error)
      ? `${count} hidden case${count === 1 ? '' : 's'} raised an error — likely an unhandled edge case (empty, duplicate, or boundary input).`
      : `${count} hidden case${count === 1 ? '' : 's'} returned the wrong output — check boundaries like empty, duplicate, large, or tie inputs.`;
  }

  const efficiencyScore = verdict === 'Accepted' ? 90 : Math.round((run.passed / Math.max(1, run.total)) * 60);

  return {
    verdict,
    passed: run.passed,
    total: run.total,
    caseResults,
    summary,
    hiddenFailureReason,
    efficiencyScore,
    // Real, measured runtime from Pyodide (clamped to a sane floor for display).
    estimatedRuntimeMs: Math.max(1, run.totalRuntimeMs),
  };
};
