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
import { XCircleIcon } from './icons/XCircleIcon';
import { BadgeCheckIcon } from './icons/BadgeCheckIcon';
import Tooltip from './Tooltip';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { DotsVerticalIcon } from './icons/DotsVerticalIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { ViewGridIcon } from './icons/ViewGridIcon';
import { UsersIcon } from './icons/UsersIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import Editor from '@monaco-editor/react';
import { emmetHTML, emmetCSS } from 'emmet-monaco-es';
import { User, Tab, PlaygroundProject, PlaygroundProjectFile, PlaygroundProjectActivity, PlaygroundProjectMember, ChallengeTestCase } from '../types';
import * as api from '../services/apiService';
import * as geminiService from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';
import ShareCodeModal from './ShareCodeModal';
import SubmitToChallengeModal from './SubmitToChallengeModal';
import ChallengeTestResults from './ChallengeTestResults';
import { submitChallengeSolution, runChallengeTestReport, type ChallengeTestReport } from '../services/challengeJudge';
import { hasTestCases, STARTER_CODE } from '../services/challengeRunner';
import { useData } from '../DataContext';
import { PLAYGROUND_ACTION_EVENT, PLAYGROUND_STATE_EVENT, type PlaygroundAction, type PlaygroundHeaderState } from './ShellHeader';
import InitialsTile, { TILE_COLORS } from './InitialsTile';
import { setupMonaco, splitEditorTheme } from '../lib/monacoThemes';
import { openChallengeWorkspace } from '../lib/challengeNav';
import { FormattedMessage } from './FormattedMessage';
import { supabase } from '../services/supabaseClient';
import { runSandboxedJavaScript, runSandboxedPython, type SandboxExecutionController } from '../services/sandboxRunner';

