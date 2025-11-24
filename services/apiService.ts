
import { supabase } from './supabaseClient';
import { 
  User, Activity, AttendanceRecord, FeedItem, ProjectData, 
  ProjectTask, Resource, Notification, Room, Message, 
  ShowcaseItem, Suggestion, Challenge, ChallengeSubmission,
  FeedItemType, TaskPriority, SuggestionType, SuggestionStatus,
  ActivityCategory, ResourceType, ResourceCategory,
  ProjectColumn, FeedComment
} from '../types';

// --- Auth ---

export const login = async (email: string, password?: string) => {
  if (!password) throw new Error("Password required");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUp = async (userData: any) => {
  const { email, password, ...metadata } = userData;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...metadata,
        role: 'MEMBER',
        status: 'PENDING'
      }
    }
  });
  if (error) throw error;
  
  // Create profile entry in public.users table
  if (data.user) {
      await supabase.from('users').insert({
          uid: data.user.id,
          email: email,
          name: metadata.name,
          username: metadata.username,
          role: 'MEMBER',
          status: 'PENDING',
          phone_number: metadata.phoneNumber
      });
  }
  return data;
};

export const signUpAsPatron = async (userData: any) => {
    const { email, password, ...metadata } = userData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...metadata,
          role: 'PATRON',
          status: 'PENDING'
        }
      }
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('users').insert({
          uid: data.user.id,
          email: email,
          name: metadata.name,
          username: metadata.username,
          role: 'PATRON',
          status: 'PENDING',
          phone_number: metadata.phoneNumber
      });
  }
    return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
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

export const resetPasswordWithOtp = async (email: string, token: string, password: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
    if (error) throw error;
    await changePassword(password);
};

// --- Users ---

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', userId)
    .single();
  
  if (error) return null;
  
  return {
      uid: data.uid,
      email: data.email,
      name: data.name,
      username: data.username,
      role: data.role,
      status: data.status,
      avatarUrl: data.avatar_url,
      phoneNumber: data.phone_number,
      badges: data.badges || []
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
        badges: u.badges || []
    }));
};

export const updateUser = async (uid: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.username) dbUpdates.username = updates.username;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.phoneNumber) dbUpdates.phone_number = updates.phoneNumber;
    if (updates.badges) dbUpdates.badges = updates.badges;

    const { error } = await supabase.from('users').update(dbUpdates).eq('uid', uid);
    if (error) throw error;
};

export const deleteUser = async (uid: string) => {
    // Deleting from public.users table
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error) throw error;
};

// --- Feed ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    const { data, error } = await supabase
        .from('feed_items')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map((item: any) => ({
        id: item.id,
        type: item.type,
        author: item.author_name,
        authorAvatarUrl: item.author_avatar_url,
        timestamp: new Date(item.created_at).toLocaleString(),
        title: item.title,
        message: item.content,
        commentCount: item.comment_count
    }));
};

export const addFeedItem = async (item: { title: string, message: string, type: FeedItemType }, userId: string) => {
    const user = await getUserProfile(userId);
    if (!user) throw new Error("User not found");

    const { error } = await supabase.from('feed_items').insert({
        type: item.type,
        title: item.title,
        content: item.message,
        author_id: userId,
        author_name: user.name,
        author_avatar_url: user.avatarUrl
    });
    if (error) throw error;
};

export const deleteFeedItem = async (id: string) => {
    const { error } = await supabase.from('feed_items').delete().eq('id', id);
    if (error) throw error;
};

