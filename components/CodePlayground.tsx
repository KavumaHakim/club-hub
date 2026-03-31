import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { CloudIcon } from './icons/CloudIcon';
import { XIcon } from './icons/XIcon';
import { CopyIcon } from './icons/CopyIcon';
import { GlobeIcon } from './icons/GlobeIcon'; 
import { ShareIcon } from './icons/ShareIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { DotsVerticalIcon } from './icons/DotsVerticalIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { ViewGridIcon } from './icons/ViewGridIcon';
import { UsersIcon } from './icons/UsersIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { PencilIcon } from './icons/PencilIcon';
import Editor from '@monaco-editor/react';
import { emmetHTML } from 'emmet-monaco-es';
import { User, Tab, PlaygroundProject, PlaygroundProjectFile, PlaygroundProjectActivity, PlaygroundProjectMember } from '../types';
import * as api from '../services/apiService';
import * as geminiService from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';
import ShareCodeModal from './ShareCodeModal';
import SubmitToChallengeModal from './SubmitToChallengeModal';
import { useData } from '../DataContext';
import { FormattedMessage } from './FormattedMessage';
import { supabase } from '../services/supabaseClient';

interface CodePlaygroundProps {
    theme: 'light' | 'dark';
    currentUser: User;
    setActiveTab?: (tab: Tab) => void; 
}

interface OutputLine {
    type: 'log' | 'error' | 'hint';
    content: string;
}

interface ScriptFile {
    name: string;
    id: string;
    lastModified: string;
    size: number;
}

type SingleLanguage = 'python' | 'javascript' | 'html';
type ProjectLanguage = 'python' | 'web' | 'javascript' | 'html';

const DEFAULT_PYTHON = `#  A Python Example
name = "ICT Club Member"
print(f"Hello, {name}!")

# Lists and Loops
languages = ["Python", "JavaScript", "HTML", "CSS"]
print("We learn these languages:")

for lang in languages:
    print(f"- {lang}")

# Simple Function
def add_numbers(a, b):
    return a + b

result = add_numbers(5, 10)
print(f"5 + 10 = {result}")`;

const DEFAULT_JS = `//  A JavaScript Example
const clubName = "ICT Club Naggalama";
console.log("Welcome to " + clubName);

// Objects and Arrays
const member = {
  name: "Emily",
  xp: 150,
  skills: ["Coding", "Design"]
};

console.log("Member Info:", member);

// Array Methods
const scores = [85, 92, 78, 95];
const highScores = scores.filter(s => s > 90);
console.log("High Scores:", highScores);

// Arrow Functions
const greet = (user) => \`Happy coding, \${user}!\`;
console.log(greet(member.name));`;

