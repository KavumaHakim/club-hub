
import { supabase } from './supabaseClient';
import { User, Activity, AttendanceRecord, AttendanceStatus, FeedItem, ProjectData, ProjectTask, Resource, AppNotification, Room, ShowcaseItem, GalleryItem, Suggestion, Challenge, ChallengeSubmission, FeedComment, SuggestionType, SuggestionStatus, SubmissionStatus, ActivityCategory, FeedItemType, TaskPriority, ResourceCategory, ResourceType, Tab, Roadmap, RoadmapProgress, ShowcaseComment, Message, Team, TeamChallenge, TeamChallengeSubmission, PlaygroundProject, PlaygroundProjectFile, PlaygroundProjectActivity, PlaygroundProjectMember, FeatureFlags, GameLeaderboardEntry } from '../types';

// --- Helper for Notifications ---
const insertNotifications = async (notifications: Array<{ user_uid: string; message: string; is_read: boolean; link_to: Tab }>) => {
    if (notifications.length === 0) return;
    const { error } = await supabase
        .from('notifications')
        .upsert(notifications, {
            onConflict: 'user_uid,message,link_to',
            ignoreDuplicates: true
        });
    if (error) {
        const msg = (error.message || '').toLowerCase();
        const isConflict =
            (error as any).status === 409 ||
            error.code === '23505' ||
            msg.includes('duplicate') ||
            msg.includes('conflict');
        if (!isConflict) {
            throw error;
        }
    }
};

export const notifyAllUsers = async (message: string, linkTo: Tab, excludeUid?: string) => {
    const { data: users } = await supabase.from('users').select('uid');
    if (!users) return;

    const notifications = users
        .filter(u => u.uid !== excludeUid)
        .map(u => ({
            user_uid: u.uid,
            message,
            is_read: false,
            link_to: linkTo
        }));

    await insertNotifications(notifications);

    try {
        await sendPushNotifications({
            userIds: notifications.map(n => n.user_uid),
            title: 'ClubHub',
            body: message,
            url: '/'
        });
    } catch (error) {
        console.warn("Push notify failed", error);
    }
};

export const notifyUsers = async (userIds: string[], message: string, linkTo: Tab, excludeUid?: string) => {
    const uniqueIds = Array.from(new Set(userIds.filter(uid => uid && uid !== excludeUid)));
    if (uniqueIds.length === 0) return;
    const notifications = uniqueIds.map(uid => ({
        user_uid: uid,
        message,
        is_read: false,
        link_to: linkTo
    }));
    await insertNotifications(notifications);

    try {
        await sendPushNotifications({
            userIds: notifications.map(n => n.user_uid),
            title: 'ClubHub',
            body: message,
            url: '/'
        });
    } catch (error) {
        console.warn("Push notify failed", error);
    }
};

const truncateText = (text: string, maxLen: number) => {
    if (!text) return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
};

export const sendEmail = async (payload: { to: string | string[]; subject: string; html?: string; text?: string }) => {
    const { data, error } = await supabase.functions.invoke('send-email', {
        body: payload
    });
    if (error) throw error;
    return data;
};

const mapFeatureFlagsFromDb = (row: any): FeatureFlags => ({
    showFeed: row.show_feed,
    showActivities: row.show_activities,
    showAttendance: row.show_attendance,
    showProjects: row.show_projects,
    showGallery: row.show_gallery ?? true,
    showResources: row.show_resources,
    showChat: row.show_chat,
    showShowcase: row.show_showcase,
    showSuggestions: row.show_suggestions,
    showChallenges: row.show_challenges,
    showRoadmap: row.show_roadmap,
    showCommunity: row.show_community,
    showPlayground: row.show_playground,
    showGames: row.show_games ?? true,
    showVoting: row.show_voting ?? true
});

const mapFeatureFlagsToDb = (updates: Partial<FeatureFlags>) => {
    const payload: any = {};
    if (typeof updates.showFeed === 'boolean') payload.show_feed = updates.showFeed;
    if (typeof updates.showActivities === 'boolean') payload.show_activities = updates.showActivities;
    if (typeof updates.showAttendance === 'boolean') payload.show_attendance = updates.showAttendance;
    if (typeof updates.showProjects === 'boolean') payload.show_projects = updates.showProjects;
    if (typeof updates.showResources === 'boolean') payload.show_resources = updates.showResources;
    if (typeof updates.showChat === 'boolean') payload.show_chat = updates.showChat;
    if (typeof updates.showShowcase === 'boolean') payload.show_showcase = updates.showShowcase;
    if (typeof updates.showSuggestions === 'boolean') payload.show_suggestions = updates.showSuggestions;
    if (typeof updates.showChallenges === 'boolean') payload.show_challenges = updates.showChallenges;
    if (typeof updates.showRoadmap === 'boolean') payload.show_roadmap = updates.showRoadmap;
    if (typeof updates.showCommunity === 'boolean') payload.show_community = updates.showCommunity;
    if (typeof updates.showPlayground === 'boolean') payload.show_playground = updates.showPlayground;
    if (typeof updates.showGallery === 'boolean') payload.show_gallery = updates.showGallery;
    if (typeof updates.showGames === 'boolean') payload.show_games = updates.showGames;
    if (typeof updates.showVoting === 'boolean') payload.show_voting = updates.showVoting;
    payload.updated_at = new Date().toISOString();
    return payload;
};

// --- Auth & User ---

export const login = async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required for login");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
};

export const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error && error.message !== 'Auth session missing!') throw error;
};

export const signUp = async (userData: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }) => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                name: userData.name,
                username: userData.username,
                studentClass: userData.studentClass,
                phoneNumber: userData.phoneNumber,
                skillLevel: userData.skillLevel,
                role: 'MEMBER',
                status: 'PENDING'
            }
        }
    });
    if (error) throw error;

    if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
            uid: data.user.id,
            email: userData.email,
            name: userData.name,
            username: userData.username,
            class_name: userData.studentClass,
            phone_number: userData.phoneNumber,
            skill_level: userData.skillLevel,
            role: 'MEMBER',
            status: 'PENDING'
        }).select().single();

        if (profileError && profileError.code !== '23505') {
            console.error("Error creating user profile:", profileError);
        }
    }
};

export const signUpAsPatron = async (userData: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }) => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                name: userData.name,
                username: userData.username,
                studentClass: userData.studentClass,
                phoneNumber: userData.phoneNumber,
                role: 'PATRON',
                status: 'PENDING'
            }
        }
    });
    if (error) throw error;

    if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
            uid: data.user.id,
            email: userData.email,
            name: userData.name,
            username: userData.username,
            class_name: userData.studentClass,
            phone_number: userData.phoneNumber,
            role: 'PATRON',
            status: 'PENDING'
        }).select().single();

        if (profileError && profileError.code !== '23505') {
            console.error("Error creating patron profile:", profileError);
        }
    }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase.from('users').select('*').eq('uid', userId).maybeSingle();
    if (error) return null;
    if (!data) return null;
    return {
        uid: data.uid,
        email: data.email,
        name: data.name,
        username: data.username,
        studentClass: data.class_name,
        role: data.role,
        status: data.status,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        phoneNumber: data.phone_number,
        skillLevel: data.skill_level,
        badges: data.badges,
        lastLogin: data.last_login,
        streakCount: data.streak_count ?? 0,
        streakLastActiveDate: data.streak_last_active_date ?? undefined,
        streakGraceUsed: data.streak_grace_used ?? false
    };
};

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*').order('name');
    if (error) throw error;
    return data.map((u: any) => ({
        uid: u.uid,
        email: u.email,
        name: u.name,
        username: u.username,
        studentClass: u.class_name,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        phoneNumber: u.phone_number,
        skillLevel: u.skill_level,
        badges: u.badges,
        lastLogin: u.last_login,
        streakCount: u.streak_count ?? 0,
        streakLastActiveDate: u.streak_last_active_date ?? undefined,
        streakGraceUsed: u.streak_grace_used ?? false
    }));
};

export const updateUser = async (uid: string, data: Partial<User>) => {
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.username) updates.username = data.username;
    if (data.studentClass !== undefined) updates.class_name = data.studentClass;
    if (data.role) updates.role = data.role;
    if (data.status) updates.status = data.status;
    if (data.avatarUrl) updates.avatar_url = data.avatarUrl;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.phoneNumber) updates.phone_number = data.phoneNumber;
    if (data.skillLevel) updates.skill_level = data.skillLevel;
    if (data.badges) updates.badges = data.badges;
    if (data.lastLogin) updates.last_login = data.lastLogin;
    if (data.streakCount !== undefined) updates.streak_count = data.streakCount;
    if (data.streakLastActiveDate !== undefined) updates.streak_last_active_date = data.streakLastActiveDate;
    if (data.streakGraceUsed !== undefined) updates.streak_grace_used = data.streakGraceUsed;

    const { error } = await supabase.from('users').update(updates).eq('uid', uid);
    if (error) throw error;
};

