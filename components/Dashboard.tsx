
import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { User, Tab } from '../types';
import AiTutor from './AiTutor';
import DailyTipModal from './PythonTipModal';
import { useData } from '../DataContext';
import FeatureIntroModal from './FeatureIntroModal';
import NotificationPromptModal from './NotificationPromptModal';

const Feed = lazy(() => import('./Feed'));
const Activities = lazy(() => import('./Activities'));
const Attendance = lazy(() => import('./Attendance'));
const ProjectsBoard = lazy(() => import('./ProjectsBoard'));
const Profile = lazy(() => import('./Profile'));
const Members = lazy(() => import('./Members'));
const CodePlayground = lazy(() => import('./CodePlayground'));
const Resources = lazy(() => import('./Resources'));
const Chat = lazy(() => import('./Chat'));
const Showcase = lazy(() => import('./Showcase'));
const Suggestions = lazy(() => import('./Suggestions'));
const Challenges = lazy(() => import('./Challenges'));
const RoadmapView = lazy(() => import('./RoadmapView'));
const Community = lazy(() => import('./Community'));
const Games = lazy(() => import('./Games'));
const AdminTools = lazy(() => import('./AdminTools'));
const VotingPage = lazy(() => import('./VotingPage'));


type Theme = 'light' | 'dark';

interface DashboardProps {
    currentUser: User;
    onUpdateUserProfile: (user: User) => void;
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    theme: Theme;
}

const LoadingIndicator: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
    </div>
);

