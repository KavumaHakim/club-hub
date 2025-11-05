import { supabase } from './supabaseClient';
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask, FeedItemType, ProjectColumn } from '../types';

// --- AUTH API ---

export const login = async (email: string, password?: string): Promise<User> => {
    if (!password) throw new Error("Password is required.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Login failed: no user returned");

    const userProfile = await getUserProfile(data.user.id);
    if (!userProfile) {
        // If profile doesn't exist, sign out the user to prevent a broken state
        await supabase.auth.signOut();
        throw new Error("User profile not found.");
    }
    
    return userProfile;
};

export const logout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const signUp = async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error("Sign up failed, no user created.");

    const { error: profileError } = await supabase.from('users').insert({
        uid: authData.user.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        role: 'MEMBER',
        status: 'PENDING',
    });
    if (profileError) throw profileError;
};

export const signUpAsPatron = async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }): Promise<void> => {
     const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error("Sign up failed, no user created.");

    const { error: profileError } = await supabase.from('users').insert({
        uid: authData.user.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        role: 'PATRON',
        status: 'PENDING',
    });
    if (profileError) throw profileError;
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
    const { data: userData, error: userError } = await supabase.from('users').select('*').eq('uid', uid).single();
    if (userError && userError.code !== 'PGRST116') { // Ignore 'PGRST116' (single row not found)
        console.error("Error fetching user profile:", userError);
        return null;
    }
    if (!userData) return null;

    let avatarUrl: string | undefined = undefined;

    // Efficiently check for the avatar record in the new user_uploads table.
    const { data: uploadRecord } = await supabase
        .from('user_uploads')
        .select('object_name')
        .match({ owner_id: uid, bucket_id: 'profiles', object_name: `${uid}/avatar` })
        .limit(1)
        .single();

    if (uploadRecord) {
        const { data: urlData } = supabase.storage
            .from('profiles')
            .getPublicUrl(uploadRecord.object_name);
        // Append a timestamp to break the browser cache after an upload.
        avatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
    }
    
    // Return user data with avatarUrl if found, otherwise it's undefined and UI will use a fallback.
    return { ...userData, avatarUrl };
};


// --- USERS API ---

export const getUsers = async (): Promise<User[]> => {
    const { data: usersData, error } = await supabase.from('users').select('*');
    if (error) throw error;
    if (!usersData || usersData.length === 0) return [];
    
    // SOLVE N+1 PROBLEM: Fetch all avatar records for all users in one query.
    const userIds = usersData.map(u => u.uid);
    const { data: uploads } = await supabase
        .from('user_uploads')
        .select('owner_id, object_name')
        .in('owner_id', userIds)
        .eq('bucket_id', 'profiles');

    // Create a map for quick lookups
    const avatarMap = new Map<string, string>();
    if (uploads) {
        for (const upload of uploads) {
            const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(upload.object_name);
            avatarMap.set(upload.owner_id, urlData.publicUrl);
        }
    }

    // Map avatar URLs back to users
    const usersWithAvatars = usersData.map(user => ({
        ...user,
        avatarUrl: avatarMap.get(user.uid),
    }));
    
    return usersWithAvatars;
};

export const updateUser = async (uid: string, updates: Partial<Pick<User, 'role' | 'status'>>): Promise<void> => {
    // This function no longer handles avatarUrl, as it's derived from storage, not stored in the database.
    const { error } = await supabase.from('users').update(updates).eq('uid', uid);
    if (error) throw error;
};

export const uploadProfilePicture = async (userId: string, file: File): Promise<User> => {
    if (!file.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image.");
    }

    const filePath = `${userId}/avatar`;

    // 1. Upload the new file to storage, overwriting if it exists.
    const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error("Supabase Storage Error (Upload):", uploadError);
        throw new Error("Failed to upload avatar.");
    }
    
    // 2. Create or update the record in our new `user_uploads` table.
    // `upsert` is used here to either create a new record or update the `updated_at`
    // timestamp of an existing one, which is handled by a database trigger.
    // The `onConflict` option assumes a unique constraint exists on `(owner_id, object_name)`.
    const { error: dbError } = await supabase
        .from('user_uploads')
        .upsert({
            owner_id: userId,
            bucket_id: 'profiles',
            object_name: filePath,
        }, {
            onConflict: 'owner_id,object_name' 
        });

    if (dbError) {
        console.error("Supabase DB Error (user_uploads):", dbError);
        // If this fails, we should ideally try to roll back the storage upload.
        // For now, we'll log the error and throw.
        throw new Error("Failed to record avatar upload in the database.");
    }


    // 3. After upload, re-fetch the user profile. The updated `getUserProfile` will
    // find the new record and return the correct URL.
    const updatedUser = await getUserProfile(userId);
    if (!updatedUser) {
        throw new Error("Failed to fetch updated user profile after avatar upload.");
    }

    return updatedUser;
};