const STREAK_TIME_ZONE = 'Africa/Nairobi';

const getStreakDayKey = (date: Date = new Date()): string => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: STREAK_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = parts.find(part => part.type === 'year')?.value || '1970';
    const month = parts.find(part => part.type === 'month')?.value || '01';
    const day = parts.find(part => part.type === 'day')?.value || '01';
    return `${year}-${month}-${day}`;
};

const dayDiff = (fromDay: string, toDay: string): number => {
    const [fromYear, fromMonth, fromDate] = fromDay.split('-').map(Number);
    const [toYear, toMonth, toDate] = toDay.split('-').map(Number);
    const fromUtc = Date.UTC(fromYear, (fromMonth || 1) - 1, fromDate || 1);
    const toUtc = Date.UTC(toYear, (toMonth || 1) - 1, toDate || 1);
    return Math.floor((toUtc - fromUtc) / 86400000);
};

export type StreakLoginNotice =
    | { type: 'saved_with_grace'; title: string; message: string }
    | { type: 'broken'; title: string; message: string }
    | null;

export const syncUserLoginStreak = async (user: User): Promise<{ user: User; notice: StreakLoginNotice }> => {
    const today = getStreakDayKey();
    const previousDay = user.streakLastActiveDate;
    const currentCount = Math.max(0, user.streakCount || 0);
    const graceUsed = !!user.streakGraceUsed;

    if (!previousDay) {
        const updatedUser = {
            ...user,
            streakCount: 1,
            streakLastActiveDate: today,
            streakGraceUsed: false,
        };
        await updateUser(user.uid, {
            streakCount: 1,
            streakLastActiveDate: today,
            streakGraceUsed: false,
        });
        return { user: updatedUser, notice: null };
    }

    const diff = dayDiff(previousDay, today);
    if (diff <= 0) {
        return { user, notice: null };
    }

    if (diff === 1) {
        const updatedUser = {
            ...user,
            streakCount: currentCount + 1,
            streakLastActiveDate: today,
        };
        await updateUser(user.uid, {
            streakCount: updatedUser.streakCount,
            streakLastActiveDate: today,
        });
        return { user: updatedUser, notice: null };
    }

    if (diff === 2 && !graceUsed) {
        const updatedUser = {
            ...user,
            streakCount: currentCount + 1,
            streakLastActiveDate: today,
            streakGraceUsed: true,
        };
        await updateUser(user.uid, {
            streakCount: updatedUser.streakCount,
            streakLastActiveDate: today,
            streakGraceUsed: true,
        });
        return {
            user: updatedUser,
            notice: {
                type: 'saved_with_grace',
                title: 'Streak Saved',
                message: 'You were late, but your one streak exception saved this streak. Miss again and the streak will reset.',
            },
        };
    }

    const previousCount = Math.max(1, currentCount);
    const updatedUser = {
        ...user,
        streakCount: 1,
        streakLastActiveDate: today,
        streakGraceUsed: false,
    };
    await updateUser(user.uid, {
        streakCount: 1,
        streakLastActiveDate: today,
        streakGraceUsed: false,
    });
    return {
        user: updatedUser,
        notice: {
            type: 'broken',
            title: 'Streak Lost',
            message: `Your ${previousCount}-day streak ended because you missed too many days. Log in consistently to build it again.`,
        },
    };
};

export const deleteUser = async (uid: string) => {
    const safeDelete = async (table: string, match: Record<string, any>) => {
        const { error } = await supabase.from(table).delete().match(match);
        if (error && error.code !== '42P01') {
            throw error;
        }
    };

    const safeDeleteIn = async (table: string, column: string, values: string[] | number[]) => {
        if (!values || values.length === 0) return;
        const { error } = await supabase.from(table).delete().in(column, values);
        if (error && error.code !== '42P01') {
            throw error;
        }
    };

    try {
        await safeDelete('notifications', { user_uid: uid });
        await safeDelete('attendance', { user_uid: uid });
        await safeDelete('activity_rsvps', { user_uid: uid });
        await safeDelete('project_task_assignees', { user_uid: uid });
        await safeDelete('challenge_submissions', { user_uid: uid });
        await safeDelete('team_challenge_submissions', { user_uid: uid });
        await safeDelete('team_members', { user_uid: uid });
        await safeDelete('playground_project_activity', { user_uid: uid });
        await safeDelete('playground_project_files', { created_by: uid });
        await safeDelete('showcase_comments', { user_uid: uid });
        await safeDelete('suggestions', { user_uid: uid });
        await safeDelete('messages', { sender_id: uid });

        // Delete showcase items + their comments
        const { data: showcaseItems } = await supabase.from('showcase_items').select('id').eq('user_uid', uid);
        const showcaseIds = (showcaseItems || []).map((s: any) => String(s.id));
        await safeDeleteIn('showcase_comments', 'showcase_item_id', showcaseIds);
        await safeDeleteIn('showcase_items', 'id', showcaseIds);

        // Delete feed items + their comments + poll options/votes
        const { data: feedItems } = await supabase.from('feed_items').select('id').eq('author_uid', uid);
        const feedIds = (feedItems || []).map((f: any) => String(f.id));
        if (feedIds.length > 0) {
            const { data: pollOptions } = await supabase.from('poll_options').select('id, feed_item_id').in('feed_item_id', feedIds);
            const pollOptionIds = (pollOptions || []).map((p: any) => String(p.id));
            await safeDeleteIn('poll_votes', 'poll_option_id', pollOptionIds);
            await safeDeleteIn('poll_options', 'feed_item_id', feedIds);
            await safeDeleteIn('feed_comments', 'feed_item_id', feedIds);
            await safeDeleteIn('feed_items', 'id', feedIds);
        }
        await safeDelete('feed_comments', { user_uid: uid });
        await safeDelete('poll_votes', { user_uid: uid });

        // Delete resources by user
        await safeDelete('resources', { uploader_uid: uid });

        // Delete team challenges created by user and teams created by user (cascade)
        await safeDelete('team_challenges', { created_by: uid });
        await safeDelete('teams', { created_by: uid });

        // Delete playground projects created by user (cascade to files/activity)
        await safeDelete('playground_projects', { created_by: uid });

        // Delete rooms created by user (messages remain tied to room, so delete those rooms)
        await safeDelete('rooms', { created_by: uid });

        // Finally delete the profile
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('uid', uid);

        if (error) {
            console.error("Supabase Deletion Error Details:", error);
            if (error.code === '23503') {
                throw new Error("Cannot delete member: User still has linked records. Try again after clearing dependencies.");
            }
            throw new Error(error.message || "Failed to delete member profile.");
        }
        return true;
    } catch (error: any) {
        console.error("Delete user failed:", error);
        throw new Error(error.message || "Failed to delete member profile.");
    }
};

export const approveMember = async (uid: string) => {
    // Get user info for email
    const { data: userData } = await supabase.from('users').select('email, name').eq('uid', uid).single();

    const { error } = await supabase.from('users').update({ status: 'APPROVED' }).eq('uid', uid);
    if (error) throw error;

    // Send Approval Email
    if (userData?.email) {
        try {
            await sendEmail({
                to: userData.email,
                templateId: 'approval',
                templateData: {
                    name: userData.name,
                    origin: 'https://clubhub.hakimkavuma.space'
                }
            });
        } catch (emailErr) {
            console.warn("Failed to send approval email", emailErr);
        }
    }

    // Auto-add safely to the "Every one" group chat
    try {
        const { data: everyoneRoom } = await supabase
            .from('rooms')
            .select('id, metadata')
            .ilike('title', '%every%one%')
            .limit(1)
            .single();

        if (everyoneRoom) {
            const currentParticipants = everyoneRoom.metadata?.participants || [];
            if (!currentParticipants.includes(uid)) {
                await supabase.from('rooms').update({
                    metadata: { ...everyoneRoom.metadata, participants: [...currentParticipants, uid] }
                }).eq('id', everyoneRoom.id);
            }
        }
    } catch (err) {
        // Log but don't fail the approval if chat auto-add fails
        console.error("Failed to auto-add user to 'Every one' room:", err);
    }
};

export const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase.functions.invoke('request-password-reset', {
        body: { 
            email,
            redirectTo: 'https://clubhub.hakimkavuma.space/reset-password'
        }
    });
    if (error) throw error;
};

export const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
    if (error) throw error;
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
};

