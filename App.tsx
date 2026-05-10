
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User, Tab } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import PatronLogin from './components/PatronLogin';
import PatronSignUp from './components/PatronSignUp';
import FreeCodeRunner from './components/FreeCodeRunner';
import PendingApprovalModal from './components/PendingApprovalModal';
import FeatureTourModal from './components/FeatureTourModal';
import CustomCursor from './components/CustomCursor';
import * as api from './services/apiService';
import { supabase } from './services/supabaseClient';
import { MenuIcon } from './components/icons/MenuIcon';
import { DataProvider, useData } from './DataContext';
import { SunIcon } from './components/icons/SunIcon';
import { MoonIcon } from './components/icons/MoonIcon';
import { LogoutIcon } from './components/icons/LogoutIcon';
import ToastContainer from './components/Toast';
import OfflineIndicator from './components/OfflineIndicator';
import AlertModal from './components/AlertModal';

type View = 'welcome' | 'login' | 'signup' | 'dashboard' | 'patronLogin' | 'patronSignUp' | 'freeRunner';
type Theme = 'light' | 'dark';
const CACHED_USER_KEY = 'cached_user_profile';

// Helper component to render toasts inside the provider context
const ToastRenderer = () => {
  const { toasts, removeToast } = useData();
  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
};

const AlertModalRenderer = () => {
  const { alertConfig, hideAlert } = useData();
  if (!alertConfig) return null;
  return (
    <AlertModal
      isOpen={alertConfig.isOpen}
      title={alertConfig.title}
      message={alertConfig.message}
      type={alertConfig.type}
      onClose={hideAlert}
      onConfirm={alertConfig.onConfirm}
      confirmText={alertConfig.confirmText}
      cancelText={alertConfig.cancelText}
    />
  );
};

