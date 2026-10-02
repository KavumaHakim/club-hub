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
  p: ({ children }: any) => <p className="mb-3 break-words leading-7 text-ch-text">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-3 list-disc space-y-2 break-words pl-5 text-ch-text">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-3 list-decimal space-y-2 break-words pl-5 text-ch-text">{children}</ol>,
  li: ({ children }: any) => <li className="break-words">{children}</li>,
  h1: ({ children }: any) => <h2 className="mb-2 mt-1 text-lg font-semibold text-ch-text">{children}</h2>,
  h2: ({ children }: any) => <h3 className="mb-2 mt-1 text-base font-semibold text-ch-text">{children}</h3>,
  h3: ({ children }: any) => <h4 className="mb-2 mt-1 text-base font-semibold text-ch-text">{children}</h4>,
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="break-words bg-ch-surface px-1.5 py-0.5 font-mono text-[13px] text-ch-accent">{children}</code>
    ) : (
      <pre className="mb-3 max-w-full overflow-x-auto border border-ch-divider bg-ch-bg p-4 font-mono text-[13px] text-ch-accent">
        <code>{children}</code>
      </pre>
    ),
  strong: ({ children }: any) => <strong className="font-semibold text-ch-text">{children}</strong>,
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
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-0">
      <div className="sticky top-0 z-10 border-b border-ch-divider bg-ch-bg px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant={difficulty.badgeVariant}>{difficulty.label}</Badge>
            <h3 className="mt-1.5 truncate text-lg font-semibold text-ch-text">{session.problem.title}</h3>
          </div>

          {/* Compact metrics, fixed in the top-right corner */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="secondary" className="text-[11px]">{LANGUAGE_LABELS[activeLanguage] || 'Python'} 3</Badge>
            <div className="flex items-center gap-1">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <span
                    key={stat.label}
                    title={stat.label}
                    className="flex items-center gap-1 border border-ch-divider bg-ch-surface px-2 py-1 text-[11px] font-medium text-ch-text"
                  >
                    <Icon className="h-3 w-3 text-ch-muted" />
                    {stat.value}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 px-4 py-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-ch-accent">
              <ScrollText className="h-3.5 w-3.5" />
              Problem Statement
            </div>
            <div className="min-w-0 break-words text-[15px] leading-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {session.problem.statementMarkdown}
              </ReactMarkdown>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {session.problem.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {session.problem.sections.map((section) => {
            const isOpen = openSections[section.id];
            return (
              <div key={section.id} className="border border-ch-divider bg-ch-surface">
                <Button
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between px-4 py-4 text-left text-ch-text"
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

          <div className="border border-ch-divider bg-ch-surface p-4">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-ch-muted">
              <CircleHelp className="h-3.5 w-3.5" />
              Constraints
            </div>
            <div className="space-y-2">
              {session.problem.constraints.map((constraint) => (
                <div key={constraint} className="border border-ch-divider bg-ch-bg px-3 py-2 text-sm text-ch-muted">
                  {constraint}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-ch-divider bg-ch-surface p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.25em] text-ch-muted">
              Revealed Test Cases ({session.problem.publicTestCount} of {session.problem.totalTestCount})
            </div>
            <div className="space-y-4">
              {session.problem.examples.map((example, index) => (
                <div key={example.id} className="border border-ch-divider bg-ch-bg p-4">
                  <p className="mb-3 text-sm font-semibold text-ch-text">Sample {index + 1}</p>
                  <div className="space-y-3 font-mono text-sm">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-ch-muted">Input</p>
                      <pre className="bg-ch-bg p-3 text-ch-accent">{example.input}</pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-ch-muted">Output</p>
                      <pre className="bg-ch-bg p-3 text-green-600 dark:text-green-400">{example.output}</pre>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ch-muted">{example.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-ch-violet bg-ch-surface p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-ch-violet">
              <ShieldAlert className="h-3.5 w-3.5" />
              Hidden Tests
            </div>
            <p className="text-sm text-ch-violet">
              {session.problem.hiddenTestCount} hidden test cases run only when you Submit. They cover edge cases the samples
              don't show — empty input, duplicates, ties, and larger inputs.
            </p>
            {session.problem.hiddenHints.map((hint) => (
              <div key={hint} className="mt-2 border border-ch-violet bg-ch-bg px-3 py-2 text-sm text-ch-violet">
                {hint}
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.25em] text-ch-muted">Submission History</div>
            {session.submissionHistory.map((item) => (
              <div key={item.id} className="border border-ch-divider bg-ch-bg px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        item.verdict === 'Accepted'
                          ? 'text-green-600 dark:text-green-400'
                          : item.verdict === 'Wrong Answer'
                            ? 'text-ch-violet'
                            : 'text-ch-accent',
                      )}
                    >
                      {item.verdict}
                    </p>
                    <p className="text-xs text-ch-muted">{item.createdAtLabel}</p>
                  </div>
                  <div className="text-right text-sm text-ch-muted">
                    <p>
                      {item.passed}/{item.total} tests
                    </p>
                    <p className="text-xs text-ch-muted">{item.runtimeMs}ms</p>
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
