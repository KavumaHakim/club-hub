import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, Code2, Loader2, Send, Trophy, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { FormattedMessage } from '../FormattedMessage';
import { useDuelArenaStore } from './useDuelArenaStore';
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

  const [selected, setSelected] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  const question = questions[quizIndex];
  const total = questions.length;

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
      <Card className="arena-panel flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
        <Clock className="h-10 w-10 text-cyan-300" />
        <p className="mt-4 text-2xl font-semibold text-white">Starting in {session.countdown}s</p>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          {total} rapid questions. Each has its own timer — answer fast, most correct wins.
        </p>
      </Card>
    );
  }

  // --- Finished all questions, waiting on opponent / result ---
  if (selfFinished || answeredCount >= total) {
    return (
      <Card className="arena-panel flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
        <Trophy className="h-10 w-10 text-emerald-300" />
        <p className="mt-4 text-2xl font-semibold text-white">
          You finished — {selfCorrect}/{total} correct
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {session.status === 'finished'
            ? 'The duel is over.'
            : `Waiting for ${session.opponent.name} to finish…`}
        </p>
        <div className="mt-5 flex items-center gap-3 text-sm">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-cyan-100">
            You {selfCorrect}
          </span>
          <span className="text-slate-500">vs</span>
          <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-rose-100">
            {session.opponent.name.split(' ')[0]} {session.opponent.testCasesPassed}
          </span>
        </div>
      </Card>
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
        <div className="h-full min-h-[220px] overflow-hidden rounded-2xl border border-white/10">
          <Editor
            height="100%"
            theme="vs-dark"
            language="python"
            value={codingDraft}
            onChange={(value) => setCodingDraft(value || '')}
            options={{
              readOnly: answerLocked,
              fontSize: 14,
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
          className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 p-4 font-mono text-sm text-slate-100 outline-none focus:border-cyan-400/40 disabled:opacity-60"
        />
      );
    }

    const options = question.type === 'TRUE_FALSE' ? ['True', 'False'] : question.options || [];
    return (
      <div className={cn('grid gap-2.5', question.type === 'TRUE_FALSE' ? 'grid-cols-2' : 'grid-cols-1')}>
        {options.map((opt, idx) => {
          const active = selected === opt;
          return (
            <button
              key={`${opt}-${idx}`}
              onClick={() => !answerLocked && setSelected(opt)}
              disabled={answerLocked}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed',
                active
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/25 hover:text-white',
              )}
            >
              {question.type !== 'TRUE_FALSE' && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                  {active ? <span className="h-2.5 w-2.5 rounded-full bg-current" /> : String.fromCharCode(65 + idx)}
                </span>
              )}
              <span className="font-medium">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="arena-panel flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header: progress + per-question timer + score */}
      <div className="border-b border-white/10 bg-slate-950/90 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Question {quizIndex + 1} / {total}
            </span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {isCoding ? 'Coding' : TYPE_LABEL[question.type]}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {selfCorrect}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 font-mono text-lg font-semibold leading-none',
                secondsLeft <= 5 && !answerLocked ? 'text-rose-300 animate-pulse' : 'text-slate-200',
              )}
            >
              <Clock className="h-4 w-4" />
              {answerLocked ? '—' : `${secondsLeft}s`}
            </span>
          </div>
        </div>
        <Progress className="mt-2.5 h-1.5" value={total ? (answeredCount / total) * 100 : 0} />
      </div>

      {/* Question + input */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto custom-scrollbar p-4 sm:p-5">
        <div className="text-base font-medium leading-relaxed text-white">
          <FormattedMessage text={question.question} isUser={false} />
        </div>
        <div className={cn('min-h-0', isCoding ? 'flex-1' : '')}>{renderInput()}</div>
      </div>

      {/* Feedback / submit */}
      <div className="border-t border-white/10 bg-slate-950/70 p-4">
        <AnimatePresence mode="wait">
          {answerFeedback ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={cn(
                'flex items-start gap-3 rounded-2xl border p-3 text-sm',
                gradingAnswer
                  ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
                  : answerFeedback.correct
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                    : 'border-rose-400/30 bg-rose-500/10 text-rose-100',
              )}
            >
              {gradingAnswer ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : answerFeedback.correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <p className="font-semibold">{answerFeedback.message}</p>
                {answerFeedback.expected ? (
                  <p className="mt-0.5 text-xs opacity-80">Answer: {answerFeedback.expected}</p>
                ) : null}
              </div>
            </motion.div>
          ) : (
            <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
                {isCoding ? <Code2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {isCoding ? 'Run & Submit' : 'Lock in answer'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};
