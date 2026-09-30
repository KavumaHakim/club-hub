import React, { useState } from 'react';
import { ChallengeLanguage, ChallengeTestCase } from '../types';
import { STARTER_CODE, runChallengeReference } from '../services/challengeRunner';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { XIcon } from './icons/XIcon';
import { PlayIcon } from './icons/PlayIcon';

export interface ChallengeTestsDraft {
    language: ChallengeLanguage;
    starterCode: string;
    referenceSolution: string;
    testCases: ChallengeTestCase[];
}

export const emptyTestsDraft = (language: ChallengeLanguage = 'python'): ChallengeTestsDraft => ({
    language,
    starterCode: STARTER_CODE[language],
    referenceSolution: '',
    testCases: [],
});

/** Renumber ids and drop blank rows before saving. */
export const finalizeTestCases = (cases: ChallengeTestCase[]): ChallengeTestCase[] =>
    cases
        .filter(c => c.input.trim() !== '' || c.expectedOutput.trim() !== '')
        .map((c, i) => ({ ...c, id: `tc-${i + 1}` }));

const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white focus:ring-pink-500 font-mono text-xs";

const ChallengeTestsEditor: React.FC<{
    value: ChallengeTestsDraft;
    onChange: (next: ChallengeTestsDraft) => void;
}> = ({ value, onChange }) => {
    const [isComputing, setIsComputing] = useState(false);
    const [status, setStatus] = useState<{ tone: 'ok' | 'warn', text: string } | null>(null);

    const update = (patch: Partial<ChallengeTestsDraft>) => onChange({ ...value, ...patch });

    const updateCase = (index: number, patch: Partial<ChallengeTestCase>) =>
        update({ testCases: value.testCases.map((c, i) => i === index ? { ...c, ...patch } : c) });

    const addCase = () => update({
        testCases: [...value.testCases, {
            id: `tc-${value.testCases.length + 1}`,
            input: '',
            expectedOutput: '',
            // The first couple of cases act as visible samples; the rest guard edge cases.
            hidden: value.testCases.length >= 2,
        }],
    });

    const removeCase = (index: number) => update({ testCases: value.testCases.filter((_, i) => i !== index) });

    const switchLanguage = (language: ChallengeLanguage) => {
        if (language === value.language) return;
        const untouched = value.starterCode.trim() === '' || value.starterCode === STARTER_CODE[value.language];
        update({ language, starterCode: untouched ? STARTER_CODE[language] : value.starterCode });
    };

    const computeExpected = async () => {
        if (!value.referenceSolution.trim() || value.testCases.length === 0) return;
        setIsComputing(true);
        setStatus(null);
        try {
            const outputs = await runChallengeReference(value.language, value.referenceSolution, value.testCases.map(c => c.input));
            const failed = outputs.filter(o => o === null).length;
            update({ testCases: value.testCases.map((c, i) => outputs[i] !== null ? { ...c, expectedOutput: outputs[i] as string } : c) });
            setStatus(failed === 0
                ? { tone: 'ok', text: `Expected outputs computed for all ${outputs.length} cases.` }
                : { tone: 'warn', text: `The reference solution raised an error on ${failed} case${failed === 1 ? '' : 's'} — those were left unchanged.` });
        } catch (e: any) {
            setStatus({ tone: 'warn', text: e?.message || 'Could not run the reference solution.' });
        } finally {
            setIsComputing(false);
        }
    };

    const visibleCount = value.testCases.filter(c => !c.hidden).length;

    return (
        <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-600 dark:text-gray-400">
                Members write <code className="font-mono text-pink-600 dark:text-pink-400">solve(input_text)</code>, which receives each test's input as one string and must <strong>return</strong> the output as a string. A submission earns the badge only if every test passes.
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                    <select
                        value={value.language}
                        onChange={e => switchLanguage(e.target.value as ChallengeLanguage)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Starter code</label>
                <textarea value={value.starterCode} onChange={e => update({ starterCode: e.target.value })} rows={4} spellCheck={false} className={inputClass} />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference solution <span className="text-gray-400 font-normal">(optional, never shown to members)</span>
                </label>
                <textarea
                    value={value.referenceSolution}
                    onChange={e => update({ referenceSolution: e.target.value })}
                    rows={4}
                    spellCheck={false}
                    className={inputClass}
                    placeholder="A correct solve() — use it to fill in expected outputs automatically."
                />
                <button
                    type="button"
                    onClick={computeExpected}
                    disabled={isComputing || !value.referenceSolution.trim() || value.testCases.length === 0}
                    className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    {isComputing
                        ? <span className="animate-spin h-3 w-3 border-2 border-purple-300 border-t-purple-700 rounded-full"></span>
                        : <PlayIcon className="w-3.5 h-3.5" />}
                    Compute expected outputs
                </button>
                {status && (
                    <p className={`mt-1.5 text-xs ${status.tone === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>{status.text}</p>
                )}
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Test cases ({value.testCases.length})</label>
                    <button type="button" onClick={addCase} className="text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1">
                        <PlusCircleIcon className="w-4 h-4" /> Add test case
                    </button>
                </div>

                {value.testCases.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        No test cases yet — add at least one.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {value.testCases.map((tc, i) => (
                            <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Case {i + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                            <input type="checkbox" checked={tc.hidden} onChange={e => updateCase(i, { hidden: e.target.checked })} className="rounded text-pink-600 focus:ring-pink-500" />
                                            Hidden
                                        </label>
                                        <button type="button" onClick={() => removeCase(i)} className="text-gray-400 hover:text-red-500" title="Remove test case">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <textarea value={tc.input} onChange={e => updateCase(i, { input: e.target.value })} rows={3} spellCheck={false} className={inputClass} placeholder="Input" />
                                    <textarea value={tc.expectedOutput} onChange={e => updateCase(i, { expectedOutput: e.target.value })} rows={3} spellCheck={false} className={inputClass} placeholder="Expected output" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {value.testCases.length > 0 && visibleCount === 0 && (
                    <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">Every case is hidden — consider leaving one visible so members can see the input format.</p>
                )}
            </div>
        </div>
    );
};

export default ChallengeTestsEditor;
