

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
import { PageIntro, RuledTabs } from './SplitKit';
import { SearchIcon } from './icons/SearchIcon';

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
            return <p className="text-center text-ch-muted">Loading resources...</p>;
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
                                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">{category}</h3>
                                <span className="text-xs text-ch-muted">{items.length} items</span>
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

        return <p className="text-center text-ch-muted py-4">No resources have been uploaded yet.</p>;
    };

    return (
        <div className="space-y-8">
            <div>
                <PageIntro
                    eyebrow="Club Library"
                    title="Explore the eLibrary"
                    description="Search curated tutorials, documents, videos, and tooling references. Save time with filters and smart previews."
                />

                {/* Search + sort strip, ruled like the Feed's */}
                <div className="mb-4 flex h-[46px] items-stretch border-2 border-ch-rule">
                    <label className="flex min-w-0 flex-1 items-center gap-2.5 px-4 [&_svg]:h-4 [&_svg]:w-4">
                        <span className="flex-none text-ch-muted"><SearchIcon /></span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search resources, authors, topics..."
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-ch-text placeholder-ch-muted focus:outline-none"
                        />
                    </label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        aria-label="Sort resources"
                        className="flex-none border-0 border-l border-ch-divider px-4 text-[11px] font-bold uppercase tracking-[0.08em] focus:outline-none"
                    >
                        <option value="Newest">Newest</option>
                        <option value="Oldest">Oldest</option>
                        <option value="A-Z">A-Z</option>
                    </select>
                </div>

                <RuledTabs
                    className="!mb-3"
                    tabs={(['All', 'Documentation', 'Tutorial', 'Tool', 'Article', 'Other'] as const).map(cat => ({ id: cat, label: cat }))}
                    active={selectedCategory as any}
                    onChange={(cat) => setSelectedCategory(cat as any)}
                />
                <RuledTabs
                    className="!mb-0"
                    tabs={(['All', 'LINK', 'VIDEO', 'PYTHON', 'DOCUMENT'] as const).map(kind => ({
                        id: kind,
                        label: kind === 'LINK' ? 'Link' : kind === 'VIDEO' ? 'Video' : kind === 'PYTHON' ? 'Python' : kind === 'DOCUMENT' ? 'Document' : 'All types',
                    }))}
                    active={selectedType as any}
                    onChange={(kind) => setSelectedType(kind as any)}
                />
            </div>

            {isPatron && (
                <div className="mb-8 border-2 border-ch-rule p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-ch-accent font-semibold">Upload Center</p>
                            <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text">Share a New Resource</h3>
                            <p className="text-sm text-ch-muted">Add links, videos, Python scripts, or documents for the club.</p>
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
                                    className={`px-4 py-2 text-xs font-semibold transition-colors ${
                                        type === option.key
                                            ? 'bg-ch-accent text-ch-on-accent'
                                            : 'bg-ch-surface text-ch-muted hover:bg-ch-surface-2'
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
                                <label className="text-xs font-semibold text-ch-muted">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Python Lists Crash Course"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 border border-ch-divider bg-ch-bg focus:outline-none focus:ring-2 focus:ring-ch-accent"
                                />
                            </div>
                            <div>
                                <label htmlFor="category-select" className="block text-sm font-medium text-ch-text mb-1">Category</label>
                                <select id="category-select" value={category} onChange={e => setCategory(e.target.value as ResourceCategory)} className="w-full px-3 py-2.5 border border-ch-divider bg-ch-bg focus:outline-none focus:ring-2 focus:ring-ch-accent">
                                    <option value="Documentation">Documentation</option>
                                    <option value="Tutorial">Tutorial</option>
                                    <option value="Tool">Tool</option>
                                    <option value="Article">Article</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="text-xs font-semibold text-ch-muted">Description</label>
                            <textarea
                                placeholder="Add a short, helpful summary for members..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                                rows={3}
                                className="mt-1 w-full px-3 py-2.5 border border-ch-divider bg-ch-bg focus:outline-none focus:ring-2 focus:ring-ch-accent"
                            />
                            {type === 'DOCUMENT' && selectedFile && (
                                <Tooltip text="Summarize the document into a short description.">
                                    <button
                                        type="button"
                                        onClick={handleGenerateDesc}
                                        disabled={isGeneratingDesc}
                                        className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-semibold text-ch-violet bg-ch-accent-soft px-2.5 py-1.5 hover:bg-ch-accent-soft transition-all disabled:opacity-50"
                                    >
                                        {isGeneratingDesc ? (
                                            <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent"></span>
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
                                <label htmlFor="type-select" className="block text-sm font-medium text-ch-text mb-1">Resource Type</label>
                                <select id="type-select" value={type} onChange={e => setType(e.target.value as ResourceType)} className="w-full px-3 py-2.5 border border-ch-divider bg-ch-bg focus:outline-none focus:ring-2 focus:ring-ch-accent">
                                    <option value="LINK">Link</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="PYTHON">Python File</option>
                                    <option value="DOCUMENT">Document</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="resource-input" className="block text-sm font-medium text-ch-text mb-1">
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
                                            className={`cursor-pointer flex items-center justify-between w-full px-3 py-2.5 border border-dashed transition-colors ${
                                                isDragging
                                                    ? 'border-ch-accent bg-ch-accent-soft'
                                                    : 'border-ch-divider bg-ch-accent-soft hover:bg-ch-accent-soft'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {selectedFile && (type === 'PYTHON' ? <CodeIcon className="h-5 w-5 text-ch-accent flex-shrink-0" /> : <DocumentTextIcon className="h-5 w-5 text-ch-accent flex-shrink-0" />)}
                                                <div className="truncate">
                                                    <span className="text-ch-muted truncate">
                                                        {selectedFile ? selectedFile.name : 'Choose a file...'}
                                                    </span>
                                                    <span className="block text-[10px] text-ch-muted">Drag & drop or click</span>
                                                </div>
                                            </div>
                                            <UploadIcon className="h-5 w-5 text-ch-muted" />
                                        </label>
                                    </div>
                                ) : (
                                    <input id="url-input" type="url" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} required className="w-full px-3 py-2.5 border border-ch-divider bg-ch-bg focus:outline-none focus:ring-2 focus:ring-ch-accent" />
                                )}
                            </div>
                        </div>

                        {previewData && (
                            <div className="border border-ch-divider bg-ch-surface p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-ch-muted">Preview</p>
                                        <p className="text-sm font-semibold text-ch-text">
                                            {previewData.hasFile ? 'File ready to upload' : 'Link preview'}
                                        </p>
                                    </div>
                                    {previewData.hasUrl && previewData.displayUrl && (
                                        <a
                                            href={previewData.displayUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-ch-accent hover:text-ch-accent"
                                        >
                                            Open link
                                        </a>
                                    )}
                                </div>

                                {previewData.hasUrl && previewData.displayUrl && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-ch-muted">URL</p>
                                        <p className="text-sm text-ch-text break-all">{previewData.displayUrl}</p>
                                        {previewData.domain && (
                                            <p className="text-[11px] text-ch-muted">Domain: {previewData.domain}</p>
                                        )}
                                    </div>
                                )}

                                {previewData.hasFile && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-ch-muted">File</p>
                                        <p className="text-sm text-ch-text">{previewData.fileName}</p>
                                        <p className="text-[11px] text-ch-muted">{previewData.fileSize}</p>
                                    </div>
                                )}

                                {filePreviewText && (
                                    <div className="border border-ch-divider bg-ch-bg p-3 text-xs text-ch-text font-mono whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                        {filePreviewText}
                                    </div>
                                )}

                                {pdfPreviewUrl && (
                                    <div className="border border-ch-divider bg-ch-bg p-3">
                                        <p className="text-[11px] text-ch-muted mb-2">PDF preview (first page)</p>
                                        <iframe
                                            src={`${pdfPreviewUrl}#page=1&zoom=80`}
                                            className="w-full h-48 border border-ch-divider"
                                            title="PDF preview"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">{error}</div>}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-ch-muted">
                                <SparklesIcon className="h-4 w-4 text-ch-accent" />
                                <span>Pro tip: add a short summary to help members pick quickly.</span>
                            </div>
                            <Tooltip text="Publish this resource to the club library.">
                                <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 font-semibold text-ch-on-accent bg-ch-accent hover:bg-ch-accent-deep transition-all disabled:opacity-50 disabled:cursor-not-allowed">
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
