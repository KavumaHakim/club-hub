
import { supabase } from './supabaseClient';
// FIX: Imported the new Notification type.
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask, FeedItemType, ProjectColumn, Resource, Notification, Tab, Room, Message } from '../types';
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
    const { data, error } = await supabase.from('activities').select('*').order('date', { ascending: false });
    if (error) throw new Error(error.message);
    // Explicitly map the ID to a string to ensure type consistency with the app's `Activity` interface.
    return (data || []).map(activity => ({
        ...activity,
        id: activity.id.toString(),
    }));
};

export const addActivity = async (activityData: Omit<Activity, 'id'>): Promise<void> => {
    const { error } = await supabase.from('activities').insert(activityData);
    if (error) throw new Error(error.message);
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
};

// --- PROJECTS API ---

export const getProjectData = async (): Promise<ProjectData> => {
    // 1. Fetch columns and tasks in parallel.
    const [columnsRes, tasksRes] = await Promise.all([
        supabase.from('project_columns').select('*').order('position', { ascending: true }),
        // Fetch tasks without position ordering, as it does not exist in the schema.
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

export const addProjectTask = async (content: string): Promise<void> => {
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
            content: content,
            column_id: firstColumn.id,
        });
        
    if (taskError) throw new Error(taskError.message);
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

// --- RESOURCES API ---

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
        uploaderUid: item.uploader_uid,
    }));
};

export const addResource = async (
    resourceData: Omit<Resource, 'id' | 'createdAt' | 'uploaderName' | 'uploaderAvatarUrl'>
): Promise<void> => {
    // Insert metadata into the 'resources' table
    const resourceToInsert = {
        title: resourceData.title,
        description: resourceData.description,
        type: resourceData.type,
        category: resourceData.category,
        topic: resourceData.topic || null,
        url: resourceData.url,
        uploader_uid: resourceData.uploaderUid,
    };

    const { error: insertError } = await supabase.from('resources').insert(resourceToInsert);
    if (insertError) throw new Error(insertError.message);
};

export const deleteResource = async (resource: Resource): Promise<void> => {
    // Delete the metadata record from the 'resources' table
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

export const sendMessage = async (roomId: string, senderId: string, content: string): Promise<Message> => {
    const { data, error } = await supabase.from('messages').insert({
        room_id: roomId,
        sender_id: senderId,
        content: content,
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
    // 1. Create Room
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ title: title })
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
