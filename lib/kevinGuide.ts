import type { Tab } from '../types';

// What Kevin (the AI tutor) knows about the hub itself. The model behind Kevin was
// trained months before today, so without this it describes the hub as it was, or
// guesses. Keep it short and current: when a screen changes, change its line here,
// and add a line to HUB_UPDATES when something ships.

/** One line per screen, in sidebar order. */
export const HUB_SCREENS: Partial<Record<Tab, { label: string; what: string }>> = {
  feed: { label: 'Feed', what: 'Club announcements and posts; like and comment.' },
  community: { label: 'Community', what: 'The member roster and the club teams: view members, create a team, and see team challenges.' },
  chat: { label: 'Messages', what: 'Direct messages and group chats with other members.' },
  challenges: {
    label: 'Challenges',
    what: 'Coding challenges that earn badges. Open one to get a LeetCode-style workspace: the problem on the left, a code editor, '
      + 'Run (checks the visible examples) and Submit (runs every test, hidden ones included; all must pass for the badge). '
      + 'Most challenges are print-style: an ordinary program reads the input (input() in Python, readline() in JavaScript) and prints the answer. '
      + 'Some use a solve(input_text) function instead; the "How it\'s judged" box on each challenge says which. '
      + 'Challenges and their tests are saved on the device, so Run and Submit work offline; offline submissions send when the connection returns.',
  },
  arena: { label: 'Duel Arena', what: 'Live 1v1 duels: challenge a member from the lobby or watch a running duel. Duels mix quick quiz questions with Python coding problems answered with a solve(input_text) function.' },
  suggestions: { label: 'Suggestions', what: 'Post ideas for the club and upvote other members\' ideas.' },
  voting: { label: 'Voting', what: 'Club polls and elections.' },
  activities: { label: 'Activities', what: 'Upcoming club sessions and events; RSVP and see who is attending.' },
  projects: { label: 'Projects', what: 'The club project board: tasks in columns, assigned to members.' },
  attendance: { label: 'Attendance', what: 'Attendance records for club sessions.' },
  roadmap: { label: 'Roadmap', what: 'Personal learning roadmaps: milestones with resources, generated for a topic and level.' },
  resources: { label: 'Resources', what: 'The club library of notes, links and videos.' },
  playground: { label: 'Playground', what: 'A code editor that runs Python, JavaScript and web (HTML/CSS/JS) projects in the browser; save scripts and work in multi-file projects.' },
  games: { label: 'Games', what: 'Coding games and their leaderboards.' },
  showcase: { label: 'Showcase', what: 'Members\' finished projects and the community leaderboard.' },
  members: { label: 'Members', what: 'Patrons only: approve and manage members.' },
  admin: { label: 'Admin Tools', what: 'Patrons only: feature switches and club settings.' },
  profile: { label: 'Profile', what: 'Your details, skill level, badges and coding streak.' },
};

/** What changed recently, newest first. Dates are when it went live. */
export const HUB_UPDATES: { date: string; text: string }[] = [
  { date: '2026-10-02', text: 'Challenges accept ordinary print-style programs: read the input and print the answer, no solve() needed.' },
  { date: '2026-10-02', text: '40 Stage 1 and Stage 2 practice challenges (each in Python and JavaScript), open until 31 January 2027.' },
  { date: '2026-10-02', text: 'Challenges work offline, and the app keeps the newest version for offline use.' },
  { date: '2026-10-02', text: 'Patrons can submit challenge answers too; Submit always judges every test.' },
  { date: '2026-10-02', text: 'New Community screen (roster and teams), Duel Arena lobby and Playground layout.' },
  { date: '2026-10-01', text: 'New "Split" design across every screen.' },
  { date: '2026-09-30', text: 'Challenges graded automatically by code test cases, in a full editor workspace.' },
];

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** The guide as prompt text, with the screen the student has open marked. */
export const describeHub = (currentTab?: Tab): string => {
  const screens = Object.entries(HUB_SCREENS)
    .map(([tab, s]) => `- ${s!.label}${tab === currentTab ? ' (open now)' : ''}: ${s!.what}`)
    .join('\n');
  const updates = HUB_UPDATES.map(u => `- ${formatDay(u.date)}: ${u.text}`).join('\n');
  return `SCREENS (sidebar):\n${screens}\n\nRECENT UPDATES:\n${updates}`;
};
