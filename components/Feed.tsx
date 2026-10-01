import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FeedItemType } from '../types';
import * as api from '../services/apiService';
import { MAX_STREAK_GRACES, STREAK_GRACE_INTERVAL, getStreakDayKey } from '../services/apiService';
import { fetchDuelLadder, fetchDuelProfiles } from '../services/duelService';
import type { DuelProfileRecord } from '../services/duelService';
import AddAnnouncement from './AddAnnouncement';
import FeedItemCard from './FeedItemCard';
import { useData } from '../DataContext';
import ConfirmationModal from './ConfirmationModal';
import { SearchIcon } from './icons/SearchIcon';
import InitialsTile, { TILE_COLORS } from './InitialsTile';
import { NEW_POST_EVENT, COMPOSER_STATE_EVENT } from './ShellHeader';
import { useMediaQuery } from '../lib/useMediaQuery';

interface FeedProps {
  currentUser: User;
}

type FilterCategory = 'ALL' | 'NEWS' | 'EVENTS' | 'DISCUSSIONS' | 'POLLS' | 'BOOKMARKED';
type BoardTab = 'BOARD' | 'DUELS';

const FILTER_PILLS: Array<{ id: FilterCategory; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'NEWS', label: 'News' },
  { id: 'EVENTS', label: 'Events' },
  { id: 'DISCUSSIONS', label: 'Discuss' },
  { id: 'POLLS', label: 'Polls' },
  { id: 'BOOKMARKED', label: 'Saved' },
];

/** A streak day key ('YYYY-MM-DD') as a local-midnight Date. Parsing the
 *  key with `new Date(key)` would read it as UTC and shift it a day in
 *  zones west of Greenwich. */
const dayFromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

type StripState = 'on' | 'covered' | 'off' | 'future';

const STRIP_TITLES: Record<StripState, string> = {
  on: 'Active',
  covered: 'Streak day — active or saved by a grace',
  off: 'Not in streak',
  future: 'Upcoming',
};

