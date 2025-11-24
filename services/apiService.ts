
import { supabase } from './supabaseClient';
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask, FeedItemType, ProjectColumn, Resource, Notification, Tab, Room, Message, ActivityCategory, TaskPriority, FeedComment, ShowcaseItem, ResourceType, ResourceCategory, Suggestion, SuggestionType, SuggestionStatus } from '../types';
import { predefinedAvatars } from '../constants';

// --- INTERNAL HELPERS ---

export const notifyAllUsers = async (message: string, linkTo: string, senderId: string) => {
    try {
        const { data: users } = await supabase.from('users').select('uid');
        if (!users) return;

        const notifications = users
            .filter(u => u.uid !== senderId)
            .map(u => ({
                user_uid: u.uid,
                message,
                link_to: linkTo,
                is_read: false
            }));
        
        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }
    } catch (error) {
        console.warn("Failed to send notifications:", error);
    }
};

const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw new Error(error.message);
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
};

// --- LOCAL STORAGE FALLBACK HELPERS ---
const LOCAL_SCRIPTS_KEY = 'offline_user_scripts';
const LOCAL_RSVPS_KEY = 'offline_rsvps';
const LOCAL_ATTENDANCE_KEY = 'offline_attendance';
const LOCAL_SUGGESTIONS_KEY = 'offline_suggestions';

const getLocalScripts = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(LOCAL_SCRIPTS_KEY) || '[]');
    } catch {
        return [];
    }
};

const setLocalScripts = (scripts: any[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_SCRIPTS_KEY, JSON.stringify(scripts));
};

const getLocalRSVPs = (): Record<string, string[]> => {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(LOCAL_RSVPS_KEY) || '{}');
    } catch {
        return {};
    }
};

const saveLocalRSVP = (activityId: string, userId: string, isJoining: boolean) => {
    const allRsvps = getLocalRSVPs();
    let activityRsvps = allRsvps[activityId] || [];
    
    if (isJoining) {
        if (!activityRsvps.includes(userId)) activityRsvps.push(userId);
    } else {
        activityRsvps = activityRsvps.filter(id => id !== userId);
    }
    
    allRsvps[activityId] = activityRsvps;
    localStorage.setItem(LOCAL_RSVPS_KEY, JSON.stringify(allRsvps));
};

const getLocalAttendance = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY) || '[]');
    } catch {
        return [];
    }
};

const saveLocalAttendance = (record: any) => {
    const records = getLocalAttendance();
    // Avoid duplicates based on activityId and date
    const exists = records.some((r: any) => r.activityId === record.activityId && r.userId === record.userId);
    if (!exists) {
        records.push(record);
        localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(records));
    }
};

const getLocalSuggestions = (): Suggestion[] => {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(LOCAL_SUGGESTIONS_KEY) || '[]');
    } catch {
        return [];
    }
};

const setLocalSuggestions = (suggestions: Suggestion[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_SUGGESTIONS_KEY, JSON.stringify(suggestions));
};

// --- AUTH & USER ---

export const getUserProfile = async (uid: string): Promise<User | null> => {
    const { data, error } = await supabase.from('users').select('*').eq('uid', uid).single();
    if (error) return null;
    return {
        uid: data.uid,
        email: data.email,
        name: data.name,
        username: data.username,
        role: data.role,
        status: data.status,
        avatarUrl: data.avatar_url,
        phoneNumber: data.phone_number
    };
};

export const login = async (email: string, password?: string): Promise<void> => {
    if (!password) throw new Error("Password required");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
};

export const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
};

export const signUp = async (userData: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
    });
    if (error) throw new Error(error.message);
    if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
            uid: data.user.id,
            email: userData.email,
            name: userData.name,
            username: userData.username,
            phone_number: userData.phoneNumber,
            role: 'MEMBER',
            status: 'PENDING',
            avatar_url: `https://i.pravatar.cc/150?u=${data.user.id}`
        });
        if (profileError) throw new Error(profileError.message);
    }
};

export const signUpAsPatron = async (userData: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
    });
    if (error) throw new Error(error.message);
    if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
            uid: data.user.id,
            email: userData.email,
            name: userData.name,
            username: userData.username,
            phone_number: userData.phoneNumber,
            role: 'PATRON',
            status: 'PENDING', 
             avatar_url: `https://i.pravatar.cc/150?u=${data.user.id}`
        });
        if (profileError) throw new Error(profileError.message);
    }
};

