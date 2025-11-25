
import { supabase } from './supabaseClient';
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask, Resource, Notification, Room, Message, ShowcaseItem, Suggestion, Challenge, ChallengeSubmission, FeedComment, SuggestionType, SuggestionStatus, SubmissionStatus, ActivityCategory, FeedItemType, TaskPriority, ResourceCategory, ResourceType } from '../types';

// --- Auth & User ---

export const login = async (email: string, password?: string) => {
  if (!password) throw new Error("Password is required for login");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const signUp = async (userData: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        name: userData.name,
        username: userData.username,
        phoneNumber: userData.phoneNumber,
        role: 'MEMBER',
        status: 'PENDING'
      }
    }
  });
  if (error) throw error;
  
  if (data.user) {
      // Use 'uid' instead of 'id' for the users table insert as per schema
      const { error: profileError } = await supabase.from('users').insert({
          uid: data.user.id,
          email: userData.email,
          name: userData.name,
          username: userData.username,
          phone_number: userData.phoneNumber,
          role: 'MEMBER',
          status: 'PENDING'
      }).select().single();
      
      if (profileError && profileError.code !== '23505') { // Ignore unique violation if trigger exists
          console.error("Error creating user profile:", profileError);
      }
  }
};

export const signUpAsPatron = async (userData: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                name: userData.name,
                username: userData.username,
                phoneNumber: userData.phoneNumber,
                role: 'PATRON',
                status: 'PENDING' 
            }
        }
    });
    if (error) throw error;

    if (data.user) {
        // Use 'uid' instead of 'id' for the users table insert as per schema
        const { error: profileError } = await supabase.from('users').insert({
            uid: data.user.id,
            email: userData.email,
            name: userData.name,
            username: userData.username,
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
  // Query using 'uid' as primary key
  const { data, error } = await supabase.from('users').select('*').eq('uid', userId).maybeSingle();
  if (error) {
      console.error("Error fetching user profile:", error);
      return null;
  }
  if (!data) return null;
  return {
      uid: data.uid,
      email: data.email,
      name: data.name,
      username: data.username,
      role: data.role,
      status: data.status,
      avatarUrl: data.avatar_url,
      phoneNumber: data.phone_number,
      badges: data.badges
  };
};

export const getUsers = async (): Promise<User[]> => {
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
        phoneNumber: u.phone_number,
        badges: u.badges
    }));
};

export const updateUser = async (uid: string, data: Partial<User>) => {
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.username) updates.username = data.username;
    if (data.role) updates.role = data.role;
    if (data.status) updates.status = data.status;
    if (data.avatarUrl) updates.avatar_url = data.avatarUrl;
    if (data.phoneNumber) updates.phone_number = data.phoneNumber;
    if (data.badges) updates.badges = data.badges;

    // Update where 'uid' matches
    const { error } = await supabase.from('users').update(updates).eq('uid', uid);
    if (error) throw error;
};

export const deleteUser = async (uid: string) => {
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error) throw error;
};

export const approveMember = async (uid: string) => {
    const { error } = await supabase.from('users').update({ status: 'APPROVED' }).eq('uid', uid);
    if (error) throw error;
};

export const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
};

export const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
    if (error) throw error;
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
};

// --- Activities ---

