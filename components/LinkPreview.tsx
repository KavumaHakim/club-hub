
import React, { useState } from 'react';
import { LinkIcon } from './icons/LinkIcon';

interface LinkPreviewProps {
    url: string;
    onImageClick?: (url: string) => void;
    size?: 'normal' | 'compact';
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url, onImageClick, size = 'normal' }) => {
    const [imgError, setImgError] = useState(false);
    const isCompact = size === 'compact';
    
    // Check for image extensions
    const isImage = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(url);

    // Only show large image previews in 'normal' mode
    if (isImage && !imgError && !isCompact) {
        return (
            <div 
                className="block mt-3 mb-2 cursor-zoom-in relative group rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow" 
                onClick={(e) => {
                    e.stopPropagation();
                    if (onImageClick) {
                        onImageClick(url);
                    } else {
                        window.open(url, '_blank');
                    }
                }}
            >
                <img 
                    src={url} 
                    alt="Shared content" 
                    className="max-w-full max-h-80 object-cover bg-gray-100 dark:bg-gray-700 w-full" 
                    onError={() => setImgError(true)}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none"></div>
            </div>
        );
    }

    let domain = '';
    try {
        domain = new URL(url).hostname.replace('www.', '');
    } catch (e) {
        domain = 'External Link';
    }

    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`flex items-center gap-3 mt-2 mb-1 border rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-all group w-full max-w-full overflow-hidden hover:shadow-md hover:-translate-y-0.5 duration-200
                ${isCompact ? 'p-2 bg-gray-50/50 dark:bg-gray-700/30 border-gray-200/50 dark:border-gray-600/50' : 'p-3 bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-600 backdrop-blur-sm'}
            `}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`rounded-lg text-gray-500 dark:text-gray-300 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors flex-shrink-0 shadow-sm
                ${isCompact ? 'p-2 bg-white/50 dark:bg-gray-700/50' : 'p-3 bg-white dark:bg-gray-700'}
            `}>
                <LinkIcon />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden text-left">
                <p className={`font-semibold text-gray-900 dark:text-gray-200 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors ${isCompact ? 'text-xs' : 'text-sm'}`}>{url}</p>
                <p className={`text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-1.5"></span>
                    {domain}
                </p>
            </div>
        </a>
    );
};

export default LinkPreview;
