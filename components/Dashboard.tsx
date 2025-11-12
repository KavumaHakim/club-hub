import React, { Suspense, lazy } from 'react';
import { User } from '../types';

const Feed = lazy(() => import('./Feed'));
const Activities = lazy(() => import('./Activities'));
const Attendance = lazy(() => import('./Attendance'));
const ProjectsBoard = lazy(() => import('./ProjectsBoard'));
const Chat = lazy(() => import('./Chat'));
const Profile = lazy(() => import('./Profile'));
const Members = lazy(() => import('./Members'));
const CodePlayground = lazy(() => import('./CodePlayground'));


type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'chat' | 'profile' | 'members' | 'playground';
type Theme = 'light' | 'dark';

interface DashboardProps {
  currentUser: User;
  onUpdateUserProfile: (user: User) => void;
  activeTab: Tab;
  theme: Theme;
}

const LoadingIndicator: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ currentUser, onUpdateUserProfile, activeTab, theme }) => {

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed currentUser={currentUser} />;
      case 'activities':
        return <Activities currentUser={currentUser} />;
      case 'attendance':
        return <Attendance currentUser={currentUser} />;
      case 'projects':
        return <ProjectsBoard currentUser={currentUser} />;
      case 'chat':
        return <Chat currentUser={currentUser} />;
      case 'playground':
        return <CodePlayground theme={theme} />;
      case 'profile':
        return <Profile currentUser={currentUser} onUpdateUserProfile={onUpdateUserProfile} />;
      case 'members':
        if (currentUser.role === 'PATRON') {
          return <Members currentUser={currentUser} />;
        }
        return null;
      default:
        return <Feed currentUser={currentUser} />;
    }
  };

  return (
    <div>
      <Suspense fallback={<LoadingIndicator />}>
        {renderContent()}
      </Suspense>
    </div>
  );
};

export default Dashboard;