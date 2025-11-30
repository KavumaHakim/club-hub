

import React, { useState, useRef, useEffect } from 'react';
import { Resource, User, Tab } from '../types';
import { LinkIcon } from './icons/LinkIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CodeIcon } from './icons/CodeIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import LinkPreview from './LinkPreview';

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
    const cardRef = useRef<HTMLDivElement>(null);
    const hasThumbnail = resource.thumbnailUrl && (resource.type === 'DOCUMENT' || resource.type === 'PYTHON');

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
                alert("Could not load the file into the playground.");
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
    
    return (
        <div ref={cardRef} className="scroll-animate group bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm hover:shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start gap-5 transition-all duration-300 transform hover:-translate-y-1 hover:border-pink-200 dark:hover:border-pink-900/50">
            <div className="flex-shrink-0 w-full sm:w-40">
                {hasThumbnail ? (
                    <a href={getActionLink()} target={resource.type === 'PYTHON' ? undefined : "_blank"} rel="noopener noreferrer" onClick={handleOpenAction} className="block group/thumb">
                        <img 
                          src={resource.thumbnailUrl} 
                          alt={`${resource.title} thumbnail`} 
                          className="w-full h-auto object-cover rounded-lg bg-gray-100 dark:bg-gray-700 aspect-video group-hover/thumb:ring-2 ring-pink-500 transition-all shadow-md"
                        />
                    </a>
                ) : ( (resource.type === 'LINK' || resource.type === 'VIDEO') && resource.url ?
                    <LinkPreview url={resource.url} size="normal" />
                   :
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-pink-500 dark:text-pink-400 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 group-hover:scale-110 transition-all duration-300">
                        {getResourceIcon(resource.type)}
                    </div>
                )}
            </div>
            <div className="flex-grow min-w-0 flex flex-col justify-between self-stretch w-full">
                <div>
                    <div className="flex justify-between items-start">
                         <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors pr-2">{resource.title}</h4>
                         <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                             {resource.type}
                         </span>
                    </div>
                    { !((resource.type === 'LINK' || resource.type === 'VIDEO') && resource.url) &&
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed line-clamp-2">{resource.description}</p>
                    }
                </div>
                
                <div className="mt-auto pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                        <span className="font-medium mr-1 text-gray-600 dark:text-gray-300">{resource.uploaderName}</span>
                        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-2"></span>
                        <span>{resource.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <a
                            href={getActionLink()}
                            target={resource.type === 'PYTHON' ? undefined : "_blank"}
                            rel="noopener noreferrer"
                            onClick={handleOpenAction}
                            className={`flex-1 sm:flex-none text-center px-4 py-2 text-sm font-semibold text-white bg-gray-900 dark:bg-gray-700 hover:bg-pink-600 dark:hover:bg-pink-600 rounded-xl shadow-sm transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {getActionText()}
                        </a>
                        {isPatron && (
                            <button
                                onClick={() => onDelete(resource)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900/50"
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