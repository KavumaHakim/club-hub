
import React, { useState } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CodeIcon } from './icons/CodeIcon';

// Syntax Highlighting Regex (Python-focused)
const SYNTAX_REGEX = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\b\d+(?:\.\d+)?\b|\b(?:True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print|try|except|finally|with|as|in|is|lambda|pass|raise|global|nonlocal|assert|del|break|continue|yield|async|await)\b|[\[\]\{\}\(\),:])/gm;

const SyntaxHighlightedText: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(SYNTAX_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                if (part.startsWith('#')) return <span key={i} className="text-gray-500 italic">{part}</span>;
                if (part.startsWith('"') || part.startsWith("'")) return <span key={i} className="text-green-400">{part}</span>;
                if (/^\d+(\.\d+)?$/.test(part)) return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print|try|except|finally|with|as|in|is|lambda|pass|raise|global|nonlocal|assert|del|break|continue|yield|async|await)$/.test(part)) return <span key={i} className="text-purple-400 font-bold">{part}</span>;
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-yellow-500">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const CodeBlock: React.FC<{ code: string, language?: string }> = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 rounded-lg overflow-hidden bg-[#1e1e1e] border border-gray-700 shadow-lg w-full text-left">
            <div className="flex justify-between items-center px-3 py-1.5 bg-[#252526] border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <CodeIcon className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
                        {language || 'CODE'}
                    </span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
                    title="Copy Code"
                >
                    {copied ? <CheckIcon className="h-3 w-3 text-green-400" /> : <CopyIcon className="h-3 w-3" />}
                </button>
            </div>
            <div className="p-3 overflow-x-auto custom-scrollbar">
                <pre className="text-xs font-mono text-[#d4d4d4] whitespace-pre leading-relaxed">
                    <SyntaxHighlightedText text={code.trim()} />
                </pre>
            </div>
        </div>
    );
};

const formatInline = (text: string, isUser: boolean) => {
    // Split by bold (**text**)
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className={`font-bold ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{part.slice(2, -2)}</strong>;
        }
        
        // Split by inline code (`text`)
        const codeParts = part.split(/(`.*?`)/g);
        return codeParts.map((subPart, j) => {
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
                return (
                    <code 
                        key={`${i}-${j}`} 
                        className={`px-1 py-0.5 rounded font-mono text-xs ${
                            isUser 
                            ? 'bg-teal-700 text-teal-100' 
                            : 'bg-gray-200 dark:bg-gray-700 text-pink-600 dark:text-pink-300'
                        }`}
                    >
                        {subPart.slice(1, -1)}
                    </code>
                );
            }
            return subPart;
        });
    });
};

const splitTableRow = (line: string) => {
    const raw = line.trim();
    const trimmed = raw.startsWith('|') ? raw.slice(1) : raw;
    const normalized = trimmed.endsWith('|') ? trimmed.slice(0, -1) : trimmed;
    return normalized.split('|').map(cell => cell.trim());
};

const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
const isTableRow = (line: string) => line.includes('|');

const renderTable = (header: string[], rows: string[][], isUser: boolean, key: number) => {
    const headBg = isUser ? 'bg-teal-700/30 text-teal-50' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
    const cellBorder = isUser ? 'border-teal-400/30' : 'border-gray-200 dark:border-gray-600';

    return (
        <div key={key} className="my-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
                <thead className={headBg}>
                    <tr>
                        {header.map((cell, idx) => (
                            <th key={idx} className={`text-left px-2 py-1 font-semibold border ${cellBorder}`}>
                                {formatInline(cell, isUser)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? '' : (isUser ? 'bg-teal-700/10' : 'bg-gray-50 dark:bg-gray-800/40')}>
                            {row.map((cell, cIdx) => (
                                <td key={cIdx} className={`px-2 py-1 align-top border ${cellBorder}`}>
                                    {formatInline(cell, isUser)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const renderTextPart = (content: string, isUser: boolean) => {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        const next = lines[i + 1];

        if (isTableRow(line) && next && isTableSeparator(next)) {
            const header = splitTableRow(line);
            i += 2;
            const rows: string[][] = [];
            while (i < lines.length && isTableRow(lines[i]) && lines[i].trim()) {
                rows.push(splitTableRow(lines[i]));
                i += 1;
            }
            nodes.push(renderTable(header, rows, isUser, i));
            continue;
        }

        // Unordered List
        if (trimmed.match(/^[-*]\s/)) {
            nodes.push(
                <div key={i} className="flex gap-2 ml-1 mb-1">
                    <span className={`text-xs mt-1.5 ${isUser ? 'text-teal-200' : 'text-pink-500'}`}>●</span>
                    <span className="flex-1">{formatInline(trimmed.substring(2), isUser)}</span>
                </div>
            );
            i += 1;
            continue;
        }
        
        // Ordered List
        const orderedMatch = trimmed.match(/^(\d+)\.\s/);
        if (orderedMatch) {
            nodes.push(
                <div key={i} className="flex gap-2 ml-1 mb-1">
                    <span className={`font-bold text-xs mt-0.5 ${isUser ? 'text-teal-200' : 'text-pink-500'}`}>{orderedMatch[1]}.</span>
                    <span className="flex-1">{formatInline(trimmed.substring(orderedMatch[0].length), isUser)}</span>
                </div>
            );
            i += 1;
            continue;
        }
        
        // Headings
        if (trimmed.startsWith('### ')) {
            nodes.push(<h4 key={i} className="font-bold text-base mt-3 mb-1 block">{formatInline(trimmed.substring(4), isUser)}</h4>);
            i += 1;
            continue;
        }
        if (trimmed.startsWith('## ')) {
            nodes.push(<h3 key={i} className="font-bold text-lg mt-4 mb-2 block border-b border-gray-200 dark:border-gray-700 pb-1">{formatInline(trimmed.substring(3), isUser)}</h3>);
            i += 1;
            continue;
        }
        if (trimmed.startsWith('# ')) {
            nodes.push(<h2 key={i} className="font-extrabold text-xl mt-4 mb-2 block">{formatInline(trimmed.substring(2), isUser)}</h2>);
            i += 1;
            continue;
        }

        // Empty lines
        if (!trimmed) {
            nodes.push(<div key={i} className="h-2" />);
            i += 1;
            continue;
        }

        nodes.push(<div key={i} className="min-h-[1.25rem]">{formatInline(line, isUser)}</div>);
        i += 1;
    }

    return nodes;
};

export const FormattedMessage: React.FC<{ text: string, isUser: boolean }> = ({ text, isUser }) => {
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'code', language: match[1], content: match[2] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return (
        <div className={`space-y-1 text-sm leading-relaxed break-words ${isUser ? 'text-teal-50' : 'text-gray-700 dark:text-gray-200'}`}>
            {parts.map((part, index) => {
                if (part.type === 'code') {
                    return <CodeBlock key={index} code={part.content} language={part.language} />;
                }
                return (
                    <div key={index}>
                        {renderTextPart(part.content, isUser)}
                    </div>
                );
            })}
        </div>
    );
};
