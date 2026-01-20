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
import { DotsVerticalIcon } from './icons/DotsVerticalIcon';
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

type Language = 'python' | 'javascript';

const DEFAULT_PYTHON = `#  A Python Example
name = "ICT Club Member"
print(f"Hello, {name}!")

# Lists and Loops
languages = ["Python", "JavaScript", "HTML", "CSS"]
print("We learn these languages:")

for lang in languages:
    print(f"- {lang}")

# Simple Function
def add_numbers(a, b):
    return a + b

result = add_numbers(5, 10)
print(f"5 + 10 = {result}")`;

const DEFAULT_JS = `//  A JavaScript Example
const clubName = "ICT Club Naggalama";
console.log("Welcome to " + clubName);

// Objects and Arrays
const member = {
  name: "Emily",
  xp: 150,
  skills: ["Coding", "Design"]
};

console.log("Member Info:", member);

// Array Methods
const scores = [85, 92, 78, 95];
const highScores = scores.filter(s => s > 90);
console.log("High Scores:", highScores);

// Arrow Functions
const greet = (user) => \`Happy coding, \${user}!\`;
console.log(greet(member.name));`;

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

const MenuItem: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
    <button onClick={onClick} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        {label}
    </button>
);

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

const wrapAsyncCalls = (code: string, functionNames: string[]): string => {
    let newCode = code;
    for (const funcName of functionNames) {
        const regex = new RegExp(`\\b(${funcName.replace('.', '\\.')})\\s*\\(`, 'g');
        let tempCode = '';
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(newCode)) !== null) {
            tempCode += newCode.substring(lastIndex, match.index);
            const startParenIndex = match.index + match[0].length - 1;
            let parenCount = 1;
            let endParenIndex = -1;
            for (let i = startParenIndex + 1; i < newCode.length; i++) {
                if (newCode[i] === '(') parenCount++;
                else if (newCode[i] === ')') parenCount--;
                if (parenCount === 0) {
                    endParenIndex = i;
                    break;
                }
            }
            if (endParenIndex !== -1) {
                const call = newCode.substring(match.index, endParenIndex + 1);
                tempCode += `(await ${call})`;
                lastIndex = endParenIndex + 1;
            } else {
                tempCode += newCode.substring(match.index, match.index + match[0].length);
                lastIndex = match.index + match[0].length;
            }
        }
        tempCode += newCode.substring(lastIndex);
        newCode = tempCode;
    }
    return newCode;
};

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

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme, currentUser, setActiveTab }) => {
  const { fetchShowcaseItems, showToast } = useData();
  const [language, setLanguage] = useState<Language>(() => {
      return (localStorage.getItem('playground_lang') as Language) || 'python';
  });

  const [code, setCode] = useState<string>(() => {
      const saved = localStorage.getItem(`playground_code_${language}`);
      if (saved) return saved;
      return language === 'python' ? DEFAULT_PYTHON : DEFAULT_JS;
  });
  
  const [output, setOutput] = useState<OutputLine[]>([{ type: 'log', content: 'Click "Run Code" to see the output here.' }]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const pyodideRef = useRef<any | null>(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [activeTab, setActiveTabState] = useState<'editor' | 'output'>('editor');
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
  const menuRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef(code);
  const completionProvidersRef = useRef<any[]>([]);

  useEffect(() => {
      localStorage.setItem(`playground_code_${language}`, code);
      codeRef.current = code;
  }, [code, language]);

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === language) return;
    
    const currentCode = code.trim();
    // Check if current code is one of the defaults
    const isDefault = currentCode === DEFAULT_PYTHON.trim() || 
                      currentCode === DEFAULT_JS.trim() || 
                      currentCode === '';

    setLanguage(newLang);
    localStorage.setItem('playground_lang', newLang);

    const saved = localStorage.getItem(`playground_code_${newLang}`);
    if (saved) {
        setCode(saved);
    } else if (isDefault) {
        // If it was default/empty, load the new language's default
        setCode(newLang === 'python' ? DEFAULT_PYTHON : DEFAULT_JS);
    }
  };
  
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
          scrollBeyondLastLine: true,
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
            vertical: 'auto',
            horizontal: 'auto',
          }
      });

      completionProvidersRef.current.forEach(provider => provider.dispose());
      completionProvidersRef.current = [];

      const staticProvider = {
          provideCompletionItems: (model: any, position: any) => {
              const word = model.getWordUntilPosition(position);
              const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
              
              if (language === 'python') {
                const suggestions = [
                    ...PYTHON_KEYWORDS.map(k => ({ label: k, kind: monaco.languages.CompletionItemKind.Keyword, insertText: k, range, detail: 'Keyword' })),
                    ...PYTHON_BUILTINS.map(b => ({ label: b, kind: monaco.languages.CompletionItemKind.Function, insertText: b, range, detail: 'Built-in' })),
                    { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:name}(${2:args}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
                    { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
                ];
                return { suggestions };
              }
              return { suggestions: [] };
          }
      };
      completionProvidersRef.current.push(monaco.languages.registerCompletionItemProvider(language, staticProvider));
  };


  const handleImportCode = (importedCode: string) => {
      const currentCode = codeRef.current;
      const def = language === 'python' ? DEFAULT_PYTHON : DEFAULT_JS;
      
      if (!currentCode || currentCode.trim() === '' || currentCode.trim() === def.trim()) {
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
    
    // Close menu on outside click
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };

    window.addEventListener('open-in-playground' as any, handleOpenCode);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        window.removeEventListener('open-in-playground' as any, handleOpenCode);
        document.removeEventListener('mousedown', handleClickOutside);
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
    const ext = language === 'python' ? 'py' : 'js';
    const blob = new Blob([code], { type: language === 'python' ? 'text/x-python' : 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
    setIsMenuOpen(false);
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
      setIsMenuOpen(false);
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
          const hint = await geminiService.getAIPlaygroundHint(code, language);
          setOutput(prev => [...prev.filter(l => l.content !== '🤖 AI Tutor is thinking...'), { type: 'hint', content: hint }]);
      } catch (err: any) {
          setOutput(prev => [...prev.filter(l => l.content !== '🤖 AI Tutor is thinking...'), { type: 'error', content: err.message || 'Failed to get hint.' }]);
      } finally {
          setIsGettingHint(false);
          scrollToBottom();
      }
  };

  const runJS = () => {
      setIsExecuting(true);
      setActiveTabState('output');
      setOutput([]);
      
      const originalLog = console.log;
      const originalError = console.error;

      // Capture logs
      console.log = (...args) => {
          const content = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          setOutput(prev => [...prev, { type: 'log', content }]);
          scrollToBottom();
      };
      
      console.error = (...args) => {
          const content = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          setOutput(prev => [...prev, { type: 'error', content }]);
          scrollToBottom();
      };

      try {
          // Standard JS execution
          eval(code);
      } catch (err: any) {
          setOutput(prev => [...prev, { type: 'error', content: err.message }]);
      } finally {
          // Restore
          console.log = originalLog;
          console.error = originalError;
          setIsExecuting(false);
          scrollToBottom();
      }
  };

  const runPython = async () => {
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
        if (typeof text !== 'string') return;
        if (type === 'error') {
            setOutput(prev => [...prev, { type: 'error', content: text }]);
            scrollToBottom();
            return;
        }
        const parts = text.split('\n');
        setOutput(prev => {
            let newOutput = [...prev];
            let lastLine = newOutput.length > 0 ? newOutput[newOutput.length - 1] : null;
            if (lastLine && lastLine.type === type) {
                lastLine.content += parts[0];
                newOutput[newOutput.length-1] = { ...lastLine, content: processCarriageReturns(lastLine.content) };
            } else {
                newOutput.push({ type, content: processCarriageReturns(parts[0]) });
            }
            if (parts.length > 1) {
                for (let i = 1; i < parts.length; i++) {
                    newOutput.push({ type, content: parts[i] });
                }
            }
            return newOutput;
        });
        scrollToBottom();
    };

    const setupCode = `
import sys
import builtins
import js
import time
import asyncio

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
    val_proxy = await js.playgroundAskForInput(prompt_text)
    return str(val_proxy)

builtins.input = custom_input_async

async def custom_sleep_async(seconds):
    await js.Promise.new(lambda resolve, reject: js.setTimeout(resolve, seconds * 1000))

time.sleep = custom_sleep_async
asyncio.sleep = custom_sleep_async
    `;

    try {
        await pyodideRef.current.loadPackagesFromImports(code);
        await pyodideRef.current.runPythonAsync(setupCode);
        
        const asyncCode = wrapAsyncCalls(code, ['input', 'time.sleep', 'asyncio.sleep']);
        
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

  const handleRunCode = () => {
      if (language === 'python') runPython();
      else runJS();
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
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept={language === 'python' ? ".py,.txt" : ".js,.txt"}
        className="hidden"
      />

      {/* Compact Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
             <div className="flex bg-gray-200 dark:bg-gray-700 p-0.5 rounded-lg">
                <button onClick={() => handleLanguageChange('python')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'python' ? 'bg-white dark:bg-gray-600 shadow text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>PY</button>
                <button onClick={() => handleLanguageChange('javascript')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'javascript' ? 'bg-white dark:bg-gray-600 shadow text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>JS</button>
             </div>
             <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>
             {/* Tabs */}
             <div className="flex bg-gray-200 dark:bg-gray-700 p-0.5 rounded-lg">
                <button onClick={() => setActiveTabState('editor')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'editor' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>Code</button>
                <button onClick={() => setActiveTabState('output')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'output' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>Output</button>
             </div>
        </div>

        <div className="flex items-center gap-2">
             <button 
                onClick={handleGetHint} 
                disabled={isExecuting || (language === 'python' && !isPyodideReady) || isWaitingForInput || isGettingHint}
                className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-md transition-colors disabled:opacity-50" 
                title="AI Hint"
             >
                <LightBulbIcon className="w-5 h-5"/>
             </button>
             
             <button 
                onClick={handleRunCode} 
                disabled={isExecuting || (language === 'python' && !isPyodideReady) || isWaitingForInput}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {language === 'python' && !isPyodideReady ? (
                    <span className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></span>
                ) : (
                    <PlayIcon className="w-3.5 h-3.5"/>
                )}
                <span className="hidden sm:inline">{isExecuting ? 'Running...' : 'Run'}</span>
             </button>
             
             {/* Dropdown Trigger */}
             <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className={`p-1.5 rounded-md transition-colors ${isMenuOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400'}`}
                >
                    <DotsVerticalIcon />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 animate-fade-in-up">
                        <MenuItem onClick={triggerFileUpload} icon={<UploadIcon className="w-4 h-4"/>} label="Upload" />
                        <MenuItem onClick={handleDownloadCode} icon={<DownloadIcon className="w-4 h-4"/>} label="Download" />
                        <MenuItem onClick={handleOpenCloudModal} icon={<CloudIcon className="w-4 h-4"/>} label="Cloud Scripts" />
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                        <MenuItem onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }} icon={<ShareIcon className="w-4 h-4"/>} label="Share" />
                        <MenuItem onClick={() => { setIsPublishModalOpen(true); setIsMenuOpen(false); }} icon={<GlobeIcon className="w-4 h-4"/>} label="Publish" />
                        <MenuItem onClick={() => { setIsSubmitChallengeModalOpen(true); setIsMenuOpen(false); }} icon={<TrophyIcon className="w-4 h-4"/>} label="Submit Challenge" />
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {/* Editor */}
        <div className={`absolute inset-0 w-full h-full ${activeTab === 'editor' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
             <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                theme={editorTheme}
                value={code}
                onChange={(value) => setCode(value || '')}
                onMount={handleEditorDidMount}
                loading={<div className="flex items-center justify-center h-full text-gray-500">Loading editor...</div>}
                options={{
                    padding: { top: 16, bottom: 16 },
                }}
            />
        </div>
        
        {/* Output */}
        <div className={`absolute inset-0 w-full h-full bg-gray-900 dark:bg-black text-gray-300 font-mono text-sm overflow-hidden flex flex-col ${activeTab === 'output' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
             <div className="flex justify-between items-center p-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2">Console</span>
                <div className="flex gap-1">
                    <button onClick={handleCopyOutput} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors" title="Copy Output">
                        <CopyIcon className="w-4 h-4" />
                    </button>
                    <button onClick={handleClearOutput} className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700 transition-colors" title="Clear Console">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
             </div>
             <div 
                ref={outputContainerRef}
                className="flex-1 p-4 overflow-y-auto custom-scrollbar break-all"
                onClick={() => {
                    if (isWaitingForInput && consoleInputRef.current) {
                        consoleInputRef.current.focus();
                    }
                }}
             >
                {output.length === 0 && !isWaitingForInput ? (
                    <span className="text-gray-600 italic select-none">Run code to see output...</span>
                ) : (
                    output.map((line, index) => (
                       <div key={index} className="leading-relaxed mb-0.5">
                            {line.type === 'log' ? (
                                <span className="text-gray-300">{line.content}</span>
                            ) : line.type === 'hint' ? (
                                <div className="bg-yellow-900/20 p-3 rounded border-l-2 border-yellow-600 my-2 flex gap-3 font-sans text-gray-200">
                                    <div className="text-yellow-500 mt-0.5 flex-shrink-0">
                                        <LightBulbIcon className="w-4 h-4"/>
                                    </div>
                                    <div className="flex-1 text-sm">
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
                                placeholder={`filename.${language === 'python' ? 'py' : 'js'}`} 
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