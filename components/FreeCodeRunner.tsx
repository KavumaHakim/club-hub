import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';
import { PlayIcon } from './icons/PlayIcon';
import Editor from '@monaco-editor/react';
import { runSandboxedJavaScript, runSandboxedPython, type SandboxExecutionController } from '../services/sandboxRunner';

interface FreeCodeRunnerProps {
    theme: 'light' | 'dark';
    onExit: () => void;
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

const FreeCodeRunner: React.FC<FreeCodeRunnerProps> = ({ theme, onExit }) => {
    const [language, setLanguage] = useState<'python' | 'javascript'>('python');
    const [code, setCode] = useState(language === 'python' ? '# Python Code Runner\nprint("Hello World")' : '// JS Code Runner\nconsole.log("Hello World")');
    const [output, setOutput] = useState<OutputLine[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
    const outputContainerRef = useRef<HTMLDivElement>(null);
    const executionRef = useRef<SandboxExecutionController | null>(null);
    
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputPrompt, setInputPrompt] = useState('');
    const [consoleInput, setConsoleInput] = useState('');
    const inputResolverRef = useRef<((value: string) => void) | null>(null);
    const consoleInputRef = useRef<HTMLInputElement>(null);

    const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

    useEffect(() => {
        return () => {
            executionRef.current?.cancel();
            executionRef.current = null;
        };
    }, []);

    const scrollToBottom = () => {
        if (outputContainerRef.current) {
            setTimeout(() => {
                outputContainerRef.current!.scrollTop = outputContainerRef.current!.scrollHeight;
            }, 10);
        }
    };

    const handleRunCode = () => {
        if (language === 'python') runPython();
        else runJS();
    };

    const runJS = async () => {
        setIsExecuting(true);
        setOutput([]);
        executionRef.current?.cancel();
        const execution = runSandboxedJavaScript({
            code,
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
            code,
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

    const handleConsoleInputEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = consoleInput;
            const fullLine = inputPrompt + val + "\n";
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

    const handleLanguageChange = (newLang: 'python' | 'javascript') => {
        setLanguage(newLang);
        setCode(newLang === 'python' ? "# Python Code Runner\nprint('Hello World')" : "// JS Code Runner\nconsole.log('Hello World')");
        setOutput([]);
    };

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-gray-900 overflow-hidden font-sans">
            {/* Minimal Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onExit}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                        title="Exit Code Runner"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                        Free Code Runner
                    </h1>
                    <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                        <button 
                            onClick={() => handleLanguageChange('python')} 
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${language === 'python' ? 'bg-white dark:bg-gray-600 shadow text-pink-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            PY
                        </button>
                        <button 
                            onClick={() => handleLanguageChange('javascript')} 
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${language === 'javascript' ? 'bg-white dark:bg-gray-600 shadow text-yellow-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            JS
                        </button>
                    </div>
                </div>
                <button 
                    onClick={handleRunCode}
                    disabled={isExecuting || (language === 'python' && isLoadingPyodide)}
                    className="flex items-center gap-2 px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                >
                    {language === 'python' && isLoadingPyodide ? (
                         <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                    ) : (
                        <PlayIcon className="w-4 h-4"/>
                    )}
                    <span>{isExecuting ? 'Running...' : 'Run'}</span>
                </button>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="flex-1 border-r border-gray-200 dark:border-gray-800 relative">
                    <Editor
                        height="100%"
                        language={language}
                        theme={editorTheme}
                        value={code}
                        onChange={(val) => setCode(val || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 16 },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                        }}
                    />
                </div>
                <div 
                    ref={outputContainerRef}
                    className="flex-1 bg-gray-900 dark:bg-black text-gray-300 font-mono text-sm p-4 overflow-y-auto flex flex-col"
                    onClick={() => {
                        if (isWaitingForInput && consoleInputRef.current) {
                            consoleInputRef.current.focus();
                        }
                    }}
                >
                    <div className="flex-1">
                        {output.length === 0 && !isExecuting && (
                            <div className="text-gray-600 italic">Click Run to execute code...</div>
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
            </div>
        </div>
    );
};

export default FreeCodeRunner;