export const changePassword = async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
};

export const resetPasswordWithOtp = async (email: string, token: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
    if (error) throw new Error(error.message);
    await changePassword(password);
};

export const getUsers = async (): Promise<User[]> => {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return data.map((u: any) => ({
            uid: u.uid,
            email: u.email,
            name: u.name,
            username: u.username,
            role: u.role,
            status: u.status,
            avatarUrl: u.avatar_url,
            phoneNumber: u.phone_number
        }));
    } catch (error: any) {
        console.error("Failed to fetch users:", error);
        return [];
    }
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.role) updates.role = data.role;
    if (data.status) updates.status = data.status;
    if (data.avatarUrl) updates.avatar_url = data.avatarUrl;
    
    const { error } = await supabase.from('users').update(updates).eq('uid', uid);
    if (error) throw new Error(error.message);
};

export const deleteUser = async (uid: string): Promise<void> => {
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error) throw new Error(error.message);
};

export const markAttendanceOnLogin = async (uid: string): Promise<void> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: activities } = await supabase.from('activities').select('*').eq('date', today);
        
        if (activities && activities.length > 0) {
            for (const activity of activities) {
                // Check attendance via Supabase first
                const { data: existing } = await supabase.from('attendance')
                    .select('*')
                    .eq('activity_id', activity.id)
                    .eq('user_uid', uid)
                    .single();
                
                if (!existing) {
                    try {
                        await supabase.from('attendance').insert({
                            activity_id: activity.id,
                            user_uid: uid,
                            status: 'Present',
                            date: today,
                            activity_title: activity.title
                        });
                    } catch (insertError) {
                        // Fallback for background attendance
                        saveLocalAttendance({
                            id: `local-${Date.now()}-${Math.random()}`,
                            activityId: activity.id.toString(),
                            activityTitle: activity.title,
                            date: today,
                            status: 'Present',
                            userId: uid
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.warn("Background attendance check failed:", error);
    }
};

// --- ACTIVITIES ---

export const getActivities = async (): Promise<Activity[]> => {
    let dbActivities: any[] = [];
    try {
        const { data, error } = await supabase.from('activities').select('*');
        if (error) {
            console.warn("Error fetching activities:", error.message);
        }
        if (data) dbActivities = data;
    } catch (e) {
        console.warn("Network error fetching activities:", e);
    }

    const localRSVPs = getLocalRSVPs();

    return dbActivities.map((a: any) => {
        const dbRsvps = a.rsvp_users || [];
        const localActivityRsvps = localRSVPs[a.id.toString()] || [];
        // Merge local and remote RSVPs
        const combinedRsvps = Array.from(new Set([...dbRsvps, ...localActivityRsvps]));

        return {
            id: a.id.toString(),
            title: a.title,
            date: a.date,
            description: a.description,
            location: a.location,
            category: a.category,
            rsvpUserIds: combinedRsvps
        };
    });
};

export const addActivity = async (activity: Omit<Activity, 'id' | 'rsvpUserIds'>): Promise<void> => {
    const { error } = await supabase.from('activities').insert({
        title: activity.title,
        date: activity.date,
        description: activity.description,
        location: activity.location,
        category: activity.category,
        rsvp_users: []
    });
    if (error) throw new Error(error.message);
    
    await notifyAllUsers(`New Activity: ${activity.title}`, 'activities', 'system');
};

export const toggleRSVP = async (activityId: string, userId: string, isJoining: boolean): Promise<void> => {
    // Update local storage for immediate feedback
    saveLocalRSVP(activityId, userId, isJoining);

    try {
        const { data: activity, error: fetchError } = await supabase.from('activities').select('rsvp_users').eq('id', activityId).single();
        
        if (fetchError) {
            console.warn("Could not fetch remote RSVP list:", fetchError.message);
            return;
        }
        
        let rsvpUsers: string[] = activity.rsvp_users || [];
        if (isJoining) {
            if (!rsvpUsers.includes(userId)) rsvpUsers.push(userId);
        } else {
            rsvpUsers = rsvpUsers.filter((id: any) => id !== userId);
        }
        
        const { error } = await supabase.from('activities').update({ rsvp_users: rsvpUsers }).eq('id', activityId);
        if (error) {
            console.warn("Failed to update remote RSVP:", error.message);
        }
    } catch (e) {
        console.warn("Network error updating RSVP:", e);
    }
};

// --- ATTENDANCE ---

export const getAttendance = async (userId: string): Promise<AttendanceRecord[]> => {
    let dbRecords: any[] = [];
    let activitiesMap: Record<string, { title: string, date: string }> = {};

    try {
        const { data, error } = await supabase.from('attendance').select('*').eq('user_uid', userId);
        if (error) throw error;
        if (data) dbRecords = data;

        const { data: activitiesData } = await supabase.from('activities').select('id, title, date');
        if (activitiesData) {
            activitiesData.forEach((act: any) => {
                activitiesMap[act.id.toString()] = { title: act.title, date: act.date };
            });
        }
    } catch (error: any) {
        console.warn("Failed to fetch remote attendance, using local fallback:", error.message);
    }

    const localRecords = getLocalAttendance().filter((r: any) => r.userId === userId);
    
    const mappedDbRecords = dbRecords.map((a: any) => {
        const actId = a.activity_id !== undefined ? a.activity_id.toString() : 'unknown';
        const activityInfo = activitiesMap[actId];
        
        let finalDate = a.date;
        if (!finalDate && activityInfo) finalDate = activityInfo.date;
        if (!finalDate && a.created_at) finalDate = a.created_at.split('T')[0];
        if (!finalDate) finalDate = 'N/A';

        return {
            id: a.id.toString(),
            activityId: actId,
            activityTitle: a.activity_title || (activityInfo ? activityInfo.title : 'Unknown Activity'),
            date: finalDate, 
            status: a.status,
            userId: a.user_uid
        };
    });

    const mappedLocalRecords = localRecords.map((a: any) => {
        const activityInfo = activitiesMap[a.activityId];
        return {
            id: a.id,
            activityId: a.activityId,
            activityTitle: a.activityTitle || (activityInfo ? activityInfo.title : 'Unknown Activity'),
            date: a.date || (activityInfo ? activityInfo.date : 'N/A'),
            status: a.status,
            userId: a.userId
        };
    });

    return [...mappedDbRecords, ...mappedLocalRecords];
};

export const addAttendance = async (userId: string, record: Omit<AttendanceRecord, 'id' | 'userId'>): Promise<void> => {
    const newRecord = {
        user_uid: userId,
        activity_id: record.activityId,
        activity_title: record.activityTitle,
        date: record.date,
        status: record.status
    };

    try {
        const { error } = await supabase.from('attendance').insert(newRecord);
        if (error) throw new Error(error.message);
    } catch (error: any) {
        console.warn("Cloud attendance save failed, saving locally:", error.message);
        
        const localRecord = {
            id: `local-${Date.now()}`,
            activityId: record.activityId,
            activityTitle: record.activityTitle,
            date: record.date,
            status: record.status,
            userId: userId
        };
        saveLocalAttendance(localRecord);
    }
};

// --- FEED ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    try {
        const { data, error } = await supabase
            .from('feed_items')
            .select(`
                *,
                author:author_uid ( uid, name, avatar_url ),
                feed_comments (count)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (!data) return [];
        
        return data.map((item: any) => {
            const authorProfile = item.author as { uid: string; name: string; avatar_url: string } | null;
            const commentCount = item.feed_comments?.[0]?.count || 0;

            return {
                id: item.id.toString(),
                type: item.type,
                title: item.title || undefined,
                message: item.message,
                author: authorProfile?.name || 'Unknown User',
                authorAvatarUrl: authorProfile?.avatar_url || `https://i.pravatar.cc/40?u=${item.author_uid}`,
                timestamp: new Date(item.created_at).toLocaleString('en-US', { timeZone: 'Africa/Kampala' }),
                commentCount: commentCount,
            };
        });
    } catch (error: any) {
        console.error("Failed to fetch feed:", error);
        return [];
    }
};