export const updateUserSkillLevel = async (userId: string, newLevel: string) => {
    const { error } = await supabase.from('users').update({ skill_level: newLevel }).eq('uid', userId);
    if (error) throw error;
};

// --- Feature Flags ---

export const getFeatureFlags = async (): Promise<FeatureFlags> => {
    const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
    if (error) throw error;
    if (!data) {
        throw new Error('Feature flags not initialized.');
    }
    return mapFeatureFlagsFromDb(data);
};

export const setFeatureFlags = async (updates: Partial<FeatureFlags>): Promise<FeatureFlags> => {
    const payload = mapFeatureFlagsToDb(updates);
    const { data, error } = await supabase
        .from('feature_flags')
        .update(payload)
        .eq('id', 1)
        .select()
        .maybeSingle();
    if (error) throw error;
    if (!data) {
        throw new Error('Failed to update feature flags.');
    }
    return mapFeatureFlagsFromDb(data);
};

// --- Activities ---

export const getActivities = async (): Promise<Activity[]> => {
    const { data, error } = await supabase
        .from('activities')
        .select(`
            *,
            activity_rsvps (
                user_uid
            )
        `);

    if (error) throw error;

    return data.map((a: any) => ({
        id: String(a.id),
        title: a.title,
        date: a.date,
        description: a.description,
        location: a.location,
        category: a.category,
        rsvpUserIds: a.activity_rsvps?.map((r: any) => r.user_uid) || []
    }));
};

export const addActivity = async (activity: Omit<Activity, 'id' | 'rsvpUserIds'>, creatorUid?: string): Promise<Activity> => {
    const { data, error } = await supabase.from('activities').insert({
        title: activity.title,
        date: activity.date,
        description: activity.description,
        location: activity.location,
        category: activity.category
    }).select().single();
    if (error) throw error;
    await notifyAllUsers(`New Activity: ${activity.title}`, 'activities', creatorUid);
    return {
        id: String(data.id),
        title: data.title,
        date: data.date,
        description: data.description,
        location: data.location,
        category: data.category,
        rsvpUserIds: []
    };
};

export const deleteActivity = async (activityId: string) => {
    const { error } = await supabase.from('activities').delete().eq('id', activityId);
    if (error) throw error;
};

export const toggleRSVP = async (activityId: string, userId: string, isJoining: boolean) => {
    if (isJoining) {
        const { error } = await supabase.from('activity_rsvps').insert({
            activity_id: activityId,
            user_uid: userId
        });
        if (error && error.code !== '23505') throw error;
    } else {
        const { error } = await supabase.from('activity_rsvps').delete().match({
            activity_id: activityId,
            user_uid: userId
        });
        if (error) throw error;
    }
};

// --- Attendance ---

export const getAttendance = async (userId: string): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
        .from('attendance')
        .select(`
            id,
            user_uid,
            activity_id,
            status,
            activities (
                title,
                date
            )
        `)
        .eq('user_uid', userId);

    if (error) throw error;

    return data.map((r: any) => ({
        id: String(r.id),
        activityId: String(r.activity_id),
        activityTitle: r.activities?.title || 'Unknown Activity',
        date: r.activities?.date || '',
        status: r.status,
        userId: r.user_uid
    }));
};

export const addAttendance = async (userId: string, record: Omit<AttendanceRecord, 'id' | 'userId'>) => {
    const { error } = await supabase.from('attendance').insert({
        user_uid: userId,
        activity_id: record.activityId,
        status: record.status
    });
    if (error) throw error;
};

export const addAttendanceBatch = async (records: Array<{ userId: string; activityId: string; status: AttendanceStatus }>) => {
    if (records.length === 0) return;
    const payload = records.map((record) => ({
        user_uid: record.userId,
        activity_id: record.activityId,
        status: record.status
    }));
    const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'user_uid,activity_id' });
    if (error) throw error;
};

export const markAttendanceOnLogin = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: activities } = await supabase.from('activities').select('*').eq('date', today);

    if (activities && activities.length > 0) {
        for (const activity of activities) {
            const { data: existing } = await supabase.from('attendance')
                .select('*')
                .eq('user_uid', userId)
                .eq('activity_id', activity.id)
                .maybeSingle();

            if (!existing) {
                await supabase.from('attendance').insert({
                    user_uid: userId,
                    activity_id: activity.id,
                    status: 'Present'
                });
            }
        }
    }
};

// --- Feed ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    const { data, error } = await supabase
        .from('feed_items')
        .select(`
            *,
            users (
                name,
                avatar_url
            ),
            feed_comments ( count ),
            poll_options (
                id,
                text,
                poll_votes ( 
                    user_uid,
                    users ( name, avatar_url )
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    const mapped = data.map((item: any) => ({
        id: String(item.id),
        type: item.type,
        author: item.users?.name || 'Unknown',
        authorAvatarUrl: item.users?.avatar_url,
        timestamp: item.created_at,
        title: item.title,
        message: item.message,
        imageUrl: item.image_url,
        commentCount: item.feed_comments[0]?.count || 0,
        pollOptions: item.poll_options ? item.poll_options.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.poll_votes ? opt.poll_votes.length : 0,
            isVoted: currentUserId ? opt.poll_votes?.some((v: any) => v.user_uid === currentUserId) : false,
            voters: opt.poll_votes ? opt.poll_votes.map((v: any) => ({
                uid: v.user_uid,
                name: v.users?.name || 'Unknown',
                avatarUrl: v.users?.avatar_url
            })) : []
        })) : []
    }));

    return mapped;
};

export const addFeedItem = async (item: { title: string, message: string, type: FeedItemType, imageUrl?: string, pollOptions?: string[] }, userId: string) => {
    const { data: newItem, error } = await supabase.from('feed_items').insert({
        type: item.type,
        title: item.title,
        message: item.message,
        image_url: item.imageUrl,
        author_uid: userId,
    }).select().single();

    if (error) throw error;

    if (item.type === 'POLL' && item.pollOptions && item.pollOptions.length > 0) {
        const optionsToInsert = item.pollOptions.map(opt => ({
            feed_item_id: newItem.id,
            text: opt
        }));
        const { error: pollError } = await supabase.from('poll_options').insert(optionsToInsert);
        if (pollError) throw pollError;
    }

    const headline = item.title || truncateText(item.message, 60) || 'New post';
    await notifyAllUsers(`New post: ${headline}`, 'feed', userId);
};

export const uploadFeedImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `feed/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('feed_images')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('feed_images')
        .getPublicUrl(filePath);

    return publicUrl;
};

export const deleteFeedItem = async (id: string) => {
    const { error } = await supabase.from('feed_items').delete().eq('id', id);
    if (error) throw error;
};

export const votePoll = async (feedItemId: string, optionId: string, userId: string) => {
    const { data: options } = await supabase.from('poll_options').select('id').eq('feed_item_id', feedItemId);

    if (options && options.length > 0) {
        const optionIds = options.map(o => o.id);
        await supabase.from('poll_votes')
            .delete()
            .in('poll_option_id', optionIds)
            .eq('user_uid', userId);
    }

    const { error } = await supabase.from('poll_votes').insert({
        poll_option_id: optionId,
        user_uid: userId
    });

    if (error) throw error;
};

export const getFeedComments = async (feedItemId: string): Promise<FeedComment[]> => {
    const { data: comments, error } = await supabase
        .from('feed_comments')
        .select('*')
        .eq('feed_item_id', feedItemId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    const userIds = [...new Set(comments.map((c: any) => c.user_uid))];
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('uid, name, avatar_url').in('uid', userIds);
        if (users) {
            users.forEach((u: any) => {
                usersMap[u.uid] = u;
            });
        }
    }

    return comments.map((c: any) => ({
        id: String(c.id),
        feedItemId: String(c.feed_item_id),
        userId: c.user_uid,
        userName: usersMap[c.user_uid]?.name || 'Unknown',
        userAvatarUrl: usersMap[c.user_uid]?.avatar_url,
        content: c.content,
        createdAt: new Date(c.created_at).toLocaleString()
    }));
};

export const addFeedComment = async (feedItemId: string, userId: string, content: string): Promise<FeedComment> => {
    const { data: user } = await supabase.from('users').select('name, avatar_url').eq('uid', userId).maybeSingle();

    const { data, error } = await supabase.from('feed_comments').insert({
        feed_item_id: feedItemId,
        user_uid: userId,
        content: content
    }).select().single();

    if (error) throw error;

    return {
        id: String(data.id),
        feedItemId: String(data.feed_item_id),
        userId: data.user_uid,
        userName: user?.name || 'Unknown',
        userAvatarUrl: user?.avatar_url,
        content: data.content,
        createdAt: new Date(data.created_at).toLocaleString()
    };
};

