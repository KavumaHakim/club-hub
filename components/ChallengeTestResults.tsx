import React from 'react';
import type { ChallengeTestReport } from '../services/challengeJudge';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

const Block: React.FC<{ label: string; text?: string; tone?: 'error' }> = ({ label, text, tone }) => (
    <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ch-muted mb-0.5">{label}</p>
        <pre className={`text-xs font-mono whitespace-pre-wrap break-words px-2 py-1.5 max-h-32 overflow-y-auto custom-scrollbar ${tone === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'bg-ch-surface text-ch-text'}`}>
            {text === undefined || text === '' ? <span className="opacity-50">(empty)</span> : text}
        </pre>
    </div>
);

/** Per-case pass/fail list. Hidden cases show only their status, never their data. */
const ChallengeTestResults: React.FC<{ report: ChallengeTestReport }> = ({ report }) => {
    const allPassed = report.passed === report.total;
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-ch-text">Test Results</h4>
                <span className={`text-xs font-bold px-2 py-0.5 ${allPassed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {report.passed}/{report.total} passed
                </span>
            </div>
            {report.timedOut && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">Execution timed out — check for an infinite loop.</p>
            )}
            <div className="space-y-2">
                {report.cases.map(c => (
                    <details key={c.id} className="group border border-ch-divider bg-ch-bg" open={!c.passed && !c.hidden}>
                        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none text-sm">
                            {c.passed
                                ? <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                : <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            <span className="font-medium text-ch-text">{c.label}</span>
                            <span className="ml-auto text-xs text-ch-muted">{c.runtimeMs} ms</span>
                        </summary>
                        <div className="px-3 pb-3 space-y-2">
                            {c.hidden ? (
                                <p className="text-xs text-ch-muted">
                                    {c.passed ? 'Passed.' : c.error ? `Raised ${c.error}.` : 'Returned the wrong output.'} Hidden test data isn't shown.
                                </p>
                            ) : (
                                <>
                                    <Block label="Input" text={c.input} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Block label="Expected" text={c.expectedOutput} />
                                        {c.error
                                            ? <Block label="Error" text={c.error} tone="error" />
                                            : <Block label="Your output" text={c.actualOutput} />}
                                    </div>
                                </>
                            )}
                        </div>
                    </details>
                ))}
            </div>
        </div>
    );
};

export default ChallengeTestResults;
