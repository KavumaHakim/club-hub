import React, { useState, useMemo, useEffect } from 'react';
import { User, Challenge, ChallengeSubmission, SubmissionStatus, ChallengeLanguage, ChallengeTestCase } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { analyzeChallengeSubmission, generateAIChallenge } from '../services/geminiService';
import type { ChallengeTestReport } from '../services/challengeJudge';
import { OPEN_CHALLENGE_EVENT, OPEN_CHALLENGE_KEY } from '../lib/challengeNav';
import { hasTestCases, runChallengeReference } from '../services/challengeRunner';
import ChallengeTestsEditor, { ChallengeTestsDraft, emptyTestsDraft, finalizeTestCases } from './ChallengeTestsEditor';
import ChallengeTestResults from './ChallengeTestResults';
import ChallengeWorkspace from './ChallengeWorkspace';
import { CodeIcon } from './icons/CodeIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { BadgeCheckIcon } from './icons/BadgeCheckIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { PlayIcon } from './icons/PlayIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { CodeRunnerModal } from './CodeRunnerModal';
import { FormattedMessage } from './FormattedMessage';
import Tooltip from './Tooltip';
import InitialsTile, { TILE_COLORS } from './InitialsTile';
import { PageIntro, RuledTabs, EmptyState, EYEBROW, BTN_PRIMARY, BTN_SECONDARY } from './SplitKit';

interface ChallengesProps {
    currentUser: User;
    theme: 'light' | 'dark';
}

