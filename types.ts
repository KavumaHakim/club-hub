

export type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'profile' | 'members' | 'playground' | 'resources' | 'chat' | 'showcase' | 'suggestions' | 'challenges' | 'roadmap' | 'community' | 'admin';

export interface FeatureFlags {
  showFeed: boolean;
  showActivities: boolean;
  showAttendance: boolean;
  showProjects: boolean;
  showResources: boolean;
  showChat: boolean;
  showShowcase: boolean;
  showSuggestions: boolean;
  showChallenges: boolean;
  showRoadmap: boolean;
  showCommunity: boolean;
  showPlayground: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  memberIds: string[];
  joinRequests?: TeamJoinRequest[];
}

export type TeamJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  requesterId: string;
  status: TeamJoinRequestStatus;
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface TeamChallengeSubmission {
  userId: string;
  note: string;
  submittedAt: string;
}

export interface TeamChallenge {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  submissions: Record<string, TeamChallengeSubmission>;
}

export interface PlaygroundProject {
  id: string;
  name: string;
  language: 'python' | 'javascript' | 'html' | 'web';
  createdBy: string;
  teamId?: string | null;
  createdAt: string;
}

export interface PlaygroundProjectFile {
  id: string;
  projectId: string;
  path: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaygroundProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export interface PlaygroundProjectMember {
  id: string;
  projectId: string;
  userId: string;
  addedBy: string;
  addedAt: string;
}

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

export type FeedItemType = 'EVENT_ANNOUNCEMENT' | 'MEMBER_POST' | 'NEWS_UPDATE' | 'POLL';

export interface PollVoter {
  uid: string;
  name: string;
  avatarUrl?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  isVoted: boolean; // Computed on frontend based on current user
  voters?: PollVoter[]; // List of voters (visible to patrons)
}

export interface FeedItem {
  id: string; // Use Firestore document ID
  type: FeedItemType;
  author: string;
  authorAvatarUrl: string;
  timestamp: string; // This will be handled by Supabase server timestamps
  title?: string;
  message: string; // For Polls, this is the Question
  commentCount?: number;
  pollOptions?: PollOption[];
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
  tags?: string[];
  submissions?: { 
    [userId: string]: { 
      filePath: string; 
      submittedAt: string; 
      grade?: number | null;
      feedback?: string | null;
    } 
  };
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

export type ResourceType = 'LINK' | 'VIDEO' | 'PYTHON' | 'DOCUMENT';

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

// Renamed from Notification to avoid conflict with window.Notification
export interface AppNotification {
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
  likes?: string[]; // Array of user IDs who liked the post
  commentCount?: number;
}

export interface ShowcaseComment {
  id: string;
  showcaseItemId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  content: string;
  createdAt: string;
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
  upvotes?: string[]; // Array of user IDs
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

export interface NotificationPrefs {
  browserEnabled: boolean;
  notifyWhenAway: boolean;
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
