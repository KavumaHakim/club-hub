import React, { useEffect, useState } from 'react';
import { User, Tab } from '../types';
import { useData } from '../DataContext';
import { MAX_STREAK_GRACES } from '../services/apiService';
import { MenuIcon } from './icons/MenuIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PlayIcon } from './icons/PlayIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { ShareIcon } from './icons/ShareIcon';
import { CloudIcon } from './icons/CloudIcon';
import { TrophyIcon } from './icons/TrophyIcon';

/** Broadcast so the Feed can open its composer without threading state
 *  through Dashboard's tab switch. */
export const NEW_POST_EVENT = 'clubhub:new-post';
/** The Feed reports its composer's open state back (detail: boolean). */
export const COMPOSER_STATE_EVENT = 'clubhub:composer-state';

/** A screen sets the line beside the page title (detail: { tab, meta }). */
export const SHELL_META_EVENT = 'clubhub:shell-meta';

/** Header cells ask the Playground to act (detail: PlaygroundAction). */
export const PLAYGROUND_ACTION_EVENT = 'clubhub:playground-action';
/** The Playground reports what the header should show (detail: PlaygroundHeaderState). */
export const PLAYGROUND_STATE_EVENT = 'clubhub:playground-state';

export type PlaygroundAction = 'run' | 'hint' | 'share' | 'save' | 'submit';

