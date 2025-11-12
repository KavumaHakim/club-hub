import React from 'react';
import { User } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { XIcon } from './icons/XIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ChevronsLeftIcon } from './icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from './icons/ChevronsRightIcon';

type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'chat' | 'profile' | 'members' | 'playground';

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
        <div className="flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 px-4">
          <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'md:w-0' : 'w-auto'}`}>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 whitespace-nowrap">
              Naggalama Club Hub
            </h1>
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
            <NavLink tabName="chat" label="Chat" icon={<ChatBubbleIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="playground" label="Playground" icon={<CodeIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            <NavLink tabName="profile" label="Profile" icon={<IdentificationIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            {user.role === 'PATRON' && (
              <NavLink tabName="members" label="Members" icon={<UsersIcon />} activeTab={activeTab} onClick={handleNavClick} isCollapsed={isCollapsed}/>
            )}
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
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">@{user.username}</p>
                </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            {!isCollapsed && (
                <button
                onClick={onLogout}
                className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-500 transition-colors focus:outline-none"
                aria-label="Logout"
                >
                <LogoutIcon />
                <span className="text-sm whitespace-nowrap">Logout</span>
                </button>
            )}
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