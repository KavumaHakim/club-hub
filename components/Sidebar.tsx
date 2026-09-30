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
import { initialsOf } from './InitialsTile';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Swords } from 'lucide-react';

interface SidebarProps {
  user: User;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  tab: Tab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

/**
 * One ruled row. The active row is an accent field — the sidebar's only
 * colour — and every other row is ink on the ground.
 */
const NavRow: React.FC<{
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: (tab: Tab) => void;
}> = ({ item, isActive, isCollapsed, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(item.tab)}
    title={isCollapsed ? item.label : undefined}
    aria-current={isActive ? 'page' : undefined}
    className={`flex w-full items-center gap-[11px] h-[38px] text-[13.5px] font-semibold border-b border-ch-divider transition-colors duration-100 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:flex-none ${
      isCollapsed ? 'justify-center px-0' : 'px-[18px]'
    } ${
      isActive
        ? 'bg-ch-accent text-ch-on-accent'
        : 'bg-transparent text-ch-muted hover:bg-ch-surface hover:text-ch-text'
    }`}
  >
    <span className="relative flex flex-none items-center justify-center opacity-90">
      {item.icon}
      {isCollapsed && !!item.badge && item.badge > 0 && (
        <span
          className={`absolute -top-1 -right-1.5 text-[9px] font-extrabold leading-none ${
            isActive ? 'text-ch-on-accent' : 'text-ch-accent'
          }`}
        >
          {item.badge > 9 ? '!' : item.badge}
        </span>
      )}
    </span>
    {!isCollapsed && (
      <>
        <span className="flex-1 whitespace-nowrap text-left">{item.label}</span>
        {!!item.badge && item.badge > 0 && (
          <span className={`text-[11px] font-extrabold ${isActive ? 'text-ch-on-accent' : 'text-ch-accent'}`}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </>
    )}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, isOpen, onClose, isCollapsed: collapsePreference, onToggleCollapse }) => {
  const { unreadMessageCounts, notifications, featureFlags } = useData();
  // Collapsing is a desktop affordance; the mobile drawer is always the full list.
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isCollapsed = collapsePreference && isDesktop;

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

  const isPatron = user.role === 'PATRON';

  // A single ruled list — the group headings are retired; ordering alone
  // carries the grouping.
  const navItems: NavItem[] = useMemo(() => {
    const visible = (flag: boolean | undefined) => flag || isPatron;
    return [
      ...(visible(featureFlags.showFeed) ? [{ tab: 'feed' as Tab, label: 'Feed', icon: <HomeIcon /> }] : []),
      ...(visible(featureFlags.showCommunity) ? [{ tab: 'community' as Tab, label: 'Community', icon: <UsersIcon /> }] : []),
      ...(visible(featureFlags.showChat) ? [{ tab: 'chat' as Tab, label: 'Messages', icon: <ChatBubbleIcon />, badge: totalUnread }] : []),
      ...(visible(featureFlags.showChallenges) ? [{ tab: 'challenges' as Tab, label: 'Challenges', icon: <TrophyIcon />, badge: notificationCounts['challenges'] }] : []),
      ...(visible(featureFlags.showChallenges) ? [{ tab: 'arena' as Tab, label: 'Duel Arena', icon: <Swords /> }] : []),
      ...(visible(featureFlags.showSuggestions) ? [{ tab: 'suggestions' as Tab, label: 'Suggestions', icon: <LightBulbIcon /> }] : []),
      ...(visible(featureFlags.showVoting) ? [{ tab: 'voting' as Tab, label: 'Voting', icon: <VoteIcon /> }] : []),
      ...(visible(featureFlags.showActivities) ? [{ tab: 'activities' as Tab, label: 'Activities', icon: <CalendarIcon />, badge: notificationCounts['activities'] }] : []),
      ...(visible(featureFlags.showProjects) ? [{ tab: 'projects' as Tab, label: 'Projects', icon: <ClipboardListIcon />, badge: notificationCounts['projects'] }] : []),
      ...(visible(featureFlags.showAttendance) ? [{ tab: 'attendance' as Tab, label: 'Attendance', icon: <CheckCircleIcon /> }] : []),
      ...(visible(featureFlags.showRoadmap) ? [{ tab: 'roadmap' as Tab, label: 'Roadmap', icon: <MapIcon />, badge: notificationCounts['roadmap'] }] : []),
      ...(visible(featureFlags.showResources) ? [{ tab: 'resources' as Tab, label: 'Resources', icon: <BookOpenIcon /> }] : []),
      ...(visible(featureFlags.showPlayground) ? [{ tab: 'playground' as Tab, label: 'Playground', icon: <CodeIcon /> }] : []),
      ...(visible(featureFlags.showGames) ? [{ tab: 'games' as Tab, label: 'Games', icon: <GamepadIcon /> }] : []),
      ...(visible(featureFlags.showShowcase) ? [{ tab: 'showcase' as Tab, label: 'Showcase', icon: <GlobeIcon /> }] : []),
      ...(isPatron
        ? [
            { tab: 'members' as Tab, label: 'Members', icon: <UsersIcon /> },
            { tab: 'admin' as Tab, label: 'Admin Tools', icon: <ClipboardListIcon /> },
          ]
        : []),
      { tab: 'profile' as Tab, label: 'Profile', icon: <IdentificationIcon /> },
    ];
  }, [featureFlags, isPatron, totalUnread, notificationCounts]);

  return (
    <>
      {/* Overlay for mobile view */}
      <div
        className={`fixed inset-0 z-20 bg-black/60 md:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-screen flex-none flex-col overflow-hidden border-r-2 border-ch-rule bg-ch-bg transition-transform duration-200 ease-out md:sticky md:top-0 md:translate-x-0 ${
          isCollapsed ? 'md:w-[60px]' : 'md:w-[220px]'
        } w-[220px] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Matrix rain stays behind the sidebar at 55% — it reads as texture,
            not as a second layer of information. */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <MatrixRain dim={0.55} />
        </div>

        {/* Brand block */}
        <div
          className={`relative z-10 flex h-[72px] flex-none items-center border-b-2 border-ch-rule ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-[18px]'
          }`}
        >
          {isCollapsed ? (
            <span className="text-[15px] font-extrabold leading-none tracking-[-0.02em]">CH</span>
          ) : (
            <div className="flex flex-col">
              <span className="text-[18px] font-extrabold leading-none tracking-[-0.02em]">CLUBHUB</span>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ch-muted">Naggalama ICT</span>
            </div>
          )}
          {!isDesktop && (
            <button
              onClick={onClose}
              className="p-1 text-ch-muted transition-colors hover:text-ch-text md:hidden"
              aria-label="Close menu"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Navigation — one ruled list, no group headings */}
        <nav className="ch-scroll relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => (
            <NavRow
              key={item.tab}
              item={item}
              isActive={activeTab === item.tab}
              isCollapsed={isCollapsed}
              onClick={handleNavClick}
            />
          ))}
        </nav>

        {/* Identity block */}
        <div
          className={`relative z-10 flex flex-none items-center gap-[11px] border-t-2 border-ch-rule bg-ch-bg py-[14px] ${
            isCollapsed ? 'justify-center px-0' : 'px-[18px]'
          }`}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-[30px] w-[30px] flex-none object-cover"
            />
          ) : (
            <div className="flex h-[30px] w-[30px] flex-none items-center justify-center bg-ch-violet text-[11px] font-extrabold text-white">
              {initialsOf(user.name)}
            </div>
          )}
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight">{user.name}</p>
              <p className="mt-px text-[10px] font-bold uppercase tracking-[0.08em] text-ch-accent">
                {isPatron ? 'Patron' : 'Member'}
              </p>
            </div>
          )}
        </div>

        {/* Collapse control — a ruled cell, flush like everything else */}
        <button
          onClick={onToggleCollapse}
          className="relative z-10 hidden h-[34px] flex-none items-center justify-center border-t border-ch-divider bg-ch-bg text-ch-muted transition-colors hover:bg-ch-surface hover:text-ch-text md:flex [&_svg]:h-4 [&_svg]:w-4"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
