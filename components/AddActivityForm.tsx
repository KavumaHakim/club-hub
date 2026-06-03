import React, { useState } from 'react';
import { Activity, ActivityCategory } from '../types';
import { useData } from '../DataContext';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import Tooltip from './Tooltip';

const AddActivityForm: React.FC<{ onAddActivity: (activity: Omit<Activity, 'id' | 'rsvpUserIds'>) => Promise<void> }> = ({ onAddActivity }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ActivityCategory>('OTHER');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showAlert } = useData();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date || !location || !description) {
            showAlert({
                title: 'Incomplete Form',
                message: 'Please fill out all fields.',
                type: 'warning'
            });
            return;
        }
        setIsSubmitting(true);
        try {
            await onAddActivity({ title, date, location, description, category });
            setTitle('');
            setDate('');
            setLocation('');
            setDescription('');
            setCategory('OTHER');
        } catch (error) {
            console.error("Failed to add activity", error);
            showAlert({
                title: 'Add Failed',
                message: 'Failed to add activity. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Add New Activity</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Activity Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    <input type="date" placeholder="Date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value as ActivityCategory)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        <option value="WORKSHOP">Workshop</option>
                        <option value="SOCIAL">Social</option>
                        <option value="COMPETITION">Competition</option>
                        <option value="GUEST_SPEAKER">Guest Speaker</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <div className="text-right">
                    <Tooltip text="Create a new club activity and notify members.">
                        <button type="submit" disabled={isSubmitting} className="flex items-center justify-center space-x-2 px-5 py-2 font-semibold text-white bg-sky-600 rounded-lg shadow-md hover:bg-sky-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <PlusCircleIcon />
                            <span>{isSubmitting ? 'Adding...' : 'Add Activity'}</span>
                        </button>
                    </Tooltip>
                </div>
            </form>
        </div>
    );
};

export default AddActivityForm;
