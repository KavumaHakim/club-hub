import React, { useState, useRef, useEffect } from 'react';
import { Resource, User, Tab } from '../types';
import { useData } from '../DataContext';
import { LinkIcon } from './icons/LinkIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CodeIcon } from './icons/CodeIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface ResourceCardProps {
    resource: Resource;
    currentUser: User;
    onDelete: (resource: Resource) => void;
    setActiveTab: (tab: Tab) => void;
}

const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
        case 'LINK':
            return <LinkIcon />;
        case 'VIDEO':
            return <VideoCameraIcon />;
        case 'PYTHON':
            return <CodeIcon />;
        case 'DOCUMENT':
            return <DocumentTextIcon />;
        default:
            return null;
    }
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, currentUser, onDelete, setActiveTab }) => {
    const isPatron = currentUser.role === 'PATRON';
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert } = useData();
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = cardRef.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                element.classList.add('is-visible');
                observer.unobserve(element);
            }
        }, { threshold: 0.1 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const handleOpenAction = async (e: React.MouseEvent) => {
        if (resource.type === 'PYTHON') {
            e.preventDefault();
            setIsLoading(true);
            try {
                // Fetch the code content from the URL
                const response = await fetch(resource.url!);
                if (!response.ok) throw new Error("Failed to load file content");
                const text = await response.text();

                // Dispatch event to Playground
                const event = new CustomEvent('open-in-playground', { detail: text });
                window.dispatchEvent(event);

                // Switch to Playground Tab
                setActiveTab('playground');
            } catch (error) {
                console.error("Error opening file in playground:", error);
                showAlert({
                    title: 'Load Failed',
                    message: 'Could not load the file into the playground.',
                    type: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        }
    };

    const getActionLink = () => {
        return resource.url || '#';
    };

    const getActionText = () => {
        if (resource.type === 'PYTHON') return isLoading ? 'Loading...' : 'Open in Playground';
        if (resource.type === 'DOCUMENT') return 'View Document';
        return 'View Resource';
    };

    const iconElement = getResourceIcon(resource.type);

    const isImage = !!resource.url && /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(resource.url);
    const domain = resource.url ? (() => {
        try {
            return new URL(resource.url).hostname.replace('www.', '');
        } catch {
            return '';
        }
    })() : '';

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return dateString;
        }
    };

    return (
        <div ref={cardRef} className="scroll-animate group bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col transition-all duration-300">
            <div className="relative">
                {(resource.type === 'LINK' || resource.type === 'VIDEO') && resource.url && isImage ? (
                    <img src={resource.url} alt={resource.title} className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                    <div className="h-40 w-full bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 flex items-center justify-center">
                        <div className="text-sky-400/90">
                            {iconElement && React.cloneElement(iconElement, { className: "w-14 h-14" })}
                        </div>
                    </div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/80 text-slate-900">
                        {resource.type}
                    </span>
                </div>
                {resource.category && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white">
                        {resource.category}
                    </span>
                )}
            </div>

            <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-snug line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {resource.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{resource.description}</p>
                </div>

                {(resource.type === 'LINK' || resource.type === 'VIDEO') && domain && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        {domain}
                    </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{resource.uploaderName}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(resource.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={getActionLink()}
                            target={resource.type === 'PYTHON' ? undefined : "_blank"}
                            rel="noopener noreferrer"
                            onClick={handleOpenAction}
                            className={`px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-sky-600 rounded-lg transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {getActionText()}
                        </a>
                        {isPatron && (
                            <button
                                onClick={() => onDelete(resource)}
                                className="p-2 text-gray-400 hover:text-red-500 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900/50 transition-colors"
                                aria-label="Delete resource"
                                title="Delete Resource"
                            >
                                <TrashIcon />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceCard;
