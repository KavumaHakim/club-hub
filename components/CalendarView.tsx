import React, { useState } from 'react';
import { Activity } from '../types';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface CalendarViewProps {
  activities: Activity[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ activities }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
      setCurrentDate(new Date());
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar grid
  const renderCalendarDays = () => {
    const totalDays = daysInMonth(currentDate);
    const startDay = startDayOfMonth(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const calendarDays = [];
    
    // Empty cells for previous month
    for (let i = 0; i < startDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50 dark:bg-gray-800/30 border-r border-b border-gray-100 dark:border-gray-700/50"></div>
      );
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      // Format: YYYY-MM-DD
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayActivities = activities.filter(a => a.date === dateString);
      
      const todayDate = new Date();
      const isToday = todayDate.getDate() === d && todayDate.getMonth() === month && todayDate.getFullYear() === year;

      calendarDays.push(
        <div key={d} className={`h-24 md:h-32 border-r border-b border-gray-100 dark:border-gray-700 p-2 relative group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isToday ? 'bg-pink-50 dark:bg-pink-900/10' : 'bg-white dark:bg-gray-800'}`}>
          <div className="flex justify-between items-start mb-1">
             <div className={`text-sm font-semibold h-7 w-7 flex items-center justify-center rounded-full ${isToday ? 'bg-pink-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {d}
             </div>
             {dayActivities.length > 0 && (
                 <span className="text-xs text-gray-400 font-medium md:hidden">{dayActivities.length}</span>
             )}
          </div>
          
          <div className="overflow-y-auto max-h-[calc(100%-2rem)] space-y-1 custom-scrollbar">
            {dayActivities.map(activity => (
              <div 
                key={activity.id} 
                className="text-xs px-1.5 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 truncate cursor-pointer hover:opacity-80 transition-opacity border-l-2 border-purple-500" 
                title={`${activity.title} (${activity.location})`}
              >
                {activity.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return calendarDays;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 mr-2"
          >
            Today
          </button>
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
            <ChevronLeftIcon />
          </button>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {days.map(day => (
          <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-100 dark:border-gray-700">
        {renderCalendarDays()}
      </div>
    </div>
  );
};

export default CalendarView;