interface CodePlaygroundProps {
    theme: 'light' | 'dark';
    currentUser: User;
    setActiveTab?: (tab: Tab) => void; 
    globalActiveTab?: Tab;
    incomingChallenge?: any;
    onChallengeHandled?: () => void;
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

const PublishModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onPublish: (title: string, desc: string) => Promise<void>,
    projectName?: string | null,
    teamName?: string | null
}> = ({ isOpen, onClose, onPublish, projectName, teamName }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [includeProject, setIncludeProject] = useState(!!projectName);
    const [showcaseAsTeam, setShowcaseAsTeam] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDesc('');
            setIncludeProject(!!projectName);
            setShowcaseAsTeam(false);
        }
    }, [isOpen, projectName]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const baseTitle = title.trim();
        const baseDesc = desc.trim();
        if (!baseTitle && !(includeProject && projectName)) return;
        if (!baseDesc && !(includeProject && projectName)) return;

        let finalTitle = baseTitle;
        let finalDesc = baseDesc;
        if (includeProject && projectName) {
            if (!finalTitle) finalTitle = projectName;
            const teamLine = showcaseAsTeam && teamName ? `\nTeam: ${teamName}` : '';
            finalDesc = `${finalDesc ? `${finalDesc}\n\n` : ''}Project: ${projectName}${teamLine}`;
        }
        setIsPublishing(true);
        await onPublish(finalTitle, finalDesc);
        setIsPublishing(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-md w-full p-6 relative border-2 border-ch-rule">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text"><XIcon /></button>
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-4">Publish to Showcase</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ch-text mb-1">Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            required={!includeProject || !projectName}
                            className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent" 
                            placeholder="My Awesome Script"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ch-text mb-1">Description</label>
                        <textarea 
                            value={desc} 
                            onChange={e => setDesc(e.target.value)} 
                            required={!includeProject || !projectName}
                            rows={3}
                            className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent" 
                            placeholder="What does this code do?"
                        />
                    </div>
                    {projectName && (
                        <div className="space-y-2 border border-ch-divider p-3 bg-ch-surface">
                            <label className="flex items-center gap-2 text-sm text-ch-text">
                                <input
                                    type="checkbox"
                                    checked={includeProject}
                                    onChange={(e) => setIncludeProject(e.target.checked)}
                                    className="border-ch-divider text-ch-accent focus:ring-ch-accent"
                                />
                                Include project details
                            </label>
                            {includeProject && teamName && (
                                <label className="flex items-center gap-2 text-sm text-ch-text">
                                    <input
                                        type="checkbox"
                                        checked={showcaseAsTeam}
                                        onChange={(e) => setShowcaseAsTeam(e.target.checked)}
                                        className="border-ch-divider text-ch-accent focus:ring-ch-accent"
                                    />
                                    Showcase as team ({teamName})
                                </label>
                            )}
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={isPublishing}
                        className="w-full py-2 bg-ch-accent text-ch-on-accent font-medium hover:bg-ch-accent-deep disabled:opacity-50"
                    >
                        {isPublishing ? 'Publishing...' : 'Publish'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms)) return '';
    const m = Math.round(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return d === 1 ? 'yesterday' : `${d}d ago`;
};

/** First readable sentence(s) of a markdown challenge description. */
const plainSummary = (markdown: string) =>
    markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/^#+\s.*$/gm, ' ')
        .replace(/[*_`>#]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);

const FILE_CHIP: Record<string, { chip: string; color: string }> = {
    py: { chip: 'PY', color: '#1D4ED8' },
    js: { chip: 'JS', color: '#B45309' },
    html: { chip: 'HTM', color: '#BE185D' },
    css: { chip: 'CSS', color: '#0E7490' },
};

const MenuItem: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
    <button onClick={onClick} className="w-full text-left px-4 py-2.5 text-sm text-ch-text hover:bg-ch-surface flex items-center gap-3 transition-colors">
        <span className="text-ch-muted">{icon}</span>
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

const CodePlayground: React.FC<CodePlaygroundProps> = ({ theme, currentUser, setActiveTab, globalActiveTab, incomingChallenge, onChallengeHandled }) => {
  const { fetchShowcaseItems, showToast, teams, allUsers, fetchUsers, challenges, showcaseItems } = useData();
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

  const [showFirstLoginTips, setShowFirstLoginTips] = useState(() => {
      if (typeof window === 'undefined') return false;
      const firstSession = sessionStorage.getItem('first_login_session') === 'true';
      const seen = sessionStorage.getItem('playground_tips_seen') === 'true';
      return firstSession && !seen;
  });

  const [projects, setProjects] = useState<PlaygroundProject[]>([]);
  const [projectFiles, setProjectFiles] = useState<PlaygroundProjectFile[]>([]);
  const [projectActivity, setProjectActivity] = useState<PlaygroundProjectActivity[]>([]);
  const [projectMembers, setProjectMembers] = useState<PlaygroundProjectMember[]>([]);
  const [memberProjectIds, setMemberProjectIds] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<PlaygroundProject | null>(null);
  const [activeFile, setActiveFile] = useState<PlaygroundProjectFile | null>(null);
  const [openFilePaths, setOpenFilePaths] = useState<string[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [savedFileContents, setSavedFileContents] = useState<Record<string, string>>({});
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
  
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isPyodideReady] = useState(true);
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
  const [draggedTabPath, setDraggedTabPath] = useState<string | null>(null);
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFileNameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pendingChallenge, setPendingChallenge] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{ passed: boolean, feedback: string, weaknesses: string, improvements: string, tests?: ChallengeTestReport } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const codeRef = useRef(code);
  const activeFileRef = useRef<PlaygroundProjectFile | null>(null);
  const executionRef = useRef<SandboxExecutionController | null>(null);
  const completionProvidersRef = useRef<any[]>([]);
  const emmetInitializedRef = useRef(false);
  const collabChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const lastRemoteUpdateRef = useRef<Record<string, number>>({});
  const isProjectMode = !!activeProject;
  const canPreview = isProjectMode
      ? activeProject?.language === 'web' || activeProject?.language === 'html'
      : language === 'html';
  const isFileDirty = (path: string) => {
      const current = fileContents[path];
      const saved = savedFileContents[path];
      return current !== undefined && saved !== undefined && current !== saved;
  };

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
          // If there's a pending challenge, we let that useEffect handle the code setting
          if (sessionStorage.getItem('pending_challenge_context') && globalActiveTab === 'playground') {
              return;
          }
          
          setProjectFiles([]);
          setActiveFile(null);
          setOpenFilePaths([]);
          setSavedFileContents({});
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
  }, [activeProject, globalActiveTab, language]);

  useEffect(() => {
      const savedContext = sessionStorage.getItem('pending_challenge_context');
      const challengeToHandle = incomingChallenge || (savedContext ? JSON.parse(savedContext) : null);
      
      if (challengeToHandle && globalActiveTab === 'playground') {
          try {
              const challenge = challengeToHandle;
              const isTested = hasTestCases(challenge);

              // Test-graded challenges are tied to one language: switch to it first and let
              // this effect re-run (the pending context stays put until then).
              if (isTested && !activeProject && challenge.language && challenge.language !== language) {
                  setLanguage(challenge.language);
                  localStorage.setItem('playground_lang', challenge.language);
                  return;
              }

              setPendingChallenge(challenge);

              let challengeIntro = '';
              const deadlineStr = challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : 'N/A';
              const testsNote = isTested
                  ? `TESTS: ${challenge.testCases.length} (use "Run Tests" to check the visible ones)\n`
                  : '';

              if (language === 'python') {
                  challengeIntro = `"""\n` +
                                   `=========================================\n` +
                                   `CHALLENGE: ${challenge.title}\n` +
                                   (challenge.difficulty ? `DIFFICULTY: ${challenge.difficulty}\n` : '') +
                                   `DEADLINE: ${deadlineStr}\n` +
                                   testsNote +
                                   `=========================================\n` +
                                   `${challenge.description.replace(/"""/g, '\\"\\"\\"')}\n` +
                                   `"""\n\n` +
                                   (isTested ? (challenge.starterCode || STARTER_CODE.python) + '\n' : `# Write your solution below:\n\n`);
              } else if (language === 'javascript') {
                  challengeIntro = `/*\n` +
                                   `=========================================\n` +
                                   `CHALLENGE: ${challenge.title}\n` +
                                   (challenge.difficulty ? `DIFFICULTY: ${challenge.difficulty}\n` : '') +
                                   `DEADLINE: ${deadlineStr}\n` +
                                   testsNote +
                                   `=========================================\n` +
                                   `${challenge.description.replace(/\*\//g, '* /')}\n` +
                                   `*/\n\n` +
                                   (isTested ? (challenge.starterCode || STARTER_CODE.javascript) + '\n' : `// Write your solution below:\n\n`);
              } else if (language === 'html') {
                  challengeIntro = `<!--\n` +
                                   `=========================================\n` +
                                   `CHALLENGE: ${challenge.title}\n` +
                                   (challenge.difficulty ? `DIFFICULTY: ${challenge.difficulty}\n` : '') +
                                   `DEADLINE: ${deadlineStr}\n` +
                                   `=========================================\n` +
                                   `${challenge.description}\n` +
                                   `-->\n\n`;
              }
              
              if (challengeIntro) {
                  setCode(prev => {
                      const isDefault = !prev || 
                                        prev.trim() === DEFAULT_PYTHON.trim() || 
                                        prev.trim() === DEFAULT_JS.trim() || 
                                        prev.trim() === DEFAULT_HTML.trim() ||
                                        prev.trim() === '';
                      return isDefault ? challengeIntro : challengeIntro + prev;
                  });
                  setActiveTabState('editor');
              }
              sessionStorage.removeItem('pending_challenge_context');
              if (onChallengeHandled) onChallengeHandled();
          } catch (e) {
              console.error("Error parsing challenge context", e);
          }
      }
  }, [language, globalActiveTab, incomingChallenge]);

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
          setSavedFileContents(prev => ({ ...prev, [path]: content }));
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
      editor.onDidChangeCursorPosition((event: any) => {
          setCaret({ line: event.position.lineNumber, col: event.position.column });
      });
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => actionsRef.current.run());
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
          colorDecorators: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
          }
      });

      if (!emmetInitializedRef.current) {
          emmetHTML(monaco, ['html']);
          emmetCSS(monaco, ['css']);
          emmetInitializedRef.current = true;
      }

      // Enable rich CSS/HTML suggestions (including <style> blocks)
      try {
          monaco.languages.css.cssDefaults.setOptions({
              validate: true,
              lint: {
                  compatibleVendorPrefixes: 'warning',
                  vendorPrefix: 'warning',
                  duplicateProperties: 'warning',
                  emptyRules: 'warning',
                  importStatement: 'warning',
                  boxModel: 'warning',
                  universalSelector: 'warning',
                  zeroUnits: 'warning',
                  fontFaceProperties: 'warning',
                  hexColorLength: 'warning',
                  argumentsInColorFunction: 'warning',
                  ieHack: 'warning',
                  unknownProperties: 'warning',
                  propertyIgnoredDueToDisplay: 'warning',
                  important: 'warning',
                  float: 'warning',
                  idSelector: 'warning'
              },
              completion: {
                  completePropertyWithSemicolon: true,
                  triggerPropertyValueCompletion: true
              }
          });
          monaco.languages.html.htmlDefaults.setOptions({
              suggest: { html5: true },
              format: { wrapLineLength: 140 }
          });
      } catch {}

      completionProvidersRef.current.forEach(provider => provider.dispose());
      completionProvidersRef.current = [];

      const staticProvider = {
          provideCompletionItems: (model: any, position: any) => {
              const word = model.getWordUntilPosition(position);
              const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };

              const suggestions = [
                  ...PYTHON_KEYWORDS.map(k => ({ label: k, kind: monaco.languages.CompletionItemKind.Keyword, insertText: k, range, detail: 'Keyword' })),
                  ...PYTHON_BUILTINS.map(b => ({ label: b, kind: monaco.languages.CompletionItemKind.Function, insertText: b, range, detail: 'Built-in' })),
                  { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:name}(${2:args}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
                  { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Snippet' },
              ];
              return { suggestions };
          }
      };
      completionProvidersRef.current.push(monaco.languages.registerCompletionItemProvider('python', staticProvider));
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

  const loadProjectFiles = async (projectId: string, projectLanguage?: ProjectLanguage, preferredPath?: string) => {
      setIsLoadingFiles(true);
      try {
          const files = await api.getPlaygroundProjectFiles(projectId);
          setProjectFiles(files);
          if (files.length > 0) {
              const languageToUse = projectLanguage || activeProject?.language;
              const currentFile = activeFileRef.current?.path
                  ? files.find(file => file.path === activeFileRef.current.path)
                  : null;
              const preferred = preferredPath
                  ? files.find(file => file.path === preferredPath)
                  : null;
              const languageDefault = languageToUse === 'web'
                  ? files.find(file => file.path.toLowerCase().endsWith('index.html'))
                  : null;
              await openFile(currentFile || preferred || languageDefault || files[0]);
          } else {
              setActiveFile(null);
              setOpenFilePaths([]);
              setFileContents({});
              setSavedFileContents({});
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
      setSavedFileContents({});
      setOpenFilePaths([]);
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
      setOpenFilePaths(prev => (prev.includes(file.path) ? prev : [...prev, file.path]));
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
          setSavedFileContents(prev => ({ ...prev, [file.path]: content }));
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

  const closeOpenFile = async (path: string) => {
      const currentIndex = openFilePaths.indexOf(path);
      const nextPaths = openFilePaths.filter(openPath => openPath !== path);
      setOpenFilePaths(nextPaths);

      if (activeFile?.path !== path) return;

      const nextPath = nextPaths[currentIndex] || nextPaths[currentIndex - 1] || nextPaths[0] || null;
      if (!nextPath) {
          setActiveFile(null);
          setCode('');
          return;
      }

      const nextFile = projectFiles.find(file => file.path === nextPath);
      if (nextFile) {
          await openFile(nextFile);
      } else {
          setActiveFile(null);
          setCode('');
      }
  };

  const reorderOpenFile = (fromPath: string, toPath: string) => {
      if (fromPath === toPath) return;
      setOpenFilePaths(prev => {
          const fromIndex = prev.indexOf(fromPath);
          const toIndex = prev.indexOf(toPath);
          if (fromIndex === -1 || toIndex === -1) return prev;
          const next = prev.filter(path => path !== fromPath);
          next.splice(toIndex, 0, fromPath);
          return next;
      });
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
          await loadProjectFiles(activeProject.id, activeProject.language as ProjectLanguage, fileName);
          await loadProjectActivity(activeProject.id);
      } catch (error: any) {
          console.error("Failed to add file", error);
          showToast("Failed to add file.", "error");
      }
  };


  const handleNewFileShortcut = () => {
      const defaultName = activeProject?.language === 'javascript' ? 'new_file.js' : activeProject?.language === 'html' ? 'index.html' : 'new_file.py';
      if (!newFileName.trim()) {
          setNewFileName(defaultName);
      }
      setIsProjectPanelOpen(true);
      setTimeout(() => newFileNameInputRef.current?.focus(), 0);
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
          setSavedFileContents(prev => ({ ...prev, [activeFile.path]: codeRef.current }));
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
          setFileContents(prev => {
              const next = { ...prev };
              delete next[file.path];
              return next;
          });
          setSavedFileContents(prev => {
              const next = { ...prev };
              delete next[file.path];
              return next;
          });
          await closeOpenFile(file.path);
          setFileContents(prev => {
              const next = { ...prev };
              delete next[file.path];
              return next;
          });
          setSavedFileContents(prev => {
              const next = { ...prev };
              delete next[file.path];
              return next;
          });
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
              setActiveFile(null);
              setOpenFilePaths([]);
              setFileContents({});
              setSavedFileContents({});
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
          setSavedFileContents(prev => {
              const next = { ...prev };
              if (next[renamingFile.path] !== undefined) {
                  next[newPath] = next[renamingFile.path];
                  delete next[renamingFile.path];
              }
              return next;
          });
          setOpenFilePaths(prev => prev.map(path => (path === renamingFile.path ? newPath : path)));
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
           setOpenFilePaths([]);
           setFileContents({});
           setSavedFileContents({});
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
        executionRef.current?.cancel();
        executionRef.current = null;
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

  const handleAutoEvaluate = async () => {
      if (!pendingChallenge) return;
      setIsEvaluating(true);
      setEvaluationResult(null);
      try {
          const result = await submitChallengeSolution(pendingChallenge, currentUser.uid, code);
          if (result.passed === null) {
              showToast("Your solution was submitted for manual review.", "info");
              return;
          }
          setEvaluationResult({ ...result, passed: result.passed });
          if (result.passed) {
              showToast("Congratulations! Challenge passed and badge awarded!", "success");
              await fetchUsers();
          } else {
              showToast("Challenge evaluation complete. See feedback for improvements.", "info");
          }
      } catch (error: any) {
          console.error("Auto-evaluation failed:", error);
          showToast("Evaluation failed: " + error.message, "error");
      } finally {
          setIsEvaluating(false);
      }
  };

  // Dry-run against the visible test cases only; hidden ones are judged on submit.
  const handleRunTests = async () => {
      if (!pendingChallenge || !hasTestCases(pendingChallenge)) return;
      const visibleCount = pendingChallenge.testCases.filter((c: ChallengeTestCase) => !c.hidden).length;
      const hiddenCount = pendingChallenge.testCases.length - visibleCount;
      setActiveTabState('output');
      if (visibleCount === 0) {
          setOutput([{ type: 'hint', content: `This challenge only has hidden tests (${hiddenCount}). Submit to be judged.` }]);
          return;
      }
      setIsRunningTests(true);
      setOutput([{ type: 'log', content: `Running ${visibleCount} visible test${visibleCount === 1 ? '' : 's'}...` }]);
      try {
          const report = await runChallengeTestReport(pendingChallenge, code, true);
          const lines: OutputLine[] = [];
          report.cases.forEach(c => {
              if (c.passed) {
                  lines.push({ type: 'log', content: `PASS  ${c.label}  (${c.runtimeMs} ms)` });
                  return;
              }
              lines.push({ type: 'error', content: `FAIL  ${c.label}` });
              lines.push({ type: 'log', content: `  input:    ${JSON.stringify(c.input ?? '')}` });
              lines.push({ type: 'log', content: `  expected: ${JSON.stringify(c.expectedOutput ?? '')}` });
              lines.push(c.error
                  ? { type: 'error', content: `  error:    ${c.error}` }
                  : { type: 'log', content: `  got:      ${JSON.stringify(c.actualOutput ?? '')}` });
          });
          if (report.timedOut) lines.push({ type: 'error', content: 'Execution timed out — check for an infinite loop.' });
          lines.push({ type: report.passed === report.total ? 'hint' : 'error', content: `${report.passed}/${report.total} visible tests passed.` + (hiddenCount > 0 ? ` ${hiddenCount} hidden test${hiddenCount === 1 ? '' : 's'} will run when you submit.` : '') });
          setOutput(prev => [...prev, ...lines]);
      } catch (err: any) {
          setOutput(prev => [...prev, { type: 'error', content: err?.message || 'Could not run the tests.' }]);
      } finally {
          setIsRunningTests(false);
          scrollToBottom();
      }
  };
  
  const handleGetHint = async () => {
      setIsGettingHint(true);
      setActiveTabState('output');
      setOutput(prev => [...prev, { type: 'log', content: '?? AI Tutor is thinking...' }]);
      scrollToBottom();
      try {
          const hint = await geminiService.getAIPlaygroundHint(code, language);
          setOutput(prev => [...prev.filter(l => l.content !== '?? AI Tutor is thinking...'), { type: 'hint', content: hint }]);
      } catch (err: any) {
          setOutput(prev => [...prev.filter(l => l.content !== '?? AI Tutor is thinking...'), { type: 'error', content: err.message || 'Failed to get hint.' }]);
      } finally {
          setIsGettingHint(false);
          scrollToBottom();
      }
  };


  const runJS = async () => {
      setIsExecuting(true);
      setActiveTabState('output');
      setOutput([]);
      executionRef.current?.cancel();

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

      const execution = runSandboxedJavaScript({
          code,
          onOutput: (line) => {
              setOutput(prev => [...prev, line]);
              scrollToBottom();
          },
      });
      executionRef.current = execution;
      await execution.finished;
      if (executionRef.current === execution) {
          executionRef.current = null;
      }
      setIsExecuting(false);
      scrollToBottom();
  };

  const runPython = async () => {
    setIsExecuting(true);
    setActiveTabState('output');
    setOutput([]);
    setIsWaitingForInput(false);
    executionRef.current?.cancel();

    let filesForExecution: Record<string, string> | undefined;
    if (activeProject) {
        filesForExecution = await ensureProjectFilesLoaded();
        if (activeFile) {
            filesForExecution = { ...filesForExecution, [activeFile.path]: codeRef.current };
        }
        api.logPlaygroundActivity({
            projectId: activeProject.id,
            userId: currentUser.uid,
            action: 'ran_project',
            detail: activeFile?.path || 'script'
        }).catch(() => undefined);
    }

    const execution = runSandboxedPython({
        code,
        files: filesForExecution,
        projectId: activeProject?.id,
        onOutput: (line) => {
            if (typeof line.content !== 'string') return;
            const normalized = line.content.replace(/\r\n/g, '\n');
            const endsWithNewline = normalized.endsWith('\n');
            const parts = normalized.split('\n');
            if (endsWithNewline) {
                parts.pop();
            }
            setOutput(prev => {
                let newOutput = [...prev];
                if (parts.length === 0) {
                    if (endsWithNewline) {
                        newOutput.push({ type: line.type, content: '' });
                    }
                    return newOutput;
                }
                const lastLine = newOutput.length > 0 ? newOutput[newOutput.length - 1] : null;
                if (lastLine && lastLine.type === line.type) {
                    lastLine.content += parts[0];
                    newOutput[newOutput.length - 1] = { ...lastLine, content: processCarriageReturns(lastLine.content) };
                } else {
                    newOutput.push({ type: line.type, content: processCarriageReturns(parts[0]) });
                }
                if (parts.length > 1) {
                    for (let i = 1; i < parts.length; i++) {
                        newOutput.push({ type: line.type, content: parts[i] });
                    }
                }
                if (endsWithNewline) {
                    newOutput.push({ type: line.type, content: '' });
                }
                return newOutput;
            });
            scrollToBottom();
        },
        onInputRequest: (prompt) => {
            setInputPrompt(prompt);
            setIsWaitingForInput(true);
            inputResolverRef.current = (value: string) => execution.provideInput(value);
            setActiveTabState('output');
            setTimeout(() => {
                consoleInputRef.current?.focus();
                scrollToBottom();
            }, 50);
        },
    });
    executionRef.current = execution;
    await execution.finished;
    if (executionRef.current === execution) {
        executionRef.current = null;
    }
    inputResolverRef.current = null;
    setIsExecuting(false);
    setIsWaitingForInput(false);
    scrollToBottom();
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

  const dismissPlaygroundTips = () => {
      setShowFirstLoginTips(false);
      try {
          sessionStorage.setItem('playground_tips_seen', 'true');
      } catch {}
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
                  setSavedFileContents(prev => ({ ...prev, [file.path]: content }));
              } catch (error) {
                  console.error("Failed to load project file content", error);
              }
          }
      }
      setFileContents(contents);
      return contents;
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

  const editorTheme = splitEditorTheme(theme);
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


  // ---------- Split shell: header bridge, status bar, console, board ----------
  const [caret, setCaret] = useState({ line: 1, col: 1 });
  const [runInfo, setRunInfo] = useState<{ status: 'idle' | 'running' | 'ok' | 'err'; ms: number; label: string }>({ status: 'idle', ms: 0, label: '' });
  const runStartRef = useRef(0);
  const [boardTab, setBoardTab] = useState<'scripts' | 'projects' | 'shared'>('scripts');
  const [scriptsRequested, setScriptsRequested] = useState(false);

  const scratchName = `main.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'html'}`;
  const fileLabel = activeFile?.path || scratchName;
  const langLabel =
      editorLanguage === 'python' ? 'Python'
      : editorLanguage === 'javascript' ? 'JavaScript'
      : editorLanguage === 'html' ? 'HTML'
      : editorLanguage === 'css' ? 'CSS'
      : 'Text';
  const activeDirty = !!activeFile && isFileDirty(activeFile.path);
  const anyDirty = openFilePaths.some(isFileDirty);
  const saveStatus = activeProject ? (activeDirty ? 'Unsaved' : 'Saved') : 'Autosaved';
  const busy = isExecuting || isWaitingForInput || isEvaluating || isRunningTests || isGettingHint;

  // Run timing + verdict for the console status line.
  useEffect(() => {
      if (isExecuting) {
          runStartRef.current = performance.now();
          setRunInfo({ status: 'running', ms: 0, label: fileLabel });
          return;
      }
      setRunInfo(prev => prev.status !== 'running' ? prev : {
          status: output.some(line => line.type === 'error') ? 'err' : 'ok',
          ms: performance.now() - runStartRef.current,
          label: prev.label,
      });
  }, [isExecuting]);

  // Header cells live in ShellHeader; they talk to us over window events.
  const actionsRef = useRef<Record<PlaygroundAction, () => void>>({} as Record<PlaygroundAction, () => void>);
  actionsRef.current = {
      run: () => {
          if (isExecuting) executionRef.current?.cancel();
          else if (!busy) handleRunCode();
      },
      hint: () => { if (!busy) void handleGetHint(); },
      share: () => setIsShareModalOpen(true),
      save: () => { if (activeProject) void handleSaveFile(); else handleOpenCloudModal(); },
      submit: () => {
          if (busy) return;
          if (pendingChallenge) void handleAutoEvaluate();
          else setIsSubmitChallengeModalOpen(true);
      },
  };

  useEffect(() => {
      const onAction = (event: Event) => {
          const action = (event as CustomEvent<PlaygroundAction>).detail;
          actionsRef.current[action]?.();
      };
      window.addEventListener(PLAYGROUND_ACTION_EVENT, onAction);
      return () => window.removeEventListener(PLAYGROUND_ACTION_EVENT, onAction);
  }, []);

  useEffect(() => {
      if (globalActiveTab !== 'playground') return;
      const detail: PlaygroundHeaderState = {
          meta: `${langLabel} · sandboxed · ${activeProject ? (anyDirty ? 'unsaved changes' : 'all saved') : 'autosaved locally'}`,
          running: isExecuting,
          busy,
          submitLabel: 'Submit',
      };
      window.dispatchEvent(new CustomEvent(PLAYGROUND_STATE_EVENT, { detail }));
  }, [globalActiveTab, langLabel, activeProject, anyDirty, isExecuting, busy]);

  // Board data is fetched the first time its tab is on screen.
  useEffect(() => {
      if (globalActiveTab === 'playground' && boardTab === 'scripts' && !scriptsRequested) {
          setScriptsRequested(true);
          void fetchCloudScripts();
      }
  }, [globalActiveTab, boardTab, scriptsRequested]);

  useEffect(() => {
      if (globalActiveTab === 'playground' && boardTab === 'shared' && showcaseItems.length === 0) {
          void fetchShowcaseItems();
      }
  }, [globalActiveTab, boardTab]);

  const spotlightChallenge = useMemo(() => {
      if (pendingChallenge) return pendingChallenge;
      const now = new Date();
      return [...challenges]
          .filter(c => c.status === 'ACTIVE' && new Date(c.deadline) >= now && !currentUser.badges?.includes(c.title))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
  }, [pendingChallenge, challenges, currentUser.badges]);


  const consoleDot =
      runInfo.status === 'running' ? 'var(--ch-violet)'
      : isWaitingForInput ? '#d97706'
      : runInfo.status === 'ok' ? '#16a34a'
      : runInfo.status === 'err' ? 'var(--ch-accent)'
      : 'var(--ch-divider)';
  const consoleStatus =
      isWaitingForInput ? 'Waiting for input'
      : runInfo.status === 'running' ? `Running ${runInfo.label}…`
      : runInfo.status === 'ok' ? `${runInfo.label} finished in ${(runInfo.ms / 1000).toFixed(2)}s`
      : runInfo.status === 'err' ? `${runInfo.label} stopped with an error`
      : 'Idle';

  const challengePanel = spotlightChallenge && (
      <div className="flex-none bg-ch-accent px-6 pb-[22px] pt-6 text-ch-on-accent">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">
                  {pendingChallenge ? 'Challenge mode' : 'Open challenge'}
                  {spotlightChallenge.difficulty ? ` · ${spotlightChallenge.difficulty.toLowerCase()}` : ''}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-75">
                  Closes {new Date(spotlightChallenge.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
          </div>
          <p className="line-clamp-3 text-[34px] font-extrabold leading-[0.95] tracking-[-0.04em]">{spotlightChallenge.title}</p>
          <p className="mb-[18px] mt-3.5 line-clamp-3 max-w-[300px] text-[13px] font-semibold leading-[1.45]">{plainSummary(spotlightChallenge.description)}</p>
          <div className="flex items-center gap-3 border-t-2 border-black/[0.28] pt-3.5">
              <button
                  onClick={() => pendingChallenge ? setPendingChallenge(null) : openChallengeWorkspace(spotlightChallenge.id, setActiveTab)}
                  className="flex h-8 items-center bg-ch-on-accent px-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ch-accent-deep transition-opacity hover:opacity-85"
              >
                  {pendingChallenge ? 'Exit challenge' : 'Open challenge'}
              </button>
              <span className="flex-1" />
              <span className="text-[11.5px] font-bold">
                  {hasTestCases(spotlightChallenge) ? `${spotlightChallenge.testCases?.length} tests` : 'AI reviewed'}
              </span>
          </div>
      </div>
  );

  const boardRow = 'flex w-full items-center gap-3 border-t border-ch-divider py-[11px] text-left transition-opacity duration-100 hover:opacity-65';

  const scriptsList = (
      <div className="px-5 pb-5 pt-[18px]">
          <div className="mb-2.5 flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Your files</p>
              <button onClick={handleOpenCloudModal} className="text-[11px] font-bold text-ch-accent hover:underline">Save current</button>
          </div>
          {isLoadingScripts ? (
              <p className="py-2 text-[13px] text-ch-muted">Loading scripts…</p>
          ) : cloudScripts.length === 0 ? (
              <p className="py-2 text-[13px] text-ch-muted">No saved scripts yet. Use Save in the header.</p>
          ) : (
              cloudScripts.map(script => {
                  const ext = script.name.split('.').pop()?.toLowerCase() || '';
                  const chip = FILE_CHIP[ext] || { chip: ext.slice(0, 3).toUpperCase() || '—', color: '#6D28D9' };
                  return (
                      <button key={script.id || script.name} onClick={() => { void handleCloudLoad(script.name); setIsProjectPanelOpen(false); }} className={boardRow}>
                          <span className="flex h-7 w-7 flex-none items-center justify-center text-[10px] font-extrabold text-white" style={{ background: chip.color }}>{chip.chip}</span>
                          <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-[12.5px] font-semibold leading-tight">{script.name}</span>
                              <span className="mt-0.5 block truncate text-[11px] text-ch-muted">Edited {timeAgo(script.lastModified)}</span>
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ch-muted">Open</span>
                      </button>
                  );
              })
          )}
      </div>
  );

  const sharedList = (
      <div className="px-5 pb-5 pt-[18px]">
          <div className="mb-2.5 flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">From the showcase</p>
              <span className="text-[11px] text-ch-muted">{showcaseItems.length} snippets</span>
          </div>
          {showcaseItems.length === 0 ? (
              <p className="py-2 text-[13px] text-ch-muted">Nothing shared yet.</p>
          ) : (
              showcaseItems.slice(0, 30).map((item, index) => (
                  <button key={item.id} onClick={() => { handleImportCode(item.codeContent); setIsProjectPanelOpen(false); }} className={boardRow}>
                      <InitialsTile name={item.userName || '?'} size={28} color={TILE_COLORS[index % TILE_COLORS.length]} />
                      <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold leading-tight">{item.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-ch-muted">
                              {item.userName || 'Unknown'} · {item.likes?.length || 0} like{item.likes?.length === 1 ? '' : 's'}
                          </span>
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ch-muted">Load</span>
                  </button>
              ))
          )}
      </div>
  );

  // A function, not a value: projectPanel is declared further down.
  const renderBoard = () => (
      <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[42px] flex-none items-stretch border-b-2 border-ch-rule">
              {([['scripts', 'My scripts'], ['projects', 'Projects'], ['shared', 'Club shared']] as const).map(([id, label]) => (
                  <button
                      key={id}
                      onClick={() => setBoardTab(id)}
                      className={`flex flex-1 items-center gap-2 border-r border-ch-divider px-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors duration-100 last:border-r-0 ${
                          boardTab === id ? 'bg-ch-accent-soft text-ch-text' : 'text-ch-muted hover:bg-ch-surface'
                      }`}
                  >
                      <span className="h-1.5 w-1.5 flex-none" style={{ background: boardTab === id ? 'var(--ch-accent)' : 'transparent' }} />
                      {label}
                  </button>
              ))}
          </div>
          <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
              {boardTab === 'projects' ? projectPanel : boardTab === 'scripts' ? scriptsList : sharedList}
          </div>
      </div>
  );

  const stripCell = 'flex flex-none items-center border-l border-ch-divider px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-100';
  const stripIdle = 'text-ch-muted hover:bg-ch-surface hover:text-ch-text';
  const stripActive = 'bg-ch-accent text-ch-on-accent';

  const projectPanel = (
      <div className="flex min-h-full flex-col bg-ch-bg">
          <div className="p-3 border-b border-ch-divider flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-ch-text">
                  <ViewGridIcon />
                  Projects
              </div>
              <button
                  onClick={loadProjects}
                  className="p-1.5 text-ch-muted hover:text-ch-text hover:bg-ch-surface"
                  title="Refresh"
              >
                  <RefreshIcon />
              </button>
          </div>
          <div className="flex-1 p-3 space-y-4">
              <div className="space-y-2">
                  <p className="text-xs font-semibold text-ch-muted uppercase">New Project</p>
                  <input
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Project name"
                      className="w-full px-3 py-2 text-xs border border-ch-divider bg-ch-bg"
                  />
                  <select
                      value={newProject.language}
                      onChange={(e) => setNewProject(prev => ({ ...prev, language: e.target.value as ProjectLanguage }))}
                      className="w-full px-3 py-2 text-xs border border-ch-divider bg-ch-bg"
                  >
                      <option value="python">Python</option>
                      <option value="web">Web</option>
                  </select>
                  <select
                      value={newProject.teamId}
                      onChange={(e) => setNewProject(prev => ({ ...prev, teamId: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-ch-divider bg-ch-bg"
                  >
                      <option value="">Personal project</option>
                      {selectableTeams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                  </select>
                  <button
                      onClick={handleCreateProject}
                      className="w-full px-3 py-2 text-xs font-semibold bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep"
                  >
                      Create Project
                  </button>
              </div>

              <div className="space-y-2">
                  <p className="text-xs font-semibold text-ch-muted uppercase">Your Projects</p>
                  {isLoadingProjects ? (
                      <p className="text-xs text-ch-muted">Loading...</p>
                  ) : accessibleProjects.length === 0 ? (
                      <p className="text-xs text-ch-muted">No projects yet.</p>
                  ) : (
                      <div className="space-y-2">
                          {accessibleProjects.map(project => (
                              <div key={project.id} className="flex items-center gap-2">
                                  <button
                                      onClick={() => openProject(project)}
                                      className={`flex-1 text-left px-3 py-2 border text-xs transition-colors ${
                                          activeProject?.id === project.id
                                              ? 'border-ch-accent bg-ch-accent-soft text-ch-accent'
                                              : 'border-ch-divider hover:bg-ch-surface'
                                      }`}
                                  >
                                      <div className="font-semibold">{project.name}</div>
                                      <div className="text-[10px] text-ch-muted capitalize flex items-center gap-1">
                                          <DocumentTextIcon className="w-3 h-3" /> {project.language}
                                          {project.teamId && <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" /> Team</span>}
                                      </div>
                                  </button>
                                  {(currentUser.role === 'PATRON' || project.createdBy === currentUser.uid) && (
                                      <button
                                          onClick={() => setProjectToDelete(project)}
                                          className="p-1.5 text-ch-muted hover:text-red-500"
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
                          <p className="text-xs font-semibold text-ch-muted uppercase">Files</p>
                          <button
                              onClick={() => { setActiveProject(null); setIsProjectPanelOpen(false); }}
                              className="text-[10px] text-ch-muted hover:text-ch-text"
                          >
                              Exit
                          </button>
                      </div>

                      <div className="space-y-2">
                          {isLoadingFiles ? (
                              <p className="text-xs text-ch-muted">Loading files...</p>
                          ) : projectFiles.length === 0 ? (
                              <p className="text-xs text-ch-muted">No files yet.</p>
                          ) : (
                              projectFiles.map(file => (
                                  <div key={file.id} className="flex items-center gap-2">
                                      <button
                                          onClick={() => openFile(file)}
                                          className={`flex-1 text-left px-2 py-1.5 text-xs border ${
                                              activeFile?.id === file.id
                                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200'
                                                  : 'border-ch-divider hover:bg-ch-surface'
                                          }`}
                                      >
                                          {file.path}
                                          </button>
                                      <button
                                          onClick={() => startRenameFile(file)}
                                          className="p-1 text-ch-muted hover:text-indigo-500"
                                          title="Rename file"
                                      >
                                          <PencilIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                          onClick={() => handleDeleteFile(file)}
                                          className="p-1 text-ch-muted hover:text-red-500"
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
                              ref={newFileNameInputRef}
                              value={newFileName}
                              onChange={(e) => setNewFileName(e.target.value)}
                              placeholder={activeProject?.language === 'javascript' ? "new_file.js" : activeProject?.language === 'html' ? "index.html" : "new_file.py"}
                              className="flex-1 px-2 py-1.5 text-xs border border-ch-divider bg-ch-bg"
                          />
                          <button
                              onClick={handleAddFile}
                              className="px-2 py-1.5 text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
                          >
                              Add
                          </button>
                      </div>

                      {renamingFile && (
                          <div className="mt-2 space-y-2">
                              <input
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs border border-ch-divider bg-ch-bg"
                              />
                              <div className="flex gap-2">
                                  <button
                                      onClick={handleRenameFile}
                                      className="px-2 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                                  >
                                      Rename
                                  </button>
                                  <button
                                      onClick={() => { setRenamingFile(null); setRenameValue(''); }}
                                      className="px-2 py-1.5 text-xs font-semibold bg-ch-surface-2 text-ch-text"
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
                      <p className="text-xs font-semibold text-ch-muted uppercase">Collaborators</p>
                      {isLoadingMembers && collaborators.length === 0 ? (
                          <p className="text-xs text-ch-muted">Loading members...</p>
                      ) : collaborators.length === 0 ? (
                          <p className="text-xs text-ch-muted">No collaborators yet.</p>
                      ) : (
                          <ul className="space-y-2">
                              {collaborators.map(member => (
                                  <li key={member.uid} className="flex items-center gap-2 text-xs">
                                      <div className="w-7 h-7 bg-ch-surface-2 flex items-center justify-center text-[10px] font-semibold text-ch-text">
                                          {member.name.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-ch-text truncate">{member.name}</div>
                                          {member.username && (
                                              <div className="text-[10px] text-ch-muted truncate">@{member.username}</div>
                                          )}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                          {member.isOwner && <span className="px-2 py-0.5 text-[9px] bg-ch-accent-soft text-ch-accent">Owner</span>}
                                          {member.isTeamMember && <span className="px-2 py-0.5 text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">Team</span>}
                                          {member.isInvited && !member.isTeamMember && !member.isOwner && (
                                              <span className="px-2 py-0.5 text-[9px] bg-ch-surface-2 text-ch-text">Invited</span>
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
                                  className="flex-1 px-2 py-1.5 text-xs border border-ch-divider bg-ch-bg"
                              >
                                  <option value="">Invite member</option>
                                  {availableInviteUsers.map(user => (
                                      <option key={user.uid} value={user.uid}>{user.name}</option>
                                  ))}
                              </select>
                              <button
                                  onClick={handleInviteUser}
                                  disabled={!inviteUserId}
                                  className="px-2 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                  Invite
                              </button>
                          </div>

                          <div className="flex gap-2">
                              <select
                                  value={inviteTeamId}
                                  onChange={(e) => setInviteTeamId(e.target.value)}
                                  className="flex-1 px-2 py-1.5 text-xs border border-ch-divider bg-ch-bg"
                              >
                                  <option value="">Invite team</option>
                                  {selectableTeams.map(team => (
                                      <option key={team.id} value={team.id}>{team.name}</option>
                                  ))}
                              </select>
                              <button
                                  onClick={handleInviteTeam}
                                  disabled={!inviteTeamId}
                                  className="px-2 py-1.5 text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
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
                          <p className="text-xs font-semibold text-ch-muted uppercase">Activity Log</p>
                          <div className="flex gap-1 text-[10px]">
                              {(['all', 'me', 'team'] as const).map(filter => (
                                  <button
                                      key={filter}
                                      onClick={() => setActivityFilter(filter)}
                                      className={`px-2 py-1 ${
                                          activityFilter === filter
                                              ? 'bg-ch-text text-ch-bg hover:opacity-90'
                                              : 'bg-ch-surface-2 text-ch-muted'
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
                          <ul className="space-y-2 text-xs text-ch-muted">
                              {filteredActivity.slice(0, 8).map(activity => (
                                  <li key={activity.id} className="flex flex-col">
                                      <span className="font-semibold text-ch-text">{activity.action.replace('_', ' ')}</span>
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
    <div className="flex flex-col h-full bg-ch-bg overflow-hidden relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept={language === 'python' ? ".py,.txt" : language === 'javascript' ? ".js,.txt" : ".html,.htm,.txt"}
        className="hidden"
      />

      <div className="flex min-h-0 flex-1 items-stretch">

        {/* ---------- Editor column ---------- */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          {/* File strip */}
          <div className="flex h-[46px] flex-none items-stretch border-b-2 border-ch-rule">
            <button
              onClick={() => setIsProjectPanelOpen(true)}
              className="flex flex-none items-center border-r border-ch-divider px-3.5 text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text xl:hidden [&_svg]:h-4 [&_svg]:w-4"
              title="Scripts and projects"
              aria-label="Open scripts and projects"
            >
              <ViewGridIcon />
            </button>
            <div className="ch-scroll flex min-w-0 items-stretch overflow-x-auto">
              {activeProject ? (
                openFilePaths.length === 0 ? (
                  <div className="flex items-center px-4 text-[12px] text-ch-muted">Open a file from Projects.</div>
                ) : (
                  openFilePaths.map((path) => {
                    const file = projectFiles.find(projectFile => projectFile.path === path);
                    const isActive = activeFile?.path === path;
                    return (
                      <div
                        key={path}
                        role="button"
                        tabIndex={0}
                        onClick={() => { if (file) void openFile(file); }}
                        onKeyDown={(event) => { if (event.key === 'Enter' && file) void openFile(file); }}
                        title={path}
                        className={`group flex flex-none items-center gap-2.5 border-r border-ch-divider pl-[18px] pr-2 font-mono text-[12.5px] font-bold transition-colors duration-100 ${
                          isActive ? 'text-ch-text shadow-[inset_0_-2px_0_var(--ch-accent)]' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text'
                        }`}
                      >
                        <span className="max-w-[160px] truncate">{path.split('/').pop()}</span>
                        {isFileDirty(path) && <span className="h-1.5 w-1.5 flex-none bg-ch-accent" title="Unsaved" />}
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void closeOpenFile(path); }}
                          className="flex h-5 w-5 items-center justify-center text-ch-muted transition-colors hover:bg-ch-surface-2 hover:text-ch-text"
                          aria-label={`Close ${path}`}
                          title="Close tab"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })
                )
              ) : (
                <div className="flex flex-none items-center border-r border-ch-divider px-[18px] font-mono text-[12.5px] font-bold text-ch-text shadow-[inset_0_-2px_0_var(--ch-accent)]">
                  {scratchName}
                </div>
              )}
            </div>
            {activeProject && (
              <button
                onClick={() => { setBoardTab('projects'); handleNewFileShortcut(); }}
                className="flex w-[46px] flex-none items-center justify-center border-r border-ch-divider text-[18px] font-bold text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text"
                title="New file"
                aria-label="New file"
              >
                +
              </button>
            )}
            <div className="flex-1" />

            {pendingChallenge && hasTestCases(pendingChallenge) && (
              <button
                onClick={handleRunTests}
                disabled={busy}
                className={`${stripCell} gap-2 text-ch-accent hover:bg-ch-accent-soft disabled:cursor-not-allowed disabled:opacity-50`}
                title="Check your solve() against the visible test cases"
              >
                {isRunningTests ? 'Testing…' : 'Run tests'}
              </button>
            )}

            {canPreview && (
              <>
                <button onClick={() => setActiveTabState('editor')} className={`${stripCell} ${activeTab !== 'preview' ? stripActive : stripIdle}`}>Code</button>
                <button onClick={() => setActiveTabState('preview')} className={`${stripCell} ${activeTab === 'preview' ? stripActive : stripIdle}`}>Preview</button>
              </>
            )}

            {!activeProject && (['python', 'javascript', 'html'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`${stripCell} ${language === lang ? stripActive : stripIdle}`}
              >
                <span className="sm:hidden">{lang === 'python' ? 'PY' : lang === 'javascript' ? 'JS' : 'HTML'}</span>
                <span className="hidden sm:inline">{lang === 'python' ? 'Python' : lang === 'javascript' ? 'JavaScript' : 'HTML'}</span>
              </button>
            ))}

            <div className="relative flex flex-none items-stretch" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`${stripCell} ${isMenuOpen ? 'bg-ch-surface text-ch-text' : stripIdle}`}
                aria-label="More actions"
                aria-expanded={isMenuOpen}
              >
                <DotsVerticalIcon />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full z-50 w-52 border-2 border-ch-rule bg-ch-bg py-1">
                  <MenuItem onClick={triggerFileUpload} icon={<UploadIcon className="w-4 h-4"/>} label="Upload" />
                  <MenuItem onClick={handleDownloadCode} icon={<DownloadIcon className="w-4 h-4"/>} label="Download" />
                  <MenuItem onClick={handleOpenCloudModal} icon={<CloudIcon className="w-4 h-4"/>} label="Cloud Scripts" />
                  <div className="my-1 h-px bg-ch-divider"></div>
                  <MenuItem onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }} icon={<ShareIcon className="w-4 h-4"/>} label="Share" />
                  <MenuItem onClick={() => { setIsPublishModalOpen(true); setIsMenuOpen(false); }} icon={<GlobeIcon className="w-4 h-4"/>} label="Publish" />
                  <MenuItem onClick={() => { setIsSubmitChallengeModalOpen(true); setIsMenuOpen(false); }} icon={<TrophyIcon className="w-4 h-4"/>} label="Submit Challenge" />
                  {activeProject && (
                    <>
                      <div className="my-1 h-px bg-ch-divider"></div>
                      <MenuItem onClick={() => { setActiveProject(null); setIsMenuOpen(false); }} icon={<XIcon className="w-4 h-4"/>} label="Exit project" />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* The board's challenge panel is hidden below xl; keep the mode visible. */}
          {pendingChallenge && (
            <div className="flex flex-none items-stretch border-b-2 border-ch-rule bg-ch-accent text-ch-on-accent xl:hidden">
              <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2">
                <span className="flex-none text-[10px] font-extrabold uppercase tracking-[0.16em]">Challenge</span>
                <span className="truncate text-[13px] font-bold">{pendingChallenge.title}</span>
              </div>
              <button
                onClick={() => setPendingChallenge(null)}
                className="flex flex-none items-center border-l-2 border-black/[0.28] px-4 text-[11px] font-extrabold uppercase tracking-[0.08em] hover:bg-black/10"
              >
                Exit
              </button>
            </div>
          )}

          {showFirstLoginTips && (
            <div className="flex flex-none items-start justify-between gap-4 border-b-2 border-ch-rule bg-ch-accent-soft px-6 py-3 text-[12px]">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Playground tips</p>
                <p className="mt-1 text-ch-text">
                  Run with the header button or <strong>Ctrl/⌘ + Enter</strong>. Hint asks Kevin for a nudge. Upload, publish and more live under ⋮.
                </p>
              </div>
              <button onClick={dismissPlaygroundTips} className="flex-none bg-ch-accent px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ch-on-accent hover:bg-ch-accent-deep">
                Got it
              </button>
            </div>
          )}

          {/* Editor / preview */}
          <div className="relative min-h-0 flex-1">
            <div className={`absolute inset-0 ${activeTab !== 'preview' ? 'z-10' : 'pointer-events-none z-0 opacity-0'}`}>
              <Editor
                height="100%"
                defaultLanguage={editorLanguage}
                language={editorLanguage}
                theme={editorTheme}
                value={code}
                beforeMount={setupMonaco}
                onChange={(value) => {
                  const nextValue = value || '';
                  codeRef.current = nextValue;
                  setCode(nextValue);
                }}
                onMount={handleEditorDidMount}
                loading={<div className="flex h-full items-center justify-center text-[13px] text-ch-muted">Loading editor…</div>}
                options={{ padding: { top: 16, bottom: 16 } }}
              />
            </div>

            <div className={`absolute inset-0 flex flex-col overflow-hidden bg-ch-bg ${activeTab === 'preview' ? 'z-10' : 'pointer-events-none z-0 opacity-0'}`}>
              <div className="flex h-9 flex-none items-stretch border-b border-ch-divider text-[10px] font-extrabold uppercase tracking-[0.12em]">
                <span className="flex items-center px-5 text-ch-muted">Preview</span>
                <span className="flex-1" />
                <button onClick={() => setShowPreviewConsole(prev => !prev)} className={`${stripCell} ${stripIdle}`}>
                  {showPreviewConsole ? 'Hide console' : 'Show console'}
                </button>
                <button onClick={() => setPreviewConsole([])} className={`${stripCell} ${stripIdle}`}>Clear</button>
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
                  className={`${stripCell} ${stripActive} hover:bg-ch-accent-deep`}
                >
                  Refresh
                </button>
              </div>
              <div className="flex flex-1 flex-col bg-white">
                <iframe
                  title="HTML Preview"
                  className={`w-full border-0 bg-white ${showPreviewConsole ? 'flex-1' : 'h-full'}`}
                  sandbox="allow-scripts allow-modals allow-forms"
                  srcDoc={htmlPreview}
                />
                {showPreviewConsole && (
                  <div className="ch-scroll h-40 space-y-1 overflow-y-auto border-t-2 border-ch-rule bg-ch-bg p-3 font-mono text-xs text-ch-text">
                    {previewConsole.length === 0 ? (
                      <span className="text-ch-muted">Preview console ready.</span>
                    ) : (
                      previewConsole.map((line, idx) => (
                        <div key={idx} className={line.type === 'error' ? 'text-ch-accent' : ''}>{line.content}</div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex h-7 flex-none items-stretch border-t border-ch-divider bg-ch-surface text-[10px] font-bold uppercase tracking-[0.1em] text-ch-muted">
            <div className="flex items-center border-r border-ch-divider px-[18px]">Ln {caret.line}, Col {caret.col}</div>
            <div className="flex items-center border-r border-ch-divider px-[18px]">{langLabel}</div>
            <div className="hidden items-center border-r border-ch-divider px-[18px] sm:flex">Spaces · 4</div>
            {activeProject && (
              <div className="hidden min-w-0 items-center border-r border-ch-divider px-[18px] md:flex">
                <span className="truncate">{activeProject.name}</span>
              </div>
            )}
            <div className="flex-1" />
            <div className={`flex items-center px-[18px] ${activeDirty ? 'text-ch-accent' : ''}`}>{saveStatus}</div>
          </div>

          {/* Console */}
          <div className="flex h-[34%] max-h-[300px] min-h-[170px] flex-none flex-col border-t-2 border-ch-rule">
            <div className="flex h-10 flex-none items-stretch border-b border-ch-divider">
              <div className="flex items-center gap-2.5 px-6 text-[10px] font-extrabold uppercase tracking-[0.14em]">
                <span className="h-1.5 w-1.5" style={{ background: consoleDot }} />
                Console
              </div>
              <div className="flex min-w-0 flex-1 items-center truncate text-[12px] text-ch-muted">{consoleStatus}</div>
              <button onClick={handleCopyOutput} className={`${stripCell} ${stripIdle}`}>{copyFeedback ? 'Copied' : 'Copy'}</button>
              <button onClick={handleClearOutput} className={`${stripCell} ${stripIdle}`}>Clear</button>
            </div>
            <div
              ref={outputContainerRef}
              className="ch-scroll min-h-0 flex-1 overflow-y-auto py-3.5 font-mono text-[13px] leading-[21px]"
              onClick={() => { if (isWaitingForInput) consoleInputRef.current?.focus(); }}
            >
              {output.length === 0 && !isWaitingForInput ? (
                <p className="px-6 font-sans text-[13px] text-ch-muted">Output shows here. Press Run or Ctrl/⌘ + Enter.</p>
              ) : (
                output.map((line, index) => (
                  line.type === 'hint' ? (
                    <div key={index} className="mx-6 my-2 flex gap-3 border-l-2 border-ch-accent bg-ch-accent-soft px-3 py-2.5 font-sans">
                      <LightBulbIcon className="mt-0.5 h-4 w-4 flex-none text-ch-accent" />
                      <div className="min-w-0 flex-1 text-sm">
                        <FormattedMessage text={line.content} isUser={false} />
                      </div>
                    </div>
                  ) : (
                    <div key={index} className={`flex gap-3.5 px-6 ${line.type === 'error' ? 'text-ch-accent' : 'text-ch-text'}`}>
                      <span className="w-6 flex-none text-right text-ch-muted">{line.type === 'error' ? '!' : ''}</span>
                      <span className="min-w-0 whitespace-pre-wrap break-words">{line.content}</span>
                    </div>
                  )
                ))
              )}

              {isWaitingForInput && (
                <div className="flex items-center gap-3.5 px-6">
                  <span className="w-6 flex-none text-right text-ch-accent">$</span>
                  <span className="whitespace-pre-wrap">{inputPrompt}</span>
                  <input
                    ref={consoleInputRef}
                    value={consoleInput}
                    onChange={e => setConsoleInput(e.target.value)}
                    onKeyDown={handleConsoleInputEnter}
                    className="min-w-[50px] flex-1 border-none bg-transparent font-bold text-ch-accent outline-none"
                    autoFocus
                    autoComplete="off"
                    spellCheck="false"
                    aria-label="Program input"
                  />
                </div>
              )}

              {isExecuting && !isWaitingForInput && <div className="animate-pulse px-6 pl-[64px] text-ch-violet">_</div>}
            </div>
          </div>
        </div>

        {/* ---------- Board ---------- */}
        <aside className="hidden min-h-0 w-[392px] flex-none flex-col border-l-2 border-ch-rule xl:flex">
          {challengePanel}
          {renderBoard()}
        </aside>

        {/* Narrow screens: the board slides in as a drawer. */}
        {isProjectPanelOpen && (
          <div className="fixed inset-0 z-50 flex bg-black/50 xl:hidden">
            <button onClick={() => setIsProjectPanelOpen(false)} className="flex-1" aria-label="Close panel" />
            <div className="flex h-full w-[min(392px,92vw)] flex-col border-l-2 border-ch-rule bg-ch-bg">
              {challengePanel}
              {renderBoard()}
            </div>
          </div>
        )}
      </div>

      {isCloudModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
              <div className="bg-ch-bg max-w-lg w-full p-6 relative border-2 border-ch-rule">
                   <button 
                        onClick={() => setIsCloudModalOpen(false)} 
                        className="absolute top-4 right-4 text-ch-muted hover:text-ch-text"
                    >
                       <XIcon />
                    </button>
                   
                   <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-4 flex items-center gap-2">
                       <CloudIcon /> Cloud Scripts
                   </h3>

                   {cloudMessage && (
                       <div className={`mb-4 p-3 text-sm ${cloudMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                           {cloudMessage.text}
                       </div>
                   )}

                   <div className="mb-6 p-4 bg-ch-surface">
                       <h4 className="text-sm font-semibold text-ch-text mb-2">Save Current Code</h4>
                       <div className="flex gap-2">
                           <input 
                                type="text" 
                                placeholder={`filename.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'html'}`} 
                                value={saveFileName}
                                onChange={(e) => setSaveFileName(e.target.value)}
                                className="flex-1 px-3 py-2 border border-ch-divider text-sm focus:outline-none focus:ring-2 focus:ring-ch-accent"
                           />
                           <button 
                                onClick={handleCloudSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-ch-accent text-ch-on-accent text-sm font-medium hover:bg-ch-accent-deep disabled:opacity-50"
                           >
                               {isSaving ? 'Saving...' : 'Save'}
                           </button>
                       </div>
                   </div>

                   <div>
                       <h4 className="text-sm font-semibold text-ch-text mb-2">Your Scripts</h4>
                       <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                           {isLoadingScripts ? (
                               <p className="text-center text-ch-muted text-sm py-4">Loading scripts...</p>
                           ) : cloudScripts.length === 0 ? (
                               <p className="text-center text-ch-muted text-sm py-4">No scripts saved yet.</p>
                           ) : (
                               cloudScripts.map(script => (
                                   <div key={script.id} className="flex items-center justify-between p-3 bg-ch-surface border border-ch-divider hover:border-ch-rule transition-colors">
                                       <div className="min-w-0 flex-1 mr-2">
                                           <p className="text-sm font-medium text-ch-text truncate">{script.name}</p>
                                           <p className="text-xs text-ch-muted">{script.lastModified}</p>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           <button 
                                                onClick={() => handleCloudLoad(script.name)}
                                                className="text-xs px-2 py-1 bg-ch-accent-soft text-ch-violet hover:bg-ch-accent-soft transition-colors"
                                           >
                                               Load
                                           </button>
                                           <button 
                                                onClick={() => setScriptToDelete(script.name)}
                                                className="text-ch-muted hover:text-red-500 transition-colors"
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
          projectName={activeProject?.name || null}
          teamName={teams.find(team => team.id === activeProject?.teamId)?.name || null}
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

      {isEvaluating && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
              <div className="bg-ch-bg p-8 flex flex-col items-center gap-4 border border-ch-divider">
                  <div className="relative">
                      <div className="w-16 h-16 border-4 border-ch-divider"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-ch-accent border-t-transparent animate-spin"></div>
                      <SparklesIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-ch-accent" />
                  </div>
                  <div className="text-center">
                      <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">Analyzing Solution</h3>
                      <p className="text-sm text-ch-muted animate-pulse">
                          {hasTestCases(pendingChallenge) ? 'Running your code against the test cases...' : 'Kevin is reviewing your code...'}
                      </p>
                  </div>
              </div>
          </div>
      )}

      {evaluationResult && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-ch-bg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-ch-rule">
                  <div className={`p-6 flex items-center justify-between ${evaluationResult.passed ? 'bg-green-600 text-white' : 'bg-ch-accent text-ch-on-accent'}`}>
                      <div className="flex items-center gap-3">
                          <div className="bg-black/20 p-2">
                              {evaluationResult.passed ? <BadgeCheckIcon className="w-8 h-8" /> : <XCircleIcon className="w-8 h-8" />}
                          </div>
                          <div>
                              <h3 className="text-2xl font-bold">{evaluationResult.passed ? 'Challenge Passed!' : 'Needs Improvement'}</h3>
                              <p className="opacity-80 text-sm font-medium">{pendingChallenge?.title}</p>
                          </div>
                      </div>
                      <button onClick={() => setEvaluationResult(null)} className="p-2 hover:bg-white/10 transition-colors">
                          <XIcon className="w-6 h-6" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className="space-y-8">
                          <section>
                              <h4 className="text-xs font-bold text-ch-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <SparklesIcon className="w-4 h-4 text-ch-violet" />
                                  {evaluationResult.tests ? 'Verdict' : 'AI Feedback'}
                              </h4>
                              <div className="bg-ch-surface p-5 border border-ch-divider text-ch-text leading-relaxed">
                                  <FormattedMessage text={evaluationResult.feedback} isUser={false} />
                              </div>
                          </section>

                          {evaluationResult.tests && (
                              <section>
                                  <ChallengeTestResults report={evaluationResult.tests} />
                              </section>
                          )}

                          {evaluationResult.weaknesses && !evaluationResult.tests && (
                              <section>
                                  <h4 className="text-xs font-bold text-ch-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                      {evaluationResult.passed ? (
                                          <PlayIcon className="w-4 h-4 text-emerald-500 rotate-90" />
                                      ) : (
                                          <XCircleIcon className="w-4 h-4 text-orange-500" />
                                      )}
                                      {evaluationResult.passed ? 'Technical Highlights' : 'Missing Requirements'}
                                  </h4>
                                  <div className={`p-5 border leading-relaxed ${evaluationResult.passed ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-900/20 text-emerald-900/80 dark:text-emerald-100/80' : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100/50 dark:border-orange-900/20 text-ch-text'}`}>
                                      <FormattedMessage text={evaluationResult.weaknesses} isUser={false} />
                                  </div>
                              </section>
                          )}

                          <section>
                              <h4 className="text-xs font-bold text-ch-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <LightBulbIcon className="w-4 h-4 text-yellow-500" />
                                  Recommended Improvements
                              </h4>
                              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 border border-blue-100/50 dark:border-blue-900/20 text-ch-text leading-relaxed">
                                  <FormattedMessage text={evaluationResult.improvements} isUser={false} />
                              </div>
                          </section>

                          <section className="pt-4 border-t border-ch-divider">
                              <h4 className="text-xs font-bold text-ch-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <TrophyIcon className={`w-4 h-4 ${evaluationResult.passed ? 'text-yellow-500' : 'text-ch-muted'}`} />
                                  Badge Status
                              </h4>
                              <div className={`p-5 border flex items-center gap-4 ${evaluationResult.passed ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20' : 'bg-ch-surface border-ch-divider'}`}>
                                  <div className={`p-3 ${evaluationResult.passed ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'bg-ch-surface-2 text-ch-muted'}`}>
                                      <TrophyIcon className="w-8 h-8" />
                                  </div>
                                  <div>
                                      <p className="font-bold text-ch-text">
                                          {evaluationResult.passed ? 'Badge Earned!' : 'Badge Locked'}
                                      </p>
                                      <p className="text-sm text-ch-muted">
                                          {evaluationResult.passed 
                                              ? `Congratulations! You've successfully unlocked the ${pendingChallenge?.title} badge.` 
                                              : 'Correct the issues mentioned below and try again to earn your badge!'}
                                      </p>
                                  </div>
                              </div>
                          </section>
                      </div>
                  </div>

                  <div className="p-6 bg-ch-surface border-t border-ch-divider flex justify-end gap-3">
                      {!evaluationResult.passed && (
                          <button 
                            onClick={() => setEvaluationResult(null)}
                            className="px-6 py-2.5 text-sm font-bold text-ch-muted hover:bg-ch-surface-2 transition-all"
                          >
                            Try Again
                          </button>
                      )}
                      <button 
                        onClick={() => {
                            if (evaluationResult.passed) setPendingChallenge(null);
                            setEvaluationResult(null);
                        }}
                        className={`px-8 py-2.5 text-sm font-bold transition-all ${evaluationResult.passed ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-ch-text text-ch-bg hover:opacity-90'}`}
                      >
                        {evaluationResult.passed ? 'Claim Badge & Finish' : 'Got it'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CodePlayground;






