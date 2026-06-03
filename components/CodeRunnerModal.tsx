import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';
import { PlayIcon } from './icons/PlayIcon';
import Editor from '@monaco-editor/react';
import { emmetHTML, emmetCSS } from 'emmet-monaco-es';
import { runSandboxedJavaScript, runSandboxedPython, type SandboxExecutionController } from '../services/sandboxRunner';

interface CodeRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  title: string;
}

interface OutputLine {
    type: 'log' | 'error';
    content: string;
}

const SYNTAX_REGEX = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b(?:True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)\b|[\[\]\{\}\(\),:])/g;

const SyntaxHighlightedText: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(SYNTAX_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                if (/^".*"$/.test(part) || /^'.*'$/.test(part)) return <span key={i} className="text-green-600 dark:text-green-400">{part}</span>;
                if (/^\d+(\.\d+)?$/.test(part)) return <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">{part}</span>;
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)$/.test(part)) return <span key={i} className="text-purple-600 dark:text-purple-400 font-bold">{part}</span>;
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-gray-500 dark:text-gray-500 font-bold">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const PYTHON_KEYWORDS = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 
    'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 
    'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 
    'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'
];

const PYTHON_BUILTINS = [
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 
    'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod', 
    'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr', 
    'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 
    'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 
    'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 
    'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 
    'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
];

const processCarriageReturns = (text: string) => {
    const lines = text.split('\n');
    return lines.map(line => {
        const parts = line.split('\r');
        if (parts.length === 1) return line;
        let result = parts[0];
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            result = part + result.substring(part.length);
        }
        return result;
    }).join('\n');
};