// --- Projects ---

export const getProjectData = async (): Promise<ProjectData | null> => {
    try {
        const { data: columns, error: colError } = await supabase.from('project_columns').select('*').order('column_order');
        if (colError) throw colError;

        const { data: tasks, error: taskError } = await supabase.from('project_tasks').select('*').order('created_at', { ascending: true });
        if (taskError) throw taskError;

        const { data: assignments, error: assignError } = await supabase.from('project_task_assignees').select('*');

        if (assignError) {
            if (assignError.code === '42P01') return null;
            throw assignError;
        }

        const assignmentsMap = new Map<string, string[]>();
        const submissionsMap = new Map<string, { [userId: string]: { filePath: string; submittedAt: string, grade?: number | null, feedback?: string | null } }>();

        if (assignments) {
            assignments.forEach(a => {
                const taskIdStr = String(a.task_id);
                if (!assignmentsMap.has(taskIdStr)) {
                    assignmentsMap.set(taskIdStr, []);
                }
                assignmentsMap.get(taskIdStr)!.push(a.user_uid);

                if (a.submission_file_path && a.submitted_at) {
                    if (!submissionsMap.has(taskIdStr)) {
                        submissionsMap.set(taskIdStr, {});
                    }
                    submissionsMap.get(taskIdStr)![a.user_uid] = {
                        filePath: a.submission_file_path,
                        submittedAt: a.submitted_at,
                        grade: a.grade,
                        feedback: a.feedback
                    };
                }
            });
        }

        const projectData: ProjectData = {
            tasks: {},
            columns: {},
            columnOrder: []
        };

        tasks.forEach((t: any) => {
            const taskIdStr = String(t.id);
            projectData.tasks[taskIdStr] = {
                id: taskIdStr,
                content: t.content,
                columnId: String(t.column_id),
                assigneeIds: assignmentsMap.get(taskIdStr) || [],
                isCompleted: t.is_completed,
                priority: t.priority,
                dueDate: t.due_date,
                tags: t.tags || [],
                submissions: submissionsMap.get(taskIdStr)
            } as any;
        });

        columns.forEach((c: any) => {
            const colIdStr = String(c.id);
            const colTasks = tasks.filter((t: any) => String(t.column_id) === colIdStr);
            const taskIds = colTasks.map((t: any) => String(t.id));

            projectData.columns[colIdStr] = {
                id: colIdStr,
                title: c.title,
                taskIds: taskIds
            };
            projectData.columnOrder.push(colIdStr);
        });

        return projectData;
    } catch (e) {
        return null;
    }
};

export const gradeSubmission = async (taskId: string, userId: string, grade: number, feedback?: string) => {
    const updateData: any = { grade };
    if (feedback !== undefined) {
        updateData.feedback = feedback;
    }

    const { error } = await supabase
        .from('project_task_assignees')
        .update(updateData)
        .match({ task_id: taskId, user_uid: userId });

    if (error) throw error;
};

export const addProjectTask = async (taskData: { content: string, priority: TaskPriority, dueDate?: string, tags: string[], assigneeIds: string[] }, userId: string, columnId: string) => {
    const { data: newTask, error: taskInsertError } = await supabase.from('project_tasks').insert({
        content: taskData.content,
        priority: taskData.priority,
        due_date: taskData.dueDate,
        tags: taskData.tags,
        column_id: columnId,
        is_completed: false,
    }).select('id').single();

    if (taskInsertError) throw taskInsertError;

    const newTaskId = newTask.id;

    if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
        const assignmentRecords = taskData.assigneeIds.map(assigneeId => ({
            task_id: newTaskId,
            user_uid: assigneeId
        }));

        const { error: assignmentError } = await supabase.from('project_task_assignees').insert(assignmentRecords);
        if (assignmentError) throw assignmentError;

        const { data: assigner } = await supabase.from('users').select('name').eq('uid', userId).single();
        if (!assigner) return;

        const notifications = taskData.assigneeIds
            .filter(id => id !== userId)
            .map(assigneeId => ({
                user_uid: assigneeId,
                message: `${assigner.name} assigned you a new task: "${taskData.content}"`,
                is_read: false,
                link_to: 'projects' as Tab
            }));

        await insertNotifications(notifications);
    }
};

export const updateProjectTask = async (taskId: string, data: Partial<ProjectTask>, assigner: { uid: string, name: string }) => {
    const updates: any = {};
    if (data.content) updates.content = data.content;
    if (data.priority) updates.priority = data.priority;
    if (data.dueDate) updates.due_date = data.dueDate;
    if (data.tags) updates.tags = data.tags;
    if (data.isCompleted !== undefined) updates.is_completed = data.isCompleted;

    const { error } = await supabase.from('project_tasks').update(updates).eq('id', taskId);
    if (error) throw error;

    if (data.assigneeIds !== undefined) {
        await updateTaskAssignees(taskId, data.assigneeIds, assigner);
    }
};

export const deleteProjectTask = async (taskId: string, columnId: string) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) throw error;
};

export const moveProjectTask = async (taskId: string, destinationColumnId: string) => {
    const { error } = await supabase.from('project_tasks').update({ column_id: destinationColumnId }).eq('id', taskId);
    if (error) throw error;
};

export const updateTaskAssignees = async (taskId: string, newAssigneeIds: string[], assigner: { uid: string, name: string }) => {
    const { data: taskData, error: taskFetchError } = await supabase
        .from('project_tasks')
        .select('content')
        .eq('id', taskId)
        .single();
    if (taskFetchError) throw taskFetchError;

    const { data: oldAssignments } = await supabase.from('project_task_assignees').select('user_uid').eq('task_id', taskId);
    const oldAssigneeIds = oldAssignments?.map(a => a.user_uid) || [];

    const { error: deleteError } = await supabase.from('project_task_assignees').delete().eq('task_id', taskId);
    if (deleteError) throw deleteError;

    if (newAssigneeIds.length > 0) {
        const newAssignmentRecords = newAssigneeIds.map(userId => ({
            task_id: taskId,
            user_uid: userId
        }));
        const { error: insertError } = await supabase.from('project_task_assignees').insert(newAssignmentRecords);
        if (insertError) throw insertError;
    }

    const newlyAddedIds = newAssigneeIds.filter(id => !oldAssigneeIds.includes(id) && id !== assigner.uid);

    if (newlyAddedIds.length > 0) {
        try {
            const notifications = newlyAddedIds.map(assigneeId => ({
                user_uid: assigneeId,
                message: `${assigner.name} assigned you a task: "${taskData.content}"`,
                is_read: false,
                link_to: 'projects' as Tab
            }));

            await insertNotifications(notifications);
        } catch (notifError) { }
    }
};

export const toggleProjectTaskCompletion = async (taskId: string, isCompleted: boolean, userId: string) => {
    const { error } = await supabase.from('project_tasks').update({ is_completed: isCompleted }).eq('id', taskId);
    if (error) throw error;

    if (isCompleted) {
        try {
            const { data: user } = await supabase.from('users').select('name').eq('uid', userId).single();
            if (!user) return;
            const { data: task } = await supabase.from('project_tasks').select('content').eq('id', taskId).single();
            if (!task) return;
            const { data: patrons } = await supabase.from('users').select('uid').eq('role', 'PATRON');

            if (patrons && patrons.length > 0) {
                const notifications = patrons
                    .filter(p => p.uid !== userId)
                    .map((p: any) => ({
                        user_uid: p.uid,
                        message: `${user.name} completed the task: "${task.content}"`,
                        is_read: false,
                        link_to: 'projects' as Tab,
                    }));

                await insertNotifications(notifications);
            }
        } catch (notifError) { }
    }
};

