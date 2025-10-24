import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import * as api from './services/apiService';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';


type View = 'welcome' | 'login' | 'signup' | 'dashboard';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('welcome');
  const [theme, setTheme] = useState<Theme>('light');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Use Firebase's auth state listener for persistent sessions
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch the user's profile from Firestore
          const userProfile = await api.getUserProfile(firebaseUser.uid);
          if (userProfile && userProfile.status === 'APPROVED') {
            setUser(userProfile);
            setView('dashboard');
          } else {
            // User exists in Auth but not in DB or is pending
            await api.logout();
            setUser(null);
            setView('login');
             // Optionally show a message: "Your account is pending approval."
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          await api.logout();
          setUser(null);
        }
      } else {
        setUser(null);
        if (view === 'dashboard') { // Only navigate to welcome if they were logged in
             setView('welcome');
        }
      }
      setIsInitializing(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [view]);

  const handleLogin = useCallback(async (email: string, password?: string) => {
    await api.login(email, password);
    // onAuthStateChanged will handle setting the user and view
  }, []);

  const handleLogout = useCallback(async () => {
    await api.logout();
    // onAuthStateChanged will handle cleanup
  }, []);

  const handleSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status'> & {password: string}) => {
    await api.signUp(newUser);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const appClasses = useMemo(() => {
    const classList = ['min-h-screen', 'font-sans', 'transition-colors', 'duration-300'];
    if (theme === 'light') {
      classList.push('bg-gray-50', 'text-gray-800');
    } else {
      classList.push('bg-gray-900', 'text-gray-200', 'dark');
    }
    return classList.join(' ');
  }, [theme]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="text-2xl font-bold text-gray-500">Loading Club Hub...</div>
      </div>
    );
  }

  const renderContent = () => {
    if (view === 'dashboard' && user) {
      return (
        <>
          <Header user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
          <main className="p-4 sm:p-6 lg:p-8">
            <Dashboard currentUser={user} />
          </main>
        </>
      );
    }
    if (view === 'signup') {
      return <SignUp onSignUp={handleSignUp} onNavigateToLogin={() => setView('login')} />;
    }
    if (view === 'login') {
      return <Login onLogin={handleLogin} onNavigateToSignUp={() => setView('signup')} />;
    }
    return <Welcome onNavigateToLogin={() => setView('login')} />;
  };

  return (
    <div className={appClasses}>
      {renderContent()}
    </div>
  );
};

export default App;