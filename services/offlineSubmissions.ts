import type { Challenge, User } from '../types';
import * as api from './apiService';
import { submitChallengeSolution, ChallengeEvaluationError } from './challengeJudge';
import { listPending, removePending, updatePending, readSavedChallenges, isOfflineError } from '../lib/offlineChallenges';

// Sends submissions that were made offline. Items judged on the device keep their
// verdict (the same browser judge a live Submit uses); the rest are judged now.
// An item leaves the queue only after it is fully recorded, and the inserted row id
// is kept on the item so a retry never inserts it twice.

let flushing = false;

export interface FlushResult {
    sent: number;
    passed: string[];
    remaining: number;
}

export const flushPendingSubmissions = async (user: User, challenges: Challenge[]): Promise<FlushResult> => {
    const result: FlushResult = { sent: 0, passed: [], remaining: 0 };
    if (flushing || !navigator.onLine) {
        result.remaining = listPending(user.uid).length;
        return result;
    }
    flushing = true;
    try {
        const known = new Map<string, Challenge>();
        for (const c of readSavedChallenges()?.items || []) known.set(c.id, c);
        for (const c of challenges) known.set(c.id, c);

        for (const item of listPending(user.uid)) {
            try {
                if (item.verdict) {
                    const submissionId = item.submissionId || await api.submitChallenge(item.challengeId, user.uid, item.code);
                    if (!item.submissionId) updatePending(item.id, { submissionId });
                    await api.reviewSubmission(
                        submissionId,
                        item.verdict.passed ? 'APPROVED' : 'REJECTED',
                        item.challengeTitle,
                        user.uid,
                        { passed: item.verdict.testsPassed, total: item.verdict.testsTotal },
                    );
                    if (item.verdict.passed) result.passed.push(item.challengeTitle);
                } else {
                    const challenge = known.get(item.challengeId);
                    if (!challenge) {
                        // The challenge is gone (deleted); nothing to send it to.
                        removePending(item.id);
                        continue;
                    }
                    const evaluation = await submitChallengeSolution(challenge, user.uid, item.code);
                    if (evaluation.passed) result.passed.push(item.challengeTitle);
                }
                removePending(item.id);
                result.sent += 1;
            } catch (error) {
                if (error instanceof ChallengeEvaluationError) {
                    // Saved, but couldn't be judged now: it waits as PENDING for a patron.
                    removePending(item.id);
                    result.sent += 1;
                    continue;
                }
                // Offline again (or the server refused): keep it for the next attempt.
                console.warn('Could not send an offline submission yet', error);
                if (isOfflineError(error)) break;
            }
        }
    } finally {
        flushing = false;
    }
    result.remaining = listPending(user.uid).length;
    return result;
};