export const uploadTaskSubmission = async (taskId: string, file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `submissions/${taskId}/${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('resource_uploads')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
        .from('project_task_assignees')
        .update({ submission_file_path: filePath, submitted_at: new Date().toISOString() })
        .match({ task_id: taskId, user_uid: userId });

    if (updateError) {
        await supabase.storage.from('resource_uploads').remove([filePath]);
        throw updateError;
    }
    return filePath;
};

export const deleteTaskSubmission = async (taskId: string, userId: string, filePath: string) => {
    await supabase.storage.from('resource_uploads').remove([filePath]);
    const { error: updateError } = await supabase
        .from('project_task_assignees')
        .update({ submission_file_path: null, submitted_at: null })
        .match({ task_id: taskId, user_uid: userId });
    if (updateError) throw updateError;
};

export const getSubmissionPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('resource_uploads').getPublicUrl(filePath);
    return data.publicUrl;
}

// --- Resources ---

export const getResources = async (): Promise<Omit<Resource, 'uploaderName' | 'uploaderAvatarUrl'>[]> => {
    const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r: any) => ({
        id: r.id,
        createdAt: new Date(r.created_at).toLocaleDateString(),
        title: r.title,
        description: r.description,
        type: r.type,
        category: r.category,
        url: r.url,
        filePath: r.file_path,
        uploaderUid: r.uploader_uid,
        topic: r.topic
    }));
};

export const uploadResourceFile = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('resource_uploads').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('resource_uploads').getPublicUrl(fileName);
    return { url: data.publicUrl, path: fileName };
};

export const addResource = async (resource: Omit<Resource, 'id' | 'createdAt' | 'uploaderName' | 'uploaderAvatarUrl'>) => {
    const { error } = await supabase.from('resources').insert({
        title: resource.title,
        description: resource.description,
        type: resource.type,
        category: resource.category,
        url: resource.url,
        file_path: resource.filePath,
        uploader_uid: resource.uploaderUid,
        topic: resource.topic
    });
    if (error) throw error;
};

export const deleteResource = async (resource: Resource) => {
    if (resource.filePath) {
        await supabase.storage.from('resource_uploads').remove([resource.filePath]);
    }
    const { error } = await supabase.from('resources').delete().eq('id', resource.id);
    if (error) throw error;
};

// --- Push Subscriptions ---
export const upsertPushSubscription = async (userId: string, subscription: PushSubscription) => {
    const data = subscription.toJSON();
    const endpoint = data.endpoint;
    const p256dh = data.keys?.p256dh;
    const auth = data.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
        throw new Error("Invalid push subscription.");
    }
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_uid: userId,
            endpoint,
            p256dh,
            auth
        }, { onConflict: 'endpoint' });
    if (error) throw error;
};

export const deletePushSubscription = async (endpoint: string) => {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) throw error;
};

export const sendPushNotifications = async (payload: { userIds: string[]; title: string; body: string; url?: string }) => {
    const { data, error } = await supabase.functions.invoke('push-notify', {
        body: payload
    });
    if (error) throw error;
    return data;
};

// --- Notifications ---

export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_uid', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((n: any) => ({
        id: String(n.id),
        message: n.message,
        isRead: n.is_read,
        createdAt: new Date(n.created_at).toLocaleString(),
        linkTo: n.link_to,
        userId: n.user_uid
    }));
};

export const markNotificationAsRead = async (notificationId: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_uid', userId);
    if (error) throw error;
};

// --- Chat ---

export const getRooms = async (userId: string): Promise<Room[]> => {
    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .contains('metadata', { participants: [userId] })
            .order('updated_at', { ascending: false });

        if (error) return [];
        return (data || []).map((r: any) => ({
            id: String(r.id),
            title: r.title,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            participantIds: r.metadata?.participants || [],
            createdBy: r.created_by
        }));
    } catch (error) {
        return [];
    }
};

export const createRoom = async (title: string | null, participantIds: string[]): Promise<string> => {
    const { data, error } = await supabase.from('rooms').insert({
        title: title,
        metadata: { participants: participantIds },
        created_by: participantIds[0]
    }).select('id').single();
    if (error) throw error;
    return String(data.id);
};

export const deleteRoom = async (roomId: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) throw error;
};

export const updateRoomTitle = async (roomId: string, title: string) => {
    const { error } = await supabase.from('rooms').update({ title }).eq('id', roomId);
    if (error) throw error;
};

export const addRoomMembers = async (roomId: string, newMemberIds: string[]) => {
    const { data: room, error: fetchError } = await supabase.from('rooms').select('metadata').eq('id', roomId).single();
    if (fetchError) throw fetchError;
    const currentParticipants = room.metadata?.participants || [];
    const updatedIds = [...new Set([...currentParticipants, ...newMemberIds])];
    const { error } = await supabase.from('rooms').update({
        metadata: { ...room.metadata, participants: updatedIds }
    }).eq('id', roomId);
    if (error) throw error;
};

export const removeGroupMember = async (roomId: string, userId: string) => {
    const { data: room, error: fetchError } = await supabase.from('rooms').select('metadata').eq('id', roomId).single();
    if (fetchError) throw fetchError;
    const currentParticipants = room.metadata?.participants || [];
    const updatedIds = currentParticipants.filter((id: string) => id !== userId);
    const { error } = await supabase.from('rooms').update({
        metadata: { ...room.metadata, participants: updatedIds }
    }).eq('id', roomId);
    if (error) throw error;
};

export const getRoomMessages = async (roomId: string): Promise<Message[]> => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        if (error) return [];
        return (data || []).map((m: any) => ({
            id: String(m.id),
            roomId: String(m.room_id),
            senderId: m.sender_id,
            content: m.content || "",
            createdAt: m.created_at,
            metadata: m.metadata
        }));
    } catch (error) {
        return [];
    }
};

export const sendMessage = async (roomId: string, senderId: string, content: string, metadata?: any): Promise<Message> => {
    const { data, error } = await supabase.from('messages').insert({
        room_id: roomId,
        sender_id: senderId,
        content: content,
        metadata: metadata
    }).select().single();

    if (error) throw error;
    await supabase.from('rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId);

    try {
        const { data: room } = await supabase.from('rooms').select('title, metadata').eq('id', roomId).single();
        const participants: string[] = room?.metadata?.participants || [];
        const title = room?.title ? ` in ${room.title}` : '';
        const body = `New message${title}: ${truncateText(content, 80)}`;
        
        await notifyUsers(participants, body, 'chat', senderId);

        // Also send email alerts for offline users
        const recipientUids = participants.filter(uid => uid !== senderId);
        if (recipientUids.length > 0) {
            const { data: users } = await supabase.from('users').select('email, name').in('uid', recipientUids);
            if (users && users.length > 0) {
                const emails = users.map(u => u.email).filter(Boolean) as string[];
                if (emails.length > 0) {
                    await sendEmail({
                        to: emails,
                        subject: `New Message Alert${title}`,
                        html: `
                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                                <h3 style="color: #7c3aed;">You have a new message!</h3>
                                <p style="font-size: 16px;"><strong>Room:</strong> ${room?.title || 'Direct Message'}</p>
                                <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-left: 4px solid #7c3aed; border-radius: 4px; font-style: italic;">
                                    "${truncateText(content, 150)}"
                                </div>
                                <div style="margin-top: 30px;">
                                    <a href="${window.location.origin}" style="display: inline-block; padding: 10px 20px; background-color: #db2777; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Message</a>
                                </div>
                            </div>
                        `
                    });
                }
            }
        }
    } catch (notifyErr) {
        console.error("Failed to send message notification", notifyErr);
    }

    return {
        id: String(data.id),
        roomId: String(data.room_id),
        senderId: data.sender_id,
        content: data.content || "",
        createdAt: data.created_at,
        metadata: data.metadata
    };
};

export const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
};

export const markMessagesAsRead = async (messageIds: string[], userId: string) => {
    if (!messageIds || messageIds.length === 0) return;

    const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('id, metadata')
        .in('id', messageIds);

    if (fetchError || !messages) return;

    for (const msg of messages) {
        let metadata = msg.metadata || {};
        let readBy = metadata.readBy || [];
        if (!readBy.includes(userId)) {
            readBy = [...readBy, userId];
            metadata = { ...metadata, readBy };
            await supabase.from('messages').update({ metadata }).eq('id', msg.id);
        }
    }
};

export const uploadChatFile = async (file: File, roomId: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `chat/${roomId}/${userId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('chat_uploads').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('chat_uploads').getPublicUrl(fileName);
    return data.publicUrl;
};

// --- Showcase ---

export const getShowcaseItems = async (): Promise<ShowcaseItem[]> => {
    try {
        const { data, error } = await supabase
            .from('showcase_items')
            .select(`*, showcase_comments ( count )`)
            .order('created_at', { ascending: false });

        if (error) return [];
        const userIds = [...new Set(data.map((item: any) => item.user_uid))];
        let userMap = new Map();
        if (userIds.length > 0) {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('uid, name, avatar_url')
                .in('uid', userIds);
            if (!userError && users) {
                userMap = new Map(users.map((u: any) => [u.uid, u]));
            }
        }
        return (data || []).map((item: any) => {
            const user = userMap.get(item.user_uid);
            return {
                id: String(item.id),
                createdAt: item.created_at,
                userUid: item.user_uid,
                userName: user?.name || 'Unknown',
                userAvatarUrl: user?.avatar_url,
                title: item.title,
                description: item.description,
                codeContent: item.code_content,
                likes: item.likes || [],
                commentCount: item.showcase_comments[0]?.count || 0
            };
        });
    } catch (error) {
        return [];
    }
};

export const addShowcaseItem = async (userId: string, title: string, description: string, code: string) => {
    const { error } = await supabase.from('showcase_items').insert({
        user_uid: userId,
        title,
        description,
        code_content: code,
        likes: []
    });
    if (error) throw error;
};

export const toggleShowcaseLike = async (itemId: string, userId: string, currentLikes: string[]) => {
    let newLikes = [...currentLikes];
    if (newLikes.includes(userId)) {
        newLikes = newLikes.filter(id => id !== userId);
    } else {
        newLikes.push(userId);
    }
    const { error } = await supabase.from('showcase_items').update({ likes: newLikes }).eq('id', itemId);
    if (error) throw error;
};

export const getShowcaseComments = async (showcaseItemId: string): Promise<ShowcaseComment[]> => {
    const { data: comments, error } = await supabase
        .from('showcase_comments')
        .select('*')
        .eq('showcase_item_id', showcaseItemId)
        .order('created_at', { ascending: true });
    if (error) throw error;

    const userIds = [...new Set(comments.map((c: any) => c.user_uid))];
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('uid, name, avatar_url').in('uid', userIds);
        if (users) {
            users.forEach((u: any) => {
                usersMap[u.uid] = u;
            });
        }
    }
    return comments.map((c: any) => ({
        id: String(c.id),
        showcaseItemId: String(c.showcase_item_id),
        userId: c.user_uid,
        userName: usersMap[c.user_uid]?.name || 'Unknown',
        userAvatarUrl: usersMap[c.user_uid]?.avatar_url,
        content: c.content,
        createdAt: new Date(c.created_at).toLocaleString()
    }));
};

