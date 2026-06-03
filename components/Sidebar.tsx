

import React, { useMemo } from 'react';
import { User, Tab } from '../types';
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
import { TrophyIcon } from './icons/TrophyIcon';
import { MapIcon } from './icons/MapIcon';
import { GamepadIcon } from './icons/GamepadIcon';
import { VoteIcon } from './icons/VoteIcon';
import { useData } from '../DataContext';
import MatrixRain from './MatrixRain';


interface SidebarProps {
  user: User;
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
        className={`group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-out ${isCollapsed ? 'justify-center' : 'space-x-3'} ${isActive
          ? 'bg-gradient-to-r from-sky-600 to-indigo-900 text-white shadow-lg shadow-sky-500/25'
          : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
          }`}
      >
        <div className={`relative flex items-center justify-center transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          {icon}
          {isCollapsed && badge !== undefined && badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 text-[9px] font-bold text-white bg-sky-500 rounded-full border border-white dark:border-gray-800 px-0.5 shadow-sm">
              {badge > 9 ? '!' : badge}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <span className="whitespace-nowrap flex-1 text-left tracking-wide">{label}</span>
        )}
        {!isCollapsed && badge !== undefined && badge > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${isActive
            ? 'bg-white/20 text-white'
            : 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
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
      <linearGradient id="sidebar_logo_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#sidebar_logo_grad)" />
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="monospace, sans-serif" fontSize="28" fontWeight="bold" fill="white" letterSpacing="-1">
      ICH
    </text>
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { unreadMessageCounts, notifications, featureFlags } = useData();

  const totalUnread = useMemo(() => {
    return Object.values(unreadMessageCounts).reduce((acc: number, count: number) => acc + count, 0);
  }, [unreadMessageCounts]);

  const notificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.forEach(n => {
      if (!n.isRead && n.linkTo) {
        counts[n.linkTo] = (counts[n.linkTo] || 0) + 1;
      }
    });
    return counts;
  }, [notifications]);

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
        ...((featureFlags.showFeed || user.role === 'PATRON') ? [{ tab: 'feed' as Tab, label: 'Feed', icon: <HomeIcon /> }] : []),
        ...((featureFlags.showCommunity || user.role === 'PATRON') ? [{ tab: 'community' as Tab, label: 'Community', icon: <UsersIcon /> }] : []),
        ...((featureFlags.showChat || user.role === 'PATRON') ? [{ tab: 'chat' as Tab, label: 'Messages', icon: <ChatBubbleIcon />, badge: totalUnread }] : []),
        ...((featureFlags.showChallenges || user.role === 'PATRON') ? [{ tab: 'challenges' as Tab, label: 'Challenges', icon: <TrophyIcon />, badge: notificationCounts['challenges'] }] : []),
        ...((featureFlags.showSuggestions || user.role === 'PATRON') ? [{ tab: 'suggestions' as Tab, label: 'Suggestions', icon: <LightBulbIcon /> }] : []),
        ...((featureFlags.showVoting || user.role === 'PATRON') ? [{ tab: 'voting' as Tab, label: 'Voting', icon: <VoteIcon /> }] : []),
      ]
    },
    {
      title: "Manage",
      items: [
        ...((featureFlags.showActivities || user.role === 'PATRON') ? [{ tab: 'activities' as Tab, label: 'Activities', icon: <CalendarIcon />, badge: notificationCounts['activities'] }] : []),
        ...((featureFlags.showProjects || user.role === 'PATRON') ? [{ tab: 'projects' as Tab, label: 'Projects', icon: <ClipboardListIcon />, badge: notificationCounts['projects'] }] : []),
        ...((featureFlags.showAttendance || user.role === 'PATRON') ? [{ tab: 'attendance' as Tab, label: 'Attendance', icon: <CheckCircleIcon /> }] : []),
      ]
    },
    {
      title: "Learn & Share",
      items: [
        ...((featureFlags.showRoadmap || user.role === 'PATRON') ? [{ tab: 'roadmap' as Tab, label: 'Roadmap', icon: <MapIcon />, badge: notificationCounts['roadmap'] }] : []),
        ...((featureFlags.showResources || user.role === 'PATRON') ? [{ tab: 'resources' as Tab, label: 'Resources', icon: <BookOpenIcon /> }] : []),
        ...((featureFlags.showPlayground || user.role === 'PATRON') ? [{ tab: 'playground' as Tab, label: 'Playground', icon: <CodeIcon /> }] : []),
        ...((featureFlags.showGames || user.role === 'PATRON') ? [{ tab: 'games' as Tab, label: 'Games', icon: <GamepadIcon /> }] : []),
        ...((featureFlags.showShowcase || user.role === 'PATRON') ? [{ tab: 'showcase' as Tab, label: 'Showcase', icon: <GlobeIcon /> }] : []),
      ]
    },
    ...(user.role === 'PATRON'
      ? [{
        title: "Admin",
        items: [
          { tab: 'members' as Tab, label: 'Members', icon: <UsersIcon /> },
          { tab: 'admin' as Tab, label: 'Admin Tools', icon: <ClipboardListIcon /> }
        ]
      }]
      : []),
    {
      title: "Account",
      items: [
        { tab: 'profile' as Tab, label: 'Profile', icon: <IdentificationIcon /> },
      ]
    }
  ];

  const filteredGroups = navGroups
    .map(group => ({ ...group, items: group.items.filter(Boolean) }))
    .filter(group => group.items.length > 0);

  return (
    <>
      {/* Overlay for mobile view */}
      <div
        className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <aside className={`bg-white/80 dark:bg-gray-900/80 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen transform transition-all md:transition-all duration-300 ease-in-out md:sticky md:top-0 ${isCollapsed ? 'md:w-[5.5rem]' : 'w-72'} ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed inset-y-0 left-0 z-30 shadow-2xl md:shadow-none overflow-hidden`}>

        {/* Matrix Rain Background inside Sidebar */}
        <MatrixRain />

        {/* Header */}
        <div className={`flex items-center h-20 flex-shrink-0 px-6 relative z-10 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <ClubHubLogo />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                  Club<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-900">Hub</span>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-widest uppercase mt-0.5">STAHIZA</span>
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
          {filteredGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {!isCollapsed && (
                <h3 className="px-3 mb-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              {isCollapsed && groupIndex > 0 && <div className="h-px bg-gray-200 dark:bg-gray-800 mx-2 my-2"></div>}

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

        {/* Footer with Collapse only */}
        <div className="p-4 relative z-10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800">
          <div className="hidden md:flex justify-end">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 w-full flex justify-center"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
