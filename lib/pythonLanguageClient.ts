import { PYODIDE_INDEX_URL } from '../services/sandboxRunner';

// Python language features (completion, hover, signatures, problems) for every
// Monaco editor, computed in the browser: Jedi and pyflakes running in their own
// Pyodide worker. It's separate from the worker that runs code, so analysis
// never waits behind (or interrupts) a running program, and it starts only when
// a Python editor first asks for something.

export interface PyCompletion {
  name: string;
  type: string;
  complete: string;
  detail?: string;
  signature?: string;
  doc?: string;
}

export interface PyHover {
  name: string;
  type: string;
  signatures: string[];
  inferred?: string;
  doc?: string;
}

export interface PySignature {
  label: string;
  params: string[];
  index: number | null;
  doc?: string;
}

export interface PyProblem {
  line: number;
  col: number;
  endLine?: number;
  endCol?: number;
  /** The identifier the problem is about, when there is one (to underline it). */
  name?: string;
  message: string;
  severity: 'error' | 'warning';
}

const PY_SOURCE = String.raw`
import ast
import jedi

try:
    from pyflakes import checker as _pf_checker, messages as _pf
    _ERRORS = tuple(getattr(_pf, n) for n in (
        'UndefinedName', 'UndefinedLocal', 'UndefinedExport', 'DuplicateArgument',
        'ReturnOutsideFunction', 'YieldOutsideFunction', 'ContinueOutsideLoop',
        'BreakOutsideLoop', 'DefaultExceptNotLast', 'TwoStarredExpressions',
        'TooManyExpressionsInStarredAssignment', 'ImportStarUsage',
    ) if hasattr(_pf, n))
except Exception:
    _pf_checker = None
    _ERRORS = ()


def _doc(name, limit):
    try:
        text = name.docstring(raw=True) or ''
    except Exception:
        text = ''
    return text[:limit] if text else None


def _signatures(name, limit=2):
    try:
        return [s.to_string() for s in name.get_signatures()[:limit]]
    except Exception:
        return []


def complete(code, line, col):
    try:
        found = jedi.Script(code).complete(line, col)
    except Exception:
        return []
    out = []
    for c in found:
        typed = c.name[:len(c.name) - len(c.complete)] if c.complete is not None else ''
        # Hide private and dunder names unless the student is typing one.
        if c.name.startswith('_') and not typed.startswith('_'):
            continue
        item = {'name': c.name, 'type': c.type, 'complete': c.complete or '', 'detail': c.description}
        if len(out) < 25:
            sigs = _signatures(c, 1)
            if sigs:
                item['signature'] = sigs[0]
            doc = _doc(c, 700)
            if doc:
                item['doc'] = doc
        out.append(item)
        if len(out) >= 150:
            break
    return out


def hover(code, line, col):
    try:
        script = jedi.Script(code)
        names = script.help(line, col)
    except Exception:
        return None
    if not names:
        return None
    n = names[0]
    result = {'name': n.name, 'type': n.type, 'signatures': _signatures(n)}
    if n.type in ('statement', 'instance', 'param'):
        try:
            inferred = script.infer(line, col)
            if inferred:
                result['inferred'] = inferred[0].name
        except Exception:
            pass
    doc = _doc(n, 1500)
    if doc:
        result['doc'] = doc
    return result


def signature(code, line, col):
    try:
        found = jedi.Script(code).get_signatures(line, col)
    except Exception:
        return []
    out = []
    for s in found[:3]:
        try:
            params = [p.to_string() for p in s.params]
        except Exception:
            params = []
        out.append({'label': s.to_string(), 'params': params, 'index': s.index, 'doc': _doc(s, 800)})
    return out


def check(code):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        line = e.lineno or 1
        col = e.offset or 1
        end_line = getattr(e, 'end_lineno', None) or line
        end_col = getattr(e, 'end_offset', None) or col + 1
        if end_line == line and end_col <= col:
            end_col = col + 1
        return [{'line': line, 'col': col, 'endLine': end_line, 'endCol': end_col,
                 'message': 'Syntax error: ' + str(e.msg), 'severity': 'error'}]
    if _pf_checker is None:
        return []
    try:
        w = _pf_checker.Checker(tree, filename='<code>')
    except Exception:
        return []
    out = []
    for m in sorted(w.messages, key=lambda m: (m.lineno, m.col)):
        args = m.message_args or ()
        name = args[0] if args and isinstance(args[0], str) else None
        if isinstance(m, getattr(_pf, 'UndefinedName', ())) and name:
            text = "'" + name + "' isn't defined. Check the spelling, or define it before you use it."
        else:
            text = m.message % args
        out.append({'line': m.lineno, 'col': (m.col or 0) + 1, 'name': name, 'message': text,
                    'severity': 'error' if isinstance(m, _ERRORS) else 'warning'})
    return out
`;

