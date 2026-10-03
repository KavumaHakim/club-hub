import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Users } from 'lucide-react';
import { FormattedMessage } from '../FormattedMessage';
import InitialsTile from '../InitialsTile';
import { DuelQuizQuestion } from '../../services/geminiService';
import { ArenaParticipant } from './types';
import { colorFor, formatTimer, getTimerTone } from './utils';
import { useDuelArenaStore } from './useDuelArenaStore';
import { useArenaEditorTheme } from './arenaTheme';
import { defineSplitThemes } from '../../lib/monacoThemes';
import { cn } from '../../lib/utils';

const QUIZ_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
};

// Left player in the accent colour, right player in violet, as on the scoreboard.
type Side = 'accent' | 'violet';

const LiveCode: React.FC<{ code: string; waiting: string }> = ({ code, waiting }) => {
  const editorTheme = useArenaEditorTheme();
  if (!code.trim()) {
    return <div className="flex h-full items-center px-5 text-[13px] text-ch-muted">{waiting}</div>;
  }
  return (
    <Editor
      height="100%"
      theme={editorTheme}
      beforeMount={defineSplitThemes}
      language="python"
      value={code}
      options={{
        readOnly: true,
        domReadOnly: true,
        fontSize: 13,
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'none',
        wordWrap: 'on',
        padding: { top: 12, bottom: 12 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
};

const PlayerHeader: React.FC<{ player: ArenaParticipant; side: Side; isWinner: boolean; score: React.ReactNode }> = ({ player, side, isWinner, score }) => (
  <div className="flex h-[52px] flex-none items-stretch border-b border-ch-divider">
    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4 sm:px-5">
      <InitialsTile name={player.name} size={30} color={colorFor(player.id)} />
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-[13.5px] font-extrabold">
          <span className="truncate">{player.name}</span>
          {isWinner && <span className="flex-none text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-green-600 dark:text-green-400">Winner</span>}
        </p>
        <p className="truncate text-[11px] text-ch-muted">
          {player.rank} {player.division} · {player.rating}
          {player.liveTyping && <span className="text-green-600 dark:text-green-400"> · typing</span>}
        </p>
      </div>
    </div>
    <div className={cn('flex flex-none items-center border-l border-ch-divider px-4 text-[12px]', side === 'accent' ? 'text-ch-accent' : 'text-ch-violet')}>
      {score}
    </div>
  </div>
);

const ProgressLine: React.FC<{ value: number; side: Side }> = ({ value, side }) => (
  <div className="h-[3px] flex-none bg-ch-surface-2">
    <div className={cn('h-full transition-[width] duration-300', side === 'accent' ? 'bg-ch-accent' : 'bg-ch-violet')} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

interface ScreenProps {
  player: ArenaParticipant;
  code: string;
  isWinner: boolean;
  side: Side;
}

const PlayerScreen: React.FC<ScreenProps> = ({ player, code, isWinner, side }) => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden">
    <PlayerHeader player={player} side={side} isWinner={isWinner} score={<><span className="mr-1 font-extrabold">{player.testCasesPassed}</span> passed</>} />
    <div className="flex flex-none items-center justify-between border-b border-ch-divider px-4 py-1.5 text-[11px] text-ch-muted sm:px-5">
      <span className="truncate">{player.estimatedStatus}</span>
      <span className="flex-none tabular-nums">{Math.round(player.progress)}%</span>
    </div>
    <ProgressLine value={player.progress} side={side} />
    <div className="relative min-h-0 flex-1">
      <LiveCode code={code} waiting={`Waiting for ${player.name.split(' ')[0]} to start typing…`} />
    </div>
  </div>
);

interface QuizScreenProps {
  player: ArenaParticipant;
  question: DuelQuizQuestion | undefined;
  questionNumber: number;
  total: number;
  code: string;
  tests: { passed: number; total: number } | undefined;
  isWinner: boolean;
  side: Side;
}

const QuizSpectatorScreen: React.FC<QuizScreenProps> = ({ player, question, questionNumber, total, code, tests, isWinner, side }) => {
  const isCoding = question?.kind === 'coding';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PlayerHeader
        player={player}
        side={side}
        isWinner={isWinner}
        score={<><span className="mr-1 text-[15px] font-extrabold tabular-nums">{player.testCasesPassed}</span><span className="text-ch-muted">/ {total}</span></>}
      />

      {/* Current question */}
      <div className="flex-none border-b border-ch-divider px-4 py-3 sm:px-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">
            Question {Math.min(questionNumber, total)} / {total}
          </span>
          {question ? (
            <span className="flex-none text-[11px] text-ch-muted">
              {isCoding ? 'Coding' : QUIZ_TYPE_LABEL[(question as Extract<DuelQuizQuestion, { kind: 'quiz' }>).type] || 'Quiz'}
            </span>
          ) : null}
        </div>
        <div className="ch-scroll max-h-24 overflow-y-auto text-[13.5px] leading-relaxed">
          {question ? <FormattedMessage text={question.question} isUser={false} /> : <span className="text-ch-muted">Waiting for the next question…</span>}
        </div>
      </div>

      {/* Live code for coding questions, the score for quiz questions */}
      <div className="relative min-h-0 flex-1">
        {isCoding ? (
          <LiveCode code={code} waiting={`Waiting for ${player.name.split(' ')[0]} to start coding…`} />
        ) : (
          <div className="flex h-full flex-col justify-center px-5 sm:px-8">
            <p className="text-[12px] text-ch-muted">{player.estimatedStatus}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-[44px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{player.testCasesPassed}</span>
              <span className="text-[13px] text-ch-muted">of {total} correct</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer: this question's tests (coding) and overall progress */}
      {isCoding ? (
        <div className="flex flex-none items-center justify-between border-t border-ch-divider px-4 py-2 text-[11px] sm:px-5">
          <span className="text-ch-muted">Tests passed on this question</span>
          {tests ? (
            <span className={cn('font-extrabold tabular-nums', tests.passed === tests.total && tests.total > 0 ? 'text-green-600 dark:text-green-400' : 'text-ch-accent')}>
              {tests.passed} / {tests.total}
            </span>
          ) : (
            <span className="text-ch-muted">not run yet</span>
          )}
        </div>
      ) : null}
      <ProgressLine value={player.progress} side={side} />
    </div>
  );
};

export const SpectatorView: React.FC = () => {
  const session = useDuelArenaStore((state) => state.session);
  const liveCode = useDuelArenaStore((state) => state.liveCode);
  const isQuiz = useDuelArenaStore((state) => state.isQuiz);
  const questions = useDuelArenaStore((state) => state.questions);
  const liveQuestionIndex = useDuelArenaStore((state) => state.liveQuestionIndex);
  const liveTests = useDuelArenaStore((state) => state.liveTests);
  const totalQuestions = useDuelArenaStore((state) => state.questions.length);
  const leaveMatch = useDuelArenaStore((state) => state.leaveMatch);
  const [mobileSide, setMobileSide] = useState<'left' | 'right'>('left');

  if (!session) return null;

  const left = session.player;
  const right = session.opponent;
  const winnerId = session.result ? (session.result.outcome === 'victory' ? left.id : right.id) : null;
  const finished = session.status === 'finished';

  const screen = (p: ArenaParticipant, side: Side) =>
    isQuiz ? (
      <QuizSpectatorScreen
        player={p}
        question={questions[liveQuestionIndex[p.id] ?? 0]}
        questionNumber={(liveQuestionIndex[p.id] ?? 0) + 1}
        total={totalQuestions}
        code={liveCode[p.id] || ''}
        tests={liveTests[p.id]}
        isWinner={winnerId === p.id}
        side={side}
      />
    ) : (
      <PlayerScreen player={p} code={liveCode[p.id] || ''} isWinner={winnerId === p.id} side={side} />
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div className="flex h-[46px] flex-none items-stretch border-b-2 border-ch-rule">
        <button
          onClick={() => void leaveMatch()}
          className="flex flex-none items-center gap-1.5 border-r border-ch-divider px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text sm:px-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Lobby</span>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
          <span className="flex-none text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-accent">Watching</span>
          <span className="hidden truncate text-[14px] font-extrabold tracking-[-0.01em] sm:inline">{session.problem.title}</span>
        </div>
        <span className="hidden flex-none items-center gap-1.5 border-l border-ch-divider px-4 text-[11px] text-ch-muted sm:flex">
          <Users className="h-3.5 w-3.5" />
          {session.spectators} watching
        </span>
        <div className="flex w-[92px] flex-none flex-col items-center justify-center border-l-2 border-ch-rule sm:w-[112px]">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">{finished ? 'Final' : 'Time left'}</p>
          <p className={cn('text-[17px] font-extrabold leading-tight tabular-nums', getTimerTone(session.status, session.timeRemaining))}>
            {session.status === 'countdown' ? `${session.countdown}s` : formatTimer(session.timeRemaining)}
          </p>
        </div>
      </div>

      {/* Mobile screen switcher */}
      <div className="flex h-10 flex-none items-stretch border-b-2 border-ch-rule lg:hidden">
        {([['left', left], ['right', right]] as const).map(([side, p], i) => (
          <button
            key={side}
            onClick={() => setMobileSide(side)}
            className={cn(
              'flex flex-1 items-center justify-center truncate px-3 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors',
              i > 0 && 'border-l border-ch-divider',
              mobileSide === side ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text',
            )}
          >
            {p.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Screens: side by side on desktop, one at a time on mobile */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <div className={cn('min-h-0', mobileSide === 'left' ? 'block' : 'hidden', 'lg:block')}>{screen(left, 'accent')}</div>
        <div className={cn('min-h-0 lg:border-l-2 lg:border-ch-rule', mobileSide === 'right' ? 'block' : 'hidden', 'lg:block')}>{screen(right, 'violet')}</div>
      </div>
    </div>
  );
};
