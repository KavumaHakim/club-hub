import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updatePassword
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { User, Activity, AttendanceRecord, FeedItem, ProjectData, ProjectTask } from '../types';

// --- AUTH API ---

export const login = async (email: string, password?: string): Promise<void> => {
  if (!password) throw new Error("Password is required.");
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists() || userDoc.data().status !== 'APPROVED') {
        await signOut(auth); // Sign out if profile doesn't exist or not approved
        throw new Error('Account not found or pending approval.');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to login.');
  }
};

export const logout = async (): Promise<void> => {
    await signOut(auth);
};

export const signUp = async (newUser: Omit<User, 'uid' | 'role' | 'status'> & { password: string }): Promise<void> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
        const { uid } = userCredential.user;
        
        // Create a user profile document in Firestore
        await setDoc(doc(db, 'users', uid), {
            uid,
            email: newUser.email,
            name: newUser.name,
            username: newUser.username,
            role: 'MEMBER',
            status: 'PENDING',
        });
    } catch (error: any) {
        throw new Error(error.message || 'Failed to sign up.');
    }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        return userDoc.data() as User;
    }
    return null;
};


// --- USERS API ---

export const getUsers = async (): Promise<User[]> => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => doc.data() as User);
};

export const updateUser = async (uid: string, updates: Partial<Pick<User, 'role' | 'status'>>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updates);
};

export const deleteUser = async (uid: string): Promise<void> => {
    // This is a complex operation. For a client-side app, we'll just delete the Firestore record.
    // In a real app, you'd use a Cloud Function to delete the user from Firebase Auth and handle cleanup.
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);

    // TODO: Also unassign from tasks. For now, we'll handle this on the client if needed.
};

export const changePassword = async (newPassword: string): Promise<void> => {
    if (!auth.currentUser) throw new Error("You must be logged in to change your password.");
    try {
        await updatePassword(auth.currentUser, newPassword);
    } catch(error: any) {
        // This often fails if the user hasn't logged in recently.
        // A real app would need a re-authentication flow.
        console.error("Password change error:", error);
        throw new Error("Failed to change password. You may need to log out and log back in.");
    }
};


// --- ACTIVITIES API ---

export const getActivities = async (): Promise<Activity[]> => {
    const q = query(collection(db, 'activities'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
};

export const addActivity = async (activityData: Omit<Activity, 'id'>): Promise<void> => {
    await addDoc(collection(db, 'activities'), {
        ...activityData,
        createdAt: serverTimestamp()
    });
};

// --- ATTENDANCE API ---

export const getAttendance = async (uid: string): Promise<AttendanceRecord[]> => {
    if (!uid) return [];
    const attendanceRef = collection(db, 'users', uid, 'attendance');
    const q = query(attendanceRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
};

export const addAttendance = async (uid: string, recordData: Omit<AttendanceRecord, 'id'>): Promise<void> => {
    if (!uid) throw new Error("User ID is required to add attendance.");
    const attendanceRef = collection(db, 'users', uid, 'attendance');
    await addDoc(attendanceRef, recordData);
};

// --- FEED API ---

export const getFeedItems = async (): Promise<FeedItem[]> => {
    const q = query(collection(db, 'feed'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, timestamp: doc.data().createdAt?.toDate().toLocaleDateString() || 'Just now', ...doc.data() } as FeedItem));
};

export const addFeedItem = async (itemData: Omit<FeedItem, 'id' | 'timestamp'>): Promise<void> => {
    await addDoc(collection(db, 'feed'), {
        ...itemData,
        createdAt: serverTimestamp()
    });
};


// --- PROJECTS API ---

export const getProjectData = async (): Promise<ProjectData> => {
    const docRef = doc(db, 'projects', 'board');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as ProjectData;
    } else {
        // If it doesn't exist, create an initial structure
        const initialData: ProjectData = {
            tasks: {},
            columns: {
                'column-1': { id: 'column-1', title: 'Backlog', taskIds: [] },
                'column-2': { id: 'column-2', title: 'In Progress', taskIds: [] },
                'column-3': { id: 'column-3', title: 'Done', taskIds: [] },
            },
            columnOrder: ['column-1', 'column-2', 'column-3'],
        };
        await setDoc(docRef, initialData);
        return initialData;
    }
};

export const updateProjectData = async (projectData: ProjectData): Promise<void> => {
    const docRef = doc(db, 'projects', 'board');
    await setDoc(docRef, projectData);
};

export const addProjectTask = async (content: string): Promise<void> => {
    const data = await getProjectData();
    const taskId = `task-${Date.now()}`;
    const newTask: ProjectTask = { id: taskId, content };

    data.tasks[taskId] = newTask;
    const backlogColumnId = data.columnOrder[0];
    if (backlogColumnId) {
        data.columns[backlogColumnId].taskIds.push(taskId);
    }
    
    await updateProjectData(data);
};