export const addShowcaseComment = async (showcaseItemId: string, userId: string, content: string): Promise<ShowcaseComment> => {
    const { data: user } = await supabase.from('users').select('name, avatar_url').eq('uid', userId).maybeSingle();
    const { data, error } = await supabase.from('showcase_comments').insert({
        showcase_item_id: showcaseItemId,
        user_uid: userId,
        content: content
    }).select().single();
    if (error) throw error;
    return {
        id: String(data.id),
        showcaseItemId: String(data.showcase_item_id),
        userId: data.user_uid,
        userName: user?.name || 'Unknown',
        userAvatarUrl: user?.avatar_url,
        content: data.content,
        createdAt: new Date(data.created_at).toLocaleString()
    };
};

// --- Suggestions ---

export const getSuggestions = async (): Promise<Suggestion[]> => {
    try {
        const { data, error } = await supabase
            .from('suggestions')
            .select(`*, users ( name, avatar_url )`)
            .order('created_at', { ascending: false });
        if (error) return [];
        return (data || []).map((s: any) => ({
            id: String(s.id),
            type: s.type,
            title: s.title,
            description: s.description,
            userId: s.user_uid,
            userName: s.users?.name || 'Unknown',
            userAvatarUrl: s.users?.avatar_url,
            status: s.status,
            createdAt: s.created_at,
            upvotes: s.upvotes || []
        }));
    } catch (error) {
        return [];
    }
};

export const addSuggestion = async (suggestion: { type: SuggestionType, title: string, description: string, userId: string }) => {
    const { error } = await supabase.from('suggestions').insert({
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        user_uid: suggestion.userId,
        status: 'PENDING',
        upvotes: []
    });
    if (error) throw error;
};

export const toggleSuggestionUpvote = async (id: string, userId: string, currentUpvotes: string[]) => {
    let newUpvotes = [...currentUpvotes];
    if (newUpvotes.includes(userId)) {
        newUpvotes = newUpvotes.filter(uid => uid !== userId);
    } else {
        newUpvotes.push(userId);
    }
    const { error } = await supabase.from('suggestions').update({ upvotes: newUpvotes }).eq('id', id);
    if (error) throw error;
};

export const deleteSuggestion = async (id: string) => {
    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) throw error;
};

export const updateSuggestionStatus = async (id: string, status: SuggestionStatus, userId: string) => {
    const { error } = await supabase.from('suggestions').update({ status }).eq('id', id);
    if (error) throw error;
};

// --- Challenges ---

export const getChallenges = async (): Promise<Challenge[]> => {
    try {
        const { data, error } = await supabase.from('challenges').select('*').order('deadline', { ascending: true });
        if (error) return [];
        return (data || []).map((c: any) => ({
            id: String(c.id),
            title: c.title,
            description: c.description,
            deadline: c.deadline,
            createdBy: c.created_by,
            createdAt: c.created_at,
            status: c.status,
            difficulty: c.difficulty
        }));
    } catch (error) {
        return [];
    }
};

export const addChallenge = async (challenge: {
    title: string,
    description: string,
    deadline: string,
    createdBy: string,
    difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
}) => {
    const { error } = await supabase.from('challenges').insert({
        title: challenge.title,
        description: challenge.description,
        deadline: challenge.deadline,
        created_by: challenge.createdBy,
        difficulty: challenge.difficulty || 'BEGINNER',
        status: 'ACTIVE'
    });
    if (error) throw error;
    await notifyAllUsers(`New Challenge: ${challenge.title}`, 'challenges', challenge.createdBy);
};

export const submitChallenge = async (challengeId: string, userId: string, content: string): Promise<string> => {
    const { data, error } = await supabase.from('challenge_submissions').insert({
        challenge_id: challengeId,
        user_uid: userId,
        content: content,
        status: 'PENDING'
    }).select('id').single();
    if (error) throw error;
    return String(data.id);
};

export const getSubmissions = async (challengeId: string): Promise<ChallengeSubmission[]> => {
    try {
        const { data, error } = await supabase
            .from('challenge_submissions')
            .select(`*, users ( name, avatar_url )`)
            .eq('challenge_id', challengeId);
        if (error) throw error;
        return (data || []).map((s: any) => ({
            id: String(s.id),
            challengeId: String(s.challenge_id),
            userId: s.user_uid,
            userName: s.users?.name || 'Unknown',
            userAvatarUrl: s.users?.avatar_url,
            content: s.content,
            status: s.status,
            submittedAt: s.created_at
        }));
    } catch (error) {
        return [];
    }
};

export const reviewSubmission = async (submissionId: string, status: 'APPROVED' | 'REJECTED', challengeTitle: string, userId: string) => {
    const { error } = await supabase.from('challenge_submissions').update({ status }).eq('id', submissionId);
    if (error) throw error;

    if (status === 'APPROVED') {
        const { data: user } = await supabase.from('users').select('badges').eq('uid', userId).single();
        if (user) {
            const currentBadges = user.badges || [];
            if (!currentBadges.includes(challengeTitle)) {
                await supabase.from('users').update({ badges: [...currentBadges, challengeTitle] }).eq('uid', userId);
            }
        }
    }
};

// --- User Scripts (Playground) ---

export const listUserScripts = async (userId: string): Promise<{ name: string, id: string, lastModified: string, size: number }[]> => {
    const { data, error } = await supabase.storage.from('user_scripts').list(userId);
    if (error) throw error;
    return data.map((file) => ({
        name: file.name,
        id: file.id,
        lastModified: new Date(file.updated_at || file.created_at).toLocaleString(),
        size: file.metadata?.size || 0
    }));
};

export const saveUserScript = async (userId: string, fileName: string, content: string) => {
    const { error } = await supabase.storage.from('user_scripts').upload(`${userId}/${fileName}`, content, {
        upsert: true,
        contentType: 'text/x-python'
    });
    if (error) throw error;
};

export const downloadUserScript = async (userId: string, fileName: string): Promise<string> => {
    const { data, error } = await supabase.storage.from('user_scripts').download(`${userId}/${fileName}`);
    if (error) throw error;
    return await data.text();
};

export const deleteUserScript = async (userId: string, fileName: string) => {
    const { error } = await supabase.storage.from('user_scripts').remove([`${userId}/${fileName}`]);
    if (error) throw error;
};

// --- Roadmap ---

export const getRoadmaps = async (): Promise<Roadmap[]> => {
    try {
        const { data, error } = await supabase.from('roadmaps').select('*').order('id', { ascending: true });
        if (error) return [];
        return (data || []).map((r: any) => ({
            id: String(r.id),
            skillLevel: r.skill_level,
            topic: r.topic,
            milestones: r.content,
            updatedAt: r.updated_at
        }));
    } catch (error) {
        return [];
    }
};

export const addRoadmap = async (roadmap: Roadmap) => {
    const { error } = await supabase.from('roadmaps').insert({
        skill_level: roadmap.skillLevel,
        topic: roadmap.topic,
        content: roadmap.milestones
    });
    if (error) throw error;
    await notifyAllUsers(`New Roadmap: ${roadmap.topic}`, 'roadmap');
};

