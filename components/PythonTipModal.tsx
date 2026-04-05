
import React, { useEffect, useState } from 'react';
import { generateCodingTip, CodingTip } from '../services/geminiService';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { XIcon } from './icons/XIcon';
import { CodeIcon } from './icons/CodeIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface DailyTipModalProps {
    isOpen: boolean;
    onClose: () => void;
    skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    preferredLanguage?: 'python' | 'javascript';
}

// Regex for Python/JavaScript Syntax Highlighting
const SYNTAX_REGEX = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\/\/.*$|\/\*[\s\S]*?\*\/|\b\d+(?:\.\d+)?\b|\b(?:True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print|try|except|finally|with|as|in|is|lambda|pass|raise|global|nonlocal|assert|del|break|continue|yield|async|await|const|let|var|function|export|default|extends|super|this|new|typeof|instanceof|void|delete|of|switch|case|throw|debugger)\b|[\[\]\{\}\(\),:])/gm;

const SyntaxHighlightedText: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(SYNTAX_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                // Comments
                if (part.startsWith('#') || part.startsWith('//') || part.startsWith('/*')) return <span key={i} className="text-gray-500 italic">{part}</span>;
                // Strings
                if (part.startsWith('"') || part.startsWith("'")) return <span key={i} className="text-green-400">{part}</span>;
                // Numbers
                if (/^\d+(\.\d+)?$/.test(part)) return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
                // Keywords (Python & JS merged)
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print|try|except|finally|with|as|in|is|lambda|pass|raise|global|nonlocal|assert|del|break|continue|yield|async|await|const|let|var|function|export|default|extends|super|this|new|typeof|instanceof|void|delete|of|switch|case|throw|debugger)$/.test(part)) return <span key={i} className="text-purple-400 font-bold">{part}</span>;
                // Punctuation
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-yellow-500">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const DailyTipModal: React.FC<DailyTipModalProps> = ({ isOpen, onClose, skillLevel = 'BEGINNER', preferredLanguage = 'python' }) => {
    const [tip, setTip] = useState<CodingTip | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen && (!tip || tip.language !== preferredLanguage)) {
            setLoading(true);
            
            generateCodingTip(preferredLanguage, skillLevel)
                .then(data => {
                    setTip(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [isOpen, preferredLanguage, skillLevel, tip]);

    if (!isOpen) return null;

    const handleCopy = () => {
        if (tip?.codeSnippet) {
            navigator.clipboard.writeText(tip.codeSnippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isPython = tip?.language === 'python';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden relative border border-gray-200 dark:border-gray-700 flex flex-col">
                
                {/* Dynamic Header */}
                <div className={`p-6 flex justify-between items-start text-white transition-colors duration-500 shadow-lg ${
                    isPython 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                    : 'bg-gradient-to-r from-yellow-400 to-amber-500'
                }`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                <LightBulbIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">Daily Knowledge</span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                            {isPython ? 'Python Tip 🐍' : 'JavaScript Tip ⚡'}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-white dark:bg-gray-800 flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className={`animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 ${
                                isPython ? 'border-t-blue-500' : 'border-t-yellow-500'
                            }`}></div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                                Fetching your {isPython ? 'Python' : 'JavaScript'} wisdom...
                            </p>
                        </div>
                    ) : tip ? (
                        <div className="space-y-4 animate-fade-in-up">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tip.title}</h3>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                                    {tip.explanation}
                                </p>
                            </div>

                            <div className="relative group">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button 
                                        onClick={handleCopy}
                                        className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md shadow-sm transition-colors flex items-center gap-1 text-xs font-medium"
                                    >
                                        {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <div className="bg-[#1e1e1e] rounded-xl p-4 font-mono text-sm text-[#d4d4d4] border border-gray-700 shadow-inner overflow-x-auto custom-scrollbar relative">
                                    <pre className="whitespace-pre-wrap"><SyntaxHighlightedText text={tip.codeSnippet} /></pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Failed to load tip. Please try again later.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className={`px-6 py-2.5 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all ${
                            isPython ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyTipModal;
