import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Activity, AttendanceRecord, FeedItem, ProjectData, User } from './types';
import * as api from './services/apiService';

// Define the shape of the context state
interface IDataContext {
  // Data
  activities: Activity[];
  attendance: AttendanceRecord[];
  feedItems: FeedItem[];
  projectData: ProjectData | null;
  allUsers: User[];

  // Loading states
  isLoadingActivities: boolean;
  isLoadingAttendance: boolean;
  isLoadingFeed: boolean;
  isLoadingProjects: boolean;
  isLoadingUsers: boolean;
  isInitialLoading: boolean;

  // Refetch functions
  fetchActivities: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  fetchFeedItems: () => Promise<void>;
  fetchProjectData: () => Promise<void>;
  fetchUsers: () => Promise<void>;
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

  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const fetchActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch (e) {
      console.error("Failed to fetch activities", e);
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    setIsLoadingAttendance(true);
    try {
      const data = await api.getAttendance(currentUser.uid);
      setAttendance(data);
    } catch (e) {
      console.error("Failed to fetch attendance", e);
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [currentUser.uid]);
  
  const fetchFeedItems = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      const data = await api.getFeedItems();
      setFeedItems(data);
    } catch (e) {
      console.error("Failed to fetch feed items", e);
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const fetchProjectData = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const data = await api.getProjectData();
      setProjectData(data);
    } catch (e) {
      console.error("Failed to fetch project data", e);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);
  
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.getUsers();
      setAllUsers(data);
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);
  
  // Fetch all data when the provider mounts (i.e., when the user logs in)
  useEffect(() => {
    if (currentUser) {
      Promise.all([
        fetchActivities(),
        fetchAttendance(),
        fetchFeedItems(),
        fetchProjectData(),
        fetchUsers()
      ]);
    }
  }, [currentUser, fetchActivities, fetchAttendance, fetchFeedItems, fetchProjectData, fetchUsers]);

  const value = {
    activities,
    attendance,
    feedItems,
    projectData,
    allUsers,
    isLoadingActivities,
    isLoadingAttendance,
    isLoadingFeed,
    isLoadingProjects,
    isLoadingUsers,
    isInitialLoading: isLoadingActivities || isLoadingAttendance || isLoadingFeed || isLoadingProjects || isLoadingUsers,
    fetchActivities,
    fetchAttendance,
    fetchFeedItems,
    fetchProjectData,
    fetchUsers,
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
