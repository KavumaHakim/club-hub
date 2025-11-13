import React, { useState, useMemo, useCallback } from 'react';
import { User, Resource, ResourceType, ResourceCategory } from '../types';
import * as api from '../services/apiService';
import { useData } from '../DataContext';
import ResourceCard from './ResourceCard';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface ResourcesProps {
    currentUser: User;
}

const Resources: React.FC<ResourcesProps> = ({ currentUser }) => {
    const { resources, isLoadingResources, fetchResources } = useData();
    const isPatron = currentUser.role === 'PATRON';

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ResourceCategory>('Tutorial');
    const [type, setType] = useState<ResourceType>('LINK');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !category || (type !== 'DOCUMENT' && !url) || (type === 'DOCUMENT' && !file)) {
            setError("Please fill all required fields.");
            return;
        }
        
        setIsSubmitting(true);
        setError(null);

        try {
            await api.addResource({
                title,
                description,
                category,
                type,
                url: type === 'DOCUMENT' ? undefined : url,
                uploaderUid: currentUser.uid,
            }, file || undefined);

            // Reset form
            setTitle('');
            setDescription('');
            setCategory('Tutorial');
            setType('LINK');
            setUrl('');
            setFile(null);
            
            await fetchResources(); // Refresh data
        } catch (err: any) {
            console.error("Failed to add resource:", err);
            setError(err.message || "An unexpected error occurred.");
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
                                    <option value="DOCUMENT">Document</option>
                                </select>
                            </div>
                            <div>
                                {type === 'DOCUMENT' ? (
                                    <>
                                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload File</label>
                                        <input id="file-upload" type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 dark:file:bg-pink-900/50 dark:file:text-pink-300 dark:hover:file:bg-pink-900" />
                                    </>
                                ) : (
                                    <>
                                        <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                                        <input id="url-input" type="url" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} required className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                                    </>
                                )}
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <div className="text-right">
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center space-x-2 px-5 py-2 font-semibold text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                <PlusCircleIcon />
                                <span>{isSubmitting ? 'Uploading...' : 'Add Resource'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {isLoadingResources ? (
                <p className="text-center text-gray-500 dark:text-gray-400">Loading resources...</p>
            ) : Object.keys(groupedResources).length > 0 ? (
                <div className="space-y-8">
                    {Object.entries(groupedResources).map(([category, items]) => (
                        <div key={category}>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b-2 border-pink-500/50">{category}</h3>
                            <div className="space-y-4">
                                {items.map(resource => (
                                    <ResourceCard key={resource.id} resource={resource} currentUser={currentUser} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No resources have been uploaded yet.</p>
            )}
        </div>
    );
};

export default Resources;