import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import { initVimMode } from 'monaco-vim';
import { CheckCircle2, Code2, Expand, LoaderCircle, Minimize2, Play, Send, Settings2, TerminalSquare, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import { useDuelArenaStore } from './useDuelArenaStore';

const themeMap = {
  'arena-pulse': 'code-duel-arena',
  'midnight-circuit': 'code-duel-midnight',
  'terminal-ice': 'code-duel-ice',
} as const;

const editorThemes = [
  { value: 'arena-pulse', label: 'Arena Pulse' },
  { value: 'midnight-circuit', label: 'Midnight Circuit' },
  { value: 'terminal-ice', label: 'Terminal Ice' },
] as const;

const statusTone = {
  Accepted: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  'Wrong Answer': 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  'Time Limit Exceeded': 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  'Runtime Error': 'text-rose-300 border-rose-400/30 bg-rose-500/10',
};

const defineArenaThemes = (monaco: any) => {
  monaco.editor.defineTheme('code-duel-arena', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7dd3fc' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'f9a8d4' },
      { token: 'type.identifier', foreground: 'c4b5fd' },
    ],
    colors: {
      'editor.background': '#030712',
      'editor.lineHighlightBackground': '#082f49',
      'editorCursor.foreground': '#22d3ee',
      'editor.selectionBackground': '#0f3d57',
      'editorIndentGuide.background1': '#0f172a',
      'editor.inactiveSelectionBackground': '#0f172aaa',
    },
  });
  monaco.editor.defineTheme('code-duel-midnight', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c084fc' },
      { token: 'string', foreground: '67e8f9' },
      { token: 'number', foreground: 'fda4af' },
    ],
    colors: {
      'editor.background': '#020617',
      'editor.lineHighlightBackground': '#1e1b4b',
      'editorCursor.foreground': '#e879f9',
      'editor.selectionBackground': '#312e81',
    },
  });
  monaco.editor.defineTheme('code-duel-ice', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '38bdf8' },
      { token: 'string', foreground: 'bef264' },
      { token: 'number', foreground: 'facc15' },
    ],
    colors: {
      'editor.background': '#03111c',
      'editor.lineHighlightBackground': '#0f172a',
      'editorCursor.foreground': '#67e8f9',
      'editor.selectionBackground': '#164e63',
    },
  });
};

