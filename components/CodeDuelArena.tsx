import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Loader2, Users } from 'lucide-react';
import { User } from '../types';
import { DuelLobby } from './duel-arena/DuelLobby';
import { CodeEditorPanel } from './duel-arena/CodeEditorPanel';
import { OpponentPanel } from './duel-arena/OpponentPanel';
import { ProblemPanel } from './duel-arena/ProblemPanel';
import { QuizPanel } from './duel-arena/QuizPanel';
import { ResultModal } from './duel-arena/ResultModal';
import { SpectatorView } from './duel-arena/SpectatorView';
import { Button } from './ui/button';
import { formatTimer, getTimerTone } from './duel-arena/utils';
import { useArenaRuntime, useDuelArenaStore } from './duel-arena/useDuelArenaStore';
import { ArenaThemeContext } from './duel-arena/arenaTheme';
import { ResizeHandle, useResizableWidth } from './duel-arena/ResizeHandle';
import { cn } from '../lib/utils';

interface CodeDuelArenaProps {
  currentUser: User;
  theme?: 'light' | 'dark';
}

const CodeDuelArena: React.FC<CodeDuelArenaProps> = ({ currentUser, theme = 'dark' }) => {
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

  // Desktop (xl): the side panels can be dragged wider or narrower; the code
  // editor takes the rest, never less than MIN_EDITOR.
  const MIN_EDITOR = 420;
  const panelsRef = useRef<HTMLDivElement>(null);
  const rightPanel = useResizableWidth('duel_panel_right_px', { initial: 340, min: 260, max: 640, grow: -1 }, panelsRef);
  const leftPanel = useResizableWidth('duel_panel_left_px', { initial: 320, min: 240, max: 560, grow: 1 }, panelsRef);

  useEffect(() => {
    hydrate(currentUser);
  }, [currentUser, hydrate]);

  const isPlayerArena = phase === 'arena' && session && role === 'player';
  const isSpectatorArena = phase === 'arena' && session && role === 'spectator';
  const scorePct = (p: { progress: number }) => Math.max(0, Math.min(100, p.progress));

  return (
    <ArenaThemeContext.Provider value={theme}>
    <div className="relative flex h-full flex-col overflow-hidden bg-ch-bg text-ch-text">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {phase === 'loading' ? (
          <div className="flex flex-1 items-center px-6 sm:px-12">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-muted">Opening the Duel Arena…</p>
          </div>
        ) : null}

        {phase === 'lobby' ? <DuelLobby currentUser={currentUser} /> : null}

        {phase === 'preparing' ? (
          <div className="ch-scroll flex flex-1 flex-col justify-center overflow-y-auto px-6 py-12 sm:px-16">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing your duel
            </p>
            <h3 className="mb-2 text-[28px] font-extrabold tracking-[-0.02em]">{preparingLabel || 'Setting things up…'}</h3>
            <p className="max-w-md text-[13.5px] leading-relaxed text-ch-muted">
              A fresh set of quick quiz and short coding questions, set in everyday life and matched to both players' levels.
            </p>
          </div>
        ) : null}

        {isSpectatorArena ? <SpectatorView /> : null}

        {isPlayerArena ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Match bar */}
            <div className="flex h-[46px] flex-none items-stretch border-b-2 border-ch-rule">
              <button
                onClick={() => void leaveMatch()}
                className="flex flex-none items-center gap-1.5 border-r border-ch-divider px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text sm:px-5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lobby</span>
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
                <span className="truncate text-[14px] font-extrabold tracking-[-0.01em]">{session!.problem.title}</span>
                <span className="hidden flex-none text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-accent sm:inline">{session!.matchType}</span>
              </div>
              <span className="hidden flex-none items-center gap-1.5 border-l border-ch-divider px-4 text-[11px] text-ch-muted sm:flex">
                <Users className="h-3.5 w-3.5" />
                {session!.spectators} watching
              </span>
              <button
                onClick={() => togglePanel('right')}
                className="hidden flex-none items-center border-l border-ch-divider px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text xl:flex"
              >
                {rightCollapsed ? 'Show opponent' : 'Hide opponent'}
              </button>
              {!isQuiz && (
                <button
                  onClick={() => togglePanel('left')}
                  className="hidden flex-none items-center border-l border-ch-divider px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text xl:flex"
                >
                  {leftCollapsed ? 'Show problem' : 'Hide problem'}
                </button>
              )}
              <div className="flex w-[92px] flex-none flex-col items-center justify-center border-l-2 border-ch-rule sm:w-[112px]">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">
                  {session!.status === 'countdown' ? 'Starts in' : session!.status === 'finished' ? 'Final' : isQuiz ? 'Question' : 'Time left'}
                </p>
                {isQuiz && session!.status !== 'countdown' ? (
                  <p className="text-[17px] font-extrabold leading-tight tabular-nums">
                    {Math.min(quizIndex + 1, totalQuestions)}/{totalQuestions}
                  </p>
                ) : (
                  <p className={cn('text-[17px] font-extrabold leading-tight tabular-nums', getTimerTone(session!.status, session!.timeRemaining))}>
                    {session!.status === 'countdown' ? `${session!.countdown}s` : formatTimer(session!.timeRemaining)}
                  </p>
                )}
              </div>
            </div>

            {/* Scoreboard: you vs opponent */}
            <div className="flex flex-none items-stretch border-b border-ch-divider">
              {[
                { p: session!.player, label: 'You', you: true },
                { p: session!.opponent, label: session!.opponent.name, you: false },
              ].map(({ p, label, you }, i) => (
                <div key={p.id} className={cn('min-w-0 flex-1 px-4 py-2.5 sm:px-6', i === 1 && 'border-l border-ch-divider')}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className={cn('truncate text-[12px] font-extrabold', you ? 'text-ch-accent' : '')}>{label}</span>
                    <span className="flex-none text-[11px] text-ch-muted">
                      <span className="font-extrabold text-ch-text">{p.testCasesPassed}</span>
                      {isQuiz ? ' correct' : ` passed${p.liveTyping ? ' · typing' : ''}`}
                    </span>
                  </div>
                  <div className="h-[3px] bg-ch-surface-2">
                    <div className={cn('h-full transition-[width] duration-300', you ? 'bg-ch-accent' : 'bg-ch-violet')} style={{ width: `${scorePct(p)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {liveBanner && (
              <p className="flex-none truncate border-b border-ch-divider bg-ch-surface px-4 py-1.5 text-center text-[11.5px] text-ch-muted sm:px-6">{liveBanner}</p>
            )}

            {/* Mobile panel switcher */}
            <div className="flex h-10 flex-none items-stretch border-b-2 border-ch-rule xl:hidden">
              {(isQuiz ? (['editor', 'intel'] as const) : (['problem', 'editor', 'intel'] as const)).map((panel, i) => (
                <button
                  key={panel}
                  onClick={() => setMobilePanel(panel)}
                  className={cn(
                    'flex flex-1 items-center justify-center text-[11px] font-bold uppercase tracking-[0.08em] transition-colors',
                    i > 0 && 'border-l border-ch-divider',
                    activeMobilePanel === panel ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text',
                  )}
                >
                  {panel === 'problem' ? 'Problem' : panel === 'editor' ? (isQuiz ? 'Quiz' : 'Editor') : 'Opponent'}
                </button>
              ))}
            </div>

            {(() => {
              const showLeft = !isQuiz && !leftCollapsed;
              const showRight = !rightCollapsed;
              // Room the rest of the row needs while one side panel is dragged.
              const rightOthers = MIN_EDITOR + (showLeft ? leftPanel.width + 6 : 0) + 6;
              const leftOthers = MIN_EDITOR + (showRight ? rightPanel.width + 6 : 0) + 6;
              const side = (on: boolean) => (on ? 'flex flex-col' : 'hidden');
              return (
                <div
                  ref={panelsRef}
                  className="flex min-h-0 flex-1 flex-col xl:flex-row"
                  style={{ '--duel-left': `${leftPanel.width}px`, '--duel-right': `${rightPanel.width}px` } as React.CSSProperties}
                >
                  {!isQuiz && (
                    <>
                      <div className={`${side(activeMobilePanel === 'problem')} min-h-0 flex-1 xl:w-[var(--duel-left)] xl:flex-none ${leftCollapsed ? 'xl:hidden' : 'xl:flex'}`}>
                        <ProblemPanel session={session!} activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
                      </div>
                      {showLeft && (
                        <ResizeHandle
                          className="hidden xl:block"
                          label="Problem panel width"
                          value={leftPanel.width}
                          min={240}
                          max={560}
                          widensWith="right"
                          onPointerDown={(e) => leftPanel.startDrag(e, leftOthers)}
                          onNudge={(d) => leftPanel.nudge(d, leftOthers)}
                          onReset={leftPanel.reset}
                        />
                      )}
                    </>
                  )}

                  <div className={`${side(isQuiz ? activeMobilePanel !== 'intel' : activeMobilePanel === 'editor')} min-h-0 min-w-0 flex-1 xl:flex`}>
                    {isQuiz ? <QuizPanel /> : <CodeEditorPanel />}
                  </div>

                  {showRight && (
                    <ResizeHandle
                      className="hidden xl:block"
                      label="Opponent panel width"
                      value={rightPanel.width}
                      min={260}
                      max={640}
                      widensWith="left"
                      onPointerDown={(e) => rightPanel.startDrag(e, rightOthers)}
                      onNudge={(d) => rightPanel.nudge(d, rightOthers)}
                      onReset={rightPanel.reset}
                    />
                  )}
                  <div className={`${side(activeMobilePanel === 'intel')} min-h-0 flex-1 xl:w-[var(--duel-right)] xl:flex-none ${rightCollapsed ? 'xl:hidden' : 'xl:flex'}`}>
                    <OpponentPanel session={session!} onSendQuickTaunt={sendQuickTaunt} onSendChatMessage={sendChatMessage} />
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {isPlayerArena && session!.antiCheat.overlayVisible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
          >
            <div className="w-full max-w-lg border-2 border-ch-rule bg-ch-bg p-6 text-ch-text">
              <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">
                <AlertTriangle className="h-3.5 w-3.5" /> Fair play check
              </p>
              <p className="text-[15px] leading-relaxed">
                {session!.antiCheat.overlayMessage || 'The arena noticed unusual activity. Keep the duel fair and continue.'}
              </p>
              <div className="mt-4 flex border border-ch-divider text-[12px]">
                <span className="flex-1 px-3 py-2 text-ch-muted">Trust score <span className="font-extrabold text-ch-text">{session!.antiCheat.trustScore}%</span></span>
                <span className="flex-1 border-l border-ch-divider px-3 py-2 text-ch-muted">Focus warnings <span className="font-extrabold text-ch-text">{session!.antiCheat.focusWarnings}</span></span>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={dismissIntegrityOverlay}>Back to the duel</Button>
              </div>
            </div>
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
    </ArenaThemeContext.Provider>
  );
};

export default CodeDuelArena;
