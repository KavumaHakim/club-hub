
import React, { useState, useEffect } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { TrashIcon } from './icons/TrashIcon';
import Editor from '@monaco-editor/react';

interface CodePlaygroundProps {
    theme: 'light' | 'dark';
}

interface OutputLine {
    type: 'log' | 'error';
    content: string;
}

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme }) => {
  const [code, setCode] = useState<string>('print("Hello from the ICT Club Hub Playground!")\n\nname = input("What is your name? ")\nprint(f"Nice to meet you, {name}!")\n\n# The return value of the last expression is also displayed\nimport math\nmath.pi');
  const [output, setOutput] = useState<OutputLine[]>([{ type: 'log', content: 'Click "Run Code" to see the output here.' }]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [pyodide, setPyodide] = useState<any | null>(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);

  useEffect(() => {
    const setupPyodide = async () => {
      try {
        // loadPyodide is globally available from the script tag in index.html
        const pyodideInstance = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/"
        });
        setPyodide(pyodideInstance);
        setIsPyodideReady(true);
        console.log("Pyodide loaded successfully.");
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
        setOutput([{ type: 'error', content: "Error: Could not load the local Python interpreter. Please try refreshing." }]);
      }
    };
    setupPyodide();
  }, []);


  const handleRunCode = async () => {
    setIsExecuting(true);
    setOutput([]); // Clear previous output

    if (!pyodide) {
        setOutput([{ type: 'error', content: 'Error: Local interpreter (Pyodide) is not ready.' }]);
        setIsExecuting(false);
        return;
    }

    let hasOutput = false; // To track if any output was generated

    // 1. Expose JS callback to Pyodide for streaming output
    (window as any).sendOutputToReact = (text: string, type: 'log' | 'error') => {
        if (text) {
            hasOutput = true;
            setOutput(prev => {
                const lastOutput = prev[prev.length - 1];
                // Append to the last message if it's the same type to avoid creating many separate spans
                if (lastOutput && lastOutput.type === type) {
                    const newOutput = [...prev];
                    newOutput[newOutput.length - 1] = { ...lastOutput, content: lastOutput.content + text };
                    return newOutput;
                } else {
                    return [...prev, { type, content: text }];
                }
            });
        }
    };

    // 2. Python code to redirect stdout/stderr and override input()
    const setupCode = `
import sys
import builtins
from js import sendOutputToReact, prompt

class Writer:
    def __init__(self, stream_type):
        self.stream_type = stream_type
    def write(self, text):
        sendOutputToReact(text, self.stream_type)
    def flush(self):
        pass

sys.stdout = Writer('log')
sys.stderr = Writer('error')

def input_override(prompt_text=""):
    val = prompt(prompt_text)
    if val is None:
        val = ""
    print(f"{prompt_text}{val}")
    return val

builtins.input = input_override
    `;

    try {
        // Load packages based on imports
        await pyodide.loadPackagesFromImports(code);

        await pyodide.runPythonAsync(setupCode);
        const result = await pyodide.runPythonAsync(code);

        // 3. Handle the return value of the last expression
        if (result !== undefined) {
            pyodide.globals.set('last_result', result);
            // Use print(repr()) to mimic a REPL, which will be caught by our stdout handler
            await pyodide.runPythonAsync(`print(repr(last_result))`);
            pyodide.globals.delete('last_result');
            if (typeof result.destroy === 'function') {
                result.destroy();
            }
        }
        
        // 4. Handle no output case
        if (!hasOutput) {
            setOutput([{ type: 'log', content: 'Code executed successfully with no output.' }]);
        }

    } catch (error: any) {
        // Python tracebacks are handled by the stderr writer.
        // This catches compilation errors or other JS exceptions from pyodide.
        (window as any).sendOutputToReact(error.message, 'error');
    } finally {
        setIsExecuting(false);
        // Clean up the global function to avoid memory leaks
        if ((window as any).sendOutputToReact) {
          delete (window as any).sendOutputToReact;
        }
    }
  };
  
  const handleClearOutput = () => {
      setOutput([]);
  };

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex-shrink-0 mb-4 flex flex-wrap justify-between items-center gap-4">
        <div >
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Code Playground</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Execute Python code locally in your browser.</p>
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={handleRunCode}
                disabled={isExecuting || !isPyodideReady}
                className="relative flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Run Code"
                title={!isPyodideReady ? 'Local interpreter is initializing...' : 'Run code in your browser'}
            >
                {!isPyodideReady && <div className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span></div>}
                <PlayIcon />
                <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
            </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Editor Panel */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
            main.py
          </div>
          <div className="flex-1 w-full h-full relative">
            <Editor
              height="100%"
              language="python"
              theme={editorTheme}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
              }}
              // A loading indicator for the editor itself
              loading={<div className="text-center p-4">Loading editor...</div>}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Output</span>
            <button 
                onClick={handleClearOutput}
                className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Clear Output"
                aria-label="Clear Output"
            >
                <TrashIcon />
            </button>
          </div>
          <pre className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap break-words overflow-y-auto rounded-b-lg">
            <code>
                {output.length === 0 && <span className="text-gray-400 italic">No output</span>}
                {output.map((line, index) => (
                    <span key={index} className={line.type === 'error' ? 'text-red-500' : ''}>
                        {line.content}
                    </span>
                ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
