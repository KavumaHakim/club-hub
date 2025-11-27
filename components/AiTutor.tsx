
import React, { useState, useRef, useEffect } from 'react';
import { RobotIcon } from './icons/RobotIcon';
import { XIcon } from './icons/XIcon';
import { SendIcon } from './icons/SendIcon';
import * as geminiService from '../services/geminiService';
import { User } from '../types';
import { FormattedMessage } from './FormattedMessage';

interface AiTutorProps {
    currentUser: User;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

const AiTutor: React.FC<AiTutorProps> = ({ currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: `Hi ${currentUser.name.split(' ')[0]}! I'm your AI Tutor. I can help you learn coding concepts or debug issues, but I won't write the code for you! What are you working on?` }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isLoading) return;

        const userMessage = inputText.trim();
        setInputText('');
        
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            // Convert internal message format to Gemini history format
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const responseText = await geminiService.getAiTutorResponse(history, userMessage);
            
            if (responseText) {
                setMessages(prev => [...prev, { role: 'model', text: responseText }]);
            }
        } catch (error) {
            console.error("Tutor chat error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right h-[500px] max-h-[80vh]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-full">
                                <RobotIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">AI Tutor</h3>
                                <p className="text-[10px] text-teal-100 opacity-90">Here to help, not to do.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div 
                                    className={`max-w-[90%] p-3 rounded-2xl shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-teal-600 text-white rounded-tr-none' 
                                        : 'bg-white dark:bg-gray-800 rounded-tl-none border border-gray-100 dark:border-gray-700'
                                    }`}
                                >
                                    <FormattedMessage text={msg.text} isUser={msg.role === 'user'} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700">
                                    <div className="flex space-x-1.5">
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={!inputText.trim() || isLoading}
                            className="p-2 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            <SendIcon className="w-4 h-4 transform rotate-90" />
                        </button>
                    </form>
                </div>
            )}

            {/* FAB Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center ${
                    isOpen 
                    ? 'bg-gray-700 text-white rotate-90' 
                    : 'bg-teal-500 hover:bg-teal-600 text-white animate-bounce-subtle'
                }`}
                aria-label="Toggle AI Tutor"
            >
                {isOpen ? <XIcon className="w-6 h-6" /> : <RobotIcon className="w-8 h-8" />}
            </button>
        </div>
    );
};

export default AiTutor;
