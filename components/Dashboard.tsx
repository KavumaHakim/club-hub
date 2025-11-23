
import React, { Suspense, lazy } from 'react';
import { User, Tab } from '../types';

const Feed = lazy(() => import('./Feed'));
const Activities = lazy(() => import('./Activities'));
const Attendance = lazy(() => import('./Attendance'));
const ProjectsBoard = lazy(() => import('./ProjectsBoard'));
const Profile = lazy(() => import('./Profile'));
const Members = lazy(() => import('./Members'));
const CodePlayground = lazy(() => import('./CodePlayground'));
const Resources = lazy(() => import('./Resources'));
const Chat = lazy(() => import('./Chat'));


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
  return (
    <div className={(activeTab === 'chat' || activeTab === 'playground') ? 'h-full' : ''}>
      <Suspense fallback={<LoadingIndicator />}>
        <TabPanel active={activeTab === 'feed'}>
            <Feed currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'activities'}>
            <Activities currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'attendance'}>
            <Attendance currentUser={currentUser} visible={activeTab === 'attendance'} />
        </TabPanel>
        <TabPanel active={activeTab === 'projects'}>
            <ProjectsBoard currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'playground'} className="h-full">
            <CodePlayground theme={theme} currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'profile'}>
            <Profile currentUser={currentUser} onUpdateUserProfile={onUpdateUserProfile} />
        </TabPanel>
        <TabPanel active={activeTab === 'resources'}>
            <Resources currentUser={currentUser} setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel active={activeTab === 'chat'} className="h-full">
            <Chat currentUser={currentUser} />
        </TabPanel>
        {currentUser.role === 'PATRON' && (
            <TabPanel active={activeTab === 'members'}>
                <Members currentUser={currentUser} />
            </TabPanel>
        )}
      </Suspense>
    </div>
  );
};

export default Dashboard;
