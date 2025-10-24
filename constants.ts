import { Activity, AttendanceRecord, FeedItem, User, ProjectData } from './types';

// FIX: Changed properties to match the User type. `id` is now `uid` (string), `password` is removed, and `email` is added.
export const mockUsers: User[] = [
  { uid: '1', name: 'Admin Patron', username: 'patron', role: 'PATRON', email: 'patron@example.com', status: 'APPROVED' },
  { uid: '2', name: 'Alice', username: 'alice', role: 'MEMBER', email: 'alice@example.com', status: 'APPROVED' },
  { uid: '3', name: 'Bob', username: 'bob', role: 'MEMBER', email: 'bob@example.com', status: 'APPROVED' },
  { uid: '4', name: 'Charlie', username: 'charlie', role: 'MEMBER', email: 'charlie@example.com', status: 'PENDING' },
  { uid: '5', name: 'Diana Patron', username: 'diana', role: 'PATRON', email: 'diana@example.com', status: 'APPROVED' },
];

export const mockActivities: Activity[] = [
  {
    // FIX: Changed id from number to string to match Activity type.
    id: '1',
    title: 'Weekly Coding Challenge',
    date: 'Oct 28, 2023',
    description: 'Solve a series of algorithmic puzzles. Prizes for the top 3 participants!',
    location: 'Online via Discord',
  },
  {
    // FIX: Changed id from number to string to match Activity type.
    id: '2',
    title: 'Guest Speaker: React Hooks',
    date: 'Nov 04, 2023',
    description: 'A senior engineer from a top tech company will discuss advanced React Hooks patterns.',
    location: 'Room 404, Tech Hall',
  },
  {
    // FIX: Changed id from number to string to match Activity type.
    id: '3',
    title: 'Project Showcase Night',
    date: 'Nov 11, 2023',
    description: 'Members present their personal projects. A great opportunity for networking and feedback.',
    location: 'Main Auditorium',
  },
  {
    // FIX: Changed id from number to string to match Activity type.
    id: '4',
    title: 'Hackathon Kick-off',
    date: 'Nov 18, 2023',
    description: 'The start of our annual 48-hour hackathon. Form teams and start building!',
    location: 'Innovation Hub',
  },
];

export const mockAttendance: AttendanceRecord[] = [
  // FIX: Changed id and activityId from number to string to match AttendanceRecord type.
  { id: '1', activityId: '1', activityTitle: 'Weekly Coding Challenge', date: 'Oct 28, 2023', status: 'Present' },
  { id: '2', activityId: '1', activityTitle: 'Intro to Git & GitHub', date: 'Oct 21, 2023', status: 'Present' },
  { id: '3', activityId: '1', activityTitle: 'CSS Flexbox Workshop', date: 'Oct 14, 2023', status: 'Absent' },
  { id: '4', activityId: '1', activityTitle: 'Club Kick-off Meeting', date: 'Oct 07, 2023', status: 'Present' },
  { id: '5', activityId: '1', activityTitle: 'API Fundamentals', date: 'Sep 30, 2023', status: 'Excused' },
  { id: '6', activityId: '1', activityTitle: 'Data Structures Review', date: 'Sep 23, 2023', status: 'Present' },
  { id: '7', activityId: '1', activityTitle: 'JavaScript Async/Await', date: 'Sep 16, 2023', status: 'Present' },
];

export const mockFeedItems: FeedItem[] = [
    {
        // FIX: Changed id from number to string to match FeedItem type.
        id: '1',
        type: 'EVENT_ANNOUNCEMENT',
        author: 'Club President',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=president',
        timestamp: '2 days ago',
        content: {
            title: 'Hackathon Kick-off Next Week!',
            message: 'Get ready for our annual 48-hour hackathon. Form your teams and prepare to build something amazing. More details in the Activities tab.',
            activityId: 4,
        }
    },
    {
        // FIX: Changed id from number to string to match FeedItem type.
        id: '2',
        type: 'MEMBER_POST',
        author: 'Alice',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=alice',
        timestamp: '3 days ago',
        content: {
            message: 'Has anyone worked with the new Deno 2.0 release? Looking for thoughts on fresh projects vs. migrating existing Node apps. Let\'s chat!',
        },
        likes: 12,
    },
    {
        // FIX: Changed id from number to string to match FeedItem type.
        id: '3',
        type: 'NEWS_UPDATE',
        author: 'Club Secretary',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=secretary',
        timestamp: '5 days ago',
        content: {
            title: 'New Club T-Shirts Are Here!',
            message: 'The new batch of club t-shirts has arrived. You can pick yours up at the next meeting. They look awesome!',
        }
    },
    {
        // FIX: Changed id from number to string to match FeedItem type.
        id: '4',
        type: 'EVENT_ANNOUNCEMENT',
        author: 'Club President',
        authorAvatarUrl: 'https://i.pravatar.cc/40?u=president',
        timestamp: '1 week ago',
        content: {
            title: 'Guest Speaker: Advanced React Hooks',
            message: 'Don\'t miss our next event featuring a senior engineer who will dive deep into advanced React Hooks patterns. A great learning opportunity!',
            activityId: 2,
        }
    }
];

export const mockProjectData: ProjectData = {
    tasks: {
        // FIX: Changed assigneeId from number to string to match ProjectTask type.
        'task-1': { id: 'task-1', content: 'Design new club logo', assigneeId: '2' },
        'task-2': { id: 'task-2', content: 'Plan social media campaign for hackathon' },
        // FIX: Changed assigneeId from number to string to match ProjectTask type.
        'task-3': { id: 'task-3', content: 'Develop sign-up form for guest speaker event', assigneeId: '3' },
        // FIX: Changed assigneeId from number to string to match ProjectTask type.
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