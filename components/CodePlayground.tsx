import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import Editor, { loader } from '@monaco-editor/react';

// Add Pyodide to the global window interface to avoid TypeScript errors.
declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<any>;
  }
}

// Configure the Monaco Editor loader to fetch assets from a CDN.
// This is done once when the module is loaded.
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

interface CodePlaygroundProps {
    theme: 'light' | 'dark';
}

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme }) => {
  const [code, setCode] = useState<string>('print("Hello, Club Hub!")\n\n# You can also import packages!\nimport numpy as np\na = np.arange(15).reshape(3, 5)\nprint(a)');
  const [output, setOutput] = useState<string>('Initializing Python environment... please wait.');
  const [isPyodideLoading, setIsPyodideLoading] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const pyodideRef = useRef<any>(null);

  // Initialize Pyodide once on component mount
  useEffect(() => {
    const initializePyodide = async () => {
      try {
        pyodideRef.current = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
        });
        // Pre-load common packages to improve execution speed for users
        await pyodideRef.current.loadPackage("numpy");
        setOutput('Python environment ready. You can run your code now.');
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
        setOutput('Error: Could not initialize Python environment.');
      } finally {
        setIsPyodideLoading(false);
      }
    };
    initializePyodide();
  }, []);

  const handleRunCode = async () => {
    if (!pyodideRef.current || isExecuting) return;

    setIsExecuting(true);
    setOutput('Executing...');
    
    let finalOutput = '';

    try {
        // Redirect stdout and stderr to capture the output
        pyodideRef.current.setStdout({ batched: (str: string) => finalOutput += str + '\n' });
        pyodideRef.current.setStderr({ batched: (str: string) => finalOutput += str + '\n' });
      
        await pyodideRef.current.runPythonAsync(code);
      
        setOutput(finalOutput.trim() || 'Code executed successfully with no output.');

    } catch (error: any) {
        // Append any Python exceptions to the output
        setOutput(finalOutput.trim() + '\n' + error.toString());
    } finally {
       // Reset stdout and stderr to their default behavior
       pyodideRef.current.setStdout({});
       pyodideRef.current.setStderr({});
       setIsExecuting(false);
    }
  };

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex-shrink-0 mb-4 flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Python Playground</h2>
        <button
          onClick={handleRunCode}
          disabled={isPyodideLoading || isExecuting}
          className="flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Run Code"
        >
          <PlayIcon />
          <span>{isPyodideLoading ? 'Loading Env...' : isExecuting ? 'Running...' : 'Run Code'}</span>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Editor Panel */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
            main.py
          </div>
          <div className="flex-1 w-full h-full">
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
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
            Output
          </div>
          <pre className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap break-words overflow-y-auto rounded-b-lg">
            <code>{output}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;