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
        phone_number: newUser.phoneNumber,
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
        phone_number: newUser.phoneNumber,
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
    return { ...userData, avatarUrl, phoneNumber: userData.phone_number };
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
        phoneNumber: user.phone_number
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
    const { data, error } = await supabase
        .from('attendance')
        .select(`
            id,
            status,
            user_uid,
            activities (
                id,
                title,
                date
            )
        `)
        .eq('user_uid', userId)
        .order('date', { referencedTable: 'activities', ascending: false });

    if (error) throw error;
    
    // Map the nested structure from Supabase to the flat AttendanceRecord structure
    return (data || []).map(record => {
        const activityData = record.activities as {id: string, title: string, date: string} | null;
        
        // Handle case where activity might be null (though FK should prevent this)
        if (!activityData) return null;

        return {
            id: record.id.toString(),
            activityId: activityData.id.toString(),
            activityTitle: activityData.title,
            date: activityData.date,
            status: record.status,
            userId: record.user_uid,
        };
    }).filter((rec): rec is AttendanceRecord => !!rec);
};

export const addAttendance = async (userId: string, recordData: Omit<AttendanceRecord, 'id' | 'userId'>): Promise<void> => {
    // Create a new record with only the columns that exist in the 'attendance' table
    const newRecord = {
        user_uid: userId,
        activity_id: recordData.activityId,
        status: recordData.status,
    };
    const { error } = await supabase.from('attendance').insert(newRecord);
    if (error) throw error;
};

export const markAttendanceOnLogin = async (userId: string): Promise<void> => {
    // 1. Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // 2. Fetch all activities scheduled for today
    const { data: todaysActivities, error: activityError } = await supabase
        .from('activities')
        .select('id, title, date')
        .eq('date', today);

    if (activityError) {
        console.error("Error fetching today's activities:", activityError);
        throw activityError;
    }

    if (!todaysActivities || todaysActivities.length === 0) {
        // No activities today, nothing to do.
        return;
    }

    // 3. Get the user's existing attendance records for today's activities
    const activityIds = todaysActivities.map(a => a.id);
    const { data: existingRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('activity_id') // Use correct column name
        .eq('user_uid', userId)
        .in('activity_id', activityIds); // Use correct column name
    
    if (attendanceError) {
        console.error("Error fetching existing attendance:", attendanceError);
        throw attendanceError;
    }

    const recordedActivityIds = new Set(existingRecords?.map(r => r.activity_id)); // Use correct property name

    // 4. Filter to find activities the user hasn't been marked for yet
    const unrecordedActivities = todaysActivities.filter(activity => !recordedActivityIds.has(activity.id));

    if (unrecordedActivities.length === 0) {
        // User is already marked for all of today's activities.
        return;
    }

    // 5. Prepare and insert the new 'Present' records with correct column names
    const newRecordsToInsert = unrecordedActivities.map(activity => ({
        activity_id: activity.id,
        status: 'Present' as const,
        user_uid: userId,
    }));

    const { error: insertError } = await supabase.from('attendance').insert(newRecordsToInsert);

    if (insertError) {
        console.error("Error marking attendance on login:", insertError);
        throw insertError;
    }

    console.log(`Successfully marked attendance for ${newRecordsToInsert.length} activities.`);
};


// --- FEED API ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    const { data, error } = await supabase
        .from('feed_items')
        .select(`
            *,
            author:users ( uid, name )
        `)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (!data) return [];
    
    // SOLVE N+1 PROBLEM: Fetch all avatar records for all authors in one query.
    const authorIds = data
        .map(item => {
            const authorData = Array.isArray(item.author) ? item.author[0] : item.author;
            return authorData?.uid;
        })
        .filter((uid): uid is string => !!uid);

    const avatarMap = new Map<string, string>();
    if(authorIds.length > 0) {
        const { data: uploads } = await supabase
            .from('user_uploads')
            .select('owner_id, object_name')
            .in('owner_id', authorIds)
            .eq('bucket_id', 'profiles');

        // Create a map for quick lookups
        if (uploads) {
            for (const upload of uploads) {
                const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(upload.object_name);
                avatarMap.set(upload.owner_id, urlData.publicUrl);
            }
        }
    }
    
    // The query returns `author` as an object { uid, name }. We need to flatten this and add avatar.
    return data.map(item => {
        const authorProfile = Array.isArray(item.author) ? item.author[0] : item.author;
        const authorName = authorProfile?.name || 'Unknown User';
        const authorUid = authorProfile?.uid || 'unknown';
        
        return {
            ...item,
            author: authorName,
            authorAvatarUrl: avatarMap.get(authorUid) || `https://i.pravatar.cc/40?u=${authorUid}`,
            timestamp: new Date(item.created_at).toLocaleString(), // Format timestamp
        }
    });
};

