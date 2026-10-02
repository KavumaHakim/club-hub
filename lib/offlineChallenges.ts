import type { Challenge } from '../types';
import { PYODIDE_CORE_FILES } from '../services/sandboxRunner';

// On-device storage for practising challenges without a connection:
//  - the last challenge list fetched (test cases included), so the page and the
//    workspace open offline;
//  - a queue of submissions judged while offline, sent when the connection returns.
// Everything is in localStorage, wrapped in try/catch: a private window or a full
// quota just means offline practice isn't available, never a crash.

const CHALLENGES_KEY = 'clubhub_offline_challenges_v1';
const QUEUE_KEY = 'clubhub_pending_submissions_v1';

export interface SavedChallenges {
    savedAt: string;
    items: Challenge[];
}

/** A submission made offline. `verdict` is set when the local judge ran (test-graded
 *  challenges); AI-reviewed ones, or tests that couldn't run, are judged on send. */
export interface PendingSubmission {
    id: string;
    challengeId: string;
    challengeTitle: string;
    userId: string;
    code: string;
    createdAt: string;
    verdict?: { passed: boolean; testsPassed: number; testsTotal: number };
    /** Set once the row is inserted, so a retry after a failed follow-up write doesn't insert twice. */
    submissionId?: string;
}

const read = <T,>(key: string): T | null => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
};

const write = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* storage blocked or full: offline practice just isn't saved */
    }
};

export const saveChallenges = (items: Challenge[]) => write(CHALLENGES_KEY, { savedAt: new Date().toISOString(), items });

export const readSavedChallenges = (): SavedChallenges | null => read<SavedChallenges>(CHALLENGES_KEY);

const readQueue = (): PendingSubmission[] => read<PendingSubmission[]>(QUEUE_KEY) || [];

export const PENDING_CHANGED_EVENT = 'clubhub:pending-submissions';

const writeQueue = (queue: PendingSubmission[]) => {
    write(QUEUE_KEY, queue);
    window.dispatchEvent(new CustomEvent(PENDING_CHANGED_EVENT));
};

export const listPending = (userId: string, challengeId?: string) =>
    readQueue().filter(p => p.userId === userId && (!challengeId || p.challengeId === challengeId));

export const enqueuePending = (item: Omit<PendingSubmission, 'id' | 'createdAt'>): PendingSubmission => {
    const entry: PendingSubmission = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
    };
    writeQueue([...readQueue(), entry]);
    return entry;
};

export const updatePending = (id: string, patch: Partial<PendingSubmission>) =>
    writeQueue(readQueue().map(p => (p.id === id ? { ...p, ...patch } : p)));

export const removePending = (id: string) => writeQueue(readQueue().filter(p => p.id !== id));

/** True when a failure looks like "no connection" rather than a real error. */
export const isOfflineError = (error: unknown) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    const message = String((error as any)?.message || error || '').toLowerCase();
    return message.includes('failed to fetch') || message.includes('network') || message.includes('offline');
};

/** Ask the service worker to save the Python runtime now, so Python challenges run offline later. */
export const warmOfflineRuntime = async () => {
    try {
        if (!('serviceWorker' in navigator) || !navigator.onLine) return;
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.active?.postMessage({ type: 'WARM_URLS', urls: PYODIDE_CORE_FILES });
    } catch {
        /* no service worker: online-only, as before */
    }
};
