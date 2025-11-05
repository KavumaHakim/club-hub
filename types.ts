export interface User {
  uid: string; // Changed from id: number
  email: string;
  name: string;
  username: string;
  role: 'MEMBER' | 'PATRON';
  status: 'APPROVED' | 'PENDING';
  avatarUrl?: string;
}

export interface Activity {
  id: string; // Use Firestore document ID
  title: string;
  date: string;
  description: string;
  location: string;
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
  timestamp: string; // This will be handled by Firestore server timestamps
  title?: string;
  message: string;
  likes?: number;
}

// New types for Project Board
export interface ProjectTask {
  id: string;
  content: string;
  assigneeId?: string; // Changed to string to store user UID
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