const Feed: React.FC<FeedProps> = ({ currentUser }) => {
  const {
    feedItems: items,
    isLoadingFeed,
    feedItemsError,
    fetchFeedItems,
    showToast,
    allUsers,
    onlineUsers,
    activities,
    isLoadingUsers,
    isLoadingActivities,
  } = useData();

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterCategory>('ALL');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [boardTab, setBoardTab] = useState<BoardTab>('BOARD');
  const [ladder, setLadder] = useState<Array<DuelProfileRecord & { name: string; username: string }>>([]);
  const [ownDuelProfile, setOwnDuelProfile] = useState<DuelProfileRecord | null>(null);
  // Matches the aside's `xl` breakpoint; below it the status board isn't rendered.
  const showBoard = useMediaQuery('(min-width: 1280px)');

  // The header's accent cell owns the composer trigger.
  useEffect(() => {
    const toggle = () => setIsComposeOpen(prev => !prev);
    window.addEventListener(NEW_POST_EVENT, toggle);
    return () => window.removeEventListener(NEW_POST_EVENT, toggle);
  }, []);

  // Tell the header whether its toggle is currently open.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(COMPOSER_STATE_EVENT, { detail: isComposeOpen }));
  }, [isComposeOpen]);

  // Update bookmarked IDs on mount and when changed
  useEffect(() => {
    const updateBookmarks = () => {
      const stored = JSON.parse(localStorage.getItem('bookmarked_posts') || '[]');
      setBookmarkedIds(stored);
    };
    updateBookmarks();
    // Listen for changes (hacky way to sync sibling components if needed, mostly for self-update)
    window.addEventListener('storage', updateBookmarks);
    return () => window.removeEventListener('storage', updateBookmarks);
  }, [items]); // Re-check when items reload

  // Duel standings back the poster panel's W/L line and the Duels tab, so
  // they're only fetched once the board is on screen. A failure here only
  // costs those two readouts, so it stays silent.
  const [duelsRequested, setDuelsRequested] = useState(false);
  useEffect(() => {
    if (showBoard) setDuelsRequested(true);
  }, [showBoard]);

  useEffect(() => {
    if (!duelsRequested) return;
    let cancelled = false;
    (async () => {
      try {
        const [rows, profiles] = await Promise.all([
          fetchDuelLadder(8),
          fetchDuelProfiles([currentUser.uid]),
        ]);
        if (cancelled) return;
        setLadder(rows);
        setOwnDuelProfile(profiles[currentUser.uid] || null);
      } catch (error) {
        console.error('Failed to load duel standings', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser.uid, duelsRequested]);

  const handleAddAnnouncement = useCallback(async (data: { title: string, message: string, type: FeedItemType, pollOptions?: string[] }) => {
    try {
      await api.addFeedItem(data, currentUser.uid);
      await fetchFeedItems();
      showToast("Announcement posted successfully!", "success");
      setIsComposeOpen(false);
    } catch (error) {
      console.error("Failed to post announcement", error);
      showToast("Failed to create post.", "error");
    }
  }, [fetchFeedItems, currentUser.uid, showToast]);

  const handleDeletePost = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteFeedItem(itemToDelete);
      await fetchFeedItems();
      showToast("Post deleted.", "info");
    } catch (error) {
      console.error("Failed to delete item:", error);
      showToast("Failed to delete post.", "error");
    } finally {
      setItemToDelete(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search Filter
      const matchesSearch =
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.author.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Category Filter
      if (filter === 'ALL') return true;
      if (filter === 'NEWS') return item.type === 'NEWS_UPDATE';
      if (filter === 'EVENTS') return item.type === 'EVENT_ANNOUNCEMENT';
      if (filter === 'DISCUSSIONS') return item.type === 'MEMBER_POST';
      if (filter === 'POLLS') return item.type === 'POLL';
      if (filter === 'BOOKMARKED') {
        // Refresh bookmark list from local storage for accurate filtering
        const currentBookmarks = JSON.parse(localStorage.getItem('bookmarked_posts') || '[]');
        return currentBookmarks.includes(item.id);
      }
      return true;
    });
  }, [items, searchTerm, filter, bookmarkedIds]);

  const onlineCount = useMemo(() => {
    const onlineSet = new Set(onlineUsers);
    return allUsers.filter(user => onlineSet.has(user.uid)).length;
  }, [allUsers, onlineUsers]);

  const challengeLeaders = useMemo(() => {
    const onlineSet = new Set(onlineUsers);
    return [...allUsers]
      .filter(user => user.status === 'APPROVED')
      .map(user => ({
        ...user,
        badgeCount: user.badges?.length || 0,
        isOnline: onlineSet.has(user.uid),
      }))
      .sort((a, b) => {
        if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);
  }, [allUsers, onlineUsers]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...activities]
      .map(activity => ({ activity, time: new Date(activity.date).getTime() }))
      .filter(entry => !Number.isNaN(entry.time) && entry.time >= now)
      .sort((a, b) => a.time - b.time)
      .slice(0, 3)
      .map(({ activity, time }) => {
        const date = new Date(time);
        return {
          id: activity.id,
          mon: date.toLocaleString('en-US', { month: 'short' }),
          day: date.getDate(),
          title: activity.title,
          meta: [
            date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }),
            activity.location,
            `${activity.rsvpUserIds?.length || 0} going`,
          ].filter(Boolean).join(' · '),
        };
      });
  }, [activities]);

  // Which of this week's days the streak covers. Only the streak length,
  // last-active day and grace balance are stored, so:
  //  - a grace covers one missed day without counting it, so the run spans
  //    streak + (graces spent) calendar days;
  //  - graces spent is inferred from the balance a gap-free run would have;
  //  - when a grace was spent we can't tell which day it covered, so only
  //    the last-active day is shown as definitely active.
  // All days are in the streak's own time zone, like syncUserLoginStreak.
  const weekStrip = useMemo(() => {
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = dayFromKey(getStreakDayKey());
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const streak = currentUser.streakCount || 0;
    const last = currentUser.streakLastActiveDate ? dayFromKey(currentUser.streakLastActiveDate) : null;
    const expectedGraces = Math.min(MAX_STREAK_GRACES, 1 + Math.floor(streak / STREAK_GRACE_INTERVAL));
    const gracesSpent = Math.max(0, expectedGraces - (currentUser.streakGraces ?? 1));
    const first = last && streak > 0 ? new Date(last) : null;
    if (first) first.setDate(first.getDate() - (streak + gracesSpent - 1));

    return labels.map((label, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      let state: StripState = 'off';
      if (day > today) state = 'future';
      else if (first && last && day >= first && day <= last) {
        state = gracesSpent === 0 || day.getTime() === last.getTime() ? 'on' : 'covered';
      }
      return { label, state };
    });
  }, [currentUser.streakCount, currentUser.streakLastActiveDate, currentUser.streakGraces]);

  const duelRank = useMemo(() => {
    const index = ladder.findIndex(entry => entry.userUid === currentUser.uid);
    return index === -1 ? null : index + 1;
  }, [ladder, currentUser.uid]);

  const graces = currentUser.streakGraces ?? 1;
  const streakCount = currentUser.streakCount || 0;

  if (isLoadingFeed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin border-2 border-ch-divider border-t-ch-accent" />
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Fetching latest updates</p>
      </div>
    );
  }

  if (feedItemsError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-md border-2 border-ch-rule p-8">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Connection error</p>
          <h3 className="mb-3 text-[24px] font-extrabold tracking-[-0.02em]">The feed could not load</h3>
          <p className="mb-6 text-[14px] leading-relaxed text-ch-muted">{feedItemsError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-ch-accent px-5 py-2.5 text-[13px] font-extrabold text-ch-on-accent transition-colors hover:bg-ch-accent-deep"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-stretch">

      {/* ---------- Feed pane ---------- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">

        {/* Search + filter strip */}
        <div className="flex h-[46px] flex-none items-stretch border-b-2 border-ch-rule">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4 sm:px-6 [&_svg]:h-4 [&_svg]:w-4">
            <span className="flex-none text-ch-muted opacity-70">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search posts, authors, or keywords"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-ch-text placeholder-ch-muted focus:outline-none"
            />
          </div>
          <div className="ch-scroll flex flex-none items-stretch overflow-x-auto">
            {FILTER_PILLS.map(pill => (
              <button
                key={pill.id}
                onClick={() => setFilter(pill.id)}
                className={`flex flex-none items-center border-l border-ch-divider px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  filter === pill.id
                    ? 'bg-ch-accent text-ch-on-accent'
                    : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
          {currentUser.role === 'PATRON' && isComposeOpen && (
            <div className="border-b-2 border-ch-rule p-6">
              <AddAnnouncement
                currentUser={currentUser}
                onAddAnnouncement={handleAddAnnouncement}
              />
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="px-6 py-24 sm:px-16">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent">Nothing here</p>
              <h3 className="mb-3 text-[28px] font-extrabold tracking-[-0.02em]">No posts found</h3>
              <p className="max-w-[52ch] text-[14.5px] leading-relaxed text-ch-muted">
                {filter === 'BOOKMARKED' ? "You haven't saved any posts yet." : 'Try adjusting your search or filters.'}
              </p>
              {(filter !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => { setFilter('ALL'); setSearchTerm(''); }}
                  className="mt-6 bg-ch-accent px-5 py-2.5 text-[13px] font-extrabold text-ch-on-accent transition-colors hover:bg-ch-accent-deep"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <FeedItemCard
                key={item.id}
                item={item}
                currentUser={currentUser}
                onDelete={setItemToDelete}
                index={index + 1}
              />
            ))
          )}
        </div>

        <ConfirmationModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleDeletePost}
          title="Delete Post"
          message="Are you sure you want to delete this post? This action cannot be undone."
          confirmText="Delete"
          isDangerous
        />
      </div>

      {/* ---------- Status board ---------- */}
      {showBoard && (
      <aside className="flex min-h-0 w-[392px] flex-none flex-col border-l-2 border-ch-rule">

        {/* Momentum — the one place the accent runs as a full field */}
        <div className="flex-none bg-ch-accent px-6 pb-6 pt-[26px] text-ch-on-accent">
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Momentum</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-75">
              {new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="mb-[18px] flex items-end gap-3">
            <span className="text-[82px] font-extrabold leading-[0.82] tracking-[-0.05em]">{streakCount}</span>
            <span className="pb-2 text-[15px] font-bold leading-tight">
              day{streakCount === 1 ? '' : 's'}<br />streak
            </span>
          </div>

          <div className="mb-3 flex gap-[5px]">
            {weekStrip.map((day, index) => (
              <div
                key={index}
                className="flex h-9 flex-1 items-end justify-center pb-1 text-[9px] font-extrabold tracking-[0.06em]"
                title={STRIP_TITLES[day.state]}
                style={{
                  background:
                    day.state === 'on' ? 'rgba(0,0,0,0.26)' : day.state === 'covered' ? 'rgba(0,0,0,0.12)' : 'transparent',
                  color: day.state === 'on' || day.state === 'covered' ? 'var(--ch-on-accent)' : 'rgba(0,0,0,0.4)',
                  border: `1px ${day.state === 'covered' ? 'dashed' : 'solid'} rgba(0,0,0,0.28)`,
                }}
              >
                {day.label}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t-2 border-black/[0.28] pt-3">
            <span className="text-[11.5px] font-semibold">
              {graces} of {MAX_STREAK_GRACES} grace{graces === 1 ? '' : 's'} left
            </span>
            {ownDuelProfile && (
              <span className="text-[11.5px] font-extrabold">
                {ownDuelProfile.seasonWins}W · {ownDuelProfile.seasonLosses}L
                {duelRank ? ` · rank ${duelRank}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Board tabs */}
        <div className="flex h-[42px] flex-none items-stretch border-t-2 border-ch-rule border-b-2">
          {([['BOARD', 'Status board'], ['DUELS', 'Duels']] as Array<[BoardTab, string]>).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setBoardTab(id)}
              className={`flex flex-1 items-center border-r border-ch-divider px-5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors ${
                boardTab === id ? 'bg-ch-accent-soft text-ch-text' : 'text-ch-muted hover:bg-ch-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ch-scroll min-h-0 flex-1 overflow-y-auto">
          {boardTab === 'BOARD' ? (
            <>
              {/* Next up */}
              <div className="border-b-2 border-ch-rule px-5 pb-5 pt-[18px]">
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Next up</p>
                {isLoadingActivities ? (
                  <p className="py-2 text-[13px] text-ch-muted">Loading activities…</p>
                ) : upcoming.length === 0 ? (
                  <p className="py-2 text-[13px] text-ch-muted">Nothing scheduled.</p>
                ) : (
                  upcoming.map(event => (
                    <div key={event.id} className="flex gap-3.5 border-t border-ch-divider py-2.5">
                      <div className="w-10 flex-none">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ch-muted">{event.mon}</p>
                        <p className="text-[23px] font-extrabold leading-none tracking-[-0.02em]">{event.day}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold leading-tight">{event.title}</p>
                        <p className="mt-0.5 text-[11px] text-ch-muted">{event.meta}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Challenge leaders */}
              <div className="px-5 pb-5 pt-[18px]">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Challenge leaders</p>
                  <span className="text-[11px] text-ch-muted">{onlineCount} online</span>
                </div>
                {isLoadingUsers ? (
                  <p className="py-2 text-[13px] text-ch-muted">Loading leaderboard…</p>
                ) : challengeLeaders.length === 0 ? (
                  <p className="py-2 text-[13px] text-ch-muted">No leaderboard data yet.</p>
                ) : (
                  challengeLeaders.map((user, index) => (
                    <div key={user.uid} className="flex items-center gap-3 border-t border-ch-divider py-2">
                      <span className={`w-4 text-[12px] font-extrabold ${index === 0 ? 'text-ch-accent' : 'text-ch-muted'}`}>
                        {index + 1}
                      </span>
                      <InitialsTile name={user.name} size={26} color={TILE_COLORS[index % TILE_COLORS.length]} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{user.name}</span>
                      <span
                        className="h-2 w-2 flex-none"
                        style={{ background: user.isOnline ? 'var(--ch-accent)' : 'var(--ch-divider)' }}
                        title={user.isOnline ? 'Online' : 'Offline'}
                      />
                      <span className="text-[12px] font-extrabold text-ch-muted">{user.badgeCount}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="px-5 pb-5 pt-[18px]">
              <div className="mb-2.5 flex items-baseline justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">Duel ladder</p>
                <span className="text-[11px] text-ch-muted">By rating</span>
              </div>
              {ladder.length === 0 ? (
                <p className="py-2 text-[13px] text-ch-muted">No duels played yet.</p>
              ) : (
                ladder.map((entry, index) => (
                  <div
                    key={entry.userUid}
                    className={`flex items-center gap-3 border-t border-ch-divider py-2 ${
                      entry.userUid === currentUser.uid ? 'bg-ch-accent-soft' : ''
                    }`}
                  >
                    <span className={`w-4 text-[12px] font-extrabold ${index === 0 ? 'text-ch-accent' : 'text-ch-muted'}`}>
                      {index + 1}
                    </span>
                    <InitialsTile name={entry.name} size={26} color={TILE_COLORS[index % TILE_COLORS.length]} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{entry.name}</p>
                      <p className="text-[11px] text-ch-muted">
                        {entry.rankTier} {entry.division} · {entry.seasonWins}W · {entry.seasonLosses}L
                      </p>
                    </div>
                    <span className="text-[12px] font-extrabold text-ch-muted">{entry.rating}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
      )}
    </div>
  );
};

export default Feed;