const DifficultyBadge: React.FC<{ difficulty?: string }> = ({ difficulty }) => {
    if (!difficulty) return null;
    let color = "bg-ch-surface text-ch-muted";
    if (difficulty === 'BEGINNER') color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (difficulty === 'INTERMEDIATE') color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (difficulty === 'ADVANCED') color = "bg-ch-accent-soft text-ch-violet";

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide ${color}`}>
            {difficulty}
        </span>
    );
};

const Leaderboard: React.FC<{ users: User[] }> = ({ users }) => {
    const rankedUsers = useMemo(() => {
        return [...users]
            .sort((a, b) => (b.badges?.length || 0) - (a.badges?.length || 0))
            .slice(0, 10);
    }, [users]);

    if (rankedUsers.length === 0) return null;

    const topThree = rankedUsers.slice(0, 3);
    const runnersUp = rankedUsers.slice(3);
    const badgeLabel = (user: User) => `${user.badges?.length || 0} badge${user.badges?.length === 1 ? '' : 's'}`;

    return (
        <section className="mb-10 border-2 border-ch-rule">
            <div className="flex items-baseline justify-between border-b-2 border-ch-rule px-5 py-3">
                <span className={EYEBROW}>Hall of Fame</span>
                <span className="text-[11px] text-ch-muted">Top badge earners</span>
            </div>

            {/* Podium — the leader takes the accent field. */}
            <div className="grid grid-cols-1 sm:grid-cols-3">
                {topThree.map((user, index) => (
                    <div
                        key={user.uid}
                        className={`flex items-end gap-4 px-5 py-5 ${index > 0 ? 'border-t-2 border-ch-rule sm:border-l-2 sm:border-t-0' : ''} ${index === 0 ? 'bg-ch-accent text-ch-on-accent' : ''}`}
                    >
                        <span className="text-[64px] font-extrabold leading-[0.82] tracking-[-0.05em]">{index + 1}</span>
                        <div className="min-w-0 pb-1">
                            <p className="truncate text-[15px] font-extrabold leading-tight">{user.name}</p>
                            <p className={`mt-0.5 text-[11.5px] font-semibold ${index === 0 ? 'opacity-80' : 'text-ch-muted'}`}>{badgeLabel(user)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {runnersUp.length > 0 && (
                <div className="grid grid-cols-1 gap-x-8 border-t-2 border-ch-rule px-5 py-2 sm:grid-cols-2">
                    {runnersUp.map((user, index) => (
                        <div key={user.uid} className="flex items-center gap-3 border-b border-ch-divider py-2 last:border-b-0">
                            <span className="w-5 text-[12px] font-extrabold text-ch-muted">{index + 4}</span>
                            <InitialsTile name={user.name} size={26} color={TILE_COLORS[(index + 3) % TILE_COLORS.length]} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold">{user.name}</p>
                                <p className="truncate text-[11px] text-ch-muted">@{user.username}</p>
                            </div>
                            <span className="text-[12px] font-extrabold text-ch-muted">{user.badges?.length || 0}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

const ChallengeCard: React.FC<{
    challenge: Challenge;
    currentUser: User;
    onOpenReview: (id: string, title: string) => void;
    onEditTests: (challenge: Challenge) => void;
    onSolve: (challenge: Challenge) => void;
}> = ({ challenge, currentUser, onOpenReview, onEditTests, onSolve }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isPatron = currentUser.role === 'PATRON';
    const hasBadge = currentUser.badges?.includes(challenge.title);
    const today = new Date();
    const deadline = new Date(challenge.deadline);
    const isExpired = deadline < today;

    const timeDiff = deadline.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let statusColor = "bg-ch-surface text-ch-muted";
    let statusText = "Closed";

    if (hasBadge) {
        statusColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        statusText = "Completed";
    } else if (isExpired) {
        statusColor = "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
        statusText = "Expired";
    } else if (challenge.status === 'ACTIVE') {
        if (daysLeft <= 3) {
            statusColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
            statusText = `${daysLeft} Day${daysLeft !== 1 ? 's' : ''} Left`;
        } else {
            statusColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
            statusText = "Active";
        }
    }

    return (
        <div className={`group relative bg-ch-bg p-6 border border-ch-divider transition-all duration-300 flex flex-col ${isExpanded ? 'h-full z-10' : 'h-fit'} ${hasBadge ? 'ring-1 ring-green-500/20' : ''}`}>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wide self-start ${statusColor}`}>
                            {statusText}
                        </span>
                        <DifficultyBadge difficulty={challenge.difficulty} />
                        {hasTestCases(challenge) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide self-start bg-ch-accent-soft text-ch-accent flex items-center gap-1">
                                <CodeIcon className="w-3 h-3" />
                                {challenge.testCases?.length} tests · {challenge.language === 'javascript' ? 'JS' : 'Python'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {hasBadge && <div className="bg-green-100 dark:bg-green-900/30 p-1.5 text-green-600 dark:text-green-400"><BadgeCheckIcon className="w-5 h-5" /></div>}
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 bg-ch-surface text-ch-muted hover:text-ch-accent hover:bg-ch-accent-soft transition-all border border-ch-divider"
                            title={isExpanded ? "Show Less" : "Show More"}
                        >
                            {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <h4 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text mb-2 group-hover:text-ch-accent transition-colors">
                    {challenge.title}
                </h4>

                <div className={`mb-4 transition-all duration-300 ${!isExpanded ? 'line-clamp-2 overflow-hidden' : ''}`}>
                    {isExpanded ? (
                        <FormattedMessage text={challenge.description} isUser={false} />
                    ) : (
                        <p className="text-sm text-ch-muted">
                            {challenge.description.length > 120 ? challenge.description.substring(0, 120) + '...' : challenge.description}
                        </p>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="pt-4 border-t border-ch-divider mt-auto animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center text-xs text-ch-muted">
                            <CalendarIcon />
                            <span className="ml-1.5">Due {deadline.toLocaleDateString()}</span>
                        </div>
                    </div>

                    {isPatron ? (
                        <div className="space-y-2">
                            <Tooltip className="flex w-full" text="Review member submissions and approve badges.">
                                <button
                                    onClick={() => onOpenReview(challenge.id, challenge.title)}
                                    className="w-full py-2.5 text-sm font-semibold bg-ch-accent-soft text-ch-violet hover:bg-ch-accent-soft transition-colors flex items-center justify-center gap-2"
                                >
                                    Review Submissions
                                </button>
                            </Tooltip>
                            <button
                                onClick={() => onSolve(challenge)}
                                className="w-full py-2.5 text-sm font-semibold border-2 border-ch-rule text-ch-text hover:bg-ch-surface transition-colors flex items-center justify-center gap-2"
                            >
                                <CodeIcon className="w-4 h-4" /> Open workspace
                            </button>
                            <Tooltip className="flex w-full" text="Auto-grade submissions by running them against test cases.">
                                <button
                                    onClick={() => onEditTests(challenge)}
                                    className="w-full py-2.5 text-sm font-semibold bg-ch-surface text-ch-text hover:bg-ch-surface transition-colors flex items-center justify-center gap-2"
                                >
                                    <CodeIcon className="w-4 h-4" />
                                    {hasTestCases(challenge) ? 'Edit Test Cases' : 'Add Test Cases'}
                                </button>
                            </Tooltip>
                        </div>
                    ) : (
                        <Tooltip className="flex w-full" text={!hasBadge && challenge.status === 'ACTIVE' && !isExpired ? 'Open the editor and judge to solve this challenge.' : 'Open it to practise — submissions are closed.'}>
                            <button
                                onClick={() => onSolve(challenge)}
                                className={`w-full py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                                    !hasBadge && challenge.status === 'ACTIVE' && !isExpired
                                        ? 'bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep'
                                        : 'border-2 border-ch-rule text-ch-text hover:bg-ch-surface'
                                }`}
                            >
                                <CodeIcon className="w-4 h-4" />
                                {hasBadge ? 'Practise again' : challenge.status === 'ACTIVE' && !isExpired ? 'Solve challenge' : 'Practise'}
                            </button>
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    );
};

type ChallengePrefill = { title: string, description: string, difficulty: any, tests?: ChallengeTestsDraft };

const CreateChallengeModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSubmit: (title: string, desc: string, date: string, diff: any, tests: ChallengeTestsDraft | null) => Promise<void>,
    prefill?: ChallengePrefill | null
}> = ({ isOpen, onClose, onSubmit, prefill }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
    const [useTests, setUseTests] = useState(false);
    const [tests, setTests] = useState<ChallengeTestsDraft>(emptyTestsDraft());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(prefill?.title || '');
        setDescription(prefill?.description || '');
        setDifficulty((prefill?.difficulty as any) || 'BEGINNER');
        setDeadline('');
        setUseTests(!!prefill?.tests?.testCases.length);
        setTests(prefill?.tests || emptyTestsDraft());
    }, [isOpen, prefill]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !deadline) return;
        setIsSubmitting(true);
        await onSubmit(title, description, deadline, difficulty, useTests ? tests : null);
        setIsSubmitting(false);
        onClose();
        setTitle('');
        setDescription('');
        setDeadline('');
        setDifficulty('BEGINNER');
        setUseTests(false);
        setTests(emptyTestsDraft());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className={`bg-ch-bg w-full p-6 relative border border-ch-divider max-h-[90vh] overflow-y-auto custom-scrollbar ${useTests ? 'max-w-2xl' : 'max-w-md'}`}>
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text"><XIcon /></button>
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-4">Post New Challenge</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ch-text mb-1">Challenge Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent" placeholder="e.g., Python Sorting Algorithm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ch-text mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent" placeholder="Explain the task..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-ch-text mb-1">Difficulty</label>
                            <select
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value as any)}
                                className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent"
                            >
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ch-text mb-1">Deadline</label>
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent" />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-ch-text cursor-pointer">
                        <input type="checkbox" checked={useTests} onChange={e => setUseTests(e.target.checked)} className="text-ch-accent focus:ring-ch-accent" />
                        Auto-grade with code test cases
                    </label>
                    {useTests && <ChallengeTestsEditor value={tests} onChange={setTests} />}
                    <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-ch-accent text-ch-on-accent font-medium hover:bg-ch-accent-deep disabled:opacity-50">{isSubmitting ? 'Posting...' : 'Create Challenge'}</button>
                </form>
            </div>
        </div>
    );
};

