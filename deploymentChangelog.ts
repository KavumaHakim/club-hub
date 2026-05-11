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

export const LATEST_DEPLOYMENT_CHANGELOG: DeploymentChangelogEntry = {
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
};