export const getFeedComments = async (feedId: string): Promise<FeedComment[]> => {
    const { data, error } = await supabase
        .from('feed_comments')
        .select('*')
        .eq('feed_item_id', feedId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map((c: any) => ({
        id: c.id,
        feedItemId: c.feed_item_id,
        userId: c.user_id,
        userName: c.user_name,
        userAvatarUrl: c.user_avatar_url,
        content: c.content,
        createdAt: new Date(c.created_at).toLocaleString()
    }));
};

export const addFeedComment = async (feedId: string, userId: string, content: string): Promise<FeedComment> => {
    const user = await getUserProfile(userId);
    if (!user) throw new Error("User not found");

    const { data, error } = await supabase.from('feed_comments').insert({
        feed_item_id: feedId,
        user_id: userId,
        user_name: user.name,
        user_avatar_url: user.avatarUrl,
        content: content
    }).select().single();
    
    if (error) throw error;
    return {
        id: data.id,
        feedItemId: data.feed_item_id,
        userId: data.user_id,
        userName: data.user_name,
        userAvatarUrl: data.user_avatar_url,
        content: data.content,
        createdAt: new Date(data.created_at).toLocaleString()
    };
};

// --- Activities ---

export const getActivities = async (): Promise<Activity[]> => {
    const { data, error } = await supabase.from('activities').select('*');
    if (error) throw error;
    return data.map((a: any) => ({
        id: a.id,
        title: a.title,
        date: a.date,
        description: a.description,
        location: a.location,
        category: a.category,
        rsvpUserIds: a.rsvp_user_ids || []
    }));
};

export const addActivity = async (activity: Omit<Activity, 'id' | 'rsvpUserIds'>) => {
    const { error } = await supabase.from('activities').insert({
        ...activity,
        rsvp_user_ids: []
    });
    if (error) throw error;
};

export const toggleRSVP = async (activityId: string, userId: string, isJoining: boolean) => {
    const { data: current, error: fetchError } = await supabase
        .from('activities')
        .select('rsvp_user_ids')
        .eq('id', activityId)
        .single();
    
    if (fetchError) throw fetchError;
    
    let rsvps = current.rsvp_user_ids || [];
    if (isJoining) {
        if (!rsvps.includes(userId)) rsvps.push(userId);
    } else {
        rsvps = rsvps.filter((id: string) => id !== userId);
    }

    const { error } = await supabase
        .from('activities')
        .update({ rsvp_user_ids: rsvps })
        .eq('id', activityId);
    
    if (error) throw error;
};

// --- Attendance ---

export const getAttendance = async (userId: string): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_uid', userId); // Ensure user_uid is used
    if (error) throw error;
    return data.map((a: any) => ({
        id: a.id,
        activityId: a.activity_id,
        activityTitle: a.activity_title,
        date: a.date,
        status: a.status,
        userId: a.user_uid
    }));
};

export const addAttendance = async (userId: string, record: Omit<AttendanceRecord, 'id' | 'userId'>) => {
    const { error } = await supabase.from('attendance').insert({
        user_uid: userId, 
        activity_id: record.activityId,
        activity_title: record.activityTitle,
        date: record.date,
        status: record.status
    });
    if (error) throw error;
};

export const markAttendanceOnLogin = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('date', today);
    
    if (activities && activities.length > 0) {
        for (const activity of activities) {
            const { data: existing } = await supabase
                .from('attendance')
                .select('*')
                .eq('user_uid', userId)
                .eq('activity_id', activity.id)
                .single();
            
            if (!existing) {
                await addAttendance(userId, {
                    activityId: activity.id,
                    activityTitle: activity.title,
                    date: today,
                    status: 'Present'
                });
            }
        }
    }
};

// --- Projects ---

export const getProjectData = async (): Promise<ProjectData> => {
    // Use 'position' instead of 'order_index' based on error logs
    const { data: columnsData, error: colError } = await supabase.from('project_columns').select('*').order('position');
    const { data: tasksData, error: taskError } = await supabase.from('project_tasks').select('*');
    
    if (colError) {
        console.error("Error fetching project columns:", colError);
        throw new Error(`Failed to fetch columns: ${colError.message}`);
    }
    if (taskError) {
        console.error("Error fetching project tasks:", taskError);
        throw new Error(`Failed to fetch tasks: ${taskError.message}`);
    }

    const tasks: { [key: string]: ProjectTask } = {};
    const columns: { [key: string]: ProjectColumn } = {};
    const columnOrder: string[] = columnsData.map((c: any) => c.id);

    tasksData.forEach((t: any) => {
        tasks[t.id] = {
            id: t.id,
            content: t.content,
            assigneeIds: t.assignee_ids || [],
            isCompleted: t.is_completed,
            priority: t.priority,
            dueDate: t.due_date,
            tags: t.tags || []
        };
    });

    columnsData.forEach((c: any) => {
        columns[c.id] = {
            id: c.id,
            title: c.title,
            taskIds: tasksData.filter((t: any) => t.column_id === c.id).map((t: any) => t.id)
        };
    });

    return { tasks, columns, columnOrder };
};

