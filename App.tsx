
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User, Tab } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import PatronLogin from './components/PatronLogin';
import PatronSignUp from './components/PatronSignUp';
import PendingApprovalModal from './components/PendingApprovalModal';
import * as api from './services/apiService';
import { supabase } from './services/supabaseClient';
import { MenuIcon } from './components/icons/MenuIcon';
import { DataProvider } from './DataContext';

type View = 'welcome' | 'login' | 'signup' | 'dashboard' | 'patronLogin' | 'patronSignUp';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  // Initialize theme from localStorage or default to 'dark'
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('app_theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  // Initialize activeTab from localStorage or default to 'feed'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
      if (typeof window !== 'undefined') {
          const savedTab = localStorage.getItem('active_tab') as Tab;
          const validTabs: Tab[] = ['feed', 'activities', 'attendance', 'projects', 'profile', 'members', 'playground', 'resources', 'chat'];
          return validTabs.includes(savedTab) ? savedTab : 'feed';
      }
      return 'feed';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Centralized session handler to avoid code duplication
  const processUserSession = async (userId: string) => {
      try {
          const userProfile = await api.getUserProfile(userId);
          
          if (userProfile) {
              if (userProfile.status === 'APPROVED') {
                  setUser(userProfile);
                  setView('dashboard');
                  // Run attendance marking in background
                  api.markAttendanceOnLogin(userProfile.uid)
                     .catch(err => console.warn("Background attendance check failed:", err));
              } else if (userProfile.status === 'PENDING') {
                  setShowPendingModal(true);
                  // Ensure we sign out so they don't get stuck in a "logged in but pending" state
                  await api.logout();
                  setUser(null);
                  setView('welcome');
              } else {
                 // Unknown status or other issue
                 await api.logout();
                 setUser(null);
                 setView('welcome');
              }
          } else {
              // No profile found for this user
              await api.logout();
              setUser(null);
              setView('welcome');
          }
      } catch (error) {
          console.error("Error processing session:", error);
          setUser(null);
          setView('welcome');
      }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
        try {
            // 1. Get initial session
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                await processUserSession(session.user.id);
            } else {
                setUser(null);
                setView('welcome');
            }
        } catch (error) {
            console.error("Auth init failed:", error);
            setUser(null);
            setView('welcome');
        } finally {
            if (mounted) {
                setIsLoading(false);
            }
        }
    };

    initAuth();

    // 2. Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        // Note: SIGNED_IN fires on login, signup (if auto-confirm), and token refresh
        if (event === 'SIGNED_IN') {
             if (session?.user) {
                 // Only process if we aren't already logged in as this user to prevent flickering
                 setUser(currentUser => {
                     if (currentUser?.uid === session.user.id) {
                         return currentUser; // No change needed
                     }
                     // If different user or no user, fetch profile
                     processUserSession(session.user.id);
                     return currentUser;
                 });
             }
        } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setView('welcome');
        }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async (email: string, password?: string) => {
    // We only trigger the API call here. 
    // The state update is handled by the onAuthStateChange listener to ensure consistency.
    await api.login(email, password);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
        await api.logout();
        localStorage.removeItem('active_tab'); 
    } catch (error) {
        console.error("Logout failed:", error);
    } finally {
        setUser(null);
        setView('welcome');
        setActiveTab('feed');
    }
  }, []);

  const handleSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
    await api.signUp(newUser);
  }, []);

  const handlePatronSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
    await api.signUpAsPatron(newUser);
  }, []);
  
  const handleUpdateUserProfile = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);


  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('app_theme', newTheme);
        return newTheme;
    });
  }, []);
  
  const handleTabChange = useCallback((tab: Tab) => {
      setActiveTab(tab);
      localStorage.setItem('active_tab', tab);
  }, []);
  
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prevState => !prevState);
  }, []);

  const handleSidebarCollapseToggle = useCallback(() => {
    setIsSidebarCollapsed(prevState => !prevState);
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
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading Club Hub...</p>
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
              setActiveTab={handleTabChange}
              isOpen={isSidebarOpen}
              onClose={handleSidebarToggle}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleSidebarCollapseToggle}
            />
            <div className="flex-1 flex flex-col w-full h-screen overflow-hidden">
               {/* Mobile Header */}
              <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between p-4 sticky top-0 z-10 flex-shrink-0">
                <button onClick={handleSidebarToggle} className="text-gray-600 dark:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Open menu">
                  <MenuIcon />
                </button>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                  ICT Club Hub
                </h1>
                <div className="w-6 h-6"></div> 
              </header>
              {/* Conditionally apply padding and overflow for chat to allow full height */}
              <main className={`flex-1 ${activeTab === 'chat' ? 'h-full overflow-hidden' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto scroll-smooth'}`}>
                <Dashboard
                  activeTab={activeTab}
                  setActiveTab={handleTabChange}
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
      <PendingApprovalModal 
        isOpen={showPendingModal} 
        onClose={() => setShowPendingModal(false)} 
      />
    </div>
  );
};

export default App;