

import React, { useState, useMemo, useEffect } from 'react';
import { User, Resource, ResourceType, ResourceCategory, Tab } from '../types';
import * as api from '../services/apiService';
import * as geminiService from '../services/geminiService';
import { useData } from '../DataContext';
import ResourceCard from './ResourceCard';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import ConfirmationModal from './ConfirmationModal';
import { CodeIcon } from './icons/CodeIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import Tooltip from './Tooltip';

interface ResourcesProps {
    currentUser: User;
    setActiveTab: (tab: Tab) => void;
}

const Resources: React.FC<ResourcesProps> = ({ currentUser, setActiveTab }) => {
    const { resources, isLoadingResources, resourcesError, fetchResources, showToast } = useData();
    const isPatron = currentUser.role === 'PATRON';
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'All' | ResourceCategory>('All');
    const [selectedType, setSelectedType] = useState<'All' | ResourceType>('All');
    const [sortBy, setSortBy] = useState<'Newest' | 'Oldest' | 'A-Z'>('Newest');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ResourceCategory>('Tutorial');
    const [type, setType] = useState<ResourceType>('LINK');
    const [url, setUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [filePreviewText, setFilePreviewText] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    // Delete Modal State
    const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

    const getAcceptedTypes = (resourceType: ResourceType) => {
        if (resourceType === 'PYTHON') return ['.py'];
        if (resourceType === 'DOCUMENT') return ['.pdf', '.docx', '.txt'];
        return [];
    };

    const isAcceptedFile = (file: File, resourceType: ResourceType) => {
        const allowed = getAcceptedTypes(resourceType);
        if (allowed.length === 0) return true;
        return allowed.some(ext => file.name.toLowerCase().endsWith(ext));
    };

    const handleFileSelected = (file: File) => {
        if (!isAcceptedFile(file, type)) {
            setError(`Unsupported file type. Allowed: ${getAcceptedTypes(type).join(', ')}`);
            return;
        }
        setSelectedFile(file);
        setError(null);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelected(e.dataTransfer.files[0]);
        }
    };

    const handleGenerateDesc = async () => {
        if (!selectedFile) {
            setError("Please select a document first.");
            return;
        }
        setIsGeneratingDesc(true);
        setError(null);
        try {
            const summary = await geminiService.generateDocumentSummary(selectedFile);
            setDescription(summary);
            showToast("AI description generated!", "success");
        } catch (err: any) {
            setError(err.message || "Failed to generate description.");
            showToast("AI description failed.", "error");
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    useEffect(() => {
        setError(null);
        if (type === 'PYTHON' || type === 'DOCUMENT') {
            setUrl('');
        } else {
            setSelectedFile(null);
            setFilePreviewText(null);
            setPdfPreviewUrl(null);
        }
    }, [type]);

    useEffect(() => {
        if (!selectedFile) {
            setFilePreviewText(null);
            setPdfPreviewUrl(null);
            return;
        }

        const lowerName = selectedFile.name.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
            const url = URL.createObjectURL(selectedFile);
            setPdfPreviewUrl(url);
            setFilePreviewText(null);
            return () => URL.revokeObjectURL(url);
        }

        setPdfPreviewUrl(null);
        if (type === 'PYTHON' || (type === 'DOCUMENT' && lowerName.endsWith('.txt'))) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = String(e.target?.result || '');
                setFilePreviewText(content.slice(0, 800));
            };
            reader.readAsText(selectedFile);
        } else {
            setFilePreviewText(null);
        }
    }, [selectedFile, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title || !description || !category) {
            setError("Please fill all required fields.");
            return;
        }

        if ((type === 'PYTHON' || type === 'DOCUMENT') && !selectedFile) {
             setError(`Please select a file to upload.`);
             return;
        }

        if (type !== 'PYTHON' && type !== 'DOCUMENT' && !url) {
             setError("Please enter a valid URL.");
             return;
        }
        
        setIsSubmitting(true);
        setError(null);

        try {
            let resourceUrl = url;
            let resourceFilePath = undefined;

            if ((type === 'PYTHON' || type === 'DOCUMENT') && selectedFile) {
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
                topic: undefined,
            });

            setTitle('');
            setDescription('');
            setCategory('Tutorial');
            setType('LINK');
            setUrl('');
            setSelectedFile(null);
            setFilePreviewText(null);
            
            await fetchResources();
            showToast("Resource added successfully!", "success");
        } catch (err: any) {
            console.error("Failed to add resource:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (resource: Resource) => {
        setResourceToDelete(resource);
    };

    const confirmDelete = async () => {
        if (!resourceToDelete) return;
        try {
            await api.deleteResource(resourceToDelete);
            await fetchResources();
            showToast("Resource deleted.", "info");
        } catch (err: any) {
            console.error("Failed to delete resource:", err);
            showToast(err.message || "An error occurred.", "error");
        } finally {
            setResourceToDelete(null);
        }
    };
    
    const filteredResources = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let items = resources.filter(resource => {
            const matchesTerm = !term ||
                resource.title.toLowerCase().includes(term) ||
                resource.description.toLowerCase().includes(term) ||
                resource.uploaderName?.toLowerCase().includes(term);
            const matchesCategory = selectedCategory === 'All' || resource.category === selectedCategory;
            const matchesType = selectedType === 'All' || resource.type === selectedType;
            return matchesTerm && matchesCategory && matchesType;
        });

        items = [...items].sort((a, b) => {
            if (sortBy === 'A-Z') return a.title.localeCompare(b.title);
            const aDate = new Date(a.createdAt).getTime();
            const bDate = new Date(b.createdAt).getTime();
            return sortBy === 'Newest' ? bDate - aDate : aDate - bDate;
        });

        return items;
    }, [resources, searchTerm, selectedCategory, selectedType, sortBy]);

    const groupedResources: Record<string, Resource[]> = useMemo(() => {
        return filteredResources.reduce((acc, resource) => {
            (acc[resource.category] = acc[resource.category] || []).push(resource);
            return acc;
        }, {} as Record<string, Resource[]>);
    }, [filteredResources]);

    const previewData = useMemo(() => {
        const hasFile = selectedFile && (type === 'PYTHON' || type === 'DOCUMENT');
        const hasUrl = url && type !== 'PYTHON' && type !== 'DOCUMENT';
        if (!hasFile && !hasUrl) return null;

        const fileSize = selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : null;
        const displayUrl = url?.trim();
        const domain = displayUrl ? (() => {
            try {
                return new URL(displayUrl).hostname;
            } catch {
                return displayUrl;
            }
        })() : null;

        return {
            hasFile,
            hasUrl,
            fileName: selectedFile?.name || null,
            fileSize,
            fileType: selectedFile?.type || null,
            displayUrl,
            domain
        };
    }, [selectedFile, url, type]);

    const renderContent = () => {
        if (isLoadingResources) {
            return <p className="text-center text-gray-500 dark:text-gray-400">Loading resources...</p>;
        }

        if (resourcesError) {
            return <p className="text-center text-red-500 dark:text-red-400 py-4">{`Failed to load resources: ${resourcesError}`}</p>;
        }

        if (Object.keys(groupedResources).length > 0) {
            return (
                <div className="space-y-10">
                    {Object.entries(groupedResources).map(([category, items]) => (
                        <div key={category}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{category}</h3>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{items.length} items</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {items.map(resource => (
                                    <ResourceCard 
                                        key={resource.id} 
                                        resource={resource} 
                                        currentUser={currentUser} 
                                        onDelete={handleDeleteClick}
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
        <div className="space-y-8">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white p-8 shadow-xl border border-white/10">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div>
                        <p className="uppercase tracking-[0.3em] text-xs text-indigo-200">Club Library</p>
                        <h2 className="text-3xl lg:text-4xl font-bold mt-2">Explore the eLibrary</h2>
                        <p className="text-indigo-100/80 mt-2 max-w-xl">Search curated tutorials, documents, videos, and tooling references. Save time with filters and smart previews.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search resources, authors, topics..."
                                className="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder:text-indigo-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-400"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="px-4 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 focus:outline-none"
                        >
                            <option value="Newest">Newest</option>
                            <option value="Oldest">Oldest</option>
                            <option value="A-Z">A-Z</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                    {(['All', 'Documentation', 'Tutorial', 'Tool', 'Article', 'Other'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat as any)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                                selectedCategory === cat
                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                                    : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    {(['All', 'LINK', 'VIDEO', 'PYTHON', 'DOCUMENT'] as const).map(kind => (
                        <button
                            key={kind}
                            onClick={() => setSelectedType(kind as any)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                                selectedType === kind
                                    ? 'bg-indigo-400 text-slate-900 shadow-lg shadow-indigo-500/30'
                                    : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                            }`}
                        >
                            {kind === 'LINK' ? 'Link' : kind === 'VIDEO' ? 'Video' : kind === 'PYTHON' ? 'Python' : kind === 'DOCUMENT' ? 'Document' : 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {isPatron && (
                <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-pink-500 font-semibold">Upload Center</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Share a New Resource</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Add links, videos, Python scripts, or documents for the club.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {([
                                { key: 'LINK', label: 'Link', desc: 'Articles, docs, tools' },
                                { key: 'VIDEO', label: 'Video', desc: 'Tutorials & talks' },
                                { key: 'PYTHON', label: 'Python', desc: '.py scripts' },
                                { key: 'DOCUMENT', label: 'Document', desc: 'PDFs, docs, notes' }
                            ] as const).map(option => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setType(option.key)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                                        type === option.key
                                            ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Python Lists Crash Course"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                <select id="category-select" value={category} onChange={e => setCategory(e.target.value as ResourceCategory)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500">
                                    <option value="Documentation">Documentation</option>
                                    <option value="Tutorial">Tutorial</option>
                                    <option value="Tool">Tool</option>
                                    <option value="Article">Article</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Description</label>
                            <textarea
                                placeholder="Add a short, helpful summary for members..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                                rows={3}
                                className="mt-1 w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                            {type === 'DOCUMENT' && selectedFile && (
                                <Tooltip text="Summarize the document into a short description.">
                                    <button
                                        type="button"
                                        onClick={handleGenerateDesc}
                                        disabled={isGeneratingDesc}
                                        className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300 px-2.5 py-1.5 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-all disabled:opacity-50"
                                    >
                                        {isGeneratingDesc ? (
                                            <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
                                        ) : (
                                            <SparklesIcon className="h-4 w-4" />
                                        )}
                                        {isGeneratingDesc ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="type-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource Type</label>
                                <select id="type-select" value={type} onChange={e => setType(e.target.value as ResourceType)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500">
                                    <option value="LINK">Link</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="PYTHON">Python File</option>
                                    <option value="DOCUMENT">Document</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="resource-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {(type === 'PYTHON' || type === 'DOCUMENT') ? `Upload File` : 'URL'}
                                </label>
                                {(type === 'PYTHON' || type === 'DOCUMENT') ? (
                                    <div className="relative">
                                         <input 
                                            id="file-input" 
                                            type="file" 
                                            accept={type === 'PYTHON' ? ".py" : ".pdf,.docx,.txt"}
                                            onChange={handleFileChange}
                                            className="hidden" 
                                        />
                                        <label
                                            htmlFor="file-input"
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`cursor-pointer flex items-center justify-between w-full px-3 py-2.5 border border-dashed rounded-xl transition-colors ${
                                                isDragging
                                                    ? 'border-pink-500 bg-pink-100/80 dark:bg-pink-900/40'
                                                    : 'border-pink-300 dark:border-pink-500/50 bg-pink-50/50 dark:bg-pink-900/20 hover:bg-pink-50 dark:hover:bg-pink-900/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {selectedFile && (type === 'PYTHON' ? <CodeIcon className="h-5 w-5 text-pink-500 flex-shrink-0" /> : <DocumentTextIcon className="h-5 w-5 text-pink-500 flex-shrink-0" />)}
                                                <div className="truncate">
                                                    <span className="text-gray-600 dark:text-gray-300 truncate">
                                                        {selectedFile ? selectedFile.name : 'Choose a file...'}
                                                    </span>
                                                    <span className="block text-[10px] text-gray-400">Drag & drop or click</span>
                                                </div>
                                            </div>
                                            <UploadIcon className="h-5 w-5 text-gray-400" />
                                        </label>
                                    </div>
                                ) : (
                                    <input id="url-input" type="url" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} required className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500" />
                                )}
                            </div>
                        </div>

                        {previewData && (
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Preview</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {previewData.hasFile ? 'File ready to upload' : 'Link preview'}
                                        </p>
                                    </div>
                                    {previewData.hasUrl && previewData.displayUrl && (
                                        <a
                                            href={previewData.displayUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-pink-500 hover:text-pink-600"
                                        >
                                            Open link
                                        </a>
                                    )}
                                </div>

                                {previewData.hasUrl && previewData.displayUrl && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">URL</p>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 break-all">{previewData.displayUrl}</p>
                                        {previewData.domain && (
                                            <p className="text-[11px] text-gray-400">Domain: {previewData.domain}</p>
                                        )}
                                    </div>
                                )}

                                {previewData.hasFile && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">File</p>
                                        <p className="text-sm text-gray-800 dark:text-gray-200">{previewData.fileName}</p>
                                        <p className="text-[11px] text-gray-400">{previewData.fileSize}</p>
                                    </div>
                                )}

                                {filePreviewText && (
                                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-xs text-gray-700 dark:text-gray-200 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                        {filePreviewText}
                                    </div>
                                )}

                                {pdfPreviewUrl && (
                                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                        <p className="text-[11px] text-gray-400 mb-2">PDF preview (first page)</p>
                                        <iframe
                                            src={`${pdfPreviewUrl}#page=1&zoom=80`}
                                            className="w-full h-48 rounded-md border border-gray-200 dark:border-gray-700"
                                            title="PDF preview"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <SparklesIcon className="h-4 w-4 text-pink-500" />
                                <span>Pro tip: add a short summary to help members pick quickly.</span>
                            </div>
                            <Tooltip text="Publish this resource to the club library.">
                                <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 font-semibold text-white bg-pink-600 rounded-xl shadow-md hover:bg-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    <PlusCircleIcon />
                                    <span>{isSubmitting ? 'Uploading...' : 'Add Resource'}</span>
                                </button>
                            </Tooltip>
                        </div>
                    </form>
                </div>
            )}
            
            {renderContent()}

            <ConfirmationModal 
                isOpen={!!resourceToDelete}
                onClose={() => setResourceToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Resource"
                message={`Are you sure you want to delete "${resourceToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                isDangerous
            />
        </div>
    );
};

export default Resources;
