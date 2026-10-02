import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import InitialsTile from '../InitialsTile';
import { ArenaSession } from './types';
import { colorFor, getIntegrityTone } from './utils';
import { useDuelArenaStore } from './useDuelArenaStore';
import { cn } from '../../lib/utils';

interface OpponentPanelProps {
  session: ArenaSession;
  onSendQuickTaunt: () => void;
  onSendChatMessage: (message: string) => void;
}

// Split-style section heading, as in the lobby's side column.
const SectionHead: React.FC<{ label: string; aside?: React.ReactNode }> = ({ label, aside }) => (
  <div className="mb-2.5 flex items-baseline justify-between">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">{label}</p>
    {aside !== undefined && <span className="text-[11px] text-ch-muted">{aside}</span>}
  </div>
);

export const OpponentPanel: React.FC<OpponentPanelProps> = ({ session, onSendQuickTaunt, onSendChatMessage }) => {
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const isQuiz = useDuelArenaStore((s) => s.isQuiz);
  const totalQuestions = useDuelArenaStore((s) => s.questions.length);
  const opponent = session.opponent;

  const send = () => {
    if (!message.trim()) return;
    onSendChatMessage(message);
    setMessage('');
  };

  const stats = [
    { label: 'Status', value: opponent.liveTyping ? 'Active now' : 'Idle', live: opponent.liveTyping },
    { label: isQuiz ? 'Correct' : 'Tests passed', value: `${opponent.testCasesPassed}${isQuiz ? `/${totalQuestions}` : ''}` },
    { label: isQuiz ? 'Answered' : 'Compiles', value: isQuiz ? `${Math.round(opponent.progress)}%` : String(opponent.compileAttempts) },
  ];

  const matchRows = [
    { label: 'Accuracy', player: `${session.player.accuracy}%`, opponent: `${opponent.accuracy}%` },
    { label: 'Momentum', player: `${session.player.momentum}%`, opponent: `${opponent.momentum}%` },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-[46px] flex-none items-stretch border-b border-ch-divider">
        <div className="flex flex-1 items-center gap-2.5 px-5">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">Opponent</span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-accent">
            {session.mode === 'spectator' ? 'Delayed' : 'Live'}
          </span>
        </div>
        <button
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className={cn(
            'flex flex-none items-center border-l border-ch-divider px-4 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors',
            showDetails ? 'bg-ch-surface text-ch-text' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text',
          )}
        >
          {showDetails ? 'Hide details' : 'Details'}
        </button>
      </div>

      <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
        {/* Who you're up against */}
        <div className="border-b-2 border-ch-rule px-5 pb-5 pt-[18px]">
          <div className="flex items-center gap-3">
            <InitialsTile name={opponent.name} size={44} color={colorFor(opponent.id)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-extrabold tracking-[-0.01em]">{opponent.name}</p>
              <p className="truncate text-[11.5px] text-ch-muted">
                {opponent.rank} · {opponent.rating} rating
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 border border-ch-divider">
            {stats.map((stat, i) => (
              <div key={stat.label} className={cn('px-3 py-2.5', i > 0 && 'border-l border-ch-divider')}>
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-ch-muted">{stat.label}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-extrabold">
                  {'live' in stat && <span className={cn('h-2 w-2 flex-none', stat.live ? 'animate-pulse bg-green-500' : 'bg-ch-divider')} />}
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10.5px] text-ch-muted">
              <span>Progress</span>
              <span>{Math.round(opponent.progress)}%</span>
            </div>
            <Progress value={opponent.progress} className="h-[3px] [&>div]:bg-ch-violet" />
          </div>
        </div>

        {showDetails && (
          <>
            <div className="border-b border-ch-divider px-5 py-[18px]">
              <SectionHead label="This match" aside="You vs them" />
              {matchRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 border-t border-ch-divider py-2 text-[12.5px]">
                  <span className="text-ch-muted">{row.label}</span>
                  <span>
                    <span className="font-extrabold text-ch-accent">{row.player}</span>
                    <span className="text-ch-muted"> vs </span>
                    <span className="font-extrabold">{row.opponent}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="border-b border-ch-divider px-5 py-[18px]">
              <SectionHead label="Fair play" aside={`${session.antiCheat.trustScore}% trust`} />
              <span className={cn('inline-flex border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em]', getIntegrityTone(session.antiCheat.integrity))}>
                {session.antiCheat.integrity}
              </span>
              <div className="mt-3 grid grid-cols-2 border border-ch-divider text-[11.5px]">
                {[
                  ['Focus', session.antiCheat.focusWarnings],
                  ['Clipboard', session.antiCheat.clipboardWarnings],
                  ['Inactivity', session.antiCheat.inactivityWarnings],
                  ['Assist risk', `${session.antiCheat.aiAssistRisk}%`],
                ].map(([label, value], i) => (
                  <div key={String(label)} className={cn('px-3 py-2 text-ch-muted', i % 2 === 1 && 'border-l border-ch-divider', i > 1 && 'border-t border-ch-divider')}>
                    {label} <span className="font-extrabold text-ch-text">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {session.ladder.length > 0 && (
              <div className="border-b border-ch-divider px-5 py-[18px]">
                <SectionHead label="Standings" aside="By rating" />
                {session.ladder.map((entry, index) => (
                  <div key={entry.id} className={cn('flex items-center gap-3 border-t border-ch-divider py-2', entry.id === session.player.id && 'bg-ch-accent-soft')}>
                    <span className={cn('w-5 text-[12px] font-extrabold', index === 0 ? 'text-ch-accent' : 'text-ch-muted')}>{index + 1}</span>
                    <InitialsTile name={entry.name} size={24} color={colorFor(entry.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{entry.name}</p>
                      <p className="text-[10.5px] text-ch-muted">{entry.rank} · {entry.winRate}% wins</p>
                    </div>
                    <span className="text-[12px] font-extrabold text-ch-muted">{entry.rating}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-b border-ch-divider px-5 py-[18px]">
              <SectionHead label="Your progress" aside={session.promotionStatus} />
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="text-ch-muted">Streak <span className="font-extrabold text-ch-text">{session.activeStreak}</span></span>
                <span className="text-ch-muted">XP <span className="font-extrabold text-ch-text">{session.xpCurrent}/{session.xpTarget}</span></span>
              </div>
              <Progress className="mt-2 h-[3px]" value={(session.xpCurrent / Math.max(1, session.xpTarget)) * 100} />
            </div>
          </>
        )}

        {/* Chat */}
        <div className="px-5 py-[18px]">
          <SectionHead label="Chat" aside={session.chat.length || undefined} />
          {session.chat.length === 0 ? (
            <p className="py-2 text-[12.5px] text-ch-muted">No messages yet.</p>
          ) : (
            session.chat.map((chat) => (
              <div key={chat.id} className="border-t border-ch-divider py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn(
                    'truncate text-[12px] font-extrabold',
                    chat.kind === 'system' ? 'text-ch-muted' : chat.kind === 'taunt' ? 'text-ch-accent' : '',
                  )}>
                    {chat.kind === 'system' ? 'Arena' : chat.author}
                    {chat.kind === 'taunt' && <span className="ml-1.5 text-[9.5px] uppercase tracking-[0.12em]">taunt</span>}
                  </p>
                  <span className="flex-none text-[10.5px] text-ch-muted">{chat.createdAtLabel}</span>
                </div>
                <p className={cn('mt-0.5 text-[13px] leading-snug', chat.kind === 'system' && 'text-ch-muted')}>{chat.body}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="flex-none border-t-2 border-ch-rule">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          rows={2}
          className="block w-full resize-none border-0 bg-transparent px-5 py-3 text-[13px] text-ch-text outline-none placeholder:text-ch-muted"
          placeholder="Say something friendly…"
        />
        <div className="flex border-t border-ch-divider">
          <Button variant="ghost" className="h-10 flex-1" onClick={onSendQuickTaunt}>
            Quick taunt
          </Button>
          <Button className="h-10 flex-1" onClick={send} disabled={!message.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
