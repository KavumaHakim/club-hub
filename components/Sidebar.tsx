
import React from 'react';
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
  }> = ({ tabName, label, icon, activeTab, onClick, isCollapsed }) => (
    <li>
      <button
        onClick={() => onClick(tabName)}
        title={label}
        className={`flex items-center w-full space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isCollapsed ? 'justify-center' : ''} ${
          activeTab === tabName
            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {icon}
        {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
      </button>
    </li>
);

const ClubHubLogo = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 flex-shrink-0">
    <defs>
      <linearGradient id="club_hub_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EC4899" stopOpacity="1" />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#club_hub_grad)"/>
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" fill="white">
      ICH
    </text>
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, theme, onToggleTheme, activeTab, setActiveTab, isOpen, onClose, isCollapsed, onToggleCollapse }) => {

  const handleNavClick = (tab: Tab) => {
    setActiveTab(tab);
    // This will close the sidebar on mobile after navigation
    if (isOpen) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile view */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen transform transition-transform md:transition-width duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 ${isCollapsed ? 'md:w-20' : 'w-64'} ${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30`}>
        {/* Header */}
        <div className={`flex items-center h-16 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
             <ClubHubLogo />
             {!isCollapsed && (
                 <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 whitespace-nowrap">
                    Club Hub
                 </span>
             )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md md:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close menu">
            <XIcon />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            <NavLink tabName="feed" label="Feed" icon={<HomeIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="activities" label="Activities" icon={<CalendarIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="attendance" label="Attendance" icon={<CheckCircleIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="projects" label="Projects" icon={<ClipboardListIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="chat" label="Messages" icon={<ChatBubbleIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="resources" label="Resources" icon={<BookOpenIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="playground" label="Playground" icon={<CodeIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            {user.role === 'PATRON' && (
              <NavLink tabName="members" label="Members" icon={<UsersIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            )}
            <NavLink tabName="profile" label="Profile" icon={<IdentificationIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <img 
              src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`} 
              alt={user.name} 
              className="w-10 h-10 rounded-full" 
            />
            {!isCollapsed && (
                <div className="overflow-hidden">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap truncate">@{user.username}</p>
                </div>
            )}
          </div>
          <div className={`flex items-center ${isCollapsed ? 'flex-col-reverse space-y-3 space-y-reverse' : 'justify-between'}`}>
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              onClick={onLogout}
              className={isCollapsed 
                  ? "p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500" 
                  : "flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-500 transition-colors focus:outline-none"
              }
              aria-label="Logout"
              title="Logout"
            >
              <LogoutIcon />
              {!isCollapsed && <span className="text-sm whitespace-nowrap">Logout</span>}
            </button>
          </div>
           {/* Collapse Toggle - only on desktop */}
           <div className="hidden md:block pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onToggleCollapse}
              className={`flex items-center w-full space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
            >
              {isCollapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
              {!isCollapsed && <span className="whitespace-nowrap">Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