// A simple wrapper to control visibility without unmounting the component
const TabPanel: React.FC<{ active: boolean; children: React.ReactNode; className?: string }> = ({ active, children, className }) => (
    <div className={`${active ? 'block' : 'hidden'} ${className || ''}`}>
        {children}
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ currentUser, onUpdateUserProfile, activeTab, setActiveTab, theme }) => {
    const [showTipModal, setShowTipModal] = useState(false);
    const tipLanguage = useMemo<'python' | 'javascript'>(() => {
        const daySeed = new Date().getDate();
        return daySeed % 2 === 0 ? 'javascript' : 'python';
    }, []);
    const [featureIntro, setFeatureIntro] = useState<{ tab: Tab; title: string; body: string } | null>(null);
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
    const { featureFlags, notificationPrefs } = useData();
    const [pendingChallenge, setPendingChallenge] = useState<any | null>(null);

    useEffect(() => {
        // Check if we have shown the tip today
        // Key updated to 'last_daily_tip_date' for consistency
        const lastTipDate = localStorage.getItem('last_daily_tip_date');
        const today = new Date().toDateString();

        if (lastTipDate !== today) {
            // Add a small delay so it doesn't pop up instantly over the UI rendering
            const timer = setTimeout(() => {
                setShowTipModal(true);
                localStorage.setItem('last_daily_tip_date', today);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        // Check for notifications
        if (typeof window !== 'undefined' && 'Notification' in window) {
            // ONLY show if they haven't explicitly subscribed in our DB
            if (!notificationPrefs.browserEnabled) {
                const hasSeenNotificationPrompt = localStorage.getItem(`has_seen_notification_prompt_${currentUser.uid}`);
                if (!hasSeenNotificationPrompt && Notification.permission !== 'denied') {
                    const timer = setTimeout(() => {
                        setShowNotificationPrompt(true);
                    }, 2000); // Wait 2s to avoid overwhelming with other modals
                    return () => clearTimeout(timer);
                }
            } else {
                // If they are subscribed, ensure the prompt is hidden
                setShowNotificationPrompt(false);
            }
        }
    }, [currentUser.uid, notificationPrefs.browserEnabled]);

    const handleCloseNotificationPrompt = () => {
        setShowNotificationPrompt(false);
        localStorage.setItem(`has_seen_notification_prompt_${currentUser.uid}`, 'true');
    };

    const isFirstLoginSession = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return sessionStorage.getItem('first_login_session') === 'true';
    }, []);

    const featureIntroMap: Partial<Record<Tab, { title: string; body: string }>> = useMemo(() => ({
        activities: {
            title: 'Activities',
            body: `Plan your club time and stay in the loop.\n\n- RSVP to sessions and see who else is attending.\n- View details like location, time, and category.\n- Attendance records are linked to activities, so keeping this up‑to‑date matters.`
        },
        attendance: {
            title: 'Attendance',
            body: `Track participation over time.\n\n- Patrons can quick‑create sessions in one click.\n- Bulk mark members present/absent for a selected activity.\n- Review logs, summaries, and trends to identify engagement patterns.`
        },
        projects: {
            title: 'Projects Board',
            body: `Organize work like a real dev team.\n\n- Add tasks and move them through columns.\n- Assign owners and set priorities.\n- Collaborate in teams and keep progress visible.`
        },
        playground: {
            title: 'Code Playground',
            body: `Your in‑browser coding lab.\n\n- Run Python or JavaScript instantly.\n- Build multi‑file web projects (HTML/CSS/JS).\n- Save, download, upload, and publish your work.\n- Submit challenge solutions directly from here.`
        },
        showcase: {
            title: 'Showcase',
            body: `Publish your best work.\n\n- Share projects with previews and descriptions.\n- Collect likes and feedback.\n- Appear on leaderboards for recognition.`
        },
        suggestions: {
            title: 'Suggestions',
            body: `Help improve the club platform.\n\n- Submit ideas and bug reports.\n- Vote to prioritize what should ship next.\n- Track the status of suggestions.`
        },
        challenges: {
            title: 'Challenges',
            body: `Test your skills and earn badges.\n\n- Solve challenges and submit solutions.\n- Get instant AI feedback on submissions.\n- Patrons can create or generate AI challenges by level.`
        },
        roadmap: {
            title: 'Roadmaps',
            body: `Personalized learning paths.\n\n- Ebgae in Roadmaps by topic and level.\n- Each milestone includes resources and quizzes.\n- Track progress as you grow.`
        },
        community: {
            title: 'Community',
            body: `Collaboration and recognition.\n\n- Form teams and connect with members.\n- Recognition board highlights top contributors.\n- Encourage teamwork and consistent participation.`
        },
        games: {
            title: 'Games Lounge',
            body: `Quick breaks that sharpen focus.\n\n- Reaction tests, math sprints, and number guessers.\n- Scores are local, so you can compete with yourself.\n- Ideal for brain resets between deeper sessions.`
        },
        profile: {
            title: 'Profile & Portfolio',
            body: `Your public identity in the club.\n\n- Update avatar, bio, and details.\n- Show portfolio highlights and badges.\n- Share your progress with members and patrons.`
        },
        members: {
            title: 'Members',
            body: `Discover and learn from others.\n\n- Open member portfolios.\n- See badges, activity, and showcases.\n- Great for collaboration or finding mentors.`
        },
        admin: {
            title: 'Admin Tools',
            body: `Patron‑only control center.\n\n- Toggle feature flags across the app.\n- Moderate submissions and content.\n- View analytics snapshots for the club.`
        },
        voting: {
            title: 'Voting Hub',
            body: `Participate in club leadership.\n\n- Patrons post new positions with criteria.\n- Members contest for positions by submitting manifestos.\n- Each member can cast one vote per position.\n- Real-time results show the club's choices.`
        }
    }), []);

    useEffect(() => {
        if (!isFirstLoginSession) return;
        const intro = featureIntroMap[activeTab];
        if (!intro) return;
        const key = `intro_seen_${activeTab}`;
        if (sessionStorage.getItem(key) === 'true') return;
        setFeatureIntro({ tab: activeTab, ...intro });
    }, [activeTab, featureIntroMap, isFirstLoginSession]);

    const handleCloseFeatureIntro = () => {
        if (featureIntro?.tab) {
            sessionStorage.setItem(`intro_seen_${featureIntro.tab}`, 'true');
        }
        setFeatureIntro(null);
    };

    useEffect(() => {
        // Redirection logic: if a tab is disabled by a feature flag, 
        // move the user to the feed or profile, UNLESS they are a PATRON.
        if (currentUser.role === 'PATRON') return;

        const disabledTabs = new Set<Tab>();
        if (!featureFlags.showFeed) disabledTabs.add('feed');
        if (!featureFlags.showActivities) disabledTabs.add('activities');
        if (!featureFlags.showAttendance) disabledTabs.add('attendance');
        if (!featureFlags.showProjects) disabledTabs.add('projects');
        if (!featureFlags.showResources) disabledTabs.add('resources');
        if (!featureFlags.showChat) disabledTabs.add('chat');
        if (!featureFlags.showShowcase) disabledTabs.add('showcase');
        if (!featureFlags.showSuggestions) disabledTabs.add('suggestions');
        if (!featureFlags.showChallenges) disabledTabs.add('challenges');
        if (!featureFlags.showRoadmap) disabledTabs.add('roadmap');
        if (!featureFlags.showCommunity) disabledTabs.add('community');
        if (!featureFlags.showPlayground) disabledTabs.add('playground');
        if (!featureFlags.showGames) disabledTabs.add('games');
        if (!featureFlags.showVoting) disabledTabs.add('voting');

        if (disabledTabs.has(activeTab)) {
            setActiveTab(featureFlags.showFeed ? 'feed' : 'profile');
        }
    }, [activeTab, featureFlags, setActiveTab, currentUser.role]);

    return (
        <div className={(activeTab === 'chat' || activeTab === 'playground') ? 'h-full' : ''}>
            <Suspense fallback={<LoadingIndicator />}>
                <TabPanel active={activeTab === 'feed' && (featureFlags.showFeed || currentUser.role === 'PATRON')}>
                    <Feed currentUser={currentUser} />
                </TabPanel>
                <TabPanel active={activeTab === 'activities' && (featureFlags.showActivities || currentUser.role === 'PATRON')}>
                    <Activities currentUser={currentUser} />
                </TabPanel>
                <TabPanel active={activeTab === 'attendance' && (featureFlags.showAttendance || currentUser.role === 'PATRON')}>
                    <Attendance currentUser={currentUser} isVisible={activeTab === 'attendance'} />
                </TabPanel>
                <TabPanel active={activeTab === 'projects' && (featureFlags.showProjects || currentUser.role === 'PATRON')}>
                    <ProjectsBoard currentUser={currentUser} />
                </TabPanel>
                <TabPanel active={activeTab === 'playground' && (featureFlags.showPlayground || currentUser.role === 'PATRON')} className="h-full">
                    <CodePlayground 
                        theme={theme} 
                        currentUser={currentUser} 
                        setActiveTab={setActiveTab} 
                        globalActiveTab={activeTab} 
                        incomingChallenge={pendingChallenge}
                        onChallengeHandled={() => setPendingChallenge(null)}
                    />
                </TabPanel>
                <TabPanel active={activeTab === 'showcase' && (featureFlags.showShowcase || currentUser.role === 'PATRON')}>
                    <Showcase currentUser={currentUser} setActiveTab={setActiveTab} />
                </TabPanel>
                <TabPanel active={activeTab === 'profile'}>
                    <Profile currentUser={currentUser} onUpdateUserProfile={onUpdateUserProfile} />
                </TabPanel>
                <TabPanel active={activeTab === 'resources' && (featureFlags.showResources || currentUser.role === 'PATRON')}>
                    <Resources currentUser={currentUser} setActiveTab={setActiveTab} />
                </TabPanel>
                <TabPanel active={activeTab === 'chat' && (featureFlags.showChat || currentUser.role === 'PATRON')} className="h-full">
                    <Chat currentUser={currentUser} setActiveTab={setActiveTab} theme={theme} />
                </TabPanel>
                <TabPanel active={activeTab === 'suggestions' && (featureFlags.showSuggestions || currentUser.role === 'PATRON')}>
                    <Suggestions currentUser={currentUser} />
                </TabPanel>
                <TabPanel active={activeTab === 'challenges' && (featureFlags.showChallenges || currentUser.role === 'PATRON')}>
                    <Challenges 
                        currentUser={currentUser} 
                        onMakeSubmission={(challenge) => {
                            sessionStorage.setItem('pending_challenge_context', JSON.stringify(challenge));
                            setPendingChallenge(challenge);
                            setActiveTab('playground');
                        }}
                    />
                </TabPanel>
                {/* FIX: Removed invalid 'bottom_roadmap' comparison as it is not a valid member of the Tab type union. */}
                <TabPanel active={activeTab === 'roadmap' && (featureFlags.showRoadmap || currentUser.role === 'PATRON')}>
                    <RoadmapView currentUser={currentUser} />
                </TabPanel>
                <TabPanel active={activeTab === 'community' && (featureFlags.showCommunity || currentUser.role === 'PATRON')}>
                    <Community currentUser={currentUser} />
                </TabPanel>
                <TabPanel active={activeTab === 'games' && (featureFlags.showGames || currentUser.role === 'PATRON')}>
                    <Games currentUser={currentUser} />
                </TabPanel>
                <TabPanel active={activeTab === 'voting' && (featureFlags.showVoting || currentUser.role === 'PATRON')}>
                    <VotingPage currentUser={currentUser} />
                </TabPanel>
                {currentUser.role === 'PATRON' && (
                    <TabPanel active={activeTab === 'members'}>
                        <Members currentUser={currentUser} />
                    </TabPanel>
                )}
                {currentUser.role === 'PATRON' && (
                    <TabPanel active={activeTab === 'admin'}>
                        <AdminTools currentUser={currentUser} />
                    </TabPanel>
                )}
            </Suspense>

            {/* Floating AI Tutor Widget */}
            <AiTutor currentUser={currentUser} />

            {/* Daily Coding Tip Modal (Python on odd days, JS on even days) */}
            <DailyTipModal
                isOpen={showTipModal}
                onClose={() => setShowTipModal(false)}
                skillLevel={currentUser.skillLevel || 'BEGINNER'}
                preferredLanguage={tipLanguage}
            />

            <FeatureIntroModal
                isOpen={!!featureIntro}
                title={featureIntro?.title || ''}
                body={featureIntro?.body || ''}
                onClose={handleCloseFeatureIntro}
            />

            <NotificationPromptModal
                isOpen={showNotificationPrompt}
                onClose={handleCloseNotificationPrompt}
                userId={currentUser.uid}
            />
        </div>
    );
};

export default Dashboard;
