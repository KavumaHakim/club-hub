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
  id: 'deploy-a61b8d6',
  commit: 'a61b8d6',
  deployedAt: '2026-05-11',
  headline: 'Challenge evaluation and feed activity update',
  summary: 'This deployment improves challenge submission stability and makes recent activity ordering more reliable.',
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
};