const App: React.FC = () => {
  // Initialize theme from localStorage or default to 'dark'
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app_theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  const [font, setFont] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app_font') || 'Inter, sans-serif';
    }
    return 'Inter, sans-serif';
  });

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  // Initialize activeTab from localStorage or default to 'feed'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('active_tab') as Tab;
      const validTabs: Tab[] = ['feed', 'activities', 'attendance', 'projects', 'profile', 'members', 'playground', 'resources', 'chat', 'showcase', 'suggestions', 'challenges', 'roadmap', 'community', 'games', 'admin', 'voting'];
      return validTabs.includes(savedTab) ? savedTab : 'feed';
    }
    return 'feed';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Apply theme to html element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Save to local storage
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--sidebar-width', isSidebarCollapsed ? '5.5rem' : '18rem');
    if (isSidebarCollapsed) {
      root.removeAttribute('data-sidebar-expanded');
    } else {
      root.setAttribute('data-sidebar-expanded', 'true');
    }
  }, [isSidebarCollapsed]);

  // Listen for Font Changes
  useEffect(() => {
    const handleFontChange = (e: CustomEvent) => {
      setFont(e.detail);
    };
    window.addEventListener('font-change' as any, handleFontChange);
    return () => window.removeEventListener('font-change' as any, handleFontChange);
  }, []);

  // Listen for Online/Offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadCachedUser = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHED_USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as User;
      if (parsed?.status !== 'APPROVED') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const cacheUserProfile = (profile: User | null) => {
    if (typeof window === 'undefined') return;
    if (!profile) {
      localStorage.removeItem(CACHED_USER_KEY);
      return;
    }
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
  };

  // Centralized session handler to avoid code duplication
  const processUserSession = async (userId: string) => {
    try {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = loadCachedUser();
        if (cached && cached.uid === userId) {
          setUser(cached);
          setView('dashboard');
          return;
        }
        setUser(null);
        setView('welcome');
        return;
      }
      const userProfile = await api.getUserProfile(userId);

      if (userProfile) {
        if (userProfile.status === 'APPROVED') {
          setUser(userProfile);
          setView('dashboard');
          cacheUserProfile(userProfile);

          // Check if user has seen the feature tour
          const hasSeenTour = localStorage.getItem(`has_seen_tour_${userProfile.uid}`);
          if (!hasSeenTour) {
            setShowTourModal(true);
            try {
              sessionStorage.setItem('first_login_session', 'true');
            } catch { }
          } else {
            try {
              sessionStorage.removeItem('first_login_session');
            } catch { }
          }

          // Update Last Login
          api.updateUser(userId, { lastLogin: new Date().toISOString() })
            .catch(err => console.error("Failed to update last login:", err));

          // Run attendance marking in background
          api.markAttendanceOnLogin(userProfile.uid)
            .catch(err => console.warn("Background attendance check failed:", err));
        } else if (userProfile.status === 'PENDING') {
          setShowPendingModal(true);
          // Ensure we sign out so they don't get stuck in a "logged in but pending" state
          await api.logout();
          setUser(null);
          setView('welcome');
          cacheUserProfile(null);
        } else {
          // Unknown status or other issue
          await api.logout();
          setUser(null);
          setView('welcome');
          cacheUserProfile(null);
        }
      } else {
        // No profile found for this user
        await api.logout();
        setUser(null);
        setView('welcome');
        cacheUserProfile(null);
      }
    } catch (error) {
      console.error("Error processing session:", error);
      setUser(null);
      setView('welcome');
      cacheUserProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // If offline, fall back to cached profile to allow offline usage.
        if (typeof window !== 'undefined' && !navigator.onLine) {
          const cached = loadCachedUser();
          if (cached) {
            setUser(cached);
            setView('dashboard');
          } else {
            setUser(null);
            setView('welcome');
          }
          return;
        }
        // 1. Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await processUserSession(session.user.id);
        } else {
          setUser(null);
          setView('welcome');
          cacheUserProfile(null);
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
        cacheUserProfile(null);
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
      try {
        sessionStorage.removeItem('first_login_session');
      } catch { }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setView('welcome');
      setActiveTab('feed');
      cacheUserProfile(null);
    }
  }, []);

  const handleSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }) => {
    await api.signUp(newUser);
  }, []);

  const handlePatronSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }) => {
    await api.signUpAsPatron(newUser);
  }, []);

  const handleUpdateUserProfile = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const handleCloseTour = useCallback(() => {
    setShowTourModal(false);
    if (user) {
      localStorage.setItem(`has_seen_tour_${user.uid}`, 'true');
    }
  }, [user]);


  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
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


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900" style={{ fontFamily: font }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Club Hub...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (view === 'dashboard' && user) {
      return (
        <DataProvider currentUser={user}>
          <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
            <Sidebar
              user={user}
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              isOpen={isSidebarOpen}
              onClose={handleSidebarToggle}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleSidebarCollapseToggle}
            />
            <div className="flex-1 flex flex-col w-full h-full relative overflow-hidden transition-all duration-300">
              {/* Unified Header (Mobile & Desktop) */}
              <header data-app-header="true" className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between p-4 sticky top-0 z-20 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={handleSidebarToggle} className="md:hidden text-gray-600 dark:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Open menu">
                    <MenuIcon />
                  </button>
                  {/* Mobile Title */}
                  <h1 className="md:hidden text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                    ICT Club Hub
                  </h1>
                  {/* Desktop Title */}
                  <h1 className="hidden md:block text-xl font-bold text-gray-800 dark:text-white capitalize">
                    {activeTab === 'chat' ? 'Messages' : activeTab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                    aria-label="Toggle theme"
                    title="Toggle Theme"
                  >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogoutIcon />
                  </button>

                  <button
                    onClick={() => handleTabChange('profile')}
                    className="flex-shrink-0 ml-1 group"
                    aria-label="Go to Profile"
                    title="Profile"
                  >
                    <img
                      src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 group-hover:border-pink-500 dark:group-hover:border-pink-500 transition-colors object-cover"
                    />
                  </button>
                </div>
              </header>

              {/* Conditionally apply padding and overflow for chat/playground to allow full height */}
              <main className={`flex-1 h-full w-full ${(activeTab === 'chat' || activeTab === 'playground') ? 'overflow-hidden' : `${activeTab === 'feed' ? 'pt-0 px-4 sm:px-6 lg:px-8 pb-6' : 'p-4 sm:p-6 lg:p-8'} overflow-y-auto scroll-smooth custom-scrollbar`}`}>
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
          <ToastRenderer />
          <AlertModalRenderer />
        </DataProvider>
      );
    }
    if (view === 'freeRunner') {
      return <FreeCodeRunner theme={theme} onExit={() => setView('welcome')} />;
    }
    if (view === 'signup') {
      return <SignUp onSignUp={handleSignUp} onNavigateToLogin={() => setView('login')} />;
    }
    if (view === 'login') {
      return (
        <Login 
          onLogin={handleLogin} 
          onNavigateToSignUp={() => setView('signup')} 
          onNavigateToPatronLogin={() => setView('patronLogin')} 
          onNavigateToFreeRunner={() => setView('freeRunner')}
        />
      );
    }
    if (view === 'patronLogin') {
      return <PatronLogin onLogin={handleLogin} onNavigateToLogin={() => setView('login')} onNavigateToSignUp={() => setView('patronSignUp')} />;
    }
    if (view === 'patronSignUp') {
      return <PatronSignUp onSignUp={handlePatronSignUp} onNavigateToLogin={() => setView('patronLogin')} />;
    }
    return (
      <Welcome
        onNavigateToLogin={() => setView('login')}
        onNavigateToSignUp={() => setView('signup')}
        onNavigateToPatronLogin={() => setView('patronLogin')}
        onNavigateToFreeRunner={() => setView('freeRunner')}
      />
    );
  };

  return (
    <div className="min-h-full text-gray-800 dark:text-gray-200 relative" style={{ fontFamily: font }}>
      {!isOnline && <OfflineIndicator />}
      <CustomCursor />
      <div className="relative z-10">
        {renderContent()}
      </div>
      <PendingApprovalModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
      />
      <FeatureTourModal
        isOpen={showTourModal}
        onClose={handleCloseTour}
      />
    </div>
  );
};

export default App;
