import React, { useEffect, useMemo, useRef, useState } from 'react';
import Tooltip from './Tooltip';

type ReactionState = 'idle' | 'waiting' | 'ready' | 'tooSoon' | 'done';
type MathDifficulty = 'warmup' | 'core' | 'boss';

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateMathQuestion = (difficulty: MathDifficulty) => {
    if (difficulty === 'warmup') {
        const a = randomBetween(1, 20);
        const b = randomBetween(1, 20);
        const op = Math.random() > 0.5 ? '+' : '-';
        const answer = op === '+' ? a + b : a - b;
        return { text: `${a} ${op} ${b}`, answer };
    }

    if (difficulty === 'core') {
        const ops = ['+', '-', '×'];
        const op = ops[randomBetween(0, ops.length - 1)];
        const a = randomBetween(4, 30);
        const b = randomBetween(2, 14);
        const answer = op === '×' ? a * b : op === '+' ? a + b : a - b;
        return { text: `${a} ${op} ${b}`, answer };
    }

    const a = randomBetween(6, 20);
    const b = randomBetween(6, 18);
    const c = randomBetween(3, 12);
    const op = Math.random() > 0.5 ? '+' : '-';
    const answer = op === '+' ? a * b + c : a * b - c;
    return { text: `${a} × ${b} ${op} ${c}`, answer };
};