const workerSource = `
const PYODIDE_INDEX_URL = ${JSON.stringify(PYODIDE_INDEX_URL)};
const PY_SOURCE = ${JSON.stringify(PY_SOURCE)};
let ready = null;

const init = async () => {
  importScripts(PYODIDE_INDEX_URL + 'pyodide.js');
  const py = await self.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  const quiet = () => {};
  await py.loadPackage(['jedi'], { messageCallback: quiet, errorCallback: quiet });
  // pyflakes isn't in the Pyodide distribution; it comes from PyPI (cached by the
  // service worker). Without it, syntax errors are still reported.
  try {
    await py.loadPackage('micropip', { messageCallback: quiet, errorCallback: quiet });
    await py.pyimport('micropip').install('pyflakes==3.2.0');
  } catch (error) {}
  py.runPython(PY_SOURCE);
  return py;
};

const toJs = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value.toJs !== 'function') return value;
  const out = value.toJs({ dict_converter: Object.fromEntries, create_pyproxies: false });
  value.destroy();
  return out;
};

self.onmessage = async (event) => {
  const { id, op, code, line, col } = event.data || {};
  try {
    if (!ready) ready = init();
    const py = await ready;
    const fn = py.globals.get(op);
    const result = op === 'check' ? fn(code) : fn(code, line, col);
    fn.destroy();
    self.postMessage({ id, result: toJs(result) });
  } catch (error) {
    if (String(error).includes('loadPyodide') || String(error).includes('importScripts')) ready = null;
    self.postMessage({ id, error: String(error && error.message ? error.message : error) });
  }
};
`;

let worker: Worker | null = null;
let failed = false;
let nextId = 0;
const pending = new Map<number, (value: any) => void>();

const getWorker = (): Worker | null => {
  if (failed) return null;
  if (!worker) {
    try {
      const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
      worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = (event: MessageEvent) => {
        const { id, result } = event.data || {};
        const resolve = pending.get(id);
        if (resolve) {
          pending.delete(id);
          resolve(result ?? null);
        }
      };
      worker.onerror = () => {
        // A broken worker answers nothing; resolve everything waiting and start over next time.
        pending.forEach((resolve) => resolve(null));
        pending.clear();
        worker?.terminate();
        worker = null;
      };
    } catch {
      failed = true;
      return null;
    }
  }
  return worker;
};

// The first request waits for Python and Jedi to load (slow on phones), so allow
// it plenty of time; later requests answer in milliseconds.
const REQUEST_TIMEOUT_MS = 180000;

const call = <T>(op: 'complete' | 'hover' | 'signature' | 'check', code: string, line?: number, col?: number): Promise<T | null> =>
  new Promise((resolve) => {
    const w = getWorker();
    if (!w) return resolve(null);
    const id = ++nextId;
    pending.set(id, resolve);
    w.postMessage({ id, op, code, line, col });
    window.setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve(null);
      }
    }, REQUEST_TIMEOUT_MS);
  });

/** Lines are 1-based and columns 0-based, as Jedi counts them. */
export const pyComplete = (code: string, line: number, col: number) => call<PyCompletion[]>('complete', code, line, col);
export const pyHover = (code: string, line: number, col: number) => call<PyHover>('hover', code, line, col);
export const pySignatures = (code: string, line: number, col: number) => call<PySignature[]>('signature', code, line, col);
export const pyCheck = (code: string) => call<PyProblem[]>('check', code);
