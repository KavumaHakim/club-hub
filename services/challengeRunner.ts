import type { ChallengeLanguage, ChallengeTestCase } from '../types';
import { runSandboxedJavaScript } from './sandboxRunner';
import { runDuelTests, runReference, type DuelRunResult } from './duelRunner';

// Deterministic test-case judging for Challenges.
//
// Same contract as the Code Duel arena: the member defines `solve(input_text)`
// returning a string, it is called once per case, and the result is compared to
// the expected output with trailing whitespace ignored. Python reuses the duel
// Pyodide harness as-is; JavaScript gets an equivalent harness run in a fresh
// worker (terminated after every run, so infinite loops can't leak).

export type ChallengeRunResult = DuelRunResult;

const SENTINEL = '__CHALLENGE_RESULT__';
const DEFAULT_TIMEOUT_MS = 15000;

export const STARTER_CODE: Record<ChallengeLanguage, string> = {
  python: 'def solve(input_text: str) -> str:\n    # input_text is the raw test input; return your answer as a string\n    return ""\n',
  javascript: 'function solve(inputText) {\n  // inputText is the raw test input; return your answer as a string\n  return "";\n}\n',
};

// The member's source is embedded as a JSON string literal and compiled into its
// own Function scope, so nothing it declares leaks into the harness. `console` is
// passed through so their debug logging still reaches the output stream.
const buildJsHarness = (code: string, cases: { id: string; input: string; expected: string }[]): string => `
const __src = ${JSON.stringify(code)};
const __cases = ${JSON.stringify(cases)};
const __emit = (results) => console.log(${JSON.stringify(SENTINEL)} + JSON.stringify(results));
let __solve;
try {
  __solve = new Function('console', __src + '\\n;return typeof solve === "function" ? solve : undefined;')(console);
} catch (e) {
  __emit(__cases.map((c) => ({ id: c.id, passed: false, error: 'Definition error: ' + String(e), ms: 0 })));
  return;
}
if (typeof __solve !== 'function') {
  __emit(__cases.map((c) => ({ id: c.id, passed: false, error: 'No solve(inputText) function was defined.', ms: 0 })));
  return;
}
const __results = [];
for (const c of __cases) {
  const t0 = performance.now();
  try {
    const out = String(await __solve(c.input));
    __results.push({ id: c.id, passed: out.trimEnd() === String(c.expected).trimEnd(), actual: out, ms: performance.now() - t0 });
  } catch (e) {
    __results.push({ id: c.id, passed: false, error: String(e), ms: performance.now() - t0 });
  }
}
__emit(__results);
`;

const runJsHarness = (
  code: string,
  cases: { id: string; input: string; expected: string }[],
  timeoutMs: number,
): Promise<{ parsed: any[] | null; timedOut: boolean }> =>
  new Promise((resolve) => {
    const lines: string[] = [];
    let timedOut = false;
    const controller = runSandboxedJavaScript({
      code: buildJsHarness(code, cases),
      timeoutMs,
      onOutput: (line) => {
        lines.push(line.content);
        if (line.type === 'error' && line.content.includes('Execution stopped after')) timedOut = true;
      },
    });
    controller.finished.then(() => {
      const raw = lines.find((l) => l.startsWith(SENTINEL));
      if (!raw) {
        resolve({ parsed: null, timedOut });
        return;
      }
      try {
        resolve({ parsed: JSON.parse(raw.slice(SENTINEL.length)), timedOut });
      } catch {
        resolve({ parsed: [], timedOut });
      }
    });
  });

const runJsTests = async (code: string, cases: ChallengeTestCase[], timeoutMs: number): Promise<ChallengeRunResult> => {
  const { parsed, timedOut } = await runJsHarness(
    code,
    cases.map((c) => ({ id: c.id, input: c.input, expected: c.expectedOutput })),
    timeoutMs,
  );
  if (!parsed) {
    if (timedOut) {
      return {
        caseResults: cases.map((c) => ({ id: c.id, passed: false, runtimeMs: 0 })),
        passed: 0,
        total: cases.length,
        totalRuntimeMs: 0,
        hadError: true,
        crashed: true,
      };
    }
    throw new Error('The JavaScript sandbox could not run your code.');
  }
  const caseResults = cases.map((c) => {
    const r = parsed.find((x) => x?.id === c.id);
    return {
      id: c.id,
      passed: !!r?.passed,
      actualOutput: typeof r?.actual === 'string' ? r.actual : undefined,
      error: typeof r?.error === 'string' ? r.error : undefined,
      runtimeMs: Math.round(Number(r?.ms) || 0),
    };
  });
  return {
    caseResults,
    passed: caseResults.filter((r) => r.passed).length,
    total: cases.length,
    totalRuntimeMs: caseResults.reduce((s, r) => s + r.runtimeMs, 0),
    hadError: caseResults.some((r) => r.error),
    crashed: false,
  };
};

/** Run a member's solve() against the given cases. Throws only if the sandbox itself failed to start. */
export const runChallengeTests = (
  language: ChallengeLanguage,
  code: string,
  cases: ChallengeTestCase[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ChallengeRunResult> =>
  language === 'javascript' ? runJsTests(code, cases, timeoutMs) : runDuelTests(code, cases, timeoutMs);

/**
 * Run a reference solution over raw inputs and return each produced output (null where
 * the reference raised). Lets patrons and the AI generator author only inputs while the
 * expected outputs are always computed, never guessed.
 */
export const runChallengeReference = async (
  language: ChallengeLanguage,
  code: string,
  inputs: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<(string | null)[]> => {
  if (language === 'python') return runReference(code, inputs, timeoutMs);
  const cases = inputs.map((input, i) => ({ id: `ref-${i + 1}`, input, expected: '' }));
  const { parsed, timedOut } = await runJsHarness(code, cases, timeoutMs);
  if (!parsed) {
    if (timedOut) return inputs.map(() => null);
    throw new Error('The JavaScript sandbox could not run the reference solution.');
  }
  return cases.map((c) => {
    const r = parsed.find((x) => x?.id === c.id);
    return r && r.error == null && typeof r.actual === 'string' ? r.actual : null;
  });
};

export const hasTestCases = (challenge: { testCases?: ChallengeTestCase[] } | null | undefined): boolean =>
  !!challenge?.testCases && challenge.testCases.length > 0;
