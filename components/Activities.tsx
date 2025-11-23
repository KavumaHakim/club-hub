import React, { useCallback, useState, useMemo } from 'react';
import { Activity, User } from '../types';
import * as api from '../services/apiService';
import AddActivityForm from './AddActivityForm';
import ActivityCard from './ActivityCard';
import CalendarView from './CalendarView';
import { useData } from '../DataContext';
import { CalendarIcon } from './icons/CalendarIcon';
import { ViewListIcon } from './icons/ViewListIcon';

interface ActivitiesProps {
  currentUser: User;
}

type FilterType = 'UPCOMING' | 'PAST' | 'ALL';

const Activities: React.FC<ActivitiesProps> = ({ currentUser }) => {
  const { activities, isLoadingActivities, activitiesError, fetchActivities } = useData();
  const [filter, setFilter] = useState<FilterType>('UPCOMING');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

  const handleAddActivity = useCallback(async (newActivity: Omit<Activity, 'id'>) => {
    await api.addActivity(newActivity);
    await fetchActivities(); // Refetch from context
  }, [fetchActivities]);

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
        return <p className="text-center text-gray-500 dark:text-gray-400">Loading activities...</p>;
    }
    if (activitiesError) {
        return <p className="text-center text-red-500 dark:text-red-400 py-4">{`Error fetching activities: ${activitiesError}`}</p>;
    }
    if (filteredAndSortedActivities.length > 0) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedActivities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                ))}
            </div>
        );
    }
    
    let emptyMessage = "No activities found.";
    if (filter === 'UPCOMING') emptyMessage = "No upcoming activities scheduled.";
    if (filter === 'PAST') emptyMessage = "No past activities found.";
    
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">{emptyMessage}</p>;
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                {getTitle()}
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                 {/* View Toggle */}
                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg self-start sm:self-auto">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`p-2 rounded-md transition-all ${
                            viewMode === 'LIST'
                                ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                        }`}
                        title="List View"
                    >
                         <ViewListIcon />
                    </button>
                    <button
                        onClick={() => setViewMode('CALENDAR')}
                        className={`p-2 rounded-md transition-all ${
                            viewMode === 'CALENDAR'
                                ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                        }`}
                        title="Calendar View"
                    >
                        <CalendarIcon />
                    </button>
                </div>

                {/* Filter Controls - Only visible in List Mode */}
                {viewMode === 'LIST' && (
                    <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg self-start sm:self-auto">
                        <button
                            onClick={() => setFilter('UPCOMING')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                filter === 'UPCOMING'
                                    ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                            }`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setFilter('PAST')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                filter === 'PAST'
                                    ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                            }`}
                        >
                            Past
                        </button>
                        <button
                            onClick={() => setFilter('ALL')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                filter === 'ALL'
                                    ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                            }`}
                        >
                            All
                        </button>
                    </div>
                )}
            </div>
        </div>

        {viewMode === 'LIST' ? renderListContent() : <CalendarView activities={activities} />}
    </div>
  );
};

export default Activities;