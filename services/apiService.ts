

import { supabase } from './supabaseClient';
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask, FeedItemType, ProjectColumn, Resource, Notification, Tab, Room, Message, ActivityCategory, TaskPriority, FeedComment } from '../types';
import { predefinedAvatars } from '../constants';

// --- INTERNAL HELPERS ---

const notifyPatronsOfNewUser = async (name: string, username: string, role: 'MEMBER' | 'PATRON') => {
    try {
        console.log(`Notifying patrons about new ${role} registration: ${name}`);
        // Fetch all APPROVED patrons to notify them
        const { data: patrons, error } = await supabase
            .from('users')
            .select('uid')
            .eq('role', 'PATRON')
            .eq('status', 'APPROVED');

        if (error || !patrons || patrons.length === 0) return;

        const message = `New ${role.toLowerCase()} registration: ${name} (@${username}) is pending approval.`;

        const notifications = patrons.map(patron => ({
            user_uid: patron.uid,
            message: message,
            is_read: false,
            link_to: 'members', // Direct link to the Members tab
        }));

        const { error: insertError } = await supabase.from('notifications').insert(notifications);
        if (insertError) console.error("Failed to insert notifications for patrons:", insertError);
    } catch (err) {
        console.error("Error in notifyPatronsOfNewUser:", err);
        // We do not throw here to ensure the signup process completes even if notification fails
    }
};

const notifyAllUsers = async (message: string, linkTo: Tab, excludeUserId?: string) => {
    try {
        const { data: users, error } = await supabase.from('users').select('uid');
        if (error || !users) return;
        
        const notifications = users
            .filter(u => u.uid !== excludeUserId)
            .map(u => ({
                user_uid: u.uid,
                message,
                is_read: false,
                link_to: linkTo
            }));
        
        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }
    } catch (err) {
        console.error("Error in notifyAllUsers:", err);
    }
};

// --- AUTH API ---

export const login = async (email: string, password?: string): Promise<User> => {
    if (!password) throw new Error("Password is required.");
    
    // Explicitly check password strength or other pre-checks here if needed in future
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Login failed: no user returned");

    // We fetch the profile to ensure the user exists in our 'users' table.
    const userProfile = await getUserProfile(data.user.id);
    if (!userProfile) {
        // If profile doesn't exist (DB inconsistency), sign out the user
        await supabase.auth.signOut();
        throw new Error("User profile not found. Please contact an admin.");
    }
    
    return userProfile;
};

export const logout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
};

export const signUp = async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
    });
    if (authError) throw new Error(authError.message);
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
    if (profileError) throw new Error(profileError.message);

    // Notify Patrons about the new member
    await notifyPatronsOfNewUser(newUser.name, newUser.username, 'MEMBER');
};

export const signUpAsPatron = async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }): Promise<void> => {
     const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
    });
    if (authError) throw new Error(authError.message);
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
    if (profileError) throw new Error(profileError.message);

    // Notify existing Patrons about the new patron request
    await notifyPatronsOfNewUser(newUser.name, newUser.username, 'PATRON');
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

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
};

export const resetPasswordWithOtp = async (email: string, token: string, newPassword: string): Promise<void> => {
    // 1. Verify the OTP. This exchanges the OTP for a valid session (recovery mode).
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
    });

    if (verifyError) throw new Error(verifyError.message);
    if (!data.session) throw new Error("Verification failed. Please check the code and try again.");

    // 2. Update the user's password using the active session from step 1.
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (updateError) throw new Error(updateError.message);
};


// --- USERS API ---

export const getUsers = async (): Promise<User[]> => {
    const { data: usersData, error } = await supabase.from('users').select('*');
    if (error) throw new Error(error.message);
    if (!usersData || usersData.length === 0) return [];
    
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
    if (error) throw new Error(error.message);
};

export const deleteUser = async (uid: string): Promise<void> => {
    // Note: In a real app, this should be a secure admin function.
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error) throw new Error(error.message);
};

export const changePassword = async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
};


// --- ACTIVITIES API ---

