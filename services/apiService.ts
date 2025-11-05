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
    const { data, error } = await supabase.from('users').select('*').eq('uid', uid).single();
    if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (single row not found)
        console.error("Error fetching user profile:", error);
        return null;
    }
    return data;
};


// --- USERS API ---

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
};

export const updateUser = async (uid: string, updates: Partial<Pick<User, 'role' | 'status' | 'avatarUrl'>>): Promise<void> => {
    const { error } = await supabase.from('users').update(updates).eq('uid', uid);
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
    const { data, error } = await supabase.from('attendance').select('*').eq('userId', userId);
    if (error) throw error;
    return data || [];
};

export const addAttendance = async (userId: string, recordData: Omit<AttendanceRecord, 'id' | 'userId'>): Promise<void> => {
    const newRecord = { ...recordData, userId };
    const { error } = await supabase.from('attendance').insert(newRecord);
    if (error) throw error;
};


// --- FEED API ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    const { data, error } = await supabase.from('feed_items').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addFeedItem = async (itemData: { type: FeedItemType, title?: string, message: string }, author_uid: string): Promise<void> => {
    const author = await getUserProfile(author_uid);
    if (!author) throw new Error("Author not found.");
    
    const newFeedItemData = {
        type: itemData.type,
        author: author.name,
        authorAvatarUrl: author.avatarUrl || `https://i.pravatar.cc/40?u=${author.username}`,
        title: itemData.title,
        message: itemData.message,
    };

    const { error } = await supabase.from('feed_items').insert(newFeedItemData);
    if (error) throw error;
};


// --- PROJECTS API ---

export const getProjectData = async (): Promise<ProjectData> => {
    const { data: columnsData, error: columnsError } = await supabase.from('project_columns').select('*').order('position', { ascending: true });
    if (columnsError) throw columnsError;
    
    const { data: tasksData, error: tasksError } = await supabase.from('project_tasks').select('*');
    if (tasksError) throw tasksError;

    const tasks: { [key: string]: ProjectTask } = (tasksData || []).reduce((acc, task) => {
        acc[task.id] = task;
        return acc;
    }, {} as {[key: string]: ProjectTask});
    
    const columns: { [key: string]: ProjectColumn } = (columnsData || []).reduce((acc, col) => {
        acc[col.id] = col;
        return acc;
    }, {} as {[key: string]: ProjectColumn});

    const columnOrder = (columnsData || []).map(col => col.id);

    return { tasks, columns, columnOrder };
};

export const addProjectTask = async (content: string): Promise<void> => {
    const { data: newTaskData, error: insertError } = await supabase.from('project_tasks').insert({ content }).select().single();
    if (insertError || !newTaskData) throw insertError || new Error("Failed to create task");

    const { data: backlogColumn, error: columnError } = await supabase.from('project_columns').select('*').order('position').limit(1).single();
    if (columnError || !backlogColumn) throw columnError || new Error("Backlog column not found");

    const updatedTaskIds = [...backlogColumn.taskIds, newTaskData.id];
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
