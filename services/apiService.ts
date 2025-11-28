
import { supabase } from './supabaseClient';
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask, Resource, AppNotification, Room, Message, ShowcaseItem, Suggestion, Challenge, ChallengeSubmission, FeedComment, SuggestionType, SuggestionStatus, SubmissionStatus, ActivityCategory, FeedItemType, TaskPriority, ResourceCategory, ResourceType, Tab, Roadmap, RoadmapProgress } from '../types';

// --- Auth & User ---

export const login = async (email: string, password?: string) => {
  if (!password) throw new Error("Password is required for login");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  // Suppress "Auth session missing!" error as it implies we are already logged out
  if (error && error.message !== 'Auth session missing!') throw error;
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
      skillLevel: data.skill_level,
      badges: data.badges,
      lastLogin: data.last_login
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
        skillLevel: u.skill_level,
        badges: u.badges,
        lastLogin: u.last_login
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
    if (data.skillLevel) updates.skill_level = data.skillLevel;
    if (data.badges) updates.badges = data.badges;
    if (data.lastLogin) updates.last_login = data.lastLogin;

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

export const updateUserSkillLevel = async (userId: string, newLevel: string) => {
    const { error } = await supabase.from('users').update({ skill_level: newLevel }).eq('uid', userId);
    if (error) throw error;
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

        // Try to select assignments, handle missing grade/submission columns
        const { data: assignments, error: assignError } = await supabase.from('project_task_assignees').select('*');
        
        if (assignError) {
             // If table missing, return minimal struct
             if (assignError.code === '42P01') {
                 console.warn("Project tasks table missing");
                 return null;
             }
             throw assignError;
        }

        const assignmentsMap = new Map<string, string[]>();
        const submissionsMap = new Map<string, { [userId: string]: { filePath: string; submittedAt: string, grade?: number | null } }>();

        if (assignments) {
            assignments.forEach(a => {
                const taskIdStr = String(a.task_id);
                if (!assignmentsMap.has(taskIdStr)) {
                    assignmentsMap.set(taskIdStr, []);
                }
                assignmentsMap.get(taskIdStr)!.push(a.user_uid);

                // Check if new columns exist in the returned data object
                if (a.submission_file_path && a.submitted_at) {
                    if (!submissionsMap.has(taskIdStr)) {
                        submissionsMap.set(taskIdStr, {});
                    }
                    submissionsMap.get(taskIdStr)![a.user_uid] = {
                        filePath: a.submission_file_path,
                        submittedAt: a.submitted_at,
                        grade: a.grade // might be undefined if column doesn't exist
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
                column_id: String(t.column_id),
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
        console.error("Error fetching project data:", e);
        return null; // Fail gracefully
    }
};

export const gradeSubmission = async (taskId: string, userId: string, grade: number) => {
    const { error } = await supabase
        .from('project_task_assignees')
        .update({ grade: grade })
        .match({ task_id: taskId, user_uid: userId });

    if (error) {
        if (error.code === 'PGRST204' || error.code === '42703') {
             throw new Error("Database schema outdated. Please run the 'Project Submissions Schema' SQL from README.md.");
        }
        throw error;
    }
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
        
        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }
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

            if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications);
            }
        } catch (notifError) {
            console.error("Failed to send assignment notifications:", notifError);
        }
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

                if (notifications.length > 0) {
                    await supabase.from('notifications').insert(notifications);
                }
            }
        } catch (notifError) {
            console.error("Failed to send task completion notification:", notifError);
        }
    }
};

