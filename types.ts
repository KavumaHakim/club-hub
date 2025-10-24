export interface User {
  uid: string; // Changed from id: number
  email: string;
  name: string;
  username: string;
  role: 'MEMBER' | 'PATRON';
  status: 'APPROVED' | 'PENDING';
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
}

export type FeedItemType = 'EVENT_ANNOUNCEMENT' | 'MEMBER_POST' | 'NEWS_UPDATE';

export interface FeedItem {
  id: string; // Use Firestore document ID
  type: FeedItemType;
  author: string;
  authorAvatarUrl: string;
  timestamp: string; // This will be handled by Firestore server timestamps
  content: {
    title?: string;
    message: string;
    activityId?: number;
  };
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