import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Code2, Loader2, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { FormattedMessage } from '../FormattedMessage';
import { useDuelArenaStore } from './useDuelArenaStore';
import { useArenaEditorTheme } from './arenaTheme';
import { defineSplitThemes } from '../../lib/monacoThemes';
import { warmUpPython } from '../../services/sandboxRunner';
import { cn } from '../../lib/utils';

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
};

export const QuizPanel: React.FC = () => {
  const session = useDuelArenaStore((s) => s.session);
  const questions = useDuelArenaStore((s) => s.questions);
  const quizIndex = useDuelArenaStore((s) => s.quizIndex);
  const answerLocked = useDuelArenaStore((s) => s.answerLocked);
  const gradingAnswer = useDuelArenaStore((s) => s.gradingAnswer);
  const answerFeedback = useDuelArenaStore((s) => s.answerFeedback);
  const codingDraft = useDuelArenaStore((s) => s.codingDraft);
  const selfCorrect = useDuelArenaStore((s) => s.selfCorrect);
  const answeredCount = useDuelArenaStore((s) => s.answeredCount);
  const questionDeadlineMs = useDuelArenaStore((s) => s.questionDeadlineMs);
  const selfFinished = useDuelArenaStore((s) => s.selfFinished);
  const submitAnswer = useDuelArenaStore((s) => s.submitAnswer);
  const setCodingDraft = useDuelArenaStore((s) => s.setCodingDraft);

  const editorTheme = useArenaEditorTheme();
  const [selected, setSelected] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  const question = questions[quizIndex];
  const total = questions.length;

  // Load Python now, so the first coding question doesn't wait for the download.
  const hasCoding = questions.some((q) => q.kind === 'coding');
  useEffect(() => {
    if (hasCoding) warmUpPython();
  }, [hasCoding]);

  // Reset the local selection whenever we move to a new question.
  useEffect(() => {
    setSelected('');
  }, [quizIndex]);

  // Local 250ms tick so the per-question countdown stays live.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  if (!session) return null;

  const countingDown = session.status === 'countdown';
  const secondsLeft =
    answerLocked || !questionDeadlineMs ? 0 : Math.max(0, Math.ceil((questionDeadlineMs - nowTick) / 1000));

  // --- Countdown before the round starts ---
  if (countingDown) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-center px-6 py-10 sm:px-12">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Get ready</p>
        <p className="text-[56px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{session.countdown}s</p>
        <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-ch-muted">
          {total} rapid questions. Each has its own timer. Answer fast: most correct wins.
        </p>
      </div>
    );
  }

  // --- Finished all questions, waiting on opponent / result ---
  if (selfFinished || answeredCount >= total) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-center px-6 py-10 sm:px-12">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">
          {session.status === 'finished' ? 'Duel over' : 'You finished'}
        </p>
        <p className="text-[28px] font-extrabold tracking-[-0.02em]">{selfCorrect} of {total} correct</p>
        <p className="mt-2 text-[13.5px] text-ch-muted">
          {session.status === 'finished' ? 'The duel is over.' : `Waiting for ${session.opponent.name} to finish…`}
        </p>
        <div className="mt-6 flex max-w-sm items-stretch border-2 border-ch-rule text-[13px]">
          <div className="flex-1 px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-accent">You</p>
            <p className="mt-0.5 text-[24px] font-extrabold tabular-nums">{selfCorrect}</p>
          </div>
          <div className="flex-1 border-l-2 border-ch-rule px-4 py-3">
            <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">{session.opponent.name.split(' ')[0]}</p>
            <p className="mt-0.5 text-[24px] font-extrabold tabular-nums">{session.opponent.testCasesPassed}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const isCoding = question.kind === 'coding';
  const canSubmit = !answerLocked && !gradingAnswer && (isCoding ? codingDraft.trim().length > 0 : selected.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitAnswer(isCoding ? '' : selected);
  };

  const renderInput = () => {
    if (isCoding) {
      return (
        <div className="h-full min-h-[220px] overflow-hidden border border-ch-divider">
          <Editor
            height="100%"
            theme={editorTheme}
            beforeMount={defineSplitThemes}
            language="python"
            value={codingDraft}
            onChange={(value) => setCodingDraft(value || '')}
            options={{
              readOnly: answerLocked,
              fontSize: 14,
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            }}
          />
        </div>
      );
    }

    if (question.type === 'SHORT_ANSWER') {
      return (
        <textarea
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={answerLocked}
          rows={3}
          placeholder="Type your answer…"
          className="w-full resize-none border border-ch-divider bg-ch-bg p-4 font-mono text-[13.5px] text-ch-text outline-none placeholder:text-ch-muted focus:border-ch-accent disabled:opacity-60"
        />
      );
    }

    const options = question.type === 'TRUE_FALSE' ? ['True', 'False'] : question.options || [];
    return (
      <div className={cn('grid gap-2', question.type === 'TRUE_FALSE' ? 'grid-cols-2' : 'grid-cols-1')}>
        {options.map((opt, idx) => {
          const active = selected === opt;
          return (
            <button
              key={`${opt}-${idx}`}
              onClick={() => !answerLocked && setSelected(opt)}
              disabled={answerLocked}
              className={cn(
                'flex items-stretch border text-left text-[14px] transition-colors duration-100 disabled:cursor-not-allowed',
                question.type === 'TRUE_FALSE' && 'justify-center',
                active
                  ? 'border-ch-accent bg-ch-accent-soft'
                  : 'border-ch-divider hover:bg-ch-surface',
              )}
            >
              {question.type !== 'TRUE_FALSE' && (
                <span className={cn(
                  'flex w-10 shrink-0 items-center justify-center border-r text-[12px] font-extrabold',
                  active ? 'border-ch-accent bg-ch-accent text-ch-on-accent' : 'border-ch-divider text-ch-muted',
                )}>
                  {String.fromCharCode(65 + idx)}
                </span>
              )}
              <span className="px-4 py-3 font-semibold">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header: question number, type, score, per-question timer */}
      <div className="flex h-[46px] flex-none items-stretch border-b border-ch-divider">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ch-accent">
            Question {quizIndex + 1} / {total}
          </span>
          <span className="hidden truncate text-[11px] text-ch-muted sm:inline">
            {isCoding ? 'Coding' : TYPE_LABEL[question.type]}
          </span>
        </div>
        <div className="flex flex-none items-center border-l border-ch-divider px-4 text-[12px] text-ch-muted">
          <span className="mr-1.5 font-extrabold text-green-600 dark:text-green-400">{selfCorrect}</span> correct
        </div>
        <div
          className={cn(
            'flex w-[72px] flex-none items-center justify-center border-l border-ch-divider text-[18px] font-extrabold tabular-nums',
            secondsLeft <= 5 && !answerLocked ? 'bg-ch-accent text-ch-on-accent' : '',
          )}
        >
          {answerLocked ? '—' : `${secondsLeft}s`}
        </div>
      </div>
      <Progress className="h-[3px] flex-none" value={total ? (answeredCount / total) * 100 : 0} />

      {/* Question + input */}
      <div className="ch-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="text-[17px] font-bold leading-relaxed">
          <FormattedMessage text={question.question} isUser={false} />
        </div>
        <div className={cn('min-h-0', isCoding ? 'flex-1' : '')}>{renderInput()}</div>
      </div>

      {/* Feedback / submit */}
      <div className="flex-none border-t-2 border-ch-rule px-4 py-3 sm:px-6">
        <AnimatePresence mode="wait">
          {answerFeedback ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex min-h-10 flex-wrap items-baseline gap-x-4 gap-y-1"
            >
              {gradingAnswer ? (
                <span className="flex items-center gap-2 text-[13px] text-ch-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> {answerFeedback.message}
                </span>
              ) : (
                <>
                  <span className={cn(
                    'text-[22px] font-extrabold tracking-[-0.02em]',
                    answerFeedback.correct ? 'text-green-600 dark:text-green-400' : 'text-ch-accent',
                  )}>
                    {answerFeedback.message}
                  </span>
                  {answerFeedback.expected ? (
                    <span className="text-[12.5px] text-ch-muted">Answer: <span className="font-mono text-ch-text">{answerFeedback.expected}</span></span>
                  ) : null}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button className="h-10 w-full" onClick={handleSubmit} disabled={!canSubmit}>
                {isCoding ? <Code2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {isCoding ? 'Run & Submit' : 'Lock in answer'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
