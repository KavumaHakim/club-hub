import React, { useEffect, useState } from 'react';
import { generatePythonTip, PythonTip } from '../services/geminiService';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { XIcon } from './icons/XIcon';
import { CodeIcon } from './icons/CodeIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface PythonTipModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PythonTipModal: React.FC<PythonTipModalProps> = ({ isOpen, onClose }) => {
    const [tip, setTip] = useState<PythonTip | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen && !tip) {
            setLoading(true);
            generatePythonTip()
                .then(data => {
                    setTip(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopy = () => {
        if (tip?.codeSnippet) {
            navigator.clipboard.writeText(tip.codeSnippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative border border-gray-200 dark:border-gray-700 flex flex-col">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 flex justify-between items-start text-white">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                <LightBulbIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">Daily Knowledge</span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                            Python Tip 🐍
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
                <div className="p-6 bg-white dark:bg-gray-800">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-t-yellow-500"></div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Consulting the Python Oracles...</p>
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
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={handleCopy}
                                        className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md shadow-sm transition-colors flex items-center gap-1 text-xs font-medium"
                                    >
                                        {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-gray-300 border border-gray-700 shadow-inner overflow-x-auto custom-scrollbar">
                                    <pre className="whitespace-pre-wrap">{tip.codeSnippet}</pre>
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
                        className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PythonTipModal;