export const addFeedItem = async (itemData: Omit<FeedItem, 'id' | 'author' | 'authorAvatarUrl' | 'timestamp'>, authorId: string): Promise<void> => {
    const { error } = await supabase.from('feed_items').insert({
        type: itemData.type,
        title: itemData.title || null,
        message: itemData.message,
        author_uid: authorId,
    });
    if (error) throw new Error(error.message);
    await notifyAllUsers(`New Announcement: ${itemData.title || 'Update'}`, 'feed', authorId);
};

export const deleteFeedItem = async (id: string): Promise<void> => {
    const { error } = await supabase.from('feed_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getFeedComments = async (feedItemId: string): Promise<FeedComment[]> => {
    const { data, error } = await supabase
        .from('feed_comments')
        .select(`*, user:user_uid ( uid, name, avatar_url )`)
        .eq('feed_item_id', feedItemId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    
    return data.map((c: any) => ({
        id: c.id.toString(),
        feedItemId: c.feed_item_id.toString(),
        userId: c.user_uid,
        userName: c.user?.name || 'Unknown',
        userAvatarUrl: c.user?.avatar_url || `https://i.pravatar.cc/40?u=${c.user_uid}`,
        content: c.content,
        createdAt: new Date(c.created_at).toLocaleString()
    }));
};

export const addFeedComment = async (feedItemId: string, userId: string, content: string): Promise<FeedComment> => {
    const { data, error } = await supabase.from('feed_comments').insert({
        feed_item_id: feedItemId,
        user_uid: userId,
        content: content
    }).select(`*, user:user_uid ( uid, name, avatar_url )`).single();

    if (error) throw new Error(error.message);
    
    return {
        id: data.id.toString(),
        feedItemId: data.feed_item_id.toString(),
        userId: data.user_uid,
        userName: data.user?.name || 'Unknown',
        userAvatarUrl: data.user?.avatar_url || `https://i.pravatar.cc/40?u=${data.user_uid}`,
        content: data.content,
        createdAt: new Date(data.created_at).toLocaleString()
    };
};

// --- PROJECTS ---

export const getProjectData = async (): Promise<ProjectData> => {
    try {
        const { data: columns, error: colError } = await supabase.from('project_columns').select('*');
        if (colError) throw colError;

        const { data: tasks, error: taskError } = await supabase.from('project_tasks').select('*');
        if (taskError) throw taskError;

        const projectData: ProjectData = {
            tasks: {},
            columns: {},
            columnOrder: columns.map((c: any) => c.id.toString())
        };

        tasks.forEach((t: any) => {
            projectData.tasks[t.id.toString()] = {
                id: t.id.toString(),
                content: t.content,
                assigneeIds: t.assignee_ids || [],
                priority: t.priority,
                dueDate: t.due_date,
                tags: t.tags || [],
                isCompleted: t.is_completed
            };
        });

        columns.forEach((c: any) => {
            projectData.columns[c.id.toString()] = {
                id: c.id.toString(),
                title: c.title,
                taskIds: tasks
                    .filter((t: any) => t.column_id === c.id)
                    .sort((a: any, b: any) => a.id - b.id) 
                    .map((t: any) => t.id.toString())
            };
        });

        return projectData;
    } catch (error: any) {
        console.error("Failed to fetch projects:", error);
        return { tasks: {}, columns: {}, columnOrder: [] };
    }
};

export const addProjectTask = async (taskData: { content: string, priority: TaskPriority, dueDate?: string, tags: string[] }): Promise<void> => {
    const { data: columns } = await supabase.from('project_columns').select('id').limit(1);
    if (!columns || columns.length === 0) throw new Error("No columns found");
    
    const { error } = await supabase.from('project_tasks').insert({
        content: taskData.content,
        priority: taskData.priority,
        due_date: taskData.dueDate,
        tags: taskData.tags,
        column_id: columns[0].id,
        assignee_ids: [],
        is_completed: false
    });
    if (error) throw new Error(error.message);
};

export const updateProjectTask = async (taskId: string, taskData: Partial<ProjectTask>): Promise<void> => {
    const updates: any = {};
    if (taskData.content) updates.content = taskData.content;
    if (taskData.priority) updates.priority = taskData.priority;
    if (taskData.dueDate) updates.due_date = taskData.dueDate;
    if (taskData.tags) updates.tags = taskData.tags;
    
    const { error } = await supabase.from('project_tasks').update(updates).eq('id', taskId);
    if (error) throw new Error(error.message);
};

export const deleteProjectTask = async (taskId: string, columnId: string): Promise<void> => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) throw new Error(error.message);
};

