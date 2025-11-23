
import React, { useState } from 'react';
import { Resource, User, Tab } from '../types';
import { LinkIcon } from './icons/LinkIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CodeIcon } from './icons/CodeIcon';

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
    default:
      return null;
  }
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, currentUser, onDelete, setActiveTab }) => {
    const isPatron = currentUser.role === 'PATRON';
    const [isLoading, setIsLoading] = useState(false);

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
        return 'View';
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 flex items-start gap-4 hover:shadow-lg transition-shadow">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-pink-500">
                {getResourceIcon(resource.type)}
            </div>
            <div className="flex-grow">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">{resource.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{resource.description}</p>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Uploaded by {resource.uploaderName} on {resource.createdAt}
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                <a
                    href={getActionLink()}
                    target={resource.type === 'PYTHON' ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    onClick={handleOpenAction}
                    className={`px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg shadow-sm hover:bg-pink-700 transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {getActionText()}
                </a>
                {isPatron && (
                    <button
                        onClick={() => onDelete(resource)}
                        className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        aria-label="Delete resource"
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ResourceCard;