export const getActivities = async (): Promise<Activity[]> => {
    // 1. Fetch activities
    const { data: activities, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: false });

    if (activityError) throw new Error(activityError.message);

    // 2. Fetch RSVPs separately. 
    // This avoids "Could not find a relationship" errors if the foreign key isn't perfectly cached by PostgREST.
    let rsvpMap: Record<string, string[]> = {};
    
    try {
        const { data: rsvps, error: rsvpsError } = await supabase
            .from('activity_rsvps')
            .select('activity_id, user_uid');
            
        if (!rsvpsError && rsvps) {
            rsvps.forEach((r: any) => {
                const aId = r.activity_id.toString();
                if (!rsvpMap[aId]) rsvpMap[aId] = [];
                rsvpMap[aId].push(r.user_uid);
            });
        }
    } catch (e) {
        console.warn("Could not fetch RSVPs, defaulting to empty.", e);
    }
    
    return (activities || []).map(activity => ({
        id: activity.id.toString(),
        title: activity.title,
        date: activity.date,
        description: activity.description,
        location: activity.location,
        category: activity.category || 'OTHER', 
        rsvpUserIds: rsvpMap[activity.id.toString()] || []
    }));
};

export const addActivity = async (activityData: Omit<Activity, 'id' | 'rsvpUserIds'>): Promise<void> => {
    const { error } = await supabase.from('activities').insert({
        title: activityData.title,
        date: activityData.date,
        location: activityData.location,
        description: activityData.description,
        category: activityData.category
    });
    if (error) throw new Error(error.message);

    // Notify all users about the new activity
    await notifyAllUsers(`New activity: ${activityData.title} on ${activityData.date}`, 'activities');
};

export const toggleRSVP = async (activityId: string, userId: string, isJoining: boolean): Promise<void> => {
    // Ensure ID is numeric for DB if it's a BigInt column
    const dbActivityId = Number(activityId);

    if (isJoining) {
        const { error } = await supabase.from('activity_rsvps').insert({
            activity_id: dbActivityId,
            user_uid: userId
        });
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('activity_rsvps').delete().match({
            activity_id: dbActivityId,
            user_uid: userId
        });
        if (error) throw new Error(error.message);
    }
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

    if (error) throw new Error(error.message);
    
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
        // FIX: Convert the string activityId from the app state to a number for the database.
        activity_id: Number(recordData.activityId),
        status: recordData.status,
    };
    const { error } = await supabase.from('attendance').insert(newRecord);
    if (error) throw new Error(error.message);
};

export const markAttendanceOnLogin = async (userId: string): Promise<void> => {
    // 1. Get today's date in YYYY-MM-DD format in EAT (East Africa Time)
    const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Africa/Kampala', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
    const today = formatter.format(new Date());

    // 2. Fetch all activities scheduled for today
    const { data: todaysActivities, error: activityError } = await supabase
        .from('activities')
        .select('id, title, date')
        .eq('date', today);

    if (activityError) {
        console.error("Error fetching today's activities:", activityError);
        throw new Error(activityError.message);
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
        throw new Error(attendanceError.message);
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
        throw new Error(insertError.message);
    }

    console.log(`Successfully marked attendance for ${newRecordsToInsert.length} activities.`);
};


// --- FEED API ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    const { data, error } = await supabase
        .from('feed_items')
        .select(`
            *,
            author:author_uid ( uid, name, avatar_url )
        `)
        .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    if (!data) return [];
    
    // The query joins with the users table via the author_uid foreign key,
    // and returns the author's profile in the 'author' property.
    return data.map(item => {
        const authorProfile = item.author as { uid: string; name: string; avatar_url: string } | null;
        const authorName = authorProfile?.name || 'Unknown User';
        const authorUid = authorProfile?.uid || 'unknown';
        
        return {
            ...item,
            id: item.id.toString(),
            // Ensure title handles nulls from DB correctly, treating them as undefined for TS
            title: item.title || undefined,
            author: authorName,
            authorAvatarUrl: authorProfile?.avatar_url || `https://i.pravatar.cc/40?u=${authorUid}`,
            timestamp: new Date(item.created_at).toLocaleString('en-US', { timeZone: 'Africa/Kampala' }), // Format timestamp in EAT
        };
    });
};

