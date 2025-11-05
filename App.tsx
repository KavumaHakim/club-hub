import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import PatronLogin from './components/PatronLogin';
import PatronSignUp from './components/PatronSignUp';
import * as api from './services/apiService';
import { supabase } from './services/supabaseClient';

type View = 'welcome' | 'login' | 'signup' | 'dashboard' | 'patronLogin' | 'patronSignUp';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('welcome');
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user;
        if (currentUser) {
            const userProfile = await api.getUserProfile(currentUser.id);
            if (userProfile && userProfile.status === 'APPROVED') {
                setUser(userProfile);
                setView('dashboard');
            } else {
                // If user has no profile or is not approved, ensure they are logged out.
                await api.logout();
                setUser(null);
                setView('welcome');
            }
        } else {
            setUser(null);
            setView('welcome');
        }
        setIsLoading(false);
      }
    );

    // Cleanup the listener on component unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async (email: string, password?: string) => {
    try {
        // The onAuthStateChange listener will handle setting the user and view on success.
        // This function's primary role is now to initiate the login and handle errors.
        const loggedInUser = await api.login(email, password);
        if (loggedInUser.status !== 'APPROVED') {
            await api.logout(); // Ensure session is cleared if pending approval
            throw new Error('Your account is pending approval.');
        }
    } catch (error: any) {
        console.error("Login failed:", error);
        // Re-throw the error so the Login component can catch it and display a message
        throw error;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    // The onAuthStateChange listener will handle setting the state on logout.
    await api.logout();
  }, []);

  const handleSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
    await api.signUp(newUser);
    // After sign-up, the user is shown a message in the SignUp component.
    // They will need to be approved before they can log in.
  }, []);

  const handlePatronSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
    await api.signUpAsPatron(newUser);
  }, []);
  
  const handleUpdateUserProfile = useCallback((updatedUser: User) => {
    setUser(updatedUser);
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

  if (isLoading) {
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
            <Dashboard currentUser={user} onUpdateUserProfile={handleUpdateUserProfile} />
          </main>
        </>
      );
    }
    if (view === 'signup') {
      return <SignUp onSignUp={handleSignUp} onNavigateToLogin={() => setView('login')} />;
    }
    if (view === 'login') {
      return <Login onLogin={handleLogin} onNavigateToSignUp={() => setView('signup')} onNavigateToPatronLogin={() => setView('patronLogin')} />;
    }
    if (view === 'patronLogin') {
      return <PatronLogin onLogin={handleLogin} onNavigateToLogin={() => setView('login')} onNavigateToSignUp={() => setView('patronSignUp')} />;
    }
    if (view === 'patronSignUp') {
        return <PatronSignUp onSignUp={handlePatronSignUp} onNavigateToLogin={() => setView('patronLogin')} />;
    }
    return <Welcome onNavigateToLogin={() => setView('login')} onNavigateToPatronLogin={() => setView('patronLogin')} />;
  };

  return (
    <div className={appClasses}>
      {renderContent()}
    </div>
  );
};

export default App;