export const updateRoadmap = async (id: string, data: Partial<Roadmap>) => {
    const updates: any = {};
    if (data.skillLevel) updates.skill_level = data.skillLevel;
    if (data.topic) updates.topic = data.topic;
    if (data.milestones) updates.content = data.milestones;
    const { error } = await supabase.from('roadmaps').update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteRoadmap = async (id: string) => {
    const { error } = await supabase.from('roadmaps').delete().eq('id', id);
    if (error) throw error;
};

export const getUserRoadmapProgress = async (userId: string, roadmapId: string): Promise<RoadmapProgress | null> => {
    try {
        const { data, error } = await supabase
            .from('user_roadmap_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('roadmap_id', roadmapId)
            .maybeSingle();
        if (error || !data) return null;
        return {
            id: String(data.id),
            userId: data.user_id,
            roadmapId: String(data.roadmap_id),
            completedMilestoneIndices: data.completed_milestone_indices || []
        };
    } catch (error) {
        return null;
    }
};

export const updateMilestoneProgress = async (userId: string, roadmapId: string, milestoneIndex: number) => {
    const { data: existing } = await supabase
        .from('user_roadmap_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('roadmap_id', roadmapId)
        .maybeSingle();

    if (existing) {
        const indices = new Set(existing.completed_milestone_indices || []);
        indices.add(milestoneIndex);
        await supabase
            .from('user_roadmap_progress')
            .update({ completed_milestone_indices: Array.from(indices) })
            .eq('id', existing.id);
    } else {
        await supabase.from('user_roadmap_progress').insert({
            user_id: userId,
            roadmap_id: roadmapId,
            completed_milestone_indices: [milestoneIndex]
        });
    }
};

// --- Community (Teams) ---

export const getTeams = async (): Promise<Team[]> => {
    const { data, error } = await supabase
        .from('teams')
        .select(`
            id,
            name,
            description,
            created_by,
            created_at,
            team_members (
                user_uid
            ),
            team_join_requests (
                id,
                requester_uid,
                status,
                created_at,
                reviewed_by,
                reviewed_at
            )
        `)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((team: any) => ({
        id: String(team.id),
        name: team.name,
        description: team.description,
        createdBy: team.created_by,
        createdAt: team.created_at,
        memberIds: team.team_members?.map((m: any) => m.user_uid) || [],
        joinRequests: (team.team_join_requests || []).map((req: any) => ({
            id: String(req.id),
            teamId: String(team.id),
            requesterId: req.requester_uid,
            status: req.status,
            createdAt: req.created_at,
            reviewedBy: req.reviewed_by,
            reviewedAt: req.reviewed_at
        }))
    }));
};

export const createTeam = async (payload: { name: string; description?: string; createdBy: string }) => {
    const { data, error } = await supabase
        .from('teams')
        .insert({
            name: payload.name,
            description: payload.description || null,
            created_by: payload.createdBy
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: String(data.id),
        name: data.name,
        description: data.description,
        createdBy: data.created_by,
        createdAt: data.created_at
    };
};

export const addTeamMember = async (teamId: string, userId: string) => {
    const { error } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_uid: userId
    });
    if (error && error.code !== '23505') throw error;
};

export const requestTeamJoin = async (teamId: string, userId: string) => {
    const { error } = await supabase
        .from('team_join_requests')
        .upsert({
            team_id: teamId,
            requester_uid: userId,
            status: 'PENDING'
        }, { onConflict: 'team_id,requester_uid' });
    if (error) throw error;

    try {
        const { data: team } = await supabase
            .from('teams')
            .select('created_by, name')
            .eq('id', teamId)
            .maybeSingle();
        if (team?.created_by && team.created_by !== userId) {
            await notifyUsers(
                [team.created_by],
                `New join request for ${team.name || 'your team'}.`,
                'community',
                userId
            );
        }
    } catch (err) {
        console.warn('Failed to notify team owner about join request', err);
    }
};

export const approveTeamJoinRequest = async (payload: { requestId: string; teamId: string; requesterId: string; reviewedBy: string }) => {
    const { error } = await supabase
        .from('team_join_requests')
        .update({
            status: 'APPROVED',
            reviewed_by: payload.reviewedBy,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', payload.requestId);
    if (error) throw error;
    await addTeamMember(payload.teamId, payload.requesterId);
};

export const rejectTeamJoinRequest = async (payload: { requestId: string; reviewedBy: string }) => {
    const { error } = await supabase
        .from('team_join_requests')
        .update({
            status: 'REJECTED',
            reviewed_by: payload.reviewedBy,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', payload.requestId);
    if (error) throw error;
};

export const removeTeamMember = async (teamId: string, userId: string) => {
    const { error } = await supabase
        .from('team_members')
        .delete()
        .match({ team_id: teamId, user_uid: userId });
    if (error) throw error;
};

export const deleteTeam = async (payload: { teamId: string; requesterId: string }) => {
    try {
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('id, name, created_by')
            .eq('id', payload.teamId)
            .single();
        if (teamError) throw teamError;

        if (team?.created_by && team.created_by !== payload.requesterId) {
            throw new Error("Only the team owner can delete this team.");
        }

        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', payload.teamId);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error("Failed to delete team", error);
        throw new Error(error?.message || "Failed to delete team.");
    }
};

export const getTeamChallenges = async (): Promise<TeamChallenge[]> => {
    const { data, error } = await supabase
        .from('team_challenges')
        .select(`
            id,
            team_id,
            title,
            description,
            due_date,
            created_by,
            created_at,
            team_challenge_submissions (
                user_uid,
                note,
                submitted_at
            )
        `)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => {
        const submissions: Record<string, TeamChallengeSubmission> = {};
        row.team_challenge_submissions?.forEach((s: any) => {
            submissions[s.user_uid] = {
                userId: s.user_uid,
                note: s.note,
                submittedAt: s.submitted_at
            };
        });
        return {
            id: String(row.id),
            teamId: String(row.team_id),
            title: row.title,
            description: row.description,
            dueDate: row.due_date || undefined,
            createdBy: row.created_by,
            createdAt: row.created_at,
            submissions
        };
    });
};

export const createTeamChallenge = async (payload: { teamId: string; title: string; description?: string; dueDate?: string; createdBy: string }) => {
    const { data, error } = await supabase
        .from('team_challenges')
        .insert({
            team_id: payload.teamId,
            title: payload.title,
            description: payload.description || null,
            due_date: payload.dueDate || null,
            created_by: payload.createdBy
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const upsertTeamChallengeSubmission = async (payload: { challengeId: string; userId: string; note: string }) => {
    const { error } = await supabase
        .from('team_challenge_submissions')
        .upsert({
            challenge_id: payload.challengeId,
            user_uid: payload.userId,
            note: payload.note,
            submitted_at: new Date().toISOString()
        }, { onConflict: 'challenge_id,user_uid' });
    if (error) throw error;
};

// --- Playground Projects ---

export const getPlaygroundProjects = async (): Promise<PlaygroundProject[]> => {
    const { data, error } = await supabase
        .from('playground_projects')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: String(row.id),
        name: row.name,
        language: row.language,
        createdBy: row.created_by,
        teamId: row.team_id ? String(row.team_id) : null,
        createdAt: row.created_at
    }));
};

export const createPlaygroundProject = async (payload: { name: string; language: 'python' | 'javascript' | 'html' | 'web'; createdBy: string; teamId?: string | null }) => {
    const { data, error } = await supabase
        .from('playground_projects')
        .insert({
            name: payload.name,
            language: payload.language,
            created_by: payload.createdBy,
            team_id: payload.teamId || null
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: String(data.id),
        name: data.name,
        language: data.language,
        createdBy: data.created_by,
        teamId: data.team_id ? String(data.team_id) : null,
        createdAt: data.created_at
    } as PlaygroundProject;
};

export const deletePlaygroundProject = async (projectId: string) => {
    const { error } = await supabase.from('playground_projects').delete().eq('id', projectId);
    if (error) throw error;
};

export const getPlaygroundProjectFiles = async (projectId: string): Promise<PlaygroundProjectFile[]> => {
    const { data, error } = await supabase
        .from('playground_project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: String(row.id),
        projectId: String(row.project_id),
        path: row.path,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
};

export const getPlaygroundProjectMembers = async (projectId: string): Promise<PlaygroundProjectMember[]> => {
    const { data, error } = await supabase
        .from('playground_project_members')
        .select('*')
        .eq('project_id', projectId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: String(row.id),
        projectId: String(row.project_id),
        userId: row.user_uid,
        addedBy: row.added_by,
        addedAt: row.added_at
    }));
};

export const getPlaygroundProjectMemberships = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from('playground_project_members')
        .select('project_id')
        .eq('user_uid', userId);
    if (error) throw error;
    return (data || []).map((row: any) => String(row.project_id));
};

export const addPlaygroundProjectMember = async (projectId: string, userId: string, addedBy: string) => {
    const { error } = await supabase
        .from('playground_project_members')
        .insert({
            project_id: projectId,
            user_uid: userId,
            added_by: addedBy
        });
    if (error && error.code !== '23505') throw error;
};

export const addPlaygroundProjectMembers = async (projectId: string, userIds: string[], addedBy: string) => {
    if (userIds.length === 0) return;
    const payload = userIds.map(userId => ({
        project_id: projectId,
        user_uid: userId,
        added_by: addedBy
    }));
    const { error } = await supabase
        .from('playground_project_members')
        .upsert(payload, { onConflict: 'project_id,user_uid' });
    if (error) throw error;
};

export const removePlaygroundProjectMember = async (projectId: string, userId: string) => {
    const { error } = await supabase
        .from('playground_project_members')
        .delete()
        .match({ project_id: projectId, user_uid: userId });
    if (error) throw error;
};

export const downloadPlaygroundFile = async (projectId: string, path: string): Promise<string> => {
    const filePath = `projects/${projectId}/${path}`;
    const { data, error } = await supabase.storage.from('project_files').download(filePath);
    if (error) throw error;
    return await data.text();
};

export const savePlaygroundFile = async (payload: { projectId: string; path: string; content: string; userId: string }) => {
    const filePath = `projects/${payload.projectId}/${payload.path}`;
    const { error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(filePath, payload.content, {
            upsert: true,
            contentType: 'text/plain'
        });
    if (uploadError) throw uploadError;

    const { error } = await supabase
        .from('playground_project_files')
        .upsert({
            project_id: payload.projectId,
            path: payload.path,
            created_by: payload.userId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'project_id,path' });
    if (error) throw error;
};

export const deletePlaygroundFile = async (projectId: string, path: string) => {
    const filePath = `projects/${projectId}/${path}`;
    await supabase.storage.from('project_files').remove([filePath]);
    const { error } = await supabase
        .from('playground_project_files')
        .delete()
        .match({ project_id: projectId, path });
    if (error) throw error;
};

export const movePlaygroundFile = async (projectId: string, fromPath: string, toPath: string) => {
    const from = `projects/${projectId}/${fromPath}`;
    const to = `projects/${projectId}/${toPath}`;
    const { error: moveError } = await supabase.storage.from('project_files').move(from, to);
    if (moveError) throw moveError;

    const { error } = await supabase
        .from('playground_project_files')
        .update({ path: toPath, updated_at: new Date().toISOString() })
        .match({ project_id: projectId, path: fromPath });
    if (error) throw error;
};

export const logPlaygroundActivity = async (payload: { projectId: string; userId: string; action: string; detail?: string }) => {
    const { error } = await supabase.from('playground_project_activity').insert({
        project_id: payload.projectId,
        user_uid: payload.userId,
        action: payload.action,
        detail: payload.detail || null
    });
    if (error) throw error;
};

export const getPlaygroundActivity = async (projectId: string): Promise<PlaygroundProjectActivity[]> => {
    const { data, error } = await supabase
        .from('playground_project_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(15);
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: String(row.id),
        projectId: String(row.project_id),
        userId: row.user_uid,
        action: row.action,
        detail: row.detail,
        createdAt: row.created_at
    }));
};

// --- Games Leaderboard ---

export const upsertGameScore = async (payload: { userId: string; gameKey: string; bestValue: number }) => {
    const { error } = await supabase
        .from('game_leaderboard')
        .upsert({
            user_uid: payload.userId,
            game_key: payload.gameKey,
            best_value: payload.bestValue,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_uid,game_key' });
    if (error) throw error;
};

export const getGameLeaderboard = async (gameKey: string, lowerIsBetter = true): Promise<GameLeaderboardEntry[]> => {
    const { data, error } = await supabase
        .from('game_leaderboard')
        .select('user_uid, game_key, best_value, updated_at, users ( name, username, avatar_url )')
        .eq('game_key', gameKey)
        .order('best_value', { ascending: lowerIsBetter })
        .limit(20);
    if (error) throw error;
    return (data || []).map((row: any) => ({
        userId: row.user_uid,
        userName: row.users?.name || 'Unknown',
        userUsername: row.users?.username || 'user',
        userAvatarUrl: row.users?.avatar_url,
        gameKey: row.game_key,
        bestValue: row.best_value,
        updatedAt: row.updated_at
    }));
};

// --- Voting ---
export const getVotingPositions = async (): Promise<VotingPosition[]> => {
    const { data, error } = await supabase
        .from('voting_positions')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id.toString(),
        title: row.title,
        description: row.description,
        criteria: row.criteria,
        startDate: row.start_date,
        dueDate: row.due_date,
        status: row.status as 'OPEN' | 'CLOSED',
        createdBy: row.created_by,
        createdAt: row.created_at
    }));
};

export const addVotingPosition = async (position: Omit<VotingPosition, 'id' | 'createdAt' | 'status'>): Promise<VotingPosition> => {
    const { data, error } = await supabase
        .from('voting_positions')
        .insert({
            title: position.title,
            description: position.description,
            criteria: position.criteria,
            start_date: position.startDate,
            due_date: position.dueDate,
            created_by: position.createdBy,
            status: 'OPEN'
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id.toString(),
        title: data.title,
        description: data.description,
        criteria: data.criteria,
        startDate: data.start_date,
        dueDate: data.due_date,
        status: data.status as 'OPEN' | 'CLOSED',
        createdBy: data.created_by,
        createdAt: data.created_at
    };
};

export const updateVotingPosition = async (id: string, updates: Partial<VotingPosition>): Promise<void> => {
    const { error } = await supabase
        .from('voting_positions')
        .update({
            title: updates.title,
            description: updates.description,
            criteria: updates.criteria,
            start_date: updates.startDate,
            due_date: updates.dueDate,
            status: updates.status
        })
        .eq('id', id);
    if (error) throw error;
};

export const getVotingContestants = async (positionId: string): Promise<VotingContestant[]> => {
    const { data, error } = await supabase
        .from('voting_contestants')
        .select('*, users ( name, avatar_url )')
        .eq('position_id', positionId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id.toString(),
        positionId: row.position_id.toString(),
        userId: row.user_uid,
        manifesto: row.manifesto,
        status: row.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        createdAt: row.created_at,
        userName: row.users?.name || 'Unknown',
        userAvatarUrl: row.users?.avatar_url
    }));
};

export const getAllVotingContestants = async (): Promise<VotingContestant[]> => {
    const { data, error } = await supabase
        .from('voting_contestants')
        .select('*, users ( name, avatar_url )');
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id.toString(),
        positionId: row.position_id.toString(),
        userId: row.user_uid,
        manifesto: row.manifesto,
        status: row.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        createdAt: row.created_at,
        userName: row.users?.name || 'Unknown',
        userAvatarUrl: row.users?.avatar_url
    }));
};

