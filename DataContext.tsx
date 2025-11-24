
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Activity, AttendanceRecord, FeedItem, ProjectData, User, Resource, Notification, Room, ShowcaseItem, Suggestion, Challenge, ChallengeSubmission } from './types';
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
  notifications: Notification[];
  rooms: Room[];
  showcaseItems: ShowcaseItem[];
  suggestions: Suggestion[];
  challenges: Challenge[];
  
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
}

// Create the context with a default value
const DataContext = createContext<IDataContext | undefined>(undefined);

// Create a provider component
export const DataProvider: React.FC<{ children: ReactNode; currentUser: User }> = ({ children, currentUser }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rawResources, setRawResources] = useState<Omit<Resource, 'uploaderName' | 'uploaderAvatarUrl'>[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<Record<string, number>>({});

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

  // ... (keep existing fetch functions: fetchActivities, fetchAttendance, fetchFeedItems, etc.)
  const fetchActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch (e: any) {
      console.error("Failed to fetch activities", e);
      setActivitiesError(e.message || 'An unknown error occurred.');
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
      setAttendanceError(e.message || 'An unknown error occurred.');
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
      setFeedItemsError(e.message || 'An unknown error occurred.');
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
      setProjectDataError(e.message || 'An unknown error occurred.');
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
      setAllUsersError(e.message || 'An unknown error occurred.');
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
      setResourcesError(e.message || 'An unknown error occurred.');
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
        setNotificationsError(e.message || 'An unknown error occurred.');
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
        setRoomsError(e.message || 'An unknown error occurred.');
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
        setShowcaseError(e.message || 'An unknown error occurred.');
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
        setSuggestionsError(e.message || 'An unknown error occurred.');
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
        setChallengesError(e.message || 'An unknown error occurred.');
    } finally {
        setIsLoadingChallenges(false);
    }
  }, []);
  
  const clearUnreadCount = useCallback((roomId: string) => {
    setUnreadMessageCounts(prev => {
        if (!prev[roomId]) return prev;
        const next = { ...prev };
        delete next[roomId];
        return next;
    });
  }, []);

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
                filter: `user_uid=eq.${currentUser.uid}` 
            },
            (payload) => {
                const newNotifRaw = payload.new as any;
                const newNotif: Notification = {
                    id: newNotifRaw.id.toString(),
                    message: newNotifRaw.message,
                    isRead: newNotifRaw.is_read,
                    createdAt: new Date(newNotifRaw.created_at).toLocaleString('en-US', { timeZone: 'Africa/Kampala' }),
                    linkTo: newNotifRaw.link_to,
                    userId: newNotifRaw.user_uid,
                };
                setNotifications(prev => [newNotif, ...prev]);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(notificationChannel);
    };
  }, [currentUser, rooms]); 


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
      ]).then(() => {
        fetchResources();
      });
    }
  }, [currentUser, fetchActivities, fetchAttendance, fetchFeedItems, fetchProjectData, fetchUsers, fetchResources, fetchNotifications, fetchRooms, fetchShowcaseItems, fetchSuggestions, fetchChallenges]);

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
    isInitialLoading: isLoadingActivities || isLoadingAttendance || isLoadingFeed || isLoadingProjects || isLoadingUsers || isLoadingResources || isLoadingNotifications || isLoadingRooms || isLoadingShowcase || isLoadingSuggestions || isLoadingChallenges,
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