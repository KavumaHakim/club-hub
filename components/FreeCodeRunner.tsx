import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';
import { PlayIcon } from './icons/PlayIcon';
import Editor from '@monaco-editor/react';

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

const FreeCodeRunner: React.FC<FreeCodeRunnerProps> = ({ theme, onExit }) => {
    const [language, setLanguage] = useState<'python' | 'javascript'>('python');
    const [code, setCode] = useState(language === 'python' ? '# Python Code Runner\nprint("Hello World")' : '// JS Code Runner\nconsole.log("Hello World")');
    const [output, setOutput] = useState<OutputLine[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
    const pyodideRef = useRef<any | null>(null);
    const outputContainerRef = useRef<HTMLDivElement>(null);
    
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputPrompt, setInputPrompt] = useState('');
    const [consoleInput, setConsoleInput] = useState('');
    const inputResolverRef = useRef<((value: string) => void) | null>(null);
    const consoleInputRef = useRef<HTMLInputElement>(null);

    const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

    useEffect(() => {
        if (language === 'python' && !pyodideRef.current) {
            const loadPyodide = async () => {
                setIsLoadingPyodide(true);
                try {
                    // @ts-ignore
                    const pyodideInstance = await window.loadPyodide({
                        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/"
                    });
                    pyodideRef.current = pyodideInstance;
                } catch (error) {
                    console.error("Failed to initialize Python environment:", error);
                    setOutput([{ type: 'error', content: "Failed to initialize Python environment." }]);
                } finally {
                    setIsLoadingPyodide(false);
                }
            };
            loadPyodide();
        }
    }, [language]);

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

    const runJS = () => {
        setIsExecuting(true);
        setOutput([]);
        const originalLog = console.log;
        const originalError = console.error;

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
            eval(code);
        } catch (err: any) {
            setOutput(prev => [...prev, { type: 'error', content: err.message }]);
        } finally {
            console.log = originalLog;
            console.error = originalError;
            setIsExecuting(false);
            scrollToBottom();
        }
    };

    const runPython = async () => {
        if (!pyodideRef.current) return;
        setIsExecuting(true);
        setOutput([]);
        setIsWaitingForInput(false);

        (window as any).freeRunnerPrint = (text: string, type: 'log' | 'error') => {
            if (typeof text !== 'string') return;
            if (type === 'error') {
                setOutput(prev => [...prev, { type: 'error', content: text }]);
                scrollToBottom();
                return;
            }
            const parts = text.split('\n');
            setOutput(prev => {
                let newOutput = [...prev];
                let lastLine = newOutput.length > 0 ? newOutput[newOutput.length-1] : null;
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

        (window as any).freeRunnerAskForInput = (prompt: string) => {
            return new Promise((resolve) => {
                setInputPrompt(prompt);
                setIsWaitingForInput(true);
                inputResolverRef.current = resolve;
                setTimeout(() => {
                    consoleInputRef.current?.focus();
                    scrollToBottom();
                }, 50);
            });
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
        js.freeRunnerPrint(text, self.stream_type)
    def flush(self):
        pass

sys.stdout = Writer('log')
sys.stderr = Writer('error')

async def custom_input_async(prompt_text=""):
    val_proxy = await js.freeRunnerAskForInput(prompt_text)
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
                await pyodideRef.current.runPythonAsync("print(repr(last_result))");
                pyodideRef.current.globals.delete('last_result');
                if (typeof result.destroy === 'function') {
                    result.destroy();
                }
            }
        } catch (error: any) {
            (window as any).freeRunnerPrint(error.message, 'error');
        } finally {
            setIsExecuting(false);
            setIsWaitingForInput(false);
            scrollToBottom();
        }
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