export const moveProjectTask = async (taskId: string, newColumnId: string): Promise<void> => {
    const { error } = await supabase.from('project_tasks').update({ column_id: newColumnId }).eq('id', taskId);
    if (error) throw new Error(error.message);
};

export const updateTaskAssignees = async (taskId: string, assigneeIds: string[]): Promise<void> => {
    const { error } = await supabase.from('project_tasks').update({ assignee_ids: assigneeIds }).eq('id', taskId);
    if (error) throw new Error(error.message);
};

export const toggleProjectTaskCompletion = async (taskId: string, isCompleted: boolean): Promise<void> => {
    const { error } = await supabase.from('project_tasks').update({ is_completed: isCompleted }).eq('id', taskId);
    if (error) throw new Error(error.message);
};

// --- RESOURCES ---

export const getResources = async (): Promise<Resource[]> => {
    try {
        const { data, error } = await supabase.from('resources').select('*');
        if (error) throw error;
        
        return data.map((r: any) => ({
            id: r.id.toString(),
            createdAt: new Date(r.created_at).toLocaleDateString(),
            title: r.title,
            description: r.description,
            type: r.type,
            category: r.category,
            topic: r.topic,
            url: r.url,
            filePath: r.file_path,
            uploaderUid: r.uploader_uid,
            uploaderName: 'Loading...',
            uploaderAvatarUrl: undefined
        }));
    } catch (error: any) {
        console.error("Failed to fetch resources:", error);
        return [];
    }
};

