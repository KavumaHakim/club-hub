import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, CircleHelp, Clock3, FlaskConical, ScrollText, ShieldAlert, Trophy } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { DIFFICULTY_META, LANGUAGE_LABELS } from './mockData';
import { ArenaSession, DuelLanguage } from './types';
import { cn } from '../../lib/utils';

interface ProblemPanelProps {
  session: ArenaSession;
  activeLanguage: DuelLanguage;
  onLanguageChange: (language: DuelLanguage) => void;
}

const markdownComponents = {
  p: ({ children }: any) => <p className="mb-3 leading-7 text-slate-300">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-3 list-disc space-y-2 pl-5 text-slate-300">{children}</ul>,
  li: ({ children }: any) => <li>{children}</li>,
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-sm text-cyan-100">{children}</code>
    ) : (
      <pre className="mb-3 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 font-mono text-sm text-cyan-100">
        <code>{children}</code>
      </pre>
    ),
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
};

export const ProblemPanel: React.FC<ProblemPanelProps> = ({ session, activeLanguage, onLanguageChange }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(session.problem.sections.map((section) => [section.id, section.defaultOpen ?? false])),
  );

  const difficulty = DIFFICULTY_META[session.problem.difficulty];

  const stats = useMemo(
    () => [
      { label: 'Tests', value: `${session.problem.publicTestCount} of ${session.problem.totalTestCount}`, icon: FlaskConical },
      { label: 'Est. time', value: `${session.problem.averageCompletionMins}m`, icon: Clock3 },
      { label: 'XP reward', value: `${session.problem.xpReward} XP`, icon: Trophy },
    ],
    [session.problem],
  );

  return (
    <Card className="arena-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={difficulty.badgeVariant}>{difficulty.label}</Badge>
              <Badge variant="secondary">Sticky briefing</Badge>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">{session.problem.title}</h3>
            <p className="mt-1 text-sm text-slate-400">A fresh problem, created just for this duel.</p>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Language</p>
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              {LANGUAGE_LABELS[activeLanguage] || 'Python'} 3
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  {stat.label}
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 px-5 py-5">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cyan-300/80">
              <ScrollText className="h-3.5 w-3.5" />
              Problem Statement
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {session.problem.statementMarkdown}
            </ReactMarkdown>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.problem.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {session.problem.sections.map((section) => {
            const isOpen = openSections[section.id];
            return (
              <div key={section.id} className="rounded-[1.5rem] border border-white/10 bg-white/5">
                <Button
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between rounded-[1.5rem] px-4 py-4 text-left text-white"
                  onClick={() => setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                >
                  <span className="text-base font-semibold">{section.title}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="px-4 pb-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {section.markdown}
                        </ReactMarkdown>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <CircleHelp className="h-3.5 w-3.5" />
              Constraints
            </div>
            <div className="space-y-2">
              {session.problem.constraints.map((constraint) => (
                <div key={constraint} className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                  {constraint}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.25em] text-slate-500">
              Revealed Test Cases ({session.problem.publicTestCount} of {session.problem.totalTestCount})
            </div>
            <div className="space-y-4">
              {session.problem.examples.map((example, index) => (
                <div key={example.id} className="rounded-[1.25rem] border border-white/10 bg-slate-950/60 p-4">
                  <p className="mb-3 text-sm font-semibold text-white">Sample {index + 1}</p>
                  <div className="space-y-3 font-mono text-sm">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">Input</p>
                      <pre className="rounded-xl bg-slate-950 p-3 text-cyan-100">{example.input}</pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">Output</p>
                      <pre className="rounded-xl bg-slate-950 p-3 text-emerald-100">{example.output}</pre>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{example.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-200/80">
              <ShieldAlert className="h-3.5 w-3.5" />
              Hidden Tests
            </div>
            <p className="text-sm text-amber-50/90">
              {session.problem.hiddenTestCount} hidden test cases run only when you Submit. They cover edge cases the samples
              don't show — empty input, duplicates, ties, and larger inputs.
            </p>
            {session.problem.hiddenHints.map((hint) => (
              <div key={hint} className="mt-2 rounded-2xl border border-amber-400/10 bg-slate-950/50 px-3 py-2 text-sm text-amber-50/90">
                {hint}
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Submission History</div>
            {session.submissionHistory.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        item.verdict === 'Accepted'
                          ? 'text-emerald-300'
                          : item.verdict === 'Wrong Answer'
                            ? 'text-amber-300'
                            : 'text-rose-300',
                      )}
                    >
                      {item.verdict}
                    </p>
                    <p className="text-xs text-slate-500">{item.createdAtLabel}</p>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p>
                      {item.passed}/{item.total} tests
                    </p>
                    <p className="text-xs text-slate-500">{item.runtimeMs}ms</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};