// Expected outputs come from actually running the AI's reference solution, so a
// generated case can never mark a correct member solution wrong. Returns null if
// the reference couldn't produce at least two usable cases.
const buildGeneratedTests = async (
    language: ChallengeLanguage,
    generated: { starterCode?: string, referenceSolution?: string, inputs?: string[] }
): Promise<ChallengeTestsDraft | null> => {
    const inputs = generated.inputs || [];
    if (!generated.referenceSolution || inputs.length < 2) return null;
    let outputs: (string | null)[];
    try {
        outputs = await runChallengeReference(language, generated.referenceSolution, inputs);
    } catch (e) {
        console.warn('Could not run generated reference solution:', e);
        return null;
    }
    const testCases: ChallengeTestCase[] = [];
    inputs.forEach((input, i) => {
        if (outputs[i] === null) return;
        testCases.push({ id: `tc-${testCases.length + 1}`, input, expectedOutput: outputs[i] as string, hidden: testCases.length >= 2 });
    });
    if (testCases.length < 2) return null;
    return {
        ...emptyTestsDraft(language),
        starterCode: generated.starterCode || emptyTestsDraft(language).starterCode,
        referenceSolution: generated.referenceSolution,
        testCases,
    };
};

const GenerateAIChallengeModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onGenerated: (prefill: ChallengePrefill) => void
}> = ({ isOpen, onClose, onGenerated }) => {
    const [concepts, setConcepts] = useState('');
    const [skillLevel, setSkillLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
    const [language, setLanguage] = useState('Python');
    const [isGenerating, setIsGenerating] = useState(false);
    const { showAlert } = useData();

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!concepts) return;
        setIsGenerating(true);
        try {
            const result = await generateAIChallenge(skillLevel, concepts, language);
            const tests = await buildGeneratedTests(language === 'JavaScript' ? 'javascript' : 'python', result);
            onGenerated({ title: result.title, description: result.description, difficulty: skillLevel, tests: tests || undefined });
            setConcepts('');
            onClose();
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Generation Failed',
                message: 'Failed to generate challenge. Please try again.',
                type: 'error'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-md w-full p-8 relative border-2 border-ch-rule">
                <button onClick={onClose} className="absolute top-6 right-6 text-ch-muted hover:text-ch-text p-1 hover:bg-ch-surface transition-colors"><XIcon /></button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-ch-accent-soft">
                        <SparklesIcon className="w-6 h-6 text-ch-accent" />
                    </div>
                    <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text">AI Challenge <span className="text-ch-accent">Generator</span></h3>
                </div>

                <form onSubmit={handleGenerate} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-ch-text mb-1.5">Concepts to include</label>
                        <textarea
                            value={concepts}
                            onChange={e => setConcepts(e.target.value)}
                            required
                            rows={3}
                            className="w-full px-4 py-3 border border-ch-divider focus:ring-2 focus:ring-ch-accent transition-all outline-none"
                            placeholder="e.g. For loops, lists, string manipulation..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-ch-text mb-1.5">Skill Level</label>
                            <select
                                value={skillLevel}
                                onChange={e => setSkillLevel(e.target.value as any)}
                                className="w-full px-4 py-3 border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none"
                            >
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-ch-text mb-1.5">Language</label>
                            <select
                                value={language}
                                onChange={e => setLanguage(e.target.value)}
                                className="w-full px-4 py-3 border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none"
                            >
                                <option value="Python">Python</option>
                                <option value="JavaScript">JavaScript</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full py-4 text-ch-on-accent font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all bg-ch-accent hover:bg-ch-accent-deep"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                Crafting Challenge...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                Generate Challenge
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const EditTestsModal: React.FC<{
    challenge: Challenge | null,
    onClose: () => void,
    onSave: (challenge: Challenge, tests: ChallengeTestsDraft) => Promise<void>
}> = ({ challenge, onClose, onSave }) => {
    const [tests, setTests] = useState<ChallengeTestsDraft>(emptyTestsDraft());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!challenge) return;
        const language = challenge.language || 'python';
        setTests({
            ...emptyTestsDraft(language),
            starterCode: challenge.starterCode || emptyTestsDraft(language).starterCode,
            testCases: challenge.testCases || [],
        });
    }, [challenge]);

    if (!challenge) return null;

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(challenge, tests);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-2xl w-full p-6 relative border-2 border-ch-rule max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text"><XIcon /></button>
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-1">Test Cases</h3>
                <p className="text-sm text-ch-muted mb-4">{challenge.title}</p>
                <ChallengeTestsEditor value={tests} onChange={setTests} />
                <p className="mt-4 text-xs text-ch-muted">
                    Removing every test case switches this challenge back to AI review. Existing submissions keep their verdicts.
                </p>
                <button onClick={handleSave} disabled={isSaving} className="mt-3 w-full py-2 bg-ch-accent text-ch-on-accent font-medium hover:bg-ch-accent-deep disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Test Cases'}
                </button>
            </div>
        </div>
    );
};

const AnalysisModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    content: string,
    weaknesses?: string,
    improvements?: string,
    passed?: boolean | null,
    isLoading: boolean,
    title?: string,
    subtitle?: string,
    challengeTitle?: string,
    tests?: ChallengeTestReport
}> = ({ isOpen, onClose, content, weaknesses, improvements, passed, isLoading, title = 'AI Evaluation', subtitle = 'Powered by Gemini', challengeTitle, tests }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-2xl w-full p-6 relative border-2 border-ch-rule flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text hover:border-2 border-ch-rule transition-colors"><XIcon /></button>

                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 ${passed ? 'bg-green-100 dark:bg-green-900/30' : passed === false ? 'bg-red-100 dark:bg-red-900/30' : 'bg-ch-accent-soft'}`}>
                        {passed ? (
                            <TrophyIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                        ) : passed === false ? (
                            <ExclamationCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                        ) : (
                            <SparklesIcon className="w-8 h-8 text-ch-accent" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">
                            {title}
                        </h3>
                        <p className="text-xs text-ch-muted">{passed ? 'Challenge Passed!' : passed === false ? 'Challenge Not Yet Passed' : subtitle}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="animate-spin h-12 w-12 border-2 border-ch-divider border-t-ch-accent"></div>
                            <p className="text-ch-muted animate-pulse font-medium">Analyzing submission...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-ch-surface p-4 border border-ch-divider">
                                <h4 className="text-sm font-bold text-ch-text mb-2 flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 text-ch-accent" />
                                    Verdict & Feedback
                                </h4>
                                <FormattedMessage text={content} isUser={false} />
                            </div>

                            {tests && <ChallengeTestResults report={tests} />}

                            {weaknesses && !tests && (
                                <div className="bg-red-50 dark:bg-red-900/10 p-4 border border-red-100 dark:border-red-900/20">
                                    <h4 className="text-sm font-bold text-red-900 dark:text-red-400 mb-2 flex items-center gap-2">
                                        <ExclamationCircleIcon className="w-4 h-4" />
                                        Areas for Improvement / Missing Requirements
                                    </h4>
                                    <div className="text-sm text-red-800 dark:text-red-300">
                                        <FormattedMessage text={weaknesses} isUser={false} />
                                    </div>
                                </div>
                            )}

                            {improvements && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 border border-blue-100 dark:border-blue-900/20">
                                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                                        <LightBulbIcon className="w-4 h-4" />
                                        Suggested Enhancements
                                    </h4>
                                    <div className="text-sm text-blue-800 dark:text-blue-300">
                                        <FormattedMessage text={improvements} isUser={false} />
                                    </div>
                                </div>
                            )}

                            <section className="pt-4 border-t border-ch-divider">
                                <h4 className="text-xs font-bold text-ch-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <TrophyIcon className={`w-4 h-4 ${passed ? 'text-yellow-500' : 'text-ch-muted'}`} />
                                    Badge Status
                                </h4>
                                <div className={`p-5 border flex items-center gap-4 ${passed ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20' : 'bg-ch-surface border-ch-divider'}`}>
                                    <div className={`p-3 ${passed ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'bg-ch-surface-2 text-ch-muted'}`}>
                                        <TrophyIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-ch-text">
                                            {passed ? 'Badge Earned!' : 'Badge Locked'}
                                        </p>
                                        <p className="text-sm text-ch-muted">
                                            {passed 
                                                ? `Congratulations! You've successfully unlocked the ${challengeTitle || 'challenge'} badge.` 
                                                : 'Correct the issues mentioned below and try again to earn your badge!'}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-ch-text text-ch-bg font-bold hover:opacity-90 transition-opacity"
                    >
                        {passed ? 'Awesome!' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const ReviewSubmissionsModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    challengeId: string,
    challengeTitle: string,
}> = ({ isOpen, onClose, challengeId, challengeTitle }) => {
    const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert } = useData();

    // Runner State
    const [runnerOpen, setRunnerOpen] = useState(false);
    const [runnerCode, setRunnerCode] = useState('');
    const [runnerTitle, setRunnerTitle] = useState('');

    // AI Analysis State
    const [analysis, setAnalysis] = useState<{ 
        isOpen: boolean, 
        content: string, 
        weaknesses: string,
        improvements: string,
        passed: boolean | null,
        isLoading: boolean 
    }>({
        isOpen: false,
        content: '',
        weaknesses: '',
        improvements: '',
        passed: null,
        isLoading: false
    });

    useEffect(() => {
        if (isOpen && challengeId) {
            const fetchSubs = async () => {
                setIsLoading(true);
                const data = await api.getSubmissions(challengeId);
                setSubmissions(data);
                setIsLoading(false);
            };
            fetchSubs();
        }
    }, [isOpen, challengeId]);

    const handleReview = async (subId: string, status: 'APPROVED' | 'REJECTED', userId: string) => {
        try {
            await api.reviewSubmission(subId, status, challengeTitle, userId);
            setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status } : s));
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Update Failed',
                message: 'Failed to update submission status.',
                type: 'error'
            });
        }
    };

    const handleRunCode = (code: string, userName: string) => {
        setRunnerCode(code);
        setRunnerTitle(`Submission by ${userName}`);
        setRunnerOpen(true);
    };

    const handleAnalyze = async (sub: ChallengeSubmission) => {
        setAnalysis({ isOpen: true, content: '', isLoading: true });
        try {
            const result = await analyzeChallengeSubmission(challengeTitle, sub.content);
            setAnalysis({ isOpen: true, content: result, isLoading: false });
        } catch (e) {
            setAnalysis({ isOpen: true, content: "Error analyzing submission. Please ensure your API key is configured.", isLoading: false });
        }
    }

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                <div className="bg-ch-bg max-w-2xl w-full p-6 relative border-2 border-ch-rule flex flex-col max-h-[80vh]">
                    <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text"><XIcon /></button>
                    <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-4">Submissions: {challengeTitle}</h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {isLoading ? (
                            <p className="text-center text-ch-muted">Loading submissions...</p>
                        ) : submissions.length === 0 ? (
                            <p className="text-center text-ch-muted">No submissions yet.</p>
                        ) : (
                            submissions.map(sub => (
                                <div key={sub.id} className="bg-ch-surface p-4 border border-ch-divider">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <img src={sub.userAvatarUrl || `https://i.pravatar.cc/40?u=${sub.userId}`} className="w-8 h-8" alt={sub.userName} />
                                            <div>
                                                <p className="text-sm font-bold text-ch-text">{sub.userName}</p>
                                                <p className="text-xs text-ch-muted">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {sub.testsTotal != null && (
                                                <span className={`text-xs px-2 py-1 font-bold ${sub.testsPassed === sub.testsTotal ? 'bg-green-50 text-green-700' : 'bg-ch-surface text-ch-text'}`} title="Test cases passed">
                                                    {sub.testsPassed ?? 0}/{sub.testsTotal} tests
                                                </span>
                                            )}
                                            <span className={`text-xs px-2 py-1 font-bold ${sub.status === 'APPROVED' ? 'bg-green-100 text-green-700' : sub.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-ch-bg p-3 border border-ch-divider mb-3 relative group">
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <button
                                                onClick={() => handleAnalyze(sub)}
                                                className="p-1.5 bg-ch-surface hover:bg-ch-accent-soft hover:text-ch-accent text-ch-muted transition-all border border-ch-divider"
                                                title="Analyze with AI"
                                            >
                                                <SparklesIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRunCode(sub.content, sub.userName)}
                                                className="p-1.5 bg-ch-surface hover:bg-ch-surface-2 text-ch-muted transition-all border border-ch-divider"
                                                title="Run Code"
                                            >
                                                <PlayIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <pre className="whitespace-pre-wrap text-sm text-ch-text font-mono max-h-60 overflow-y-auto custom-scrollbar pt-8">{sub.content}</pre>
                                    </div>
                                    {sub.status === 'PENDING' && (
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleReview(sub.id, 'REJECTED', sub.userId)} className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-1">
                                                <XCircleIcon className="w-4 h-4" /> Reject
                                            </button>
                                            <button onClick={() => handleReview(sub.id, 'APPROVED', sub.userId)} className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 flex items-center gap-1">
                                                <CheckIcon className="w-4 h-4" /> Approve & Award Badge
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <CodeRunnerModal
                isOpen={runnerOpen}
                onClose={() => setRunnerOpen(false)}
                code={runnerCode}
                title={runnerTitle}
            />
            <AnalysisModal
                isOpen={analysis.isOpen}
                content={analysis.content}
                isLoading={analysis.isLoading}
                onClose={() => setAnalysis(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
};

const Challenges: React.FC<ChallengesProps> = ({ currentUser, theme }) => {
    const { challenges, allUsers, fetchChallenges, isLoadingChallenges, challengesError, showToast, fetchUsers } = useData();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [selectedReviewChallenge, setSelectedReviewChallenge] = useState<{ id: string, title: string } | null>(null);
    const [prefillData, setPrefillData] = useState<ChallengePrefill | null>(null);
    const [editingTestsFor, setEditingTestsFor] = useState<Challenge | null>(null);
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');

    const isPatron = currentUser.role === 'PATRON';

    const handleCreateChallenge = async (title: string, description: string, deadline: string, difficulty: any, tests: ChallengeTestsDraft | null) => {
        await api.addChallenge({
            title,
            description,
            deadline,
            difficulty,
            createdBy: currentUser.uid,
            ...(tests ? { language: tests.language, starterCode: tests.starterCode, testCases: finalizeTestCases(tests.testCases) } : {})
        });
        setPrefillData(null);
        await fetchChallenges();
    };

    const handleAIChallengeGenerated = (prefill: ChallengePrefill) => {
        setPrefillData(prefill);
        setIsAIModalOpen(false);
        setIsCreateModalOpen(true);
    };

    const handleSaveTests = async (challenge: Challenge, tests: ChallengeTestsDraft) => {
        try {
            await api.updateChallengeTests(challenge.id, {
                language: tests.language,
                starterCode: tests.starterCode,
                testCases: finalizeTestCases(tests.testCases)
            });
            showToast('Test cases saved.', 'success');
            setEditingTestsFor(null);
            await fetchChallenges();
        } catch (error: any) {
            console.error(error);
            showToast('Failed to save test cases: ' + error.message, 'error');
        }
    };

    // Other screens (the Playground board) open a challenge here by id.
    useEffect(() => {
        const open = (id: string | null) => {
            if (!id) return;
            setWorkspaceId(id);
            sessionStorage.removeItem(OPEN_CHALLENGE_KEY);
        };
        open(sessionStorage.getItem(OPEN_CHALLENGE_KEY));
        const onOpen = (event: Event) => open((event as CustomEvent<string>).detail);
        window.addEventListener(OPEN_CHALLENGE_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_CHALLENGE_EVENT, onOpen);
    }, []);

    const workspaceChallenge = workspaceId ? challenges.find(c => c.id === workspaceId) || null : null;

    // Refresh badges and verdict-bearing lists after a submission is recorded.
    const handleSubmitted = async () => {
        await Promise.all([fetchUsers(), fetchChallenges()]);
    };

    const openReview = (id: string, title: string) => {
        setSelectedReviewChallenge({ id, title });
        setIsReviewModalOpen(true);
    };

    const filteredChallenges = useMemo(() => {
        const today = new Date();
        return challenges.filter(c => {
            const isExpired = new Date(c.deadline) < today;
            const hasBadge = currentUser.badges?.includes(c.title);

            if (activeTab === 'ACTIVE') {
                return c.status === 'ACTIVE' && !isExpired && !hasBadge;
            }
            if (activeTab === 'COMPLETED') {
                return hasBadge;
            }
            return true;
        });
    }, [challenges, activeTab, currentUser.badges]);

    if (isLoadingChallenges) return (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin border-2 border-ch-divider border-t-ch-accent" />
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Loading challenges</p>
        </div>
    );

    if (challengesError) return <div className="text-center p-8 text-red-500">Error: {challengesError}</div>;

    if (workspaceChallenge) {
        return (
            <ChallengeWorkspace
                key={workspaceChallenge.id}
                challenge={workspaceChallenge}
                currentUser={currentUser}
                theme={theme}
                onBack={() => setWorkspaceId(null)}
                onSubmitted={() => { void handleSubmitted(); }}
            />
        );
    }

    return (
        <div className="ch-scroll h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            <PageIntro
                eyebrow="Earn your badges"
                title="Challenges & Badges"
                description="Push your limits, solve problems, and earn exclusive badges to climb the club leaderboard."
                actions={isPatron ? (
                    <>
                        <Tooltip text="Describe concepts and let AI craft a scenario-based challenge.">
                            <button onClick={() => setIsAIModalOpen(true)} className={BTN_SECONDARY}>
                                <SparklesIcon className="text-ch-accent" /> Generate with AI
                            </button>
                        </Tooltip>
                        <Tooltip text="Post a custom challenge with title, description, and deadline.">
                            <button onClick={() => { setPrefillData(null); setIsCreateModalOpen(true); }} className={BTN_PRIMARY}>
                                <PlusCircleIcon /> Create Challenge
                            </button>
                        </Tooltip>
                    </>
                ) : undefined}
            />

            <Leaderboard users={allUsers} />

            <RuledTabs
                tabs={[
                    { id: 'ACTIVE' as const, label: 'Active' },
                    { id: 'COMPLETED' as const, label: 'Completed', count: currentUser.badges?.length || 0 },
                    { id: 'ALL' as const, label: 'All History' },
                ]}
                active={activeTab}
                onChange={setActiveTab}
            />

            {filteredChallenges.length === 0 ? (
                <EmptyState
                    title={activeTab === 'COMPLETED' ? "No badges earned yet" : "No challenges found"}
                    description={activeTab === 'COMPLETED'
                        ? "Participate in active challenges to start earning badges!"
                        : "Check back later for new challenges."}
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredChallenges.map(challenge => (
                        <ChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            currentUser={currentUser}
                            onOpenReview={openReview}
                            onEditTests={setEditingTestsFor}
                            onSolve={(c) => setWorkspaceId(c.id)}
                        />
                    ))}
                </div>
            )}

            <CreateChallengeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateChallenge}
                prefill={prefillData}
            />

            <EditTestsModal
                challenge={editingTestsFor}
                onClose={() => setEditingTestsFor(null)}
                onSave={handleSaveTests}
            />

            <GenerateAIChallengeModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onGenerated={handleAIChallengeGenerated}
            />

            {selectedReviewChallenge && (
                <ReviewSubmissionsModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    challengeId={selectedReviewChallenge.id}
                    challengeTitle={selectedReviewChallenge.title}
                />
            )}
        </div>
        </div>
    );
};

export default Challenges;
