import { Activity, AttendanceRecord, FeedItem, User, ProjectData } from './types';

// FIX: Added password property and updated user emails to enable local-only authentication.
export const mockUsers: (User & { password?: string })[] = [
  { uid: '1', name: 'Admin Patron', username: 'patron', role: 'PATRON', email: 'patron@clubhub.local', status: 'APPROVED', password: 'password', avatarUrl: 'https://i.pravatar.cc/128?u=patron' },
  { uid: '2', name: 'Demo Member', username: 'member', role: 'MEMBER', email: 'member@clubhub.local', status: 'APPROVED', password: 'password', avatarUrl: 'https://i.pravatar.cc/128?u=member' },
  { uid: '3', name: 'Bob', username: 'bob', role: 'MEMBER', email: 'bob@example.com', status: 'APPROVED', password: 'password', avatarUrl: 'https://i.pravatar.cc/128?u=bob' },
  { uid: '4', name: 'Charlie', username: 'charlie', role: 'MEMBER', email: 'charlie@example.com', status: 'PENDING', password: 'password', avatarUrl: 'https://i.pravatar.cc/128?u=charlie' },
  { uid: '5', name: 'Diana Patron', username: 'diana', role: 'PATRON', email: 'diana@example.com', status: 'APPROVED', password: 'password', avatarUrl: 'https://i.pravatar.cc/128?u=diana' },
];

export const mockActivities: Activity[] = [
  {
    id: '1',
    title: 'Weekly Coding Challenge',
    date: '2023-10-28',
    description: 'Solve a series of algorithmic puzzles. Prizes for the top 3 participants!',
    location: 'Online via Discord',
  },
  {
    id: '2',
    title: 'Guest Speaker: React Hooks',
    date: '2023-11-04',
    description: 'A senior engineer from a top tech company will discuss advanced React Hooks patterns.',
    location: 'Room 404, Tech Hall',
  },
  {
    id: '3',
    title: 'Project Showcase Night',
    date: '2023-11-11',
    description: 'Members present their personal projects. A great opportunity for networking and feedback.',
    location: 'Main Auditorium',
  },
  {
    id: '4',
    title: 'Hackathon Kick-off',
    date: '2023-11-18',
    description: 'The start of our annual 48-hour hackathon. Form teams and start building!',
    location: 'Innovation Hub',
  },
];

export const mockAttendance: AttendanceRecord[] = [
  // FIX: Added missing 'userId' property to all mock attendance records to match the AttendanceRecord type.
  { id: '1', userId: '2', activityId: '1', activityTitle: 'Weekly Coding Challenge', date: '2023-10-28', status: 'Present' },
  { id: '2', userId: '2', activityId: '1', activityTitle: 'Intro to Git & GitHub', date: '2023-10-21', status: 'Present' },
  { id: '3', userId: '2', activityId: '1', activityTitle: 'CSS Flexbox Workshop', date: '2023-10-14', status: 'Absent' },
  { id: '4', userId: '2', activityId: '1', activityTitle: 'Club Kick-off Meeting', date: '2023-10-07', status: 'Present' },
  { id: '5', userId: '2', activityId: '1', activityTitle: 'API Fundamentals', date: '2023-09-30', status: 'Excused' },
  { id: '6', userId: '2', activityId: '1', activityTitle: 'Data Structures Review', date: '2023-09-23', status: 'Present' },
  { id: '7', userId: '2', activityId: '1', activityTitle: 'JavaScript Async/Await', date: '2023-09-16', status: 'Present' },
];

export const mockFeedItems: FeedItem[] = [
    {
        id: '1',
        type: 'EVENT_ANNOUNCEMENT',
        author: 'Admin Patron',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=patron',
        timestamp: '2 days ago',
        title: 'Hackathon Kick-off Next Week!',
        message: 'Get ready for our annual 48-hour hackathon. Form your teams and prepare to build something amazing. More details in the Activities tab.',
    },
    {
        id: '2',
        type: 'MEMBER_POST',
        author: 'Demo Member',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=member',
        timestamp: '3 days ago',
        message: 'Has anyone worked with the new Deno 2.0 release? Looking for thoughts on fresh projects vs. migrating existing Node apps. Let\'s chat!',
        likes: 12,
    },
    {
        id: '3',
        type: 'NEWS_UPDATE',
        author: 'Admin Patron',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=patron',
        timestamp: '5 days ago',
        title: 'New Club T-Shirts Are Here!',
        message: 'The new batch of club t-shirts has arrived. You can pick yours up at the next meeting. They look awesome!',
    },
    {
        id: '4',
        type: 'EVENT_ANNOUNCEMENT',
        author: 'Admin Patron',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=patron',
        timestamp: '1 week ago',
        title: 'Guest Speaker: Advanced React Hooks',
        message: 'Don\'t miss our next event featuring a senior engineer who will dive deep into advanced React Hooks patterns. A great learning opportunity!',
    }
];

export const mockProjectData: ProjectData = {
    tasks: {
        'task-1': { id: 'task-1', content: 'Design new club logo', assigneeId: '2' },
        'task-2': { id: 'task-2', content: 'Plan social media campaign for hackathon' },
        'task-3': { id: 'task-3', content: 'Develop sign-up form for guest speaker event', assigneeId: '3' },
        'task-4': { id: 'task-4', content: 'Test and deploy the new club website', assigneeId: '2' },
        'task-5': { id: 'task-5', content: 'Write tutorial on setting up a dev environment' },
        'task-6': { id: 'task-6', content: 'Organize pizza and drinks for project showcase' },
        'task-7': { id: 'task-7', content: 'Update the club\'s GitHub repository with new resources' },
    },
    columns: {
        'column-1': {
            id: 'column-1',
            title: 'Backlog',
            taskIds: ['task-5', 'task-6', 'task-7'],
        },
        'column-2': {
            id: 'column-2',
            title: 'In Progress',
            taskIds: ['task-2', 'task-3'],
        },
        'column-3': {
            id: 'column-3',
            title: 'Done',
            taskIds: ['task-1', 'task-4'],
        },
    },
    columnOrder: ['column-1', 'column-2', 'column-3'],
};