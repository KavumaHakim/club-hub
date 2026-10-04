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
      + 'Challenges and their tests are saved on the device, so Run and Submit work offline; offline submissions send when the connection returns. '
      + 'Python starts loading as soon as a Python challenge opens; the tests get 30 seconds once it has loaded.',
  },
  arena: {
    label: 'Duel Arena',
    what: 'Live 1v1 duels. In the lobby, the Players tab and the search box find any member by name, username or class; '
      + 'each has a Challenge button (or Accept if they already challenged you, or Watch if they are in a duel). '
      + 'The Rules tab sets how the duels you send are played: Python or JavaScript, number of questions, quiz/coding/mixed, difficulty (or auto, matched to both players), time per question, ranked or casual. '
      + 'Patrons set club-wide limits there that every member\'s rules must fit in; the opponent sees the rules on the challenge before accepting. '
      + 'Questions are set in everyday life; coding answers are a solve(input_text) function (solve(inputText) in JavaScript). '
      + 'On a computer, drag the divider beside the code to make the editor wider (double-click it to reset).',
  },
  suggestions: { label: 'Suggestions', what: 'Post ideas for the club and upvote other members\' ideas.' },
  voting: { label: 'Voting', what: 'Club polls and elections.' },
  activities: { label: 'Activities', what: 'Upcoming club sessions and events; RSVP and see who is attending.' },
  projects: { label: 'Projects', what: 'The club project board: tasks in columns, assigned to members.' },
  attendance: { label: 'Attendance', what: 'Attendance records for club sessions.' },
  roadmap: { label: 'Roadmap', what: 'Personal learning roadmaps: milestones with resources, generated for a topic and level.' },
  resources: { label: 'Resources', what: 'The club library of notes, links and videos.' },
  playground: { label: 'Playground', what: 'A code editor that runs Python, JavaScript and web (HTML/CSS/JS) projects in the browser; save scripts and work in multi-file projects.' },
  games: {
    label: 'Games',
    what: 'The Games lounge: short games that each teach one idea, each with a leaderboard of best scores. '
      + 'Quick games (no coding): Number Hunt (binary search), Traffic Rules (if / else if / else, AND, OR, NOT), '
      + 'Secret Messages (Caesar cipher: algorithms and keys), Pixel Painter (pictures as 1s and 0s, run-length compression). '
      + 'Code puzzles in Python or JavaScript: Code Jigsaw (put shuffled lines in order), Trace the Variable (predict what a program prints), '
      + 'Bug Squash (tap the wrong line), Sort Showdown (sort by swapping neighbours in the fewest swaps).',
  },
  showcase: { label: 'Showcase', what: 'Members\' finished projects and the community leaderboard.' },
  members: { label: 'Members', what: 'Patrons only: approve and manage members.' },
  admin: { label: 'Admin Tools', what: 'Patrons only: feature switches and club settings.' },
  profile: { label: 'Profile', what: 'Your details, skill level, badges and coding streak.' },
};

/** The code editors (Playground, challenges, duels, Code Runner) all work the same way. */
export const HUB_EDITORS = [
  'Python and JavaScript editors check the code as you type, with no need to press Run first.',
  'Red underline: an error that will stop the program, e.g. a misspelled or undefined name '
    + '("\'totl\' isn\'t defined"), a syntax error, or assigning to a const in JavaScript. '
    + 'Yellow underline (Python) or faded text (JavaScript): a warning, e.g. an unused variable or import. Hover the underline to read the message.',
  'Suggestions appear while typing and after a dot (nums. shows list methods); Ctrl+Space opens them. They show each function\'s parameters and docs.',
  'Hover a name to see what it is: a function\'s parameters and docs, or a variable\'s type.',
  'While typing a function\'s arguments, a box shows its parameters with the current one in bold.',
  'The first time a Python editor opens it loads Python in the background, so suggestions and underlines can take a little while to appear, longer on phones; after that they are quick, and work offline.',
  'The same help is on in duels, for both players.',
];

/** What changed recently, newest first. Dates are when it went live. */
export const HUB_UPDATES: { date: string; text: string }[] = [
  { date: '2026-10-04', text: 'New Games lounge: eight new games that each teach a computing idea, from binary search to debugging, with leaderboards.' },
  { date: '2026-10-04', text: 'Duel Arena: a Rules tab to choose language (Python or JavaScript), number and type of questions, difficulty and timing for your duels, within limits set by the patrons.' },
  { date: '2026-10-03', text: 'Code editors check Python and JavaScript as you type: suggestions, hover docs, parameter hints, and mistakes underlined before you run.' },
  { date: '2026-10-03', text: 'Duel Arena: search for any member and challenge them from the new Players tab.' },
  { date: '2026-10-03', text: 'Duel Arena: new look matching the rest of the hub, everyday-life questions, and a code editor you can drag wider.' },
  { date: '2026-10-03', text: 'Python tests no longer time out on phones while Python is loading, and get 30 seconds to run.' },
  { date: '2026-10-02', text: 'Patrons\' AI challenge generator writes print-style challenges with 12 to 15 tests and stories from everyday life.' },
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
  const editors = HUB_EDITORS.map(line => `- ${line}`).join('\n');
  return `SCREENS (sidebar):\n${screens}\n\nCODE EDITORS (Playground, challenges, duels):\n${editors}\n\nRECENT UPDATES:\n${updates}`;
};
