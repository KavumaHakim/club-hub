

export type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'profile' | 'members' | 'playground' | 'resources' | 'chat';

export interface User {
  uid: string; // Changed from id: number
  email: string;
  name: string;
  username: string;
  role: 'MEMBER' | 'PATRON';
  status: 'APPROVED' | 'PENDING';
  avatarUrl?: string;
  phoneNumber?: string;
}

export type ActivityCategory = 'WORKSHOP' | 'SOCIAL' | 'COMPETITION' | 'GUEST_SPEAKER' | 'OTHER';

export interface Activity {
  id: string; // Use Firestore document ID
  title: string;
  date: string;
  description: string;
  location: string;
  category: ActivityCategory;
  rsvpUserIds: string[]; // List of user IDs who have RSVP'd
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused';

export interface AttendanceRecord {
  id: string; // Use Firestore document ID
  activityId: string;
  activityTitle: string;
  date: string;
  status: AttendanceStatus;
  userId: string;
}

export type FeedItemType = 'EVENT_ANNOUNCEMENT' | 'MEMBER_POST' | 'NEWS_UPDATE';

export interface FeedItem {
  id: string; // Use Firestore document ID
  type: FeedItemType;
  author: string;
  authorAvatarUrl: string;
  timestamp: string; // This will be handled by Supabase server timestamps
  title?: string;
  message: string;
}

export interface FeedComment {
  id: string;
  feedItemId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  content: string;
  createdAt: string;
}

// New types for Project Board
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProjectTask {
  id: string;
  content: string;
  assigneeId?: string; // Changed to string to store user UID
  isCompleted?: boolean;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
}

export interface ProjectColumn {
  id: string;
  title: string;
  taskIds: string[];
}

export interface ProjectData {
  tasks: { [key: string]: ProjectTask };
  columns: { [key: string]: ProjectColumn };
  columnOrder: string[];
}

export type ResourceType = 'LINK' | 'VIDEO' | 'PYTHON';

export type ResourceCategory = 'Documentation' | 'Tutorial' | 'Tool' | 'Article' | 'Other';

export interface Resource {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  topic?: string;
  url?: string; // For LINK and VIDEO types
  filePath?: string; // Path in storage bucket
  uploaderUid: string;
  uploaderName: string;
  uploaderAvatarUrl?: string;
}

export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkTo?: Tab;
  userId: string;
}

// Chat Types
export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
  metadata?: any;
}

export interface Room {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  participantIds: string[];
  createdBy: string; // ID of the user who created the group
  lastMessage?: Message; // For display purposes in the list
}