export const addFeedItem = async (itemData: Omit<FeedItem, 'id' | 'author' | 'authorAvatarUrl' | 'timestamp'>, authorId: string): Promise<void> => {
    const newFeedItem = {
        type: itemData.type,
        title: itemData.title || null, // Explicitly null if undefined to match DB expectations if strict
        message: itemData.message,
        author_uid: authorId,
    };
    const { error } = await supabase.from('feed_items').insert(newFeedItem);
    if (error) throw new Error(error.message);

    // Notify all users about the new announcement (except the author)
    await notifyAllUsers(`New Announcement: ${itemData.title || 'Update'}`, 'feed', authorId);
};

export const getFeedComments = async (feedItemId: string): Promise<FeedComment[]> => {
    // 1. Fetch comments first without join to avoid foreign key ambiguity issues
    const { data: comments, error } = await supabase
        .from('feed_comments')
        .select('*')
        .eq('feed_item_id', feedItemId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    if (!comments || comments.length === 0) return [];

    // 2. Get unique user IDs from the fetched comments
    const userIds = [...new Set(comments.map((c: any) => c.user_uid))];

    let userMap = new Map<string, any>();

    if (userIds.length > 0) {
        // 3. Fetch user profiles manually
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('uid, name, avatar_url')
            .in('uid', userIds);
        
        if (usersError) throw new Error(usersError.message);
        
        if (users) {
            userMap = new Map(users.map((u: any) => [u.uid, u]));
        }
    }

    // 4. Combine comments with user data
    return comments.map((item: any) => {
        const user = userMap.get(item.user_uid);
        return {
            id: item.id.toString(),
            feedItemId: item.feed_item_id.toString(),
            userId: item.user_uid,
            userName: user?.name || 'Unknown',
            userAvatarUrl: user?.avatar_url || `https://i.pravatar.cc/40?u=${item.user_uid}`,
            content: item.content,
            createdAt: new Date(item.created_at).toLocaleString('en-US', { 
                timeZone: 'Africa/Kampala',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
        };
    });
};

export const addFeedComment = async (feedItemId: string, userId: string, content: string): Promise<FeedComment> => {
    const { data, error } = await supabase
        .from('feed_comments')
        .insert({
            feed_item_id: Number(feedItemId),
            user_uid: userId,
            content: content
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    // Manually fetch user profile for the return object
    const user = await getUserProfile(userId);

    return {
        id: data.id.toString(),
        feedItemId: data.feed_item_id.toString(),
        userId: data.user_uid,
        userName: user?.name || 'Unknown',
        userAvatarUrl: user?.avatarUrl || `https://i.pravatar.cc/40?u=${data.user_uid}`,
        content: data.content,
        createdAt: new Date(data.created_at).toLocaleString('en-US', { 
            timeZone: 'Africa/Kampala',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
    };
};

// --- PROJECTS API ---

export const getProjectData = async (): Promise<ProjectData> => {
    // 1. Fetch columns and tasks in parallel.
    const [columnsRes, tasksRes] = await Promise.all([
        supabase.from('project_columns').select('*').order('position', { ascending: true }),
        supabase.from('project_tasks').select('*') 
    ]);

    if (columnsRes.error) throw new Error(columnsRes.error.message);
    if (tasksRes.error) throw new Error(tasksRes.error.message);
    
    const allTasksData = tasksRes.data || [];
    const columnsData = columnsRes.data || [];

    // 2. Process tasks into a dictionary for quick O(1) lookups.
    const tasks: { [key: string]: ProjectTask } = allTasksData.reduce((acc, task) => {
        acc[task.id.toString()] = { 
            id: task.id.toString(),
            content: task.content,
            assigneeId: task.assignee_uid,
            isCompleted: task.is_completed || false, 
            priority: task.priority || 'MEDIUM',
            dueDate: task.due_date,
            tags: task.tags || [],
        };
        return acc;
    }, {} as {[key: string]: ProjectTask});

    // 3. Process columns and build columnOrder. Initialize empty taskIds array.
    const columns: { [key:string]: ProjectColumn } = {};
    const columnOrder: string[] = [];

    for (const col of columnsData) {
        const colId = col.id.toString();
        columnOrder.push(colId);
        columns[colId] = {
            id: colId,
            title: col.title,
            taskIds: [], // This will be populated next.
        };
    }

    // 4. Populate the taskIds for each column based on the fetched tasks.
    for (const task of allTasksData) {
        if (task.column_id) {
            const columnId = task.column_id.toString();
            if (columns[columnId]) {
                columns[columnId].taskIds.push(task.id.toString());
            }
        }
    }
    
    return { tasks, columns, columnOrder };
};


export const moveProjectTask = async (taskId: string, destinationColumnId: string): Promise<void> => {
    const { error } = await supabase
        .from('project_tasks')
        .update({ 
            column_id: destinationColumnId,
        })
        .eq('id', taskId);
    
    if (error) throw new Error(error.message);
};

export const addProjectTask = async (taskData: { 
    content: string, 
    priority: TaskPriority, 
    dueDate?: string, 
    tags: string[] 
}): Promise<void> => {
    // 1. Find the first column (e.g., 'Backlog') based on its position.
    const { data: firstColumn, error: columnError } = await supabase
        .from('project_columns')
        .select('id')
        .order('position', { ascending: true })
        .limit(1)
        .single();

    if (columnError) throw new Error(columnError.message);
    if (!firstColumn) throw new Error("No columns found in the project board.");

    // 2. Insert the new task into the first column. Position is not stored.
    const { error: taskError } = await supabase
        .from('project_tasks')
        .insert({ 
            content: taskData.content,
            priority: taskData.priority,
            due_date: taskData.dueDate || null,
            tags: taskData.tags,
            column_id: firstColumn.id,
        });
        
    if (taskError) throw new Error(taskError.message);
};

export const updateProjectTask = async (taskId: string, updates: Partial<ProjectTask>): Promise<void> => {
    const dbUpdates: any = {};
    if (updates.content) dbUpdates.content = updates.content;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
    if (updates.tags) dbUpdates.tags = updates.tags;

    const { error } = await supabase
        .from('project_tasks')
        .update(dbUpdates)
        .eq('id', taskId);
    
    if (error) throw new Error(error.message);
};

export const deleteProjectTask = async (taskId: string, columnId: string): Promise<void> => {
    const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId);
    
    if (error) throw new Error(error.message);
};

export const assignProjectTask = async (taskId: string, assigneeId: string | undefined): Promise<void> => {
    const { error } = await supabase
        .from('project_tasks')
        .update({ assignee_uid: assigneeId })
        .eq('id', taskId);
    if (error) throw new Error(error.message);
};

export const toggleProjectTaskCompletion = async (taskId: string, isCompleted: boolean): Promise<void> => {
    const { error } = await supabase
        .from('project_tasks')
        .update({ is_completed: isCompleted })
        .eq('id', taskId);
    
    if (error) throw new Error(error.message);
};

// --- RESOURCES API ---

const RESOURCES_BUCKET = 'resource_files';

export const getResources = async (): Promise<Omit<Resource, 'uploaderName' | 'uploaderAvatarUrl'>[]> => {
    const { data, error } = await supabase
        .from('resources')
        .select(`*`)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map(item => ({
        id: item.id,
        createdAt: new Date(item.created_at).toLocaleDateString(),
        title: item.title,
        description: item.description,
        type: item.type,
        category: item.category,
        topic: item.topic,
        url: item.url,
        filePath: item.file_path, // Map from DB column file_path
        uploaderUid: item.uploader_uid,
    }));
};

export const addResource = async (
    resourceData: Omit<Resource, 'id' | 'createdAt' | 'uploaderName' | 'uploaderAvatarUrl'>
): Promise<void> => {
    // Insert metadata into the 'resources' table
    // Explicitly mapping undefined to null to ensure compatibility with Supabase
    const resourceToInsert = {
        title: resourceData.title,
        description: resourceData.description || null,
        type: resourceData.type,
        category: resourceData.category,
        topic: resourceData.topic || null,
        url: resourceData.url || null,
        file_path: resourceData.filePath || null,
        uploader_uid: resourceData.uploaderUid,
    };

    const { error: insertError } = await supabase.from('resources').insert(resourceToInsert);
    if (insertError) throw new Error(insertError.message);
};

export const uploadResourceFile = async (file: File, userId: string): Promise<{ path: string, url: string }> => {
    // Generate a safe filename to avoid RLS regex issues with special characters in file names.
    // Use timestamp + random string + original extension.
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'txt';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    // Store in a user-specific folder for organization and RLS policies
    const filePath = `${userId}/${cleanFileName}`;
    
    const { data, error } = await supabase.storage
        .from(RESOURCES_BUCKET)
        .upload(filePath, file, {
            upsert: false,
            // Automatically detect content type or default to text/x-python for .py files
            contentType: fileExt === 'py' ? 'text/x-python' : undefined
        });

    if (error) throw new Error(`Failed to upload file: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage
        .from(RESOURCES_BUCKET)
        .getPublicUrl(filePath);

    return { path: data.path, url: publicUrl };
};

export const deleteResource = async (resource: Resource): Promise<void> => {
    // 1. If there's a file associated, delete it from storage first
    if (resource.filePath) {
        const { error: storageError } = await supabase.storage
            .from(RESOURCES_BUCKET)
            .remove([resource.filePath]);
        
        if (storageError) {
             console.warn(`Failed to delete file from storage: ${storageError.message}`);
             // We continue to delete the DB record even if file deletion fails, 
             // though ideally we'd want transactional consistency.
        }
    }

    // 2. Delete the metadata record from the 'resources' table
    const { error: dbError } = await supabase.from('resources').delete().eq('id', resource.id);
    if (dbError) throw new Error(dbError.message);
};


// --- NOTIFICATIONS API ---

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_uid', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) throw new Error(error.message);
    if (!data) return [];
    
    return data.map(n => ({
        id: n.id.toString(),
        message: n.message,
        isRead: n.is_read,
        createdAt: new Date(n.created_at).toLocaleString('en-US', { timeZone: 'Africa/Kampala' }), // Format timestamp in EAT
        linkTo: n.link_to as Tab | undefined,
        userId: n.user_uid,
    }));
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    if (error) throw new Error(error.message);
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_uid', userId)
        .eq('is_read', false);
    if (error) throw new Error(error.message);
};

// --- CHAT API ---

export const getRooms = async (userId: string): Promise<Room[]> => {
    // 1. Get all room IDs the user is a member of
    const { data: memberships, error: membershipError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', userId);

    if (membershipError) throw new Error(membershipError.message);
    if (!memberships || memberships.length === 0) return [];

    const roomIds = memberships.map(m => m.room_id);

    // 2. Fetch room details
    const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

    if (roomsError) throw new Error(roomsError.message);

    // 3. Fetch all participants for these rooms to reconstruct names in UI
    const { data: allMembers, error: allMembersError } = await supabase
        .from('room_members')
        .select('room_id, user_id')
        .in('room_id', roomIds);

    if (allMembersError) throw new Error(allMembersError.message);

    return rooms.map(room => {
        const participantIds = allMembers
            .filter(m => m.room_id === room.id)
            .map(m => m.user_id);

        return {
            id: room.id,
            title: room.title,
            createdAt: room.created_at,
            updatedAt: room.updated_at,
            createdBy: room.created_by,
            participantIds: participantIds,
        };
    });
};

export const getRoomMessages = async (roomId: string): Promise<Message[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return data.map(msg => ({
        id: msg.id,
        roomId: msg.room_id,
        senderId: msg.sender_id,
        content: msg.content,
        createdAt: msg.created_at,
        metadata: msg.metadata
    }));
};

export const sendMessage = async (roomId: string, senderId: string, content: string, metadata?: any): Promise<Message> => {
    const { data, error } = await supabase.from('messages').insert({
        room_id: roomId,
        sender_id: senderId,
        content: content,
        metadata: metadata
    }).select().single();

    if (error) throw new Error(error.message);

    // Update room updated_at timestamp
    await supabase.from('rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId);

    return {
        id: data.id,
        roomId: data.room_id,
        senderId: data.sender_id,
        content: data.content,
        createdAt: data.created_at,
        metadata: data.metadata
    };
};

export const createRoom = async (title: string | null, participantIds: string[]): Promise<string> => {
    const creatorId = participantIds[0]; // Assumption: The first ID is the creator.
    
    // 1. Create Room
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ 
            title: title,
            created_by: creatorId 
        })
        .select()
        .single();

    if (roomError) throw new Error(roomError.message);

    // 2. Add Members
    const members = participantIds.map(uid => ({
        room_id: room.id,
        user_id: uid,
    }));

    const { error: membersError } = await supabase.from('room_members').insert(members);
    if (membersError) throw new Error(membersError.message);

    return room.id;
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
    const members = userIds.map(uid => ({
        room_id: roomId,
        user_id: uid,
    }));

    const { error } = await supabase.from('room_members').insert(members);
    if (error) throw new Error(error.message);
};

export const updateRoomTitle = async (roomId: string, title: string): Promise<void> => {
    const { error } = await supabase.from('rooms').update({ title, updated_at: new Date().toISOString() }).eq('id', roomId);
    if (error) throw new Error(error.message);
}

export const uploadChatFile = async (file: File, roomId: string, userId: string): Promise<string> => {
    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size exceeds the 2MB limit.");
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'dat';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    // Store in resource_files bucket under a chat directory, prefixed with userId to allow RLS to pass if it checks for user folder ownership
    const filePath = `${userId}/chat/${roomId}/${cleanFileName}`;

    const { data, error } = await supabase.storage
        .from('resource_files')
        .upload(filePath, file, {
            upsert: false
        });

    if (error) throw new Error(`Failed to upload file: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage
        .from('resource_files')
        .getPublicUrl(filePath);

    return publicUrl;
};

export const deleteMessage = async (messageId: string): Promise<void> => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw new Error(error.message);
};

// --- USER SCRIPTS (STORAGE) API ---

const BUCKET_NAME = 'user_scripts';

export const listUserScripts = async (userId: string): Promise<{ name: string; id: string; lastModified: string; size: number }[]> => {
    // We list items in the folder named after the user's UID
    const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list(userId, {
            sortBy: { column: 'updated_at', order: 'desc' },
        });

    if (error) throw new Error(`Failed to list scripts: ${error.message}`);
    
    return (data || []).map(file => ({
        name: file.name,
        id: file.id,
        lastModified: new Date(file.updated_at).toLocaleString(),
        size: file.metadata.size,
    }));
};

export const saveUserScript = async (userId: string, fileName: string, content: string): Promise<void> => {
    // Ensure filename ends with .py
    const safeName = fileName.endsWith('.py') ? fileName : `${fileName}.py`;
    const filePath = `${userId}/${safeName}`;

    const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(filePath, content, {
            upsert: true,
            contentType: 'text/x-python'
        });

    if (error) throw new Error(`Failed to save script: ${error.message}`);
};

export const downloadUserScript = async (userId: string, fileName: string): Promise<string> => {
    const filePath = `${userId}/${fileName}`;
    const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .download(filePath);

    if (error) throw new Error(`Failed to download script: ${error.message}`);
    
    return await data.text();
};

export const deleteUserScript = async (userId: string, fileName: string): Promise<void> => {
    const filePath = `${userId}/${fileName}`;
    const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove([filePath]);

    if (error) throw new Error(`Failed to delete script: ${error.message}`);
};