export interface PlaygroundHeaderState {
  meta: string;
  running: boolean;
  /** Run/Hint are unavailable (waiting for input, evaluating, …). */
  busy: boolean;
  submitLabel: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** "84 members · 61 active this week" — active means online now or seen in the last 7 days. */
const communityMeta = (users: User[], online: string[]) => {
  const onlineSet = new Set(online);
  const members = users.filter(user => user.status === 'APPROVED');
  const cutoff = Date.now() - WEEK_MS;
  const seen = (iso?: string) => !!iso && new Date(iso).getTime() >= cutoff;
  const active = members.filter(user => onlineSet.has(user.uid) || seen(user.lastLogin) || seen(user.streakLastActiveDate)).length;
  return `${members.length} member${members.length === 1 ? '' : 's'} · ${active} active this week`;
};

const firePlayground = (action: PlaygroundAction) =>
  window.dispatchEvent(new CustomEvent(PLAYGROUND_ACTION_EVENT, { detail: action }));

interface ShellHeaderProps {
  user: User;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenSidebar: () => void;
}

const TAB_TITLES: Partial<Record<Tab, string>> = {
  feed: 'Feed',
  chat: 'Messages',
  arena: 'Duel Arena',
  admin: 'Admin Tools',
};

/** A ruled header cell. Labels are flush left, never centred. */
const HeaderCell: React.FC<{
  label?: string;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'ruled' | 'accent';
  className?: string;
  expanded?: boolean;
  disabled?: boolean;
}> = ({ label, title, onClick, children, variant = 'ruled', className = '', expanded, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title || label}
    aria-label={title || label}
    aria-expanded={expanded}
    className={`flex items-center gap-[9px] px-5 text-[13px] font-bold transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:flex-none ${
      variant === 'accent'
        ? 'border-l-2 border-ch-rule bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep'
        : 'border-l border-ch-divider text-ch-text hover:bg-ch-surface'
    } ${className}`}
  >
    {children}
    {label && <span className="hidden lg:inline">{label}</span>}
  </button>
);

const ShellHeader: React.FC<ShellHeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  theme,
  onToggleTheme,
  onLogout,
  onOpenSidebar,
}) => {
  const { feedItems, allUsers, onlineUsers } = useData();
  const isPatron = user.role === 'PATRON';
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [playground, setPlayground] = useState<PlaygroundHeaderState | null>(null);
  const [screenMeta, setScreenMeta] = useState<Record<string, string>>({});

  useEffect(() => {
    const sync = (event: Event) => setIsComposerOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(COMPOSER_STATE_EVENT, sync);
    return () => window.removeEventListener(COMPOSER_STATE_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = (event: Event) => {
      const { tab, meta } = (event as CustomEvent<{ tab: string; meta: string }>).detail;
      setScreenMeta(prev => (prev[tab] === meta ? prev : { ...prev, [tab]: meta }));
    };
    window.addEventListener(SHELL_META_EVENT, sync);
    return () => window.removeEventListener(SHELL_META_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = (event: Event) => setPlayground((event as CustomEvent<PlaygroundHeaderState>).detail);
    window.addEventListener(PLAYGROUND_STATE_EVENT, sync);
    return () => window.removeEventListener(PLAYGROUND_STATE_EVENT, sync);
  }, []);

  const streakCount = user.streakCount || 0;
  const graces = user.streakGraces ?? 1;

  const title =
    TAB_TITLES[activeTab] ||
    activeTab.replace('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

  const meta =
    activeTab === 'feed' ? `${feedItems.length} post${feedItems.length === 1 ? '' : 's'}`
    : activeTab === 'playground' ? playground?.meta ?? null
    : activeTab === 'community' ? communityMeta(allUsers, onlineUsers)
    : screenMeta[activeTab] ?? null;
  const showPlayground = activeTab === 'playground' && !!playground;

  return (
    <header
      data-app-header="true"
      className="sticky top-0 z-20 flex h-[72px] flex-none items-stretch border-b-2 border-ch-rule bg-ch-bg"
    >
      <button
        onClick={onOpenSidebar}
        className="flex flex-none items-center border-r border-ch-divider px-4 text-ch-text transition-colors hover:bg-ch-surface md:hidden"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-4 px-6">
        <h1 className="m-0 truncate text-[24px] font-extrabold tracking-[-0.02em]">{title}</h1>
        {meta && <span className="hidden flex-none text-[12px] text-ch-muted sm:inline">{meta}</span>}
      </div>

      <div
        className="hidden flex-none flex-col justify-center border-l border-ch-divider px-5 sm:flex"
        title={`${graces} / ${MAX_STREAK_GRACES} graces available`}
      >
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Streak</span>
        <span className="text-[13px] font-bold">
          {streakCount} day{streakCount === 1 ? '' : 's'}
        </span>
      </div>

      {isPatron && (
        <div className="hidden items-stretch xl:flex">
          <HeaderCell label="Activity" onClick={() => setActiveTab('activities')}>
            <CalendarIcon />
          </HeaderCell>
          <HeaderCell label="Attendance" onClick={() => setActiveTab('attendance')}>
            <CheckCircleIcon />
          </HeaderCell>
          <HeaderCell label="Admin" onClick={() => setActiveTab('admin')}>
            <ClipboardListIcon />
          </HeaderCell>
        </div>
      )}

      <HeaderCell title="Toggle theme" onClick={onToggleTheme}>
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </HeaderCell>
      <HeaderCell title="Logout" onClick={onLogout}>
        <LogoutIcon />
      </HeaderCell>

      {showPlayground && (
        <>
          <HeaderCell label="Hint" title="Get a short hint from Kevin" onClick={() => firePlayground('hint')} disabled={playground.busy} className="hidden sm:flex">
            <LightBulbIcon />
          </HeaderCell>
          <HeaderCell label={playground.submitLabel} onClick={() => firePlayground('submit')} disabled={playground.busy} className="hidden md:flex">
            <TrophyIcon />
          </HeaderCell>
          <HeaderCell label="Share" onClick={() => firePlayground('share')} className="hidden md:flex">
            <ShareIcon />
          </HeaderCell>
          <HeaderCell label="Save" onClick={() => firePlayground('save')} className="hidden md:flex">
            <CloudIcon />
          </HeaderCell>
          <HeaderCell
            label={playground.running ? 'Running' : 'Run'}
            title="Run code (Ctrl+Enter)"
            variant="accent"
            className="min-w-[56px] lg:min-w-[120px]"
            disabled={playground.busy && !playground.running}
            onClick={() => firePlayground('run')}
          >
            <PlayIcon />
          </HeaderCell>
        </>
      )}

      {activeTab === 'feed' && isPatron && (
        <HeaderCell
          label={isComposerOpen ? 'Close post' : 'New post'}
          title={isComposerOpen ? 'Close post form' : 'Open post form'}
          variant="accent"
          expanded={isComposerOpen}
          onClick={() => window.dispatchEvent(new CustomEvent(NEW_POST_EVENT))}
        >
          <PlusIcon className={`transition-transform duration-100 ${isComposerOpen ? 'rotate-45' : ''}`} />
        </HeaderCell>
      )}
    </header>
  );
};

export default ShellHeader;
