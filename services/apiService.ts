import { supabase } from './supabaseClient';
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask, FeedItemType, ProjectColumn } from '../types';
import { predefinedAvatars } from '../constants';

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

    // Assign a random default avatar on sign up
    const randomAvatar = predefinedAvatars[Math.floor(Math.random() * predefinedAvatars.length)];

    const { error: profileError } = await supabase.from('users').insert({
        uid: authData.user.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        phone_number: newUser.phoneNumber,
        avatar_url: randomAvatar,
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

    // Assign a random default avatar on sign up
    const randomAvatar = predefinedAvatars[Math.floor(Math.random() * predefinedAvatars.length)];

    const { error: profileError } = await supabase.from('users').insert({
        uid: authData.user.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        phone_number: newUser.phoneNumber,
        avatar_url: randomAvatar,
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

    // Return user data, mapping snake_case from DB to camelCase for the app.
    return { 
        ...userData, 
        avatarUrl: userData.avatar_url, 
        phoneNumber: userData.phone_number 
    };
};


// --- USERS API ---

export const getUsers = async (): Promise<User[]> => {
    const { data: usersData, error } = await supabase.from('users').select('*');
    if (error) throw error;
    if (!usersData || usersData.length === 0) return [];
    
    // The complex logic for fetching from `user_uploads` is removed.
    // We just map the results directly.
    return usersData.map(user => ({
        ...user,
        avatarUrl: user.avatar_url,
        phoneNumber: user.phone_number
    }));
};

export const updateUser = async (uid: string, updates: Partial<Pick<User, 'role' | 'status' | 'avatarUrl'>>): Promise<void> => {
    // Map camelCase from app to snake_case for DB
    const dbUpdates: { [key: string]: any } = {};
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;

    const { error } = await supabase.from('users').update(dbUpdates).eq('uid', uid);
    if (error) throw error;
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
            author:users ( uid, name, avatar_url )
        `)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (!data) return [];
    
    // The query now returns `author` as an object { uid, name, avatar_url }. We can use this directly.
    return data.map(item => {
        const authorProfile = Array.isArray(item.author) ? item.author[0] : item.author;
        const authorName = authorProfile?.name || 'Unknown User';
        const authorUid = authorProfile?.uid || 'unknown';
        
        return {
            ...item,
            author: authorName,
            authorAvatarUrl: authorProfile?.avatar_url || `https://i.pravatar.cc/40?u=${authorUid}`,
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
    // Fetch columns and tasks in parallel
    const [columnsRes, tasksRes] = await Promise.all([
        supabase.from('project_columns').select('*').order('position', { ascending: true }),
        supabase.from('project_tasks').select('*')
    ]);

    if (columnsRes.error) throw columnsRes.error;
    if (tasksRes.error) throw tasksRes.error;
    
    const allTasksData = tasksRes.data || [];
    const columnsData = columnsRes.data || [];

    // Process tasks into a dictionary for quick O(1) lookups.
    const tasks: { [key: string]: ProjectTask } = allTasksData.reduce((acc, task) => {
        acc[task.id.toString()] = { 
            id: task.id.toString(),
            content: task.content,
            assigneeId: task.assignee_uid 
        };
        return acc;
    }, {} as {[key: string]: ProjectTask});

    // Process columns and their taskIds from the DB
    const columns: { [key:string]: ProjectColumn } = {};
    const columnOrder: string[] = [];

    for (const col of columnsData) {
        const colId = col.id.toString();
        columnOrder.push(colId);
        columns[colId] = {
            id: colId,
            title: col.title,
            // FIX: Ensure all task IDs from DB are converted to strings for consistency
            taskIds: (col.taskIds || []).map((id: any) => String(id)), 
        };
    }
    
    return { tasks, columns, columnOrder };
};


export const moveProjectTask = async (
    taskId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    newIndex: number,
    projectData: ProjectData
): Promise<void> => {
    const sourceColumn = projectData.columns[sourceColumnId];
    const destinationColumn = projectData.columns[destinationColumnId];

    const newSourceTaskIds = [...sourceColumn.taskIds];
    
    const taskIndex = newSourceTaskIds.indexOf(taskId);
    if (taskIndex > -1) {
        newSourceTaskIds.splice(taskIndex, 1);
    }

    if (sourceColumnId === destinationColumnId) {
        // Reordering within the same column
        newSourceTaskIds.splice(newIndex, 0, taskId);
        
        const { error } = await supabase
            .from('project_columns')
            .update({ taskIds: newSourceTaskIds.map(Number) }) // FIX: Convert string IDs to numbers for DB
            .eq('id', sourceColumnId);
        if (error) throw error;
        
    } else {
        // Moving to a different column
        const newDestinationTaskIds = [...destinationColumn.taskIds];
        newDestinationTaskIds.splice(newIndex, 0, taskId);

        // Perform two updates in parallel
        const [sourceUpdateResult, destUpdateResult] = await Promise.all([
            supabase
                .from('project_columns')
                .update({ taskIds: newSourceTaskIds.map(Number) }) // FIX: Convert string IDs to numbers for DB
                .eq('id', sourceColumnId),
            supabase
                .from('project_columns')
                .update({ taskIds: newDestinationTaskIds.map(Number) }) // FIX: Convert string IDs to numbers for DB
                .eq('id', destinationColumnId)
        ]);
        
        if (sourceUpdateResult.error) throw sourceUpdateResult.error;
        if (destUpdateResult.error) throw destUpdateResult.error;
    }
};

export const addProjectTask = async (content: string): Promise<void> => {
    // 1. Insert the new task and get its ID back.
    // FIX: Remove .single() and check the returned array to handle RLS policies gracefully.
    const { data: insertedData, error: taskError } = await supabase
        .from('project_tasks')
        .insert({ content: content })
        .select('id');
        
    if (taskError) throw taskError;
    if (!insertedData || insertedData.length === 0) {
        throw new Error("Failed to create new task: The operation did not return the new task, which may be due to database permissions.");
    }
    const newTaskId = insertedData[0].id; // This is a number

    // 2. Find the 'Backlog' column (first column by position).
    const { data: backlogColumn, error: columnError } = await supabase
        .from('project_columns')
        .select('id, taskIds')
        .order('position', { ascending: true })
        .limit(1)
        .single();

    if (columnError) throw columnError;
    if (!backlogColumn) throw new Error("Could not find a 'Backlog' column to add the task to.");

    // 3. Append the new task's ID to the column's task list.
    const updatedTaskIds = [...(backlogColumn.taskIds || []), newTaskId];

    const { error: updateError } = await supabase
        .from('project_columns')
        .update({ taskIds: updatedTaskIds })
        .eq('id', backlogColumn.id);
    
    if (updateError) throw updateError;
};

export const deleteProjectTask = async (taskId: string, columnId: string): Promise<void> => {
    // 1. Fetch the column to get its current taskIds array.
    const { data: column, error: columnError } = await supabase
        .from('project_columns')
        .select('taskIds')
        .eq('id', columnId)
        .single();
    
    if (columnError) throw columnError;
    if (!column) throw new Error("Column not found.");

    // 2. Remove the taskId from the array.
    // FIX: Handle mixed types. `column.taskIds` has numbers, `taskId` is a string.
    const updatedTaskIds = (column.taskIds || []).filter((id: number) => id.toString() !== taskId);

    // 3. Update the column and delete the task in parallel.
    const [updateResult, deleteResult] = await Promise.all([
        supabase
            .from('project_columns')
            .update({ taskIds: updatedTaskIds })
            .eq('id', columnId),
        supabase
            .from('project_tasks')
            .delete()
            .eq('id', Number(taskId)) // FIX: Convert string taskId to number for DB query.
    ]);
    
    if (updateResult.error) throw updateResult.error;
    if (deleteResult.error) throw deleteResult.error;
};

export const assignProjectTask = async (taskId: string, assigneeId: string | undefined): Promise<void> => {
    const { error } = await supabase
        .from('project_tasks')
        .update({ assignee_uid: assigneeId })
        .eq('id', Number(taskId)); // FIX: Convert string taskId to number for DB query.
    if (error) throw error;
};