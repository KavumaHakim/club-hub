

import React, { useState } from 'react';
import { User, FeedItemType } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { CameraIcon } from './icons/CameraIcon';
import { XIcon } from './icons/XIcon';
import * as api from '../services/apiService';

interface AddAnnouncementProps {
    currentUser: User;
    onAddAnnouncement: (data: { title: string, message: string, type: FeedItemType, imageUrl?: string, pollOptions?: string[] }) => Promise<void>;
}

const AddAnnouncement: React.FC<AddAnnouncementProps> = ({ currentUser, onAddAnnouncement }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<FeedItemType>('NEWS_UPDATE');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [imageUrl, setImageUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isTitleRequired = type === 'NEWS_UPDATE' || type === 'EVENT_ANNOUNCEMENT';
    const validPollOptions = pollOptions.filter(o => o.trim() !== '');
    const isValid =
        message.trim().length > 0 &&
        (!isTitleRequired || title.trim().length > 0) &&
        (type !== 'POLL' || validPollOptions.length >= 2);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        // Validation
        if (!message.trim()) {
            setErrorMsg('Please enter a message or question.');
            return;
        }
        // Title is required for News and Events
        if ((type === 'NEWS_UPDATE' || type === 'EVENT_ANNOUNCEMENT') && !title.trim()) {
            setErrorMsg('Please add a title for news or event announcements.');
            return;
        }

        if (type === 'POLL') {
            if (validPollOptions.length < 2) {
                setErrorMsg('Polls must have at least 2 options.');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            let finalImageUrl = imageUrl.trim() || undefined;

            if (selectedFile) {
                finalImageUrl = await api.uploadFeedImage(selectedFile);
            }

            await onAddAnnouncement({
                title,
                message,
                type,
                imageUrl: finalImageUrl,
                pollOptions: type === 'POLL' ? validPollOptions : undefined
            });
            setTitle('');
            setMessage('');
            setImageUrl('');
            setSelectedFile(null);
            setPreviewUrl(null);
            setType('NEWS_UPDATE');
            setPollOptions(['', '']);
        } catch (error) {
            console.error(error);
            setErrorMsg('Failed to post announcement. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const addOption = () => {
        setPollOptions([...pollOptions, '']);
    };

    const removeOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="border-2 border-ch-rule p-5">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} alt={currentUser.name} className="h-10 w-10 flex-none object-cover" />
                    <div>
                        <p className="text-[13px] font-bold">Post as {currentUser.name}</p>
                        <p className="text-[11px] text-ch-muted">Share news, events, or questions with the club.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-wrap items-stretch border border-ch-rule">
                        {[
                            { id: 'NEWS_UPDATE', label: 'News' },
                            { id: 'EVENT_ANNOUNCEMENT', label: 'Event' },
                            { id: 'MEMBER_POST', label: 'Post' },
                            { id: 'POLL', label: 'Poll' }
                        ].map((pill) => (
                            <button
                                key={pill.id}
                                type="button"
                                onClick={() => setType(pill.id as FeedItemType)}
                                className={`px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors ${type === pill.id
                                    ? 'bg-ch-accent text-ch-on-accent'
                                    : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text'
                                    }`}
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>

                    {type !== 'POLL' && (
                        <div className="space-y-3">
                            <input
                                id="announcement-title"
                                type="text"
                                placeholder={type === 'MEMBER_POST' ? "Title (optional)" : "Add a title"}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-ch-rule bg-transparent px-4 py-2.5 text-[14px] text-ch-text placeholder-ch-muted focus:outline-none"
                            />
                            {isTitleRequired && (
                                <p className="text-[11px] text-ch-muted">Title is required for news and event announcements.</p>
                            )}

                            <input
                                id="announcement-image"
                                type="text"
                                placeholder="Or Paste Image URL"
                                value={imageUrl}
                                onChange={(e) => {
                                    setImageUrl(e.target.value);
                                    if (e.target.value) {
                                        setSelectedFile(null);
                                        setPreviewUrl(null);
                                    }
                                }}
                                className="w-full border border-ch-rule bg-transparent px-4 py-2.5 text-[14px] text-ch-text placeholder-ch-muted focus:outline-none"
                            />

                            <div className="flex flex-col gap-3">
                                <label className="flex cursor-pointer items-center gap-2 border border-dashed border-ch-rule px-4 py-2.5 text-[13px] font-semibold text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text">
                                    <CameraIcon className="h-4 w-4" />
                                    <span>{selectedFile ? 'Change Image' : 'Upload Image'}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setSelectedFile(file);
                                                setImageUrl('');
                                                const reader = new FileReader();
                                                reader.onloadend = () => setPreviewUrl(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>

                                {previewUrl && (
                                    <div className="relative inline-block mt-2 group">
                                        <img src={previewUrl} alt="Preview" className="h-24 w-24 border-2 border-ch-accent object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setPreviewUrl(null);
                                            }}
                                            className="absolute -right-2 -top-2 bg-ch-accent p-1 text-ch-on-accent transition-colors hover:bg-ch-accent-deep"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <textarea
                            id="announcement-message"
                            placeholder={type === 'POLL' ? "Ask a question..." : "What's on your mind?"}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={type === 'POLL' ? 2 : 3}
                            className="w-full resize-none border border-ch-rule bg-transparent px-4 py-3 text-[14px] text-ch-text placeholder-ch-muted focus:outline-none"
                        ></textarea>
                        <div className="flex items-center justify-between text-[11px] text-ch-muted">
                            <span>{type === 'POLL' ? 'Make it short and clear.' : 'Keep it concise and helpful.'}</span>
                            <span>{message.length} chars</span>
                        </div>
                    </div>

                    {type === 'POLL' && (
                        <div className="space-y-2">
                            {pollOptions.map((option, index) => (
                                <div key={index} className="flex gap-2 items-center animate-fade-in-down">
                                    <input
                                        type="text"
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className="min-w-0 flex-grow border border-ch-rule bg-transparent px-3 py-2 text-[13px] text-ch-text placeholder-ch-muted focus:outline-none"
                                    />
                                    {pollOptions.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOption(index)}
                                            className="p-1 text-ch-muted transition-colors hover:text-ch-accent"
                                            aria-label="Remove option"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addOption}
                                className="flex w-full items-center justify-center gap-1 border border-dashed border-ch-rule py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ch-accent transition-colors hover:bg-ch-surface"
                            >
                                <PlusCircleIcon className="w-4 h-4" /> Add Option
                            </button>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="flex items-center gap-2 border-l-2 border-ch-accent bg-ch-accent-soft p-2 text-[12px] text-ch-text">
                            <span className="font-semibold">Fix:</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-ch-muted">
                            {isValid ? <CheckCircleIcon className="h-4 w-4 text-ch-accent" /> : null}
                            <span>{isValid ? 'Ready to post' : 'Fill the required fields'}</span>
                        </div>
                        <button type="submit" disabled={isSubmitting || !isValid} className="bg-ch-accent px-6 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-ch-on-accent transition-colors hover:bg-ch-accent-deep disabled:opacity-45">
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAnnouncement;
