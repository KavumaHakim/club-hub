
import React, { useRef, useEffect } from 'react';
import { Activity, User } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Kampala',
      timeZoneName: 'short'
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

const categoryStyles = {
    'WORKSHOP': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'SOCIAL': 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    'COMPETITION': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'GUEST_SPEAKER': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'OTHER': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

interface ActivityCardProps {
    activity: Activity;
    currentUser?: User; // Optional only to support legacy usages if any, but logically required for RSVP
    onToggleRSVP?: (id: string, isJoining: boolean) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, currentUser, onToggleRSVP, onContextMenu }) => {
  const categoryStyle = categoryStyles[activity.category] || categoryStyles['OTHER'];
  const rsvpCount = activity.rsvpUserIds ? activity.rsvpUserIds.length : 0;
  const isAttending = currentUser && activity.rsvpUserIds && activity.rsvpUserIds.includes(currentUser.uid);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible');
          observer.unobserve(element);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={cardRef}
      onContextMenu={onContextMenu}
      className="scroll-animate group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-1 hover:border-sky-200 dark:hover:border-sky-900/50 relative overflow-hidden flex flex-col h-full"
    >
      
      {/* Category Badge */}
      <div className="absolute top-4 right-4 z-10">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide ${categoryStyle}`}>
              {activity.category.replace('_', ' ')}
          </span>
      </div>

      <div className="relative z-10 flex-1">
          <div className="mb-4 pr-16"> {/* pr-16 to avoid overlapping with absolute badge */}
             <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-2">
                 {activity.title}
            </h3>
             <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">
                {formatDate(activity.date)}
             </span>
          </div>
          
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-750 p-2 rounded-lg inline-flex max-w-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group/location"
            title="View on Google Maps"
          >
              <svg className="w-4 h-4 mr-2 text-sky-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span className="font-medium truncate group-hover/location:text-sky-600 dark:group-hover/location:text-sky-400 underline decoration-dotted decoration-gray-400 underline-offset-2">{activity.location}</span>
          </a>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm line-clamp-3 group-hover:line-clamp-none transition-all duration-300 mb-4">{activity.description}</p>
      </div>

      {/* Footer: RSVP Section */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
             <div className="flex -space-x-1 overflow-hidden">
                 {/* Fake Avatars based on count */}
                 {[...Array(Math.min(3, rsvpCount))].map((_, i) => (
                     <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[8px] font-bold">
                         {/* Simple placeholder */}
                     </div>
                 ))}
             </div>
             <span>{rsvpCount} Going</span>
          </div>
          
          {currentUser && onToggleRSVP && (
              <button 
                onClick={() => onToggleRSVP(activity.id, !isAttending)}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 ${
                    isAttending 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                  {isAttending && <CheckCircleIcon className="w-4 h-4" />}
                  {isAttending ? 'Attending' : 'RSVP'}
              </button>
          )}
      </div>
    </div>
  );
};

export default React.memo(ActivityCard);