const DEFAULT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClubHub Preview</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; }
      .card { background: #1e293b; padding: 20px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.35); }
      h1 { margin: 0 0 12px; }
      button { background: #ec4899; color: white; border: 0; padding: 10px 14px; border-radius: 10px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Hello from ClubHub</h1>
      <p>Edit this HTML and click Preview.</p>
      <button onclick="alert('Keep building!')">Click me</button>
    </div>
  </body>
</html>`;

const DEFAULT_WEB_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClubHub Web Project</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="card">
      <h1>Welcome to your Web Project</h1>
      <p>Edit <strong>index.html</strong>, <strong>styles.css</strong>, and <strong>app.js</strong>.</p>
      <button id="helloBtn">Click me</button>
    </div>
    <script src="./app.js"></script>
  </body>
</html>`;

const DEFAULT_WEB_CSS = `:root {
  color-scheme: dark;
}

body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #0f172a;
  color: #f8fafc;
}

.card {
  background: #1e293b;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  max-width: 520px;
}

button {
  background: #ec4899;
  color: white;
  border: 0;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
}`;

const DEFAULT_WEB_JS = `const button = document.getElementById('helloBtn');
if (button) {
  button.addEventListener('click', () => {
    alert('Keep building your web project!');
  });
}`;

const PublishModal: React.FC<{ isOpen: boolean, onClose: () => void, onPublish: (title: string, desc: string) => Promise<void> }> = ({ isOpen, onClose, onPublish }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !desc) return;
        setIsPublishing(true);
        await onPublish(title, desc);
        setIsPublishing(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Publish to Showcase</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            required 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" 
                            placeholder="My Awesome Script"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea 
                            value={desc} 
                            onChange={e => setDesc(e.target.value)} 
                            required 
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500" 
                            placeholder="What does this code do?"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isPublishing}
                        className="w-full py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50"
                    >
                        {isPublishing ? 'Publishing...' : 'Publish'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const MenuItem: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
    <button onClick={onClick} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        {label}
    </button>
);

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

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme, currentUser, setActiveTab }) => {
  const { fetchShowcaseItems, showToast, teams, allUsers } = useData();
  const [language, setLanguage] = useState<SingleLanguage>(() => {
      return (localStorage.getItem('playground_lang') as SingleLanguage) || 'python';
  });

  const [code, setCode] = useState<string>(() => {
      const saved = localStorage.getItem(`playground_code_${language}`);
      if (saved) return saved;
      if (language === 'python') return DEFAULT_PYTHON;
      if (language === 'javascript') return DEFAULT_JS;
      return DEFAULT_HTML;
  });

  const [projects, setProjects] = useState<PlaygroundProject[]>([]);
  const [projectFiles, setProjectFiles] = useState<PlaygroundProjectFile[]>([]);
  const [projectActivity, setProjectActivity] = useState<PlaygroundProjectActivity[]>([]);
  const [projectMembers, setProjectMembers] = useState<PlaygroundProjectMember[]>([]);
  const [memberProjectIds, setMemberProjectIds] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<PlaygroundProject | null>(null);
  const [activeFile, setActiveFile] = useState<PlaygroundProjectFile | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', language: 'python' as ProjectLanguage, teamId: '' });
  const [newFileName, setNewFileName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<PlaygroundProject | null>(null);
  const [renamingFile, setRenamingFile] = useState<PlaygroundProjectFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'me' | 'team'>('all');
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [htmlPreview, setHtmlPreview] = useState(DEFAULT_HTML);
  const [previewConsole, setPreviewConsole] = useState<OutputLine[]>([]);
  const [previewSessionId, setPreviewSessionId] = useState(0);
  const [showPreviewConsole, setShowPreviewConsole] = useState(true);
  
  const [output, setOutput] = useState<OutputLine[]>([{ type: 'log', content: 'Click "Run Code" to see the output here.' }]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const pyodideRef = useRef<any | null>(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [activeTab, setActiveTabState] = useState<'editor' | 'output' | 'preview'>('editor');
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [cloudScripts, setCloudScripts] = useState<ScriptFile[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSubmitChallengeModalOpen, setIsSubmitChallengeModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [consoleInput, setConsoleInput] = useState('');
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef(code);
  const activeFileRef = useRef<PlaygroundProjectFile | null>(null);
  const completionProvidersRef = useRef<any[]>([]);
  const emmetInitializedRef = useRef(false);
  const collabChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const lastRemoteUpdateRef = useRef<Record<string, number>>({});
  const isProjectMode = !!activeProject;
  const canPreview = isProjectMode
      ? activeProject?.language === 'web' || activeProject?.language === 'html'
      : language === 'html';

  useEffect(() => {
      if (!activeProject) {
          localStorage.setItem(`playground_code_${language}`, code);
      }
      codeRef.current = code;
      if (activeProject && activeFile) {
          setFileContents(prev => ({ ...prev, [activeFile.path]: code }));
      }
      if (typeof window !== 'undefined') {
          const liveLang = activeProject ? activeProject.language : language;
          const payload = {
              language: liveLang,
              code,
              file: activeFile?.path || '',
              projectId: activeProject?.id || '',
              projectMode: !!activeProject
          };
          localStorage.setItem('playground_live_lang', liveLang);
          localStorage.setItem('playground_live_code', code);
          localStorage.setItem('playground_live_file', payload.file);
          localStorage.setItem('playground_live_project', payload.projectId);
          window.dispatchEvent(new CustomEvent('playground-code-change', { detail: payload }));
      }
  }, [code, language, activeProject, activeFile]);

  const handleLanguageChange = (newLang: SingleLanguage) => {
    if (activeProject) {
        showToast("Project language is locked. Exit the project to switch.", "info");
        return;
    }
    if (newLang === language) return;
    
    const currentCode = code.trim();
    // Check if current code is one of the defaults
    const isDefault = currentCode === DEFAULT_PYTHON.trim() || 
                      currentCode === DEFAULT_JS.trim() || 
                      currentCode === DEFAULT_HTML.trim() ||
                      currentCode === '';

    setLanguage(newLang);
    localStorage.setItem('playground_lang', newLang);

    const saved = localStorage.getItem(`playground_code_${newLang}`);
    if (saved) {
        setCode(saved);
        if (newLang === 'html') setHtmlPreview(saved);
    } else if (isDefault) {
        // If it was default/empty, load the new language's default
        if (newLang === 'python') setCode(DEFAULT_PYTHON);
        else if (newLang === 'javascript') setCode(DEFAULT_JS);
        else {
            setCode(DEFAULT_HTML);
            setHtmlPreview(DEFAULT_HTML);
        }
    }
  };

  useEffect(() => {
      if (!canPreview && activeTab === 'preview') {
          setActiveTabState('editor');
      }
  }, [canPreview, activeTab]);
  
  useEffect(() => {
    return () => {
        completionProvidersRef.current.forEach(provider => provider.dispose());
        completionProvidersRef.current = [];
    };
  }, []);

  useEffect(() => {
      loadProjects();
  }, []);

  useEffect(() => {
      if (!activeProject) {
          setProjectFiles([]);
          setActiveFile(null);
          setProjectMembers([]);
          setInviteUserId('');
          setInviteTeamId('');
          const saved = localStorage.getItem(`playground_code_${language}`);
          if (saved) {
              setCode(saved);
          } else {
              if (language === 'python') setCode(DEFAULT_PYTHON);
              else if (language === 'javascript') setCode(DEFAULT_JS);
              else setCode(DEFAULT_HTML);
          }
      }
  }, [activeProject]);

  useEffect(() => {
      if (!activeProject && language === 'html') {
          setHtmlPreview(code);
      }
  }, [language, activeProject]);

  useEffect(() => {
      const handlePreviewMessage = (event: MessageEvent) => {
          const data = event.data;
          if (!data || data.type !== 'clubhub-preview') return;
          if (data.sessionId !== previewSessionId) return;
          const level = data.level as 'log' | 'error';
          const content = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
          setPreviewConsole(prev => [...prev, { type: level === 'error' ? 'error' : 'log', content }]);
      };

      window.addEventListener('message', handlePreviewMessage);
      return () => window.removeEventListener('message', handlePreviewMessage);
  }, [previewSessionId]);

  useEffect(() => {
      activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
      if (!activeProject) {
          if (collabChannelRef.current) {
              supabase.removeChannel(collabChannelRef.current);
              collabChannelRef.current = null;
          }
          return;
      }

      const channel = supabase.channel(`playground-project:${activeProject.id}`, {
          config: { broadcast: { ack: false } }
      });

      channel.on('broadcast', { event: 'file_update' }, ({ payload }) => {
          if (!payload || payload.userId === currentUser.uid) return;
          const path = payload.path as string;
          const content = payload.content as string;
          lastRemoteUpdateRef.current[path] = Date.now();
          setFileContents(prev => ({ ...prev, [path]: content }));
          if (activeFileRef.current?.path === path) {
              setCode(content);
          }
      });

      channel.subscribe();
      collabChannelRef.current = channel;

      return () => {
          supabase.removeChannel(channel);
          collabChannelRef.current = null;
      };
  }, [activeProject?.id, currentUser.uid]);

  useEffect(() => {
      if (!isProjectMode || !activeProject || !activeFile || !collabChannelRef.current) return;
      const lastRemote = lastRemoteUpdateRef.current[activeFile.path] || 0;
      if (Date.now() - lastRemote < 400) return;

      if (broadcastTimerRef.current) {
          clearTimeout(broadcastTimerRef.current);
      }
      broadcastTimerRef.current = window.setTimeout(() => {
          collabChannelRef.current?.send({
              type: 'broadcast',
              event: 'file_update',
              payload: {
                  projectId: activeProject.id,
                  path: activeFile.path,
                  content: codeRef.current,
                  userId: currentUser.uid,
                  updatedAt: new Date().toISOString()
              }
          });
      }, 700);

      return () => {
          if (broadcastTimerRef.current) {
              clearTimeout(broadcastTimerRef.current);
          }
      };
  }, [code, activeFile?.path, activeProject?.id, isProjectMode, currentUser.uid]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
      editor.updateOptions({
          minimap: { enabled: false },
          fontSize: 14,
          padding: { top: 16 },
          scrollBeyondLastLine: true,
          automaticLayout: true,
          tabCompletion: "on",
          wordBasedSuggestions: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          formatOnType: true,
          formatOnPaste: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
          }
      });

      if (!emmetInitializedRef.current) {
          emmetHTML(monaco, ['html']);
          emmetInitializedRef.current = true;
      }

      completionProvidersRef.current.forEach(provider => provider.dispose());
      completionProvidersRef.current = [];

      const staticProvider = {
          provideCompletionItems: (model: any, position: any) => {
              const word = model.getWordUntilPosition(position);
              const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
              
              if (editorLanguage === 'python') {
                const suggestions = [
                    ...PYTHON_KEYWORDS.map(k => ({ label: k, kind: monaco.languages.CompletionItemKind.Keyword, insertText: k, range, detail: 'Keyword' })),
                    ...PYTHON_BUILTINS.map(b => ({ label: b, kind: monaco.languages.CompletionItemKind.Function, insertText: b, range, detail: 'Built-in' })),
                    { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:name}(${2:args}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
                    { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
                ];
                return { suggestions };
              }
              return { suggestions: [] };
          }
      };
      completionProvidersRef.current.push(monaco.languages.registerCompletionItemProvider(editorLanguage, staticProvider));
  };

  const loadProjects = async () => {
      setIsLoadingProjects(true);
      try {
          const data = await api.getPlaygroundProjects();
          setProjects(data);
          if (currentUser.role === 'PATRON') {
              setMemberProjectIds([]);
          } else {
              const memberships = await api.getPlaygroundProjectMemberships(currentUser.uid);
              setMemberProjectIds(memberships);
          }
      } catch (error: any) {
          console.error("Failed to load projects", error);
          showToast("Failed to load projects.", "error");
      } finally {
          setIsLoadingProjects(false);
      }
  };

  const loadProjectFiles = async (projectId: string, projectLanguage?: ProjectLanguage) => {
      setIsLoadingFiles(true);
      try {
          const files = await api.getPlaygroundProjectFiles(projectId);
          setProjectFiles(files);
          if (files.length > 0) {
              const languageToUse = projectLanguage || activeProject?.language;
              const preferred = languageToUse === 'web'
                  ? files.find(file => file.path.toLowerCase().endsWith('index.html'))
                  : null;
              await openFile(preferred || files[0]);
          } else {
              setActiveFile(null);
              setCode('');
          }
      } catch (error: any) {
          console.error("Failed to load project files", error);
          showToast("Failed to load project files.", "error");
      } finally {
          setIsLoadingFiles(false);
      }
  };

  const loadProjectActivity = async (projectId: string) => {
      setIsLoadingActivity(true);
      try {
          const activity = await api.getPlaygroundActivity(projectId);
          setProjectActivity(activity);
      } catch (error: any) {
          console.error("Failed to load project activity", error);
          setProjectActivity([]);
      } finally {
          setIsLoadingActivity(false);
      }
  };

  const loadProjectMembers = async (projectId: string) => {
      setIsLoadingMembers(true);
      try {
          const members = await api.getPlaygroundProjectMembers(projectId);
          setProjectMembers(members);
      } catch (error: any) {
          console.error("Failed to load project members", error);
          setProjectMembers([]);
      } finally {
          setIsLoadingMembers(false);
      }
  };

  const openProject = async (project: PlaygroundProject) => {
      setActiveProject(project);
      setLanguage(project.language === 'web' ? 'html' : (project.language as SingleLanguage));
      setFileContents({});
      setInviteUserId('');
      setInviteTeamId('');
      setActiveTabState('editor');
      setIsProjectPanelOpen(false);
      await loadProjectFiles(project.id, project.language as ProjectLanguage);
      await loadProjectActivity(project.id);
      await loadProjectMembers(project.id);
      api.logPlaygroundActivity({
          projectId: project.id,
          userId: currentUser.uid,
          action: 'opened_project',
          detail: project.name
      }).catch(() => undefined);
  };

  const openFile = async (file: PlaygroundProjectFile) => {
      if (activeFile) {
          setFileContents(prev => ({ ...prev, [activeFile.path]: codeRef.current }));
      }
      const cached = fileContents[file.path];
      if (cached !== undefined) {
          setActiveFile(file);
          setCode(cached);
          if (!activeProject && language === 'html') {
              setHtmlPreview(cached);
          } else if (activeProject?.language === 'web' && getFileExtension(file.path) === 'html') {
              setHtmlPreview(cached);
          }
          return;
      }
      try {
          const content = await api.downloadPlaygroundFile(file.projectId, file.path);
          setFileContents(prev => ({ ...prev, [file.path]: content }));
          setActiveFile(file);
          setCode(content);
          if (!activeProject && language === 'html') {
              setHtmlPreview(content);
          } else if (activeProject?.language === 'web' && getFileExtension(file.path) === 'html') {
              setHtmlPreview(content);
          }
          api.logPlaygroundActivity({
              projectId: file.projectId,
              userId: currentUser.uid,
              action: 'opened_file',
              detail: file.path
          }).catch(() => undefined);
      } catch (error: any) {
          console.error("Failed to load file", error);
          showToast("Failed to load file.", "error");
      }
  };

  const handleCreateProject = async () => {
      if (!newProject.name.trim()) return;
      try {
          const created = await api.createPlaygroundProject({
              name: newProject.name.trim(),
              language: newProject.language,
              createdBy: currentUser.uid,
              teamId: newProject.teamId || null
          });
          await api.logPlaygroundActivity({
              projectId: created.id,
              userId: currentUser.uid,
              action: 'created_project',
              detail: created.name
          });

          if (created.language === 'web') {
              const starterFiles = [
                  { path: 'index.html', content: DEFAULT_WEB_HTML },
                  { path: 'styles.css', content: DEFAULT_WEB_CSS },
                  { path: 'app.js', content: DEFAULT_WEB_JS }
              ];
              for (const file of starterFiles) {
                  await api.savePlaygroundFile({
                      projectId: created.id,
                      path: file.path,
                      content: file.content,
                      userId: currentUser.uid
                  });
                  await api.logPlaygroundActivity({
                      projectId: created.id,
                      userId: currentUser.uid,
                      action: 'added_file',
                      detail: file.path
                  });
              }
          } else {
              const starterName = created.language === 'python' ? 'main.py' : 'index.js';
              const starterCode = created.language === 'python' ? DEFAULT_PYTHON : DEFAULT_JS;
              await api.savePlaygroundFile({
                  projectId: created.id,
                  path: starterName,
                  content: starterCode,
                  userId: currentUser.uid
              });
              await api.logPlaygroundActivity({
                  projectId: created.id,
                  userId: currentUser.uid,
                  action: 'added_file',
                  detail: starterName
              });
          }

          setNewProject({ name: '', language: 'python', teamId: '' });
          await loadProjects();
          await openProject(created);
      } catch (error: any) {
          console.error("Failed to create project", error);
          showToast("Failed to create project.", "error");
      }
  };

  const handleAddFile = async () => {
      if (!activeProject || !newFileName.trim()) return;
      const fileName = newFileName.trim();
      try {
          await api.savePlaygroundFile({
              projectId: activeProject.id,
              path: fileName,
              content: '',
              userId: currentUser.uid
          });
          await api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'added_file',
              detail: fileName
          });
          setNewFileName('');
          await loadProjectFiles(activeProject.id, activeProject.language as ProjectLanguage);
          await loadProjectActivity(activeProject.id);
      } catch (error: any) {
          console.error("Failed to add file", error);
          showToast("Failed to add file.", "error");
      }
  };

  const handleSaveFile = async () => {
      if (!activeProject || !activeFile) return;
      try {
          await api.savePlaygroundFile({
              projectId: activeProject.id,
              path: activeFile.path,
              content: codeRef.current,
              userId: currentUser.uid
          });
          await api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'saved_file',
              detail: activeFile.path
          });
          await loadProjectFiles(activeProject.id, activeProject.language as ProjectLanguage);
          await loadProjectActivity(activeProject.id);
          showToast("File saved.", "success");
      } catch (error: any) {
          console.error("Failed to save file", error);
          showToast("Failed to save file.", "error");
      }
  };

  const handleDeleteFile = async (file: PlaygroundProjectFile) => {
      if (!activeProject) return;
      try {
          await api.deletePlaygroundFile(activeProject.id, file.path);
          await api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'deleted_file',
              detail: file.path
          });
          if (activeFile?.path === file.path) {
              setActiveFile(null);
              setCode('');
          }
          await loadProjectFiles(activeProject.id, activeProject.language as ProjectLanguage);
          await loadProjectActivity(activeProject.id);
      } catch (error: any) {
          console.error("Failed to delete file", error);
          showToast("Failed to delete file.", "error");
      }
  };

  const handleDeleteProject = async () => {
      if (!projectToDelete) return;
      try {
          await api.deletePlaygroundProject(projectToDelete.id);
          await api.logPlaygroundActivity({
              projectId: projectToDelete.id,
              userId: currentUser.uid,
              action: 'deleted_project',
              detail: projectToDelete.name
          }).catch(() => undefined);
          if (activeProject?.id === projectToDelete.id) {
              setActiveProject(null);
          }
          await loadProjects();
          setProjectToDelete(null);
          showToast("Project deleted.", "success");
      } catch (error: any) {
          console.error("Failed to delete project", error);
          showToast("Failed to delete project.", "error");
      }
  };

  const startRenameFile = (file: PlaygroundProjectFile) => {
      setRenamingFile(file);
      setRenameValue(file.path);
  };

  const handleRenameFile = async () => {
      if (!activeProject || !renamingFile) return;
      const newPath = renameValue.trim();
      if (!newPath || newPath === renamingFile.path) {
          setRenamingFile(null);
          return;
      }
      try {
          await api.movePlaygroundFile(activeProject.id, renamingFile.path, newPath);
          await api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'renamed_file',
              detail: `${renamingFile.path} -> ${newPath}`
          });
          setFileContents(prev => {
              const next = { ...prev };
              if (next[renamingFile.path] !== undefined) {
                  next[newPath] = next[renamingFile.path];
                  delete next[renamingFile.path];
              }
              return next;
          });
          if (activeFile?.path === renamingFile.path) {
              setActiveFile({ ...renamingFile, path: newPath });
          }
          setRenamingFile(null);
          setRenameValue('');
          await loadProjectFiles(activeProject.id, activeProject.language as ProjectLanguage);
          await loadProjectActivity(activeProject.id);
          showToast("File renamed.", "success");
      } catch (error: any) {
          console.error("Failed to rename file", error);
          showToast("Failed to rename file.", "error");
      }
  };

  const handleInviteUser = async () => {
      if (!activeProject || !inviteUserId) return;
      try {
          await api.addPlaygroundProjectMember(activeProject.id, inviteUserId, currentUser.uid);
          await api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'invited_member',
              detail: inviteUserId
          });
          setInviteUserId('');
          await loadProjectMembers(activeProject.id);
          await loadProjects();
          showToast("Member invited.", "success");
      } catch (error: any) {
          console.error("Failed to invite member", error);
          showToast(error?.message || "Failed to invite member.", "error");
      }
  };

  const handleInviteTeam = async () => {
      if (!activeProject || !inviteTeamId) return;
      const team = teams.find(t => t.id === inviteTeamId);
      if (!team || team.memberIds.length === 0) {
          showToast("Team has no members.", "info");
          return;
      }
      try {
          await api.addPlaygroundProjectMembers(activeProject.id, team.memberIds, currentUser.uid);
          await api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'invited_team',
              detail: team.name
          });
          setInviteTeamId('');
          await loadProjectMembers(activeProject.id);
          await loadProjects();
          showToast("Team invited.", "success");
      } catch (error: any) {
          console.error("Failed to invite team", error);
          showToast(error?.message || "Failed to invite team.", "error");
      }
  };

  const accessibleProjects = useMemo(() => {
      if (currentUser.role === 'PATRON') return projects;
      const teamIds = new Set(teams.filter(team => team.memberIds.includes(currentUser.uid)).map(team => team.id));
      const memberProjects = new Set(memberProjectIds);
      return projects.filter(project =>
          project.createdBy === currentUser.uid ||
          (project.teamId && teamIds.has(project.teamId)) ||
          memberProjects.has(project.id)
      );
  }, [projects, teams, currentUser, memberProjectIds]);

  const selectableTeams = useMemo(() => {
      if (currentUser.role === 'PATRON') return teams;
      return teams.filter(team => team.memberIds.includes(currentUser.uid));
  }, [teams, currentUser]);

  const collaborators = useMemo(() => {
      if (!activeProject) return [];
      const ids = new Set<string>();
      ids.add(activeProject.createdBy);
      projectMembers.forEach(member => ids.add(member.userId));
      if (activeProject.teamId) {
          const team = teams.find(t => t.id === activeProject.teamId);
          team?.memberIds.forEach(id => ids.add(id));
      }
      return Array.from(ids).map(uid => {
          const profile = allUsers.find(user => user.uid === uid);
          return {
              uid,
              name: profile?.name || 'Member',
              username: profile?.username,
              avatarUrl: profile?.avatarUrl,
              isOwner: uid === activeProject.createdBy,
              isTeamMember: !!activeProject.teamId && !!teams.find(t => t.id === activeProject.teamId)?.memberIds.includes(uid),
              isInvited: projectMembers.some(member => member.userId === uid)
          };
      });
  }, [activeProject, projectMembers, teams, allUsers]);

  const availableInviteUsers = useMemo(() => {
      if (!activeProject) return [];
      const collaboratorIds = new Set(collaborators.map(member => member.uid));
      return allUsers.filter(user => !collaboratorIds.has(user.uid));
  }, [activeProject, collaborators, allUsers]);

  const filteredActivity = useMemo(() => {
      if (!activeProject) return projectActivity;
      if (activityFilter === 'me') {
          return projectActivity.filter(activity => activity.userId === currentUser.uid);
      }
      if (activityFilter === 'team') {
          const team = teams.find(t => t.id === activeProject.teamId);
          if (!team) return projectActivity;
          const memberSet = new Set(team.memberIds);
          return projectActivity.filter(activity => memberSet.has(activity.userId));
      }
      return projectActivity;
  }, [projectActivity, activityFilter, activeProject, teams, currentUser.uid]);


  const handleImportCode = (importedCode: string) => {
      if (activeProject) {
           setActiveProject(null);
           setActiveFile(null);
           setProjectFiles([]);
           setProjectMembers([]);
           showToast("Exited project mode to open imported code.", "info");
      }
      const currentCode = codeRef.current;
      const def = language === 'python' ? DEFAULT_PYTHON : language === 'javascript' ? DEFAULT_JS : DEFAULT_HTML;
      
      if (!currentCode || currentCode.trim() === '' || currentCode.trim() === def.trim()) {
           setCode(importedCode);
           setActiveTabState('editor');
           setOutput([{ type: 'log', content: 'Loaded code from external source.' }]);
      } else {
           setPendingCode(importedCode);
           setIsConfirmOpen(true);
      }
  };

  useEffect(() => {
    const pendingImport = localStorage.getItem('playground_pending_code');
    if (pendingImport) {
        localStorage.removeItem('playground_pending_code');
        handleImportCode(pendingImport);
    }

    const setupPyodide = async () => {
      try {
        // @ts-ignore
        const pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/"
        });
        (window as any).pyodide = pyodideInstance;
        pyodideRef.current = pyodideInstance;
        setIsPyodideReady(true);
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
        setOutput([{ type: 'error', content: "Error: Could not load the Python execution engine. Please refresh." }]);
      }
    };
    setupPyodide();

    const handleOpenCode = (e: CustomEvent<string>) => {
        if (e.detail) {
            handleImportCode(e.detail);
        }
    };
    
    // Close menu on outside click
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };

    window.addEventListener('open-in-playground' as any, handleOpenCode);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        window.removeEventListener('open-in-playground' as any, handleOpenCode);
        document.removeEventListener('mousedown', handleClickOutside);
    };

  }, []);

  const scrollToBottom = () => {
      if (outputContainerRef.current) {
          setTimeout(() => {
              outputContainerRef.current!.scrollTop = outputContainerRef.current!.scrollHeight;
          }, 10);
      }
  };

  const handleConsoleInputEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const val = consoleInput;
          
          const fullLine = `${inputPrompt}${val}\n`;
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setCode(content);
        setOutput([{ type: 'log', content: `Loaded file: ${file.name}` }]);
        setActiveTabState('editor');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDownloadCode = () => {
    const ext = language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'html';
    const mime = language === 'python'
        ? 'text/x-python'
        : language === 'javascript'
            ? 'text/javascript'
            : 'text/html';
    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
    setIsMenuOpen(false);
  };

  const confirmReplace = () => {
    if (pendingCode) {
        setCode(pendingCode);
        setActiveTabState('editor');
        setOutput([{ type: 'log', content: 'Loaded code from external source.' }]);
    }
    setPendingCode(null);
    setIsConfirmOpen(false);
  };

  const fetchCloudScripts = async () => {
      setIsLoadingScripts(true);
      setCloudMessage(null);
      try {
          const scripts = await api.listUserScripts(currentUser.uid);
          setCloudScripts(scripts);
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      } finally {
          setIsLoadingScripts(false);
      }
  };

  const handleOpenCloudModal = () => {
      setIsCloudModalOpen(true);
      fetchCloudScripts();
      setIsMenuOpen(false);
  };

  const handleCloudSave = async () => {
      if (!saveFileName.trim()) {
          setCloudMessage({ text: "Please enter a file name.", type: 'error' });
          return;
      }
      setIsSaving(true);
      setCloudMessage(null);
      try {
          await api.saveUserScript(currentUser.uid, saveFileName, code);
          setCloudMessage({ text: "File saved successfully!", type: 'success' });
          await fetchCloudScripts();
          setSaveFileName('');
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      } finally {
          setIsSaving(false);
      }
  };

  const handleCloudLoad = async (fileName: string) => {
      setCloudMessage(null);
      try {
          const content = await api.downloadUserScript(currentUser.uid, fileName);
          handleImportCode(content);
          setIsCloudModalOpen(false);
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      }
  };

  const confirmCloudDelete = async () => {
      if (!scriptToDelete) return;
      setCloudMessage(null);
      try {
          await api.deleteUserScript(currentUser.uid, scriptToDelete);
          await fetchCloudScripts();
      } catch (err: any) {
          setCloudMessage({ text: err.message, type: 'error' });
      } finally {
          setScriptToDelete(null);
      }
  };

  const handlePublish = async (title: string, desc: string) => {
      try {
          await api.addShowcaseItem(currentUser.uid, title, desc, code);
          setIsPublishModalOpen(false);
          
          await fetchShowcaseItems();

          if (setActiveTab) {
              setActiveTab('showcase');
          }
          showToast("Code published successfully!", "success");
      } catch (error: any) {
          console.error("Publish failed:", error);
          showToast("Failed to publish code: " + error.message, "error");
      }
  };
  
  const handleGetHint = async () => {
      setIsGettingHint(true);
      setActiveTabState('output');
      setOutput(prev => [...prev, { type: 'log', content: '🤖 AI Tutor is thinking...' }]);
      scrollToBottom();
      try {
          const hint = await geminiService.getAIPlaygroundHint(code, language);
          setOutput(prev => [...prev.filter(l => l.content !== '🤖 AI Tutor is thinking...'), { type: 'hint', content: hint }]);
      } catch (err: any) {
          setOutput(prev => [...prev.filter(l => l.content !== '🤖 AI Tutor is thinking...'), { type: 'error', content: err.message || 'Failed to get hint.' }]);
      } finally {
          setIsGettingHint(false);
          scrollToBottom();
      }
  };


  const runJS = () => {
      setIsExecuting(true);
      setActiveTabState('output');
      setOutput([]);

      if (activeProject) {
          api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'ran_project',
              detail: activeFile?.path || 'script'
          }).catch(() => undefined);
          if (code.includes('import ')) {
              setOutput(prev => [...prev, { type: 'hint', content: 'JS multi-file imports are not supported in the runner yet. Use a single file or switch to Python for module imports.' }]);
          }
      }
      
      const originalLog = console.log;
      const originalError = console.error;

      // Capture logs
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
          // Standard JS execution
          eval(code);
      } catch (err: any) {
          setOutput(prev => [...prev, { type: 'error', content: err.message }]);
      } finally {
          // Restore
          console.log = originalLog;
          console.error = originalError;
          setIsExecuting(false);
          scrollToBottom();
      }
  };

  const runPython = async () => {
    setIsExecuting(true);
    setActiveTabState('output');
    setOutput([]);
    setIsWaitingForInput(false);

    if (!pyodideRef.current) {
        setOutput([{ type: 'error', content: 'Error: Local interpreter (Pyodide) is not ready.' }]);
        setIsExecuting(false);
        return;
    }

    (window as any).playgroundAskForInput = (prompt: string) => {
        return new Promise((resolve) => {
            setInputPrompt(prompt);
            setIsWaitingForInput(true);
            inputResolverRef.current = resolve;
            
            setActiveTabState('output');
            setTimeout(() => {
                if (consoleInputRef.current) {
                    consoleInputRef.current.focus();
                }
                scrollToBottom();
            }, 50);
        });
    };

    (window as any).playgroundPrint = (text: string, type: 'log' | 'error') => {
        if (typeof text !== 'string') return;
        if (type === 'error') {
            setOutput(prev => [...prev, { type: 'error', content: text }]);
            scrollToBottom();
            return;
        }
        const parts = text.split('\n');
        setOutput(prev => {
            let newOutput = [...prev];
            let lastLine = newOutput.length > 0 ? newOutput[newOutput.length - 1] : null;
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

    if (activeProject) {
        await preparePythonProjectFiles();
        api.logPlaygroundActivity({
            projectId: activeProject.id,
            userId: currentUser.uid,
            action: 'ran_project',
            detail: activeFile?.path || 'script'
        }).catch(() => undefined);
    }

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
        js.playgroundPrint(text, self.stream_type)
    def flush(self):
        pass

sys.stdout = Writer('log')
sys.stderr = Writer('error')

async def custom_input_async(prompt_text=""):
    val_proxy = await js.playgroundAskForInput(prompt_text)
    return str(val_proxy)

builtins.input = custom_input_async

async def custom_sleep_async(seconds):
    await js.Promise.new(lambda resolve, reject: js.setTimeout(resolve, seconds * 1000))

time.sleep = custom_sleep_async
asyncio.sleep = custom_sleep_async
    `;

    try {
        try {
            await pyodideRef.current.loadPackagesFromImports(code);
        } catch (error) {
            console.warn("Package auto-load skipped:", error);
        }
        await pyodideRef.current.runPythonAsync(setupCode);
        
        const asyncCode = wrapAsyncCalls(code, ['input', 'time.sleep', 'asyncio.sleep']);
        
        const result = await pyodideRef.current.runPythonAsync(asyncCode);

        if (result !== undefined) {
            pyodideRef.current.globals.set('last_result', result);
            await pyodideRef.current.runPythonAsync(`print(repr(last_result))`);
            pyodideRef.current.globals.delete('last_result');
            if (typeof result.destroy === 'function') {
                result.destroy();
            }
        }
        
    } catch (error: any) {
        (window as any).playgroundPrint(error.message, 'error');
    } finally {
        setIsExecuting(false);
        setIsWaitingForInput(false);
        scrollToBottom();
    }
  };

  const handleRunCode = () => {
      if (activeProject) {
          if (activeProject.language === 'python') {
              runPython();
          } else {
              runWebPreview();
          }
          return;
      }

      if (language === 'python') runPython();
      else if (language === 'javascript') runJS();
      else {
          const session = Date.now();
          setPreviewSessionId(session);
          setPreviewConsole([]);
          setHtmlPreview(buildWebPreviewHtml({ 'index.html': code }, session));
          setActiveTabState('preview');
      }
  };
  
  const handleClearOutput = () => {
      setOutput([]);
      setIsWaitingForInput(false);
  };

  const ensureProjectFilesLoaded = async () => {
      if (!activeProject) return {};
      const contents: Record<string, string> = { ...fileContents };
      for (const file of projectFiles) {
          if (contents[file.path] === undefined) {
              try {
                  const content = await api.downloadPlaygroundFile(activeProject.id, file.path);
                  contents[file.path] = content;
              } catch (error) {
                  console.error("Failed to load project file content", error);
              }
          }
      }
      setFileContents(contents);
      return contents;
  };

  const preparePythonProjectFiles = async () => {
      if (!activeProject || !pyodideRef.current) return;
      const contents = await ensureProjectFilesLoaded();
      const projectDir = `/home/pyodide/projects/${activeProject.id}`;
      try {
          pyodideRef.current.FS.mkdirTree(projectDir);
      } catch {
          // ignore
      }
      Object.entries(contents).forEach(([path, content]) => {
          const fullPath = `${projectDir}/${path}`;
          const folder = fullPath.split('/').slice(0, -1).join('/');
          if (folder) {
              try {
                  pyodideRef.current.FS.mkdirTree(folder);
              } catch {
                  // ignore
              }
          }
          pyodideRef.current.FS.writeFile(fullPath, content);
      });
      await pyodideRef.current.runPythonAsync(`
import sys
if "${projectDir}" not in sys.path:
    sys.path.insert(0, "${projectDir}")
      `);
  };

  const getFileExtension = (path: string) => {
      const parts = path.split('.');
      if (parts.length < 2) return '';
      return parts[parts.length - 1].toLowerCase();
  };

  const buildWebPreviewHtml = (contents: Record<string, string>, sessionId: number) => {
      const filePaths = Object.keys(contents);
      const htmlPath = filePaths.find(path => path.toLowerCase().endsWith('index.html'))
          || filePaths.find(path => getFileExtension(path) === 'html');
      let html = htmlPath ? contents[htmlPath] : DEFAULT_WEB_HTML;

      const css = filePaths
          .filter(path => getFileExtension(path) === 'css')
          .map(path => contents[path])
          .join('\n\n');
      const js = filePaths
          .filter(path => ['js', 'mjs'].includes(getFileExtension(path)))
          .map(path => contents[path])
          .join('\n\n');

      if (css.trim()) {
          const styleTag = `\n<style id="clubhub-inline-styles">\n${css}\n</style>\n`;
          if (html.includes('</head>')) {
              html = html.replace('</head>', `${styleTag}</head>`);
          } else {
              html = styleTag + html;
          }
      }

      if (js.trim()) {
          const scriptTag = `\n<script id="clubhub-inline-scripts">\n${js}\n</script>\n`;
          if (html.includes('</body>')) {
              html = html.replace('</body>', `${scriptTag}</body>`);
          } else {
              html += scriptTag;
          }
      }

      const instrumentation = `
<script id="clubhub-console-hook">
(function() {
  const sessionId = ${sessionId};
  const send = (level, message) => {
    try {
      window.parent.postMessage({ type: 'clubhub-preview', level, message, sessionId }, '*');
    } catch (e) {}
  };
  const wrap = (level) => (...args) => {
    send(level, args.map(arg => {
      try { return typeof arg === 'string' ? arg : JSON.stringify(arg); } catch (e) { return String(arg); }
    }).join(' '));
  };
  console.log = wrap('log');
  console.error = wrap('error');
  window.addEventListener('error', (event) => {
    send('error', event.message || 'Runtime error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    send('error', event.reason ? (event.reason.message || String(event.reason)) : 'Unhandled promise rejection');
  });
})();
</script>
      `.trim();

      if (html.includes('</body>')) {
          html = html.replace('</body>', `\n${instrumentation}\n</body>`);
      } else {
          html += `\n${instrumentation}`;
      }

      return html;
  };

  const runWebPreview = async () => {
      if (!activeProject) return;
      try {
          const contents = await ensureProjectFilesLoaded();
          if (activeFile) {
              contents[activeFile.path] = codeRef.current;
          }
          const session = Date.now();
          setPreviewSessionId(session);
          setPreviewConsole([]);
          const previewHtml = buildWebPreviewHtml(contents, session);
          setHtmlPreview(previewHtml);
          setActiveTabState('preview');
          await api.logPlaygroundActivity({
              projectId: activeProject.id,
              userId: currentUser.uid,
              action: 'ran_web_preview',
              detail: activeFile?.path || 'preview'
          });
      } catch (error) {
          console.error("Failed to build web preview", error);
          showToast("Failed to build web preview.", "error");
      }
  };

  const handleCopyOutput = () => {
      const text = output.map(line => line.content).join('\n');
      navigator.clipboard.writeText(text).then(() => {
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 2000);
      });
  };

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';
  const editorLanguage = useMemo(() => {
      if (activeProject && activeFile) {
          const ext = getFileExtension(activeFile.path);
          if (ext === 'py') return 'python';
          if (ext === 'js' || ext === 'mjs') return 'javascript';
          if (ext === 'html' || ext === 'htm') return 'html';
          if (ext === 'css') return 'css';
          return 'plaintext';
      }
      return language;
  }, [activeProject, activeFile?.path, language]);

  const projectPanel = (
      <div className="flex flex-col h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  <ViewGridIcon />
                  Projects
              </div>
              <button
                  onClick={loadProjects}
                  className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Refresh"
              >
                  <RefreshIcon />
              </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">New Project</p>
                  <input
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Project name"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                  <select
                      value={newProject.language}
                      onChange={(e) => setNewProject(prev => ({ ...prev, language: e.target.value as ProjectLanguage }))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                      <option value="python">Python</option>
                      <option value="web">Web</option>
                  </select>
                  <select
                      value={newProject.teamId}
                      onChange={(e) => setNewProject(prev => ({ ...prev, teamId: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                      <option value="">Personal project</option>
                      {selectableTeams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                  </select>
                  <button
                      onClick={handleCreateProject}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700"
                  >
                      Create Project
                  </button>
              </div>

              <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Your Projects</p>
                  {isLoadingProjects ? (
                      <p className="text-xs text-gray-400">Loading...</p>
                  ) : accessibleProjects.length === 0 ? (
                      <p className="text-xs text-gray-400">No projects yet.</p>
                  ) : (
                      <div className="space-y-2">
                          {accessibleProjects.map(project => (
                              <div key={project.id} className="flex items-center gap-2">
                                  <button
                                      onClick={() => openProject(project)}
                                      className={`flex-1 text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                          activeProject?.id === project.id
                                              ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-200'
                                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                      }`}
                                  >
                                      <div className="font-semibold">{project.name}</div>
                                      <div className="text-[10px] text-gray-500 dark:text-gray-400 capitalize flex items-center gap-1">
                                          <DocumentTextIcon className="w-3 h-3" /> {project.language}
                                          {project.teamId && <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" /> Team</span>}
                                      </div>
                                  </button>
                                  {(currentUser.role === 'PATRON' || project.createdBy === currentUser.uid) && (
                                      <button
                                          onClick={() => setProjectToDelete(project)}
                                          className="p-1.5 text-gray-400 hover:text-red-500"
                                          title="Delete project"
                                      >
                                          <TrashIcon className="w-4 h-4" />
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {activeProject && (
                  <div className="space-y-3">
                      <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Files</p>
                          <button
                              onClick={() => { setActiveProject(null); setIsProjectPanelOpen(false); }}
                              className="text-[10px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          >
                              Exit
                          </button>
                      </div>

                      <div className="space-y-2">
                          {isLoadingFiles ? (
                              <p className="text-xs text-gray-400">Loading files...</p>
                          ) : projectFiles.length === 0 ? (
                              <p className="text-xs text-gray-400">No files yet.</p>
                          ) : (
                              projectFiles.map(file => (
                                  <div key={file.id} className="flex items-center gap-2">
                                      <button
                                          onClick={() => openFile(file)}
                                          className={`flex-1 text-left px-2 py-1.5 text-xs rounded-md border ${
                                              activeFile?.id === file.id
                                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200'
                                                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                          }`}
                                      >
                                          {file.path}
                                          </button>
                                      <button
                                          onClick={() => startRenameFile(file)}
                                          className="p-1 text-gray-400 hover:text-indigo-500"
                                          title="Rename file"
                                      >
                                          <PencilIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                          onClick={() => handleDeleteFile(file)}
                                          className="p-1 text-gray-400 hover:text-red-500"
                                          title="Delete file"
                                      >
                                          <TrashIcon className="w-4 h-4" />
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>

                      <div className="flex items-center gap-2">
                          <input
                              value={newFileName}
                              onChange={(e) => setNewFileName(e.target.value)}
                              placeholder={activeProject?.language === 'javascript' ? "new_file.js" : activeProject?.language === 'html' ? "index.html" : "new_file.py"}
                              className="flex-1 px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                          />
                          <button
                              onClick={handleAddFile}
                              className="px-2 py-1.5 text-xs font-semibold rounded-md bg-gray-900 text-white hover:bg-gray-800"
                          >
                              Add
                          </button>
                      </div>

                      {renamingFile && (
                          <div className="mt-2 space-y-2">
                              <input
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              />
                              <div className="flex gap-2">
                                  <button
                                      onClick={handleRenameFile}
                                      className="px-2 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                  >
                                      Rename
                                  </button>
                                  <button
                                      onClick={() => { setRenamingFile(null); setRenameValue(''); }}
                                      className="px-2 py-1.5 text-xs font-semibold rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                  >
                                      Cancel
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {activeProject && (
                  <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Collaborators</p>
                      {isLoadingMembers && collaborators.length === 0 ? (
                          <p className="text-xs text-gray-400">Loading members...</p>
                      ) : collaborators.length === 0 ? (
                          <p className="text-xs text-gray-400">No collaborators yet.</p>
                      ) : (
                          <ul className="space-y-2">
                              {collaborators.map(member => (
                                  <li key={member.uid} className="flex items-center gap-2 text-xs">
                                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-700 dark:text-gray-200">
                                          {member.name.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-gray-700 dark:text-gray-200 truncate">{member.name}</div>
                                          {member.username && (
                                              <div className="text-[10px] text-gray-400 truncate">@{member.username}</div>
                                          )}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                          {member.isOwner && <span className="px-2 py-0.5 text-[9px] rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200">Owner</span>}
                                          {member.isTeamMember && <span className="px-2 py-0.5 text-[9px] rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">Team</span>}
                                          {member.isInvited && !member.isTeamMember && !member.isOwner && (
                                              <span className="px-2 py-0.5 text-[9px] rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">Invited</span>
                                          )}
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      )}

                      <div className="space-y-2">
                          <div className="flex gap-2">
                              <select
                                  value={inviteUserId}
                                  onChange={(e) => setInviteUserId(e.target.value)}
                                  className="flex-1 px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              >
                                  <option value="">Invite member</option>
                                  {availableInviteUsers.map(user => (
                                      <option key={user.uid} value={user.uid}>{user.name}</option>
                                  ))}
                              </select>
                              <button
                                  onClick={handleInviteUser}
                                  disabled={!inviteUserId}
                                  className="px-2 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                  Invite
                              </button>
                          </div>

                          <div className="flex gap-2">
                              <select
                                  value={inviteTeamId}
                                  onChange={(e) => setInviteTeamId(e.target.value)}
                                  className="flex-1 px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              >
                                  <option value="">Invite team</option>
                                  {selectableTeams.map(team => (
                                      <option key={team.id} value={team.id}>{team.name}</option>
                                  ))}
                              </select>
                              <button
                                  onClick={handleInviteTeam}
                                  disabled={!inviteTeamId}
                                  className="px-2 py-1.5 text-xs font-semibold rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                              >
                                  Add
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {activeProject && (
                  <div className="space-y-2">
                      <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Activity Log</p>
                          <div className="flex gap-1 text-[10px]">
                              {(['all', 'me', 'team'] as const).map(filter => (
                                  <button
                                      key={filter}
                                      onClick={() => setActivityFilter(filter)}
                                      className={`px-2 py-1 rounded-full ${
                                          activityFilter === filter
                                              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                      }`}
                                  >
                                      {filter === 'all' ? 'All' : filter === 'me' ? 'Me' : 'Team'}
                                  </button>
                              ))}
                          </div>
                      </div>
                      {isLoadingActivity ? (
                          <p className="text-xs text-gray-400">Loading activity...</p>
                      ) : filteredActivity.length === 0 ? (
                          <p className="text-xs text-gray-400">No activity yet.</p>
                      ) : (
                          <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                              {filteredActivity.slice(0, 8).map(activity => (
                                  <li key={activity.id} className="flex flex-col">
                                      <span className="font-semibold text-gray-700 dark:text-gray-200">{activity.action.replace('_', ' ')}</span>
                                      {activity.detail && <span className="text-[11px]">{activity.detail}</span>}
                                      <span className="text-[10px] text-gray-400">{new Date(activity.createdAt).toLocaleString()}</span>
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
              )}
          </div>
      </div>
  );
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept={language === 'python' ? ".py,.txt" : language === 'javascript' ? ".js,.txt" : ".html,.htm,.txt"}
        className="hidden"
      />

      {/* Compact Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
             <button
                onClick={() => setIsProjectPanelOpen(true)}
                className="lg:hidden p-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                title="Projects"
             >
                <ViewGridIcon />
             </button>
             <div className="flex bg-gray-200 dark:bg-gray-700 p-0.5 rounded-lg">
                <button onClick={() => handleLanguageChange('python')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'python' ? 'bg-white dark:bg-gray-600 shadow text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'} ${isProjectMode ? 'opacity-60 cursor-not-allowed' : ''}`}>PY</button>
                <button onClick={() => handleLanguageChange('javascript')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'javascript' ? 'bg-white dark:bg-gray-600 shadow text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'} ${isProjectMode ? 'opacity-60 cursor-not-allowed' : ''}`}>JS</button>
                <button onClick={() => handleLanguageChange('html')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'html' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'} ${isProjectMode ? 'opacity-60 cursor-not-allowed' : ''}`}>HTML</button>
             </div>
             <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>
             {/* Tabs */}
             <div className="flex bg-gray-200 dark:bg-gray-700 p-0.5 rounded-lg">
                <button onClick={() => setActiveTabState('editor')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'editor' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>Code</button>
                <button onClick={() => setActiveTabState('output')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'output' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>Output</button>
                {canPreview && (
                    <button onClick={() => setActiveTabState('preview')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>Preview</button>
                )}
             </div>
             {activeProject && (
                <div className="hidden md:flex flex-col text-[11px] text-gray-500 dark:text-gray-300 ml-2">
                    <span className="font-semibold">{activeProject.name}</span>
                    <span className="truncate max-w-[140px]">{activeFile?.path || 'No file selected'}</span>
                </div>
             )}
        </div>

        <div className="flex items-center gap-2">
             {activeProject && (
                <button
                    onClick={() => setActiveProject(null)}
                    className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                    title="Exit project mode"
                >
                    Exit Project
                </button>
             )}
             {activeProject && (
                <button
                    onClick={handleSaveFile}
                    className="px-2 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                    title="Save file"
                >
                    Save
                </button>
             )}
             <button 
                onClick={handleGetHint} 
                disabled={isExecuting || (language === 'python' && !isPyodideReady) || isWaitingForInput || isGettingHint}
                className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-md transition-colors disabled:opacity-50" 
                title="AI Hint"
             >
                <LightBulbIcon className="w-5 h-5"/>
             </button>
             
             <button 
                onClick={handleRunCode} 
                disabled={isExecuting || (language === 'python' && !isPyodideReady) || isWaitingForInput}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {language === 'python' && !isPyodideReady ? (
                    <span className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></span>
                ) : (
                    <PlayIcon className="w-3.5 h-3.5"/>
                )}
                <span className="hidden sm:inline">{isExecuting ? 'Running...' : 'Run'}</span>
             </button>
             
             {/* Dropdown Trigger */}
             <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className={`p-1.5 rounded-md transition-colors ${isMenuOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400'}`}
                >
                    <DotsVerticalIcon />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 animate-fade-in-up">
                        <MenuItem onClick={triggerFileUpload} icon={<UploadIcon className="w-4 h-4"/>} label="Upload" />
                        <MenuItem onClick={handleDownloadCode} icon={<DownloadIcon className="w-4 h-4"/>} label="Download" />
                        <MenuItem onClick={handleOpenCloudModal} icon={<CloudIcon className="w-4 h-4"/>} label="Cloud Scripts" />
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                        <MenuItem onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }} icon={<ShareIcon className="w-4 h-4"/>} label="Share" />
                        <MenuItem onClick={() => { setIsPublishModalOpen(true); setIsMenuOpen(false); }} icon={<GlobeIcon className="w-4 h-4"/>} label="Publish" />
                        <MenuItem onClick={() => { setIsSubmitChallengeModalOpen(true); setIsMenuOpen(false); }} icon={<TrophyIcon className="w-4 h-4"/>} label="Submit Challenge" />
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <aside className="hidden lg:flex">
            {projectPanel}
          </aside>

          {isProjectPanelOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex">
              <div className="h-full">
                {projectPanel}
              </div>
              <button
                onClick={() => setIsProjectPanelOpen(false)}
                className="flex-1"
                aria-label="Close project panel"
              />
            </div>
          )}

          <div className="relative flex-1">
            {/* Editor */}
            <div className={`absolute inset-0 w-full h-full ${activeTab === 'editor' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                 <Editor
                    height="100%"
                    defaultLanguage={editorLanguage}
                    language={editorLanguage}
                    theme={editorTheme}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    onMount={handleEditorDidMount}
                    loading={<div className="flex items-center justify-center h-full text-gray-500">Loading editor...</div>}
                    options={{
                        padding: { top: 16, bottom: 16 },
                    }}
                />
            </div>
            
            {/* Output */}
            <div className={`absolute inset-0 w-full h-full bg-gray-900 dark:bg-black text-gray-300 font-mono text-sm overflow-hidden flex flex-col ${activeTab === 'output' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                 <div className="flex justify-between items-center p-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2">Console</span>
                    <div className="flex gap-1">
                        <button onClick={handleCopyOutput} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors" title="Copy Output">
                            <CopyIcon className="w-4 h-4" />
                        </button>
                        <button onClick={handleClearOutput} className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700 transition-colors" title="Clear Console">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                 </div>
                 <div 
                    ref={outputContainerRef}
                    className="flex-1 p-4 overflow-y-auto custom-scrollbar break-all"
                    onClick={() => {
                        if (isWaitingForInput && consoleInputRef.current) {
                            consoleInputRef.current.focus();
                        }
                    }}
                 >
                    {output.length === 0 && !isWaitingForInput ? (
                        <span className="text-gray-600 italic select-none">Run code to see output...</span>
                    ) : (
                        output.map((line, index) => (
                           <div key={index} className="leading-relaxed mb-0.5">
                                {line.type === 'log' ? (
                                    <span className="text-gray-300">{line.content}</span>
                                ) : line.type === 'hint' ? (
                                    <div className="bg-yellow-900/20 p-3 rounded border-l-2 border-yellow-600 my-2 flex gap-3 font-sans text-gray-200">
                                        <div className="text-yellow-500 mt-0.5 flex-shrink-0">
                                            <LightBulbIcon className="w-4 h-4"/>
                                        </div>
                                        <div className="flex-1 text-sm">
                                            <FormattedMessage text={line.content} isUser={false} />
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-red-400 font-medium">{line.content}</span>
                                )}
                            </div>
                        ))
                    )}
                    
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
                    
                    {isExecuting && !isWaitingForInput && <div className="animate-pulse mt-1 text-green-500">_</div>}
                 </div>
            </div>

            {/* Preview */}
            <div className={`absolute inset-0 w-full h-full bg-white dark:bg-gray-900 overflow-hidden flex flex-col ${activeTab === 'preview' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                 <div className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider pl-2">Preview</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPreviewConsole(prev => !prev)}
                            className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                        >
                            {showPreviewConsole ? 'Hide Console' : 'Show Console'}
                        </button>
                        <button
                            onClick={() => setPreviewConsole([])}
                            className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                        >
                            Clear Console
                        </button>
                        <button
                            onClick={() => {
                                if (activeProject) runWebPreview();
                                else {
                                    setPreviewConsole([]);
                                    const session = Date.now();
                                    setPreviewSessionId(session);
                                    setHtmlPreview(buildWebPreviewHtml({ 'index.html': code }, session));
                                }
                            }}
                            className="px-2 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            Refresh
                        </button>
                    </div>
                 </div>
                 <div className="flex-1 bg-white flex flex-col">
                    <iframe
                        title="HTML Preview"
                        className={`w-full border-0 bg-white ${showPreviewConsole ? 'flex-1' : 'h-full'}`}
                        sandbox="allow-scripts allow-modals allow-forms"
                        srcDoc={htmlPreview}
                    />
                    {showPreviewConsole && (
                        <div className="h-40 border-t border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-200 text-xs font-mono overflow-y-auto p-3 space-y-1 custom-scrollbar">
                            {previewConsole.length === 0 ? (
                                <span className="text-gray-500">Preview console ready…</span>
                            ) : (
                                previewConsole.map((line, idx) => (
                                    <div key={idx} className={line.type === 'error' ? 'text-red-400' : 'text-gray-200'}>
                                        {line.content}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                 </div>
            </div>
          </div>
        </div>
      </div>

      {isCloudModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-200 dark:border-gray-700">
                   <button 
                        onClick={() => setIsCloudModalOpen(false)} 
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                       <XIcon />
                    </button>
                   
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                       <CloudIcon /> Cloud Scripts
                   </h3>

                   {cloudMessage && (
                       <div className={`mb-4 p-3 rounded text-sm ${cloudMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                           {cloudMessage.text}
                       </div>
                   )}

                   <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                       <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Save Current Code</h4>
                       <div className="flex gap-2">
                           <input 
                                type="text" 
                                placeholder={`filename.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'html'}`} 
                                value={saveFileName}
                                onChange={(e) => setSaveFileName(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                           />
                           <button 
                                onClick={handleCloudSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
                           >
                               {isSaving ? 'Saving...' : 'Save'}
                           </button>
                       </div>
                   </div>

                   <div>
                       <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Scripts</h4>
                       <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                           {isLoadingScripts ? (
                               <p className="text-center text-gray-500 text-sm py-4">Loading scripts...</p>
                           ) : cloudScripts.length === 0 ? (
                               <p className="text-center text-gray-500 text-sm py-4">No scripts saved yet.</p>
                           ) : (
                               cloudScripts.map(script => (
                                   <div key={script.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                       <div className="min-w-0 flex-1 mr-2">
                                           <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{script.name}</p>
                                           <p className="text-xs text-gray-500 dark:text-gray-400">{script.lastModified}</p>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           <button 
                                                onClick={() => handleCloudLoad(script.name)}
                                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                                           >
                                               Load
                                           </button>
                                           <button 
                                                onClick={() => setScriptToDelete(script.name)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                           >
                                               <TrashIcon />
                                           </button>
                                       </div>
                                   </div>
                               ))
                           )}
                       </div>
                   </div>
              </div>
          </div>
      )}

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmReplace}
        title="Unsaved Changes"
        message="Your current code in the playground will be overwritten. Do you want to continue?"
        confirmText="Replace"
      />

      <ConfirmationModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Delete "${projectToDelete?.name}"? This will remove all project files for the team.`}
        confirmText="Delete"
        isDangerous
      />

      <ConfirmationModal
        isOpen={!!scriptToDelete}
        onClose={() => setScriptToDelete(null)}
        onConfirm={confirmCloudDelete}
        title="Delete Script"
        message={`Are you sure you want to delete "${scriptToDelete}"? This action cannot be undone.`}
        confirmText="Delete"
        isDangerous
      />

      <PublishModal 
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublish={handlePublish}
      />

      <ShareCodeModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        code={code}
        currentUser={currentUser}
      />

      <SubmitToChallengeModal 
        isOpen={isSubmitChallengeModalOpen}
        onClose={() => setIsSubmitChallengeModalOpen(false)}
        code={code}
        currentUser={currentUser}
      />
    </div>
  );
};

export default CodePlayground;
