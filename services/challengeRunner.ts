import type { ChallengeIoStyle, ChallengeLanguage, ChallengeTestCase } from '../types';
import { runSandboxedJavaScript } from './sandboxRunner';
import { runDuelTests, runReference, type DuelRunResult, type RunMode } from './duelRunner';

// Deterministic test-case judging for Challenges. Two ways to answer, picked from
// the code itself (detectRunMode):
//
// - function: the member defines `solve(input_text)` returning a string; it is
//   called once per case and the result is compared to the expected output with
//   trailing whitespace ignored (the Code Duel contract).
// - program: ordinary code that reads the input (input(), readline()) and prints
//   the answer. The whole file runs once per case and what it printed is compared
//   line by line, trailing spaces and blank lines at the end ignored.
//
// Python reuses the duel Pyodide harness; JavaScript gets an equivalent harness run
// in a fresh worker (terminated after every run, so infinite loops can't leak).

export type { RunMode };

/**
 * `function` when the code defines solve() taking an argument and never calls it at
 * the top level itself; anything else is a program. So `def solve(n): ...` followed
 * by `print(solve(int(input())))` runs as a program, as its author meant.
 */
export const detectRunMode = (language: ChallengeLanguage, code: string): RunMode => {
  if (language === 'python') {
    const defined = /^(?:async\s+)?def\s+solve\s*\(\s*[A-Za-z_*]/m.test(code);
    const calledAtTop = /^(?!(?:async\s+)?def\b|class\b|[\s#@])[^\n]*\bsolve\s*\(/m.test(code);
    return defined && !calledAtTop ? 'function' : 'program';
  }
  const defined =
    /^(?:async\s+)?function\s*\*?\s*solve\s*\(\s*[A-Za-z_$[{.]/m.test(code) ||
    /^(?:const|let|var)\s+solve\s*=\s*(?:async\s*)?(?:function\b[^(]*\(\s*[A-Za-z_$[{.]|\(\s*[A-Za-z_$[{.]|[A-Za-z_$][\w$]*\s*=>)/m.test(code);
  const calledAtTop = /^(?!(?:async\s+)?function\b|(?:const|let|var)\s+solve\b|[\s/*}])[^\n]*\bsolve\s*\(/m.test(code);
  return defined && !calledAtTop ? 'function' : 'program';
};

/** What a program printed vs what was expected: trailing spaces on each line and blank lines at the end don't count. */
export const normalizeProgramOutput = (text: string): string =>
  String(text).replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').replace(/\n+$/, '');

export type ChallengeRunResult = DuelRunResult;

const SENTINEL = '__CHALLENGE_RESULT__';
const DEFAULT_TIMEOUT_MS = 15000;

export const STARTER_CODE: Record<ChallengeLanguage, string> = {
  python: 'def solve(input_text: str) -> str:\n    # input_text is the raw test input; return your answer as a string\n    return ""\n',
  javascript: 'function solve(inputText) {\n  // inputText is the raw test input; return your answer as a string\n  return "";\n}\n',
};

/** Starter code for print-style ("program") challenges. */
export const PROGRAM_STARTER_CODE: Record<ChallengeLanguage, string> = {
  python: '# Read the input with input(), one line per call, and print the answer.\nline = input()\n\nprint(line)\n',
  javascript: '// Read the input with readline(), one line per call, and print the answer with console.log.\nconst line = readline();\n\nconsole.log(line);\n',
};

export const starterFor = (language: ChallengeLanguage, ioStyle: ChallengeIoStyle = 'function'): string =>
  (ioStyle === 'stdio' ? PROGRAM_STARTER_CODE : STARTER_CODE)[language];

// The member's source is embedded as a JSON string literal and compiled into its
// own Function scope, so nothing it declares leaks into the harness. `console` is
// passed through so their debug logging still reaches the output stream.
const buildJsHarness = (code: string, cases: { id: string; input: string; expected: string }[], mode: RunMode): string =>
  mode === 'program' ? buildJsProgramHarness(code, cases) : `
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

// Program mode for JavaScript. The program gets its own console (log/info/debug and
// process.stdout.write are the output; warn/error are not judged) and these ways to
// read the test input, one line per call:
//   readline() / prompt()  -> the next line, or null when there are no more
//   input()                -> the next line; throws when there are no more
//   require('fs').readFileSync(0, 'utf8') -> the whole input
// Values are printed the way Node prints them: [ 1, 2, 3 ], { a: 1 }.
const buildJsProgramHarness = (code: string, cases: { id: string; input: string; expected: string }[]): string => `
const __src = ${JSON.stringify(code)};
const __cases = ${JSON.stringify(cases)};
const __emit = (results) => console.log(${JSON.stringify(SENTINEL)} + JSON.stringify(results));
const __norm = (t) => String(t).replace(/\\r\\n/g, '\\n').split('\\n').map((l) => l.trimEnd()).join('\\n').replace(/\\n+$/, '');
const __show = (v, depth = 0) => {
  if (typeof v === 'string') return depth ? "'" + v + "'" : v;
  if (v === null || v === undefined || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'bigint') return v + 'n';
  if (typeof v === 'function') return '[Function: ' + (v.name || 'anonymous') + ']';
  if (depth > 2) return Array.isArray(v) ? '[Array]' : '[Object]';
  if (Array.isArray(v)) return v.length ? '[ ' + v.map((x) => __show(x, depth + 1)).join(', ') + ' ]' : '[]';
  if (v instanceof Map) return 'Map(' + v.size + ') ' + (v.size ? '{ ' + [...v].map(([k, x]) => __show(k, depth + 1) + ' => ' + __show(x, depth + 1)).join(', ') + ' }' : '{}');
  if (v instanceof Set) return 'Set(' + v.size + ') ' + (v.size ? '{ ' + [...v].map((x) => __show(x, depth + 1)).join(', ') + ' }' : '{}');
  const entries = Object.entries(v);
  return entries.length ? '{ ' + entries.map(([k, x]) => k + ': ' + __show(x, depth + 1)).join(', ') + ' }' : '{}';
};
const __AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let __program;
try {
  __program = new __AsyncFunction('console', 'readline', 'prompt', 'input', 'require', 'process', __src);
} catch (e) {
  __emit(__cases.map((c) => ({ id: c.id, passed: false, error: String(e), ms: 0 })));
  return;
}
const __results = [];
for (const c of __cases) {
  const text = String(c.input).replace(/\\r\\n/g, '\\n');
  const lines = text.split('\\n'); // every newline separates two lines, so a last line can be empty
  let next = 0;
  let out = '';
  const say = (...args) => { out += args.map((a) => __show(a)).join(' ') + '\\n'; };
  const quiet = () => {};
  const con = { log: say, info: say, debug: say, warn: quiet, error: quiet, table: say };
  const readline = () => (next < lines.length ? lines[next++] : null);
  const input = () => {
    if (next >= lines.length) throw new Error('EOF: the program asked for more input than this test has');
    return lines[next++];
  };
  const require = (name) => {
    if (name === 'fs' || name === 'node:fs') return { readFileSync: () => text };
    throw new Error("require('" + name + "') isn't available here");
  };
  const proc = { stdout: { write: (s) => { out += String(s); return true; } }, argv: [], env: {} };
  const t0 = performance.now();
  try {
    await __program(con, readline, readline, input, require, proc);
    __results.push({ id: c.id, passed: __norm(out) === __norm(c.expected), actual: out, ms: performance.now() - t0 });
  } catch (e) {
    __results.push({ id: c.id, passed: false, error: String(e), actual: out, ms: performance.now() - t0 });
  }
}
__emit(__results);
`;

const runJsHarness = (
  code: string,
  cases: { id: string; input: string; expected: string }[],
  timeoutMs: number,
  mode: RunMode,
): Promise<{ parsed: any[] | null; timedOut: boolean }> =>
  new Promise((resolve) => {
    const lines: string[] = [];
    let timedOut = false;
    const controller = runSandboxedJavaScript({
      code: buildJsHarness(code, cases, mode),
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

const runJsTests = async (code: string, cases: ChallengeTestCase[], timeoutMs: number, mode: RunMode): Promise<ChallengeRunResult> => {
  const { parsed, timedOut } = await runJsHarness(
    code,
    cases.map((c) => ({ id: c.id, input: c.input, expected: c.expectedOutput })),
    timeoutMs,
    mode,
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

/** Run a member's code (solve() or a whole program) against the given cases. Throws only if the sandbox itself failed to start. */
export const runChallengeTests = (
  language: ChallengeLanguage,
  code: string,
  cases: ChallengeTestCase[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ChallengeRunResult> => {
  const mode = detectRunMode(language, code);
  return language === 'javascript' ? runJsTests(code, cases, timeoutMs, mode) : runDuelTests(code, cases, timeoutMs, mode);
};

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
  const mode = detectRunMode(language, code);
  // A program's output is stored the way it's compared: no trailing spaces or final newline.
  const tidy = (outputs: (string | null)[]) =>
    mode === 'program' ? outputs.map((o) => (o === null ? null : normalizeProgramOutput(o))) : outputs;
  if (language === 'python') return tidy(await runReference(code, inputs, timeoutMs, mode));
  const cases = inputs.map((input, i) => ({ id: `ref-${i + 1}`, input, expected: '' }));
  const { parsed, timedOut } = await runJsHarness(code, cases, timeoutMs, mode);
  if (!parsed) {
    if (timedOut) return inputs.map(() => null);
    throw new Error('The JavaScript sandbox could not run the reference solution.');
  }
  return tidy(cases.map((c) => {
    const r = parsed.find((x) => x?.id === c.id);
    return r && r.error == null && typeof r.actual === 'string' ? r.actual : null;
  }));
};

export const hasTestCases = (challenge: { testCases?: ChallengeTestCase[] } | null | undefined): boolean =>
  !!challenge?.testCases && challenge.testCases.length > 0;
