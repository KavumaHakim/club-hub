// @ts-expect-error This path's .d.ts is empty in monaco-editor 0.55 (the typed copy is on
// the main entry, which would bundle every language). It's the module monacoSetup.ts loads.
import { javascriptDefaults as untypedDefaults } from 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

// The part of Monaco's JavaScript language-service defaults used here.
interface JsLanguageDefaults {
  getCompilerOptions(): Record<string, unknown>;
  setCompilerOptions(options: Record<string, unknown>): void;
  setDiagnosticsOptions(options: {
    noSemanticValidation?: boolean;
    noSyntaxValidation?: boolean;
    noSuggestionDiagnostics?: boolean;
    diagnosticCodesToIgnore?: number[];
  }): void;
  addExtraLib(content: string, filePath?: string): { dispose(): void };
}
const javascriptDefaults = untypedDefaults as JsLanguageDefaults;

// JavaScript language features for every Monaco editor. Completion, hover and
// signature help already come from Monaco's built-in TypeScript service; this
// turns on the problem checks (off by default for JavaScript) so mistakes are
// underlined as you type, the same as for Python.

// What the challenge and duel judges provide to programs (services/challengeRunner.ts),
// declared so using them isn't flagged as undefined.
const JUDGE_GLOBALS = `
/** Reads the next line of the input. Returns null when there are no more lines. */
declare function readline(): string | null;
/** Reads the next line of the input. Throws when there are no more lines. */
declare function input(prompt?: string): string;
/** Only 'fs' is available: require('fs').readFileSync(0, 'utf8') reads the whole input. */
declare function require(name: string): any;
declare const process: {
  stdout: { write(text: string): boolean };
  argv: string[];
  env: Record<string, string>;
};
`;

// TypeScript complaints that are wrong or unhelpful for plain JavaScript.
const IGNORED_CODES = [
  1108, // 'return' outside a function: the judge runs programs inside one
  1375, 1378, // top-level await: also allowed there
  2307, 2792, // cannot find module (require('fs') is provided by the judge)
  2322, 2345, // "type X is not assignable": JavaScript variables can change type
  2339, // property doesn't exist on a type (DOM elements' .value and similar); typos still show as 2551
  2362, 2363, 2365, // arithmetic "type" errors ('3' * 2 is valid JavaScript)
  7043, 7044, 7045, 7046, 7047, 7048, 7049, 7050, // "could infer a better type" hints
  80001, 80002, 80004, 80005, 80006, 80007, // "convert to an ES module / class" suggestions
];

let configured = false;

export const registerJavaScriptLanguage = () => {
  if (configured) return;
  configured = true;
  javascriptDefaults.setCompilerOptions({
    ...javascriptDefaults.getCompilerOptions(),
    allowJs: true,
    checkJs: true,
    allowNonTsExtensions: true,
    strict: false,
    noImplicitAny: false,
    // Each file is its own scope, as when the judge or sandbox runs it. Otherwise a
    // student's `const name` or `let status` clashes with the browser's window.name
    // and window.status ("Cannot redeclare block-scoped variable").
    moduleDetection: 3, // ModuleDetectionKind.Force
  });
  javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false, // fades unused variables, as the Python checks warn about them
    diagnosticCodesToIgnore: IGNORED_CODES,
  });
  javascriptDefaults.addExtraLib(JUDGE_GLOBALS, 'ts:club-hub/judge-globals.d.ts');
};