export const addFeedItem = async (itemData: Omit<FeedItem, 'id' | 'author' | 'authorAvatarUrl' | 'timestamp' | 'likes'>, authorId: string): Promise<void> => {
    const newFeedItem = {
        type: itemData.type,
        title: itemData.title,
        message: itemData.message,
        author_uid: authorId,
    };
    const { error } = await supabase.from('feed_items').insert(newFeedItem);
    if (error) throw error;
};

// --- PROJECTS API ---

export const getProjectData = async (): Promise<ProjectData> => {
    // Fetch columns and tasks in parallel, which is more efficient.
    const [columnsRes, tasksRes] = await Promise.all([
        supabase.from('project_columns').select('*').order('position', { ascending: true }),
        supabase.from('project_tasks').select('*') // We can order tasks later if needed
    ]);

    if (columnsRes.error) throw columnsRes.error;
    if (tasksRes.error) throw tasksRes.error;
    
    const allTasks = tasksRes.data || [];
    const columnsData = columnsRes.data || [];

    // Process tasks into a dictionary for quick O(1) lookups.
    const tasks: { [key: string]: ProjectTask } = allTasks.reduce((acc, task) => {
        acc[task.id.toString()] = { 
            id: task.id.toString(),
            content: task.content,
            assigneeId: task.assignee_uid 
        };
        return acc;
    }, {});

    // Process columns and initialize them with empty task lists.
    const columns: { [key: string]: ProjectColumn } = {};
    const columnOrder: string[] = [];

    for (const col of columnsData) {
        const colId = col.id.toString();
        columnOrder.push(colId);
        columns[colId] = {
            id: colId,
            title: col.title,
            taskIds: [], // Initialize empty, to be populated next.
        };
    }
    
    // Populate the task lists for each column by iterating through the tasks.
    for (const task of allTasks) {
        const columnId = task.column_id.toString();
        if (columns[columnId]) {
            columns[columnId].taskIds.push(task.id.toString());
        }
    }

    return { tasks, columns, columnOrder };
};


export const moveProjectTask = async (taskId: string, destinationColumnId: string): Promise<void> => {
    // With the new schema, moving a task is a simple update operation.
    const { error } = await supabase
        .from('project_tasks')
        .update({ column_id: destinationColumnId })
        .eq('id', taskId);
        
    if (error) throw error;
};

export const addProjectTask = async (content: string): Promise<void> => {
    // 1. Find the 'Backlog' column (assuming it's the first one by position).
    const { data: backlogColumn, error: columnError } = await supabase
        .from('project_columns')
        .select('id')
        .order('position', { ascending: true })
        .limit(1)
        .single();

    if (columnError) throw columnError;
    if (!backlogColumn) throw new Error("Could not find a 'Backlog' column to add the task to.");

    // 2. Insert the new task directly into the correct column.
    const { error: taskError } = await supabase
        .from('project_tasks')
        .insert({ content: content, column_id: backlogColumn.id });
        
    if (taskError) throw taskError;
};

export const deleteProjectTask = async (taskId: string): Promise<void> => {
    // The CASCADE delete on the foreign key in the database schema handles this nicely.
    // We only need to delete the task itself.
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) throw error;
};

export const assignProjectTask = async (taskId: string, assigneeId: string | undefined): Promise<void> => {
    const { error } = await supabase
        .from('project_tasks')
        .update({ assignee_uid: assigneeId })
        .eq('id', taskId);
    if (error) throw error;
};