export const addProjectTask = async (task: { content: string, priority: TaskPriority, dueDate?: string, tags: string[] }, userId: string) => {
    // Use 'position' instead of 'order_index'
    const { data: columns } = await supabase.from('project_columns').select('id').order('position').limit(1);
    if (!columns || columns.length === 0) throw new Error("No columns defined");
    
    const columnId = columns[0].id;

    const { error } = await supabase.from('project_tasks').insert({
        content: task.content,
        priority: task.priority,
        due_date: task.dueDate,
        tags: task.tags,
        column_id: columnId,
        created_by: userId,
        assignee_ids: []
    });
    if (error) throw error;
};

export const updateProjectTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    const dbUpdates: any = {};
    if (updates.content) dbUpdates.content = updates.content;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.tags) dbUpdates.tags = updates.tags;
    if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
    
    const { error } = await supabase.from('project_tasks').update(dbUpdates).eq('id', taskId);
    if (error) throw error;
};

export const moveProjectTask = async (taskId: string, newColumnId: string) => {
    const { error } = await supabase.from('project_tasks').update({ column_id: newColumnId }).eq('id', taskId);
    if (error) throw error;
};

export const deleteProjectTask = async (taskId: string, columnId: string) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) throw error;
};

export const updateTaskAssignees = async (taskId: string, assigneeIds: string[]) => {
    const { error } = await supabase.from('project_tasks').update({ assignee_ids: assigneeIds }).eq('id', taskId);
    if (error) throw error;
};

export const toggleProjectTaskCompletion = async (taskId: string, isCompleted: boolean, userId: string) => {
    const { error } = await supabase.from('project_tasks').update({ is_completed: isCompleted }).eq('id', taskId);
    if (error) throw error;
};

// --- Resources ---

export const getResources = async (): Promise<Resource[]> => {
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
        uploaderName: '', 
        uploaderAvatarUrl: ''
    }));
};

export const addResource = async (resource: Omit<Resource, 'id' | 'createdAt' | 'uploaderName' | 'uploaderAvatarUrl'>) => {
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
    if (error) throw error;
};

export const deleteResource = async (resource: Resource) => {
    const { error } = await supabase.from('resources').delete().eq('id', resource.id);
    if (error) throw error;
    
    if (resource.filePath) {
        await supabase.storage.from('resource_files').remove([resource.filePath]);
    }
};

export const uploadResourceFile = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
        .from('resource_files')
        .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from('resource_files').getPublicUrl(fileName);
    return { url: urlData.publicUrl, path: fileName };
};

// --- Chat ---

export const getRooms = async (userId: string): Promise<Room[]> => {
    // Use 'participant_uids' instead of 'members' based on naming conventions
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .contains('participant_uids', [userId]) 
        .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map((r: any) => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        participantIds: r.participant_uids, 
        createdBy: r.created_by,
    }));
};

export const createRoom = async (title: string | null, participantIds: string[]): Promise<string> => {
    const { data, error } = await supabase.from('rooms').insert({
        title,
        participant_uids: participantIds, // Changed from members/participants
        created_by: participantIds[0]
    }).select().single();
    if (error) throw error;
    return data.id;
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
    const { data: room } = await supabase.from('rooms').select('participant_uids').eq('id', roomId).single();
    const updatedParticipants = [...(room?.participant_uids || []), ...newMemberIds];
    const uniqueParticipants = Array.from(new Set(updatedParticipants));
    
    const { error } = await supabase.from('rooms').update({ participant_uids: uniqueParticipants }).eq('id', roomId);
    if (error) throw error;
};

