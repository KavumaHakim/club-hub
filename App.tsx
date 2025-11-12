import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import PatronLogin from './components/PatronLogin';
import PatronSignUp from './components/PatronSignUp';
import * as api from './services/apiService';
import { supabase } from './services/supabaseClient';
import { MenuIcon } from './components/icons/MenuIcon';
import { DataProvider } from './DataContext';

type View = 'welcome' | 'login' | 'signup' | 'dashboard' | 'patronLogin' | 'patronSignUp';
type Theme = 'light' | 'dark';
type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'chat' | 'profile' | 'members' | 'playground';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('welcome');
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
                setActiveTab('feed'); // Reset tab on login

                // Automatically mark attendance for today's activities on login
                try {
                    await api.markAttendanceOnLogin(userProfile.uid);
                } catch (attendanceError) {
                    console.warn("Could not mark attendance automatically:", attendanceError);
                    // This is a non-critical error, so we don't show it to the user.
                }

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
  
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prevState => !prevState);
  }, []);

  const appClasses = useMemo(() => {
    const classList = ['min-h-screen', 'font-sans', 'transition-colors', 'duration-300'];
    if (theme === 'light') {
      classList.push('bg-gray-100', 'text-gray-800');
    } else {
      classList.push('bg-gray-900', 'text-gray-200', 'dark');
    }
    return classList.join(' ');
  }, [theme]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 z-0 opacity-50 dark:opacity-30">
            <style>
            {`
                @keyframes float {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; border-radius: 20%; }
                50% { opacity: 0.5; border-radius: 50%; }
                100% { transform: translateY(-1000px) rotate(720deg); opacity: 0; border-radius: 20%; }
                }
                .shape {
                position: absolute;
                display: block;
                list-style: none;
                background: linear-gradient(to right, #EC4899, #8B5CF6);
                animation: float 25s linear infinite;
                bottom: -150px;
                }
                .shape:nth-child(1) { left: 25%; width: 80px; height: 80px; animation-delay: 0s; }
                .shape:nth-child(2) { left: 10%; width: 20px; height: 20px; animation-delay: 2s; animation-duration: 12s; }
                .shape:nth-child(3) { left: 70%; width: 20px; height: 20px; animation-delay: 4s; }
                .shape:nth-child(4) { left: 40%; width: 60px; height: 60px; animation-delay: 0s; animation-duration: 18s; }
                .shape:nth-child(5) { left: 65%; width: 20px; height: 20px; animation-delay: 0s; }
                .shape:nth-child(6) { left: 75%; width: 110px; height: 110px; animation-delay: 3s; }
                .shape:nth-child(7) { left: 35%; width: 150px; height: 150px; animation-delay: 7s; }
                .shape:nth-child(8) { left: 50%; width: 25px; height: 25px; animation-delay: 15s; animation-duration: 45s; }
                .shape:nth-child(9) { left: 20%; width: 15px; height: 15px; animation-delay: 2s; animation-duration: 35s; }
                .shape:nth-child(10) { left: 85%; width: 150px; height: 150px; animation-delay: 0s; animation-duration: 11s; }
            `}
            </style>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
            <span className="shape"></span>
        </div>
        
        <div className="z-10 text-center">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                Club Hub
            </h1>
            <div className="mt-8 flex justify-center items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-pink-500 animate-pulse"></div>
                <div className="w-4 h-4 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-4 h-4 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (view === 'dashboard' && user) {
      return (
        <DataProvider currentUser={user}>
          <div className="flex min-h-screen">
            <Sidebar
              user={user}
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={toggleTheme}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isOpen={isSidebarOpen}
              onClose={handleSidebarToggle}
            />
            <div className="flex-1 flex flex-col w-full">
               {/* Mobile Header */}
              <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between p-4 sticky top-0 z-10">
                <button onClick={handleSidebarToggle} className="text-gray-600 dark:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Open menu">
                  <MenuIcon />
                </button>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                  Club Hub
                </h1>
                {/* A small placeholder to balance the flexbox */}
                <div className="w-6 h-6"></div> 
              </header>
              <main className="flex-1 p-4 sm:p-6 lg:p-8 h-screen overflow-y-auto">
                <Dashboard
                  activeTab={activeTab}
                  currentUser={user}
                  onUpdateUserProfile={handleUpdateUserProfile}
                  theme={theme}
                />
              </main>
            </div>
          </div>
        </DataProvider>
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