export const addResource = async (resource: Omit<Resource, 'id' | 'createdAt' | 'uploaderName' | 'uploaderAvatarUrl'>): Promise<void> => {
    const { error } = await supabase.from('resources').insert({
        title: resource.title,
        description: resource.description,
        type: resource.type,
        category: resource.category,
        topic: resource.topic,
        url: resource.url,
        file_path: resource.filePath,
        uploader_uid: resource.uploaderUid
    });
    if (error) throw new Error(error.message);
    await notifyAllUsers(`New Resource: ${resource.title}`, 'resources', resource.uploaderUid);
};

export const deleteResource = async (resource: Resource): Promise<void> => {
    if (resource.filePath) {
        await supabase.storage.from('resource_files').remove([resource.filePath]);
    }
    const { error } = await supabase.from('resources').delete().eq('id', resource.id);
    if (error) throw new Error(error.message);
};

export const uploadResourceFile = async (file: File, userId: string): Promise<{ url: string, path: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage.from('resource_files').upload(filePath, file);
    if (uploadError) throw new Error(uploadError.message);
    
    const { data: { publicUrl } } = supabase.storage.from('resource_files').getPublicUrl(filePath);
    return { url: publicUrl, path: filePath };
};

// --- CHAT ---

export const getRooms = async (userId: string): Promise<Room[]> => {
    try {
        // 1. Find rooms the user is in
        const { data: myParticipations, error: myPartError } = await supabase
            .from('room_members')
            .select('room_id')
            .eq('user_id', userId);
            
        if (myPartError) throw myPartError;
        
        const roomIds = myParticipations.map((p: any) => p.room_id);
        if (roomIds.length === 0) return [];

        // 2. Fetch room details
        const { data: roomsData, error: roomsError } = await supabase
            .from('rooms')
            .select('*')
            .in('id', roomIds)
            .order('updated_at', { ascending: false });
            
        if (roomsError) throw roomsError;

        // 3. Fetch all participants
        const { data: allParticipants, error: allPartError } = await supabase
            .from('room_members')
            .select('room_id, user_id')
            .in('room_id', roomIds);

        if (allPartError) throw allPartError;

        const participantsMap: Record<string, string[]> = {};
        allParticipants.forEach((p: any) => {
            if (!participantsMap[p.room_id]) participantsMap[p.room_id] = [];
            participantsMap[p.room_id].push(p.user_id);
        });

        return roomsData.map((r: any) => ({
            id: r.id.toString(),
            title: r.title,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            createdBy: r.created_by,
            participantIds: participantsMap[r.id] || [],
        }));
    } catch (error: any) {
        console.error("Error fetching rooms (handled gracefully):", error.message);
        return [];
    }
};

