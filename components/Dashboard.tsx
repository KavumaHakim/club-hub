import React, { Suspense, lazy, useState, useEffect } from 'react';
import { User, Tab } from '../types';
import AiTutor from './AiTutor';
import PythonTipModal from './PythonTipModal';

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

  useEffect(() => {
      // Check if we have shown the tip today
      const lastTipDate = localStorage.getItem('last_python_tip_date');
      const today = new Date().toDateString();

      if (lastTipDate !== today) {
          // Add a small delay so it doesn't pop up instantly over the UI rendering
          const timer = setTimeout(() => {
              setShowTipModal(true);
              localStorage.setItem('last_python_tip_date', today);
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, []);

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
            <CodePlayground theme={theme} currentUser={currentUser} setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel active={activeTab === 'showcase'}>
            <Showcase currentUser={currentUser} setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel active={activeTab === 'profile'}>
            <Profile currentUser={currentUser} onUpdateUserProfile={onUpdateUserProfile} />
        </TabPanel>
        <TabPanel active={activeTab === 'resources'}>
            <Resources currentUser={currentUser} setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel active={activeTab === 'chat'} className="h-full">
            <Chat currentUser={currentUser} setActiveTab={setActiveTab} theme={theme} />
        </TabPanel>
        <TabPanel active={activeTab === 'suggestions'}>
            <Suggestions currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'challenges'}>
            <Challenges currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'roadmap'}>
            <RoadmapView currentUser={currentUser} />
        </TabPanel>
        {currentUser.role === 'PATRON' && (
            <TabPanel active={activeTab === 'members'}>
                <Members currentUser={currentUser} />
            </TabPanel>
        )}
      </Suspense>
      
      {/* Floating AI Tutor Widget */}
      <AiTutor currentUser={currentUser} />

      {/* Daily Python Tip Modal */}
      <PythonTipModal isOpen={showTipModal} onClose={() => setShowTipModal(false)} />
    </div>
  );
};

export default Dashboard;