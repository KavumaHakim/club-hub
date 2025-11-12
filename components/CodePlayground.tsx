import React, { useState, useEffect } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import Editor from '@monaco-editor/react';
import { executeCode } from '../services/geminiService';

interface CodePlaygroundProps {
    theme: 'light' | 'dark';
}

interface OutputLine {
    type: 'log' | 'error';
    content: string;
}

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme }) => {
  const [code, setCode] = useState<string>('print("Hello from the Club Hub Playground!")\n\n# The return value of the last expression is also displayed\nimport math\n\nmath.pi');
  const [output, setOutput] = useState<OutputLine[]>([{ type: 'log', content: 'Select an execution mode and click "Run Code" to see the output here.' }]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionMode, setExecutionMode] = useState<'ai' | 'local'>('ai');
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
        setOutput([{ type: 'error', content: "Error: Could not load the local Python interpreter. Please try refreshing. AI execution is still available." }]);
      }
    };
    setupPyodide();
  }, []);


  const handleRunCode = async () => {
    setIsExecuting(true);
    
    if (executionMode === 'ai') {
        setOutput([{ type: 'log', content: 'Executing via AI...' }]);
        try {
            const result = await executeCode(code);
            setOutput([{ type: 'log', content: result || 'Code executed successfully with no output.' }]);
        } catch (error: any) {
            setOutput([{ type: 'error', content: `Error: ${error.message}` }]);
        } finally {
            setIsExecuting(false);
        }
    } else { // 'local' execution
        setOutput([]); // Clear previous output
        if (!pyodide) {
            setOutput([{ type: 'error', content: 'Error: Local interpreter (Pyodide) is not ready.' }]);
            setIsExecuting(false);
            return;
        }

        // Use a temporary array to collect all output chunks as they arrive.
        const executionOutput: OutputLine[] = [];
        
        try {
            // Redirect stdout and stderr to push chunks into our temporary array.
            // This preserves the order of stdout and stderr messages.
            pyodide.setStdout({ batched: (str: string) => {
                if (str) executionOutput.push({ type: 'log', content: str });
            }});
            pyodide.setStderr({ batched: (str: string) => {
                if (str) executionOutput.push({ type: 'error', content: str });
            }});
            
            const result = await pyodide.runPythonAsync(code);

            // The return value of the last expression is not sent to stdout.
            // We append it to our output manually.
            if (result !== undefined && result !== null) {
                // Add a newline for consistent display with print() statements
                executionOutput.push({ type: 'log', content: result.toString() + '\n' });
            }
            
            // After execution, update the state with the collected output.
            if (executionOutput.length > 0) {
                setOutput(executionOutput);
            } else {
                setOutput([{ type: 'log', content: 'Code executed successfully with no output.' }]);
            }
        } catch (error: any) {
            // Errors from runPythonAsync are usually sent to stderr, which we already capture.
            // So, we just need to set the output to whatever we have collected.
            // If nothing was collected, it was a non-python error, so show its message.
            if (executionOutput.length > 0) {
                setOutput(executionOutput);
            } else {
                setOutput([{ type: 'error', content: `Local Execution Error:\n${error.message}` }]);
            }
        } finally {
            // CRITICAL: Always restore the default stdout/stderr handlers.
            if (pyodide) {
                pyodide.setStdout({});
                pyodide.setStderr({});
            }
            setIsExecuting(false);
        }
    }
  };

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex-shrink-0 mb-4 flex flex-wrap justify-between items-center gap-4">
        <div >
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Code Playground</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Execute Python code using AI or locally in your browser.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-900 rounded-lg">
                <button
                    onClick={() => setExecutionMode('ai')}
                    disabled={isExecuting}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${executionMode === 'ai' ? 'bg-white dark:bg-gray-700 shadow text-pink-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-800/50'}`}
                >
                    AI Interpreter
                </button>
                <button
                    onClick={() => setExecutionMode('local')}
                    disabled={isExecuting || !isPyodideReady}
                    className={`relative px-3 py-1.5 text-sm font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${executionMode === 'local' ? 'bg-white dark:bg-gray-700 shadow text-pink-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-800/50'}`}
                    title={!isPyodideReady ? 'Local interpreter is initializing...' : 'Run code in your browser'}
                >
                    Local (Browser)
                    {!isPyodideReady && <div className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span></div>}
                </button>
            </div>
            <button
                onClick={handleRunCode}
                disabled={isExecuting}
                className="flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Run Code"
            >
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
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
            Output
          </div>
          <pre className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap break-words overflow-y-auto rounded-b-lg">
            <code>
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