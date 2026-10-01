
import React, { useState, useMemo, useCallback } from 'react';
import { User, Suggestion, SuggestionType, SuggestionStatus } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { BugIcon } from './icons/BugIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpCircleIcon } from './icons/ArrowUpCircleIcon';
import ConfirmationModal from './ConfirmationModal';
import Tooltip from './Tooltip';
import { PageIntro, RuledTabs, EmptyState, BTN_PRIMARY } from './SplitKit';

interface SuggestionsProps {
    currentUser: User;
}

const statusColors: Record<SuggestionStatus, string> = {
    PENDING: 'bg-ch-surface text-ch-text',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const typeColors: Record<SuggestionType, string> = {
    FEATURE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    BUG: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const AddSuggestionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (type: SuggestionType, title: string, description: string) => Promise<void> }> = ({ isOpen, onClose, onSubmit }) => {
    const [type, setType] = useState<SuggestionType>('FEATURE');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showAlert } = useData();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(type, title, description);
            onClose();
            setTitle('');
            setDescription('');
            setType('FEATURE');
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Submission Failed',
                message: 'Failed to submit your suggestion. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-ch-bg max-w-md w-full p-6 relative border-2 border-ch-rule">
                <button onClick={onClose} className="absolute top-4 right-4 text-ch-muted hover:text-ch-text">
                    <XIcon />
                </button>
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-6">New Suggestion</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ch-text mb-2">Type</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setType('FEATURE')}
                                className={`flex-1 py-2 border-2 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${type === 'FEATURE' ? 'border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' : 'border-ch-divider text-ch-muted'}`}
                            >
                                <LightBulbIcon className="h-4 w-4" /> Feature
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('BUG')}
                                className={`flex-1 py-2 border-2 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${type === 'BUG' ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'border-ch-divider text-ch-muted'}`}
                            >
                                <BugIcon className="h-4 w-4" /> Bug Report
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ch-text mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent focus:border-ch-accent outline-none"
                            placeholder={type === 'FEATURE' ? "e.g., Dark mode support" : "e.g., Login button not working"}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ch-text mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-ch-divider focus:ring-ch-accent focus:border-ch-accent outline-none"
                            placeholder="Describe your idea or the bug in detail..."
                            required
                        />
                    </div>
                    <Tooltip className="flex w-full" text="Send your suggestion or bug report to the club.">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 bg-ch-accent hover:bg-ch-accent-deep text-ch-on-accent font-bold transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </Tooltip>
                </form>
            </div>
        </div>
    );
};