export const createRoom = async (title: string | null, participantIds: string[]): Promise<string> => {
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ title })
        .select()
        .single();
    
    if (roomError) throw new Error(roomError.message);
    const roomId = room.id;

    const participantsData = participantIds.map(uid => ({
        room_id: roomId,
        user_id: uid
    }));

    const { error: partError } = await supabase.from('room_members').insert(participantsData);
    if (partError) throw new Error(partError.message);

    return roomId.toString();
};

export const getRoomMessages = async (roomId: string): Promise<Message[]> => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        return data.map((m: any) => ({
            id: m.id.toString(),
            roomId: m.room_id.toString(),
            senderId: m.sender_id,
            content: m.content,
            createdAt: m.created_at,
            metadata: m.metadata
        }));
    } catch (error: any) {
        console.error("Error fetching messages (handled gracefully):", error.message);
        return [];
    }
};

export const sendMessage = async (roomId: string, senderId: string, content: string, metadata?: any): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            room_id: roomId,
            sender_id: senderId,
            content,
            metadata
        })
        .select()
        .single();
    
    if (error) throw new Error(error.message);

    await supabase.from('rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId);

    return {
        id: data.id.toString(),
        roomId: data.room_id.toString(),
        senderId: data.sender_id,
        content: data.content,
        createdAt: data.created_at,
        metadata: data.metadata
    };
};

export const deleteMessage = async (messageId: string): Promise<void> => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw new Error(error.message);
};

export const deleteRoom = async (roomId: string): Promise<void> => {
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) throw new Error(error.message);
};

export const removeGroupMember = async (roomId: string, userId: string): Promise<void> => {
    const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);
    if (error) throw new Error(error.message);
};

export const addRoomMembers = async (roomId: string, userIds: string[]): Promise<void> => {
    const participantsData = userIds.map(uid => ({
        room_id: roomId,
        user_id: uid
    }));
    const { error } = await supabase.from('room_members').insert(participantsData);
    if (error) throw new Error(error.message);
};

export const updateRoomTitle = async (roomId: string, title: string): Promise<void> => {
    const { error } = await supabase.from('rooms').update({ title }).eq('id', roomId);
    if (error) throw new Error(error.message);
};

export const uploadChatFile = async (file: File, roomId: string, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${roomId}/${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('chat_files').upload(fileName, file);
    if (uploadError) throw new Error(uploadError.message);
    
    const { data: { publicUrl } } = supabase.storage.from('chat_files').getPublicUrl(fileName);
    return publicUrl;
};

// --- NOTIFICATIONS ---

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_uid', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((n: any) => ({
            id: n.id.toString(),
            message: n.message,
            isRead: n.is_read,
            createdAt: new Date(n.created_at).toLocaleString('en-US', { timeZone: 'Africa/Kampala' }),
            linkTo: n.link_to,
            userId: n.user_uid,
        }));
    } catch (error: any) {
        console.error("Failed to fetch notifications:", error);
        return [];
    }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    if (error) throw new Error(error.message);
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_uid', userId);
    if (error) throw new Error(error.message);
};

// --- SHOWCASE ---

