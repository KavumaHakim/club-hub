import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from '../types';
import * as api from '../services/apiService';
import Tooltip from './Tooltip';

type ReactionState = 'idle' | 'waiting' | 'ready' | 'tooSoon' | 'done';
type MathDifficulty = 'warmup' | 'core' | 'boss';
type Direction = 'U' | 'D' | 'L' | 'R';
type Position = { x: number; y: number };
type GamesLeaderboard = {
    reactionBestMs?: number;
    mathBest?: number;
    guessBest?: number;
    outputBest?: number;
    bugBest?: number;
    sequenceBest?: number;
    loopBest?: number;
    functionBest?: number;
    coordBest?: number;
};

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const nextIndex = (current: number, length: number) => {
    if (length <= 1) return 0;
    let idx = current;
    while (idx === current) {
        idx = randomBetween(0, length - 1);
    }
    return idx;
};
const positionKey = (pos: Position) => `${pos.x},${pos.y}`;
const directionMoves: Record<Direction, Position> = {
    U: { x: 0, y: -1 },
    D: { x: 0, y: 1 },
    L: { x: -1, y: 0 },
    R: { x: 1, y: 0 }
};

const runPath = (start: Position, commands: Direction[], size: number, obstacles: Position[]) => {
    const obstacleSet = new Set(obstacles.map(positionKey));
    let pos = { ...start };
    const path = new Set<string>([positionKey(pos)]);
    let status: 'ok' | 'wall' | 'obstacle' = 'ok';

    for (const cmd of commands) {
        const move = directionMoves[cmd];
        const next = { x: pos.x + move.x, y: pos.y + move.y };
        if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size) {
            status = 'wall';
            break;
        }
        if (obstacleSet.has(positionKey(next))) {
            status = 'obstacle';
            break;
        }
        pos = next;
        path.add(positionKey(pos));
    }
    return { pos, path, status };
};

const parseSumExpression = (raw: string) => {
    const cleaned = raw.replace(/\s+/g, '');
    if (!cleaned) return null;
    if (!/^[0-9+\-]+$/.test(cleaned)) return null;
    const normalized = cleaned.replace(/-/g, '+-');
    const parts = normalized.split('+').filter(Boolean);
    let total = 0;
    for (const part of parts) {
        const value = Number(part);
        if (Number.isNaN(value)) return null;
        total += value;
    }
    return total;
};

const parseCoordinateInput = (raw: string) => {
    const parts = raw.split(',').map(part => part.trim());
    if (parts.length !== 2) return null;
    const x = parseSumExpression(parts[0]);
    const y = parseSumExpression(parts[1]);
    if (x === null || y === null) return null;
    return { x, y };
};

const generateMathQuestion = (difficulty: MathDifficulty) => {
    if (difficulty === 'warmup') {
        const a = randomBetween(1, 20);
        const b = randomBetween(1, 20);
        const op = Math.random() > 0.5 ? '+' : '-';
        const answer = op === '+' ? a + b : a - b;
        return { text: `${a} ${op} ${b}`, answer };
    }

    if (difficulty === 'core') {
        const ops = ['+', '-', 'x'];
        const op = ops[randomBetween(0, ops.length - 1)];
        const a = randomBetween(4, 30);
        const b = randomBetween(2, 14);
        const answer = op === 'x' ? a * b : op === '+' ? a + b : a - b;
        return { text: `${a} ${op} ${b}`, answer };
    }

    const a = randomBetween(6, 20);
    const b = randomBetween(6, 18);
    const c = randomBetween(3, 12);
    const op = Math.random() > 0.5 ? '+' : '-';
    const answer = op === '+' ? a * b + c : a * b - c;
    return { text: `${a} x ${b} ${op} ${c}`, answer };
};

const gameMeta: Record<string, { label: string; lowerIsBetter: boolean; valueSuffix?: string; }> = {
    reaction: { label: 'Reaction Time', lowerIsBetter: true, valueSuffix: 'ms' },
    math: { label: 'Quick Math', lowerIsBetter: false },
    guess: { label: 'Number Guess', lowerIsBetter: true, valueSuffix: 'tries' },
    output: { label: 'Output Prediction', lowerIsBetter: false },
    bug: { label: 'Bug Hunt', lowerIsBetter: false },
    sequence: { label: 'Sequence Builder', lowerIsBetter: true, valueSuffix: 'steps' },
    loop: { label: 'Loop Logic', lowerIsBetter: false },
    function: { label: 'Function Calls', lowerIsBetter: false },
    coord: { label: 'Coordinate Target', lowerIsBetter: false }
};