const SuggestionCard: React.FC<{
    suggestion: Suggestion,
    currentUser: User,
    onVote: (id: string, upvotes: string[]) => void,
    onDelete: (id: string) => void,
    onStatusChange: (id: string, status: SuggestionStatus) => void
}> = ({ suggestion, currentUser, onVote, onDelete, onStatusChange }) => {
    const isPatron = currentUser.role === 'PATRON';
    const isAuthor = currentUser.uid === suggestion.userId;
    const upvotes = suggestion.upvotes || [];
    const hasVoted = upvotes.includes(currentUser.uid);

    // Fallback avatar if URL is missing
    const avatarSrc = suggestion.userAvatarUrl || (suggestion.userId ? `https://i.pravatar.cc/24?u=${suggestion.userId}` : undefined);

    return (
        <div className="bg-ch-bg p-5 border border-ch-divider flex flex-col gap-4 transition-all">
            <div className="flex justify-between items-start">
                <div className="flex gap-2 items-center">
                    <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wide ${typeColors[suggestion.type]}`}>
                        {suggestion.type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wide ${statusColors[suggestion.status]}`}>
                        {suggestion.status.replace('_', ' ')}
                    </span>
                </div>
                {(isAuthor || isPatron) && (
                    <button
                        onClick={() => onDelete(suggestion.id)}
                        className="text-ch-muted hover:text-red-500 transition-colors p-1"
                        title="Delete Suggestion"
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>

            <div className="flex-1">
                <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text mb-1">{suggestion.title}</h3>
                <p className="text-ch-muted text-sm leading-relaxed whitespace-pre-wrap">{suggestion.description}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-ch-divider">
                <div className="flex items-center gap-2 text-xs text-ch-muted">
                    {avatarSrc ? (
                        <img
                            src={avatarSrc}
                            alt={suggestion.userName || 'User'}
                            className="w-6 h-6 border border-ch-divider object-cover"
                        />
                    ) : (
                        <div className="w-6 h-6 bg-ch-surface-2 flex items-center justify-center text-[10px] font-bold text-ch-muted">
                            ?
                        </div>
                    )}
                    <span className="font-medium">{suggestion.userName || 'Unknown User'}</span>
                    <span>•</span>
                    <span>{new Date(suggestion.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-3">
                    {isPatron && (
                        <select
                            value={suggestion.status}
                            onChange={(e) => onStatusChange(suggestion.id, e.target.value as SuggestionStatus)}
                            className="text-xs bg-ch-surface border-none px-2 py-1 focus:ring-1 focus:ring-ch-accent"
                        >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    )}

                    <button
                        onClick={() => onVote(suggestion.id, upvotes)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 font-medium text-sm transition-all ${hasVoted ? 'bg-ch-accent-soft text-ch-accent ring-1 ring-ch-accent' : 'bg-ch-surface text-ch-muted hover:bg-ch-surface-2'}`}
                    >
                        <ArrowUpCircleIcon />
                        <span>{upvotes.length}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const Suggestions: React.FC<SuggestionsProps> = ({ currentUser }) => {
    const { suggestions, isLoadingSuggestions, suggestionsError, fetchSuggestions } = useData();
    const [filterType, setFilterType] = useState<'ALL' | SuggestionType>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const filteredSuggestions = useMemo(() => {
        return suggestions.filter(s => filterType === 'ALL' || s.type === filterType);
    }, [suggestions, filterType]);

    const handleAddSuggestion = async (type: SuggestionType, title: string, description: string) => {
        await api.addSuggestion({
            type,
            title,
            description,
            userId: currentUser.uid,
        });
        await fetchSuggestions();
    };

    const handleVote = async (id: string, currentUpvotes: string[]) => {
        try {
            await api.toggleSuggestionUpvote(id, currentUser.uid, currentUpvotes);
            await fetchSuggestions();
        } catch (error) {
            console.error("Vote failed", error);
        }
    };

    const handleDelete = async () => {
        if (deleteId) {
            try {
                await api.deleteSuggestion(deleteId);
                await fetchSuggestions();
            } catch (error) {
                console.error("Delete failed", error);
            } finally {
                setDeleteId(null);
            }
        }
    };

    const handleStatusChange = async (id: string, status: SuggestionStatus) => {
        try {
            await api.updateSuggestionStatus(id, status, currentUser.uid);
            await fetchSuggestions();
        } catch (error) {
            console.error("Status update failed", error);
        }
    };

    if (isLoadingSuggestions) {
        return <div className="text-center p-8 text-ch-muted">Loading suggestions...</div>;
    }

    if (suggestionsError) {
        return <div className="text-center p-8 text-red-500 dark:text-red-400">{`Error: ${suggestionsError}`}</div>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <PageIntro
                eyebrow="Feedback"
                title="Suggestions & Bugs"
                description="Help us improve the ICT Club Hub."
                actions={
                    <Tooltip text="Create a new feature request or bug report.">
                        <button onClick={() => setIsModalOpen(true)} className={BTN_PRIMARY}>
                            <PlusCircleIcon /> New Suggestion
                        </button>
                    </Tooltip>
                }
            />

            <RuledTabs
                tabs={[
                    { id: 'ALL', label: 'All', count: suggestions.length },
                    { id: 'FEATURE', label: 'Features', count: suggestions.filter(s => s.type === 'FEATURE').length },
                    { id: 'BUG', label: 'Bugs', count: suggestions.filter(s => s.type === 'BUG').length },
                ]}
                active={filterType}
                onChange={setFilterType}
            />

            {filteredSuggestions.length === 0 ? (
                <EmptyState title="No suggestions yet" description="Be the first to share an idea!" />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {filteredSuggestions.map(suggestion => (
                        <SuggestionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            currentUser={currentUser}
                            onVote={handleVote}
                            onDelete={setDeleteId}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </div>
            )}

            <AddSuggestionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddSuggestion}
            />

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Delete Suggestion"
                message="Are you sure you want to delete this suggestion? This cannot be undone."
                confirmText="Delete"
                isDangerous
            />
        </div>
    );
};

export default Suggestions;
