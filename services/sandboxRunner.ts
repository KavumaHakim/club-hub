export type SandboxOutputType = 'log' | 'error';

export interface SandboxOutputLine {
  type: SandboxOutputType;
  content: string;
}

export interface SandboxExecutionOptions {
  code: string;
  files?: Record<string, string>;
  projectId?: string | number | null;
  timeoutMs?: number;
  onOutput: (line: SandboxOutputLine) => void;
  onInputRequest?: (prompt: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export interface SandboxExecutionController {
  finished: Promise<void>;
  provideInput: (value: string) => void;
  cancel: () => void;
}

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_PYTHON_TIMEOUT_MS = 120000;
const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/';

const workerSource = `
const PYODIDE_INDEX_URL = ${JSON.stringify(PYODIDE_INDEX_URL)};
let pyodideReadyPromise = null;
let pyodide = null;
let pendingInputResolver = null;

const serializeValue = (value) => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

const postOutput = (stream, content) => {
  self.postMessage({
    type: 'output',
    stream,
    content: typeof content === 'string' ? content : serializeValue(content),
  });
};

const wrapAsyncCalls = (code, functionNames) => {
  let newCode = code;
  for (const funcName of functionNames) {
    const regex = new RegExp('\\\\b(' + funcName.replace('.', '\\\\.') + ')\\\\s*\\\\(', 'g');
    let tempCode = '';
    let lastIndex = 0;
    let match;

    const isQualified = funcName.indexOf('.') !== -1;

    while ((match = regex.exec(newCode)) !== null) {
      tempCode += newCode.substring(lastIndex, match.index);

      // Skip occurrences we must not wrap:
      //  - already preceded by "await " (wrapped on an earlier pass), or
      //  - an attribute access (e.g. the "sleep(" inside "time.sleep(") when the
      //    current name is unqualified — that call is handled by its qualified
      //    entry, so wrapping it again would corrupt it into "time.(await sleep(...))".
      const charBefore = match.index > 0 ? newCode[match.index - 1] : '';
      const sliceBefore = newCode.substring(Math.max(0, match.index - 7), match.index);
      const precededByAwait = sliceBefore.endsWith('await ') || sliceBefore.endsWith('await(');
      const isAttributeAccess = !isQualified && charBefore === '.';
      if (precededByAwait || isAttributeAccess) {
        tempCode += newCode.substring(match.index, match.index + match[0].length);
        lastIndex = match.index + match[0].length;
        continue;
      }

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
        tempCode += '(await ' + call + ')';
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

const ensurePyodide = async () => {
  if (pyodide) return pyodide;
  if (!pyodideReadyPromise) {
    pyodideReadyPromise = (async () => {
      self.postMessage({ type: 'loading', loading: true });
      importScripts(PYODIDE_INDEX_URL + 'pyodide.js');
      pyodide = await self.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
      return pyodide;
    })().finally(() => {
      self.postMessage({ type: 'loading', loading: false });
    });
  }
  return pyodideReadyPromise;
};

const mkdirTree = (fs, fullPath) => {
  const parts = fullPath.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    try {
      fs.mkdir(current);
    } catch (error) {}
  }
};

const runJavaScript = async (payload) => {
  const scopedConsole = {
    log: (...args) => postOutput('log', args.map(serializeValue).join(' ')),
    info: (...args) => postOutput('log', args.map(serializeValue).join(' ')),
    warn: (...args) => postOutput('error', args.map(serializeValue).join(' ')),
    error: (...args) => postOutput('error', args.map(serializeValue).join(' ')),
  };

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const runner = new AsyncFunction('console', '"use strict";\\n' + payload.code);
  const result = await runner(scopedConsole);
  if (result !== undefined) {
    postOutput('log', serializeValue(result));
  }
};

const runPython = async (payload) => {
  const runtime = await ensurePyodide();
  self.sandboxInput = (promptText = '') => {
    self.postMessage({ type: 'input_request', prompt: String(promptText) });
    return new Promise((resolve) => {
      pendingInputResolver = resolve;
    });
  };
  self.sandboxPrint = (text, stream) => {
    postOutput(stream === 'error' ? 'error' : 'log', typeof text === 'string' ? text : String(text));
  };

  const projectDir = '/home/pyodide/projects/' + String(payload.projectId || 'session');
  const fs = runtime.FS;
  mkdirTree(fs, projectDir);

  const files = payload.files || {};
  for (const [path, content] of Object.entries(files)) {
    const safePath = String(path).replace(/^\\/+/, '');
    const fullPath = projectDir + '/' + safePath;
    const folder = fullPath.split('/').slice(0, -1).join('/');
    if (folder) {
      mkdirTree(fs, folder);
    }
    fs.writeFile(fullPath, String(content));
  }

  const setupCode = [
    'import sys',
    'import builtins',
    'import js',
    'import time',
    'import asyncio',
    '',
    'class Writer:',
    '    def __init__(self, stream_type):',
    '        self.stream_type = stream_type',
    '    def write(self, text):',
    '        js.sandboxPrint(text, self.stream_type)',
    '    def flush(self):',
    '        pass',
    '',
    "sys.stdout = Writer('log')",
    "sys.stderr = Writer('error')",
    '',
    'async def custom_input_async(prompt_text=""):',
    '    val_proxy = await js.sandboxInput(prompt_text)',
    '    return str(val_proxy)',
    '',
    'builtins.input = custom_input_async',
    '',
    'async def custom_sleep_async(seconds):',
    '    duration = max(0.0, float(seconds))',
    '    await js.Promise.new(lambda resolve, reject: js.setTimeout(resolve, int(duration * 1000)))',
    '',
    'time.sleep = custom_sleep_async',
    'asyncio.sleep = custom_sleep_async',
    '',
    'PROJECT_DIR = ' + JSON.stringify(projectDir),
    'if PROJECT_DIR not in sys.path:',
    '    sys.path.insert(0, PROJECT_DIR)',
  ].join('\\n');

  const combinedSource = [payload.code, ...Object.values(files)].join('\\n');
  try {
    await runtime.loadPackagesFromImports(combinedSource);
  } catch (error) {}

  await runtime.runPythonAsync(setupCode);
  const asyncCode = wrapAsyncCalls(payload.code, ['input', 'time.sleep', 'asyncio.sleep', 'sleep']);
  const result = await runtime.runPythonAsync(asyncCode);

  if (result !== undefined && result !== null) {
    runtime.globals.set('__sandbox_result', result);
    const reprValue = await runtime.runPythonAsync('repr(__sandbox_result)');
    postOutput('log', reprValue);
    runtime.globals.delete('__sandbox_result');
    if (typeof result.destroy === 'function') {
      result.destroy();
    }
  }
};

self.onmessage = async (event) => {
  const payload = event.data || {};

  if (payload.type === 'input_response') {
    if (pendingInputResolver) {
      const resolve = pendingInputResolver;
      pendingInputResolver = null;
      resolve(payload.value ?? '');
    }
    return;
  }

  if (payload.type !== 'run-js' && payload.type !== 'run-python') {
    return;
  }

  try {
    if (payload.type === 'run-js') {
      await runJavaScript(payload);
    } else {
      await runPython(payload);
    }
    self.postMessage({ type: 'done' });
  } catch (error) {
    postOutput('error', error && error.message ? error.message : String(error));
    self.postMessage({ type: 'done' });
  }
};
`;

const createWorker = () => {
  const blob = new Blob([workerSource], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
};

let sharedPythonWorker: Worker | null = null;

const getSharedPythonWorker = () => {
  if (!sharedPythonWorker) {
    sharedPythonWorker = createWorker();
  }
  return sharedPythonWorker;
};

const startExecution = (
  messageType: 'run-js' | 'run-python',
  { code, files, projectId, timeoutMs = DEFAULT_TIMEOUT_MS, onOutput, onInputRequest, onLoadingChange }: SandboxExecutionOptions
): SandboxExecutionController => {
  const isPython = messageType === 'run-python';
  const worker = isPython ? getSharedPythonWorker() : createWorker();
  let finished = false;
  let timeoutId: number | null = null;
  let resolveFinished: (() => void) | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    onLoadingChange?.(false);
    if (!isPython) {
      worker.terminate();
    }
    if (resolveFinished) {
      resolveFinished();
      resolveFinished = null;
    }
  };

  const finishedPromise = new Promise<void>((resolve) => {
    resolveFinished = resolve;
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'output') {
        onOutput({
          type: data.stream === 'error' ? 'error' : 'log',
          content: typeof data.content === 'string' ? data.content : String(data.content ?? ''),
        });
        return;
      }
      if (data.type === 'input_request') {
        onInputRequest?.(typeof data.prompt === 'string' ? data.prompt : '');
        return;
      }
      if (data.type === 'loading') {
        onLoadingChange?.(!!data.loading);
        return;
      }
      if (data.type === 'done') {
        finish();
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      onOutput({
        type: 'error',
        content: event.message || 'Execution failed.',
      });
      finish();
    };
  });

  timeoutId = window.setTimeout(() => {
    onOutput({
      type: 'error',
      content: `Execution stopped after ${Math.round(timeoutMs / 1000)} seconds to protect the app.`,
    });
    finish();
  }, timeoutMs);

  worker.postMessage({
    type: messageType,
    code,
    files,
    projectId,
  });

  return {
    finished: finishedPromise,
    provideInput: (value: string) => {
      if (!finished) {
        worker.postMessage({ type: 'input_response', value });
      }
    },
    cancel: () => {
      if (finished) {
        return;
      }
      if (isPython) {
        worker.terminate();
        if (sharedPythonWorker === worker) {
          sharedPythonWorker = null;
        }
      }
      finish();
    },
  };
};

export const runSandboxedJavaScript = (options: SandboxExecutionOptions) =>
  startExecution('run-js', options);

export const runSandboxedPython = (options: SandboxExecutionOptions) =>
  startExecution('run-python', {
    ...options,
    timeoutMs: options.timeoutMs ?? DEFAULT_PYTHON_TIMEOUT_MS,
  });