export const contestPosition = async (positionId: string, userId: string, manifesto: string): Promise<VotingContestant> => {
    const { data, error } = await supabase
        .from('voting_contestants')
        .insert({
            position_id: positionId,
            user_uid: userId,
            manifesto: manifesto
        })
        .select('*, users ( name, avatar_url )')
        .single();
    if (error) throw error;
    return {
        id: data.id.toString(),
        positionId: data.position_id.toString(),
        userId: data.user_uid,
        manifesto: data.manifesto,
        status: data.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        createdAt: data.created_at,
        userName: data.users?.name || 'Unknown',
        userAvatarUrl: data.users?.avatar_url
    };
};

export const updateContestantStatus = async (id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
    const { error } = await supabase
        .from('voting_contestants')
        .update({ status })
        .eq('id', id);
    if (error) throw error;
};

export const getVotingVotes = async (positionId: string): Promise<VotingVote[]> => {
    const { data, error } = await supabase
        .from('voting_votes')
        .select('*')
        .eq('position_id', positionId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id.toString(),
        positionId: row.position_id.toString(),
        voterUid: row.voter_uid,
        contestantId: row.contestant_id.toString(),
        createdAt: row.created_at
    }));
};

export const castVote = async (positionId: string, voterUid: string, contestantId: string): Promise<void> => {
    const { error } = await supabase
        .from('voting_votes')
        .insert({
            position_id: positionId,
            voter_uid: voterUid,
            contestant_id: contestantId
        });
    if (error) throw error;
};

export const deleteVotingPosition = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('voting_positions')
        .delete()
        .eq('id', id);
    if (error) throw error;
};