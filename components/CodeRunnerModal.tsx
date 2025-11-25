
import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';
import { PlayIcon } from './icons/PlayIcon';
import InputModal from './InputModal';

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

const CodeRunnerModal: React.FC<CodeRunnerModalProps> = ({ isOpen, onClose, code, title }) => {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pyodide, setPyodide] = useState<any | null>(null);
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  
  // Input Modal State
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const inputResolverRef = useRef<((value: string) => void) | null>(null);

  useEffect(() => {
    if (isOpen && !pyodide) {
        const loadPyodide = async () => {
            setIsLoadingPyodide(true);
            try {
                // @ts-ignore
                const pyodideInstance = await window.loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/"
                });
                setPyodide(pyodideInstance);
            } catch (error) {
                console.error("Failed to load Pyodide:", error);
                setOutput([{ type: 'error', content: "Failed to initialize Python environment." }]);
            } finally {
                setIsLoadingPyodide(false);
            }
        };
        loadPyodide();
    }
    
    if (isOpen) {
        setOutput([]); // Clear output on open
    }
  }, [isOpen]);

  useEffect(() => {
      if (outputContainerRef.current) {
          outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
      }
  }, [output]);

  const handleInputSubmit = (value: string) => {
      setInputModalOpen(false);
      if (inputResolverRef.current) {
          inputResolverRef.current(value);
          inputResolverRef.current = null;
      }
  };

  const runCode = async () => {
      if (!pyodide) return;
      setIsExecuting(true);
      setOutput([]);

      // Setup global function for Python to call to get input
      (window as any).showcaseAskForInput = (prompt: string) => {
          return new Promise((resolve) => {
              setInputPrompt(prompt);
              setInputModalOpen(true);
              inputResolverRef.current = resolve;
          });
      };

      // Setup global function for Python to print to our state
      (window as any).showcasePrint = (text: string, type: 'log' | 'error') => {
          setOutput(prev => {
              const lastOutput = prev[prev.length - 1];
              // Append to last line if types match, otherwise new line
              if (lastOutput && lastOutput.type === type) {
                  const newOutput = [...prev];
                  newOutput[newOutput.length - 1] = { ...lastOutput, content: lastOutput.content + text };
                  return newOutput;
              } else {
                  return [...prev, { type, content: text }];
              }
          });
      };

      const setupCode = `
import sys
import builtins
import js

class Writer:
    def __init__(self, stream_type):
        self.stream_type = stream_type
    def write(self, text):
        js.showcasePrint(text, self.stream_type)
    def flush(self):
        pass

sys.stdout = Writer('log')
sys.stderr = Writer('error')

async def custom_input(prompt=""):
    # Call JS function and await the promise
    val = await js.showcaseAskForInput(prompt)
    print(f"{prompt}{val}") # Echo output
    return val

# Override builtins.input
builtins.input = custom_input
      `;

      try {
          await pyodide.loadPackagesFromImports(code);
          await pyodide.runPythonAsync(setupCode);
          
          // Regex to replace standard input() calls with await input() to handle async JS interaction
          const asyncCode = code.replace(/\binput\s*\(/g, 'await input(');
          
          await pyodide.runPythonAsync(asyncCode);
          setOutput(prev => [...prev, { type: 'log', content: '\n=== Execution Finished ===' }]);
      } catch (error: any) {
          setOutput(prev => [...prev, { type: 'error', content: error.message }]);
      } finally {
          setIsExecuting(false);
      }
  };

  if (!isOpen) return null;

  return (
    <>
        {/* Z-index increased to 60 to appear above other modals (like Review modal which is 50) */}
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] relative border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-sm font-mono">.py</span>
                    {title}
                </h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 transition-colors">
                    <XIcon />
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Code Preview (Read-only) */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-950 p-4 overflow-y-auto border-r border-gray-200 dark:border-gray-800 font-mono text-xs md:text-sm">
                    <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{code}</pre>
                </div>

                {/* Output Terminal */}
                <div 
                    ref={outputContainerRef}
                    className="flex-1 bg-gray-900 dark:bg-black text-gray-300 font-mono text-xs md:text-sm p-4 overflow-y-auto flex flex-col shadow-inner"
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
                        {isExecuting && <div className="animate-pulse mt-2 text-green-500">_</div>}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
                <button 
                    onClick={runCode}
                    disabled={isExecuting || isLoadingPyodide}
                    className="flex items-center gap-2 px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-pink-500/20 transition-all"
                >
                    {isLoadingPyodide ? 'Loading Engine...' : isExecuting ? 'Running...' : (
                        <>
                            <PlayIcon /> Run Code
                        </>
                    )}
                </button>
            </div>
        </div>
        </div>
        
        <InputModal 
            isOpen={inputModalOpen} 
            promptText={inputPrompt} 
            onSubmit={handleInputSubmit} 
        />
    </>
  );
};

export default CodeRunnerModal;
