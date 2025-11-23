
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
// FIX: Imported the new Notification type.
import { Activity, AttendanceRecord, FeedItem, ProjectData, User, Resource, Notification, Room } from './types';
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
  resources: Resource[];
  // FIX: Added notifications to the context interface.
  notifications: Notification[];
  rooms: Room[];
  
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
  // FIX: Added notification loading state.
  isLoadingNotifications: boolean;
  isLoadingRooms: boolean;
  isInitialLoading: boolean;

  // Error states
  activitiesError: string | null;
  attendanceError: string | null;
  feedItemsError: string | null;
  projectDataError: string | null;
  allUsersError: string | null;
  resourcesError: string | null;
  // FIX: Added notification error state.
  notificationsError: string | null;
  roomsError: string | null;

  // Refetch functions
  fetchActivities: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  fetchFeedItems: () => Promise<void>;
  fetchProjectData: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchResources: () => Promise<void>;
  // FIX: Added notification fetch function.
  fetchNotifications: () => Promise<void>;
  fetchRooms: () => Promise<void>;
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
  const [resources, setResources] = useState<Resource[]>([]);
  const [rawResources, setRawResources] = useState<Omit<Resource, 'uploaderName' | 'uploaderAvatarUrl'>[]>([]);
  // FIX: Added state for notifications.
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<Record<string, number>>({});

  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  // FIX: Added loading state for notifications.
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [feedItemsError, setFeedItemsError] = useState<string | null>(null);
  const [projectDataError, setProjectDataError] = useState<string | null>(null);
  const [allUsersError, setAllUsersError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  // FIX: Added error state for notifications.
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);

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
      setIsLoadingResources(false); // Ensure loading stops on error
    }
  }, []);

  // FIX: Added fetchNotifications function.
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
    if (isLoadingUsers || resourcesError) { // Don't process if users are loading or there was an error fetching resources
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
    setIsLoadingResources(false); // Mark final resources as loaded
  }, [rawResources, allUsers, isLoadingUsers, resourcesError]);
  
  // Realtime subscription for global messages (unread counts)
  useEffect(() => {
    if (!currentUser) return;
    
    // Subscribe to INSERT events on the messages table
    const channel = supabase.channel('global_messages_listener')
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            },
            (payload) => {
                const newMsg = payload.new as any;
                
                // Don't count own messages
                if (newMsg.sender_id === currentUser.uid) return;

                // Check if the user is a member of the room where the message was sent
                // We depend on the 'rooms' state being somewhat up-to-date.
                // Note: If 'rooms' state is stale (e.g. user added to new room but didn't refresh), 
                // they won't get notified until 'rooms' updates.
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

    return () => {
        supabase.removeChannel(channel);
    };
  }, [currentUser, rooms]); // Re-subscribe if rooms list changes (e.g. joined new room)


  // Fetch all data when the provider mounts (i.e., when the user logs in)
  useEffect(() => {
    if (currentUser) {
      Promise.all([
        fetchActivities(),
        fetchAttendance(),
        fetchFeedItems(),
        fetchProjectData(),
        fetchUsers(),
        // FIX: Fetch notifications on initial load.
        fetchNotifications(),
        fetchRooms(),
      ]).then(() => {
        // After users are fetched, resources can be fetched and joined
        fetchResources();
      });
    }
  // FIX: Added fetchNotifications to the dependency array.
  }, [currentUser, fetchActivities, fetchAttendance, fetchFeedItems, fetchProjectData, fetchUsers, fetchResources, fetchNotifications, fetchRooms]);

  const value = {
    activities,
    attendance,
    feedItems,
    projectData,
    setProjectData,
    allUsers,
    resources,
    // FIX: Provide notification state through context.
    notifications,
    rooms,
    unreadMessageCounts,
    clearUnreadCount,
    isLoadingActivities,
    isLoadingAttendance,
    isLoadingFeed,
    isLoadingProjects,
    isLoadingUsers,
    isLoadingResources,
    // FIX: Provide notification loading state.
    isLoadingNotifications,
    isLoadingRooms,
    activitiesError,
    attendanceError,
    feedItemsError,
    projectDataError,
    allUsersError,
    resourcesError,
    // FIX: Provide notification error state.
    notificationsError,
    roomsError,
    // FIX: Include notification loading state in the overall initial loading flag.
    isInitialLoading: isLoadingActivities || isLoadingAttendance || isLoadingFeed || isLoadingProjects || isLoadingUsers || isLoadingResources || isLoadingNotifications || isLoadingRooms,
    fetchActivities,
    fetchAttendance,
    fetchFeedItems,
    fetchProjectData,
    fetchUsers,
    fetchResources,
    // FIX: Provide notification fetch function.
    fetchNotifications,
    fetchRooms,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Create a custom hook for easy access to the context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
