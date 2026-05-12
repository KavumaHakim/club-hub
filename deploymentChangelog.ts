export interface DeploymentChangelogItem {
  title: string;
  details: string;
  expectation: string;
}

export interface DeploymentChangelogEntry {
  id: string;
  commit: string;
  deployedAt: string;
  headline: string;
  summary: string;
  items: DeploymentChangelogItem[];
}

export const DEPLOYMENT_CHANGELOGS: DeploymentChangelogEntry[] = [
  {
    id: 'deploy-challenge-sync',
    commit: 'working-tree',
    deployedAt: '2026-05-12',
    headline: 'Challenge Sync & Playground Enhancements',
    summary: 'This deployment streamlines the challenge submission workflow with automated prompts, multi-line commenting, and improved playground reliability.',
    items: [
      {
        title: 'Instant Challenge Sync to Playground',
        details: 'Clicking "Make a submission" now instantly injects the challenge title, difficulty, deadline, and description into the editor as a multi-line comment.',
        expectation: 'Users should be able to start challenges immediately with all requirements pre-loaded in the editor.',
      },
      {
        title: 'Clean Multi-line Commenting',
        details: 'Challenges are injected using native block comments: """ for Python, /* */ for JS, and <!-- --> for HTML.',
        expectation: 'The editor should remain tidy and professional while providing full reference context.',
      },
      {
        title: 'Improved Python Runner (Script Mode)',
        details: 'The Python runner now operates in "Script Mode," only printing explicit print() calls to prevent docstrings from cluttering the output.',
        expectation: 'Users should only see the output they explicitly request, making debugging cleaner.',
      },
      {
        title: 'Reactive Challenge Mode',
        details: 'Challenge mode now activates instantly upon tab switching without requiring a page reload.',
        expectation: 'The "Submit Challenge" button and context should appear the moment a user switches from a challenge card.',
      },
    ],
  },
  {
    id: 'deploy-chat-replies',
    commit: 'working-tree',
    deployedAt: '2026-05-11',
    headline: 'Chat replies and mobile reply flow',
    summary: 'This deployment adds Instagram-style chat replies, reply previews, and touch-friendly reply actions on mobile.',
    items: [
      {
        title: 'Messages can now reply to other messages',
        details: 'Chat messages now carry reply metadata so users can respond directly to a specific earlier message.',
        expectation: 'Users should be able to reply to a message and see that relationship preserved in the conversation.',
      },
      {
        title: 'Reply previews appear in both composer and message bubbles',
        details: 'When replying, the composer shows a target preview, and sent replies render with a compact quoted preview above the new message.',
        expectation: 'Users should understand exactly which message is being replied to before and after sending.',
      },
      {
        title: 'Reply works better on mobile',
        details: 'A visible reply action is available on smaller screens, and long-pressing a bubble also starts a reply.',
        expectation: 'Mobile users should be able to reply without needing desktop-only right-click behavior.',
      },
    ],
  },
  {
    id: 'deploy-8701ba6',
    commit: '8701ba6',
    deployedAt: '2026-05-11',
    headline: 'Streak tracking and login updates',
    summary: 'This deployment adds persistent login streak tracking, grace handling, and a simpler streak badge experience in the app header.',
    items: [
      {
        title: 'Persistent login streaks are now tracked',
        details: 'User streak data is now stored and updated at login, including streak count, last active date, and grace usage state.',
        expectation: 'Users should keep a running day streak across sessions instead of relying on temporary browser-only state.',
      },
      {
        title: 'One late exception is supported',
        details: 'A missed day can be forgiven once before the streak resets. After the grace is used, a later miss breaks the streak.',
        expectation: 'Users should see Duolingo-style streak protection behavior, with a warning when grace is consumed or the streak is lost.',
      },
      {
        title: 'Streak UI was simplified to a badge',
        details: 'The full streak panel was removed from the dashboard, leaving a compact streak badge in the header and a fuller status view in the profile.',
        expectation: 'Users should see streak status without losing dashboard space, while still being able to inspect more detail in the profile.',
      },
    ],
  },
  {
    id: 'deploy-a61b8d6',
    commit: 'a61b8d6',
    deployedAt: '2026-05-11',
    headline: 'Stability and feed ordering update',
    summary: 'This deployment improved challenge submission stability and made recent activity ordering more reliable.',
    items: [
      {
        title: 'Challenge evaluation is more fault tolerant',
        details: 'Challenge auto-evaluation now normalizes AI responses before the feedback modal renders.',
        expectation: 'Submitting a challenge should no longer blank the interface just because the AI returned an unexpected shape.',
      },
      {
        title: 'Recent activity ordering is more consistent',
        details: 'Feed activity timestamps are now sorted using full timestamps instead of mixed date-only values.',
        expectation: 'The Recent Activity panel should show the newest activity at the top and older activity below it.',
      },
      {
        title: 'Playground output handling was tightened',
        details: 'Console output handling was adjusted to preserve formatting more reliably during code execution.',
        expectation: 'Code output should be easier to read, especially for multiline results.',
      },
    ],
  },
];

export const LATEST_DEPLOYMENT_CHANGELOG = DEPLOYMENT_CHANGELOGS[0];

