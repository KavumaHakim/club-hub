import React from 'react';
import { FeedItem, FeedItemType } from '../types';
import { HeartIcon } from './icons/HeartIcon';

const badgeMap: { [key in FeedItemType]: {
    text: string;
    style: string;
    borderColor: string;
    ringColor: string;
    lineColor: string;
} } = {
  EVENT_ANNOUNCEMENT: {
    text: 'Event',
    style: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    borderColor: 'border-purple-500',
    ringColor: 'ring-purple-500/50',
    lineColor: 'bg-purple-400'
  },
  MEMBER_POST: {
    text: 'Post',
    style: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    borderColor: 'border-pink-500',
    ringColor: 'ring-pink-500/50',
    lineColor: 'bg-pink-400'
  },
  NEWS_UPDATE: {
    text: 'News',
    style: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    borderColor: 'border-blue-500',
    ringColor: 'ring-blue-500/50',
    lineColor: 'bg-blue-400'
  },
};

interface FeedItemCardProps {
  item: FeedItem;
  onLike: (id: string) => void;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, onLike }) => {
  const badge = badgeMap[item.type];
  
  return (
    <div className="relative pl-14">
      {/* Timeline Avatar and Line */}
      <div className="absolute left-0 top-0 flex flex-col items-center h-full">
        <div className={`w-10 h-10 bg-white dark:bg-gray-800 rounded-full ring-4 ${badge.ringColor} flex-shrink-0`}>
            <img src={item.authorAvatarUrl} alt={item.author} className="w-full h-full rounded-full" />
        </div>
        <div className={`w-0.5 flex-grow ${badge.lineColor} mt-1`}></div>
      </div>

      {/* Content Card */}
      <div className="mb-8">
        <div className={`bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-lg border-t-4 ${badge.borderColor}`}>
          {/* Card Header */}
          <div className="flex items-center mb-3">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.author}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</p>
              </div>
          </div>
          
          {/* Card Body */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {item.title && <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h3>}
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{item.message}</p>
          </div>
         
          {/* Card Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
             <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${badge.style}`}>
                {badge.text}
             </span>
            {item.type === 'MEMBER_POST' && (
                <button
                    onClick={() => onLike(item.id)}
                    className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors focus:outline-none group"
                    aria-label="Like post"
                >
                    <HeartIcon className="group-hover:fill-red-200 dark:group-hover:fill-red-900/50" />
                    <span className="text-sm font-medium">{item.likes || 0}</span>
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FeedItemCard);
