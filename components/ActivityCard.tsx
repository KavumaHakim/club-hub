import React from 'react';
import { Activity } from '../types';

const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{activity.title}</h3>
      <span className="text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full">{activity.date}</span>
    </div>
    <p className="text-gray-500 dark:text-gray-400 mb-4">{activity.location}</p>
    <p className="text-gray-600 dark:text-gray-300">{activity.description}</p>
  </div>
);

export default React.memo(ActivityCard);
