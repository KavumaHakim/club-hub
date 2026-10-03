import { pyCheck, pyComplete, pyHover, pySignatures, type PyProblem } from './pythonLanguageClient';

// Registers Python completion, hover, signature help and live problems on the
// shared Monaco instance. Every <Editor> calls this from beforeMount; it only
// does the work once, and applies to every Python model, so the Playground,
// challenge workspace and duel editors all get it.

const MARKER_OWNER = 'python-language';
let registered = false;

export const registerPythonLanguage = (monaco: any) => {
  if (registered || !monaco?.languages) return;
  registered = true;

  const K = monaco.languages.CompletionItemKind;
  const kindOf: Record<string, number> = {
    module: K.Module,
    class: K.Class,
    instance: K.Variable,
    function: K.Function,
    param: K.Variable,
    path: K.File,
    keyword: K.Keyword,
    property: K.Property,
    statement: K.Variable,
  };

  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'],
    provideCompletionItems: async (model: any, position: any, _context: any, token: any) => {
      const items = await pyComplete(model.getValue(), position.lineNumber, position.column - 1);
      if (!items || token?.isCancellationRequested) return { suggestions: [] };
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: items.map((c, i) => ({
          label: c.name,
          kind: kindOf[c.type] ?? K.Variable,
          insertText: c.name,
          range,
          detail: c.signature || c.detail || c.type,
          documentation: c.doc ? { value: c.doc } : undefined,
          // Keep Jedi's ranking.
          sortText: String(i).padStart(4, '0'),
        })),
      };
    },
  });

  monaco.languages.registerHoverProvider('python', {
    provideHover: async (model: any, position: any, token: any) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const info = await pyHover(model.getValue(), position.lineNumber, position.column - 1);
      if (!info || token?.isCancellationRequested) return null;
      const head = info.signatures.length
        ? info.signatures.join('\n')
        : info.inferred
          ? `${info.name}: ${info.inferred}`
          : `${info.type} ${info.name}`;
      const contents = [{ value: '```python\n' + head + '\n```' }];
      if (info.doc) contents.push({ value: info.doc });
      return {
        range: { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn },
        contents,
      };
    },
  });

  monaco.languages.registerSignatureHelpProvider('python', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    provideSignatureHelp: async (model: any, position: any, token: any) => {
      const sigs = await pySignatures(model.getValue(), position.lineNumber, position.column - 1);
      if (!sigs || !sigs.length || token?.isCancellationRequested) return null;
      return {
        value: {
          signatures: sigs.map((s) => {
            // Point each parameter at its place in the label so Monaco can bold it.
            let from = s.label.indexOf('(') + 1;
            const parameters = s.params.map((p) => {
              const at = s.label.indexOf(p, from);
              if (at < 0) return { label: p };
              from = at + p.length;
              return { label: [at, at + p.length] as [number, number] };
            });
            return { label: s.label, parameters, documentation: s.doc ? { value: s.doc } : undefined };
          }),
          activeSignature: 0,
          activeParameter: sigs[0].index ?? 0,
        },
        dispose: () => {},
      };
    },
  });

  // Live problems: re-checked shortly after typing stops.
  const toMarker = (model: any, p: PyProblem) => {
    const line = Math.min(Math.max(1, p.line), model.getLineCount());
    const text = model.getLineContent(line);
    let startColumn = Math.max(1, p.col);
    let endLineNumber = p.endLine ?? line;
    let endColumn = p.endCol ?? 0;
    if (!endColumn) {
      const at = p.name ? text.indexOf(p.name, startColumn - 1) : -1;
      if (at >= 0) {
        startColumn = at + 1;
        endColumn = at + 1 + p.name!.length;
      } else {
        const word = model.getWordAtPosition({ lineNumber: line, column: startColumn });
        endColumn = word ? word.endColumn : Math.max(startColumn + 1, text.length + 1);
        if (word) startColumn = word.startColumn;
      }
      endLineNumber = line;
    }
    return {
      startLineNumber: line,
      startColumn,
      endLineNumber,
      endColumn,
      message: p.message,
      severity: p.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      source: 'Python',
    };
  };

  // Each watched model's "check soon" function.
  const scheduled = new WeakMap<object, () => void>();
  const watch = (model: any) => {
    if (scheduled.has(model)) return;
    let timer: number | undefined;
    let version = 0;
    const run = async () => {
      const mine = ++version;
      if (model.isDisposed()) return;
      if (model.getLanguageId() !== 'python') {
        monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
        return;
      }
      const problems = await pyCheck(model.getValue());
      if (mine !== version || model.isDisposed() || model.getLanguageId() !== 'python') return;
      monaco.editor.setModelMarkers(model, MARKER_OWNER, (problems || []).map((p) => toMarker(model, p)));
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 450);
    };
    scheduled.set(model, schedule);
    const changes = model.onDidChangeContent(schedule);
    model.onWillDispose(() => {
      window.clearTimeout(timer);
      changes.dispose();
    });
    if (model.getLanguageId() === 'python') schedule();
  };

  monaco.editor.getModels().forEach(watch);
  monaco.editor.onDidCreateModel(watch);
  // The Playground switches a model's language in place.
  monaco.editor.onDidChangeModelLanguage(({ model }: any) => {
    watch(model);
    scheduled.get(model)?.();
  });
};
