

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Activity, User } from '../types';
import * as api from '../services/apiService';
import AddActivityForm from './AddActivityForm';
import ActivityCard from './ActivityCard';
import CalendarView from './CalendarView';
import { useData } from '../DataContext';
import { CalendarIcon } from './icons/CalendarIcon';
import { ViewListIcon } from './icons/ViewListIcon';
import { UsersIcon } from './icons/UsersIcon';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import Tooltip from './Tooltip';

interface ActivitiesProps {
  currentUser: User;
}

type FilterType = 'UPCOMING' | 'PAST' | 'ALL';

interface RSVPActionState {
    isOpen: boolean;
    activityId: string;
    activityTitle: string;
    isJoining: boolean;
}

interface AttendeesModalProps {
    isOpen: boolean;
    onClose: () => void;
    activityId: string;
    activities: Activity[];
    allUsers: User[];
}

const AttendeesModal: React.FC<AttendeesModalProps> = ({ isOpen, onClose, activityId, activities, allUsers }) => {
    if (!isOpen) return null;

    const activity = activities.find(a => a.id === activityId);
    if (!activity) return null;

    const attendees = allUsers.filter(u => activity.rsvpUserIds.includes(u.uid));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-1 transition-colors"
                >
                    <XIcon />
                </button>
                
                <div className="mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white pr-8">{activity.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full text-xs font-bold">
                            {attendees.length} Attendees
                        </span>
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {attendees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No one has RSVP'd yet.</p>
                        </div>
                    ) : (
                        attendees.map(user => (
                            <div key={user.uid} className="flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                <img 
                                    src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} 
                                    alt={user.name} 
                                    className="w-10 h-10 rounded-full mr-3 border border-gray-200 dark:border-gray-600 object-cover" 
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${user.role === 'PATRON' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                    {user.role}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const Activities: React.FC<ActivitiesProps> = ({ currentUser }) => {
  const { activities, isLoadingActivities, activitiesError, fetchActivities, allUsers, showToast } = useData();
  const [filter, setFilter] = useState<FilterType>('UPCOMING');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  
  // RSVP Confirmation State
  const [rsvpState, setRsvpState] = useState<RSVPActionState>({
      isOpen: false,
      activityId: '',
      activityTitle: '',
      isJoining: false
  });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, activityId: string } | null>(null);
  
  // View Attendees Modal State
  const [viewAttendeesState, setViewAttendeesState] = useState<{ isOpen: boolean, activityId: string | null }>({
      isOpen: false,
      activityId: null
  });

  // Delete Confirmation State
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  useEffect(() => {
      const handleClickOutside = () => {
          setContextMenu(null);
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, activityId: string) => {
      if (currentUser.role === 'PATRON') {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, activityId });
      }
  };

  const handleOpenAttendees = () => {
      if (contextMenu) {
          setViewAttendeesState({ isOpen: true, activityId: contextMenu.activityId });
          setContextMenu(null);
      }
  };

  const handleDeleteClick = () => {
      if (contextMenu) {
          const activity = activities.find(a => a.id === contextMenu.activityId);
          if (activity) {
              setActivityToDelete(activity);
          }
          setContextMenu(null);
      }
  };

  const confirmDelete = async () => {
      if (!activityToDelete) return;
      try {
          await api.deleteActivity(activityToDelete.id);
          await fetchActivities();
          showToast("Activity deleted successfully!", "success");
      } catch (error) {
          console.error("Failed to delete activity:", error);
          showToast("Failed to delete activity.", "error");
      } finally {
          setActivityToDelete(null);
      }
  };

  const handleAddActivity = useCallback(async (newActivity: Omit<Activity, 'id' | 'rsvpUserIds'>) => {
    await api.addActivity(newActivity, currentUser.uid);
    await fetchActivities(); // Refetch from context
    showToast("Activity added successfully!", "success");
  }, [fetchActivities, showToast, currentUser.uid]);

  const initiateRSVP = useCallback((activityId: string, isJoining: boolean) => {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      setRsvpState({
          isOpen: true,
          activityId,
          activityTitle: activity.title,
          isJoining
      });
  }, [activities]);

  const confirmRSVP = useCallback(async () => {
      try {
          await api.toggleRSVP(rsvpState.activityId, currentUser.uid, rsvpState.isJoining);
          await fetchActivities();
          showToast(rsvpState.isJoining ? "RSVP Confirmed!" : "RSVP Cancelled.", "success");
      } catch (error) {
          console.error("RSVP failed", error);
          showToast("Failed to update RSVP status.", "error");
      } finally {
          setRsvpState(prev => ({ ...prev, isOpen: false }));
      }
  }, [rsvpState.activityId, rsvpState.isJoining, currentUser.uid, fetchActivities, showToast]);

  const filteredAndSortedActivities = useMemo(() => {
    // Get today's date in EAT (YYYY-MM-DD)
    const todayEAT = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Kampala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());

    const filtered = activities.filter(activity => {
        // activity.date is YYYY-MM-DD string
        if (filter === 'UPCOMING') {
            return activity.date >= todayEAT;
        }
        if (filter === 'PAST') {
            return activity.date < todayEAT;
        }
        return true; // 'ALL'
    });

    // Sort logic using string comparison (works for YYYY-MM-DD)
    return filtered.sort((a, b) => {
        if (filter === 'UPCOMING') {
            // Upcoming: Soonest first (Ascending)
            return a.date.localeCompare(b.date);
        } else {
            // Past or All: Newest first (Descending)
            return b.date.localeCompare(a.date);
        }
    });
  }, [activities, filter]);

  const renderListContent = () => {
    if (isLoadingActivities) {
        return <p className="text-center text-gray-500 dark:text-gray-400 animate-pulse">Loading activities...</p>;
    }
    if (activitiesError) {
        return <p className="text-center text-red-500 dark:text-red-400 py-4 bg-red-50 dark:bg-red-900/10 rounded-lg">{`Error fetching activities: ${activitiesError}`}</p>;
    }
    if (filteredAndSortedActivities.length > 0) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedActivities.map((activity) => (
                    <ActivityCard 
                        key={activity.id} 
                        activity={activity} 
                        currentUser={currentUser}
                        onToggleRSVP={initiateRSVP}
                        onContextMenu={(e) => handleContextMenu(e, activity.id)}
                    />
                ))}
            </div>
        );
    }
    
    let emptyMessage = "No activities found.";
    if (filter === 'UPCOMING') emptyMessage = "No upcoming activities scheduled.";
    if (filter === 'PAST') emptyMessage = "No past activities found.";
    
    return <p className="text-center text-gray-500 dark:text-gray-400 py-10 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">{emptyMessage}</p>;
  };

  const getTitle = () => {
      if (viewMode === 'CALENDAR') return 'Activity Calendar';
      if (filter === 'UPCOMING') return 'Upcoming Activities';
      if (filter === 'PAST') return 'Past Activities';
      return 'All Activities';
  };

  return (
    <div>
        {currentUser.role === 'PATRON' && <AddActivityForm onAddActivity={handleAddActivity} />}

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                 <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                    {getTitle()}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                    {viewMode === 'LIST' 
                        ? `Showing ${filter.toLowerCase()} events` 
                        : 'Monthly overview of club events'}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                 {/* View Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl">
                    <Tooltip text="Switch to list view for detailed activity cards.">
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                                viewMode === 'LIST'
                                    ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                             <ViewListIcon />
                        </button>
                    </Tooltip>
                    <Tooltip text="Switch to calendar view for a monthly overview.">
                        <button
                            onClick={() => setViewMode('CALENDAR')}
                            className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                                viewMode === 'CALENDAR'
                                    ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <CalendarIcon />
                        </button>
                    </Tooltip>
                </div>

                {/* Filter Controls - Only visible in List Mode */}
                {viewMode === 'LIST' && (
                    <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl overflow-x-auto">
                         {(['UPCOMING', 'PAST', 'ALL'] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                                    filter === f
                                        ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                {f.charAt(0) + f.slice(1).toLowerCase()}
                            </button>
                         ))}
                    </div>
                )}
            </div>
        </div>

        {viewMode === 'LIST' ? renderListContent() : <CalendarView activities={activities} />}

        <ConfirmationModal
            isOpen={rsvpState.isOpen}
            onClose={() => setRsvpState(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmRSVP}
            title={rsvpState.isJoining ? "Join Activity" : "Cancel RSVP"}
            message={`Are you sure you want to ${rsvpState.isJoining ? "join" : "leave"} "${rsvpState.activityTitle}"?`}
            confirmText={rsvpState.isJoining ? "Confirm Join" : "Confirm Leave"}
            isDangerous={!rsvpState.isJoining}
        />
        
        <ConfirmationModal
            isOpen={!!activityToDelete}
            onClose={() => setActivityToDelete(null)}
            onConfirm={confirmDelete}
            title="Delete Activity"
            message={`Are you sure you want to permanently delete "${activityToDelete?.title}"? All RSVP data will also be removed.`}
            confirmText="Delete"
            isDangerous
        />

        {/* Context Menu */}
        {contextMenu && (
            <div 
                className="fixed z-50 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-1 border border-gray-200 dark:border-gray-700 min-w-[160px] animate-fade-in-up"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={handleOpenAttendees}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                    <UsersIcon className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">View Attendees</span>
                </button>
                 <button 
                    onClick={handleDeleteClick}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                    <span className="font-medium">Delete Activity</span>
                </button>
            </div>
        )}

        {/* View Attendees Modal */}
        {viewAttendeesState.activityId && (
            <AttendeesModal 
                isOpen={viewAttendeesState.isOpen}
                onClose={() => setViewAttendeesState({ isOpen: false, activityId: null })}
                activityId={viewAttendeesState.activityId}
                activities={activities}
                allUsers={allUsers}
            />
        )}
    </div>
  );
};

export default Activities;
