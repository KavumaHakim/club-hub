

import React, { useMemo, useEffect, useRef } from 'react';
import { User, Tab } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { XIcon } from './icons/XIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ChevronsLeftIcon } from './icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from './icons/ChevronsRightIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { useData } from '../DataContext';
import Notifications from './Notifications';


interface SidebarProps {
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NavLink: React.FC<{
    tabName: Tab;
    label: string;
    icon: React.ReactNode;
    activeTab: Tab;
    onClick: (tab: Tab) => void;
    isCollapsed: boolean;
    badge?: number;
  }> = ({ tabName, label, icon, activeTab, onClick, isCollapsed, badge }) => {
    const isActive = activeTab === tabName;
    
    return (
    <li>
      <button
        onClick={() => onClick(tabName)}
        title={isCollapsed ? label : undefined}
        className={`group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-out ${isCollapsed ? 'justify-center' : 'space-x-3'} ${
          isActive
            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/25'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <div className={`relative flex items-center justify-center transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
            {isCollapsed && badge !== undefined && badge > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 text-[9px] font-bold text-white bg-pink-500 rounded-full border border-white dark:border-gray-800 px-0.5 shadow-sm">
                    {badge > 9 ? '!' : badge}
                </span>
            )}
        </div>
        {!isCollapsed && (
            <span className="whitespace-nowrap flex-1 text-left tracking-wide">{label}</span>
        )}
        {!isCollapsed && badge !== undefined && badge > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                isActive 
                ? 'bg-white/20 text-white' 
                : 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
            }`}>
                {badge > 99 ? '99+' : badge}
            </span>
        )}
      </button>
    </li>
    );
};

const ClubHubLogo = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 flex-shrink-0 filter drop-shadow-sm">
    <defs>
      <linearGradient id="club_hub_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EC4899" stopOpacity="1" />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#club_hub_grad)"/>
    <text x="50%" y="54%" dominantBaseline="central" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="26" fontWeight="900" fill="white" letterSpacing="-1">
      ICH
    </text>
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, theme, onToggleTheme, activeTab, setActiveTab, isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { unreadMessageCounts } = useData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const totalUnread = useMemo(() => {
      return Object.values(unreadMessageCounts).reduce((acc: number, count: number) => acc + count, 0);
  }, [unreadMessageCounts]);

  // Matrix Animation Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Resize observer to handle robust resizing
    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
        }
    });
    
    if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
    }

    // Initial size
    canvas.width = canvas.parentElement?.clientWidth || 0;
    canvas.height = canvas.parentElement?.clientHeight || 0;

    const columns = Math.floor(canvas.width / 20) + 1;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Random start positions above canvas
    }

    const characters = "01ICTCLUBHUB<>/{};[]";
    
    const draw = () => {
      // Fade out effect for trails (Darker/Lighter background based on theme to simulate fade)
      ctx.fillStyle = theme === 'dark' ? 'rgba(17, 24, 39, 0.1)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set text color (Pink/Purple)
      ctx.fillStyle = theme === 'dark' ? '#ec4899' : '#c026d3'; // Pink-500 / Fuchsia-700
      ctx.font = '14px monospace'; // Slightly larger font

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        const x = i * 20;
        const y = drops[i] * 20;

        // Draw the character only if it's within view
        if (y > 0 && y < canvas.height) {
            // Increased alpha range for better visibility
            ctx.globalAlpha = Math.random() * 0.5 + 0.5; 
            ctx.fillText(text, x, y);
            ctx.globalAlpha = 1.0;
        }

        // Reset drop to top randomly after it crosses screen
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
      
      // Loop via setTimeout for animation
      setTimeout(() => {
          animationFrameId = requestAnimationFrame(draw);
      }, 50);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [theme]); 

  const handleNavClick = (tab: Tab) => {
    setActiveTab(tab);
    // This will close the sidebar on mobile after navigation
    if (isOpen && window.innerWidth < 768) {
      onClose();
    }
  };

  // Grouped Navigation Structure
  const navGroups = [
      {
          title: "General",
          items: [
              { tab: 'feed' as Tab, label: 'Feed', icon: <HomeIcon /> },
              { tab: 'chat' as Tab, label: 'Messages', icon: <ChatBubbleIcon />, badge: totalUnread },
              { tab: 'suggestions' as Tab, label: 'Suggestions', icon: <LightBulbIcon /> },
          ]
      },
      {
          title: "Manage",
          items: [
              { tab: 'activities' as Tab, label: 'Activities', icon: <CalendarIcon /> },
              { tab: 'projects' as Tab, label: 'Projects', icon: <ClipboardListIcon /> },
              { tab: 'attendance' as Tab, label: 'Attendance', icon: <CheckCircleIcon /> },
          ]
      },
      {
          title: "Learn & Share",
          items: [
              { tab: 'resources' as Tab, label: 'Resources', icon: <BookOpenIcon /> },
              { tab: 'playground' as Tab, label: 'Playground', icon: <CodeIcon /> },
              { tab: 'showcase' as Tab, label: 'Showcase', icon: <GlobeIcon /> },
          ]
      },
      {
          title: "Account",
          items: [
              // Only show Members for Patron
              ...(user.role === 'PATRON' ? [{ tab: 'members' as Tab, label: 'Members', icon: <UsersIcon /> }] : []),
              { tab: 'profile' as Tab, label: 'Profile', icon: <IdentificationIcon /> },
          ]
      }
  ];

  return (
    <>
      {/* Overlay for mobile view */}
      <div
        className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen transform transition-all md:transition-all duration-300 ease-in-out md:sticky md:top-0 ${isCollapsed ? 'md:w-[5.5rem]' : 'w-72'} ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed inset-y-0 left-0 z-30 shadow-2xl md:shadow-none overflow-hidden`}>
        
        {/* Matrix Background Canvas - Increased Opacity to 30% */}
        <canvas 
            ref={canvasRef}
            className="absolute inset-0 z-0 opacity-30 pointer-events-none"
        />

        {/* Header */}
        <div className={`flex items-center h-20 flex-shrink-0 px-6 relative z-10 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
             <ClubHubLogo />
             {!isCollapsed && (
                 <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                        Club<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Hub</span>
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-widest uppercase mt-0.5">Naggalama</span>
                 </div>
             )}
          </div>
          {!isCollapsed && (
              <button onClick={onClose} className="p-1.5 rounded-lg md:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close menu">
                <XIcon />
              </button>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6 relative z-10">
            {navGroups.map((group, groupIndex) => (
                <div key={group.title}>
                    {!isCollapsed && (
                        <h3 className="px-3 mb-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            {group.title}
                        </h3>
                    )}
                    {isCollapsed && groupIndex > 0 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2 my-2"></div>}
                    
                    <ul className="space-y-1">
                        {group.items.map(item => (
                            <NavLink 
                                key={item.tab}
                                tabName={item.tab} 
                                label={item.label} 
                                icon={item.icon} 
                                activeTab={activeTab} 
                                onClick={handleNavClick} 
                                isCollapsed={isCollapsed}
                                badge={item.badge}
                            />
                        ))}
                    </ul>
                </div>
            ))}
        </nav>

        {/* Footer */}
        <div className="p-4 relative z-10">
          {/* Collapse Toggle (Desktop) */}
          <div className="hidden md:flex justify-end mb-4">
            <button
                onClick={onToggleCollapse}
                className="p-1.5 text-gray-400 hover:text-pink-600 dark:text-gray-500 dark:hover:text-pink-400 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {isCollapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
            </button>
          </div>

          <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col justify-center' : ''}`}>
             <div className="relative group cursor-pointer" onClick={() => handleNavClick('profile')}>
                <div className={`absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}></div>
                <img 
                    src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} 
                    alt={user.name} 
                    className="relative w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 object-cover" 
                />
             </div>
             
             {!isCollapsed && (
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleNavClick('profile')}>
                    <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate leading-tight group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                </div>
             )}
          </div>

          {/* Action Row */}
          <div className={`mt-4 flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between gap-2'}`}>
             <button
                onClick={onToggleTheme}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-amber-500 dark:hover:text-amber-400 shadow-sm hover:shadow transition-all"
                title="Toggle Theme"
             >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
             </button>
             
             <div className={isCollapsed ? '' : 'mx-auto'}>
                <Notifications currentUser={user} setActiveTab={setActiveTab} isSidebarCollapsed={isCollapsed} />
             </div>

             <button
                onClick={onLogout}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-red-500 dark:hover:text-red-400 shadow-sm hover:shadow transition-all"
                title="Logout"
             >
                <LogoutIcon />
             </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;