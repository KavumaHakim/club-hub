import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ArenaSession } from './types';
import { cn } from '../../lib/utils';

interface ResultModalProps {
  session: ArenaSession;
  open: boolean;
  onClose: () => void;
  onRematch: () => void;
}

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

export const ResultModal: React.FC<ResultModalProps> = ({ session, open, onClose, onRematch }) => {
  const [copied, setCopied] = useState(false);
  const result = session.result;
  if (!result) return null;

  const isVictory = result.outcome === 'victory';
  const isDraw = result.outcome === 'draw';
  const isQuiz = result.totalQuestions != null;

  const handleCopy = async () => {
    const scoreLine = isQuiz ? ` Score ${result.selfCorrect}–${result.opponentCorrect} of ${result.totalQuestions}.` : '';
    const summary = `${session.player.name} ${isVictory ? 'won' : isDraw ? 'drew' : 'lost'} a ${session.matchType.toLowerCase()} Code Duel.${scoreLine} Rating ${signed(result.ratingDelta)}, XP +${result.xpEarned}.`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; nothing to show.
    }
  };

  const stats = [
    { label: 'Rating', value: signed(result.ratingDelta), tone: result.ratingDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-ch-accent' },
    { label: 'XP earned', value: `+${result.xpEarned}`, tone: '' },
    { label: 'Streak', value: `${session.activeStreak + result.streakDelta}`, tone: '' },
    isQuiz
      ? { label: 'Accuracy', value: `${Math.round(((result.selfCorrect ?? 0) / Math.max(1, result.totalQuestions ?? 1)) * 100)}%`, tone: '' }
      : { label: 'Accuracy', value: `${result.accuracy}%`, tone: '' },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-xl p-0">
        <div className="px-6 pb-6 pt-7 sm:px-8">
          <DialogHeader>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-muted">{session.matchType} duel · {session.problem.title}</p>
            <DialogTitle className={cn(
              'text-[40px] leading-none tracking-[-0.03em]',
              isVictory ? 'text-green-600 dark:text-green-400' : isDraw ? 'text-ch-text' : 'text-ch-accent',
            )}>
              {isVictory ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
            </DialogTitle>
            <DialogDescription className="max-w-md text-[13.5px] leading-relaxed">
              {isQuiz
                ? isVictory
                  ? 'You answered the most correctly. Sharp and fast.'
                  : isDraw
                    ? 'Tied on correct answers. Neither of you blinked.'
                    : 'Edged out on correct answers. Rematch and win it back.'
                : isVictory
                  ? 'Accepted under pressure, hidden tests and all.'
                  : 'Not this time. Look at what failed and go again.'}
            </DialogDescription>
          </DialogHeader>

          {isQuiz && (
            <div className="mt-6 flex items-stretch border-2 border-ch-rule">
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-accent">You</p>
                <p className="mt-0.5 text-[30px] font-extrabold leading-none tabular-nums">{result.selfCorrect}</p>
              </div>
              <div className="flex items-center px-3 text-[13px] font-extrabold text-ch-muted">vs</div>
              <div className="flex-1 border-l-2 border-ch-rule px-4 py-3 text-right">
                <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-violet">{session.opponent.name.split(' ')[0]}</p>
                <p className="mt-0.5 text-[30px] font-extrabold leading-none tabular-nums">{result.opponentCorrect}</p>
              </div>
            </div>
          )}
          {isQuiz && <p className="mt-1.5 text-[11px] text-ch-muted">Out of {result.totalQuestions} questions</p>}

          <div className="mt-5 grid grid-cols-2 border border-ch-divider sm:grid-cols-4">
            {stats.map((stat, i) => (
              <div key={stat.label} className={cn('px-3 py-2.5', i % 2 === 1 && 'border-l border-ch-divider', i > 1 && 'border-t border-ch-divider sm:border-t-0', i === 2 && 'sm:border-l')}>
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-ch-muted">{stat.label}</p>
                <p className={cn('mt-1 text-[18px] font-extrabold tabular-nums', stat.tone)}>{stat.value}</p>
              </div>
            ))}
          </div>

          {result.achievements.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Achievements</p>
              <div className="flex flex-wrap gap-1.5">
                {result.achievements.map((achievement) => (
                  <span key={achievement} className="border border-ch-divider px-2 py-1 text-[11.5px] font-semibold">{achievement}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-0 border-t-2 border-ch-rule sm:justify-stretch">
          <div className="flex w-full">
            <Button variant="ghost" className="h-12 flex-1" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy result'}
            </Button>
            <Button variant="ghost" className="h-12 flex-1 border-l border-ch-divider" onClick={onClose}>
              Close
            </Button>
            <Button className="h-12 flex-1" onClick={onRematch}>Rematch</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
