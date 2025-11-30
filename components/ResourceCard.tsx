
import React, { useState, useRef, useEffect } from 'react';
import { Resource, User, Tab } from '../types';
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
        <div ref={cardRef} className="scroll-animate group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start gap-5 transition-all duration-300 transform hover:-translate-y-1 hover:border-pink-200 dark:hover:border-pink-900/50">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-pink-500 dark:text-pink-400 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 group-hover:scale-110 transition-all duration-300">
                {getResourceIcon(resource.type)}
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                     <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{resource.title}</h4>
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                         {resource.type}
                     </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">{resource.description}</p>
                <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                    <span className="font-medium mr-1 text-gray-600 dark:text-gray-300">{resource.uploaderName}</span>
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-2"></span>
                    <span>{resource.createdAt}</span>
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-2"></span>
                    <span className="text-pink-500 dark:text-pink-400">{resource.category}</span>
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 self-end sm:self-center mt-2 sm:mt-0 w-full sm:w-auto">
                <a
                    href={getActionLink()}
                    target={resource.type === 'PYTHON' ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    onClick={handleOpenAction}
                    className={`flex-1 sm:flex-none text-center px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 dark:bg-gray-700 hover:bg-pink-600 dark:hover:bg-pink-600 rounded-xl shadow-sm hover:shadow-md transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {getActionText()}
                </a>
                {isPatron && (
                    <button
                        onClick={() => onDelete(resource)}
                        className="p-2.5 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900/50"
                        aria-label="Delete resource"
                        title="Delete Resource"
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ResourceCard;
