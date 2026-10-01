
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
                className="block mt-3 mb-2 cursor-zoom-in relative group overflow-hidden transition-shadow" 
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
                    className="max-w-full max-h-80 object-cover bg-ch-surface w-full" 
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
            className={`flex items-center gap-3 mt-2 mb-1 border hover:bg-ch-surface transition-all group w-full max-w-full overflow-hidden duration-200
                ${isCompact ? 'p-2 bg-ch-surface border-ch-divider' : 'p-3 bg-ch-surface border-ch-divider'}
            `}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`text-ch-muted group-hover:text-ch-accent transition-colors flex-shrink-0
                ${isCompact ? 'p-2 bg-white/50' : 'p-3 bg-ch-bg'}
            `}>
                <LinkIcon />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden text-left">
                <p className={`font-semibold text-ch-text truncate group-hover:text-ch-accent transition-colors ${isCompact ? 'text-xs' : 'text-sm'}`}>{url}</p>
                <p className={`text-ch-muted truncate mt-0.5 flex items-center ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                    <span className="w-1.5 h-1.5 bg-gray-400 mr-1.5"></span>
                    {domain}
                </p>
            </div>
        </a>
    );
};

export default LinkPreview;
