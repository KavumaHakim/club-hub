import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Flame, Share2, Sparkles, Sword, Trophy } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ArenaSession } from './types';

interface ResultModalProps {
  session: ArenaSession;
  open: boolean;
  onClose: () => void;
  onRematch: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ session, open, onClose, onRematch }) => {
  const result = session.result;
  if (!result) return null;

  const isVictory = result.outcome === 'victory';
  const isDraw = result.outcome === 'draw';
  const isQuiz = result.totalQuestions != null;

  const handleShare = async () => {
    const scoreLine = isQuiz ? ` Score ${result.selfCorrect}–${result.opponentCorrect} of ${result.totalQuestions}.` : '';
    const summary = `${session.player.name} ${isVictory ? 'won' : isDraw ? 'drew' : 'lost'} a ${session.matchType.toLowerCase()} Code Duel.${scoreLine} Rating ${result.ratingDelta >= 0 ? '+' : ''}${result.ratingDelta}, XP +${result.xpEarned}.`;
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // noop
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={`overflow-hidden border-white/10 bg-slate-950/95 p-0 ${isVictory ? '' : 'glitch-defeat'}`}>
        <div className={`absolute inset-0 ${isVictory ? 'bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_38%)]' : 'bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_38%)]'}`} />
        <div className="relative p-6 sm:p-8">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Badge variant={isVictory ? 'success' : isDraw ? 'secondary' : 'danger'}>
                {isVictory ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
              </Badge>
              <Badge variant="secondary">{session.matchType}</Badge>
            </div>
            <DialogTitle className="mt-3 flex items-center gap-3 text-3xl">
              {isVictory ? <Sparkles className="h-7 w-7 text-emerald-300" /> : <Sword className="h-7 w-7 text-rose-300" />}
              {isVictory ? 'Arena cleared' : isDraw ? 'A dead heat' : 'The chamber fights back'}
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-slate-300">
              {isQuiz
                ? isVictory
                  ? 'You answered the most correctly. Sharp and fast.'
                  : isDraw
                    ? 'Tied on correct answers — neither duelist blinked.'
                    : 'Edged out on correct answers. Rematch and reclaim it.'
                : isVictory
                  ? 'Accepted under pressure. Your route planner held when hidden tests turned hostile.'
                  : 'Pressure data captured. Review the replay, tighten the state pruning, and queue again.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rating</p>
                  <p className={`mt-2 text-2xl font-semibold ${result.ratingDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {result.ratingDelta >= 0 ? '+' : ''}
                    {result.ratingDelta}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">XP Earned</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-100">+{result.xpEarned}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{isQuiz ? 'Your score' : 'Accuracy'}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {isQuiz ? `${result.selfCorrect}/${result.totalQuestions}` : `${result.accuracy}%`}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{isQuiz ? 'Opponent' : 'Typing Speed'}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {isQuiz ? `${result.opponentCorrect}/${result.totalQuestions}` : `${result.typingSpeed} wpm`}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <BarChart3 className="h-3.5 w-3.5" />
                Match Breakdown
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                  <span className="text-sm text-slate-400">{isQuiz ? 'Correct answers' : 'Runtime'}</span>
                  <span className="text-sm font-semibold text-white">{isQuiz ? `${result.selfCorrect}/${result.totalQuestions}` : `${result.runtimeMs}ms`}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                  <span className="text-sm text-slate-400">Streak shift</span>
                  <span className={`text-sm font-semibold ${result.streakDelta >= 0 ? 'text-amber-200' : 'text-rose-300'}`}>
                    {result.streakDelta >= 0 ? '+' : ''}
                    {result.streakDelta}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                  <span className="text-sm text-slate-400">{isQuiz ? 'Opponent correct' : 'Opponent runtime'}</span>
                  <span className="text-sm font-semibold text-white">{isQuiz ? `${result.opponentCorrect}/${result.totalQuestions}` : `${session.opponent.runtimeMs}ms`}</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <Trophy className="h-3.5 w-3.5" />
              Achievements Unlocked
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.achievements.map((achievement) => (
                <Badge key={achievement} variant={isVictory ? 'success' : 'secondary'}>
                  {achievement}
                </Badge>
              ))}
              <Badge variant="secondary">
                <Flame className="mr-1 h-3 w-3" />
                {session.activeStreak + result.streakDelta} current streak
              </Badge>
            </div>
          </div>

          <DialogFooter className="mt-8">
            <Button variant="secondary" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Share Result
            </Button>
            <Button onClick={onRematch}>Rematch</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