export const getActivities = async (): Promise<Activity[]> => {
    // Join with activity_rsvps to get user IDs
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

export const addActivity = async (activity: Omit<Activity, 'id' | 'rsvpUserIds'>) => {
    const { error } = await supabase.from('activities').insert({
        title: activity.title,
        date: activity.date,
        description: activity.description,
        location: activity.location,
        category: activity.category
    });
    if (error) throw error;
};

export const toggleRSVP = async (activityId: string, userId: string, isJoining: boolean) => {
    if (isJoining) {
        const { error } = await supabase.from('activity_rsvps').insert({
            activity_id: activityId,
            user_uid: userId
        });
        // Ignore duplicate key error if user clicks rapidly
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
    // Schema uses user_uid (text) and joins with activities via activity_id (bigint)
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
    // Schema: user_uid (text), activity_id (bigint), status (text)
    const { error } = await supabase.from('attendance').insert({
        user_uid: userId,
        activity_id: record.activityId,
        status: record.status
    });
    if (error) throw error;
};

export const markAttendanceOnLogin = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    // This implies an activities table exists with a 'date' column (YYYY-MM-DD or date type)
    const { data: activities } = await supabase.from('activities').select('*').eq('date', today);
    
    if (activities && activities.length > 0) {
        for (const activity of activities) {
            // Check if already recorded. Use maybeSingle to avoid error if not found.
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
    // Join with users table and count comments
    const { data, error } = await supabase
        .from('feed_items')
        .select(`
            *,
            users (
                name,
                avatar_url
            ),
            feed_comments ( count )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map((item: any) => ({
        id: String(item.id),
        type: item.type,
        author: item.users?.name || 'Unknown',
        authorAvatarUrl: item.users?.avatar_url,
        timestamp: new Date(item.created_at).toLocaleString(),
        title: item.title,
        message: item.message,
        commentCount: item.feed_comments[0]?.count || 0
    }));
};


export const addFeedItem = async (item: { title: string, message: string, type: FeedItemType }, userId: string) => {
    // Insert uses 'message' and 'author_uid'
    const { error } = await supabase.from('feed_items').insert({
        type: item.type,
        title: item.title,
        message: item.message,
        author_uid: userId,
    });
    if (error) throw error;
};

export const deleteFeedItem = async (id: string) => {
    const { error } = await supabase.from('feed_items').delete().eq('id', id);
    if (error) throw error;
};

export const getFeedComments = async (feedItemId: string): Promise<FeedComment[]> => {
    // user_uid in feed_comments refs auth.users, so direct join to public.users might not be automatic
    // We fetch comments first, then fetch user details manually or assume public.users has same uid.
    const { data: comments, error } = await supabase
        .from('feed_comments')
        .select('*')
        .eq('feed_item_id', feedItemId)
        .order('created_at', { ascending: true });
    
    if (error) throw error;

    // Fetch user details for these comments from public.users
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
    // Fetch user details locally for optimistic update
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
    const { data: columns, error: colError } = await supabase.from('project_columns').select('*').order('column_order');
    const { data: tasks, error: taskError } = await supabase.from('project_tasks').select('*').order('created_at', { ascending: true });
    
    if (colError || taskError) return null;

    const projectData: ProjectData = {
        tasks: {},
        columns: {},
        columnOrder: []
    };

    tasks.forEach((t: any) => {
        projectData.tasks[t.id] = {
            id: String(t.id),
            content: t.content,
            columnId: String(t.column_id),
            assigneeId: t.assignee_uid, // Use assignee_uid (single)
            isCompleted: t.is_completed,
            priority: t.priority,
            dueDate: t.due_date,
            tags: t.tags || []
        };
    });

    columns.forEach((c: any) => {
        // Filter tasks that belong to this column
        const colTasks = tasks.filter((t: any) => String(t.column_id) === String(c.id));
        const taskIds = colTasks.map((t: any) => String(t.id));

        projectData.columns[c.id] = {
            id: String(c.id),
            title: c.title,
            taskIds: taskIds 
        };
        projectData.columnOrder.push(String(c.id));
    });

    return projectData;
};

export const addProjectTask = async (taskData: { content: string, priority: TaskPriority, dueDate?: string, tags: string[] }, userId: string, columnId: string) => {
    const { error } = await supabase.from('project_tasks').insert({
        content: taskData.content,
        priority: taskData.priority,
        due_date: taskData.dueDate,
        tags: taskData.tags,
        column_id: columnId,
        assignee_uid: null,
        is_completed: false
    });
    
    if (error) throw error;
};

export const updateProjectTask = async (taskId: string, data: Partial<ProjectTask>) => {
    const updates: any = {};
    if (data.content) updates.content = data.content;
    if (data.priority) updates.priority = data.priority;
    if (data.dueDate) updates.due_date = data.dueDate;
    if (data.tags) updates.tags = data.tags;
    if (data.isCompleted !== undefined) updates.is_completed = data.isCompleted;
    if (data.assigneeId !== undefined) updates.assignee_uid = data.assigneeId; // Map assigneeId to assignee_uid

    const { error } = await supabase.from('project_tasks').update(updates).eq('id', taskId);
    if (error) throw error;
};

export const deleteProjectTask = async (taskId: string, columnId: string) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) throw error;
};

export const moveProjectTask = async (taskId: string, destinationColumnId: string) => {
    const { error } = await supabase.from('project_tasks').update({ column_id: destinationColumnId }).eq('id', taskId);
    if (error) throw error;
};

export const updateTaskAssignee = async (taskId: string, assigneeId: string | null) => {
    const { error } = await supabase.from('project_tasks').update({ assignee_uid: assigneeId }).eq('id', taskId);
    if (error) throw error;
};

export const toggleProjectTaskCompletion = async (taskId: string, isCompleted: boolean, userId: string) => {
    const { error } = await supabase.from('project_tasks').update({ is_completed: isCompleted }).eq('id', taskId);
    if (error) throw error;
};

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
        topic: r.topic,
        url: r.url,
        filePath: r.file_path,
        uploaderUid: r.uploader_uid,
    }));
};

export const uploadResourceFile = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('resource_files').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('resource_files').getPublicUrl(filePath);
    return { url: data.publicUrl, path: filePath };
};

export const addResource = async (resource: {
    title: string;
    description: string;
    category: ResourceCategory;
    type: ResourceType;
    url?: string;
    filePath?: string;
    uploaderUid: string;
    topic?: string | null;
}) => {
    const { error } = await supabase.from('resources').insert({
        title: resource.title,
        description: resource.description,
        category: resource.category,
        type: resource.type,
        url: resource.url,
        file_path: resource.filePath,
        uploader_uid: resource.uploaderUid,
        topic: resource.topic
    });
    if (error) throw error;
};

export const deleteResource = async (resource: Resource) => {
    if (resource.filePath) {
        await supabase.storage.from('resource_files').remove([resource.filePath]);
    }
    const { error } = await supabase.from('resources').delete().eq('id', resource.id);
    if (error) throw error;
};

// --- Notifications ---

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    // Using 'user_uid' as per schema patterns
    const { data, error } = await supabase.from('notifications').select('*').eq('user_uid', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((n: any) => ({
        id: n.id,
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
    // Use metadata containment check for participants, as there is no participant_ids column in the provided schema
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .contains('metadata', { participants: [userId] });

    if (error) throw error;
    return data.map((r: any) => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        // Extract participants from metadata
        participantIds: r.metadata?.participants || [],
        createdBy: r.created_by,
    }));
};

export const createRoom = async (title: string | null, participantIds: string[]): Promise<string> => {
    const { data, error } = await supabase.from('rooms').insert({
        title,
        // Store participants in metadata JSONB
        metadata: { participants: participantIds },
        created_by: participantIds[0] // Assuming first user is creator, schema has created_by column
    }).select().single();
    if (error) throw error;
    return data.id;
};

export const updateRoomTitle = async (roomId: string, newTitle: string) => {
    const { error } = await supabase.from('rooms').update({ title: newTitle }).eq('id', roomId);
    if (error) throw error;
};

export const deleteRoom = async (roomId: string) => {
    await supabase.from('messages').delete().eq('room_id', roomId);
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) throw error;
};

export const addRoomMembers = async (roomId: string, userIds: string[]) => {
    const { data: room } = await supabase.from('rooms').select('metadata').eq('id', roomId).single();
    if (room) {
        const currentParticipants = room.metadata?.participants || [];
        const newParticipants = [...new Set([...currentParticipants, ...userIds])];
        await supabase.from('rooms').update({ 
            metadata: { ...room.metadata, participants: newParticipants } 
        }).eq('id', roomId);
    }
};

export const removeGroupMember = async (roomId: string, userId: string) => {
    const { data: room } = await supabase.from('rooms').select('metadata').eq('id', roomId).single();
    if (room) {
        const currentParticipants = room.metadata?.participants || [];
        const newParticipants = currentParticipants.filter((id: string) => id !== userId);
        await supabase.from('rooms').update({ 
            metadata: { ...room.metadata, participants: newParticipants } 
        }).eq('id', roomId);
    }
};

export const getRoomMessages = async (roomId: string): Promise<Message[]> => {
    const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
    if (error) throw error;
    return data.map((m: any) => ({
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        metadata: m.metadata
    }));
};

export const sendMessage = async (roomId: string, senderId: string, content: string, metadata?: any): Promise<Message> => {
    const { data, error } = await supabase.from('messages').insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        metadata
    }).select().single();
    
    if (error) throw error;
    
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

export const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
};

export const uploadChatFile = async (file: File, roomId: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${roomId}/${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('chat_files').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('chat_files').getPublicUrl(fileName);
    return data.publicUrl;
};

// --- Showcase ---

export const getShowcaseItems = async (): Promise<ShowcaseItem[]> => {
    const { data, error } = await supabase.from('showcase_items').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    return Promise.all(data.map(async (item: any) => {
        // Fetch user details from public.users table using user_uid
        // Use maybeSingle to prevent failure if user is missing
        const { data: user } = await supabase.from('users').select('name, avatar_url').eq('uid', item.user_uid).maybeSingle();
        
        return {
            id: item.id,
            createdAt: new Date(item.created_at).toLocaleDateString(),
            userUid: item.user_uid,
            userName: user?.name || 'Unknown Member',
            userAvatarUrl: user?.avatar_url,
            title: item.title,
            description: item.description,
            codeContent: item.code_content,
            likes: item.likes || []
        };
    }));
};

export const addShowcaseItem = async (userId: string, title: string, description: string, codeContent: string) => {
    // Schema: user_uid (uuid), title (text), description (text), code_content (text), likes (text[])
    const { error } = await supabase.from('showcase_items').insert({
        user_uid: userId,
        title,
        description,
        code_content: codeContent,
        likes: []
    });
    if (error) throw error;
};

export const toggleShowcaseLike = async (itemId: string, userId: string, currentLikes: string[]) => {
    let newLikes = currentLikes.includes(userId) 
        ? currentLikes.filter(id => id !== userId)
        : [...currentLikes, userId];
        
    const { error } = await supabase.from('showcase_items').update({ likes: newLikes }).eq('id', itemId);
    if (error) throw error;
};

// --- Suggestions ---

export const getSuggestions = async (): Promise<Suggestion[]> => {
    const { data, error } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    return Promise.all(data.map(async (s: any) => {
        let userName = 'Unknown';
        let userAvatarUrl = undefined;
        const userId = s.user_uid || s.user_id;
        
        if (userId) {
             // Use 'uid' to find user, matching the 'users' table schema
             const { data: u } = await supabase.from('users').select('name, avatar_url').eq('uid', userId).maybeSingle();
             if (u) {
                 userName = u.name;
                 userAvatarUrl = u.avatar_url;
             }
        }

        return {
            id: s.id,
            type: s.type,
            title: s.title,
            description: s.description,
            userId: userId,
            userName: userName,
            userAvatarUrl: userAvatarUrl,
            status: s.status,
            createdAt: new Date(s.created_at).toLocaleDateString(),
            upvotes: s.upvotes || []
        };
    }));
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

export const toggleSuggestionUpvote = async (suggestionId: string, userId: string, currentUpvotes: string[]) => {
    let newUpvotes = currentUpvotes.includes(userId)
        ? currentUpvotes.filter(id => id !== userId)
        : [...currentUpvotes, userId];
    
    const { error } = await supabase.from('suggestions').update({ upvotes: newUpvotes }).eq('id', suggestionId);
    if (error) throw error;
};

export const deleteSuggestion = async (suggestionId: string) => {
    const { error } = await supabase.from('suggestions').delete().eq('id', suggestionId);
    if (error) throw error;
};

export const updateSuggestionStatus = async (suggestionId: string, status: string, userId: string) => {
    const { error } = await supabase.from('suggestions').update({ status }).eq('id', suggestionId);
    if (error) throw error;
};

// --- Challenges ---

export const getChallenges = async (): Promise<Challenge[]> => {
    const { data, error } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        deadline: c.deadline,
        createdBy: c.created_by,
        createdAt: c.created_at,
        status: c.status
    }));
};

export const addChallenge = async (challenge: { title: string, description: string, deadline: string, createdBy: string }) => {
    const { error } = await supabase.from('challenges').insert({
        title: challenge.title,
        description: challenge.description,
        deadline: challenge.deadline,
        created_by: challenge.createdBy,
        status: 'ACTIVE'
    });
    if (error) throw error;
};

export const getSubmissions = async (challengeId: string): Promise<ChallengeSubmission[]> => {
    const { data, error } = await supabase.from('challenge_submissions').select('*').eq('challenge_id', challengeId);
    if (error) throw error;
    
    return Promise.all(data.map(async (s: any) => {
        let userName = 'Unknown';
        let userAvatarUrl = undefined;
        
        // Use user_uid as per schema
        if (s.user_uid) {
             // Use 'uid' to find user
             const { data: u } = await supabase.from('users').select('name, avatar_url').eq('uid', s.user_uid).maybeSingle();
             if (u) {
                 userName = u.name;
                 userAvatarUrl = u.avatar_url;
             }
        }
        return {
            id: s.id,
            challengeId: s.challenge_id,
            userId: s.user_uid, // mapped from user_uid
            userName,
            userAvatarUrl,
            content: s.content,
            status: s.status,
            submittedAt: s.created_at // mapped from created_at
        };
    }));
};

export const submitChallenge = async (challengeId: string, userId: string, content: string) => {
    // 1. Submit the challenge
    const { error } = await supabase.from('challenge_submissions').insert({
        challenge_id: challengeId,
        user_uid: userId,
        content,
        status: 'PENDING'
    });
    if (error) throw error;

    // 2. Notify Patrons
    try {
        // Get Challenge Title
        const { data: challenge } = await supabase.from('challenges').select('title').eq('id', challengeId).single();
        
        // Get User Name
        const { data: user } = await supabase.from('users').select('name').eq('uid', userId).single();

        // Get Patrons
        const { data: patrons } = await supabase.from('users').select('uid').eq('role', 'PATRON');

        if (challenge && user && patrons && patrons.length > 0) {
            const notifications = patrons.map((p: any) => ({
                user_uid: p.uid,
                message: `New submission for "${challenge.title}" by ${user.name}`,
                is_read: false,
                link_to: 'challenges',
                created_at: new Date().toISOString() // Optional if DB handles default
            }));

            await supabase.from('notifications').insert(notifications);
        }
    } catch (notifyError) {
        console.error("Failed to notify patrons:", notifyError);
        // Don't fail the submission if notification fails
    }
};

export const reviewSubmission = async (submissionId: string, status: string, challengeTitle: string, userId: string) => {
    const { error } = await supabase.from('challenge_submissions').update({ status }).eq('id', submissionId);
    if (error) throw error;

    if (status === 'APPROVED') {
        // Use 'uid' to find and update user
        const { data: user } = await supabase.from('users').select('badges').eq('uid', userId).single();
        if (user) {
            const badges = user.badges || [];
            if (!badges.includes(challengeTitle)) {
                await supabase.from('users').update({ badges: [...badges, challengeTitle] }).eq('uid', userId);
            }
        }
    }
};

// --- User Scripts (Playground) ---

export const listUserScripts = async (userId: string) => {
    const { data, error } = await supabase.storage.from('user_scripts').list(userId);
    if (error) throw error;
    return data.map(f => ({
        name: f.name,
        id: f.id,
        lastModified: new Date(f.updated_at || f.created_at).toLocaleString(),
        size: f.metadata.size
    }));
};

export const saveUserScript = async (userId: string, name: string, content: string) => {
    const path = `${userId}/${name}`;
    const { error } = await supabase.storage.from('user_scripts').upload(path, content, { upsert: true });
    if (error) throw error;
};

export const downloadUserScript = async (userId: string, name: string) => {
    const path = `${userId}/${name}`;
    const { data, error } = await supabase.storage.from('user_scripts').download(path);
    if (error) throw error;
    return await data.text();
};

export const deleteUserScript = async (userId: string, name: string) => {
    const path = `${userId}/${name}`;
    const { error } = await supabase.storage.from('user_scripts').remove([path]);
    if (error) throw error;
};
