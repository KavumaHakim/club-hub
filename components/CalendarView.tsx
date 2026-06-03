
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

  const normalizeDate = (dateStr: string) => {
      if (!dateStr) return '';
      // Takes YYYY-MM-DD from start of string (works for ISO T-separated too)
      return dateStr.split('T')[0];
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
        <div key={`empty-${i}`} className="bg-gray-50 dark:bg-gray-800/40 min-h-[3rem] md:min-h-[4.5rem]"></div>
      );
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      // Format: YYYY-MM-DD
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayActivities = activities.filter(a => normalizeDate(a.date) === dateString);
      
      const todayDate = new Date();
      const isToday = todayDate.getDate() === d && todayDate.getMonth() === month && todayDate.getFullYear() === year;

      calendarDays.push(
        <div key={d} className={`bg-white dark:bg-gray-800 min-h-[3rem] md:min-h-[4.5rem] p-1 flex flex-col group transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-750 relative border-t border-l border-gray-100 dark:border-gray-700/50 ${isToday ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}>
          {isToday && <div className="absolute inset-0 border-2 border-sky-500 pointer-events-none z-0"></div>}
          
          <div className="flex justify-between items-start mb-0.5 z-10 relative">
             <div className={`text-[10px] sm:text-xs font-semibold h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-sky-500 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300'}`}>
                {d}
             </div>
             {dayActivities.length > 0 && (
                 <span className="text-[8px] font-bold text-white bg-sky-500 px-1 py-px rounded-full shadow-sm md:hidden">{dayActivities.length}</span>
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5 z-10 relative">
            {dayActivities.map(activity => (
              <div 
                key={activity.id} 
                className="text-[8px] sm:text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 truncate border-l-2 border-purple-500 shadow-sm hover:shadow hover:bg-purple-200 dark:hover:bg-purple-900/80 transition-all cursor-pointer leading-tight" 
                title={`${activity.title}\n📍 ${activity.location}`}
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-2 sm:p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-2">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
           <span className="text-sky-600 dark:text-sky-400 mr-2">{monthNames[currentDate.getMonth()]}</span>
           <span className="text-gray-500 dark:text-gray-400 font-light">{currentDate.getFullYear()}</span>
        </h3>
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg scale-90 origin-right">
          <button onClick={handlePrevMonth} className="p-1 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={handleToday}
            className="px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors border-x border-gray-200 dark:border-gray-600 mx-1"
          >
            Today
          </button>
          <button onClick={handleNextMonth} className="p-1 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {days.map(day => (
          <div key={day} className="py-1.5 text-center text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid - Using gap for borders technique */}
      <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-700 gap-px border-b border-r border-gray-200 dark:border-gray-700">
        {renderCalendarDays()}
      </div>
    </div>
  );
};

export default CalendarView;
