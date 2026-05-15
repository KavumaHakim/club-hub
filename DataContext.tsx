import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Activity, AttendanceRecord, FeedItem, ProjectData, User, Resource, AppNotification, Room, ShowcaseItem, Suggestion, Challenge, ChallengeSubmission, Toast, ToastType, Roadmap, FeatureFlags, Team, TeamChallenge, NotificationPrefs, VotingPosition, VotingContestant, VotingVote, AlertConfig, AlertType } from './types';
import * as api from './services/apiService';
import { supabase } from './services/supabaseClient';

// Define the shape of the context state
interface IDataContext {
  // Data
  activities: Activity[];
  attendance: AttendanceRecord[];
  feedItems: FeedItem[];
  projectData: ProjectData | null;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  allUsers: User[];
  onlineUsers: string[]; // List of UIDs of currently online users
  resources: Resource[];
  notifications: AppNotification[];
  rooms: Room[];
  showcaseItems: ShowcaseItem[];
  suggestions: Suggestion[];
  challenges: Challenge[];
  roadmaps: Roadmap[];
  teams: Team[];
  teamChallenges: TeamChallenge[];
  votingPositions: VotingPosition[];
  votingContestants: VotingContestant[];
  votingVotes: VotingVote[];

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  // Notification prefs
  notificationPrefs: NotificationPrefs;
  updateNotificationPrefs: (updates: Partial<NotificationPrefs>) => void;

  // Alert Modal
  alertConfig: AlertConfig | null;
  showAlert: (config: Omit<AlertConfig, 'isOpen'>) => void;
  hideAlert: () => void;

  // Chat Unread State
  unreadMessageCounts: Record<string, number>;
  clearUnreadCount: (roomId: string) => void;

  // Loading states
  isLoadingActivities: boolean;
  isLoadingAttendance: boolean;
  isLoadingFeed: boolean;
  isLoadingProjects: boolean;
  isLoadingUsers: boolean;
  isLoadingResources: boolean;
  isLoadingNotifications: boolean;
  isLoadingRooms: boolean;
  isLoadingShowcase: boolean;
  isLoadingSuggestions: boolean;
  isLoadingChallenges: boolean;
  isLoadingRoadmaps: boolean;
  isLoadingTeams: boolean;
  isLoadingTeamChallenges: boolean;
  isLoadingVoting: boolean;
  isInitialLoading: boolean;

  // Error states
  activitiesError: string | null;
  attendanceError: string | null;
  feedItemsError: string | null;
  projectDataError: string | null;
  allUsersError: string | null;
  resourcesError: string | null;
  notificationsError: string | null;
  roomsError: string | null;
  showcaseError: string | null;
  suggestionsError: string | null;
  challengesError: string | null;
  roadmapsError: string | null;
  teamsError: string | null;
  teamChallengesError: string | null;
  votingError: string | null;

