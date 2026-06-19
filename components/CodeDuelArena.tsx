import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, LayoutPanelLeft, Loader2, MonitorPlay, Swords, Users } from 'lucide-react';
import { User } from '../types';
import { DuelLobby } from './duel-arena/DuelLobby';
import { CodeEditorPanel } from './duel-arena/CodeEditorPanel';
import { OpponentPanel } from './duel-arena/OpponentPanel';
import { ProblemPanel } from './duel-arena/ProblemPanel';
import { QuizPanel } from './duel-arena/QuizPanel';
import { ResultModal } from './duel-arena/ResultModal';
import { SpectatorView } from './duel-arena/SpectatorView';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { formatTimer, getTimerTone } from './duel-arena/utils';
import { useArenaRuntime, useDuelArenaStore } from './duel-arena/useDuelArenaStore';
import { cn } from '../lib/utils';

interface CodeDuelArenaProps {
  currentUser: User;
  theme?: 'light' | 'dark';
}

const CodeDuelArena: React.FC<CodeDuelArenaProps> = ({ currentUser }) => {
  const hydrate = useDuelArenaStore((state) => state.hydrate);
  const phase = useDuelArenaStore((state) => state.phase);
  const preparingLabel = useDuelArenaStore((state) => state.preparingLabel);
  const session = useDuelArenaStore((state) => state.session);
  const role = useDuelArenaStore((state) => state.role);
  const isQuiz = useDuelArenaStore((state) => state.isQuiz);
  const quizIndex = useDuelArenaStore((state) => state.quizIndex);
  const totalQuestions = useDuelArenaStore((state) => state.questions.length);
  const activeLanguage = useDuelArenaStore((state) => state.activeLanguage);
  const resultModalOpen = useDuelArenaStore((state) => state.resultModalOpen);
  const liveBanner = useDuelArenaStore((state) => state.liveBanner);
  const leftCollapsed = useDuelArenaStore((state) => state.leftCollapsed);
  const rightCollapsed = useDuelArenaStore((state) => state.rightCollapsed);
  const activeMobilePanel = useDuelArenaStore((state) => state.activeMobilePanel);
  const togglePanel = useDuelArenaStore((state) => state.togglePanel);
  const setMobilePanel = useDuelArenaStore((state) => state.setMobilePanel);
  const setActiveLanguage = useDuelArenaStore((state) => state.setActiveLanguage);
  const sendQuickTaunt = useDuelArenaStore((state) => state.sendQuickTaunt);
  const sendChatMessage = useDuelArenaStore((state) => state.sendChatMessage);
  const dismissIntegrityOverlay = useDuelArenaStore((state) => state.dismissIntegrityOverlay);
  const closeResultModal = useDuelArenaStore((state) => state.closeResultModal);
  const leaveMatch = useDuelArenaStore((state) => state.leaveMatch);
  const rematch = useDuelArenaStore((state) => state.rematch);

  useArenaRuntime();

  useEffect(() => {
    hydrate(currentUser);
  }, [currentUser, hydrate]);

  const isPlayerArena = phase === 'arena' && session && role === 'player';
  const isSpectatorArena = phase === 'arena' && session && role === 'spectator';
  // Lobby scrolls internally; the live arena is a fixed, full-height layout.
  const scrollable = phase === 'lobby' || phase === 'preparing' || phase === 'loading';

  return (
    <div className={cn('relative flex h-full flex-col bg-gradient-to-b from-slate-950 via-[#0a0f24] to-slate-950 text-white', scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden')}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="arena-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[10%] top-[-7rem] h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute right-[6%] top-[14%] h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[35%] h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {phase === 'loading' ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Swords className="mx-auto h-8 w-8 text-cyan-300" />
              <p className="mt-3 text-sm text-slate-300">Opening the Duel Arena...</p>
            </div>
          </div>
        ) : null}

        {phase === 'lobby' ? <DuelLobby currentUser={currentUser} /> : null}

        {phase === 'preparing' ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <Card className="arena-panel w-full max-w-md p-8 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-300" />
              <h3 className="mt-5 text-xl font-semibold text-white">Preparing your duel</h3>
              <p className="mt-2 text-sm text-slate-300">{preparingLabel || 'Setting things up...'}</p>
              <p className="mt-4 text-xs text-slate-500">
                Building a fresh Python DSA problem with 20+ test cases matched to both players' levels.
              </p>
            </Card>
          </div>
        ) : null}

        {isSpectatorArena ? <SpectatorView /> : null}

        {isPlayerArena ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
            {/* Compact match bar (replaces the tall banner so everything fits without scrolling) */}
            <Card className="arena-panel shrink-0 px-3 py-2.5 sm:px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => void leaveMatch()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Lobby</span>
                  </Button>
                  <Swords className="h-4 w-4 shrink-0 text-cyan-300" />
                  <span className="truncate text-sm font-semibold text-white">{session!.problem.title}</span>
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">{session!.matchType}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
                    <Users className="h-3.5 w-3.5" />
                    {session!.spectators}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {isQuiz
                        ? session!.status === 'countdown' ? 'Starts in' : session!.status === 'finished' ? 'Final' : 'Question'
                        : session!.status === 'countdown' ? 'Starts in' : session!.status === 'finished' ? 'Final' : 'Time left'}
                    </p>
                    {isQuiz && session!.status !== 'countdown' ? (
                      <p className="font-mono text-xl font-semibold leading-none text-cyan-100">
                        {Math.min(quizIndex + 1, totalQuestions)}/{totalQuestions}
                      </p>
                    ) : (
                      <p className={cn('font-mono text-xl font-semibold leading-none', getTimerTone(session!.status, session!.timeRemaining), session!.timeRemaining <= 60 && session!.status !== 'finished' && 'animate-pulse')}>
                        {session!.status === 'countdown' ? `${session!.countdown}s` : formatTimer(session!.timeRemaining)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dual progress: you vs opponent */}
              <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:gap-3">
                {[
                  { p: session!.player, label: 'You', accent: 'cyan' as const },
                  { p: session!.opponent, label: session!.opponent.name, accent: 'rose' as const },
                ].map(({ p, label, accent }) => (
                  <div key={p.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className={cn('truncate font-medium', accent === 'cyan' ? 'text-cyan-200' : 'text-rose-200')}>{label}</span>
                      <span className="shrink-0 text-slate-400">{isQuiz ? `${p.testCasesPassed} correct` : `${p.testCasesPassed} passed${p.liveTyping ? ' · typing' : ''}`}</span>
                    </div>
                    <Progress value={p.progress} className="h-1.5" />
                  </div>
                ))}
              </div>

              <p className="mt-2 truncate text-center text-xs text-slate-400">{liveBanner}</p>
            </Card>

            {/* Mobile panel switcher */}
            <div className="shrink-0 xl:hidden">
              <Tabs value={activeMobilePanel} onValueChange={(value) => setMobilePanel(value as any)} className="w-full">
                <TabsList className={cn('grid w-full', isQuiz ? 'grid-cols-2' : 'grid-cols-3')}>
                  {!isQuiz && <TabsTrigger value="problem">Problem</TabsTrigger>}
                  <TabsTrigger value="editor">{isQuiz ? 'Quiz' : 'Editor'}</TabsTrigger>
                  <TabsTrigger value="intel">Opponent</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Desktop panel toggles */}
            <div className="hidden shrink-0 items-center justify-end gap-2 xl:flex">
              {!isQuiz && (
                <Button variant="secondary" size="sm" onClick={() => togglePanel('left')}>
                  <LayoutPanelLeft className="mr-1 h-4 w-4" />
                  {leftCollapsed ? 'Show Problem' : 'Hide Problem'}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => togglePanel('right')}>
                <MonitorPlay className="mr-1 h-4 w-4" />
                {rightCollapsed ? 'Show Intel' : 'Hide Intel'}
              </Button>
            </div>

            {isQuiz ? (
              <div className="grid min-h-0 flex-1 gap-2.5 sm:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
                <div className={`${activeMobilePanel !== 'intel' ? 'flex flex-col' : 'hidden'} min-h-0 xl:flex xl:flex-col`}>
                  <QuizPanel />
                </div>
                <div className={`${activeMobilePanel === 'intel' ? 'flex flex-col' : 'hidden'} min-h-0 xl:flex xl:flex-col ${rightCollapsed ? 'xl:hidden' : ''}`}>
                  <OpponentPanel session={session!} onSendQuickTaunt={sendQuickTaunt} onSendChatMessage={sendChatMessage} />
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-2.5 sm:gap-3 xl:grid-cols-[minmax(280px,330px)_minmax(0,1fr)_minmax(280px,330px)]">
                <div className={`${activeMobilePanel === 'problem' ? 'flex flex-col' : 'hidden'} min-h-0 xl:flex xl:flex-col ${leftCollapsed ? 'xl:hidden' : ''}`}>
                  <ProblemPanel session={session!} activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
                </div>

                <div className={`${activeMobilePanel === 'editor' ? 'flex flex-col' : 'hidden'} min-h-0 xl:flex xl:flex-col`}>
                  <CodeEditorPanel />
                </div>

                <div className={`${activeMobilePanel === 'intel' ? 'flex flex-col' : 'hidden'} min-h-0 xl:flex xl:flex-col ${rightCollapsed ? 'xl:hidden' : ''}`}>
                  <OpponentPanel session={session!} onSendQuickTaunt={sendQuickTaunt} onSendChatMessage={sendChatMessage} />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {isPlayerArena && session!.antiCheat.overlayVisible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm"
          >
            <Card className="max-w-lg border-amber-400/20 bg-slate-950/95 p-6 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-300" />
              <h3 className="mt-4 text-2xl font-semibold text-white">Fair play check</h3>
              <p className="mt-3 text-sm text-slate-300">
                {session!.antiCheat.overlayMessage || 'The arena noticed unusual activity. Keep the duel fair and continue.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Trust score: {session!.antiCheat.trustScore}%</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Focus warnings: {session!.antiCheat.focusWarnings}</span>
              </div>
              <div className="mt-6 flex justify-center">
                <Button onClick={dismissIntegrityOverlay}>Back to the duel</Button>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {session ? (
        <ResultModal
          session={session}
          open={resultModalOpen}
          onClose={closeResultModal}
          onRematch={() => void rematch()}
        />
      ) : null}
    </div>
  );
};

export default CodeDuelArena;