export const deleteUser = async (uid: string): Promise<void> => {
    // Note: In a real app, this should be a secure admin function.
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error) throw error;
};

export const changePassword = async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
};


// --- ACTIVITIES API ---

export const getActivities = async (): Promise<Activity[]> => {
    const { data, error } = await supabase.from('activities').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addActivity = async (activityData: Omit<Activity, 'id'>): Promise<void> => {
    const { error } = await supabase.from('activities').insert(activityData);
    if (error) throw error;
};

// --- ATTENDANCE API ---

export const getAttendance = async (userId: string): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase.from('attendance').select('*').eq('user_uid', userId);
    if (error) throw error;
    // Map database column `user_uid` to application property `userId`
    return (data || []).map(record => ({ ...record, userId: record.user_uid }));
};

export const addAttendance = async (userId: string, recordData: Omit<AttendanceRecord, 'id' | 'userId'>): Promise<void> => {
    // Map application property `userId` to database column `user_uid`
    const newRecord = { ...recordData, user_uid: userId };
    const { error } = await supabase.from('attendance').insert(newRecord);
    if (error) throw error;
};

export const markAttendanceOnLogin = async (userId: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];

    const { data: todaysActivities, error: activityError } = await supabase
        .from('activities')
        .select('id, title, date')
        .eq('date', today);

    if (activityError) throw activityError;
    if (!todaysActivities || todaysActivities.length === 0) {
        return; 
    }

    const todaysActivityIds = todaysActivities.map(a => a.id);

    const { data: existingRecords, error: existingRecordError } = await supabase
        .from('attendance')
        .select('activityId')
        .eq('user_uid', userId)
        .in('activityId', todaysActivityIds);

    if (existingRecordError) throw existingRecordError;
    
    const recordedActivityIds = new Set((existingRecords || []).map(r => r.activityId));

    const activitiesToRecord = todaysActivities.filter(a => !recordedActivityIds.has(a.id));

    if (activitiesToRecord.length === 0) {
        return;
    }
    
    const newRecords = activitiesToRecord.map(activity => ({
        user_uid: userId,
        activityId: activity.id,
        activityTitle: activity.title,
        date: activity.date,
        status: 'Present' as const,
    }));

    const { error: insertError } = await supabase.from('attendance').insert(newRecords);
    if (insertError) throw insertError;

    console.log(`Auto-recorded attendance for ${newRecords.length} activities for user ${userId}.`);
};


// --- FEED API ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    const { data, error } = await supabase
        .from('feed_items')
        .select('*, users(uid, name, username)') // Fetch author's profile
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching feed items with user join:", error);
        throw error;
    }
    if (!data || data.length === 0) return [];

    // SOLVE N+1 PROBLEM: Fetch all needed avatars in one query.
    const authorIds = [...new Set(data.map(item => item.users?.uid).filter(Boolean))];
    const { data: uploads } = await supabase
        .from('user_uploads')
        .select('owner_id, object_name')
        .in('owner_id', authorIds)
        .eq('bucket_id', 'profiles');

    const avatarMap = new Map<string, string>();
    if (uploads) {
        for (const upload of uploads) {
            const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(upload.object_name);
            avatarMap.set(upload.owner_id, urlData.publicUrl);
        }
    }
    
    // Map results back to feed items
    const feedItemsWithAvatars = data.map(item => {
        const authorProfile = item.users;
        const authorAvatarUrl = authorProfile?.uid ? avatarMap.get(authorProfile.uid) : undefined;
        
        return {
            id: item.id,
            type: item.type,
            author: authorProfile?.name || 'Unknown User',
            authorAvatarUrl: authorAvatarUrl || `https://i.pravatar.cc/40?u=${authorProfile?.username || 'unknown'}`,
            timestamp: new Date(item.created_at).toLocaleString(),
            title: item.title,
            message: item.message,
            likes: item.likes,
        };
    });
    
    return feedItemsWithAvatars;
};

