import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Eye, LayoutPanelLeft, Loader2, MonitorPlay, Swords, Users } from 'lucide-react';
import { User } from '../types';
import { DuelLobby } from './duel-arena/DuelLobby';
import { CodeEditorPanel } from './duel-arena/CodeEditorPanel';
import { MatchStatusBanner } from './duel-arena/MatchStatusBanner';
import { OpponentPanel } from './duel-arena/OpponentPanel';
import { ProblemPanel } from './duel-arena/ProblemPanel';
import { ResultModal } from './duel-arena/ResultModal';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
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

  return (
    <div className="relative flex min-h-full flex-col overflow-y-auto bg-[#020617] text-white custom-scrollbar">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="arena-grid absolute inset-0 opacity-50" />
        <div className="absolute left-[12%] top-[-6rem] h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[8%] top-[18%] h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative flex-1">
        {phase === 'loading' ? (
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Swords className="mx-auto h-8 w-8 text-cyan-300" />
              <p className="mt-3 text-sm text-slate-300">Opening the Duel Arena...</p>
            </div>
          </div>
        ) : null}

        {phase === 'lobby' ? <DuelLobby currentUser={currentUser} /> : null}

        {phase === 'preparing' ? (
          <div className="flex h-full min-h-[400px] items-center justify-center p-4">
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

        {phase === 'arena' && session ? (
          <div className="flex flex-col gap-3 p-2.5 sm:gap-4 sm:p-4 lg:p-5">
            {/* Slim match header */}
            <Card className="arena-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => void leaveMatch()}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Lobby</span>
                </Button>
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm font-semibold text-white">{session.problem.title}</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex">{session.matchType}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {role === 'spectator' ? (
                  <Badge variant="secondary">
                    <Eye className="mr-1 h-3 w-3" />
                    Spectating
                  </Badge>
                ) : null}
                <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  <Users className="h-3 w-3" />
                  {session.spectators} watching
                </span>
              </div>
            </Card>

            <MatchStatusBanner session={session} liveBanner={liveBanner} />

            {/* Mobile panel switcher */}
            <div className="xl:hidden">
              <Tabs value={activeMobilePanel} onValueChange={(value) => setMobilePanel(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="problem">Problem</TabsTrigger>
                  <TabsTrigger value="editor">{role === 'spectator' ? 'Match' : 'Editor'}</TabsTrigger>
                  <TabsTrigger value="intel">Opponent</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Desktop panel toggles */}
            <div className="hidden items-center justify-end gap-2 xl:flex">
              <Button variant="secondary" size="sm" onClick={() => togglePanel('left')}>
                <LayoutPanelLeft className="mr-1 h-4 w-4" />
                {leftCollapsed ? 'Show Problem' : 'Hide Problem'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => togglePanel('right')}>
                <MonitorPlay className="mr-1 h-4 w-4" />
                {rightCollapsed ? 'Show Intel' : 'Hide Intel'}
              </Button>
            </div>

            <div className="grid flex-1 gap-3 sm:gap-4 xl:grid-cols-[minmax(280px,350px)_minmax(0,1fr)_minmax(280px,350px)] xl:min-h-[680px]">
              <div className={`${activeMobilePanel === 'problem' ? 'flex flex-col' : 'hidden'} min-h-[60vh] xl:min-h-0 xl:flex xl:flex-col ${leftCollapsed ? 'xl:hidden' : ''} h-full`}>
                <ProblemPanel session={session} activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
              </div>

              <div className={`${activeMobilePanel === 'editor' ? 'flex flex-col' : 'hidden'} min-h-[70vh] xl:min-h-0 xl:flex xl:flex-col h-full`}>
                <CodeEditorPanel />
              </div>

              <div className={`${activeMobilePanel === 'intel' ? 'flex flex-col' : 'hidden'} min-h-[60vh] xl:min-h-0 xl:flex xl:flex-col ${rightCollapsed ? 'xl:hidden' : ''} h-full`}>
                <OpponentPanel session={session} onSendQuickTaunt={sendQuickTaunt} onSendChatMessage={sendChatMessage} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {phase === 'arena' && session?.antiCheat.overlayVisible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm"
          >
            <Card className="max-w-lg border-amber-400/20 bg-slate-950/95 p-6 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-300" />
              <h3 className="mt-4 text-2xl font-semibold text-white">Fair play check</h3>
              <p className="mt-3 text-sm text-slate-300">
                {session.antiCheat.overlayMessage || 'The arena noticed unusual activity. Keep the duel fair and continue.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Trust score: {session.antiCheat.trustScore}%</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Focus warnings: {session.antiCheat.focusWarnings}</span>
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