  // Refetch functions
  fetchActivities: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  fetchFeedItems: () => Promise<void>;
  fetchProjectData: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchResources: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchRooms: () => Promise<void>;
  fetchShowcaseItems: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  fetchChallenges: () => Promise<void>;
  fetchRoadmaps: () => Promise<void>;
  fetchTeams: () => Promise<void>;
  fetchTeamChallenges: () => Promise<void>;
  fetchVotingPositions: () => Promise<void>;
  createVotingPosition: (position: Omit<VotingPosition, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateVotingPosition: (id: string, updates: Partial<VotingPosition>) => Promise<void>;
  fetchVotingContestants: (positionId: string) => Promise<VotingContestant[]>;
  fetchAllVotingContestants: () => Promise<void>;
  contestPosition: (positionId: string, manifesto: string) => Promise<void>;
  fetchVotingVotes: (positionId: string) => Promise<VotingVote[]>;
  castVote: (positionId: string, contestantId: string) => Promise<void>;
  updateContestantStatus: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  deleteVotingPosition: (id: string) => Promise<void>;
  updateUserSkillLevel: (newLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => Promise<void>;
  featureFlags: FeatureFlags;
  updateFeatureFlags: (updates: Partial<FeatureFlags>) => void;
  resetFeatureFlags: () => void;
}

// Create the context with a default value
const DataContext = createContext<IDataContext | undefined>(undefined);

const NOTIFICATION_PREFS_KEY = 'clubhub_notification_prefs';
const defaultFeatureFlags: FeatureFlags = {
  showFeed: true,
  showActivities: true,
  showAttendance: true,
  showProjects: true,
  showResources: true,
  showChat: true,
  showShowcase: true,
  showSuggestions: true,
  showChallenges: true,
  showRoadmap: true,
  showCommunity: true,
  showPlayground: true,
  showGames: true,
  showVoting: true
};

const defaultNotificationPrefs: NotificationPrefs = {
  browserEnabled: false,
  notifyWhenAway: true
};

// Create a provider component
export const DataProvider: React.FC<{ children: ReactNode; currentUser: User | null }> = ({ children, currentUser: initialUser }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rawResources, setRawResources] = useState<Omit<Resource, 'uploaderName' | 'uploaderAvatarUrl'>[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamChallenges, setTeamChallenges] = useState<TeamChallenge[]>([]);
  const [votingPositions, setVotingPositions] = useState<VotingPosition[]>([]);
  const [votingContestants, setVotingContestants] = useState<VotingContestant[]>([]);
  const [votingVotes, setVotingVotes] = useState<VotingVote[]>([]);
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<Record<string, number>>({});
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => {
    if (typeof window === 'undefined') return defaultNotificationPrefs;
    try {
      const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (!raw) return defaultNotificationPrefs;
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      return { ...defaultNotificationPrefs, ...parsed };
    } catch {
      return defaultNotificationPrefs;
    }
  });

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((config: Omit<AlertConfig, 'isOpen'>) => {
    setAlertConfig({ ...config, isOpen: true });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => prev ? { ...prev, isOpen: false } : null);
  }, []);

  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingShowcase, setIsLoadingShowcase] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingTeamChallenges, setIsLoadingTeamChallenges] = useState(true);
  const [isLoadingVoting, setIsLoadingVoting] = useState(true);

  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [feedItemsError, setFeedItemsError] = useState<string | null>(null);
  const [projectDataError, setProjectDataError] = useState<string | null>(null);
  const [allUsersError, setAllUsersError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [showcaseError, setShowcaseError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [challengesError, setChallengesError] = useState<string | null>(null);
  const [roadmapsError, setRoadmapsError] = useState<string | null>(null);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [teamChallengesError, setTeamChallengesError] = useState<string | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);

  // Sync initialUser prop to state if it changes (e.g. re-login)
  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateNotificationPrefs = useCallback((updates: Partial<NotificationPrefs>) => {
    setNotificationPrefs(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined') return;
    if (!notificationPrefs.browserEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (notificationPrefs.notifyWhenAway) {
      const isVisible = document.visibilityState === 'visible';
      const hasFocus = typeof document.hasFocus === 'function' ? document.hasFocus() : false;
      if (isVisible && hasFocus) return;
    }
    new Notification(title, {
      body,
      icon: '/favicon.svg'
    });
  }, [notificationPrefs]);

  // Helper to extract error messages safely
  const getErrorMessage = (error: any) => {
    if (typeof error === 'string') return error;
    if (error && typeof error.message === 'string') return error.message;
    try {
      return JSON.stringify(error);
    } catch (e) {
      return "An unknown error occurred";
    }
  };

  const fetchActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch (e: any) {
      console.error("Failed to fetch activities", e);
      setActivitiesError(getErrorMessage(e));
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    setIsLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const data = await api.getAttendance(currentUser.uid);
      setAttendance(data);
    } catch (e: any) {
      console.error("Failed to fetch attendance", e);
      setAttendanceError(getErrorMessage(e));
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [currentUser.uid]);

  const fetchFeedItems = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedItemsError(null);
    try {
      const data = await api.getFeedItems();
      setFeedItems(data);
    } catch (e: any) {
      console.error("Failed to fetch feed items", e);
      setFeedItemsError(getErrorMessage(e));
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const fetchProjectData = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectDataError(null);
    try {
      const data = await api.getProjectData();
      setProjectData(data);
    } catch (e: any) {
      console.error("Failed to fetch project data", e);
      setProjectDataError(getErrorMessage(e));
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setAllUsersError(null);
    try {
      const data = await api.getUsers();
      setAllUsers(data);
    } catch (e: any) {
      console.error("Failed to fetch users", e);
      setAllUsersError(getErrorMessage(e));
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    setIsLoadingResources(true);
    setResourcesError(null);
    try {
      const data = await api.getResources();
      setRawResources(data);
    } catch (e: any) {
      console.error("Failed to fetch resources", e);
      setResourcesError(getErrorMessage(e));
      setIsLoadingResources(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
      const data = await api.getNotifications(currentUser.uid);
      setNotifications(data);
    } catch (e: any) {
      console.error("Failed to fetch notifications", e);
      setNotificationsError(getErrorMessage(e));
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [currentUser.uid]);

  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    setRoomsError(null);
    try {
      const data = await api.getRooms(currentUser.uid);
      setRooms(data);
    } catch (e: any) {
      console.error("Failed to fetch rooms", e);
      setRoomsError(getErrorMessage(e));
    } finally {
      setIsLoadingRooms(false);
    }
  }, [currentUser.uid]);

  const fetchShowcaseItems = useCallback(async () => {
    setIsLoadingShowcase(true);
    setShowcaseError(null);
    try {
      const data = await api.getShowcaseItems();
      setShowcaseItems(data);
    } catch (e: any) {
      console.error("Failed to fetch showcase items", e);
      setShowcaseError(getErrorMessage(e));
    } finally {
      setIsLoadingShowcase(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    try {
      const data = await api.getSuggestions();
      setSuggestions(data);
    } catch (e: any) {
      console.error("Failed to fetch suggestions", e);
      setSuggestionsError(getErrorMessage(e));
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const fetchChallenges = useCallback(async () => {
    setIsLoadingChallenges(true);
    setChallengesError(null);
    try {
      const data = await api.getChallenges();
      setChallenges(data);
    } catch (e: any) {
      console.error("Failed to fetch challenges", e);
      setChallengesError(getErrorMessage(e));
    } finally {
      setIsLoadingChallenges(false);
    }
  }, []);

  const fetchRoadmaps = useCallback(async () => {
    setIsLoadingRoadmaps(true);
    setRoadmapsError(null);
    try {
      const data = await api.getRoadmaps();
      setRoadmaps(data);
    } catch (e: any) {
      console.error("Failed to fetch roadmaps", e);
      setRoadmapsError(getErrorMessage(e));
    } finally {
      setIsLoadingRoadmaps(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    setIsLoadingTeams(true);
    setTeamsError(null);
    try {
      const data = await api.getTeams();
      setTeams(data);
    } catch (e: any) {
      console.error("Failed to fetch teams", e);
      setTeamsError(getErrorMessage(e));
    } finally {
      setIsLoadingTeams(false);
    }
  }, []);

  const fetchTeamChallenges = useCallback(async () => {
    setIsLoadingTeamChallenges(true);
    setTeamChallengesError(null);
    try {
      const data = await api.getTeamChallenges();
      setTeamChallenges(data);
    } catch (e: any) {
      console.error("Failed to fetch team challenges", e);
      setTeamChallengesError(getErrorMessage(e));
    } finally {
      setIsLoadingTeamChallenges(false);
    }
  }, []);

  const fetchVotingPositions = useCallback(async () => {
    setIsLoadingVoting(true);
    setVotingError(null);
    try {
      const data = await api.getVotingPositions();
      setVotingPositions(data);
    } catch (e: any) {
      console.error("Failed to fetch voting positions", e);
      setVotingError(getErrorMessage(e));
    } finally {
      setIsLoadingVoting(false);
    }
  }, []);

  const createVotingPosition = useCallback(async (position: Omit<VotingPosition, 'id' | 'createdAt' | 'status'>) => {
    try {
      const newPos = await api.addVotingPosition(position);
      setVotingPositions(prev => [newPos, ...prev]);
      showToast('Voting position created successfully', 'success');
      // Notify all users about new position
      await api.notifyAllUsers(`New voting position posted: ${newPos.title}`, 'voting', currentUser.uid);
    } catch (e: any) {
      console.error("Failed to create voting position", e);
      showToast('Failed to create voting position', 'error');
      throw e;
    }
  }, [currentUser.uid, showToast]);

  const updateVotingPosition = useCallback(async (id: string, updates: Partial<VotingPosition>) => {
    try {
      await api.updateVotingPosition(id, updates);
      setVotingPositions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      showToast('Voting position updated successfully', 'success');
    } catch (e: any) {
      console.error("Failed to update voting position", e);
      showToast('Failed to update voting position', 'error');
      throw e;
    }
  }, [showToast]);

  const fetchVotingContestants = useCallback(async (positionId: string) => {
    try {
      return await api.getVotingContestants(positionId);
    } catch (e: any) {
      console.error("Failed to fetch voting contestants", e);
      showToast('Failed to fetch contestants', 'error');
      return [];
    }
  }, [showToast]);

  const fetchAllVotingContestants = useCallback(async () => {
    try {
      const data = await api.getAllVotingContestants();
      setVotingContestants(data);
    } catch (e: any) {
      console.error("Failed to fetch all voting contestants", e);
    }
  }, []);

  const contestPosition = useCallback(async (positionId: string, manifesto: string) => {
    try {
      const newContestant = await api.contestPosition(positionId, currentUser.uid, manifesto);
      setVotingContestants(prev => [...prev, newContestant]);
      showToast('You have successfully entered the contest!', 'success');
      // Notify patrons about new contestant
      const patrons = allUsers.filter(u => u.role === 'PATRON').map(u => u.uid);
      const pos = votingPositions.find(p => p.id === positionId);
      await api.notifyUsers(patrons, `${currentUser.name} is contesting for ${pos?.title || 'a position'}`, 'voting', currentUser.uid);
    } catch (e: any) {
      console.error("Failed to contest position", e);
      const msg = getErrorMessage(e);
      if (msg.includes('unique constraint')) {
        showToast('You are already contesting for this position', 'warning');
      } else {
        showToast('Failed to enter contest', 'error');
      }
      throw e;
    }
  }, [currentUser.uid, currentUser.name, allUsers, votingPositions, showToast]);

  const fetchVotingVotes = useCallback(async (positionId: string) => {
    try {
      return await api.getVotingVotes(positionId);
    } catch (e: any) {
      console.error("Failed to fetch voting votes", e);
      return [];
    }
  }, []);

  const castVote = useCallback(async (positionId: string, contestantId: string) => {
    try {
      await api.castVote(positionId, currentUser.uid, contestantId);
      showToast('Vote cast successfully!', 'success');
    } catch (e: any) {
      console.error("Failed to cast vote", e);
      const msg = getErrorMessage(e);
      if (msg.includes('unique constraint')) {
        showToast('You have already voted for this position', 'warning');
      } else {
        showToast('Failed to cast vote', 'error');
      }
      throw e;
    }
  }, [currentUser.uid, showToast]);

  const deleteVotingPosition = useCallback(async (id: string) => {
    try {
      await api.deleteVotingPosition(id);
      showToast("Position deleted successfully.", "success");
      await fetchVotingPositions();
    } catch (e: any) {
      console.error("Failed to delete voting position", e);
      showToast("Failed to delete position.", "error");
      throw e;
    }
  }, [showToast, fetchVotingPositions]);

  const updateContestantStatus = useCallback(async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.updateContestantStatus(id, status);
      showToast(`Candidate ${status.toLowerCase()} successfully.`, 'success');
      await fetchAllVotingContestants();
    } catch (e: any) {
      console.error("Failed to update contestant status", e);
      showToast("Failed to update candidate status.", "error");
      throw e;
    }
  }, [showToast, fetchVotingPositions]);

  const clearUnreadCount = useCallback((roomId: string) => {
    setUnreadMessageCounts(prev => {
      if (!prev[roomId]) return prev;
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  }, []);

  const updateUserSkillLevel = useCallback(async (newLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    try {
      await api.updateUserSkillLevel(currentUser.uid, newLevel);
      setCurrentUser(prev => ({ ...prev, skillLevel: newLevel }));
      showToast(`Congratulations! You've been promoted to ${newLevel}.`, 'success');
    } catch (e: any) {
      console.error("Failed to update skill level", e);
      showToast("Failed to update skill level.", "error");
    }
  }, [currentUser.uid, showToast]);

  const fetchFeatureFlags = useCallback(async () => {
    try {
      const flags = await api.getFeatureFlags();
      setFeatureFlags({ ...defaultFeatureFlags, ...flags });
    } catch (e) {
      console.warn('Failed to fetch feature flags, using defaults', e);
      setFeatureFlags(defaultFeatureFlags);
    }
  }, []);

  const updateFeatureFlags = useCallback(async (updates: Partial<FeatureFlags>) => {
    setFeatureFlags(prev => ({ ...prev, ...updates }));
    try {
      const updated = await api.setFeatureFlags(updates);
      setFeatureFlags({ ...defaultFeatureFlags, ...updated });
    } catch (e) {
      console.error('Failed to update feature flags', e);
    }
  }, []);

  const resetFeatureFlags = useCallback(async () => {
    setFeatureFlags(defaultFeatureFlags);
    try {
      const updated = await api.setFeatureFlags(defaultFeatureFlags);
      setFeatureFlags({ ...defaultFeatureFlags, ...updated });
    } catch (e) {
      console.error('Failed to reset feature flags', e);
    }
  }, []);

  useEffect(() => {
    fetchFeatureFlags();

    const mapFlags = (row: any): FeatureFlags => ({
      showFeed: row.show_feed,
      showActivities: row.show_activities,
      showAttendance: row.show_attendance,
      showProjects: row.show_projects,
      showResources: row.show_resources,
      showChat: row.show_chat,
      showShowcase: row.show_showcase,
      showSuggestions: row.show_suggestions,
      showChallenges: row.show_challenges,
      showRoadmap: row.show_roadmap,
      showCommunity: row.show_community,
      showPlayground: row.show_playground,
      showGames: row.show_games ?? defaultFeatureFlags.showGames,
      showVoting: row.show_voting ?? defaultFeatureFlags.showVoting
    });

    const channel = supabase.channel('feature_flags_listener')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feature_flags' },
        (payload) => {
          if (payload.new) {
            setFeatureFlags({ ...defaultFeatureFlags, ...mapFlags(payload.new) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeatureFlags]);

  // Effect to perform the client-side join for resources
  useEffect(() => {
    if (isLoadingUsers || resourcesError) {
      return;
    }

    const userMap: Map<string, User> = new Map(allUsers.map(user => [user.uid, user]));

    const enrichedResources = rawResources.map(resource => {
      const uploader = userMap.get(resource.uploaderUid);
      return {
        ...resource,
        uploaderName: uploader?.name || 'Unknown User',
        uploaderAvatarUrl: uploader?.avatarUrl,
      };
    });

    setResources(enrichedResources);
    setIsLoadingResources(false);
  }, [rawResources, allUsers, isLoadingUsers, resourcesError]);

  // Realtime Presence for Online Users
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUser.uid,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        // The keys of the presence state object are the presence keys we set (user UIDs)
        const onlineUserIds = Object.keys(newState);
        setOnlineUsers(onlineUserIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Realtime subscription for global messages (unread counts) and notifications
  useEffect(() => {
    if (!currentUser) return;

    const messageChannel = supabase.channel('global_messages_listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id === currentUser.uid) return;
          const isRelevantRoom = rooms.some(r => r.id === newMsg.room_id);
          if (isRelevantRoom) {
            setUnreadMessageCounts(prev => ({
              ...prev,
              [newMsg.room_id]: (prev[newMsg.room_id] || 0) + 1
            }));
            const room = rooms.find(r => r.id === newMsg.room_id);
            const title = room?.title ? `New message in ${room.title}` : 'New message';
            const body = typeof newMsg.content === 'string' && newMsg.content.length > 0
              ? (newMsg.content.length > 80 ? `${newMsg.content.slice(0, 80)}…` : newMsg.content)
              : 'You received a new message.';
            showBrowserNotification(title, body);
          }
        }
      )
      .subscribe();

    const notificationChannel = supabase.channel(`notifications:${currentUser.uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          // Uses user_uid column
          filter: `user_uid=eq.${currentUser.uid}`
        },
        (payload) => {
          const newNotifRaw = payload.new as any;
          const newNotif: AppNotification = {
            id: newNotifRaw.id.toString(),
            message: newNotifRaw.message,
            isRead: newNotifRaw.is_read,
            createdAt: new Date(newNotifRaw.created_at).toLocaleString('en-US', { timeZone: 'Africa/Kampala' }),
            linkTo: newNotifRaw.link_to,
            // Uses user_uid column
            userId: newNotifRaw.user_uid,
          };
          setNotifications(prev => [newNotif, ...prev]);

          // Trigger Toast for new notification
          showToast(newNotif.message, 'info');
          showBrowserNotification('ClubHub Notification', newNotif.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [currentUser, rooms, showToast, showBrowserNotification]);

  // Real-time listener for all club data
  useEffect(() => {
    if (!currentUser) return;

    const dataChannel = supabase.channel('club_data_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => fetchActivities())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchChallenges())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_items' }, () => fetchFeedItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => fetchResources())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'showcase_items' }, () => fetchShowcaseItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, () => fetchSuggestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_challenges' }, () => fetchTeamChallenges())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_positions' }, () => fetchVotingPositions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_contestants' }, () => fetchAllVotingContestants())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_leaderboard' }, () => {
          // General refresh if needed
      })
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users',
          filter: `uid=eq.${currentUser.uid}`
      }, (payload) => {
          if (payload.new) {
              const u = payload.new as any;
              setCurrentUser({
                  uid: u.uid,
                  email: u.email,
                  name: u.name,
                  username: u.username,
                  studentClass: u.class_name,
                  role: u.role,
                  status: u.status,
                  avatarUrl: u.avatar_url,
                  bio: u.bio,
                  phoneNumber: u.phone_number,
                  skillLevel: u.skill_level,
                  badges: u.badges,
                  lastLogin: u.last_login
              });
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dataChannel);
    };
  }, [currentUser, fetchActivities, fetchChallenges, fetchFeedItems, fetchResources, fetchUsers, fetchShowcaseItems, fetchSuggestions, fetchTeams, fetchTeamChallenges, fetchVotingPositions, fetchAllVotingContestants]);


  // Fetch all data when the provider mounts
  useEffect(() => {
    if (currentUser) {
      Promise.all([
        fetchActivities(),
        fetchAttendance(),
        fetchFeedItems(),
        fetchProjectData(),
        fetchUsers(),
        fetchNotifications(),
        fetchRooms(),
        fetchShowcaseItems(),
        fetchSuggestions(),
        fetchChallenges(),
        fetchRoadmaps(),
        fetchTeams(),
        fetchTeamChallenges(),
        fetchVotingPositions(),
        fetchAllVotingContestants(),
      ]).then(() => {
        fetchResources();
      });
    }
  }, [currentUser, fetchActivities, fetchAttendance, fetchFeedItems, fetchProjectData, fetchUsers, fetchResources, fetchNotifications, fetchRooms, fetchShowcaseItems, fetchSuggestions, fetchChallenges, fetchRoadmaps, fetchTeams, fetchTeamChallenges, fetchVotingPositions]);

  const value = {
    activities,
    attendance,
    feedItems,
    projectData,
    setProjectData,
    allUsers,
    onlineUsers,
    resources,
    notifications,
    rooms,
    showcaseItems,
    suggestions,
    challenges,
    roadmaps,
    teams,
    teamChallenges,
    votingPositions,
    votingContestants,
    votingVotes,
    unreadMessageCounts,
    clearUnreadCount,
    isLoadingActivities,
    isLoadingAttendance,
    isLoadingFeed,
    isLoadingProjects,
    isLoadingUsers,
    isLoadingResources,
    isLoadingNotifications,
    isLoadingRooms,
    isLoadingShowcase,
    isLoadingSuggestions,
    isLoadingChallenges,
    isLoadingRoadmaps,
    isLoadingTeams,
    isLoadingTeamChallenges,
    isLoadingVoting,
    activitiesError,
    attendanceError,
    feedItemsError,
    projectDataError,
    allUsersError,
    resourcesError,
    notificationsError,
    roomsError,
    showcaseError,
    suggestionsError,
    challengesError,
    roadmapsError,
    teamsError,
    teamChallengesError,
    votingError,
    isInitialLoading: isLoadingActivities || isLoadingAttendance || isLoadingFeed || isLoadingProjects || isLoadingUsers || isLoadingResources || isLoadingNotifications || isLoadingRooms || isLoadingShowcase || isLoadingSuggestions || isLoadingChallenges || isLoadingRoadmaps || isLoadingTeams || isLoadingTeamChallenges || isLoadingVoting,
    fetchActivities,
    fetchAttendance,
    fetchFeedItems,
    fetchProjectData,
    fetchUsers,
    fetchResources,
    fetchNotifications,
    fetchRooms,
    fetchShowcaseItems,
    fetchSuggestions,
    fetchChallenges,
    fetchRoadmaps,
    fetchTeams,
    fetchTeamChallenges,
    fetchVotingPositions,
    createVotingPosition,
    updateVotingPosition,
    fetchVotingContestants,
    fetchAllVotingContestants,
    contestPosition,
    fetchVotingVotes,
    castVote,
    updateContestantStatus,
    deleteVotingPosition,
    updateUserSkillLevel,
    featureFlags,
    updateFeatureFlags,
    resetFeatureFlags,
    notificationPrefs,
    updateNotificationPrefs,

    // New Toast exports
    toasts,
    showToast,
    removeToast,

    // Alert Modal
    alertConfig,
    showAlert,
    hideAlert
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