export const addFeedItem = async (itemData: { type: FeedItemType, title?: string, message: string }, author_uid: string): Promise<void> => {
    const newFeedItemData = {
        type: itemData.type,
        title: itemData.title,
        message: itemData.message,
        author_uid: author_uid,
    };

    const { error } = await supabase.from('feed_items').insert(newFeedItemData);
    if (error) {
        console.error("Supabase error inserting feed item:", error);
        throw error;
    }
};


// --- PROJECTS API ---

export const getProjectData = async (): Promise<ProjectData> => {
    const { data: columnsData, error: columnsError } = await supabase.from('project_columns').select('*').order('id', { ascending: true });
    if (columnsError) throw columnsError;
    
    const { data: tasksData, error: tasksError } = await supabase.from('project_tasks').select('*');
    if (tasksError) throw tasksError;

    const tasks: { [key: string]: ProjectTask } = (tasksData || []).reduce((acc, task) => {
        acc[task.id] = task;
        return acc;
    }, {} as {[key: string]: ProjectTask});
    
    const columns: { [key: string]: ProjectColumn } = (columnsData || []).reduce((acc, col) => {
        // Ensure taskIds is an array to prevent crashes if it's null from the DB.
        acc[col.id] = { ...col, taskIds: col.taskIds || [] };
        return acc;
    }, {} as {[key: string]: ProjectColumn});

    const columnOrder = (columnsData || []).map(col => col.id);

    return { tasks, columns, columnOrder };
};

export const addProjectTask = async (content: string): Promise<void> => {
    const { data: newTaskData, error: insertError } = await supabase.from('project_tasks').insert({ content }).select().single();
    if (insertError || !newTaskData) throw insertError || new Error("Failed to create task");

    const { data: backlogColumn, error: columnError } = await supabase.from('project_columns').select('*').order('id').limit(1).single();
    if (columnError || !backlogColumn) throw columnError || new Error("Backlog column not found");

    const updatedTaskIds = [...(backlogColumn.taskIds || []), newTaskData.id];
    const { error: updateError } = await supabase.from('project_columns').update({ taskIds: updatedTaskIds }).eq('id', backlogColumn.id);
    if (updateError) throw updateError;
};

export const deleteProjectTask = async (taskId: string): Promise<void> => {
    // Note: A database transaction would be safer here.
    const { data: columns, error: colError } = await supabase.from('project_columns').select('id, taskIds');
    if (colError) throw colError;
    
    const sourceColumn = columns?.find(c => c.taskIds.includes(taskId));
    
    const { error: deleteError } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (deleteError) throw deleteError;
    
    if (sourceColumn) {
        const updatedTaskIds = sourceColumn.taskIds.filter(id => id !== taskId);
        const { error: updateError } = await supabase.from('project_columns').update({ taskIds: updatedTaskIds }).eq('id', sourceColumn.id);
        if (updateError) console.error("Failed to update column after task deletion:", updateError);
    }
};

export const assignProjectTask = async (taskId: string, assigneeId: string | undefined): Promise<void> => {
    const { error } = await supabase.from('project_tasks').update({ assigneeId: assigneeId || null }).eq('id', taskId);
    if (error) throw error;
};

export const moveProjectTask = async (taskId: string, newColumnId: string): Promise<void> => {
    // Note: A database transaction would be safer here.
    const { data: columns, error: colError } = await supabase.from('project_columns').select('id, taskIds');
    if (colError) throw colError;
    
    const sourceColumn = columns?.find(c => c.taskIds.includes(taskId));
    const destColumn = columns?.find(c => c.id === newColumnId);

    if (!sourceColumn || !destColumn) throw new Error("Source or destination column not found");

    // Remove from source
    const sourceTaskIds = sourceColumn.taskIds.filter(id => id !== taskId);
    const { error: sourceUpdateError } = await supabase.from('project_columns').update({ taskIds: sourceTaskIds }).eq('id', sourceColumn.id);
    if (sourceUpdateError) throw sourceUpdateError;

    // Add to destination
    const destTaskIds = [...destColumn.taskIds, taskId];
    const { error: destUpdateError } = await supabase.from('project_columns').update({ taskIds: destTaskIds }).eq('id', newColumnId);
    if (destUpdateError) {
        // Attempt to revert the source column change on failure
        await supabase.from('project_columns').update({ taskIds: sourceColumn.taskIds }).eq('id', sourceColumn.id);
        throw destUpdateError;
    }
};