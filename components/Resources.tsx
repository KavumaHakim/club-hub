
import React, { useState, useMemo, useCallback } from 'react';
import { User, Resource, ResourceType, ResourceCategory, Tab } from '../types';
import * as api from '../services/apiService';
import { useData } from '../DataContext';
import ResourceCard from './ResourceCard';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { UploadIcon } from './icons/UploadIcon';

interface ResourcesProps {
    currentUser: User;
    setActiveTab: (tab: Tab) => void;
}

const Resources: React.FC<ResourcesProps> = ({ currentUser, setActiveTab }) => {
    const { resources, isLoadingResources, resourcesError, fetchResources } = useData();
    const isPatron = currentUser.role === 'PATRON';

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ResourceCategory>('Tutorial');
    const [type, setType] = useState<ResourceType>('LINK');
    const [url, setUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation
        if (!title || !description || !category) {
            setError("Please fill all required fields.");
            return;
        }

        if (type === 'PYTHON' && !selectedFile) {
             setError("Please select a Python file to upload.");
             return;
        }

        if (type !== 'PYTHON' && !url) {
             setError("Please enter a valid URL.");
             return;
        }
        
        setIsSubmitting(true);
        setError(null);

        try {
            let resourceUrl = url;
            let resourceFilePath = undefined;

            if (type === 'PYTHON' && selectedFile) {
                // Upload file first, passing userId to organize by folder
                const uploadResult = await api.uploadResourceFile(selectedFile, currentUser.uid);
                resourceUrl = uploadResult.url;
                resourceFilePath = uploadResult.path;
            }

            await api.addResource({
                title,
                description,
                category,
                type,
                url: resourceUrl,
                filePath: resourceFilePath,
                uploaderUid: currentUser.uid,
                topic: null, // Add topic to satisfy schema
            });

            // Reset form
            setTitle('');
            setDescription('');
            setCategory('Tutorial');
            setType('LINK');
            setUrl('');
            setSelectedFile(null);
            
            await fetchResources(); // Refresh data
        } catch (err: any) {
            console.error("Failed to add resource:", err);
            // Check for common RLS error message
            if (err.message && err.message.toLowerCase().includes('row-level security')) {
                 setError("Permission Denied: Database Row-Level Security (RLS) policies are preventing this action. Please ensure you have enabled RLS and created policies for the 'resources' table and 'resource_files' storage bucket in your Supabase dashboard.");
            } else {
                 setError(err.message || "An unexpected error occurred.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (resource: Resource) => {
        if (!window.confirm(`Are you sure you want to delete "${resource.title}"?`)) return;
        try {
            await api.deleteResource(resource);
            await fetchResources();
        } catch (err: any) {
            console.error("Failed to delete resource:", err);
            alert(err.message || "An error occurred.");
        }
    };
    
    // Group resources by category
    const groupedResources: Record<string, Resource[]> = useMemo(() => {
        return resources.reduce((acc, resource) => {
            (acc[resource.category] = acc[resource.category] || []).push(resource);
            return acc;
        }, {} as Record<string, Resource[]>);
    }, [resources]);

    const renderContent = () => {
        if (isLoadingResources) {
            return <p className="text-center text-gray-500 dark:text-gray-400">Loading resources...</p>;
        }

        if (resourcesError) {
            return <p className="text-center text-red-500 dark:text-red-400 py-4">{`Failed to load resources: ${resourcesError}`}</p>;
        }

        if (Object.keys(groupedResources).length > 0) {
            return (
                <div className="space-y-8">
                    {Object.entries(groupedResources).map(([category, items]) => (
                        <div key={category}>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b-2 border-pink-500/50">{category}</h3>
                            <div className="space-y-4">
                                {items.map(resource => (
                                    <ResourceCard 
                                        key={resource.id} 
                                        resource={resource} 
                                        currentUser={currentUser} 
                                        onDelete={handleDelete}
                                        setActiveTab={setActiveTab}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return <p className="text-center text-gray-500 dark:text-gray-400 py-4">No resources have been uploaded yet.</p>;
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Club Resources</h2>

            {isPatron && (
                <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Upload New Resource</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                            <div>
                                <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                <select id="category-select" value={category} onChange={e => setCategory(e.target.value as ResourceCategory)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                                    <option value="Documentation">Documentation</option>
                                    <option value="Tutorial">Tutorial</option>
                                    <option value="Tool">Tool</option>
                                    <option value="Article">Article</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required rows={3} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="type-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource Type</label>
                                <select id="type-select" value={type} onChange={e => setType(e.target.value as ResourceType)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                                    <option value="LINK">Link</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="PYTHON">Python File</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="resource-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {type === 'PYTHON' ? 'Upload File (.py)' : 'URL'}
                                </label>
                                {type === 'PYTHON' ? (
                                    <div className="relative">
                                         <input 
                                            id="file-input" 
                                            type="file" 
                                            accept=".py"
                                            onChange={handleFileChange}
                                            className="hidden" 
                                        />
                                        <label htmlFor="file-input" className="cursor-pointer flex items-center justify-between w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                            <span className="text-gray-500 dark:text-gray-400 truncate">
                                                {selectedFile ? selectedFile.name : 'Choose a file...'}
                                            </span>
                                            <UploadIcon className="h-5 w-5 text-gray-400" />
                                        </label>
                                    </div>
                                ) : (
                                    <input id="url-input" type="url" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} required className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                                )}
                            </div>
                        </div>
                        {error && <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>}
                        <div className="text-right">
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center space-x-2 px-5 py-2 font-semibold text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                <PlusCircleIcon />
                                <span>{isSubmitting ? 'Uploading...' : 'Add Resource'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {renderContent()}
        </div>
    );
};

export default Resources;