export const removeGroupMember = async (roomId: string, userId: string) => {
    const { data: room } = await supabase.from('rooms').select('participant_uids').eq('id', roomId).single();
    const updatedParticipants = (room?.participant_uids || []).filter((id: string) => id !== userId);
    
    const { error } = await supabase.from('rooms').update({ participant_uids: updatedParticipants }).eq('id', roomId);
    if (error) throw error;
};

export const getRoomMessages = async (roomId: string): Promise<Message[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
    
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
    const fileName = `chat/${roomId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('chat_files').upload(fileName, file);
    if (error) throw error;
    
    const { data } = supabase.storage.from('chat_files').getPublicUrl(fileName);
    return data.publicUrl;
};

// --- Notifications ---

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_uid', userId)
        .order('created_at', { ascending: false });
    
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

export const markNotificationAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_uid', userId);
    if (error) throw error;
};

export const notifyAllUsers = async (message: string, linkTo?: string, excludeUserId?: string) => {
    const { data: users } = await supabase.from('users').select('uid');
    if (!users) return;

    const notifications = users
        .filter((u: any) => u.uid !== excludeUserId)
        .map((u: any) => ({
            user_uid: u.uid,
            message,
            link_to: linkTo,
            is_read: false
        }));
    
    if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
    }
};

// --- Showcase ---

export const getShowcaseItems = async (): Promise<ShowcaseItem[]> => {
    const { data, error } = await supabase
        .from('showcase_items') // Correct table name
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map((item: any) => ({
        id: item.id,
        createdAt: new Date(item.created_at).toLocaleDateString(),
        userUid: item.user_uid,
        userName: item.user_name,
        userAvatarUrl: item.user_avatar_url,
        title: item.title,
        description: item.description,
        codeContent: item.code_content,
        likes: item.likes || []
    }));
};

export const addShowcaseItem = async (userId: string, title: string, description: string, codeContent: string) => {
    const user = await getUserProfile(userId);
    if (!user) throw new Error("User not found");

    const { error } = await supabase.from('showcase_items').insert({ // Correct table name
        user_uid: userId,
        user_name: user.name,
        user_avatar_url: user.avatarUrl,
        title,
        description,
        code_content: codeContent,
        likes: []
    });
    if (error) throw error;
};

export const toggleShowcaseLike = async (itemId: string, userId: string, currentLikes: string[]) => {
    const newLikes = currentLikes.includes(userId) 
        ? currentLikes.filter(id => id !== userId)
        : [...currentLikes, userId];
    
    const { error } = await supabase.from('showcase_items').update({ likes: newLikes }).eq('id', itemId);
    if (error) throw error;
};

// --- Playground Scripts ---

export const listUserScripts = async (userId: string) => {
    const { data, error } = await supabase.storage.from('user_scripts').list(userId);
    if (error) throw error;
    
    return data.map(file => ({
        name: file.name,
        id: file.id,
        lastModified: new Date(file.updated_at || file.created_at).toLocaleString(),
        size: file.metadata?.size || 0
    }));
};

export const saveUserScript = async (userId: string, fileName: string, content: string) => {
    if (!fileName.endsWith('.py')) fileName += '.py';
    
    const { error } = await supabase.storage
        .from('user_scripts')
        .upload(`${userId}/${fileName}`, content, {
            contentType: 'text/x-python',
            upsert: true
        });
    if (error) throw error;
};

export const downloadUserScript = async (userId: string, fileName: string) => {
    const { data, error } = await supabase.storage
        .from('user_scripts')
        .download(`${userId}/${fileName}`);
    
    if (error) throw error;
    return await data.text();
};

export const deleteUserScript = async (userId: string, fileName: string) => {
    const { error } = await supabase.storage
        .from('user_scripts')
        .remove([`${userId}/${fileName}`]);
    if (error) throw error;
};

// --- Suggestions ---

export const getSuggestions = async (): Promise<Suggestion[]> => {
    const { data, error } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((s: any) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        description: s.description,
        userId: s.user_id,
        userName: s.user_name,
        userAvatarUrl: s.user_avatar_url,
        status: s.status,
        createdAt: s.created_at,
        upvotes: s.upvotes || []
    }));
};

export const addSuggestion = async (suggestion: { type: SuggestionType, title: string, description: string, userId: string }) => {
    const user = await getUserProfile(suggestion.userId);
    if (!user) throw new Error("User not found");

    const { error } = await supabase.from('suggestions').insert({
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        user_id: suggestion.userId,
        user_name: user.name,
        user_avatar_url: user.avatarUrl,
        status: 'PENDING',
        upvotes: []
    });
    if (error) throw error;
};

export const toggleSuggestionUpvote = async (id: string, userId: string, currentUpvotes: string[]) => {
    const newUpvotes = currentUpvotes.includes(userId)
        ? currentUpvotes.filter(uid => uid !== userId)
        : [...currentUpvotes, userId];
    
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
    const { data, error } = await supabase.from('challenges').select('*').order('deadline', { ascending: true });
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
        ...challenge,
        status: 'ACTIVE'
    });
    if (error) throw error;
};

export const submitChallenge = async (challengeId: string, userId: string, content: string) => {
    const user = await getUserProfile(userId);
    if (!user) throw new Error("User not found");

    const { error } = await supabase.from('challenge_submissions').insert({
        challenge_id: challengeId,
        user_id: userId,
        user_name: user.name,
        user_avatar_url: user.avatarUrl,
        content,
        status: 'PENDING'
    });
    if (error) throw error;
};

export const getSubmissions = async (challengeId: string): Promise<ChallengeSubmission[]> => {
    const { data, error } = await supabase.from('challenge_submissions').select('*').eq('challenge_id', challengeId);
    if (error) throw error;
    return data.map((s: any) => ({
        id: s.id,
        challengeId: s.challenge_id,
        userId: s.user_id,
        userName: s.user_name,
        userAvatarUrl: s.user_avatar_url,
        content: s.content,
        status: s.status,
        submittedAt: s.created_at
    }));
};

export const reviewSubmission = async (submissionId: string, status: 'APPROVED' | 'REJECTED', challengeTitle: string, userId: string) => {
    const { error } = await supabase.from('challenge_submissions').update({ status }).eq('id', submissionId);
    if (error) throw error;

    if (status === 'APPROVED') {
        // Award badge
        const user = await getUserProfile(userId);
        if (user) {
            const currentBadges = user.badges || [];
            if (!currentBadges.includes(challengeTitle)) {
                await updateUser(userId, { badges: [...currentBadges, challengeTitle] });
                
                // Send email notification via Brevo
                if (process.env.BREVO_API_KEY && user.email) {
                    try {
                        await fetch("https://api.brevo.com/v3/smtp/email", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "api-key": process.env.BREVO_API_KEY,
                            },
                            body: JSON.stringify({
                                sender: { name: "Club Hub", email: "noreply@clubhub.com" },
                                to: [{ email: user.email }],
                                subject: `🎉 You've earned a badge!`,
                                htmlContent: `<p>Hi ${user.username},</p>
                                              <p>You've earned the <strong>${challengeTitle}</strong> badge for completing the challenge.</p>`
                            }),
                        });
                    } catch (emailError) {
                        console.error("Failed to send badge email notification:", emailError);
                    }
                }
            }
        }
    }
};

export const approveMember = async (uid: string): Promise<void> => {
    await updateUser(uid, { status: 'APPROVED' });
    await notifyAllUsers("A new member has joined the club! 🎉", "members", uid);

    const user = await getUserProfile(uid);
    if (user && user.email && process.env.BREVO_API_KEY) {
        try {
            await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                },
                body: JSON.stringify({
                    sender: { name: "ICT Club Hub", email: "noreply@clubhub.com" },
                    to: [{ email: user.email }],
                    subject: `🎉 Your account has been approved!`,
                    htmlContent: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #ec4899;">Welcome to ICT Club Hub!</h2>
                            <p>Hi <strong>${user.name}</strong>,</p>
                            <p>Great news! Your account has been approved by a patron.</p>
                            <p>You can now log in and access all features of the club.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${typeof window !== 'undefined' ? window.location.origin : '#'}" style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In Now</a>
                            </div>
                        </div>
                    `
                }),
            });
        } catch (emailError) {
            console.error("Failed to send approval email notification:", emailError);
        }
    }
};