export const uploadTaskSubmission = async (taskId: string, file: File, userId: string) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `submissions/${taskId}/${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('resource_uploads')
    .upload(filePath, file);

  if (uploadError) {
      if (uploadError.message.includes("row-level security")) {
          throw new Error("Storage not configured. Please run the SQL commands in README.md");
      }
      throw uploadError;
  }

  const { error: updateError } = await supabase
    .from('project_task_assignees')
    .update({ submission_file_path: filePath, submitted_at: new Date().toISOString() })
    .match({ task_id: taskId, user_uid: userId });

  if (updateError) {
    // If update fails, clean up the uploaded file
    await supabase.storage.from('resource_uploads').remove([filePath]);
    
    if (updateError.code === 'PGRST204' || updateError.code === '42703') {
         throw new Error("Database schema outdated. Please run the 'Project Submissions Schema' SQL from README.md.");
    }
    throw updateError;
  }

  return filePath;
};

export const deleteTaskSubmission = async (taskId: string, userId: string, filePath: string) => {
  const { error: deleteError } = await supabase.storage
    .from('resource_uploads')
    .remove([filePath]);

  if (deleteError) {
      console.warn("Failed to delete file from storage, but proceeding to clear DB reference.", deleteError);
  }

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
    // Rooms where user is a participant.
    // Participants are stored in 'metadata->participants' JSONB array.
    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .contains('metadata', { participants: [userId] })
            .order('updated_at', { ascending: false });

        if (error) {
            // Handle missing table or column
            if (error.code === '42P01' || error.code === '42703') {
                console.warn("Rooms table or column missing:", error.message);
                return [];
            }
            throw error;
        }

        return (data || []).map((r: any) => ({
            id: String(r.id),
            title: r.title,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            participantIds: r.metadata?.participants || [],
            createdBy: r.created_by
        }));
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return [];
    }
};

export const createRoom = async (title: string | null, participantIds: string[]): Promise<string> => {
    // Store participantIds in metadata JSONB column
    const { data, error } = await supabase.from('rooms').insert({
        title: title,
        metadata: { participants: participantIds },
        created_by: participantIds[0] // Assuming first is creator or passed in logic
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

        if (error) {
             if (error.code === '42P01') return [];
             throw error;
        }

        return (data || []).map((m: any) => ({
            id: String(m.id),
            roomId: String(m.room_id),
            senderId: m.sender_id,
            content: m.content || "", // Safely default to empty string if DB content is null
            createdAt: m.created_at,
            metadata: m.metadata
        }));
    } catch (error) {
        console.error("Error fetching messages:", error);
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

    // Update room updated_at
    await supabase.from('rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId);

    return {
        id: String(data.id),
        roomId: String(data.room_id),
        sender_id: data.sender_id,
        content: data.content || "",
        createdAt: data.created_at,
        metadata: data.metadata
    } as unknown as Message; // Casting due to potential field mismatch if any
};

export const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
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
            .from('showcase_items') // Updated to match user table definition
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // Handle missing table
            if (error.code === '42P01' || error.code === 'PGRST205') {
                console.warn("Showcase table missing.");
                return [];
            }
            throw error;
        }

        // Manual join for users to handle auth.users reference cleanly
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
                createdAt: new Date(item.created_at).toLocaleDateString(),
                userUid: item.user_uid,
                userName: user?.name || 'Unknown',
                userAvatarUrl: user?.avatar_url,
                title: item.title,
                description: item.description,
                codeContent: item.code_content,
                likes: item.likes || [] 
            };
        });
    } catch (error) {
        console.error("Error fetching showcase:", error);
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

// --- Suggestions ---

export const getSuggestions = async (): Promise<Suggestion[]> => {
    try {
        const { data, error } = await supabase
            .from('suggestions')
            .select(`
                *,
                users ( name, avatar_url )
            `)
            .order('created_at', { ascending: false });

        if (error) {
             if (error.code === '42P01' || error.code === 'PGRST205') return [];
             throw error;
        }

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
        if (error) {
            if (error.code === '42P01' || error.code === 'PGRST205') return [];
            throw error;
        }

        return (data || []).map((c: any) => ({
            id: String(c.id),
            title: c.title,
            description: c.description,
            deadline: c.deadline,
            createdBy: c.created_by,
            createdAt: c.created_at,
            status: c.status
        }));
    } catch (error) {
        return [];
    }
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

export const submitChallenge = async (challengeId: string, userId: string, content: string) => {
    const { error } = await supabase.from('challenge_submissions').insert({
        challenge_id: challengeId,
        user_uid: userId,
        content: content,
        status: 'PENDING'
    });
    if (error) throw error;
};

export const getSubmissions = async (challengeId: string): Promise<ChallengeSubmission[]> => {
    try {
        const { data, error } = await supabase
            .from('challenge_submissions')
            .select(`
                *,
                users ( name, avatar_url )
            `)
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
        // Award badge
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
        const { data, error } = await supabase.from('roadmaps').select('*');
        if (error) {
             if (error.code === '42P01') return [];
             throw error;
        }

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
        
        if (error) {
             if (error.code === '42P01') return null;
             throw error;
        }
        if (!data) return null;

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
    const { data: existing, error: fetchError } = await supabase
        .from('user_roadmap_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('roadmap_id', roadmapId)
        .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
        const indices = new Set(existing.completed_milestone_indices || []);
        indices.add(milestoneIndex);
        const { error } = await supabase
            .from('user_roadmap_progress')
            .update({ completed_milestone_indices: Array.from(indices) })
            .eq('id', existing.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('user_roadmap_progress').insert({
            user_id: userId,
            roadmap_id: roadmapId,
            completed_milestone_indices: [milestoneIndex]
        });
        if (error) throw error;
    }
};