export const CodeEditorPanel: React.FC = memo(() => {
  const files = useDuelArenaStore((state) => state.files);
  const activeFileId = useDuelArenaStore((state) => state.activeFileId);
  const activeSubmission = useDuelArenaStore((state) => state.activeSubmission);
  const terminalOutput = useDuelArenaStore((state) => state.terminalOutput);
  const customInput = useDuelArenaStore((state) => state.customInput);
  const editorSettings = useDuelArenaStore((state) => state.editorSettings);
  const editorFullscreen = useDuelArenaStore((state) => state.editorFullscreen);
  const autoSaveState = useDuelArenaStore((state) => state.autoSaveState);
  const lastSavedLabel = useDuelArenaStore((state) => state.lastSavedLabel);
  const session = useDuelArenaStore((state) => state.session);
  const setActiveFile = useDuelArenaStore((state) => state.setActiveFile);
  const updateActiveFile = useDuelArenaStore((state) => state.updateActiveFile);
  const setCustomInput = useDuelArenaStore((state) => state.setCustomInput);
  const setEditorTheme = useDuelArenaStore((state) => state.setEditorTheme);
  const adjustFontSize = useDuelArenaStore((state) => state.adjustFontSize);
  const toggleVimMode = useDuelArenaStore((state) => state.toggleVimMode);
  const toggleMinimap = useDuelArenaStore((state) => state.toggleMinimap);
  const toggleFullscreen = useDuelArenaStore((state) => state.toggleFullscreen);
  const runCode = useDuelArenaStore((state) => state.runCode);
  const submitCode = useDuelArenaStore((state) => state.submitCode);
  const recordClipboardWarning = useDuelArenaStore((state) => state.recordClipboardWarning);

  const activeFile = files.find((file) => file.id === activeFileId) || files[0];
  const editorRef = useRef<any>(null);
  const vimInstanceRef = useRef<any>(null);
  const vimStatusRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const readOnly = session?.mode === 'spectator' || !!activeFile?.readOnly;

  const shortcutHints = useMemo(
    () => [
      'Ctrl / Cmd + Enter — Run',
      'Shift + Enter — Submit',
    ],
    [],
  );

  // Close the settings menu on outside click.
  useEffect(() => {
    if (!settingsOpen) return undefined;
    const handle = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [settingsOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        runCode();
      }
      if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        submitCode();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [runCode, submitCode]);

  useEffect(() => {
    if (!editorRef.current || !vimStatusRef.current) return;
    if (editorSettings.vimMode && !vimInstanceRef.current) {
      vimInstanceRef.current = initVimMode(editorRef.current, vimStatusRef.current);
      return;
    }
    if (!editorSettings.vimMode && vimInstanceRef.current) {
      vimInstanceRef.current.dispose();
      vimInstanceRef.current = null;
      vimStatusRef.current.textContent = 'INSERT';
    }
  }, [editorSettings.vimMode]);

  useEffect(
    () => () => {
      if (vimInstanceRef.current) {
        vimInstanceRef.current.dispose();
      }
    },
    [],
  );

  const handleMount: OnMount = (editor, monaco) => {
    defineArenaThemes(monaco);
    editorRef.current = editor;
    editor.updateOptions({
      smoothScrolling: true,
    });
    if (editorSettings.vimMode && vimStatusRef.current) {
      vimInstanceRef.current = initVimMode(editor, vimStatusRef.current);
    }
  };

  return (
    <Card
      className={cn(
        'arena-panel relative flex h-full min-h-0 flex-col overflow-hidden',
        editorFullscreen && 'fixed inset-4 z-50 min-h-0 border-cyan-400/20 shadow-[0_0_80px_rgba(34,211,238,0.15)]',
      )}
      onPasteCapture={recordClipboardWarning}
    >
      <div className="border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => setActiveFile(file.id)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm transition',
                  file.id === activeFileId
                    ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/20 hover:text-white',
                )}
              >
                {file.name}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Always mounted so monaco-vim can write status even when the menu is closed. */}
            <span
              ref={vimStatusRef}
              className={cn(
                'rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-cyan-100',
                editorSettings.vimMode ? 'inline-block' : 'hidden',
              )}
            >
              INSERT
            </span>
            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:flex',
                autoSaveState === 'dirty' ? 'border-amber-400/30 text-amber-200' : 'border-white/10 text-slate-400',
              )}
              title={lastSavedLabel}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', autoSaveState === 'dirty' ? 'bg-amber-400' : 'bg-emerald-400')} />
              {autoSaveState === 'dirty' ? 'Unsaved' : 'Saved'}
            </span>

            <div className="relative" ref={settingsRef}>
              <Button
                variant={settingsOpen ? 'outline' : 'secondary'}
                size="icon"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-label="Editor settings"
                aria-expanded={settingsOpen}
              >
                <Settings2 className="h-4 w-4" />
              </Button>

              <AnimatePresence>
                {settingsOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-[0_20px_60px_rgba(2,8,23,0.6)] backdrop-blur-xl"
                  >
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Editor settings</p>

                    <div className="space-y-3">
                      <div>
                        <p className="mb-1.5 text-xs text-slate-400">Theme</p>
                        <Select value={editorSettings.themePreset} onValueChange={(value) => setEditorTheme(value as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {editorThemes.map((theme) => (
                              <SelectItem key={theme.value} value={theme.value}>
                                {theme.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">Font size</p>
                        <div className="flex items-center gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => adjustFontSize('down')}>
                            A-
                          </Button>
                          <span className="w-6 text-center text-sm text-slate-200">{editorSettings.fontSize}</span>
                          <Button variant="secondary" size="sm" onClick={() => adjustFontSize('up')}>
                            A+
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">Vim mode</p>
                        <Button variant={editorSettings.vimMode ? 'outline' : 'secondary'} size="sm" onClick={toggleVimMode}>
                          {editorSettings.vimMode ? 'On' : 'Off'}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">Minimap</p>
                        <Button variant={editorSettings.minimap ? 'outline' : 'secondary'} size="sm" onClick={toggleMinimap}>
                          {editorSettings.minimap ? 'On' : 'Off'}
                        </Button>
                      </div>

                      <div className="border-t border-white/10 pt-3">
                        <p className="mb-2 text-xs text-slate-400">Shortcuts</p>
                        <div className="space-y-1.5">
                          {shortcutHints.map((hint) => (
                            <div key={hint} className="flex items-center justify-between text-[11px] text-slate-300">
                              <span>{hint.split(' — ')[1]}</span>
                              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono">{hint.split(' — ')[0]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <Button variant="secondary" size="icon" onClick={toggleFullscreen} aria-label={editorFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              {editorFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_210px] overflow-hidden sm:grid-rows-[minmax(0,1fr)_230px] xl:grid-rows-[minmax(0,1fr)_220px]">
        <div className="relative overflow-hidden">
          <Editor
            height="100%"
            loading={
              <div className="flex h-full items-center justify-center bg-slate-950 text-cyan-100">
                <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
                Initializing Monaco combat shell...
              </div>
            }
            theme={themeMap[editorSettings.themePreset]}
            language={activeFile.language}
            value={activeFile.content}
            onMount={handleMount}
            onChange={(value) => updateActiveFile(value || '')}
            options={{
              readOnly,
              fontSize: editorSettings.fontSize,
              minimap: { enabled: editorSettings.minimap },
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'all',
              lineNumbersMinChars: 3,
              roundedSelection: true,
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              padding: { top: 16, bottom: 16 },
              overviewRulerBorder: false,
              wordWrap: 'on',
            }}
          />
          {activeSubmission?.stage !== 'Finished' && activeSubmission ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
              <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-cyan-100">
                <span className="flex items-center gap-2">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  {activeSubmission.stage}
                </span>
                <span>{activeSubmission.progress}%</span>
              </div>
              <Progress className="mt-2 h-2 bg-cyan-950/70" value={activeSubmission.progress} />
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 overflow-y-auto custom-scrollbar border-t border-white/10 bg-slate-950/70 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Tabs defaultValue="terminal" className="order-2 min-w-0 xl:order-none">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terminal">Output Terminal</TabsTrigger>
              <TabsTrigger value="input">Custom Input</TabsTrigger>
            </TabsList>
            <TabsContent value="terminal" className="h-[110px] sm:h-[150px]">
              <ScrollArea className="h-full rounded-2xl border border-white/10 bg-slate-950/80">
                <div className="space-y-2 p-4 font-mono text-sm">
                  {terminalOutput.map((line, index) => (
                    <div key={`${line}-${index}`} className={cn('terminal-pulse text-slate-300', index >= terminalOutput.length - 2 && 'text-cyan-100')}>
                      {line}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="input" className="h-[110px] sm:h-[150px]">
              <textarea
                value={customInput}
                onChange={(event) => setCustomInput(event.target.value)}
                className="h-full w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 p-4 font-mono text-sm text-slate-200 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400/40"
                placeholder="Paste custom duel input..."
              />
            </TabsContent>
          </Tabs>

          <div className="order-1 rounded-[1.5rem] border border-white/10 bg-white/5 p-3 sm:p-4 xl:order-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Execution Controls</p>
                <h3 className="mt-1 text-base font-semibold text-white">{session?.mode === 'spectator' ? 'Read-only spectator shell' : 'Compile under pressure'}</h3>
              </div>
              <Code2 className="h-4 w-4 text-cyan-300" />
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={runCode} disabled={!!activeSubmission || session?.mode === 'spectator'}>
                <Play className="h-4 w-4" />
                Run
              </Button>
              <Button variant="success" className="flex-1" onClick={submitCode} disabled={!!activeSubmission || session?.mode === 'spectator'}>
                <Send className="h-4 w-4" />
                Submit
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <Zap className="h-3.5 w-3.5" />
                  Compile hints
                </div>
                <p className="mt-2 text-sm text-slate-300">Line highlights and minimap stay hot. Use the final minute to prune, not rewrite.</p>
              </div>

              <AnimatePresence mode="wait">
                {activeSubmission ? (
                  <motion.div
                    key={activeSubmission.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'rounded-2xl border p-3',
                      activeSubmission.verdict ? statusTone[activeSubmission.verdict] : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {activeSubmission.stage === 'Finished' && activeSubmission.verdict === 'Accepted' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : activeSubmission.stage === 'Finished' ? (
                          <TerminalSquare className="h-4 w-4" />
                        ) : (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        <span className="text-sm font-semibold">
                          {activeSubmission.stage === 'Finished'
                            ? activeSubmission.verdict
                            : `${activeSubmission.kind === 'submit' ? 'Submission' : 'Run'} ${activeSubmission.stage}`}
                        </span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em]">{activeSubmission.progress}%</span>
                    </div>
                    <p className="mt-2 text-xs">{activeSubmission.verdictLabel}</p>
                    <Progress className="mt-3 h-2 bg-white/10" value={activeSubmission.progress} />
                    {activeSubmission.stage === 'Finished' ? (
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">{activeSubmission.passed}/{activeSubmission.total} tests green</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">{activeSubmission.runtimeMs}ms runtime · {activeSubmission.memoryMb}MB</div>
                      </div>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-400">
                    Submission feedback will stream here with test progression, runtime metrics, and hidden case pressure.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

CodeEditorPanel.displayName = 'CodeEditorPanel';
