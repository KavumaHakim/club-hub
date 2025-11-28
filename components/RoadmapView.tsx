
import React, { useState, useEffect, useMemo } from 'react';
import { User, Roadmap, Milestone } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { generateLearningRoadmap, generateMilestoneQuiz, QuizQuestion } from '../services/geminiService';
import { MapIcon } from './icons/MapIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { CodeIcon } from './icons/CodeIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import ConfirmationModal from './ConfirmationModal';
import RoadmapQuizModal from './RoadmapQuizModal';

interface RoadmapViewProps {
    currentUser: User;
}

const ResourceTypeIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'VIDEO': return <VideoCameraIcon className="w-4 h-4" />;
        case 'ARTICLE': return <BookOpenIcon className="w-4 h-4" />;
        case 'PRACTICE': return <CodeIcon className="w-4 h-4" />;
        default: return <MapIcon className="w-4 h-4" />;
    }
};

const CreateRoadmapModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (roadmap: Roadmap) => Promise<void>;
    initialLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}> = ({ isOpen, onClose, onSave, initialLevel = 'BEGINNER' }) => {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(initialLevel);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMilestones, setGeneratedMilestones] = useState<Milestone[] | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLevel(initialLevel);
            setTopic('');
            setGeneratedMilestones(null);
        }
    }, [isOpen, initialLevel]);

    const handleGenerate = async () => {
        if (!topic) return;
        setIsGenerating(true);
        try {
            const milestones = await generateLearningRoadmap(topic, level);
            // Add IDs to milestones for React keys
            const milestonesWithIds = milestones.map((m: any, idx: number) => ({
                ...m,
                id: `ms-${Date.now()}-${idx}`
            }));
            setGeneratedMilestones(milestonesWithIds);
        } catch (error) {
            console.error(error);
            alert("Failed to generate roadmap. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirmSave = async () => {
        if (!generatedMilestones) return;
        await onSave({
            skillLevel: level,
            topic: topic,
            milestones: generatedMilestones
        });
        onClose();
        setTopic('');
        setGeneratedMilestones(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create AI Roadmap</h3>
                
                {!generatedMilestones ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                            <input 
                                type="text" 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500"
                                placeholder="e.g., Python Data Structures, Web Development Basics"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Skill Level</label>
                            <select 
                                value={level} 
                                onChange={e => setLevel(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500"
                            >
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced</option>
                            </select>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !topic}
                            className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating Plan...' : 'Generate with AI'}
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                            <h4 className="font-bold text-purple-800 dark:text-purple-300">{topic} ({level})</h4>
                            <p className="text-sm text-purple-600 dark:text-purple-400">Generated {generatedMilestones.length} milestones</p>
                        </div>
                        <div className="space-y-4">
                            {generatedMilestones.map((ms, idx) => (
                                <div key={ms.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-750">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-gray-800 dark:text-gray-200">Step {idx + 1}: {ms.title}</h5>
                                        <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{ms.duration}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{ms.description}</p>
                                    <div className="space-y-1">
                                        {ms.resources.map((res, rIdx) => (
                                            <div key={rIdx} className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                                                <ResourceTypeIcon type={res.type} />
                                                <span className="truncate">{res.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button 
                                onClick={() => setGeneratedMilestones(null)}
                                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleConfirmSave}
                                className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                            >
                                Publish Roadmap
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface MilestoneCardProps {
    milestone: Milestone;
    index: number;
    isLast: boolean;
    isLocked: boolean;
    isCompleted: boolean;
    onTakeQuiz: () => void;
    isPatron: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({ milestone, index, isLast, isLocked, isCompleted, onTakeQuiz, isPatron }) => {
    const [isExpanded, setIsExpanded] = useState(!isLocked);

    return (
        <div className={`relative pl-8 sm:pl-10 pb-8 ${isLocked ? 'opacity-60 grayscale' : ''}`}>
            {/* Connecting Line */}
            {!isLast && (
                <div className={`absolute left-[11px] sm:left-[15px] top-8 bottom-0 w-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
            )}
            
            {/* Node */}
            <div 
                className={`absolute left-0 top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all z-10 
                ${isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isLocked 
                        ? 'bg-gray-300 border-gray-300 dark:bg-gray-700 dark:border-gray-700 text-gray-500'
                        : 'bg-pink-500 border-white dark:border-gray-900 text-white shadow-lg shadow-pink-500/30'
                }`}
                onClick={() => !isLocked && setIsExpanded(!isExpanded)}
            >
                {isCompleted ? <CheckCircleIcon className="w-4 h-4" /> : isLocked ? <LockClosedIcon className="w-3 h-3" /> : <span className="text-[10px] sm:text-xs font-bold">{index + 1}</span>}
            </div>

            {/* Content */}
            <div 
                className={`bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 overflow-hidden 
                ${!isLocked && isExpanded ? 'border-pink-500 shadow-md ring-1 ring-pink-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
                <div 
                    className={`p-4 cursor-pointer flex justify-between items-center ${isLocked ? 'cursor-not-allowed' : ''}`}
                    onClick={() => !isLocked && setIsExpanded(!isExpanded)}
                >
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                            {milestone.title}
                            {isLocked && <span className="text-xs font-normal bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500">Locked</span>}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{milestone.duration}</p>
                    </div>
                    <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>

                {/* Expanded Details */}
                <div className={`transition-all duration-300 ease-in-out ${!isLocked && isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{milestone.description}</p>
                        
                        <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recommended Resources</h5>
                        <div className="space-y-2 mb-4">
                            {milestone.resources.map((res, idx) => (
                                <a 
                                    key={idx} 
                                    href={res.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
                                        <ResourceTypeIcon type={res.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{res.title}</p>
                                        <p className="text-xs text-gray-400 capitalize">{res.type.toLowerCase()}</p>
                                    </div>
                                </a>
                            ))}
                        </div>

                        {/* Action Button for Student */}
                        {!isPatron && !isCompleted && (
                            <button 
                                onClick={onTakeQuiz}
                                className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 animate-pulse-slow"
                            >
                                <CheckCircleIcon className="w-4 h-4" /> Assessment Quiz
                            </button>
                        )}
                        {isCompleted && (
                            <div className="flex items-center justify-center gap-2 py-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg font-bold text-sm">
                                <CheckCircleIcon className="w-4 h-4" /> Learned
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const RoadmapView: React.FC<RoadmapViewProps> = ({ currentUser }) => {
    const { roadmaps, isLoadingRoadmaps, roadmapsError, fetchRoadmaps, showToast, updateUserSkillLevel } = useData();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    // Patron View State
    const [activePatronTab, setActivePatronTab] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');

    // Quiz State
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState<number | null>(null);
    const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

    // Progress State (Map roadmapId -> array of completed indices)
    const [progress, setProgress] = useState<Record<string, number[]>>({});

    const isPatron = currentUser.role === 'PATRON';

    // Filter logic: Patrons see based on tab, Students see only their level
    const visibleRoadmaps = useMemo(() => {
        if (isPatron) {
            return roadmaps.filter(r => r.skillLevel === activePatronTab);
        }
        return roadmaps.filter(r => r.skillLevel === currentUser.skillLevel);
    }, [roadmaps, isPatron, activePatronTab, currentUser.skillLevel]);

    useEffect(() => {
        if (!isPatron && visibleRoadmaps.length > 0) {
            const loadProgress = async () => {
                const newProgress: Record<string, number[]> = {};
                for (const r of visibleRoadmaps) {
                    if (r.id) {
                        const p = await api.getUserRoadmapProgress(currentUser.uid, r.id);
                        if (p) {
                            newProgress[r.id] = p.completedMilestoneIndices;
                        } else {
                            newProgress[r.id] = [];
                        }
                    }
                }
                setProgress(newProgress);
            };
            loadProgress();
        }
    }, [visibleRoadmaps, isPatron, currentUser.uid]);

    const handleCreate = async (roadmap: Roadmap) => {
        try {
            await api.addRoadmap(roadmap);
            await fetchRoadmaps();
            showToast("Roadmap published successfully!", "success");
        } catch (error: any) {
            console.error(error);
            showToast("Failed to publish roadmap.", "error");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteRoadmap(deleteId);
            await fetchRoadmaps();
            showToast("Roadmap deleted.", "info");
        } catch (error) {
            console.error(error);
            showToast("Failed to delete roadmap.", "error");
        } finally {
            setDeleteId(null);
        }
    };

    const handleTakeQuiz = async (roadmapId: string, milestoneIndex: number, milestone: Milestone) => {
        setIsGeneratingQuiz(true);
        try {
            const questions = await generateMilestoneQuiz(milestone.title, milestone.description);
            setQuizQuestions(questions);
            setActiveRoadmapId(roadmapId);
            setActiveMilestoneIndex(milestoneIndex);
            setQuizModalOpen(true);
        } catch (error) {
            console.error("Quiz Gen Error:", error);
            showToast("Failed to generate quiz. Please try again.", "error");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    const handleQuizPass = async () => {
        if (activeRoadmapId && activeMilestoneIndex !== null) {
            try {
                await api.updateMilestoneProgress(currentUser.uid, activeRoadmapId, activeMilestoneIndex);
                
                // Update local state immediately
                setProgress(prev => ({
                    ...prev,
                    [activeRoadmapId]: [...(prev[activeRoadmapId] || []), activeMilestoneIndex]
                }));

                showToast("Milestone completed!", "success");

                // Check for promotion
                const roadmap = roadmaps.find(r => r.id === activeRoadmapId);
                if (roadmap) {
                    const completedCount = (progress[activeRoadmapId]?.length || 0) + 1; // +1 for current
                    if (completedCount === roadmap.milestones.length) {
                        // Level Up Logic
                        const nextLevel = 
                            roadmap.skillLevel === 'BEGINNER' ? 'INTERMEDIATE' : 
                            roadmap.skillLevel === 'INTERMEDIATE' ? 'ADVANCED' : null;
                        
                        if (nextLevel) {
                            await updateUserSkillLevel(nextLevel);
                        } else {
                            showToast("You have mastered the Advanced level! Amazing work!", "success");
                        }
                    }
                }

            } catch (error) {
                console.error("Progress Update Error:", error);
                showToast("Failed to save progress.", "error");
            }
        }
    };

    if (isLoadingRoadmaps) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                <p>Loading your journey...</p>
            </div>
        );
    }

    if (roadmapsError) {
        return <div className="text-center p-8 text-red-500">Error loading roadmaps: {roadmapsError}</div>;
    }

    return (
        <div className="max-w-5xl mx-auto relative">
            {isGeneratingQuiz && (
                <div className="fixed inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500 mb-3"></div>
                        <p className="font-bold text-gray-800 dark:text-white">Generating Assessment...</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                        Learning Roadmap
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        {isPatron 
                            ? "Design curriculum paths for different skill levels." 
                            : `Your personalized path to mastering ${currentUser.skillLevel?.toLowerCase()} skills.`}
                    </p>
                </div>
                {isPatron && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <PlusCircleIcon /> New Roadmap
                    </button>
                )}
            </div>

            {isPatron && (
                <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-1 mb-8">
                    {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((level) => (
                        <button
                            key={level}
                            onClick={() => setActivePatronTab(level)}
                            className={`pb-3 px-4 sm:px-6 text-sm sm:text-base font-medium transition-colors relative focus:outline-none ${
                                activePatronTab === level 
                                ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {level.charAt(0) + level.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            )}

            {visibleRoadmaps.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <MapIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Roadmaps Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        {isPatron 
                            ? `No ${activePatronTab.toLowerCase()} roadmaps found. Use the AI generator to create one!` 
                            : "Your patrons haven't published a roadmap for your skill level yet. Check back soon!"}
                    </p>
                </div>
            ) : (
                <div className="grid gap-12">
                    {visibleRoadmaps.map(roadmap => {
                        const userCompletedIndices = progress[roadmap.id!] || [];
                        
                        return (
                            <div key={roadmap.id} className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                                            {roadmap.topic}
                                            {isPatron && (
                                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wide border ${
                                                    roadmap.skillLevel === 'BEGINNER' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                                                    roadmap.skillLevel === 'INTERMEDIATE' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                                                    'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                                }`}>
                                                    {roadmap.skillLevel}
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {roadmap.milestones.length} Milestones • {userCompletedIndices.length} Completed
                                        </p>
                                    </div>
                                    {isPatron && (
                                        <button 
                                            onClick={() => setDeleteId(roadmap.id!)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete Roadmap"
                                        >
                                            <TrashIcon />
                                        </button>
                                    )}
                                </div>

                                <div className="relative">
                                    {roadmap.milestones.map((ms, idx) => {
                                        const isCompleted = userCompletedIndices.includes(idx);
                                        // A milestone is locked if the previous one isn't completed (unless it's the first one)
                                        const isLocked = idx > 0 && !userCompletedIndices.includes(idx - 1) && !isPatron;
                                        
                                        return (
                                            <MilestoneCard 
                                                key={idx} 
                                                milestone={ms} 
                                                index={idx} 
                                                isLast={idx === roadmap.milestones.length - 1} 
                                                isLocked={isLocked}
                                                isCompleted={isCompleted}
                                                isPatron={isPatron}
                                                onTakeQuiz={() => handleTakeQuiz(roadmap.id!, idx, ms)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <CreateRoadmapModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSave={handleCreate}
                initialLevel={activePatronTab}
            />

            <ConfirmationModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Delete Roadmap"
                message="Are you sure? This will remove the learning path for all students."
                confirmText="Delete"
                isDangerous
            />

            <RoadmapQuizModal 
                isOpen={quizModalOpen}
                onClose={() => setQuizModalOpen(false)}
                quizQuestions={quizQuestions}
                onPass={handleQuizPass}
            />
        </div>
    );
};

export default RoadmapView;
