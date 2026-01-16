import React, { useState, useEffect, useMemo } from 'react';
import { User, Roadmap, Milestone, RoadmapResource } from '../types';
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
import { PencilIcon } from './icons/PencilIcon';
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

// FIX: MilestoneCard was missing from the file. Added here.
const MilestoneCard: React.FC<{
    milestone: Milestone;
    index: number;
    isLast: boolean;
    isLocked: boolean;
    isCompleted: boolean;
    isPatron: boolean;
    onTakeQuiz: () => void;
}> = ({ milestone, index, isLast, isLocked, isCompleted, isPatron, onTakeQuiz }) => {
    return (
        <div className={`relative pl-8 pb-8 ${isLast ? '' : 'border-l-2 border-gray-200 dark:border-gray-700 ml-4'}`}>
            <div className={`absolute left-0 top-0 -ml-[9px] w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 z-10 transition-colors ${isCompleted ? 'bg-green-500' : isLocked ? 'bg-gray-300 dark:bg-gray-600' : 'bg-pink-500'}`}>
                {isCompleted && <div className="absolute inset-0 flex items-center justify-center text-white"><CheckCircleIcon className="w-2 h-2" /></div>}
            </div>
            
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all ${isLocked ? 'opacity-60 grayscale' : 'hover:shadow-md border-gray-200 dark:border-gray-700'}`}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{index + 1}. {milestone.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{milestone.duration}</p>
                    </div>
                    {isLocked ? <LockClosedIcon className="w-5 h-5 text-gray-400" /> : isCompleted ? <TrophyIcon className="w-5 h-5 text-yellow-500" /> : null}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{milestone.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {milestone.resources.map((res, i) => (
                        <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors">
                            <ResourceTypeIcon type={res.type} />
                            {res.title}
                        </a>
                    ))}
                </div>

                {!isPatron && !isCompleted && !isLocked && (
                    <button 
                        onClick={onTakeQuiz}
                        className="w-full py-2 bg-pink-600 text-white rounded-lg text-sm font-bold hover:bg-pink-700 transition-all flex items-center justify-center gap-2"
                    >
                        <SparklesIcon className="w-4 h-4" /> Start Assessment
                    </button>
                )}
            </div>
        </div>
    );
};

const CreateRoadmapModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (roadmap: Roadmap) => Promise<void>;
    initialLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}> = ({ isOpen, onClose, onSave, initialLevel = 'BEGINNER' }) => {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(initialLevel);
    const [language, setLanguage] = useState<'Python' | 'JavaScript'>('Python');
    const [suggestedTopics, setSuggestedTopics] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMilestones, setGeneratedMilestones] = useState<Milestone[] | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLevel(initialLevel);
            setTopic('');
            setLanguage('Python');
            setSuggestedTopics('');
            setGeneratedMilestones(null);
        }
    }, [isOpen, initialLevel]);

    const handleGenerate = async () => {
        if (!topic) return;
        setIsGenerating(true);
        try {
            const milestones = await generateLearningRoadmap(topic, level, language, suggestedTopics);
            const milestonesWithIds = milestones.map((m: any, idx: number) => ({
                ...m,
                id: `ms-${Date.now()}-${idx}`
            }));
            setGeneratedMilestones(milestonesWithIds);
        } catch (error) {
            console.error(error);
            alert("Failed to generate roadmap.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirmSave = async () => {
        if (!generatedMilestones) return;
        await onSave({
            skillLevel: level,
            topic: `${language}: ${topic}`,
            milestones: generatedMilestones
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><XIcon /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create AI Roadmap</h3>
                
                {!generatedMilestones ? (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                                <select 
                                    value={language} 
                                    onChange={e => setLanguage(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500"
                                >
                                    <option value="Python">Python</option>
                                    <option value="JavaScript">JavaScript</option>
                                </select>
                            </div>
                            <div className="flex-1">
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
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                            <input 
                                type="text" 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500"
                                placeholder={`e.g., ${language} basics, DOM manipulation, etc.`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Suggested Focus (Optional)</label>
                            <textarea
                                value={suggestedTopics}
                                onChange={e => setSuggestedTopics(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-pink-500"
                                rows={2}
                            />
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !topic}
                            className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {isGenerating ? 'Curating Content...' : 'Generate Roadmap'}
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 text-center">
                            <h4 className="font-bold text-purple-800 dark:text-purple-300">{language}: {topic}</h4>
                            <p className="text-sm text-purple-600 dark:text-purple-400 capitalize">{level.toLowerCase()} Track</p>
                        </div>
                        <div className="space-y-4">
                            {generatedMilestones.map((ms, idx) => (
                                <div key={ms.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-750">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-gray-800 dark:text-gray-200">{idx + 1}. {ms.title}</h5>
                                        <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">{ms.duration}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{ms.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setGeneratedMilestones(null)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">Edit Input</button>
                            <button onClick={handleConfirmSave} className="flex-1 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700">Publish Roadmap</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const RoadmapView: React.FC<RoadmapViewProps> = ({ currentUser }) => {
    const { roadmaps, isLoadingRoadmaps, roadmapsError, fetchRoadmaps, showToast, updateUserSkillLevel } = useData();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [activePatronTab, setActivePatronTab] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState<number | null>(null);
    const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [progress, setProgress] = useState<Record<string, number[]>>({});

    const isPatron = currentUser.role === 'PATRON';

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
                        newProgress[r.id] = p?.completedMilestoneIndices || [];
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
            showToast("Roadmap published!", "success");
        } catch (error: any) {
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
            showToast("Failed to delete.", "error");
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
            showToast("Failed to generate quiz.", "error");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    const handleQuizPass = async () => {
        if (activeRoadmapId && activeMilestoneIndex !== null) {
            try {
                await api.updateMilestoneProgress(currentUser.uid, activeRoadmapId, activeMilestoneIndex);
                setProgress(prev => ({
                    ...prev,
                    [activeRoadmapId]: [...(prev[activeRoadmapId] || []), activeMilestoneIndex]
                }));
                showToast("Milestone completed!", "success");
            } catch (error) {
                showToast("Failed to save progress.", "error");
            }
        }
    };

    if (isLoadingRoadmaps) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                <p>Curating your paths...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto relative">
            {isGeneratingQuiz && (
                <div className="fixed inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500 mb-3"></div>
                        <p className="font-bold text-gray-800 dark:text-white">Generating AI Quiz...</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Learning Roadmaps</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        {isPatron ? "Manage AI-generated learning paths." : `Paths for ${currentUser.skillLevel?.toLowerCase()} mastery.`}
                    </p>
                </div>
                {isPatron && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
                    >
                        <PlusCircleIcon /> Generate Roadmap
                    </button>
                )}
            </div>

            {isPatron && (
                <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-1 mb-8">
                    {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((level) => (
                        <button
                            key={level}
                            onClick={() => setActivePatronTab(level)}
                            className={`pb-3 px-4 sm:px-6 text-sm sm:text-base font-medium transition-colors relative focus:outline-none ${activePatronTab === level ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            {level.charAt(0) + level.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            )}

            {visibleRoadmaps.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <MapIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Paths Active</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Patrons haven't published a roadmap for this level yet.</p>
                </div>
            ) : (
                <div className="grid gap-12">
                    {visibleRoadmaps.map(roadmap => {
                        const userCompletedIndices = progress[roadmap.id!] || [];
                        const milestones = roadmap.milestones || [];
                        
                        return (
                            <div key={roadmap.id} className="relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                                        {roadmap.topic}
                                    </h3>
                                    {isPatron && (
                                        <button onClick={() => setDeleteId(roadmap.id!)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon /></button>
                                    )}
                                </div>

                                <div className="relative">
                                    {milestones.map((ms, idx) => {
                                        const isCompleted = userCompletedIndices.includes(idx);
                                        const isLocked = idx > 0 && !userCompletedIndices.includes(idx - 1) && !isPatron;
                                        
                                        return (
                                            <MilestoneCard 
                                                key={idx} 
                                                milestone={ms} 
                                                index={idx} 
                                                isLast={idx === milestones.length - 1} 
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

            <CreateRoadmapModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreate} initialLevel={activePatronTab} />
            <ConfirmationModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Path" message="This will remove the roadmap for all students." confirmText="Delete" isDangerous />
            <RoadmapQuizModal isOpen={quizModalOpen} onClose={() => setQuizModalOpen(false)} quizQuestions={quizQuestions} onPass={handleQuizPass} />
        </div>
    );
};

export default RoadmapView;