export const getShowcaseItems = async (): Promise<ShowcaseItem[]> => {
    try {
        const { data, error } = await supabase
            .from('showcase_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const userIds = [...new Set(data.map((item: any) => item.user_uid))];
        let usersData: any[] = [];
        if (userIds.length > 0) {
            const { data: users, error: userError } = await supabase.from('users').select('uid, name, avatar_url').in('uid', userIds);
            if (!userError && users) {
                usersData = users;
            }
        }
        
        const userMap = new Map(usersData.map((u: any) => [u.uid, u]));

        return data.map((item: any) => {
            const user = userMap.get(item.user_uid);
            return {
                id: item.id.toString(),
                createdAt: new Date(item.created_at).toLocaleDateString(),
                userUid: item.user_uid,
                userName: user?.name || 'Unknown Member',
                userAvatarUrl: user?.avatar_url,
                title: item.title,
                description: item.description,
                codeContent: item.code_content,
                likes: item.likes || []
            };
        });
    } catch (error: any) {
        console.error("Failed to fetch showcase items:", error);
        return [];
    }
};

export const addShowcaseItem = async (userUid: string, title: string, description: string, codeContent: string): Promise<void> => {
    const { error } = await supabase.from('showcase_items').insert({
        user_uid: userUid,
        title,
        description,
        code_content: codeContent,
        likes: []
    });
    if (error) throw new Error(error.message);
    await notifyAllUsers(`New Showcase: ${title}`, 'showcase', userUid);
};

export const toggleShowcaseLike = async (id: string, userUid: string, currentLikes: string[]): Promise<void> => {
    const hasLiked = currentLikes.includes(userUid);
    const newLikes = hasLiked 
        ? currentLikes.filter(uid => uid !== userUid)
        : [...currentLikes, userUid];
        
    const { error } = await supabase.from('showcase_items').update({ likes: newLikes }).eq('id', id);
    if (error) throw new Error(error.message);
};

// --- SUGGESTIONS & BUGS ---

export const getSuggestions = async (): Promise<Suggestion[]> => {
    let dbSuggestions: any[] = [];
    
    try {
        const { data, error } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        dbSuggestions = data;
    } catch (error: any) {
        console.warn("Failed to fetch suggestions from DB, using local fallback:", error.message);
    }

    const localSuggestions = getLocalSuggestions();
    const allSuggestions = [...dbSuggestions, ...localSuggestions];
    
    const uniqueSuggestionsMap = new Map();
    allSuggestions.forEach(s => {
        uniqueSuggestionsMap.set(s.id.toString(), s);
    });

    const userIds = Array.from(new Set(allSuggestions.map((s: any) => s.user_uid || s.userId)));
    let userMap = new Map<string, { name: string, avatarUrl?: string }>();
    try {
        if (userIds.length > 0) {
            const { data: users } = await supabase.from('users').select('uid, name, avatar_url').in('uid', userIds);
            if (users) {
                users.forEach((u: any) => userMap.set(u.uid, { name: u.name, avatarUrl: u.avatar_url }));
            }
        }
    } catch (e) {
        console.warn("Could not fetch users for suggestions");
    }

    return Array.from(uniqueSuggestionsMap.values()).map((s: any) => {
        const uid = s.user_uid || s.userId;
        const user = userMap.get(uid);
        return {
            id: s.id.toString(),
            type: s.type,
            title: s.title,
            description: s.description,
            userId: uid,
            userName: user?.name || s.userName || 'Unknown User',
            userAvatarUrl: user?.avatarUrl || s.userAvatarUrl,
            status: s.status,
            createdAt: s.created_at || s.createdAt || new Date().toISOString(),
            upvotes: s.upvotes || []
        };
    });
};

export const addSuggestion = async (suggestion: Omit<Suggestion, 'id' | 'createdAt' | 'status' | 'upvotes' | 'userName' | 'userAvatarUrl'>): Promise<void> => {
    const newSuggestion = {
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        user_uid: suggestion.userId,
        status: 'PENDING',
        upvotes: []
    };

    try {
        const { error } = await supabase.from('suggestions').insert(newSuggestion);
        if (error) throw new Error(error.message);
    } catch (error: any) {
        console.warn("Cloud suggestion save failed, saving locally:", error.message);
        const localSuggestion: Suggestion = {
            id: `local-${Date.now()}`,
            type: suggestion.type,
            title: suggestion.title,
            description: suggestion.description,
            userId: suggestion.userId,
            userName: 'You (Offline)',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            upvotes: []
        };
        const current = getLocalSuggestions();
        setLocalSuggestions([localSuggestion, ...current]);
    }
};

export const deleteSuggestion = async (id: string): Promise<void> => {
    if (id.startsWith('local-')) {
        const current = getLocalSuggestions().filter(s => s.id !== id);
        setLocalSuggestions(current);
        return;
    }
    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const toggleSuggestionUpvote = async (id: string, userId: string, currentUpvotes: string[]): Promise<void> => {
    const hasUpvoted = currentUpvotes.includes(userId);
    const newUpvotes = hasUpvoted 
        ? currentUpvotes.filter(uid => uid !== userId)
        : [...currentUpvotes, userId];

    if (id.startsWith('local-')) {
        const current = getLocalSuggestions();
        const index = current.findIndex(s => s.id === id);
        if (index !== -1) {
            current[index].upvotes = newUpvotes;
            setLocalSuggestions(current);
        }
        return;
    }

    const { error } = await supabase.from('suggestions').update({ upvotes: newUpvotes }).eq('id', id);
    if (error) throw new Error(error.message);
};

export const updateSuggestionStatus = async (id: string, status: SuggestionStatus): Promise<void> => {
    if (id.startsWith('local-')) {
        const current = getLocalSuggestions();
        const index = current.findIndex(s => s.id === id);
        if (index !== -1) {
            current[index].status = status;
            setLocalSuggestions(current);
        }
        return;
    }
    const { error } = await supabase.from('suggestions').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
};

// --- PLAYGROUND CLOUD WITH FALLBACK ---

export const saveUserScript = async (userId: string, name: string, code: string): Promise<void> => {
    try {
        const { data: existing, error: fetchError } = await supabase.from('user_scripts').select('id').eq('user_uid', userId).eq('name', name).single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { 
             throw fetchError;
        }

        if (existing) {
            const { error } = await supabase.from('user_scripts').update({ code }).eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('user_scripts').insert({ user_uid: userId, name, code });
            if (error) throw error;
        }

        // Successful cloud save: remove duplicate from local storage if it exists to prevent ghosting
        const localScripts = getLocalScripts().filter((s: any) => !(s.user_uid === userId && s.name === name));
        setLocalScripts(localScripts);

    } catch (error: any) {
        console.warn("Cloud save failed, falling back to local storage:", error.message);
        const scripts = getLocalScripts();
        const existingIndex = scripts.findIndex((s: any) => s.user_uid === userId && s.name === name);
        const now = new Date().toISOString();
        
        if (existingIndex >= 0) {
            scripts[existingIndex] = { ...scripts[existingIndex], code, updated_at: now };
        } else {
            scripts.push({
                id: `local-${Date.now()}`,
                user_uid: userId,
                name,
                code,
                updated_at: now
            });
        }
        setLocalScripts(scripts);
    }
};

export const listUserScripts = async (userId: string): Promise<{id: string, name: string, lastModified: string, size: number}[]> => {
    let cloudScripts: any[] = [];
    let cloudError = null;
    
    try {
        const { data, error } = await supabase.from('user_scripts').select('*').eq('user_uid', userId).order('updated_at', { ascending: false });
        if (error) throw error;
        if (data) {
            cloudScripts = data.map((s: any) => ({
                id: s.id.toString(),
                name: s.name,
                lastModified: new Date(s.updated_at).toLocaleString(),
                size: s.code.length
            }));
        }
    } catch (error: any) {
        cloudError = error.message;
        console.warn("Cloud list failed, checking local scripts:", error.message);
    }

    const localScripts = getLocalScripts()
        .filter((s: any) => s.user_uid === userId)
        .map((s: any) => ({
            id: s.id, 
            name: s.name,
            lastModified: new Date(s.updated_at).toLocaleString(),
            size: s.code.length
        }));

    // Merge: Deduplicate by NAME. Prefer Cloud version.
    const scriptMap = new Map();
    
    // Add local first
    localScripts.forEach(s => scriptMap.set(s.name, s));
    
    // Add cloud second (overwriting local with same name)
    cloudScripts.forEach(s => scriptMap.set(s.name, s));
    
    const uniqueScripts = Array.from(scriptMap.values());

    return uniqueScripts.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
};

export const downloadUserScript = async (userId: string, name: string): Promise<string> => {
    const localScript = getLocalScripts().find((s: any) => s.user_uid === userId && s.name === name);
    
    try {
        // Use limit(1) instead of single() to prevent errors if duplicates somehow exist in DB
        const { data, error } = await supabase.from('user_scripts').select('code').eq('user_uid', userId).eq('name', name).limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
            return data[0].code;
        } else {
            throw new Error("Script not found in cloud");
        }
    } catch (error: any) {
        console.warn("Cloud download failed/missing, checking local fallback:", error.message);
        if (localScript) return localScript.code;
        throw new Error("Script not found locally or in cloud.");
    }
};

export const deleteUserScript = async (userId: string, name: string): Promise<void> => {
    try {
        const { error } = await supabase.from('user_scripts').delete().eq('user_uid', userId).eq('name', name);
        if (error) {
             console.warn("Cloud delete warning:", error.message);
        }
    } catch (error: any) {
        console.warn("Cloud delete failed, attempting local delete:", error.message);
    } finally {
        // Always clean up local
        const scripts = getLocalScripts().filter((s: any) => !(s.user_uid === userId && s.name === name));
        setLocalScripts(scripts);
    }
};
