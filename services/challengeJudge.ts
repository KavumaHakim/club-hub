import type { Challenge } from '../types';
import * as api from './apiService';
import { autoEvaluateChallenge } from './geminiService';
import { hasTestCases, runChallengeTests } from './challengeRunner';

export interface ChallengeCaseReport {
  id: string;
  label: string;
  hidden: boolean;
  passed: boolean;
  /** Only populated for visible cases — hidden inputs/outputs never reach the UI. */
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  runtimeMs: number;
}

export interface ChallengeTestReport {
  passed: number;
  total: number;
  timedOut: boolean;
  cases: ChallengeCaseReport[];
}

export interface ChallengeEvaluation {
  /** null when no verdict could be reached (e.g. AI unavailable) — the submission stays PENDING. */
  passed: boolean | null;
  feedback: string;
  weaknesses: string;
  improvements: string;
  tests?: ChallengeTestReport;
}

/** Run a challenge's test cases. `publicOnly` is the "Run Tests" dry-run before submitting. */
export const runChallengeTestReport = async (
  challenge: Challenge,
  code: string,
  publicOnly = false,
): Promise<ChallengeTestReport> => {
  const all = challenge.testCases || [];
  const cases = publicOnly ? all.filter((c) => !c.hidden) : all;
  const run = await runChallengeTests(challenge.language || 'python', code, cases);

  let visibleIndex = 0;
  let hiddenIndex = 0;
  const reports: ChallengeCaseReport[] = cases.map((c) => {
    const r = run.caseResults.find((x) => x.id === c.id);
    const base = {
      id: c.id,
      hidden: c.hidden,
      passed: !!r?.passed,
      error: r?.error,
      runtimeMs: r?.runtimeMs ?? 0,
    };
    if (c.hidden) {
      hiddenIndex += 1;
      // Keep the error type (useful signal) but never the value that could leak the input.
      return { ...base, label: `Hidden test ${hiddenIndex}`, error: r?.error ? r.error.split('(')[0].trim() : undefined };
    }
    visibleIndex += 1;
    return {
      ...base,
      label: `Test ${visibleIndex}`,
      input: c.input,
      expectedOutput: c.expectedOutput,
      actualOutput: r?.actualOutput,
    };
  });

  return { passed: run.passed, total: run.total, timedOut: run.crashed, cases: reports };
};

const describeTestReport = (report: ChallengeTestReport): Omit<ChallengeEvaluation, 'passed' | 'tests'> => {
  if (report.passed === report.total) {
    return {
      feedback: `All ${report.total} test cases passed. You have earned the badge!`,
      weaknesses: '',
      improvements: 'Try tightening your solution: handle edge cases explicitly, and keep it readable for the next person.',
    };
  }
  if (report.timedOut) {
    return {
      feedback: 'Your code ran out of time before finishing the tests. The badge remains locked for now.',
      weaknesses: '- Execution timed out — most likely an infinite loop or a very slow approach.',
      improvements: 'Check every loop has an exit condition, and avoid nested loops over large inputs where a dict or set would do.',
    };
  }
  const failed = report.cases.filter((c) => !c.passed);
  const lines = failed.map((c) => {
    if (c.error) return `- **${c.label}** raised \`${c.error}\``;
    if (c.hidden) return `- **${c.label}** returned the wrong output`;
    return `- **${c.label}** expected \`${c.expectedOutput ?? ''}\` but got \`${c.actualOutput ?? ''}\``;
  });
  const hiddenFailures = failed.filter((c) => c.hidden).length;
  return {
    feedback: `${report.passed}/${report.total} test cases passed. The badge remains locked for now.`,
    weaknesses: lines.join('\n'),
    improvements: hiddenFailures > 0
      ? 'Hidden tests check edge cases — think about empty input, duplicates, ties, very large values, and extra whitespace.'
      : 'Run the visible tests, compare your output to the expected output character by character, and fix the first mismatch.',
  };
};

/** Judge a solution: test cases when the challenge has them, otherwise AI review. */
export const evaluateChallengeSubmission = async (challenge: Challenge, code: string): Promise<ChallengeEvaluation> => {
  if (hasTestCases(challenge)) {
    const tests = await runChallengeTestReport(challenge, code);
    return { passed: tests.passed === tests.total, tests, ...describeTestReport(tests) };
  }
  return autoEvaluateChallenge(challenge.title, challenge.description, code);
};

/** The submission was saved, but judging it failed (sandbox or AI unavailable). */
export class ChallengeEvaluationError extends Error {
  constructor(public cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Evaluation failed.');
    this.name = 'ChallengeEvaluationError';
  }
}

/**
 * Record a submission, judge it, and award the badge on a pass. If judging throws,
 * the submission is left PENDING for patron review and a ChallengeEvaluationError is
 * thrown; any other error means the submission itself was not saved.
 */
export const submitChallengeSolution = async (
  challenge: Challenge,
  userId: string,
  code: string,
): Promise<ChallengeEvaluation> => {
  const submissionId = await api.submitChallenge(challenge.id, userId, code);
  let evaluation: ChallengeEvaluation;
  try {
    evaluation = await evaluateChallengeSubmission(challenge, code);
  } catch (e) {
    throw new ChallengeEvaluationError(e);
  }
  if (evaluation.passed !== null) {
    await api.reviewSubmission(
      submissionId,
      evaluation.passed ? 'APPROVED' : 'REJECTED',
      challenge.title,
      userId,
      evaluation.tests ? { passed: evaluation.tests.passed, total: evaluation.tests.total } : undefined,
    );
  }
  return evaluation;
};