const Games: React.FC = () => {
    // Reaction Timer
    const [reactionState, setReactionState] = useState<ReactionState>('idle');
    const [reactionTime, setReactionTime] = useState<number | null>(null);
    const [bestReaction, setBestReaction] = useState<number | null>(null);
    const reactionTimeout = useRef<number | null>(null);
    const readyAtRef = useRef<number | null>(null);

    const clearReactionTimeout = () => {
        if (reactionTimeout.current) {
            clearTimeout(reactionTimeout.current);
            reactionTimeout.current = null;
        }
    };

    const startReaction = () => {
        clearReactionTimeout();
        readyAtRef.current = null;
        setReactionTime(null);
        setReactionState('waiting');
        const delay = randomBetween(1200, 3500);
        reactionTimeout.current = window.setTimeout(() => {
            readyAtRef.current = performance.now();
            setReactionState('ready');
        }, delay);
    };

    const handleReactionClick = () => {
        if (reactionState === 'waiting') {
            clearReactionTimeout();
            setReactionState('tooSoon');
            return;
        }
        if (reactionState === 'ready' && readyAtRef.current) {
            const time = Math.max(0, Math.round(performance.now() - readyAtRef.current));
            setReactionTime(time);
            setBestReaction(prev => (prev === null ? time : Math.min(prev, time)));
            setReactionState('done');
        }
    };

    const resetReaction = () => {
        clearReactionTimeout();
        readyAtRef.current = null;
        setReactionTime(null);
        setReactionState('idle');
    };

    useEffect(() => () => clearReactionTimeout(), []);

    // Quick Math
    const [mathDifficulty, setMathDifficulty] = useState<MathDifficulty>('warmup');
    const [mathQuestion, setMathQuestion] = useState(() => generateMathQuestion('warmup'));
    const [mathAnswer, setMathAnswer] = useState('');
    const [mathFeedback, setMathFeedback] = useState<string | null>(null);
    const [mathStreak, setMathStreak] = useState(0);
    const [mathBest, setMathBest] = useState(0);

    useEffect(() => {
        setMathQuestion(generateMathQuestion(mathDifficulty));
        setMathFeedback(null);
        setMathAnswer('');
    }, [mathDifficulty]);

    const submitMath = (e: React.FormEvent) => {
        e.preventDefault();
        const value = Number(mathAnswer);
        if (!mathAnswer.trim() || Number.isNaN(value)) {
            setMathFeedback('Enter a valid number to score this round.');
            return;
        }
        if (value === mathQuestion.answer) {
            setMathFeedback('Correct. Keep the streak alive.');
            setMathStreak(prev => {
                const next = prev + 1;
                setMathBest(best => Math.max(best, next));
                return next;
            });
        } else {
            setMathFeedback(`Not quite. Correct answer: ${mathQuestion.answer}.`);
            setMathStreak(0);
        }
        setMathAnswer('');
        setMathQuestion(generateMathQuestion(mathDifficulty));
    };

    const skipMath = () => {
        setMathFeedback('Skipped. New prompt generated.');
        setMathQuestion(generateMathQuestion(mathDifficulty));
    };

    // Number Guess
    const [guessTarget, setGuessTarget] = useState(() => randomBetween(1, 100));
    const [guessValue, setGuessValue] = useState('');
    const [guessFeedback, setGuessFeedback] = useState('Guess a number between 1 and 100.');
    const [guessAttempts, setGuessAttempts] = useState(0);
    const [bestGuess, setBestGuess] = useState<number | null>(null);

    const submitGuess = (e: React.FormEvent) => {
        e.preventDefault();
        const value = Number(guessValue);
        if (!guessValue.trim() || Number.isNaN(value)) {
            setGuessFeedback('Enter a number to make a guess.');
            return;
        }
        if (value < 1 || value > 100) {
            setGuessFeedback('Keep it between 1 and 100.');
            return;
        }
        const nextAttempts = guessAttempts + 1;
        setGuessAttempts(nextAttempts);
        if (value === guessTarget) {
            setGuessFeedback(`You got it in ${nextAttempts} tries. New round ready.`);
            setBestGuess(prev => (prev === null ? nextAttempts : Math.min(prev, nextAttempts)));
            setGuessTarget(randomBetween(1, 100));
            setGuessAttempts(0);
            setGuessValue('');
            return;
        }
        setGuessFeedback(value < guessTarget ? 'Too low. Try a higher number.' : 'Too high. Bring it down.');
        setGuessValue('');
    };

    const resetGuess = () => {
        setGuessTarget(randomBetween(1, 100));
        setGuessAttempts(0);
        setGuessValue('');
        setGuessFeedback('New round started. Guess a number between 1 and 100.');
    };

    const reactionStatusText = useMemo(() => {
        if (reactionState === 'idle') return 'Press start, then wait for the green glow.';
        if (reactionState === 'waiting') return 'Wait for it... click as soon as it turns green.';
        if (reactionState === 'ready') return 'Tap now!';
        if (reactionState === 'tooSoon') return 'Too soon. Try again when ready.';
        if (reactionState === 'done') return `Reaction time: ${reactionTime} ms.`;
        return '';
    }, [reactionState, reactionTime]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
                <div className="absolute inset-0 opacity-70">
                    <div className="absolute -top-20 -right-24 h-64 w-64 bg-gradient-to-br from-pink-400/40 to-purple-500/10 blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-10 h-64 w-64 bg-gradient-to-br from-blue-400/30 to-cyan-400/10 blur-3xl"></div>
                </div>
                <div className="relative z-10">
                    <p className="text-xs uppercase tracking-[0.35em] text-pink-500 font-semibold">Club Arcade</p>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">Games Lounge</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
                        Short, focused games to reset your brain between deep work sessions. Scores are local to this device so you can keep things casual.
                    </p>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reaction Timer</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Train your quick response time.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Best</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{bestReaction ? `${bestReaction} ms` : '--'}</p>
                        </div>
                    </div>

                    <div className={`h-40 rounded-2xl border border-dashed flex items-center justify-center text-sm font-semibold transition-all ${reactionState === 'ready' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-600 dark:text-emerald-300' : reactionState === 'tooSoon' ? 'bg-red-500/10 border-red-400 text-red-500' : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                        onClick={handleReactionClick}
                        role="button"
                        tabIndex={0}
                    >
                        {reactionStatusText}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Tooltip text="Start a new reaction test.">
                            <button
                                onClick={startReaction}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold shadow-sm hover:opacity-90"
                            >
                                Start Run
                            </button>
                        </Tooltip>
                        <Tooltip text="Clear the timer and reset the board.">
                            <button
                                onClick={resetReaction}
                                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Reset
                            </button>
                        </Tooltip>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Math</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Keep your brain warm with rapid prompts.</p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mathStreak}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Best</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{mathBest}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
                        {mathQuestion.text}
                    </div>

                    <form onSubmit={submitMath} className="space-y-3">
                        <input
                            value={mathAnswer}
                            onChange={(e) => setMathAnswer(e.target.value)}
                            type="number"
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="Type your answer"
                        />
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                className="flex-1 px-3 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold"
                            >
                                Submit
                            </button>
                            <button
                                type="button"
                                onClick={skipMath}
                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Skip
                            </button>
                        </div>
                    </form>

                    <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Difficulty</label>
                        <select
                            value={mathDifficulty}
                            onChange={(e) => setMathDifficulty(e.target.value as MathDifficulty)}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-2 py-1 text-xs text-gray-700 dark:text-gray-200"
                        >
                            <option value="warmup">Warm-up</option>
                            <option value="core">Core</option>
                            <option value="boss">Boss</option>
                        </select>
                    </div>

                    {mathFeedback && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{mathFeedback}</p>
                    )}
                </section>

                <section className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Number Guess</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Read the clue, then adjust your range.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Best Attempts</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{bestGuess ?? '--'}</p>
                        </div>
                    </div>

                    <form onSubmit={submitGuess} className="flex flex-col sm:flex-row gap-3">
                        <input
                            value={guessValue}
                            onChange={(e) => setGuessValue(e.target.value)}
                            type="number"
                            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Your guess..."
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold shadow-sm hover:opacity-90"
                        >
                            Guess
                        </button>
                        <button
                            type="button"
                            onClick={resetGuess}
                            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            New Round
                        </button>
                    </form>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">{guessFeedback}</p>
                        <span className="text-xs text-gray-400">Attempts: {guessAttempts}</span>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Games;
