
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
        <div key={`empty-${i}`} className="bg-ch-surface min-h-[3rem] md:min-h-[4.5rem]"></div>
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
        <div key={d} className={`bg-ch-bg min-h-[3rem] md:min-h-[4.5rem] p-1 flex flex-col group transition-all duration-200 hover:bg-ch-surface relative border-t border-l border-ch-divider ${isToday ? 'bg-ch-accent-soft' : ''}`}>
          {isToday && <div className="absolute inset-0 border-2 border-ch-accent pointer-events-none z-0"></div>}
          
          <div className="flex justify-between items-start mb-0.5 z-10 relative">
             <div className={`text-[10px] sm:text-xs font-semibold h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center transition-colors ${isToday ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-text'}`}>
                {d}
             </div>
             {dayActivities.length > 0 && (
                 <span className="text-[8px] font-bold text-ch-on-accent bg-ch-accent px-1 py-px md:hidden">{dayActivities.length}</span>
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5 z-10 relative">
            {dayActivities.map(activity => (
              <div 
                key={activity.id} 
                className="text-[8px] sm:text-[9px] px-1 py-0.5 bg-ch-accent-soft text-ch-violet truncate border-l-2 border-ch-accent hover:bg-ch-accent-soft transition-all cursor-pointer leading-tight" 
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
    <div className="bg-ch-bg border border-ch-divider overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-2 sm:p-3 border-b border-ch-divider bg-ch-bg gap-2">
        <h3 className="text-base sm:text-[17px] font-extrabold tracking-[-0.01em] text-ch-text flex items-center">
           <span className="text-ch-accent mr-2">{monthNames[currentDate.getMonth()]}</span>
           <span className="text-ch-muted font-light">{currentDate.getFullYear()}</span>
        </h3>
        <div className="flex items-center border-2 border-ch-rule scale-90 origin-right">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-ch-surface text-ch-muted transition-all">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={handleToday}
            className="px-2 py-0.5 text-xs font-semibold text-ch-text hover:text-ch-accent transition-colors border-x border-ch-divider mx-1"
          >
            Today
          </button>
          <button onClick={handleNextMonth} className="p-1 hover:bg-ch-surface text-ch-muted transition-all">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 bg-ch-surface border-b border-ch-divider">
        {days.map(day => (
          <div key={day} className="py-1.5 text-center text-[9px] sm:text-[10px] font-bold text-ch-muted uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid - Using gap for borders technique */}
      <div className="grid grid-cols-7 bg-ch-surface-2 gap-px border-b border-r border-ch-divider">
        {renderCalendarDays()}
      </div>
    </div>
  );
};

export default CalendarView;
