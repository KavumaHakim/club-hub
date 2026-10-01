import type { Tab } from '../types';

/** Ask the Challenges tab to open a challenge's workspace (detail: challenge id). */
export const OPEN_CHALLENGE_EVENT = 'clubhub:open-challenge';
/** Survives a tab switch that happens before Challenges has mounted. */
export const OPEN_CHALLENGE_KEY = 'open_challenge_id';

/** Jump to the Challenges tab with this challenge's workspace open. */
export const openChallengeWorkspace = (challengeId: string, setActiveTab?: (tab: Tab) => void) => {
  sessionStorage.setItem(OPEN_CHALLENGE_KEY, challengeId);
  window.dispatchEvent(new CustomEvent(OPEN_CHALLENGE_EVENT, { detail: challengeId }));
  setActiveTab?.('challenges');
};
