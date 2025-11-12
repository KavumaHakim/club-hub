import React, { useState } from 'react';
import { Activity } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

const AddActivityForm: React.FC<{ onAddActivity: (activity: Omit<Activity, 'id'>) => Promise<void> }> = ({ onAddActivity }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date || !location || !description) {
            alert('Please fill out all fields.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onAddActivity({ title, date, location, description });
            setTitle('');
            setDate('');
            setLocation('');
            setDescription('');
        } catch (error) {
            console.error("Failed to add activity", error);
            alert("Failed to add activity. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Add New Activity</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Activity Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                    <input type="date" placeholder="Date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
                <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" />
                <div className="text-right">
                    <button type="submit" disabled={isSubmitting} className="flex items-center justify-center space-x-2 px-5 py-2 font-semibold text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <PlusCircleIcon />
                        <span>{isSubmitting ? 'Adding...' : 'Add Activity'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddActivityForm;
