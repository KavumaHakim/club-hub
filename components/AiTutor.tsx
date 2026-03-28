
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RobotIcon } from './icons/RobotIcon';
import { XIcon } from './icons/XIcon';
import { SendIcon } from './icons/SendIcon';
import * as geminiService from '../services/geminiService';
import { User } from '../types';
import { FormattedMessage } from './FormattedMessage';
import { useData } from '../DataContext';

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
        { role: 'model', text: `Hi ${currentUser.name.split(' ')[0]}! I'm your AI Tutor. I can help you learn coding concepts or debug issues, but I won't write the code for you! I also know what's happening in the club. What are you working on?` }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Dragging State
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const dragStartOffset = useRef({ x: 0, y: 0 });

    // Get real-time club data
    const { 
        activities, 
        challenges, 
        feedItems, 
        resources, 
        allUsers,
        showcaseItems,
        suggestions,
        teams,
        teamChallenges,
        projectData
    } = useData();

    // Memoize the context string so it updates when data changes
    const clubContext = useMemo(() => {
        const safeList = (items: string[], limit: number) => items.slice(0, limit).join('\n');

        const leadership = allUsers
            .filter(u => u.role === 'PATRON')
            .map(u => `${u.name} (@${u.username || 'member'})`);

        const membersSummary = {
            total: allUsers.length,
            patrons: allUsers.filter(u => u.role === 'PATRON').length,
            members: allUsers.filter(u => u.role === 'MEMBER').length
        };

        const upcomingActivities = activities
            .filter(a => new Date(a.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(a => `- ${a.title} on ${a.date} at ${a.location} (${a.category})`);

        const activeChallenges = challenges
            .filter(c => c.status === 'ACTIVE')
            .map(c => `- ${c.title} (Due: ${c.deadline}): ${c.description}`);

        const activeTeamChallenges = teamChallenges
            .slice(0, 5)
            .map(ch => `- ${ch.title} (Team: ${teams.find(t => t.id === ch.teamId)?.name || 'Team'})`);

        const latestAnnouncements = feedItems
            .slice(0, 3)
            .map(f => `- ${f.title || 'Post'}: ${f.message} (by ${f.author})`);

        const resourceHighlights = resources
            .slice(0, 6)
            .map(r => `- ${r.title} [${r.type}] (${r.category})`);

        const resourceLinks = resources
            .filter(r => r.type === 'LINK' || r.type === 'VIDEO')
            .slice(0, 5)
            .map(r => `- ${r.title}: ${r.url}`);

        const showcaseHighlights = showcaseItems
            .slice(0, 5)
            .map(item => `- ${item.title} by ${item.userName}`);

        const recognitionBoard = allUsers
            .filter(user => user.status === 'APPROVED')
            .map(user => {
                const showcaseScore = showcaseItems.filter(item => item.userUid === user.uid).length;
                const suggestionScore = suggestions.filter(item => item.userId === user.uid).length;
                const badges = user.badges?.length || 0;
                const score = showcaseScore * 3 + suggestionScore + badges * 2;
                return { user, score, showcaseScore, suggestionScore, badges };
            })
            .filter(entry => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(entry => `- ${entry.user.name}: ${entry.score} pts (Showcases ${entry.showcaseScore}, Ideas ${entry.suggestionScore}, Badges ${entry.badges})`);

        const projectSnapshot = projectData ? (() => {
            const totalTasks = Object.keys(projectData.tasks || {}).length;
            const columns = (projectData.columnOrder || []).map(colId => {
                const col = projectData.columns?.[colId];
                if (!col) return null;
                return `${col.title}: ${col.taskIds.length}`;
            }).filter(Boolean) as string[];
            return { totalTasks, columns };
        })() : null;

        const playgroundLang = localStorage.getItem('playground_lang') || 'python';
        const playgroundCode = localStorage.getItem(`playground_code_${playgroundLang}`) || '';
        const playgroundSnippet = playgroundCode.trim() ? playgroundCode.trim().slice(0, 600) : '';

        return `
        LEADERSHIP:
        ${leadership.length ? safeList(leadership, 5) : 'None listed.'}

        MEMBERS:
        Total ${membersSummary.total} (Patrons ${membersSummary.patrons}, Members ${membersSummary.members})

        ONGOING PROJECTS:
        ${projectSnapshot ? `Total tasks: ${projectSnapshot.totalTasks}\n${safeList(projectSnapshot.columns, 5)}` : 'No project board data.'}

        UPCOMING EVENTS:
        ${upcomingActivities.length ? safeList(upcomingActivities, 5) : 'None scheduled.'}

        ACTIVE CHALLENGES:
        ${activeChallenges.length ? safeList(activeChallenges, 5) : 'None active.'}

        TEAM CHALLENGES:
        ${activeTeamChallenges.length ? safeList(activeTeamChallenges, 5) : 'None active.'}

        LATEST ANNOUNCEMENTS:
        ${latestAnnouncements.length ? safeList(latestAnnouncements, 3) : 'None.'}

        RESOURCE HIGHLIGHTS:
        ${resourceHighlights.length ? safeList(resourceHighlights, 6) : 'No resources.'}

        RESOURCE LINKS:
        ${resourceLinks.length ? safeList(resourceLinks, 5) : 'No links.'}

        SHOWCASE HIGHLIGHTS:
        ${showcaseHighlights.length ? safeList(showcaseHighlights, 5) : 'No showcases.'}

        COMMUNITY LEADERBOARD:
        ${recognitionBoard.length ? safeList(recognitionBoard, 5) : 'No leaderboard data yet.'}

        CURRENT PLAYGROUND CODE (${playgroundLang}):
        ${playgroundSnippet || 'No current code.'}
        `;
    }, [activities, challenges, feedItems, resources, allUsers, showcaseItems, suggestions, teams, teamChallenges, projectData]);

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

            const responseText = await geminiService.getAiTutorResponse(history, userMessage, clubContext);
            
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

    // --- Drag Handlers ---

    const handlePointerDown = (e: React.PointerEvent) => {
        // Prevent default browser dragging of images/buttons
        // e.preventDefault(); 
        isDragging.current = false;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        dragStartOffset.current = { ...offset };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (e: PointerEvent) => {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;

        // If moved more than 5 pixels, consider it a drag
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            isDragging.current = true;
        }

        if (isDragging.current) {
            setOffset({
                x: dragStartOffset.current.x + deltaX,
                y: dragStartOffset.current.y + deltaY
            });
        }
    };

    const handlePointerUp = () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);

        if (!isDragging.current) {
            // If it wasn't a drag, toggle the chat
            setIsOpen(prev => !prev);
        }
        // Reset drag flag for next interaction
        isDragging.current = false;
    };

    return (
        <div 
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end touch-none"
            style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                transition: isDragging.current ? 'none' : 'transform 0.1s ease-out' 
            }}
        >
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right h-[500px] max-h-[80vh]">
                    {/* Header */}
                    <div 
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 flex justify-between items-center text-white cursor-move"
                        // Allow dragging from the header too if needed, but let's keep it simple for now or bind same handlers
                    >
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
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
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

            {/* FAB Toggle Button (Draggable) */}
            <button
                onPointerDown={handlePointerDown}
                className={`p-4 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-move touch-none select-none ${
                    isOpen 
                    ? 'bg-gray-700 text-white rotate-90' 
                    : 'bg-teal-500 hover:bg-teal-600 text-white animate-bounce-subtle'
                }`}
                style={{ touchAction: 'none' }} // Critical for preventing scroll on mobile while dragging
                aria-label="Toggle AI Tutor"
            >
                {isOpen ? <XIcon className="w-6 h-6" /> : <RobotIcon className="w-8 h-8" />}
            </button>
        </div>
    );
};

export default AiTutor;
