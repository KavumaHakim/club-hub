
import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { CloudIcon } from './icons/CloudIcon';
import { XIcon } from './icons/XIcon';
import { CopyIcon } from './icons/CopyIcon';
import { GlobeIcon } from './icons/GlobeIcon'; 
import { ShareIcon } from './icons/ShareIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import Editor from '@monaco-editor/react';
import { User, Tab } from '../types';
import * as api from '../services/apiService';
import * as geminiService from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';
import ShareCodeModal from './ShareCodeModal';
import SubmitToChallengeModal from './SubmitToChallengeModal';
import { useData } from '../DataContext';
import { FormattedMessage } from './FormattedMessage';

interface CodePlaygroundProps {
    theme: 'light' | 'dark';
    currentUser: User;
    setActiveTab?: (tab: Tab) => void; 
}

interface OutputLine {
    type: 'log' | 'error' | 'hint';
    content: string;
}

interface ScriptFile {
    name: string;
    id: string;
    lastModified: string;
    size: number;
}

const DEFAULT_CODE = `print("Hello from the ICT Club Hub Playground!")

name = input("What is your name? ")
print(f"Nice to meet you, {name}!")

# The return value of the last expression is also displayed
import math
math.pi`;

const PublishModal: React.FC<{ isOpen: boolean, onClose: () => void, onPublish: (title: string, desc: string) => Promise<void> }> = ({ isOpen, onClose, onPublish }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !desc) return;
        setIsPublishing(true);
        await onPublish(title, desc);
        setIsPublishing(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Publish to Showcase</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            required 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" 
                            placeholder="My Awesome Script"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea 
                            value={desc} 
                            onChange={e => setDesc(e.target.value)} 
                            required 
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" 
                            placeholder="What does this code do?"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isPublishing}
                        className="w-full py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50"
                    >
                        {isPublishing ? 'Publishing...' : 'Publish'}
                    </button>
                </form>
            </div>
        </div>
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

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme, currentUser, setActiveTab }) => {
  const { fetchShowcaseItems, showToast } = useData();
  const [code, setCode] = useState<string>(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('playground_code') || DEFAULT_CODE;
      }
      return DEFAULT_CODE;
  });
  
  const [output, setOutput] = useState<OutputLine[]>([{ type: 'log', content: 'Click "Run Code" to see the output here.' }]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const pyodideRef = useRef<any | null>(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [activeTab, setActiveTabState] = useState<'editor' | 'output'>('editor');
  const [isGettingHint, setIsGettingHint] = useState(false);
  
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [cloudScripts, setCloudScripts] = useState<ScriptFile[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [isSubmitChallengeModalOpen, setIsSubmitChallengeModalOpen] = useState(false);

  const [copyFeedback, setCopyFeedback] = useState(false);

  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [consoleInput, setConsoleInput] = useState('');
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef(code);
  const completionProvidersRef = useRef<any[]>([]);

  useEffect(() => {
      localStorage.setItem('playground_code', code);
      codeRef.current = code;
  }, [code]);
  
  useEffect(() => {
    return () => {
        completionProvidersRef.current.forEach(provider => provider.dispose());
        completionProvidersRef.current = [];
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
      editor.updateOptions({
          minimap: { enabled: false },
          fontSize: 14,
          padding: { top: 16 },
          scrollBeyondLastLine: true, // Allow scrolling past the end
          automaticLayout: true,
          tabCompletion: "on",
          wordBasedSuggestions: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          formatOnType: true,
          formatOnPaste: true,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'auto',
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
            useShadows: true,
          }
      });

      completionProvidersRef.current.forEach(provider => provider.dispose());
      completionProvidersRef.current = [];

      // Static provider for keywords/snippets
      const staticProvider = {
          provideCompletionItems: (model: any, position: any) => {
              const word = model.getWordUntilPosition(position);
              const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
              const suggestions = [
                  ...PYTHON_KEYWORDS.map(k => ({ label: k, kind: monaco.languages.CompletionItemKind.Keyword, insertText: k, range, detail: 'Keyword' })),
                  ...PYTHON_BUILTINS.map(b => ({ label: b, kind: monaco.languages.CompletionItemKind.Function, insertText: b, range, detail: 'Built-in' })),
                  { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:name}(${2:args}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
                  { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
              ];
              return { suggestions };
          }
      };
      completionProvidersRef.current.push(monaco.languages.registerCompletionItemProvider('python', staticProvider));
  };


  const handleImportCode = (importedCode: string) => {
      const currentCode = codeRef.current;
      
      if (!currentCode || currentCode.trim() === '' || currentCode.trim() === DEFAULT_CODE.trim()) {
           setCode(importedCode);
           setActiveTabState('editor');
           setOutput([{ type: 'log', content: 'Loaded code from external source.' }]);
      } else {
           setPendingCode(importedCode);
           setIsConfirmOpen(true);
      }
  };

  useEffect(() => {
    const pendingImport = localStorage.getItem('playground_pending_code');
    if (pendingImport) {
        localStorage.removeItem('playground_pending_code');
        handleImportCode(pendingImport);
    }

    const setupPyodide = async () => {
      try {
        // @ts-ignore
        const pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/"
        });
        (window as any).pyodide = pyodideInstance;
        pyodideRef.current = pyodideInstance;
        setIsPyodideReady(true);
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
        setOutput([{ type: 'error', content: "Error: Could not load the Python execution engine. Please refresh." }]);
      }
    };
    setupPyodide();

    const handleOpenCode = (e: CustomEvent<string>) => {
        if (e.detail) {
            handleImportCode(e.detail);
        }
    };
    
    window.addEventListener('open-in-playground' as any, handleOpenCode);
    return () => {
        window.removeEventListener('open-in-playground' as any, handleOpenCode);
    };

  }, []);

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setCode(content);
        setOutput([{ type: 'log', content: `Loaded file: ${file.name}` }]);
        setActiveTabState('editor');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const confirmReplace = () => {
    if (pendingCode) {
        setCode(pendingCode);
        setActiveTabState('editor');
        setOutput([{ type: 'log', content: 'Loaded code from external source.' }]);
    }
    setPendingCode(null);
    setIsConfirmOpen(false);
  };

  const fetchCloudScripts = async () => {
      setIsLoadingScripts(true);
      setCloudMessage(null);
      try {
          const scripts = await api.listUserScripts(currentUser.uid);
          setCloudScripts(scripts);
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      } finally {
          setIsLoadingScripts(false);
      }
  };

  const handleOpenCloudModal = () => {
      setIsCloudModalOpen(true);
      fetchCloudScripts();
  };

  const handleCloudSave = async () => {
      if (!saveFileName.trim()) {
          setCloudMessage({ text: "Please enter a file name.", type: 'error' });
          return;
      }
      setIsSaving(true);
      setCloudMessage(null);
      try {
          await api.saveUserScript(currentUser.uid, saveFileName, code);
          setCloudMessage({ text: "File saved successfully!", type: 'success' });
          await fetchCloudScripts();
          setSaveFileName('');
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      } finally {
          setIsSaving(false);
      }
  };

  const handleCloudLoad = async (fileName: string) => {
      setCloudMessage(null);
      try {
          const content = await api.downloadUserScript(currentUser.uid, fileName);
          handleImportCode(content);
          setIsCloudModalOpen(false);
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      }
  };

  const confirmCloudDelete = async () => {
      if (!scriptToDelete) return;
      setCloudMessage(null);
      try {
          await api.deleteUserScript(currentUser.uid, scriptToDelete);
          await fetchCloudScripts();
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      } finally {
          setScriptToDelete(null);
      }
  };

  const handlePublish = async (title: string, desc: string) => {
      try {
          await api.addShowcaseItem(currentUser.uid, title, desc, code);
          setIsPublishModalOpen(false);
          
          await fetchShowcaseItems();

          if (setActiveTab) {
              setActiveTab('showcase');
          }
          showToast("Code published successfully!", "success");
      } catch (error: any) {
          console.error("Publish failed:", error);
          showToast("Failed to publish code: " + error.message, "error");
      }
  };
  
  const handleGetHint = async () => {
      setIsGettingHint(true);
      setActiveTabState('output');
      setOutput(prev => [...prev, { type: 'log', content: '🤖 AI Tutor is thinking...' }]);
      scrollToBottom();
      try {
          const hint = await geminiService.getAIPlaygroundHint(code);
          setOutput(prev => [...prev.filter(l => l.content !== '🤖 AI Tutor is thinking...'), { type: 'hint', content: hint }]);
      } catch (err: any) {
          setOutput(prev => [...prev.filter(l => l.content !== '🤖 AI Tutor is thinking...'), { type: 'error', content: err.message || 'Failed to get hint.' }]);
      } finally {
          setIsGettingHint(false);
          scrollToBottom();
      }
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setActiveTabState('output');
    setOutput([]);
    setIsWaitingForInput(false);

    if (!pyodideRef.current) {
        setOutput([{ type: 'error', content: 'Error: Local interpreter (Pyodide) is not ready.' }]);
        setIsExecuting(false);
        return;
    }

    (window as any).playgroundAskForInput = (prompt: string) => {
        return new Promise((resolve) => {
            setInputPrompt(prompt);
            setIsWaitingForInput(true);
            inputResolverRef.current = resolve;
            
            setActiveTabState('output');
            setTimeout(() => {
                if (consoleInputRef.current) {
                    consoleInputRef.current.focus();
                }
                scrollToBottom();
            }, 50);
        });
    };

    (window as any).playgroundPrint = (text: string, type: 'log' | 'error') => {
        if (text) {
            setOutput(prev => {
                const lastOutput = prev[prev.length - 1];
                if (lastOutput && lastOutput.type === type) {
                    const newOutput = [...prev];
                    newOutput[newOutput.length - 1] = { ...lastOutput, content: lastOutput.content + text };
                    return newOutput;
                } else {
                    return [...prev, { type, content: text }];
                }
            });
            scrollToBottom();
        }
    };

    const setupCode = `
import sys
import builtins
import js

class Writer:
    def __init__(self, stream_type):
        self.stream_type = stream_type
    def write(self, text):
        js.playgroundPrint(text, self.stream_type)
    def flush(self):
        pass

sys.stdout = Writer('log')
sys.stderr = Writer('error')

async def custom_input_async(prompt_text=""):
    val = await js.playgroundAskForInput(prompt_text)
    return val

builtins.input = custom_input_async
    `;

    try {
        await pyodideRef.current.loadPackagesFromImports(code);
        await pyodideRef.current.runPythonAsync(setupCode);
        
        const asyncCode = code.replace(/\binput\s*\(/g, 'await input(');
        
        const result = await pyodideRef.current.runPythonAsync(asyncCode);

        if (result !== undefined) {
            pyodideRef.current.globals.set('last_result', result);
            await pyodideRef.current.runPythonAsync(`print(repr(last_result))`);
            pyodideRef.current.globals.delete('last_result');
            if (typeof result.destroy === 'function') {
                result.destroy();
            }
        }
        
    } catch (error: any) {
        (window as any).playgroundPrint(error.message, 'error');
    } finally {
        setIsExecuting(false);
        setIsWaitingForInput(false);
        scrollToBottom();
    }
  };
  
  const handleClearOutput = () => {
      setOutput([]);
      setIsWaitingForInput(false);
  };

  const handleCopyOutput = () => {
      const text = output.map(line => line.content).join('\n');
      navigator.clipboard.writeText(text).then(() => {
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 2000);
      });
  };

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';
  const hasContent = output.length > 0 && output[0].content !== 'Click "Run Code" to see the output here.';

  return (
    <div className="flex flex-col h-full relative p-4 sm:p-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".py,.txt"
        className="hidden"
      />

      <div className="flex-shrink-0 mb-4 flex flex-wrap justify-between items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Code Playground</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Execute Python code locally in your browser.</p>
        </div>
        <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-4">
            <button
                onClick={handleGetHint}
                disabled={isExecuting || !isPyodideReady || isWaitingForInput || isGettingHint}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700/50 rounded-lg hover:bg-yellow-200/60 dark:hover:bg-yellow-900/50 transition-colors shadow-sm disabled:opacity-50"
                title="Get an AI Hint"
            >
                <LightBulbIcon />
                <span className="hidden sm:inline">{isGettingHint ? 'Thinking...' : 'AI Hint'}</span>
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block"></div>
            <button
                onClick={handleRunCode}
                disabled={isExecuting || !isPyodideReady || isWaitingForInput || isGettingHint}
                className="relative flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Run Code"
                title={!isPyodideReady ? 'Local interpreter is initializing...' : isWaitingForInput ? 'Waiting for input...' : 'Run code'}
            >
                {!isPyodideReady && <div className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span></div>}
                <PlayIcon />
                <span>{isExecuting ? (isWaitingForInput ? 'Waiting...' : 'Running...') : 'Run Code'}</span>
            </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
            onClick={() => setActiveTabState('editor')}
            className={`flex-1 sm:flex-none text-center px-6 py-3 font-medium text-sm border-b-2 transition-colors focus:outline-none ${activeTab === 'editor' ? 'border-pink-500 text-pink-600 dark:text-pink-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        >
            Code Editor
        </button>
        <button
            onClick={() => setActiveTabState('output')}
            className={`flex-1 sm:flex-none text-center px-6 py-3 font-medium text-sm border-b-2 transition-colors focus:outline-none flex justify-center items-center gap-2 ${activeTab === 'output' ? 'border-pink-500 text-pink-600 dark:text-pink-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        >
            Output
            {hasContent && (
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
            )}
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 shadow-md border-x border-b border-gray-200 dark:border-gray-700 rounded-b-lg relative overflow-hidden">
        <div className={`w-full h-full flex flex-col ${activeTab === 'editor' ? '' : 'hidden'}`}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <div className="flex gap-4">
                  <button onClick={triggerFileUpload} className="text-xs font-medium text-gray-500 hover:text-pink-600 flex items-center gap-1"><UploadIcon className="w-4 h-4" /> Upload</button>
                  <button onClick={handleDownloadCode} className="text-xs font-medium text-gray-500 hover:text-pink-600 flex items-center gap-1"><DownloadIcon /> Download</button>
                  <button onClick={handleOpenCloudModal} className="text-xs font-medium text-gray-500 hover:text-pink-600 flex items-center gap-1"><CloudIcon className="w-4 h-4" /> Cloud</button>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setIsShareModalOpen(true)} className="text-xs font-medium text-gray-500 hover:text-pink-600 flex items-center gap-1"><ShareIcon className="w-4 h-4" /> Share</button>
                   <button onClick={() => setIsPublishModalOpen(true)} className="text-xs font-medium text-gray-500 hover:text-pink-600 flex items-center gap-1"><GlobeIcon className="w-4 h-4" /> Publish</button>
                   <button onClick={() => setIsSubmitChallengeModalOpen(true)} className="text-xs font-medium text-gray-500 hover:text-pink-600 flex items-center gap-1"><TrophyIcon className="w-4 h-4" /> Submit</button>
                </div>
            </div>
            <div className="flex-1 w-full h-full relative">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    language="python"
                    theme={editorTheme}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    onMount={handleEditorDidMount}
                    loading={<div className="text-center p-4">Loading editor...</div>}
                />
            </div>
        </div>

        <div className={`w-full h-full flex flex-col ${activeTab === 'output' ? '' : 'hidden'}`}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Console Output</span>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopyOutput}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative group"
                        title="Copy Output"
                    >
                        {copyFeedback && <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded shadow-lg animate-fade-in-up">Copied!</span>}
                        <CopyIcon />
                    </button>
                    <button 
                        onClick={handleClearOutput}
                        className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Clear Output"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
            <div 
                ref={outputContainerRef}
                className="flex-1 w-full p-4 bg-gray-900 dark:bg-black text-gray-300 font-mono text-sm whitespace-pre-wrap break-words overflow-y-auto custom-scrollbar shadow-inner"
                onClick={() => {
                    if (isWaitingForInput && consoleInputRef.current) {
                        consoleInputRef.current.focus();
                    }
                }}
            >
                {output.length === 0 && !isWaitingForInput ? (
                    <span className="text-gray-500 italic select-none">No output</span>
                ) : (
                    output.map((line, index) => (
                       <div key={index} className="leading-relaxed">
                            {line.type === 'log' ? (
                                <span className="text-gray-300">{line.content}</span>
                            ) : line.type === 'hint' ? (
                                <div className="leading-relaxed bg-yellow-900/10 p-3 rounded-lg border border-yellow-800/30 my-2 flex gap-3 font-sans">
                                    <div className="text-yellow-500 mt-1 flex-shrink-0">
                                        <LightBulbIcon />
                                    </div>
                                    <div className="flex-1">
                                        <FormattedMessage text={line.content} isUser={false} />
                                    </div>
                                </div>
                            ) : (
                                <span className="text-red-400 font-medium">{line.content}</span>
                            )}
                        </div>
                    ))
                )}
                
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
                
                {isExecuting && !isWaitingForInput && <div className="animate-pulse mt-1 text-green-500">_</div>}
            </div>
        </div>
      </div>

      {isCloudModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-200 dark:border-gray-700">
                   <button 
                        onClick={() => setIsCloudModalOpen(false)} 
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                       <XIcon />
                    </button>
                   
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                       <CloudIcon /> Cloud Scripts
                   </h3>

                   {cloudMessage && (
                       <div className={`mb-4 p-3 rounded text-sm ${cloudMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                           {cloudMessage.text}
                       </div>
                   )}

                   <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                       <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Save Current Code</h4>
                       <div className="flex gap-2">
                           <input 
                                type="text" 
                                placeholder="filename.py" 
                                value={saveFileName}
                                onChange={(e) => setSaveFileName(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                           />
                           <button 
                                onClick={handleCloudSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
                           >
                               {isSaving ? 'Saving...' : 'Save'}
                           </button>
                       </div>
                   </div>

                   <div>
                       <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Scripts</h4>
                       <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                           {isLoadingScripts ? (
                               <p className="text-center text-gray-500 text-sm py-4">Loading scripts...</p>
                           ) : cloudScripts.length === 0 ? (
                               <p className="text-center text-gray-500 text-sm py-4">No scripts saved yet.</p>
                           ) : (
                               cloudScripts.map(script => (
                                   <div key={script.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                       <div className="min-w-0 flex-1 mr-2">
                                           <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{script.name}</p>
                                           <p className="text-xs text-gray-500 dark:text-gray-400">{script.lastModified}</p>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           <button 
                                                onClick={() => handleCloudLoad(script.name)}
                                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                                           >
                                               Load
                                           </button>
                                           <button 
                                                onClick={() => setScriptToDelete(script.name)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                           >
                                               <TrashIcon />
                                           </button>
                                       </div>
                                   </div>
                               ))
                           )}
                       </div>
                   </div>
              </div>
          </div>
      )}

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmReplace}
        title="Unsaved Changes"
        message="Your current code in the playground will be overwritten. Do you want to continue?"
        confirmText="Replace"
      />

      <ConfirmationModal
        isOpen={!!scriptToDelete}
        onClose={() => setScriptToDelete(null)}
        onConfirm={confirmCloudDelete}
        title="Delete Script"
        message={`Are you sure you want to delete "${scriptToDelete}"? This action cannot be undone.`}
        confirmText="Delete"
        isDangerous
      />

      <PublishModal 
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublish={handlePublish}
      />

      <ShareCodeModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        code={code}
        currentUser={currentUser}
      />

      <SubmitToChallengeModal 
        isOpen={isSubmitChallengeModalOpen}
        onClose={() => setIsSubmitChallengeModalOpen(false)}
        code={code}
        currentUser={currentUser}
      />
    </div>
  );
};

export default CodePlayground;
