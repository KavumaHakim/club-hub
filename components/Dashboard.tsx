import React from 'react';
import Activities from './Activities';
import Attendance from './Attendance';
import Feed from './Feed';
import Members from './Members';
import ProjectsBoard from './ProjectsBoard';
import Profile from './Profile';
import Chat from './Chat';
import CodePlayground from './CodePlayground';
import { User } from '../types';

type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'chat' | 'profile' | 'members' | 'playground';
type Theme = 'light' | 'dark';

interface DashboardProps {
  currentUser: User;
  onUpdateUserProfile: (user: User) => void;
  activeTab: Tab;
  theme: Theme;
}

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
      {renderContent()}
    </div>
  );
};

export default Dashboard;