export const CodeRunnerModal: React.FC<CodeRunnerModalProps> = ({ isOpen, onClose, code, title }) => {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const executionRef = useRef<SandboxExecutionController | null>(null);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  
  const [activeCode, setActiveCode] = useState(code);
  const [language, setLanguage] = useState<'python' | 'javascript' | 'html'>('python');
  const [activeTab, setActiveTab] = useState<'code' | 'output' | 'preview'>('code');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [previewConsole, setPreviewConsole] = useState<OutputLine[]>([]);
  const [previewSessionId, setPreviewSessionId] = useState(0);
  const [showPreviewConsole, setShowPreviewConsole] = useState(true);
  
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [consoleInput, setConsoleInput] = useState('');
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const completionProvidersRef = useRef<any[]>([]);
  const emmetInitializedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
        // Simple heuristic to detect language
        const isLikelyHtml = /<\s*!doctype|<\s*html|<\s*head|<\s*body|<\s*div|<\s*script|<\s*style/i.test(code);
        const isLikelyPython = /import\s+|def\s+|print\s*\(/.test(code);
        const detected = isLikelyHtml ? 'html' : (isLikelyPython ? 'python' : 'javascript');
        setLanguage(detected);
        setActiveTab(isLikelyHtml ? 'preview' : 'output');

        setOutput([]);
        setIsWaitingForInput(false);
        setConsoleInput('');
        setActiveCode(code);
        setPreviewConsole([]);
        if (isLikelyHtml) {
            const session = Date.now();
            setPreviewSessionId(session);
            setHtmlPreview(buildHtmlPreview(code, session));
        }

        const isDark = document.documentElement.classList.contains('dark');
        setEditorTheme(isDark ? 'vs-dark' : 'light');
    }

    return () => {
        completionProvidersRef.current.forEach(p => p.dispose());
        completionProvidersRef.current = [];
        executionRef.current?.cancel();
        executionRef.current = null;
    };
  }, [isOpen, code]);

  useEffect(() => {
      if (language === 'html' && activeTab !== 'preview') {
          setActiveTab('preview');
      }
      if (language !== 'html' && activeTab === 'preview') {
          setActiveTab('output');
      }
  }, [language, activeTab]);

  useEffect(() => {
      const handlePreviewMessage = (event: MessageEvent) => {
          const data = event.data;
          if (!data || data.type !== 'clubhub-preview') return;
          if (data.sessionId !== previewSessionId) return;
          const level = data.level as 'log' | 'error';
          const content = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
          setPreviewConsole(prev => [...prev, { type: level === 'error' ? 'error' : 'log', content }]);
      };

      window.addEventListener('message', handlePreviewMessage);
      return () => window.removeEventListener('message', handlePreviewMessage);
  }, [previewSessionId]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
      editor.updateOptions({
          minimap: { enabled: false },
          fontSize: 14,
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabCompletion: "on",
          wordBasedSuggestions: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          formatOnType: true,
          formatOnPaste: true,
          colorDecorators: true,
          quickSuggestions: { other: true, comments: false, strings: true },
      });

      if (!emmetInitializedRef.current) {
          emmetHTML(monaco, ['html']);
          emmetCSS(monaco, ['css']);
          emmetInitializedRef.current = true;
      }

      // Enable rich CSS/HTML suggestions (including <style> blocks)
      try {
          monaco.languages.css.cssDefaults.setOptions({
              validate: true,
              lint: {
                  compatibleVendorPrefixes: 'warning',
                  vendorPrefix: 'warning',
                  duplicateProperties: 'warning',
                  emptyRules: 'warning',
                  importStatement: 'warning',
                  boxModel: 'warning',
                  universalSelector: 'warning',
                  zeroUnits: 'warning',
                  fontFaceProperties: 'warning',
                  hexColorLength: 'warning',
                  argumentsInColorFunction: 'warning',
                  ieHack: 'warning',
                  unknownProperties: 'warning',
                  propertyIgnoredDueToDisplay: 'warning',
                  important: 'warning',
                  float: 'warning',
                  idSelector: 'warning'
              },
              completion: {
                  completePropertyWithSemicolon: true,
                  triggerPropertyValueCompletion: true
              }
          });
          monaco.languages.html.htmlDefaults.setOptions({
              suggest: { html5: true },
              format: { wrapLineLength: 140 }
          });
      } catch {}
      
      completionProvidersRef.current.forEach(provider => provider.dispose());
      completionProvidersRef.current = [];

      if (language === 'python') {
        completionProvidersRef.current.push(monaco.languages.registerCompletionItemProvider('python', {
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
                return { suggestions: [
                    ...PYTHON_KEYWORDS.map(k => ({ label: k, kind: monaco.languages.CompletionItemKind.Keyword, insertText: k, range, detail: 'Keyword' })),
                    ...PYTHON_BUILTINS.map(b => ({ label: b, kind: monaco.languages.CompletionItemKind.Function, insertText: b, range, detail: 'Built-in' })),
                ]};
            }
        }));
      }
  };

  const scrollToBottom = () => {
      if (outputContainerRef.current) {
          setTimeout(() => {
              outputContainerRef.current!.scrollTop = outputContainerRef.current!.scrollHeight;
          }, 10);
      }
  };

  const handleConsoleInputEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const val = consoleInput;
          
          const fullLine = `${inputPrompt}${val}\n`;
          setOutput(prev => [...prev, { type: 'log', content: fullLine }]);
          
          setIsWaitingForInput(false);
          setConsoleInput('');
          setInputPrompt('');
          
          if (inputResolverRef.current) {
              inputResolverRef.current(val);
              inputResolverRef.current = null;
          }
      }
  };

  const buildHtmlPreview = (html: string, sessionId: number) => {
      const instrumentation = `
<script id="clubhub-console-hook">
(function() {
  const sessionId = ${sessionId};
  const send = (level, message) => {
    try {
      window.parent.postMessage({ type: 'clubhub-preview', level, message, sessionId }, '*');
    } catch (e) {}
  };
  const wrap = (level) => (...args) => {
    send(level, args.map(arg => {
      try { return typeof arg === 'string' ? arg : JSON.stringify(arg); } catch (e) { return String(arg); }
    }).join(' '));
  };
  console.log = wrap('log');
  console.error = wrap('error');
  window.addEventListener('error', (event) => {
    send('error', event.message || 'Runtime error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    send('error', event.reason ? (event.reason.message || String(event.reason)) : 'Unhandled promise rejection');
  });
})();
</script>
      `.trim();

      if (html.includes('</body>')) {
          return html.replace('</body>', `\n${instrumentation}\n</body>`);
      }
      return `${html}\n${instrumentation}`;
  };

  const runJS = async () => {
      setIsExecuting(true);
      setOutput([]);
      executionRef.current?.cancel();
      const execution = runSandboxedJavaScript({
          code: activeCode,
          onOutput: (line) => {
              setOutput(prev => [...prev, line]);
              scrollToBottom();
          },
      });
      executionRef.current = execution;
      await execution.finished;
      if (executionRef.current === execution) {
          executionRef.current = null;
      }
      setIsExecuting(false);
      scrollToBottom();
  };

  const runPython = async () => {
      setIsExecuting(true);
      setOutput([]);
      setIsWaitingForInput(false);
      executionRef.current?.cancel();
      const execution = runSandboxedPython({
          code: activeCode,
          onLoadingChange: setIsLoadingPyodide,
          onOutput: (line) => {
              if (line.type === 'error') {
                  setOutput(prev => [...prev, line]);
                  scrollToBottom();
                  return;
              }
              const parts = line.content.split('\n');
              setOutput(prev => {
                  let newOutput = [...prev];
                  let lastLine = newOutput.length > 0 ? newOutput[newOutput.length - 1] : null;
                  if (lastLine && lastLine.type === line.type) {
                      lastLine.content += parts[0];
                      newOutput[newOutput.length - 1] = { ...lastLine, content: processCarriageReturns(lastLine.content) };
                  } else {
                      newOutput.push({ type: line.type, content: processCarriageReturns(parts[0]) });
                  }
                  if (parts.length > 1) {
                      for (let i = 1; i < parts.length; i++) {
                          newOutput.push({ type: line.type, content: parts[i] });
                      }
                  }
                  return newOutput;
              });
              scrollToBottom();
          },
          onInputRequest: (prompt) => {
              setInputPrompt(prompt);
              setIsWaitingForInput(true);
              inputResolverRef.current = (value: string) => execution.provideInput(value);
              setTimeout(() => {
                  consoleInputRef.current?.focus();
                  scrollToBottom();
              }, 50);
          },
      });
      executionRef.current = execution;
      await execution.finished;
      if (executionRef.current === execution) {
          executionRef.current = null;
      }
      inputResolverRef.current = null;
      setIsExecuting(false);
      setIsWaitingForInput(false);
      scrollToBottom();
  };

  const handleRunCode = () => {
      if (language === 'html') {
          const session = Date.now();
          setPreviewSessionId(session);
          setPreviewConsole([]);
          setHtmlPreview(buildHtmlPreview(activeCode, session));
          setActiveTab('preview');
      } else if (language === 'python') runPython();
      else runJS();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full h-[80vh] relative border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in-up">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                  <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                      <button 
                          onClick={() => setLanguage('python')} 
                          className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${language === 'python' ? 'bg-sky-500 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                          PY
                      </button>
                      <button 
                          onClick={() => setLanguage('javascript')} 
                          className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${language === 'javascript' ? 'bg-yellow-500 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                          JS
                      </button>
                      <button 
                          onClick={() => setLanguage('html')} 
                          className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${language === 'html' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                          HTML
                      </button>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {title}
                  </h3>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 transition-colors">
                  <XIcon />
              </button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 border-r border-gray-200 dark:border-gray-800 overflow-hidden relative">
                  <Editor
                      height="100%"
                      language={language}
                      theme={editorTheme}
                      value={activeCode}
                      onChange={(value) => setActiveCode(value || '')}
                      onMount={handleEditorDidMount}
                      options={{
                          readOnly: false,
                          minimap: { enabled: false },
                          fontSize: 14,
                          padding: { top: 16 },
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          renderLineHighlight: 'all',
                          contextmenu: true,
                      }}
                      loading={<div className="flex items-center justify-center h-full text-gray-500 text-sm">Loading code...</div>}
                  />
              </div>

              {language !== 'html' ? (
                  <div 
                      ref={outputContainerRef}
                      className="flex-1 bg-gray-900 dark:bg-black text-gray-300 font-mono text-xs md:text-sm p-4 overflow-y-auto flex flex-col shadow-inner"
                      onClick={() => {
                          if (isWaitingForInput && consoleInputRef.current) {
                              consoleInputRef.current.focus();
                          }
                      }}
                  >
                      <div className="flex-1">
                          {output.length === 0 && !isExecuting && (
                              <div className="text-gray-500 italic">Click Run to execute...</div>
                          )}
                          {output.map((line, i) => (
                              <div key={i} className="mb-1 whitespace-pre-wrap break-all leading-relaxed">
                                  {line.type === 'log' ? (
                                      <SyntaxHighlightedText text={line.content} />
                                  ) : (
                                      <span className="text-red-400 font-medium">{line.content}</span>
                                  )}
                              </div>
                          ))}
                          
                          {isWaitingForInput && (
                              <div className="flex items-center text-gray-300 leading-relaxed mt-1">
                                  <span className="whitespace-pre-wrap">{inputPrompt}</span>
                                  <input
                                      ref={consoleInputRef}
                                      value={consoleInput}
                                      onChange={e => setConsoleInput(e.target.value)}
                                      onKeyDown={handleConsoleInputEnter}
                                      className="flex-1 bg-transparent border-none outline-none text-green-400 font-bold ml-1 min-w-[50px]"
                                      autoFocus
                                      autoComplete="off"
                                      spellCheck="false"
                                  />
                              </div>
                          )}

                          {isExecuting && !isWaitingForInput && <div className="animate-pulse mt-2 text-green-500">_</div>}
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/60">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Preview</span>
                          <div className="flex items-center gap-2">
                              <button
                                  onClick={() => setShowPreviewConsole(prev => !prev)}
                                  className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                              >
                                  {showPreviewConsole ? 'Hide Console' : 'Show Console'}
                              </button>
                              <button
                                  onClick={() => setPreviewConsole([])}
                                  className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                              >
                                  Clear Console
                              </button>
                          </div>
                      </div>
                      <div className="flex-1 flex flex-col">
                          <iframe
                              title="HTML Showcase Preview"
                              className={`w-full border-0 bg-white ${showPreviewConsole ? 'flex-1' : 'h-full'}`}
                              sandbox="allow-scripts allow-modals allow-forms"
                              srcDoc={htmlPreview}
                          />
                          {showPreviewConsole && (
                              <div className="h-40 border-t border-gray-200 dark:border-gray-800 bg-gray-900 text-gray-200 text-xs font-mono overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                  {previewConsole.length === 0 ? (
                                      <span className="text-gray-500">Preview console ready…</span>
                                  ) : (
                                      previewConsole.map((line, idx) => (
                                          <div key={idx} className={line.type === 'error' ? 'text-red-400' : 'text-gray-200'}>
                                              {line.content}
                                          </div>
                                      ))
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
              <button 
                  onClick={handleRunCode}
                  disabled={isExecuting || (language === 'python' && isLoadingPyodide)}
                  className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-sky-500/20 transition-all"
              >
                  {language === 'python' && isLoadingPyodide ? 'Loading Engine...' : isExecuting ? 'Running...' : (
                      <>
                          <PlayIcon /> {language === 'html' ? 'Refresh Preview' : 'Run Code'}
                      </>
                  )}
              </button>
          </div>
      </div>
    </div>
  );
};