const Games: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const gameHelp = useMemo(() => ([
        {
            title: 'Reaction Timer',
            description: 'Press Start, wait for the green cue, then tap fast.',
            tips: ['Early tap = too soon.', 'Lower ms is better.']
        },
        {
            title: 'Quick Math',
            description: 'Solve as many prompts as you can before the timer ends.',
            tips: ['Start the timer first.', 'Use Skip to move on.']
        },
        {
            title: 'Sequence Builder',
            description: 'Queue U/D/L/R steps to move the bot to the goal.',
            tips: ['Avoid X obstacles.', 'Shorter paths score better.']
        },
        {
            title: 'Loop Logic',
            description: 'Pick how many repeats of the pattern reaches the goal.',
            tips: ['Watch the preview path.', 'Correct loop count increases streak.']
        },
        {
            title: 'Function Calls',
            description: 'Choose an order of function calls to reach the goal.',
            tips: ['Functions are mini move sets.', 'Reorder if you hit walls.']
        },
        {
            title: 'Coordinate Target',
            description: 'Enter coordinates using sum syntax like 2+1, 3+0.',
            tips: ['Use the origin toggle if needed.', 'Hints guide direction.']
        },
        {
            title: 'Output Prediction',
            description: 'Read the snippet and choose the correct output.',
            tips: ['Timer counts down.', 'Streak grows on correct answers.']
        },
        {
            title: 'Bug Hunt',
            description: 'Pick the fix that makes the code work.',
            tips: ['Check the error first.', 'Streak resets on mistakes.']
        }
    ]), []);
    const [showHelp, setShowHelp] = useState(true);
    const [leaderboard, setLeaderboard] = useState<GamesLeaderboard>({});
    const lastSubmittedRef = useRef<Record<string, number | undefined>>({});
    const [leaderboardGameKey, setLeaderboardGameKey] = useState<keyof typeof gameMeta>('reaction');
    const [leaderboardEntries, setLeaderboardEntries] = useState<Array<{ userId: string; userName: string; userUsername: string; userAvatarUrl?: string; bestValue: number }>>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

    const submitGameScore = async (gameKey: keyof typeof gameMeta, value: number) => {
        if (!currentUser?.uid || Number.isNaN(value)) return;
        const meta = gameMeta[gameKey];
        const lastValue = lastSubmittedRef.current[gameKey];
        const isBetter = lastValue === undefined
            ? true
            : meta.lowerIsBetter
                ? value < lastValue
                : value > lastValue;
        if (!isBetter) return;
        lastSubmittedRef.current[gameKey] = value;
        try {
            await api.upsertGameScore({ userId: currentUser.uid, gameKey, bestValue: value });
        } catch (error) {
            console.warn('Failed to submit game score', error);
        }
    };

    const loadLeaderboard = async (gameKey: keyof typeof gameMeta) => {
        setLeaderboardLoading(true);
        setLeaderboardError(null);
        try {
            const data = await api.getGameLeaderboard(gameKey, gameMeta[gameKey].lowerIsBetter);
            setLeaderboardEntries(data.map(entry => ({
                userId: entry.userId,
                userName: entry.userName,
                userUsername: entry.userUsername,
                userAvatarUrl: entry.userAvatarUrl,
                bestValue: entry.bestValue
            })));
        } catch (error: any) {
            setLeaderboardError(error?.message || 'Failed to load leaderboard.');
        } finally {
            setLeaderboardLoading(false);
        }
    };

    useEffect(() => {
        loadLeaderboard(leaderboardGameKey);
    }, [leaderboardGameKey]);

    const sequencePuzzles = useMemo(() => ([
        {
            id: 'seq-1',
            size: 5,
            start: { x: 0, y: 4 },
            goal: { x: 4, y: 0 },
            obstacles: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 1, y: 1 }]
        },
        {
            id: 'seq-2',
            size: 5,
            start: { x: 0, y: 0 },
            goal: { x: 4, y: 4 },
            obstacles: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 1 }]
        },
        {
            id: 'seq-3',
            size: 5,
            start: { x: 4, y: 2 },
            goal: { x: 0, y: 2 },
            obstacles: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }]
        }
    ]), []);

    const loopPuzzles = useMemo(() => ([
        {
            id: 'loop-1',
            size: 5,
            start: { x: 0, y: 4 },
            goal: { x: 4, y: 1 },
            pattern: ['R', 'R', 'U'] as Direction[],
            options: [1, 2, 3, 4],
            answer: 2,
            label: 'Repeat (R, R, U)'
        },
        {
            id: 'loop-2',
            size: 5,
            start: { x: 4, y: 4 },
            goal: { x: 1, y: 1 },
            pattern: ['L', 'U'] as Direction[],
            options: [1, 2, 3, 4],
            answer: 3,
            label: 'Repeat (L, U)'
        },
        {
            id: 'loop-3',
            size: 5,
            start: { x: 0, y: 2 },
            goal: { x: 4, y: 2 },
            pattern: ['R'] as Direction[],
            options: [2, 3, 4, 5],
            answer: 4,
            label: 'Repeat (R)'
        }
    ]), []);

    const functionPuzzles = useMemo(() => ([
        {
            id: 'fn-1',
            size: 5,
            start: { x: 0, y: 4 },
            goal: { x: 4, y: 0 },
            obstacles: [{ x: 1, y: 2 }, { x: 2, y: 2 }],
            functions: {
                A: ['R', 'R', 'U'] as Direction[],
                B: ['U', 'U', 'R'] as Direction[]
            },
            slots: 3
        },
        {
            id: 'fn-2',
            size: 5,
            start: { x: 4, y: 4 },
            goal: { x: 0, y: 1 },
            obstacles: [{ x: 2, y: 3 }],
            functions: {
                A: ['L', 'L'] as Direction[],
                B: ['U', 'L'] as Direction[]
            },
            slots: 3
        }
    ]), []);

    const outputChallenges = useMemo(() => ([
        {
            id: 'out-js-1',
            language: 'JavaScript',
            prompt: 'What does this print?',
            code: `const nums = [1, 2, 3];\nconsole.log(nums.map(n => n * 2).join('-'));`,
            options: ['1-2-3', '2-4-6', '2-3-4', '1-4-9'],
            answer: 1,
            explanation: 'map doubles each value, then join uses "-".'
        },
        {
            id: 'out-py-1',
            language: 'Python',
            prompt: 'What is the output?',
            code: `name = "Kevin"\nprint(name[::-1])`,
            options: ['Kevin', 'niveK', 'Knevi', 'kevin'],
            answer: 1,
            explanation: 'Slicing with [::-1] reverses the string.'
        },
        {
            id: 'out-js-2',
            language: 'JavaScript',
            prompt: 'What does this print?',
            code: `let count = 0;\nfor (let i = 0; i < 3; i++) { count += i; }\nconsole.log(count);`,
            options: ['3', '6', '0', '2'],
            answer: 0,
            explanation: 'count = 0 + 1 + 2 = 3.'
        },
        {
            id: 'out-py-2',
            language: 'Python',
            prompt: 'What is the output?',
            code: `nums = [10, 5, 2]\nprint(sum(nums) // len(nums))`,
            options: ['5', '6', '5.6', '4'],
            answer: 0,
            explanation: 'sum is 17, len is 3, integer division gives 5.'
        },
        {
            id: 'out-js-3',
            language: 'JavaScript',
            prompt: 'What does this print?',
            code: `console.log(Boolean(""), Boolean(" "));`,
            options: ['false false', 'true false', 'false true', 'true true'],
            answer: 2,
            explanation: 'Empty string is falsey, string with a space is truthy.'
        },
        {
            id: 'out-py-3',
            language: 'Python',
            prompt: 'What is the output?',
            code: `def f(x, y=2):\n    return x * y\nprint(f(3))`,
            options: ['5', '6', '9', '2'],
            answer: 1,
            explanation: 'Default y is 2, so 3 * 2 = 6.'
        }
    ]), []);

    const bugChallenges = useMemo(() => ([
        {
            id: 'bug-js-1',
            language: 'JavaScript',
            prompt: 'Pick the fix that prevents the crash.',
            code: `const user = { name: "Ada" };\nconsole.log(user.age.toUpperCase());`,
            options: [
                'console.log(user.name.toUpperCase());',
                'console.log(user.age.toFixed(2));',
                'console.log(user["age"].length);',
                'console.log(JSON.stringify(user.age));'
            ],
            answer: 0,
            explanation: 'age is undefined, but name exists.'
        },
        {
            id: 'bug-py-1',
            language: 'Python',
            prompt: 'Which change fixes the syntax error?',
            code: `for i in range(3)\n    print(i)`,
            options: [
                'Add a colon after range(3).',
                'Indent the for loop two more spaces.',
                'Change range(3) to range[3].',
                'Remove the indentation on print.'
            ],
            answer: 0,
            explanation: 'Python for loops require a trailing colon.'
        },
        {
            id: 'bug-js-2',
            language: 'JavaScript',
            prompt: 'Which fix makes this log 5?',
            code: `function add(a, b) { return a + b; }\nconsole.log(add("2", 3));`,
            options: [
                'console.log(add(Number("2"), 3));',
                'console.log(add(String(2), 3));',
                'console.log(add("2", "3"));',
                'console.log(add(2, "3"));'
            ],
            answer: 0,
            explanation: 'Convert "2" to a number before adding.'
        },
        {
            id: 'bug-py-2',
            language: 'Python',
            prompt: 'Which fix avoids the error?',
            code: `names = ["Ana", "Bo"]\nprint(names[2])`,
            options: [
                'Use print(names[1]).',
                'Use print(names[3]).',
                'Use print(names[-3]).',
                'Use print(names[2].upper()).'
            ],
            answer: 0,
            explanation: 'Index 2 is out of range for a 2-item list.'
        },
        {
            id: 'bug-js-3',
            language: 'JavaScript',
            prompt: 'Pick the fix for the conditional.',
            code: `const score = 10;\nif (score = 10) { console.log("Win"); }`,
            options: [
                'Replace = with ===',
                'Remove the if statement',
                'Set score to true',
                'Add a semicolon after if'
            ],
            answer: 0,
            explanation: 'Use === to compare instead of assigning.'
        },
        {
            id: 'bug-py-3',
            language: 'Python',
            prompt: 'Which fix avoids the NameError?',
            code: `total = 0\nnumbers = [1, 2, 3]\nfor n in numbers:\n    total = total + n\nprint(totals)`,
            options: [
                'Print total instead of totals.',
                'Initialize totals = 0 at the top.',
                'Use totals += n in the loop.',
                'Use print(total, totals).'
            ],
            answer: 0,
            explanation: 'The variable is named total, not totals.'
        }
    ]), []);

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
    const mathDuration = 60;
    const [mathTimeLeft, setMathTimeLeft] = useState(60);
    const [mathIsRunning, setMathIsRunning] = useState(false);

    useEffect(() => {
        setMathQuestion(generateMathQuestion(mathDifficulty));
        setMathFeedback(null);
        setMathAnswer('');
    }, [mathDifficulty]);

    useEffect(() => {
        setMathTimeLeft(mathDuration);
    }, [mathDuration]);

    const submitMath = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mathIsRunning) return;
        if (mathTimeLeft <= 0) return;
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
        if (!mathIsRunning) return;
        setMathFeedback('Skipped. New prompt generated.');
        setMathQuestion(generateMathQuestion(mathDifficulty));
    };

    useEffect(() => {
        if (!mathIsRunning) return;
        const timer = window.setInterval(() => {
            setMathTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setMathIsRunning(false);
                    setMathFeedback('Time is up. Start a new round to try again.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [mathIsRunning]);

    const startMathTimer = () => {
        setMathTimeLeft(mathDuration);
        setMathIsRunning(true);
        setMathFeedback(null);
        setMathAnswer('');
        setMathQuestion(generateMathQuestion(mathDifficulty));
    };

    const resetMathTimer = () => {
        setMathIsRunning(false);
        setMathTimeLeft(mathDuration);
        setMathFeedback('Timer reset. Press Start to play.');
        setMathAnswer('');
        setMathStreak(0);
    };

    // Number Guess
    const [guessTarget, setGuessTarget] = useState(() => randomBetween(1, 100));
    const [guessValue, setGuessValue] = useState('');
    const [guessFeedback, setGuessFeedback] = useState('Guess a number between 1 and 100.');
    const [guessAttempts, setGuessAttempts] = useState(0);
    const [bestGuess, setBestGuess] = useState<number | null>(null);

    // Sequence Builder
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const currentSequence = sequencePuzzles[sequenceIndex];
    const [sequenceCommands, setSequenceCommands] = useState<Direction[]>([]);
    const [sequencePath, setSequencePath] = useState<Set<string>>(new Set([positionKey(currentSequence.start)]));
    const [sequencePos, setSequencePos] = useState<Position>(currentSequence.start);
    const [sequenceResult, setSequenceResult] = useState<string | null>(null);
    const [sequenceBest, setSequenceBest] = useState<number | null>(null);

    useEffect(() => {
        setSequenceCommands([]);
        setSequencePath(new Set([positionKey(currentSequence.start)]));
        setSequencePos(currentSequence.start);
        setSequenceResult(null);
    }, [currentSequence]);

    const addSequenceCommand = (cmd: Direction) => {
        setSequenceCommands(prev => (prev.length >= 10 ? prev : [...prev, cmd]));
    };

    const removeSequenceCommand = () => {
        setSequenceCommands(prev => prev.slice(0, -1));
    };

    const resetSequence = () => {
        setSequenceCommands([]);
        setSequencePath(new Set([positionKey(currentSequence.start)]));
        setSequencePos(currentSequence.start);
        setSequenceResult(null);
    };

    const runSequence = () => {
        if (sequenceCommands.length === 0) {
            setSequenceResult('Add a few steps before running.');
            return;
        }
        const result = runPath(currentSequence.start, sequenceCommands, currentSequence.size, currentSequence.obstacles);
        setSequencePath(result.path);
        setSequencePos(result.pos);
        if (result.status === 'wall') {
            setSequenceResult('Crashed into a wall. Try a different route.');
            return;
        }
        if (result.status === 'obstacle') {
            setSequenceResult('Hit an obstacle. Adjust the sequence.');
            return;
        }
        if (result.pos.x === currentSequence.goal.x && result.pos.y === currentSequence.goal.y) {
            setSequenceResult('Success! You reached the goal.');
            setSequenceBest(prev => (prev === null ? sequenceCommands.length : Math.min(prev, sequenceCommands.length)));
        } else {
            setSequenceResult('Not quite there. Try again.');
        }
    };

    // Loop Logic
    const [loopIndex, setLoopIndex] = useState(0);
    const currentLoop = loopPuzzles[loopIndex];
    const [loopChoice, setLoopChoice] = useState<number | null>(null);
    const [loopFeedback, setLoopFeedback] = useState<string | null>(null);
    const [loopPath, setLoopPath] = useState<Set<string>>(new Set([positionKey(currentLoop.start)]));
    const [loopPos, setLoopPos] = useState<Position>(currentLoop.start);
    const [loopStreak, setLoopStreak] = useState(0);
    const [loopBest, setLoopBest] = useState(0);

    useEffect(() => {
        setLoopChoice(null);
        setLoopFeedback(null);
        setLoopPath(new Set([positionKey(currentLoop.start)]));
        setLoopPos(currentLoop.start);
    }, [currentLoop]);

    const evaluateLoop = (choice: number) => {
        if (loopChoice !== null) return;
        setLoopChoice(choice);
        const commands = Array.from({ length: choice }).flatMap(() => currentLoop.pattern);
        const result = runPath(currentLoop.start, commands, currentLoop.size, []);
        setLoopPath(result.path);
        setLoopPos(result.pos);
        if (choice === currentLoop.answer) {
            setLoopFeedback('Correct. The loop count matches the target.');
            setLoopStreak(prev => {
                const next = prev + 1;
                setLoopBest(best => Math.max(best, next));
                return next;
            });
        } else {
            setLoopFeedback('Not quite. Try another loop count.');
            setLoopStreak(0);
        }
    };

    const nextLoop = () => {
        setLoopIndex(prev => nextIndex(prev, loopPuzzles.length));
    };

    // Function Calls
    const [functionIndex, setFunctionIndex] = useState(0);
    const currentFunction = functionPuzzles[functionIndex];
    const [functionCalls, setFunctionCalls] = useState<string[]>(() => Array.from({ length: currentFunction.slots }, () => 'A'));
    const [functionFeedback, setFunctionFeedback] = useState<string | null>(null);
    const [functionPath, setFunctionPath] = useState<Set<string>>(new Set([positionKey(currentFunction.start)]));
    const [functionPos, setFunctionPos] = useState<Position>(currentFunction.start);
    const [functionStreak, setFunctionStreak] = useState(0);
    const [functionBest, setFunctionBest] = useState(0);

    useEffect(() => {
        setFunctionCalls(Array.from({ length: currentFunction.slots }, () => 'A'));
        setFunctionFeedback(null);
        setFunctionPath(new Set([positionKey(currentFunction.start)]));
        setFunctionPos(currentFunction.start);
    }, [currentFunction]);

    const updateFunctionCall = (index: number, value: string) => {
        setFunctionCalls(prev => prev.map((call, i) => (i === index ? value : call)));
    };

    const runFunctions = () => {
        const commands: Direction[] = [];
        functionCalls.forEach(call => {
            const steps = (currentFunction.functions as any)[call] as Direction[] | undefined;
            if (steps) {
                commands.push(...steps);
            }
        });
        const result = runPath(currentFunction.start, commands, currentFunction.size, currentFunction.obstacles);
        setFunctionPath(result.path);
        setFunctionPos(result.pos);
        if (result.status === 'wall') {
            setFunctionFeedback('Oops. That sequence left the grid.');
            setFunctionStreak(0);
            return;
        }
        if (result.status === 'obstacle') {
            setFunctionFeedback('Obstacle hit. Reorder your function calls.');
            setFunctionStreak(0);
            return;
        }
        if (result.pos.x === currentFunction.goal.x && result.pos.y === currentFunction.goal.y) {
            setFunctionFeedback('Success! Functions combined perfectly.');
            setFunctionStreak(prev => {
                const next = prev + 1;
                setFunctionBest(best => Math.max(best, next));
                return next;
            });
        } else {
            setFunctionFeedback('Close. Adjust the function order.');
            setFunctionStreak(0);
        }
    };

    const nextFunctionPuzzle = () => {
        setFunctionIndex(prev => nextIndex(prev, functionPuzzles.length));
    };

    // Coordinate Target
    const [coordinateSize, setCoordinateSize] = useState(6);
    const [coordShowLabels, setCoordShowLabels] = useState(true);
    const [coordOriginBottom, setCoordOriginBottom] = useState(false);
    const createCoordTarget = (size: number) => ({ x: randomBetween(0, size - 1), y: randomBetween(0, size - 1) });
    const [coordTarget, setCoordTarget] = useState<Position>(() => createCoordTarget(6));
    const [coordInput, setCoordInput] = useState('');
    const [coordFeedback, setCoordFeedback] = useState<string | null>(null);
    const [coordStreak, setCoordStreak] = useState(0);
    const [coordBest, setCoordBest] = useState(0);

    useEffect(() => {
        setCoordTarget(createCoordTarget(coordinateSize));
        setCoordFeedback(null);
        setCoordStreak(0);
    }, [coordinateSize, coordOriginBottom]);

    const resetCoordTarget = () => {
        setCoordTarget(createCoordTarget(coordinateSize));
        setCoordFeedback(null);
        setCoordInput('');
    };

    const handleCoordClick = (x: number, y: number) => {
        const displayY = coordOriginBottom ? coordinateSize - 1 - y : y;
        const displayX = x;
        if (displayX === coordTarget.x && displayY === coordTarget.y) {
            setCoordFeedback('Correct. Target acquired.');
            setCoordStreak(prev => {
                const next = prev + 1;
                setCoordBest(best => Math.max(best, next));
                return next;
            });
            setCoordTarget(createCoordTarget(coordinateSize));
            setCoordInput('');
        } else {
            const hints = [];
            if (displayX < coordTarget.x) hints.push('go right');
            if (displayX > coordTarget.x) hints.push('go left');
            if (displayY < coordTarget.y) hints.push('go up');
            if (displayY > coordTarget.y) hints.push('go down');
            const hintText = hints.length ? `Hint: ${hints.join(' & ')}.` : 'Try again.';
            setCoordFeedback(`Not quite. ${hintText}`);
            setCoordStreak(0);
        }
    };

    const submitCoordInput = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseCoordinateInput(coordInput);
        if (!parsed) {
            setCoordFeedback('Invalid syntax. Try x+y, y+z (example: 2+1, 3+0).');
            return;
        }
        if (parsed.x < 0 || parsed.y < 0 || parsed.x >= coordinateSize || parsed.y >= coordinateSize) {
            setCoordFeedback(`Out of bounds. Use 0 to ${coordinateSize - 1}.`);
            return;
        }
        if (parsed.x === coordTarget.x && parsed.y === coordTarget.y) {
            setCoordFeedback('Correct. Target acquired.');
            setCoordStreak(prev => {
                const next = prev + 1;
                setCoordBest(best => Math.max(best, next));
                return next;
            });
            setCoordTarget(createCoordTarget(coordinateSize));
            setCoordInput('');
        } else {
            const hints = [];
            if (parsed.x < coordTarget.x) hints.push('go right');
            if (parsed.x > coordTarget.x) hints.push('go left');
            if (parsed.y < coordTarget.y) hints.push('go up');
            if (parsed.y > coordTarget.y) hints.push('go down');
            const hintText = hints.length ? `Hint: ${hints.join(' & ')}.` : 'Try again.';
            setCoordFeedback(`Not quite. ${hintText}`);
            setCoordStreak(0);
        }
    };

    // Output Prediction
    const [outputIndex, setOutputIndex] = useState(() => randomBetween(0, outputChallenges.length - 1));
    const [outputSelected, setOutputSelected] = useState<number | null>(null);
    const [outputFeedback, setOutputFeedback] = useState<string | null>(null);
    const [outputStreak, setOutputStreak] = useState(0);
    const [outputBest, setOutputBest] = useState(0);
    const outputDuration = 60;
    const [outputTimeLeft, setOutputTimeLeft] = useState(60);
    const [outputIsRunning, setOutputIsRunning] = useState(false);
    const currentOutput = outputChallenges[outputIndex];

    const answerOutput = (choiceIndex: number) => {
        if (!outputIsRunning || outputTimeLeft <= 0) return;
        if (outputSelected !== null) return;
        setOutputSelected(choiceIndex);
        const isCorrect = choiceIndex === currentOutput.answer;
        if (isCorrect) {
            setOutputFeedback('Correct. Keep pushing your streak.');
            setOutputStreak(prev => {
                const next = prev + 1;
                setOutputBest(best => Math.max(best, next));
                return next;
            });
        } else {
            setOutputFeedback(`Not quite. ${currentOutput.explanation}`);
            setOutputStreak(0);
        }
    };

    const nextOutput = () => {
        setOutputIndex(prev => nextIndex(prev, outputChallenges.length));
        setOutputSelected(null);
        setOutputFeedback(null);
    };

    useEffect(() => {
        setOutputTimeLeft(outputDuration);
    }, [outputDuration]);

    useEffect(() => {
        if (!outputIsRunning) return;
        const timer = window.setInterval(() => {
            setOutputTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setOutputIsRunning(false);
                    setOutputFeedback('Time is up. Start a new round to try again.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [outputIsRunning]);

    const startOutputTimer = () => {
        setOutputTimeLeft(outputDuration);
        setOutputIsRunning(true);
        setOutputFeedback(null);
        setOutputSelected(null);
    };

    const resetOutputTimer = () => {
        setOutputIsRunning(false);
        setOutputTimeLeft(outputDuration);
        setOutputFeedback('Timer reset. Press Start to play.');
        setOutputSelected(null);
        setOutputStreak(0);
    };

    // Bug Hunt
    const [bugIndex, setBugIndex] = useState(() => randomBetween(0, bugChallenges.length - 1));
    const [bugSelected, setBugSelected] = useState<number | null>(null);
    const [bugFeedback, setBugFeedback] = useState<string | null>(null);
    const [bugStreak, setBugStreak] = useState(0);
    const [bugBest, setBugBest] = useState(0);
    const bugDuration = 60;
    const [bugTimeLeft, setBugTimeLeft] = useState(60);
    const [bugIsRunning, setBugIsRunning] = useState(false);
    const currentBug = bugChallenges[bugIndex];

    const answerBug = (choiceIndex: number) => {
        if (!bugIsRunning || bugTimeLeft <= 0) return;
        if (bugSelected !== null) return;
        setBugSelected(choiceIndex);
        const isCorrect = choiceIndex === currentBug.answer;
        if (isCorrect) {
            setBugFeedback('Nice fix. Keep going.');
            setBugStreak(prev => {
                const next = prev + 1;
                setBugBest(best => Math.max(best, next));
                return next;
            });
        } else {
            setBugFeedback(`Not quite. ${currentBug.explanation}`);
            setBugStreak(0);
        }
    };

    const nextBug = () => {
        setBugIndex(prev => nextIndex(prev, bugChallenges.length));
        setBugSelected(null);
        setBugFeedback(null);
    };

    useEffect(() => {
        setBugTimeLeft(bugDuration);
    }, [bugDuration]);

    useEffect(() => {
        if (!bugIsRunning) return;
        const timer = window.setInterval(() => {
            setBugTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setBugIsRunning(false);
                    setBugFeedback('Time is up. Start a new round to try again.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [bugIsRunning]);

    const startBugTimer = () => {
        setBugTimeLeft(bugDuration);
        setBugIsRunning(true);
        setBugFeedback(null);
        setBugSelected(null);
    };

    const resetBugTimer = () => {
        setBugIsRunning(false);
        setBugTimeLeft(bugDuration);
        setBugFeedback('Timer reset. Press Start to play.');
        setBugSelected(null);
        setBugStreak(0);
    };

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

    const leaderboardItems = useMemo(() => ([
        { key: 'reaction', label: 'Reaction Time', value: leaderboard.reactionBestMs ? `${leaderboard.reactionBestMs} ms` : '--', detail: 'Lower is better.' },
        { key: 'math', label: 'Quick Math', value: leaderboard.mathBest ?? 0, detail: 'Best streak.' },
        { key: 'guess', label: 'Number Guess', value: leaderboard.guessBest ? `${leaderboard.guessBest} tries` : '--', detail: 'Lower is better.' },
        { key: 'output', label: 'Output Prediction', value: leaderboard.outputBest ?? 0, detail: 'Best streak.' },
        { key: 'bug', label: 'Bug Hunt', value: leaderboard.bugBest ?? 0, detail: 'Best streak.' },
        { key: 'sequence', label: 'Sequence Builder', value: leaderboard.sequenceBest ? `${leaderboard.sequenceBest} steps` : '--', detail: 'Lower is better.' },
        { key: 'loop', label: 'Loop Logic', value: leaderboard.loopBest ?? 0, detail: 'Best streak.' },
        { key: 'function', label: 'Function Calls', value: leaderboard.functionBest ?? 0, detail: 'Best streak.' },
        { key: 'coord', label: 'Coordinate Target', value: leaderboard.coordBest ?? 0, detail: 'Best streak.' },
    ]), [leaderboard]);

    useEffect(() => {
        if (bestReaction !== null) {
            setLeaderboard(prev => ({ ...prev, reactionBestMs: bestReaction }));
            submitGameScore('reaction', bestReaction);
        }
    }, [bestReaction]);

    useEffect(() => {
        setLeaderboard(prev => ({ ...prev, mathBest }));
        if (mathBest > 0) {
            submitGameScore('math', mathBest);
        }
    }, [mathBest]);

    useEffect(() => {
        if (bestGuess !== null) {
            setLeaderboard(prev => ({ ...prev, guessBest: bestGuess }));
            submitGameScore('guess', bestGuess);
        }
    }, [bestGuess]);

    useEffect(() => {
        setLeaderboard(prev => ({ ...prev, outputBest }));
        if (outputBest > 0) {
            submitGameScore('output', outputBest);
        }
    }, [outputBest]);

    useEffect(() => {
        setLeaderboard(prev => ({ ...prev, bugBest }));
        if (bugBest > 0) {
            submitGameScore('bug', bugBest);
        }
    }, [bugBest]);

    useEffect(() => {
        if (sequenceBest !== null) {
            setLeaderboard(prev => ({ ...prev, sequenceBest }));
            submitGameScore('sequence', sequenceBest);
        }
    }, [sequenceBest]);

    useEffect(() => {
        setLeaderboard(prev => ({ ...prev, loopBest }));
        if (loopBest > 0) {
            submitGameScore('loop', loopBest);
        }
    }, [loopBest]);

    useEffect(() => {
        setLeaderboard(prev => ({ ...prev, functionBest }));
        if (functionBest > 0) {
            submitGameScore('function', functionBest);
        }
    }, [functionBest]);

    useEffect(() => {
        setLeaderboard(prev => ({ ...prev, coordBest }));
        if (coordBest > 0) {
            submitGameScore('coord', coordBest);
        }
    }, [coordBest]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
                <div className="absolute inset-0 opacity-70">
                    <div className="absolute -top-20 -right-24 h-64 w-64 bg-gradient-to-br from-sky-400/40 to-purple-500/10 blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-10 h-64 w-64 bg-gradient-to-br from-blue-400/30 to-cyan-400/10 blur-3xl"></div>
                </div>
                <div className="relative z-10">
                    <p className="text-xs uppercase tracking-[0.35em] text-sky-500 font-semibold">Club Arcade</p>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">Games Lounge</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
                        Short, focused coding games to reset your brain between deep work sessions. Scores are local to this device so you can keep things casual.
                    </p>
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Arcade Leaderboard</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Club-wide scores updated in real time.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 space-y-2">
                        {leaderboardItems.map(item => (
                            <button
                                key={item.key}
                                onClick={() => setLeaderboardGameKey(item.key as keyof typeof gameMeta)}
                                className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition-all ${
                                    leaderboardGameKey === item.key
                                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-200'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">{item.label}</span>
                                    <span className="text-xs text-gray-400">{item.value}</span>
                                </div>
                                <p className="text-[10px] text-gray-400">{item.detail}</p>
                            </button>
                        ))}
                    </div>

                    <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Leaderboard</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{gameMeta[leaderboardGameKey].label}</p>
                            </div>
                            <button
                                onClick={() => loadLeaderboard(leaderboardGameKey)}
                                className="text-xs text-sky-500 hover:text-sky-600"
                            >
                                Refresh
                            </button>
                        </div>

                        {leaderboardLoading ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading leaderboard...</p>
                        ) : leaderboardError ? (
                            <p className="text-sm text-red-500 dark:text-red-400">{leaderboardError}</p>
                        ) : leaderboardEntries.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No scores yet. Be the first.</p>
                        ) : (
                            <div className="space-y-2">
                                {leaderboardEntries.map((entry, index) => (
                                    <div key={`${entry.userId}-${index}`} className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <img
                                            src={entry.userAvatarUrl || `https://i.pravatar.cc/40?u=${entry.userUsername}`}
                                            alt={entry.userName}
                                            className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.userName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">@{entry.userUsername}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                {entry.bestValue}{gameMeta[leaderboardGameKey].valueSuffix ? ` ${gameMeta[leaderboardGameKey].valueSuffix}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">How To Play</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Quick guides for every game.</p>
                    </div>
                    <button
                        onClick={() => setShowHelp(prev => !prev)}
                        className="text-xs text-sky-500 hover:text-sky-600"
                    >
                        {showHelp ? 'Hide tips' : 'Show tips'}
                    </button>
                </div>

                {showHelp && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {gameHelp.map(help => (
                            <div key={help.title} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{help.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{help.description}</p>
                                <div className="mt-2 space-y-1">
                                    {help.tips.map(tip => (
                                        <p key={tip} className="text-[11px] text-gray-400">- {tip}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-900 text-white text-sm font-semibold shadow-sm hover:opacity-90"
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

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Timer</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{mathTimeLeft}s</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={startMathTimer}
                                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700"
                            >
                                Start
                            </button>
                            <button
                                onClick={resetMathTimer}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Reset
                            </button>
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
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            placeholder="Type your answer"
                            disabled={!mathIsRunning || mathTimeLeft === 0}
                        />
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                className="flex-1 px-3 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold disabled:opacity-60"
                                disabled={!mathIsRunning || mathTimeLeft === 0}
                            >
                                Submit
                            </button>
                            <button
                                type="button"
                                onClick={skipMath}
                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
                                disabled={!mathIsRunning || mathTimeLeft === 0}
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
                            disabled={mathIsRunning}
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sequence Builder</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Drag the bot with step-by-step commands.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Best</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{sequenceBest ?? '--'}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Puzzle {sequenceIndex + 1} of {sequencePuzzles.length}</p>
                        <button
                            onClick={() => setSequenceIndex(prev => nextIndex(prev, sequencePuzzles.length))}
                            className="text-xs text-sky-500 hover:text-sky-600"
                        >
                            New Map
                        </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1 justify-center">
                        {Array.from({ length: currentSequence.size }).map((_, y) => (
                            Array.from({ length: currentSequence.size }).map((__, x) => {
                                const key = `${x}-${y}`;
                                const isStart = x === currentSequence.start.x && y === currentSequence.start.y;
                                const isGoal = x === currentSequence.goal.x && y === currentSequence.goal.y;
                                const isObstacle = currentSequence.obstacles.some(o => o.x === x && o.y === y);
                                const isBot = sequencePos.x === x && sequencePos.y === y;
                                const isVisited = sequencePath.has(positionKey({ x, y }));
                                let className = 'h-8 w-8 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-semibold';
                                if (isObstacle) className += ' bg-gray-200 dark:bg-gray-700 text-gray-500';
                                else if (isGoal) className += ' bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600';
                                else if (isStart) className += ' bg-blue-100 dark:bg-blue-900/40 text-blue-600';
                                else if (isVisited) className += ' bg-sky-50 dark:bg-sky-900/20 text-sky-500';
                                if (isBot) className += ' ring-2 ring-sky-500';
                                return (
                                    <div key={key} className={className}>
                                        {isBot ? 'R' : isGoal ? 'G' : isStart ? 'S' : isObstacle ? 'X' : ''}
                                    </div>
                                );
                            })
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {(['U', 'D', 'L', 'R'] as Direction[]).map(cmd => (
                            <button
                                key={cmd}
                                onClick={() => addSequenceCommand(cmd)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {cmd}
                            </button>
                        ))}
                        <button
                            onClick={removeSequenceCommand}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Undo
                        </button>
                        <button
                            onClick={resetSequence}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {sequenceCommands.length === 0 ? (
                            <span className="text-xs text-gray-400">No steps yet.</span>
                        ) : (
                            sequenceCommands.map((cmd, index) => (
                                <span key={`${cmd}-${index}`} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-200">
                                    {cmd}
                                </span>
                            ))
                        )}
                    </div>

                    {sequenceResult && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sequenceResult}</p>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={runSequence}
                            className="px-3 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600"
                        >
                            Run
                        </button>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Loop Logic</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pick how many loops reach the target.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{loopStreak} / {loopBest}</p>
                            <button
                                onClick={nextLoop}
                                className="text-xs text-sky-500 hover:text-sky-600"
                            >
                                New Loop
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1 justify-center">
                        {Array.from({ length: currentLoop.size }).map((_, y) => (
                            Array.from({ length: currentLoop.size }).map((__, x) => {
                                const key = `${x}-${y}`;
                                const isStart = x === currentLoop.start.x && y === currentLoop.start.y;
                                const isGoal = x === currentLoop.goal.x && y === currentLoop.goal.y;
                                const isBot = loopPos.x === x && loopPos.y === y;
                                const isVisited = loopPath.has(positionKey({ x, y }));
                                let className = 'h-8 w-8 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-semibold';
                                if (isGoal) className += ' bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600';
                                else if (isStart) className += ' bg-blue-100 dark:bg-blue-900/40 text-blue-600';
                                else if (isVisited) className += ' bg-purple-50 dark:bg-purple-900/20 text-purple-500';
                                if (isBot) className += ' ring-2 ring-purple-500';
                                return (
                                    <div key={key} className={className}>
                                        {isBot ? 'R' : isGoal ? 'G' : isStart ? 'S' : ''}
                                    </div>
                                );
                            })
                        ))}
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300">{currentLoop.label}</p>
                    <div className="flex flex-wrap gap-2">
                        {currentLoop.options.map(option => (
                            <button
                                key={option}
                                onClick={() => evaluateLoop(option)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                                    loopChoice === option
                                        ? option === currentLoop.answer
                                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                            : 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {option}x
                            </button>
                        ))}
                    </div>

                    {loopFeedback && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{loopFeedback}</p>
                    )}
                </section>

                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Function Calls</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Combine mini-functions to reach the goal.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{functionStreak} / {functionBest}</p>
                            <button
                                onClick={nextFunctionPuzzle}
                                className="text-xs text-sky-500 hover:text-sky-600"
                            >
                                New Puzzle
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1 justify-center">
                        {Array.from({ length: currentFunction.size }).map((_, y) => (
                            Array.from({ length: currentFunction.size }).map((__, x) => {
                                const key = `${x}-${y}`;
                                const isStart = x === currentFunction.start.x && y === currentFunction.start.y;
                                const isGoal = x === currentFunction.goal.x && y === currentFunction.goal.y;
                                const isObstacle = currentFunction.obstacles.some(o => o.x === x && o.y === y);
                                const isBot = functionPos.x === x && functionPos.y === y;
                                const isVisited = functionPath.has(positionKey({ x, y }));
                                let className = 'h-8 w-8 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-semibold';
                                if (isObstacle) className += ' bg-gray-200 dark:bg-gray-700 text-gray-500';
                                else if (isGoal) className += ' bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600';
                                else if (isStart) className += ' bg-blue-100 dark:bg-blue-900/40 text-blue-600';
                                else if (isVisited) className += ' bg-amber-50 dark:bg-amber-900/20 text-amber-500';
                                if (isBot) className += ' ring-2 ring-amber-500';
                                return (
                                    <div key={key} className={className}>
                                        {isBot ? 'R' : isGoal ? 'G' : isStart ? 'S' : isObstacle ? 'X' : ''}
                                    </div>
                                );
                            })
                        ))}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Function A: {currentFunction.functions.A.join(' ')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Function B: {currentFunction.functions.B.join(' ')}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {functionCalls.map((call, index) => (
                            <select
                                key={`call-${index}`}
                                value={call}
                                onChange={(e) => updateFunctionCall(index, e.target.value)}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-2 py-1 text-xs text-gray-700 dark:text-gray-200"
                            >
                                <option value="A">Call A</option>
                                <option value="B">Call B</option>
                            </select>
                        ))}
                    </div>

                    {functionFeedback && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{functionFeedback}</p>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={runFunctions}
                            className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
                        >
                            Run
                        </button>
                    </div>
                </section>
            </div>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coordinate Target</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Click the grid cell matching the coordinate.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{coordStreak} / {coordBest}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Origin: <span className="font-semibold text-gray-700 dark:text-gray-200">{coordOriginBottom ? 'Bottom-left' : 'Top-left'}</span></span>
                    <span>Grid: <span className="font-semibold text-gray-700 dark:text-gray-200">{coordinateSize} x {coordinateSize}</span></span>
                    <span>Labels: <span className="font-semibold text-gray-700 dark:text-gray-200">{coordShowLabels ? 'On' : 'Off'}</span></span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Size</label>
                    <select
                        value={coordinateSize}
                        onChange={(e) => setCoordinateSize(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-2 py-1 text-xs text-gray-700 dark:text-gray-200"
                    >
                        {[6, 8, 10].map(size => (
                            <option key={size} value={size}>{size}x{size}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setCoordShowLabels(prev => !prev)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        {coordShowLabels ? 'Hide labels' : 'Show labels'}
                    </button>
                    <button
                        onClick={() => setCoordOriginBottom(prev => !prev)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Switch origin
                    </button>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Target: <span className="font-semibold">({coordTarget.x}, {coordTarget.y})</span>
                </p>

                <form onSubmit={submitCoordInput} className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={coordInput}
                        onChange={(e) => setCoordInput(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
                        placeholder="Enter coordinates like 2+1, 3+0"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
                    >
                        Submit
                    </button>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400">Use sums to calculate coordinates. Example: <span className="font-semibold">1+2, 4+0</span>.</p>

                <div className="grid gap-1 max-w-xs" style={{ gridTemplateColumns: `repeat(${coordinateSize}, minmax(0, 1fr))` }}>
                    {Array.from({ length: coordinateSize }).map((_, y) => (
                        Array.from({ length: coordinateSize }).map((__, x) => {
                            const displayY = coordOriginBottom ? coordinateSize - 1 - y : y;
                            return (
                                <button
                                    key={`${x}-${y}`}
                                    onClick={() => handleCoordClick(x, y)}
                                    className="h-8 w-8 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 hover:bg-sky-50 dark:hover:bg-sky-900/20"
                                >
                                    {coordShowLabels ? `${x},${displayY}` : ''}
                                </button>
                            );
                        })
                    ))}
                </div>

                {coordFeedback && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{coordFeedback}</p>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={resetCoordTarget}
                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        New Target
                    </button>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Output Prediction</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Read the snippet and pick the output.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{outputStreak} / {outputBest}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Timer</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{outputTimeLeft}s</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={startOutputTimer}
                                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700"
                            >
                                Start
                            </button>
                            <button
                                onClick={resetOutputTimer}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="text-xs text-gray-400 uppercase tracking-[0.2em]">{currentOutput.language}</div>
                    <pre className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                        <code>{currentOutput.code}</code>
                    </pre>

                    <p className="text-sm text-gray-700 dark:text-gray-300">{currentOutput.prompt}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentOutput.options.map((option, index) => {
                            const isSelected = outputSelected === index;
                            const isCorrect = outputSelected !== null && index === currentOutput.answer;
                            const base = 'px-3 py-2 rounded-xl border text-sm text-left transition-all';
                            const styles = isSelected
                                ? isCorrect
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                    : 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800';
                            return (
                                <button
                                    key={option}
                                    onClick={() => answerOutput(index)}
                                    className={`${base} ${styles} ${(!outputIsRunning || outputTimeLeft === 0) ? 'opacity-60 pointer-events-none' : ''}`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>

                    {outputFeedback && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{outputFeedback}</p>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={nextOutput}
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Next Challenge
                        </button>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bug Hunt</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Choose the fix that makes it work.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{bugStreak} / {bugBest}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Timer</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{bugTimeLeft}s</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={startBugTimer}
                                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700"
                            >
                                Start
                            </button>
                            <button
                                onClick={resetBugTimer}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="text-xs text-gray-400 uppercase tracking-[0.2em]">{currentBug.language}</div>
                    <pre className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                        <code>{currentBug.code}</code>
                    </pre>

                    <p className="text-sm text-gray-700 dark:text-gray-300">{currentBug.prompt}</p>
                    <div className="space-y-2">
                        {currentBug.options.map((option, index) => {
                            const isSelected = bugSelected === index;
                            const isCorrect = bugSelected !== null && index === currentBug.answer;
                            const base = 'w-full px-3 py-2 rounded-xl border text-sm text-left transition-all';
                            const styles = isSelected
                                ? isCorrect
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                    : 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800';
                            return (
                                <button
                                    key={option}
                                    onClick={() => answerBug(index)}
                                    className={`${base} ${styles} ${(!bugIsRunning || bugTimeLeft === 0) ? 'opacity-60 pointer-events-none' : ''}`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>

                    {bugFeedback && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{bugFeedback}</p>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={nextBug}
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Next Bug
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Games;

