

export type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'profile' | 'members' | 'playground' | 'resources' | 'chat' | 'showcase' | 'suggestions' | 'challenges' | 'roadmap';

export interface User {
  uid: string; // Changed from id: number
  email: string;
  name: string;
  username: string;
  role: 'MEMBER' | 'PATRON';
  status: 'APPROVED' | 'PENDING';
  avatarUrl?: string;
  phoneNumber?: string;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  badges?: string[]; // List of challenge titles won
  lastLogin?: string; // ISO Date string
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
  commentCount?: number;
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
  columnId: string;
  assigneeIds: string[]; // Changed from assigneeId: string | null
  isCompleted?: boolean;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  submissions?: { [userId: string]: { filePath: string; submittedAt: string; grade?: number | null } };
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

export interface ShowcaseItem {
  id: string;
  createdAt: string;
  userUid: string;
  userName: string;
  userAvatarUrl?: string;
  title: string;
  description: string;
  codeContent: string;
  likes: string[]; // Array of user IDs who liked the post
}

// Suggestions Types
export type SuggestionType = 'FEATURE' | 'BUG';
export type SuggestionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  status: SuggestionStatus;
  createdAt: string;
  upvotes: string[]; // Array of user IDs
}

// Challenges Types
export interface Challenge {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdBy: string;
  createdAt: string;
  status: 'ACTIVE' | 'CLOSED';
}

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  content: string;
  status: SubmissionStatus;
  submittedAt: string;
}

// Toast Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Roadmap Types
export interface RoadmapResource {
  title: string;
  type: 'VIDEO' | 'ARTICLE' | 'DOCS' | 'PRACTICE';
  url: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  duration: string; // e.g., "1 Week"
  resources: RoadmapResource[];
}

export interface Roadmap {
  id?: string;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  topic: string; // e.g. "Python Basics" or "Data Structures"
  milestones: Milestone[];
  updatedAt?: string;
}

export interface RoadmapProgress {
  id: string;
  userId: string;
  roadmapId: string;
  completedMilestoneIndices: number[];
}