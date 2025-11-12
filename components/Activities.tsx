import React, { useState, useCallback } from 'react';
import { Activity, User } from '../types';
import { generateActivityIdeas } from '../services/geminiService';
import * as api from '../services/apiService';
import { SparklesIcon } from './icons/SparklesIcon';
import AddActivityForm from './AddActivityForm';
import ActivityCard from './ActivityCard';
import { useData } from '../DataContext';

interface ActivitiesProps {
  currentUser: User;
}

interface ActivityIdea {
  idea: string;
  description: string;
}

const Activities: React.FC<ActivitiesProps> = ({ currentUser }) => {
  const { activities, isLoadingActivities, fetchActivities } = useData();

  // State for AI idea generation remains local
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedContent, setGeneratedContent] = useState<{ ideas: ActivityIdea[]; sources: any[] } | null>(null);
  const [isIdeasLoading, setIsIdeasLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);


  const handleAddActivity = useCallback(async (newActivity: Omit<Activity, 'id'>) => {
    await api.addActivity(newActivity);
    await fetchActivities(); // Refetch from context
  }, [fetchActivities]);

  const handleGenerateIdeas = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsIdeasLoading(true);
    setError(null);
    setGeneratedContent(null);
    try {
      const result = await generateActivityIdeas(searchQuery);
      setGeneratedContent(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsIdeasLoading(false);
    }
  }, [searchQuery]);

  return (
    <div>
        {currentUser.role === 'PATRON' && <AddActivityForm onAddActivity={handleAddActivity} />}

        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Research Activity Ideas</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Get up-to-date and creative ideas for your next club event, powered by Google Search.</p>
             <form onSubmit={handleGenerateIdeas} className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                 <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., 'latest web dev trends' or 'robotics workshop'"
                    className="flex-grow w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    disabled={isIdeasLoading}
                />
                <button
                    type="submit"
                    disabled={isIdeasLoading || !searchQuery.trim()}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <SparklesIcon />
                    <span>{isIdeasLoading ? 'Researching...' : 'Get Ideas'}</span>
                </button>
            </form>
            {error && <p className="mt-4 text-red-500 dark:text-red-400 text-center">{error}</p>}
            {generatedContent && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Here are some ideas:</h4>
                    {generatedContent.ideas && generatedContent.ideas.length > 0 ? (
                        <div className="space-y-4">
                            {generatedContent.ideas.map((item, index) => (
                                <div key={index} className="p-3 bg-white dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
                                    <p className="font-semibold text-pink-600 dark:text-pink-400">{item.idea}</p>
                                    <p className="text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                                </div>
                            ))}
                        </div>
                     ) : (
                        <p className="text-gray-500 dark:text-gray-400">The AI couldn't come up with ideas for that topic. Try being more specific!</p>
                     )}
                     {generatedContent.sources && generatedContent.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                            <h5 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">Sources from Google Search:</h5>
                            <ul className="list-disc list-inside space-y-1">
                                {generatedContent.sources.map((source, index) => (
                                    source.web && <li key={index}>
                                        <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline dark:text-pink-400 text-sm">
                                            {source.web.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>

        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Upcoming Activities</h2>
        {isLoadingActivities ? (
             <p className="text-center text-gray-500 dark:text-gray-400">Loading activities...</p>
        ) : activities.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                ))}
            </div>
        ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">No activities have been added yet.</p>
        )}
    </div>
  );
};

export default Activities;
